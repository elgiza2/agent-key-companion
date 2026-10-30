import { edgeAnonKey, edgeUrl } from "@/lib/edgeRuntime";
/**
 * Fast lane for simple chat turns.
 *
 * Sends the turn to the streaming `chat-fast` edge function (Cerebras
 * gpt-oss-120b) with almost no pre-flight work. The model decides routing
 * itself: if the turn needs tools, files, browsing, media or a long task, its
 * first content is an internal sentinel that we intercept and never render.
 */

type FastMsg = { role: "user" | "assistant"; content: unknown };

const FAST_URL = edgeUrl("chat-fast");

export function isFastLaneEligible(opts: {
  messages: FastMsg[];
  chatMode?: string;
  deepResearch?: boolean;
  /** Kept for callers; web search alone no longer blocks the fast lane. */
  searchExplicit?: boolean;
  computerUseEnabled?: boolean;
  activeAgent?: string;
  activeSkill?: unknown;
  /** Full lane is required when the user's MCP/apps context is non-empty. */
  hasConnectedTools?: boolean;
}): boolean {
  const { messages } = opts;
  // NOTE: the search flag must NOT block the fast lane. The web-search toggle
  // is on by default and the auto heuristic fires on trivial turns ("2+2?"),
  // so this used to send every simple message down the slow path (~9s).
  // `chat-fast` escalates by itself whenever a turn really needs live data.
  if (opts.deepResearch || opts.computerUseEnabled) return false;
  // Media creation (image/video) can never be answered by the text-only fast
  // lane — the model used to leak its internal route sentinel
  // (`[[MEGSY_ESCALATE_TO_FULL_CHAT:media]]`) into the visible answer. Route
  // these turns straight to the full lane so media renders as a card.
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (typeof lastUser?.content === "string") {
    const t = lastUser.content;
    const hasMediaVerb =
      /(اعمل|اعملي|ارسم|صمم|ولد|ولّد|انشئ|أنشئ|عايز|عاوز|محتاج|سوي|create|generate|make|draw|design|render|animate)/i.test(
        t,
      );
    const mentionsMedia =
      /(صورة|صوره|صور|بوستر|لوجو|شعار|رسمة|فيديو|كليب|ريلز|image|photo|picture|poster|logo|video|clip|animation)/i.test(
        t,
      );
    const negated = /(بلاش|بدون|من غير|don't|do not)\s*(صور|فيديو|image|video)/i.test(t);
    if (hasMediaVerb && mentionsMedia && !negated) return false;
  }
  // The fast agent is now the front door for every service. It receives a
  // routing hint below and escalates to the full lane when a tool, file,
  // browser, media or long-running task is required.
  if (!messages.length || messages.length > 60) return false;
  let total = 0;
  for (const m of messages) {
    if (typeof m.content !== "string") return false;
    // Never fast-lane a turn that already carries a tool/task trace.
    if (/\[tool:|\bESCALATE\b/.test(m.content)) return false;
    total += m.content.length;
  }
  return total > 0 && total < 20000;
}

export type FastChatOutcome = "answered" | "escalate";

export async function tryFastChat({
  messages,
  authToken,
  fingerprint,
  signal,
  onDelta,
  onModel,
  onUsage,
  onReasoning,
  force,
  thinking,
  maxTokens,
  routingContext,
}: {
  messages: FastMsg[];
  authToken: string;
  fingerprint: string;
  signal?: AbortSignal;
  onDelta: (chunk: string) => void;
  onModel?: (model: string) => void;
  onUsage?: (usage: Record<string, number>) => void;
  /** Thinking/reasoning deltas (the fast model streams `reasoning_content`). */
  onReasoning?: (chunk: string) => void;
  /** Answer even when the turn looks complex (used as a rescue path). */
  force?: boolean;
  /** The user's deep-thinking toggle for this turn. */
  thinking?: boolean;
  /** Output budget for this turn (trivial turns use a small one for speed). */
  maxTokens?: number;
  /** Non-secret service context used by the fast agent's router. */
  routingContext?: string;
}): Promise<FastChatOutcome> {
  let resp: Response;
  // Only the user's Stop action cancels generation; provider startup and
  // reasoning may legitimately take longer than a fixed browser deadline.
  const reqSignal = signal;
  const requestedMaxTokens = maxTokens ?? (force ? 8192 : undefined);
  const proxyBody = JSON.stringify({
    messages,
    lane: "fast",
    ...(force ? { force: true } : {}),
    thinking: thinking === true,
    ...(requestedMaxTokens ? { maxTokens: requestedMaxTokens } : {}),
    ...(routingContext ? { routingContext } : {}),
  });
  /** Fallback runtime: this app's own serverless chat endpoint. */
  const viaProxy = () =>
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: proxyBody,
      signal: reqSignal,
    });
  try {
    // Local runtime first: the app's own serverless endpoint (`/api/chat` on
    // Vercel) serves the turn from the DB key pools — zero Vercel env vars
    // needed. The edge lane below is the fallback. VITE_LOCAL_CHAT_PROXY=0
    // opts out.
    if (import.meta.env.VITE_LOCAL_CHAT_PROXY === "0") throw new Error("PROXY_DISABLED");
    resp = await viaProxy();
    if (!resp.ok || !(resp.headers.get("content-type") || "").includes("text/event-stream")) {
      try {
        await resp.body?.cancel();
      } catch {
        /* ignore */
      }
      throw new Error("PROXY_UNAVAILABLE");
    }
  } catch (proxyError) {
    if (signal?.aborted) {
      throw proxyError;
    }
    try {
      resp = await fetch(FAST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: edgeAnonKey("chat-fast"),
          Authorization: `Bearer ${authToken}`,
          "x-anon-fingerprint": fingerprint,
        },
        body: JSON.stringify({
          messages,
          thinking: thinking === true,
          ...(routingContext ? { routingContext } : {}),
          ...(force ? { force: true } : {}),
          ...(requestedMaxTokens ? { maxTokens: requestedMaxTokens } : {}),
        }),
        signal: reqSignal,
      });
      if (resp.status >= 500 || resp.status === 404) {
        try {
          await resp.body?.cancel();
        } catch {
          /* ignore */
        }
        resp = await viaProxy();
      }
    } catch (e) {
      if (signal?.aborted) throw e;
      return "escalate";
    }
  }

  const contentType = resp.headers.get("content-type") || "";
  if (!resp.ok || !resp.body || !contentType.includes("text/event-stream")) {
    // Any non-stream answer (including `{ escalate: true }`) means: use the
    // full chat path.
    try {
      await resp.body?.cancel();
    } catch {
      /* ignore */
    }
    return "escalate";
  }

  const modelUsed = resp.headers.get("x-model-used");
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let emitted = false;
  const routeSentinelStart = "[[MEGSY_ESCALATE_TO_FULL_CHAT";
  const routeSentinelStartUpper = routeSentinelStart.toUpperCase();
  const routeSentinelPattern = /^\[\[MEGSY_ESCALATE_TO_FULL_CHAT(?::[a-z0-9_-]+)?\]\]/i;
  const isPossibleRouteSentinel = (candidate: string) => {
    const upper = candidate.replace(/^\s+/, "").toUpperCase();
    if (routeSentinelStartUpper.startsWith(upper)) return true;
    if (!upper.startsWith(routeSentinelStartUpper)) return false;
    const suffix = upper.slice(routeSentinelStartUpper.length);
    return suffix === "" || /^:[A-Z0-9_-]*\]{0,2}$/.test(suffix);
  };
  let routePrefix = "";
  let routeResolved = false;

  const emitContent = (content: string) => {
    if (!content) return;
    if (!emitted && modelUsed) onModel?.(modelUsed);
    emitted = true;
    onDelta(content);
  };

  // Models sometimes write a short preamble before the hidden route marker
  // ("We need to generate an image using the tool. [[MEGSY_ESCALATE...]]").
  // Only routing-like preambles need the defensive hold. Direct answers must
  // not wait for 320 characters (or completion for a short response).
  const routingPreambles = ["we need to", "i need to", "let me", "i will use", "i'll use", "خليني", "سأستخدم", "نحتاج إلى"];
  const needsPreambleHold = (candidate: string) => {
    if (force) return false;
    const opening = candidate.toLowerCase();
    return routingPreambles.some((prefix) => prefix.startsWith(opening) || opening.startsWith(prefix));
  };
  const anywhereSentinel = /\[\[\s*MEGSY_ESCALATE/i;
  let tail = "";
  const handleContent = (content: string) => {
    if (!routeResolved) {
      routePrefix += content;
      const candidate = routePrefix.replace(/^\s+/, "");
      if (routeSentinelPattern.test(candidate) || anywhereSentinel.test(candidate))
        throw new Error("__ESCALATE__");
      if (isPossibleRouteSentinel(candidate)) return;
      if (candidate.length < 320 && needsPreambleHold(candidate)) return;
      routeResolved = true;
      const buffered = routePrefix;
      routePrefix = "";
      emitContent(buffered);
      return;
    }
    tail = (tail + content).slice(-64);
    if (anywhereSentinel.test(tail)) throw new Error("__ESCALATE__");
    emitContent(content);
  };

  const handleLine = (line: string) => {
    if (!line.startsWith("data:")) return false;
    const jsonStr = line.slice(5).trim();
    if (jsonStr === "[DONE]") return true;
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed?.escalate) throw new Error("__ESCALATE__");
      if (parsed?.event === "escalate") throw new Error("__ESCALATE__");
      if (parsed?.usage && typeof parsed.usage === "object") onUsage?.(parsed.usage);
      const delta = parsed?.choices?.[0]?.delta;
      const reasoning =
        (delta?.reasoning_content as string | undefined) ??
        (delta?.reasoning as string | undefined);
      if (typeof reasoning === "string" && reasoning) {
            onReasoning?.(reasoning);
      }
      const content = delta?.content;
      if (typeof content === "string" && content) handleContent(content);
    } catch (e) {
      if ((e as Error)?.message === "__ESCALATE__") throw e;
    }
    return false;
  };


  try {
    let done = false;
    while (!done) {
      const { done: streamDone, value } = await reader.read();
      if (streamDone) break;
      textBuffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, idx);
        textBuffer = textBuffer.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line || line.startsWith(":")) continue;
        if (handleLine(line)) {
          done = true;
          break;
        }
      }
    }
    // Some providers close the stream without a final newline. Do not drop
    // that last event (which may carry the final answer or [DONE]).
    textBuffer += decoder.decode();
    if (textBuffer.trim()) handleLine(textBuffer.trim());
  } catch (e) {
    if ((e as Error)?.message === "__ESCALATE__") {
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      // Content already shown to the user cannot be taken back, so only a
      // clean (nothing emitted) escalation is safe.
      return emitted ? "answered" : "escalate";
    }
    if (emitted) return "answered";
    throw e;
  }

  // Never expose a partial internal route marker if the provider cut the frame
  // mid-sentinel. Treat it as an incomplete route and let the full lane recover.
  if (!routeResolved && routePrefix) {
    if (isPossibleRouteSentinel(routePrefix) || anywhereSentinel.test(routePrefix))
      return "escalate";
    routeResolved = true;
    const buffered = routePrefix;
    routePrefix = "";
    emitContent(buffered);
  }

  // Reasoning alone is not a visible answer. Continue through the full lane.
  return emitted ? "answered" : "escalate";
}
