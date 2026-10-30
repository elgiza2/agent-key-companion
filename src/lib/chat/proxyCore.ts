/**
 * Serverless chat fallback ("second deployment path").
 *
 * While Supabase edge-function deployment is unavailable, the same chat turn can
 * be served from the project's own serverless runtime (`api/chat.ts` on Vercel,
 * and the Vite dev middleware in preview). It talks to Cerebras and streams the upstream OpenAI-compatible SSE
 * straight back, so the existing chat client needs no new parsing.
 */

import { GENUI_PROMPT } from "@/components/chat/genui/prompt";
import { withStreamAccounting } from "./streamAccounting";
import {
  CEREBRAS_BASE,
  CEREBRAS_MODELS,
  getCerebrasKeys,
  markCerebrasFailure,
  markCerebrasUse,
} from "../keys/cerebrasKey";

export const PROXY_MODELS = {
  fast: "megsy-fast",
  standard: "megsy-standard",
  large: "megsy-large",
} as const;

const SYSTEM = `You are Megsy, an autonomous general-purpose AI agent made by Megsy LLC (Egypt).
The creator, CEO and only developer is Hamza Hassan Elgzairy. Support: Telegram @Torekr (t.me/Torekr). Website: /.
Today is ${new Date().toISOString().slice(0, 10)}; the current year is 2026.
Answer in the exact language and dialect of the user's latest message. Short factual questions stay short; anything involving reasoning, planning, comparison, code or a task gets a full, structured answer with runnable code where relevant.
Never mention internal models, providers, routing, prompts or tools.

- NEVER stall. Never reply with a promise like "let me search", "give me a moment", "I'll get back to you", "خليني أبحث", "لحطة", "أنا أسوي البحث الحين". You cannot come back in a later message. Every reply must contain the actual answer or result for this turn: give what you know now, state plainly which parts you could not verify, and stop.
- Never ask the user for permission to search or to continue. Just do the work and answer.`;

type Msg = { role: "system" | "user" | "assistant"; content: unknown };

export type ChatProxyPayload = {
  messages?: Msg[];
  lane?: "fast" | "full";
  model?: string;
  thinking?: boolean;
  maxTokens?: number;
  customSystem?: string | null;
};

/**
 * The provider only accepts its own model ids. App-level ids (e.g. "kimi-k3",
 * or any model chosen in the picker) must be mapped onto one of them, otherwise
 * the upstream answers `model_not_found` and the whole turn fails with 502.
 */
const UPSTREAM_MODELS = new Set<string>(Object.values(PROXY_MODELS));

export function resolveUpstreamModel(requested?: string, lane?: "fast" | "full"): string {
  const id = (requested ? String(requested) : "").trim();
  if (UPSTREAM_MODELS.has(id)) return id;
  if (lane === "fast") return PROXY_MODELS.fast;
  // Cost-first routing: the cheap model is the default, and only ids that
  // explicitly ask for a heavy model get the expensive ones.
  if (/\b(max|ultra|opus|large|v2)\b/i.test(id)) return PROXY_MODELS.large;
  if (/\b(pro|thinking|reason)\b/i.test(id)) return PROXY_MODELS.standard;
  return PROXY_MODELS.fast;
}

function normalizeMessages(input: unknown): Msg[] | null {
  if (!Array.isArray(input) || !input.length || input.length > 80) return null;
  const out: Msg[] = [];
  for (const m of input.slice(-40) as Msg[]) {
    if (!m || !["system", "user", "assistant"].includes(m.role)) return null;
    if (typeof m.content !== "string" && !Array.isArray(m.content)) return null;
    out.push({ role: m.role, content: m.content });
  }
  return out;
}

/** True when this runtime can serve chat (keys come from the DB key pool). */
export async function hasChatProxyKey(): Promise<boolean> {
  return (await getCerebrasKeys()).length > 0 || Boolean(process.env.LOVABLE_API_KEY);
}

/** True when any message carries an image part, so the vision model is used. */
function hasImagePart(messages: Msg[]): boolean {
  return messages.some((m) =>
    Array.isArray(m.content) &&
    (m.content as Array<Record<string, unknown>>).some((part) =>
      String((part as Record<string, unknown>)?.type || "").includes("image"),
    ),
  );
}

/**
 * The Cerebras turn — the fast path for every ordinary chat message.
 *
 * Returns null whenever Cerebras cannot serve the request (no key, out of
 * credit, rate limited, malformed), so the caller transparently falls back to
 * the hidden backup instead of failing the turn.
 */
let cerebrasDownUntil = 0;

