import { startJob, subscribeJob, resumeJob } from "@/lib/jobs/client";
import { getAnonFingerprint } from "@/lib/anonFingerprint";
import { isFastLaneEligible, tryFastChat } from "@/lib/chat/fastChat";
import { readAgentRosterContext } from "@/lib/agentsky/rosterSettings";
import { readChatModelPreferences } from "@/lib/chatModelPreferences";
import { edgeAnonKey, edgeUrl } from "@/lib/edgeRuntime";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/edgeRuntime";
import { isTrivialTurn, shouldForceFastTurn } from "@/lib/chat/trivialTurn";
import { GENUI_PROMPT } from "@/components/chat/genui/prompt";

/**
 * Provider keys live server-side in the deployed Supabase functions, so both
 * dev and production stream through the same edge lane. The local /api/chat
 * proxy is the automatic fallback: when the edge lane is unreachable or
 * unconfigured (fresh deploy, no keys), the app's own serverless runtime
 * (`/api/chat` on Vercel) serves the turn from the DB key pools instead —
 * zero Vercel env vars required. VITE_LOCAL_CHAT_PROXY=0 opts out.
 */
let localChatProxyUsable = import.meta.env.VITE_LOCAL_CHAT_PROXY !== "0";

/**
 * Internal reasoning is ON by default: users expect to see the thinking trace
 * without hunting for a toggle. Only an explicit opt-out turns it off.
 */
function deepThinkingEnabled(): boolean {
  try {
    return readChatModelPreferences().deepThinking !== false;
  } catch {
    return true;
  }
}

export const GUEST_QUOTA_ERROR = "GUEST_QUOTA_EXCEEDED";

/**
 * Upstream errors arrive as raw provider JSON. Turn the ones users can act on
 * into one clear sentence instead of a wall of provider text.
 */
function friendlyUpstreamError(raw: string): string {
  if (
    /Arrearage|overdue.?payment|in good standing|insufficient.?balance|quota.?exceeded/i.test(raw)
  ) {
    return "رصيد مزوّد الموديلات (Alibaba Model Studio) منتهي أو الحساب متوقف عن السداد — اشحن الحساب أو أضف مفتاحًا جديدًا وهيرجع الشات فورًا.";
  }
  if (/invalid.?api.?key|Unauthorized|InvalidApiKey/i.test(raw)) {
    return "مفتاح مزوّد الموديلات غير صالح — حدّث المفتاح في الإعدادات.";
  }
  if (/rate.?limit|Throttling|429/i.test(raw)) {
    return "ضغط مؤقت على مزوّد الموديلات — جرّب تاني بعد لحظات.";
  }
  const clean = raw.trim();
  return clean.length > 200 || /^\s*[{[]/.test(clean) ? "الشات مش متاح مؤقتًا. جرّب تاني." : clean;
}

type MsgContent = string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
type Msg = { role: "user" | "assistant"; content: MsgContent };

type BrowserPayload = {
  currentUrl?: string;
  liveUrl?: string;
  screenshotUrl?: string;
  currentStep?: string;
};

const CHAT_URL = edgeUrl("chat-alibaba");

// Lightweight session-token cache so we don't hit auth/v1/user on every send.
// The access_token in supabase-js is already cached in localStorage; we just
// memoize the synchronous read for a few seconds to avoid the network call.
let _cachedToken: { token: string; exp: number } | null = null;
async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (_cachedToken && _cachedToken.exp > now + 5_000) return _cachedToken.token;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const expSec = data.session?.expires_at || 0;
    if (token) {
      _cachedToken = { token, exp: expSec ? expSec * 1000 : now + 60_000 };
      return token;
    }
  } catch {
    /* ignore */
  }
  return SUPABASE_ANON_KEY;
}

async function refreshAccessToken(): Promise<string> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.refreshSession();
    const token = data.session?.access_token;
    if (token) {
      _cachedToken = {
        token,
        exp: data.session?.expires_at ? data.session.expires_at * 1000 : Date.now() + 60_000,
      };
      return token;
    }
  } catch {
    /* fall back to the publishable key for guest chat */
  }
  _cachedToken = null;
  return SUPABASE_ANON_KEY;
}

