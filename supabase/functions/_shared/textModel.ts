/**
 * Text-model routing: Cerebras first, then a hidden backup lane.
 * Both are OpenAI-compatible, so callers keep their payload/SSE contract.
 */
import { callCerebras } from "./cerebras.ts";
import {
  noteProviderFailure,
  noteProviderSuccess,
  providerBlocked,
} from "./providerBreaker.ts";

/** Model ladder, strongest first for heavy turns, `fast` for the fast lane. */
export const MODELS = {
  fast: "megsy-fast",
  standard: "megsy-standard",
  large: "megsy-large",
} as const;

/** Every model id, in fallback order. */
export const MODEL_LADDER: string[] = [MODELS.standard, MODELS.fast, MODELS.large];

interface Admin {
  from: (table: string) => any;
}

export function hasModelProvider(): boolean {
  return Boolean(Deno.env.get("CEREBRAS_API_KEY") || Deno.env.get("LOVABLE_API_KEY"));
}

/** Maps any legacy/model-picker id onto a Megsy model id. */
export function resolveModel(requested?: string | null): string {
  const id = (requested ?? "").trim().toLowerCase();
  if (!id) return MODELS.standard;
  if (MODEL_LADDER.includes(id)) return id;
  if (/(flash|turbo|mini|fast|small)/.test(id)) return MODELS.fast;
  return MODELS.standard;
}

const BACKUP_MODEL = "google/gemini-3-flash-preview";
async function callBackup(payload: Record<string, unknown>): Promise<ModelResponse | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  if (providerBlocked("gateway", BACKUP_MODEL)) return null;
  const {
    agentRole: _r, enable_thinking: _et, thinking_budget: _tb, enable_search: _es, search_options: _so,
    incremental_output: _io, result_format: _rf, include_reasoning: _ir, web_search_options: _ws,
    reasoning_effort: _re, ...rest
  } = payload as Record<string, any>;
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...rest, model: BACKUP_MODEL }),
    });
    if (response.ok) {
      noteProviderSuccess("gateway");
      return { response, model: MODELS.fast };
    }
    console.error(`backup [${response.status}]: ${(await response.text().catch(() => "")).slice(0, 300)}`);
    noteProviderFailure("gateway", BACKUP_MODEL, response.status);
  } catch (error) {
    console.error("backup request failed", error);
  }
  return null;
}

export interface ModelResponse {
  response: Response;
  model: string;
  keyId?: string;
}

/** One chat-completions call: Cerebras, then the hidden backup; null when neither works. */
export async function callModel(
  admin: Admin | null,
  models: string[],
  payload: Record<string, unknown>,
): Promise<ModelResponse | null> {
  const role = typeof (payload as Record<string, unknown>).agentRole === "string"
    ? String((payload as Record<string, unknown>).agentRole)
    : null;
  const cerebras = await callCerebras(models, payload, role, admin);
  if (cerebras) return { response: cerebras.response, model: cerebras.model };
  return await callBackup(payload);
}