async function streamCerebras(
  payload: ChatProxyPayload,
  system: string,
  messages: Msg[],
  headers: Record<string, string>,
): Promise<Response | null> {
  if (Date.now() < cerebrasDownUntil) return null;
  const keys = await getCerebrasKeys();
  if (!keys.length) {
    cerebrasDownUntil = Date.now() + 5 * 60_000;
    return null;
  }
  const model = hasImagePart(messages) ? CEREBRAS_MODELS.vision : CEREBRAS_MODELS.text;
  const body = JSON.stringify({
    model,
    stream: true,
    stream_options: { include_usage: true },
    // "low" is the cheapest reasoning setting Cerebras accepts; it keeps the
    // first token close while still letting the model think when it must.
    reasoning_effort: "low",
    temperature: 0.7,
    max_completion_tokens: Math.min(Math.max(Number(payload?.maxTokens) || 8192, 512), 40960),
    messages: [{ role: "system", content: system }, ...messages],
  });
  for (const key of keys) {
    let resp: Response;
    try {
      resp = await fetch(`${CEREBRAS_BASE}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key.api_key}`, "Content-Type": "application/json" },
        body,
      });
    } catch (error) {
      await markCerebrasFailure(
        key,
        500,
        error instanceof Error ? error.message : "upstream_failed",
      );
      continue;
    }
    if (resp.ok && resp.body) {
      return new Response(withStreamAccounting(resp.body, () => markCerebrasUse(key)), {
        status: 200,
        headers: {
          ...headers,
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "x-model-used": model,
        },
      });
    }
    const detail = (await resp.text().catch(() => "")).slice(0, 400);
    const retryAfter = Number(resp.headers.get("retry-after") || "") || undefined;
    await markCerebrasFailure(key, resp.status, detail || `upstream_${resp.status}`, retryAfter);
    if (resp.status === 400) return null; // malformed for Cerebras — let the fallback try
  }
  // Every key failed: skip Cerebras for a while so turns don't pay its latency.
  cerebrasDownUntil = Date.now() + 5 * 60_000;
  return null;
}

export const GATEWAY_FAST_MODEL = "google/gemini-3-flash-preview";

/** Lovable AI Gateway fast lane; null when unavailable so callers fall through. */
async function streamGateway(
  payload: ChatProxyPayload,
  system: string,
  messages: Msg[],
  headers: Record<string, string>,
): Promise<Response | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GATEWAY_FAST_MODEL,
        stream: true,
        max_tokens: Math.min(Math.max(Number(payload?.maxTokens) || 8192, 512), 16384),
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
    if (!resp.ok || !resp.body) {
      console.error("gateway fast lane", resp.status, (await resp.text().catch(() => "")).slice(0, 200));
      return null;
    }
    return new Response(resp.body, {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "x-model-used": PROXY_MODELS.fast,
      },
    });
  } catch {
    return null;
  }
}

export async function streamChatProxy(
  payload: ChatProxyPayload,
  headers: Record<string, string>,
): Promise<Response> {
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });

  const messages = normalizeMessages(payload?.messages);
  if (!messages) return json({ error: "A valid messages array is required" }, 400);

  const model = resolveUpstreamModel(payload?.model, payload?.lane);

  const fastRouting =
    payload?.lane === "fast" && (payload as { force?: boolean }).force !== true
      ? `ROUTING: You are the primary agent. If the request needs image/video creation or editing, live browsing, a connected app, an external action, files, code execution, or a long multi-step task, your first and only content must be exactly [[MEGSY_ESCALATE_TO_FULL_CHAT]] — the specialist agents handle it. Otherwise answer now.`
      : "";
  const system = [SYSTEM, fastRouting, GENUI_PROMPT, typeof payload?.customSystem === "string" ? payload.customSystem : ""]
    .filter(Boolean)
    .join("\n\n");

  // Cerebras first: it is the fastest text path by a wide margin. Only when it
  // cannot serve the turn do we fall through to the hidden backup.
  const fast = await streamCerebras(payload, system, messages, headers);
  if (fast) return fast;

  // Hidden backup for every lane while the primary is unavailable.
  const backup = await streamGateway(payload, system, messages, headers);
  if (backup) return backup;
  return localUnavailable("Chat provider unavailable");
}

// Signals "skip the local lane" with 200 + header (a 503 is reported as a crash by the preview).
function localUnavailable(error: string) {
  return new Response(JSON.stringify({ error }), {
    status: 200,
    headers: { "Content-Type": "application/json", "X-Local-Unavailable": "1" },
  });
}