export async function streamChat({
  messages,
  model,
  tier,
  searchEnabled,
  searchExplicit,
  deepResearch,
  chatMode,
  user_id,
  conversation_id,
  computerUseEnabled,
  activeAgent,
  selectedModel,
  activeSkill,
  availableSkills,
  background,
  onJobStart,
  onDelta,
  onDone,
  onError,
  onImages,
  onProducts,
  onStatus,
  onBrowser,
  onEvent,
  onReasoning,
  onUsage,
  onModel,
  localPipeline,

  signal,
}: {
  messages: Msg[];
  model?: string;
  tier?: "lite" | "pro" | "max";
  searchEnabled?: boolean;
  /** User explicitly toggled web search on for this turn. */
  searchExplicit?: boolean;
  deepResearch?: boolean;
  chatMode?: string;
  user_id?: string;
  conversation_id?: string;
  computerUseEnabled?: boolean;
  activeAgent?: string;
  selectedModel?: { id: string; cost: number };
  activeSkill?: {
    id?: string;
    name: string;
    instructions: string;
    enabled_tools?: string[];
    preferred_model?: string | null;
  } | null;
  availableSkills?: Array<{
    id?: string;
    name: string;
    description: string;
    triggers?: string[];
    source?: string;
    instructions?: string;
    enabled_tools?: string[];
    preferred_model?: string | null;
  }>;
  /** When true, run on the server as a background job that survives the user closing the tab. */
  background?: boolean;
  /** Called as soon as the background jobId is known so the caller can persist it for resume. */
  onJobStart?: (jobId: string) => void;
  onDelta: (deltaText: string) => void;
  onDone: () => void | Promise<void>;
  onError?: (error: string) => void;
  onImages?: (images: string[]) => void;
  onProducts?: (products: any[]) => void;
  onStatus?: (status: string) => void;
  onBrowser?: (browser: BrowserPayload) => void;
  onEvent?: (payload: { event: string; [k: string]: any }) => void;
  onReasoning?: (deltaText: string) => void;
  /** Fires with token usage stats whenever the upstream sends them. */
  onUsage?: (usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  }) => void;
  /** Fires once with the actual model id that produced the response (from x-model-used header or first SSE frame). */
  onModel?: (model: string) => void;
  signal?: AbortSignal;
  /**
   * Local agent pipeline (Deep Research). When provided, the turn is produced
   * entirely by our own agent instead of the backend chat stream, but all the
   * caller's callbacks (delta / status / done / error) behave identically.
   */
  localPipeline?: (handles: {
    onDelta: (chunk: string) => void;
    onStatus: (status: string) => void;
    signal?: AbortSignal;
  }) => Promise<void>;
}) {
  if (localPipeline) {
    try {
      await localPipeline({
        onDelta,
        onStatus: (s) => onStatus?.(s),
        signal,
      });
      await onDone();
    } catch (e: any) {
      if (e?.name === "AbortError") {
        await onDone();
        return;
      }
      onError?.(e?.message || "Deep Research failed. Please try again.");
      await onDone();
    }
    return;
  }

  // ── Background job mode ─────────────────────────────────────────────────
  // Server creates a background_jobs row and streams progress into it. We
  // subscribe via Realtime; closing the tab no longer interrupts the answer.
  if (background) {
    try {
      const { jobId } = await startJob("chat", {
        messages,
        model,
        tier,
        searchEnabled,
        deepResearch,
        chatMode,
        user_id,
        conversation_id,
        computerUseEnabled,
        activeAgent,
        selectedModel,
        activeSkill,
        availableSkills,
        background: true,
      });
      onJobStart?.(jobId);
      const seenEvents = new Set<string>();
      let unsub: (() => void) | null = null;
      let settled = false;
      unsub = subscribeJob(jobId, {
        onStatus: (t) => onStatus?.(t),
        onDelta: (chunk) => onDelta(chunk),
        onMeta: (meta) => {
          if (Array.isArray(meta?.images)) onImages?.(meta.images);
          if (Array.isArray(meta?.products)) onProducts?.(meta.products);
          if (meta?.browser) onBrowser?.(meta.browser);
          if (Array.isArray(meta?.events)) {
            for (const ev of meta.events) {
              const key = JSON.stringify(ev);
              if (seenEvents.has(key)) continue;
              seenEvents.add(key);
              onEvent?.(ev);
            }
          }
        },
      onDone: (m) => {
        if (settled) return;
        settled = true;
        try {
          unsub?.();
        } catch {}
        // Do not close the turn here: the error handler owns it and may be
        // running an asynchronous cloud fallback. Calling onDone as well lets
        // the normal completion path overwrite that fallback with an empty
        // placeholder or save it too early.
        onError?.(m as unknown as string);
      },
      onError: (m) => {
        if (settled) return;
        settled = true;
        try {
          unsub?.();
        } catch {}
        onError?.(m);
      },
    });
      if (signal) {
        signal.addEventListener(
          "abort",
          () => {
            if (settled) return;
            settled = true;
            try {
              unsub?.();
            } catch {}
            void onDone();
          },
          { once: true },
        );
      }
      return;
    } catch (e: any) {
      // The background-job endpoint can be unavailable (not deployed / network
      // blip), which used to surface as a dead "Failed to fetch" turn. Fall
      // through to the normal streaming path instead of failing the message.
      const msg = String(e?.message || "");
      if (/sign in/i.test(msg)) {
        onError?.(msg);
        await onDone();
        return;
      }
      onStatus?.("");
    }
  }

  let receivedAnyContent = false;
  const origOnDelta = onDelta;
  onDelta = (chunk: string) => {
    if (chunk) receivedAnyContent = true;
    origOnDelta(chunk);
  };

  // Do not put the eight-query settings preflight on the critical path. The
  // fast lane is intentionally the first attempt for ordinary chat; when it
  // escalates, the full path below fetches the complete context before sending
  // the request so connected apps and MCP tools are still preserved.
  let hasConnectedTools = false;
  const rosterContext = readAgentRosterContext();

  // Rescue: the full chat path can stall before it emits a single byte (heavy
  // build/task prompts). Rather than leaving the user on an endless
  // "Thinking…", we stream a best-effort answer from the fast GPT model.
  const rescueWithFastChat = async (): Promise<boolean> => {
    if (receivedAnyContent || hasConnectedTools) return false;
    try {
      const outcome = await tryFastChat({
        messages,
        authToken: await getAccessToken(),
        fingerprint: getAnonFingerprint(),
        signal,
        onDelta,
        onModel,
        onUsage,
        onReasoning,
        thinking: deepThinkingEnabled(),
        force: true,
        routingContext: [
          `mode=${chatMode || "normal"}`,
          activeAgent ? `agent=${activeAgent}` : "",
          activeSkill ? "skill=enabled" : "",
          rosterContext,
          "escalate to the full service lane when tools, files, browsing, media, code, slides, or integrations are required",
        ]
          .filter(Boolean)
          .join("; "),
      });
      return outcome === "answered" && receivedAnyContent;
    } catch {
      return false;
    }
  };

  // ── Fast lane ───────────────────────────────────────────────────────────
  // Ordinary turns go to `chat-fast` first (no turn-context pre-flight). The
  // model streams direct answers or emits a hidden route sentinel to continue
  // in the full execution path when tools/specialists are genuinely needed.
  try {
    if (
      isFastLaneEligible({
        messages,
        chatMode,
        deepResearch,
        searchExplicit,
        computerUseEnabled,
        activeAgent,
        activeSkill,
        hasConnectedTools,
      })
    ) {
      const outcome = await tryFastChat({
        messages,
        authToken: await getAccessToken(),
        fingerprint: getAnonFingerprint(),
        signal,
        onDelta,
        onModel,
        onUsage,
        onReasoning,
        force: shouldForceFastTurn(messages),
        thinking: deepThinkingEnabled() && !isTrivialTurn(messages),
        ...(isTrivialTurn(messages) ? { maxTokens: 700 } : {}),
        routingContext: [
          `mode=${chatMode || "normal"}`,
          activeAgent ? `agent=${activeAgent}` : "",
          activeSkill ? "skill=enabled" : "",
          hasConnectedTools ? "connected_integrations=available" : "",
          rosterContext,
          "you are the front-door router; escalate to the full agent for tools, files, browsing, images, video, slides, code, or integrations",
        ]
          .filter(Boolean)
          .join("; "),
      });

      if (outcome === "answered") {
        await onDone();
        return;
      }
    }
  } catch (e: any) {
    if (e?.name === "AbortError") {
      await onDone();
      return;
    }
    if (receivedAnyContent) {
      onError?.("The reply was interrupted. You can ask me to continue.");
      await onDone();
      return;
    }
    /* fall through to the full chat path */
  }

  try {
    let completed = false;
    // Everything below is pre-flight work: it must all finish before the first
    // byte can be requested, so it runs in parallel instead of sequentially.
    const tokenPromise = getAccessToken();
    const turnCtxModPromise = import("@/lib/chat/turnContext");
    const promptsModPromise = import("@/lib/modelSystemPrompts");
    const capabilitiesModPromise = import("@/lib/chat/capabilities");
    const fingerprint = getAnonFingerprint();
    // Per-mode + per-model system prompt override (learning mode, model
    // voices, depth/language rules). The edge function uses customSystem
    // verbatim when present.
    // User-configured context (knowledge, tool servers, connected apps,
    // browser session preferences) — collected once per turn.
    let turnCtx: Awaited<
      ReturnType<typeof import("@/lib/chat/turnContext").fetchTurnContext>
    > | null = null;
    let turnCtxBrief = "";
    let turnCtxPayload: Record<string, unknown> = {};
    let authToken = await tokenPromise;
    try {
      const mod = await turnCtxModPromise;
      turnCtx = await mod.fetchTurnContext();
      turnCtxBrief = mod.buildTurnContextBrief(turnCtx);
      turnCtxPayload = mod.turnContextPayload(turnCtx);
    } catch {
      turnCtx = null;
    }
    let customSystem: string | null = null;
    try {
      const mod = await promptsModPromise;
      // In Learning mode, inject a compact live-learner signal so the
      // tutor actually adapts (streak, XP, Bloom rung, accuracy, topic).
      let learnState: string | null = null;
      if (chatMode === "learning") {
        try {
          const sp = await import("@/lib/studyProgress");
          learnState = sp.formatStudyStateForPrompt();
        } catch {
          learnState = null;
        }
      }
      // Deep Research is streamed as a "normal" turn to the backend (its own
      // research agent stalls), but the PROMPT must still be the research one —
      // otherwise the model answers like the plain site assistant.
      const promptMode = deepResearch ? "deep-research" : chatMode;
      customSystem = mod.buildCustomSystem(promptMode, selectedModel?.id, learnState);
      const { CAPABILITIES_BRIEF, buildDateBrief, SUPERVISOR_BRIEF } = await capabilitiesModPromise;
      customSystem =
        `${customSystem || ""}\n\n${buildDateBrief()}\n\n${CAPABILITIES_BRIEF}\n\n${SUPERVISOR_BRIEF}`.trim();
      if (turnCtxBrief) customSystem = `${customSystem}\n\n${turnCtxBrief}`.trim();
      if (chatMode !== "images" && chatMode !== "video") {
        const { chatModelPreferenceHint } = await import("@/lib/chatModelPreferences");
        const preferenceHint = chatModelPreferenceHint();
        if (preferenceHint) customSystem = `${customSystem || ""}\n${preferenceHint}`.trim();
      }
    } catch {
      customSystem = null;
    }
    if (rosterContext) customSystem = `${customSystem || ""}\n\n${rosterContext}`.trim();
    // Visual format override travels with the turn so the deployed server prompt
    // (which may still describe OpenUI) is superseded without a redeploy.
    customSystem = `${customSystem || ""}\n\nFINAL VISUAL RULE (overrides any earlier OpenUI/ui instructions):\n${GENUI_PROMPT}`.trim();
    // Assign a fresh resume id per turn so the server can persist stream
    // chunks and the client can fetch the tail after a network drop.
    const resumeId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `r-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    try {
      onEvent?.({ event: "resume_id", resumeId });
    } catch {
      /* ignore */
    }
    const requestBody = JSON.stringify({
      // Deep Research streams straight through: the server-side resume
      // buffer stalls long research turns, so we skip it in that mode.
      resume_id: deepResearch ? undefined : resumeId,

      messages,
      model,
      tier,
      // Deep Research runs fully inside our own agent: we already fetched and
      // injected the live sources, so the backend web tool stays OFF (it
      // stalls long research turns).
      searchEnabled,
      chatMode,
      user_id,
      conversation_id,
      computerUseEnabled,
      activeAgent,
      selectedModel,
      activeSkill,
      availableSkills,
      customSystem,
      // Deep-thinking toggle: the backend turns the model's reasoning stream
      // on so the UI's thinking panel has real content.
      thinking: deepThinkingEnabled(),

      ...turnCtxPayload,
      zone: (typeof window !== "undefined" && (window as any).__MEGSY_ZONE__) || "megsy",
    });
    let resp: Response | null = null;
    // Second deployment path: this app's own serverless chat endpoint
    // (`/api/chat` on Vercel, Vite middleware in dev) serves the turn from the
    // DB key pools — no Supabase edge deploy and no Vercel env vars needed.
    // Tried first because it is co-located with the app; the edge lane below
    // is the fallback when the local runtime has no provider key (503).
    if (localChatProxyUsable) {
      try {
        const primary = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ ...JSON.parse(requestBody), lane: "full" }),
          signal,
        });
        if (
          primary.ok &&
          primary.body &&
          (primary.headers.get("content-type") || "").includes("text/event-stream")
        ) {
          resp = primary;
        } else {
          // 503 = no local provider key in this environment. Remember that so
          // every later turn skips the dead probe instead of paying for it.
          if (primary.status === 503 || primary.status === 404 || primary.headers.get("x-local-unavailable") === "1") localChatProxyUsable = false;
          try {
            await primary.body?.cancel();
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* fall through to the Supabase edge function */
      }
    }

    // Keep generation alive until completion or an explicit Stop action.
    for (let attempt = 0; resp === null && attempt < 3; attempt += 1) {
      try {
        resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: edgeAnonKey("chat-alibaba"),
            Authorization: `Bearer ${authToken}`,
            "x-anon-fingerprint": fingerprint,
          },
          body: requestBody,
          signal,
        });
        if (resp.status === 401 && attempt === 0) {
          authToken = await refreshAccessToken();
          resp = null;
          continue;
        }
        if (resp.status >= 500 && attempt < 2) {
          await resp.body?.cancel();
          resp = null;
          await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
          continue;
        }
        break;
      } catch (error) {
        if (signal?.aborted || attempt === 2) throw error;
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      }
    }
    // Second deployment path: when the Supabase edge function is
    // unreachable or failing, the same turn is served by this app's local
    // serverless runtime (`/api/chat`), which streams the identical SSE.
    if (
      localChatProxyUsable &&
      (!resp || resp.status >= 500 || resp.status === 404)
    ) {
      try {
        const proxied = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ ...JSON.parse(requestBody), lane: "full" }),
          signal,
        });
        if (proxied.ok && proxied.body) resp = proxied;
      } catch {
        /* keep the original response/error */
      }
    }
    if (!resp) throw new Error("NETWORK_UNAVAILABLE");

    if (resp.status === 429) {
      onError?.("Rate limit exceeded. Please wait a moment and try again.");
      await onDone();
      return;
    }
    if (resp.status === 403) {
      // Guest-quota or auth-required errors come back as JSON with a code.
      const errBody = await resp.json().catch(() => ({}) as any);
      if (errBody?.code === "guest_quota_exceeded" || errBody?.code === "auth_required") {
        onError?.(GUEST_QUOTA_ERROR);
        await onDone();
        return;
      }
      onError?.(errBody?.error || "Access denied.");
      await onDone();
      return;
    }
    if (resp.status === 401) {
      onError?.(GUEST_QUOTA_ERROR);
      await onDone();
      return;
    }
    if (resp.status === 402) {
      onError?.("Insufficient balance. Please top up to continue.");
      await onDone();
      return;
    }
    if (resp.status === 503) {
      // Try the fast lane before telling the user anything: a busy full lane
      // should not turn into a dead turn.
      if (await rescueWithFastChat()) {
        await onDone();
        return;
      }
      onError?.("Chat service is temporarily unavailable. Please try again.");
      await onDone();
      return;
    }
    if (!resp.ok || !resp.body) {
      const errorText = await resp.text().catch(() => "");
      const genericError = /^(request|fetch) failed$/i.test(errorText.trim());
      const msg =
        (!genericError && errorText) ||
        (resp.status >= 500
          ? "Chat request failed before streaming. Please try again."
          : "Chat request failed.");
      onError?.(msg);
      await onDone();
      return;
    }

    try {
      const hdrModel = resp.headers.get("x-model-used");
      if (hdrModel) onModel?.(hdrModel);
    } catch {
      /* ignore */
    }

    let terminalStreamError = false;
    let receivedToolOutput = false;
    const handlePayload = (parsed: any) => {
      if (parsed.error) {
        terminalStreamError = true;
        onError?.(friendlyUpstreamError(String(parsed.error)));
        return;
      }

      if (
        (Array.isArray(parsed.images) && parsed.images.length > 0) ||
        (Array.isArray(parsed.products) && parsed.products.length > 0) ||
        parsed.browser || parsed.event === "tool_result" ||
        parsed.tool_event?.event === "tool_result"
      ) receivedToolOutput = true;
      if (parsed.event && typeof parsed.event === "string") onEvent?.(parsed);
      // Surface tool activity (tool_call / tool_result) as a synthetic event
      // so the chat UI can render brand icons + action text inline.
      if (parsed.tool_event && typeof parsed.tool_event === "object") {
        onEvent?.({ event: "tool_event", ...parsed.tool_event });
      }
      if (parsed.status && typeof parsed.status === "string") onStatus?.(parsed.status);
      if (parsed.images && Array.isArray(parsed.images)) onImages?.(parsed.images);
      if (parsed.products && Array.isArray(parsed.products)) onProducts?.(parsed.products);
      if (parsed.browser && typeof parsed.browser === "object") onBrowser?.(parsed.browser);
      if (parsed.usage && typeof parsed.usage === "object") onUsage?.(parsed.usage);
      if (parsed.model && typeof parsed.model === "string") onModel?.(parsed.model);
      const delta = parsed.choices?.[0]?.delta;
      const reasoning =
        (delta?.reasoning_content as string | undefined) ??
        (delta?.reasoning as string | undefined) ??
        (parsed.reasoning as string | undefined);
      if (reasoning) onReasoning?.(reasoning);
      const content = delta?.content as string | undefined;
      if (content) onDelta(content);
    };

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone && !terminalStreamError) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });
      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        const line = textBuffer.slice(0, newlineIndex).trimEnd();
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (!line.startsWith("data:")) continue;
        const jsonStr = line.slice(5).trim();
        if (jsonStr === "[DONE]") {
          completed = true;
          streamDone = true;
          break;
        }
        try {
          handlePayload(JSON.parse(jsonStr));
        } catch {
          /* Ignore malformed frames, not the rest of the stream. */
        }
        if (terminalStreamError) break;
      }
    }
    if (terminalStreamError) {
      await reader.cancel().catch(() => undefined);
      return;
    }
    textBuffer += decoder.decode();

    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data:")) continue;
        const jsonStr = raw.slice(5).trim();
        if (jsonStr === "[DONE]") {
          completed = true;
          continue;
        }
        try {
          handlePayload(JSON.parse(jsonStr));
        } catch {
          continue;
        }
      }
    }

    if (!terminalStreamError && !receivedAnyContent && !receivedToolOutput) {
      onError?.("The chat service returned no answer. Please try again.");
      return;
    }

    if (!completed && !terminalStreamError) {
      onError?.(
        deepResearch && !receivedAnyContent
          ? "Deep Research stopped before the report finished. Please try again."
          : receivedAnyContent
            ? "The reply was interrupted before it finished. You can ask me to continue."
            : "The response ended before it finished. Please try again.",
      );
      await onDone();
      return;
    }

    // The error callback may launch an asynchronous fallback agent. Running
    // onDone as well races that fallback, fills the assistant bubble with the
    // empty-response placeholder and can save it before the fallback finishes.
    if (!terminalStreamError) await onDone();
  } catch (e: any) {
    if (e?.name === "AbortError") {
      await onDone();
      return;
    }
    if (e?.message === "IDLE_TIMEOUT") {
      if (!receivedAnyContent && (await rescueWithFastChat())) {
        await onDone();
        return;
      }
      onError?.(
        receivedAnyContent
          ? "Reply was cut off — the connection stalled. You can ask me to continue."
          : "Chat took too long to start streaming. Please try again.",
      );
      await onDone();
      return;
    }
    console.error("Stream error:", e);
    const isNetworkError =
      !navigator.onLine ||
      e?.message?.includes("Failed to fetch") ||
      e?.message?.includes("NetworkError") ||
      e?.message?.includes("ERR_NETWORK");
    if (isNetworkError) {
      onError?.(
        receivedAnyContent
          ? "Connection dropped mid-reply — the answer above may be incomplete. Ask me to continue when you're back online."
          : "Connection error. Please check your internet and try again.",
      );
    } else {
      onError?.(
        receivedAnyContent
          ? "The reply was interrupted. You can ask me to continue."
          : "Something went wrong. Please try again.",
      );
    }
    await onDone();
  }
}
