/** @doc Browser client for /api/agent/* — the only way the UI talks to the AgentSky agent. */
import { supabase } from "@/integrations/supabase/client";
import { edgeAnonKey, edgeHeaders, edgeUrl } from "@/lib/edgeRuntime";
import { readEventStream } from "./readEventStream";

export type AgentColor = "aurora" | "ocean" | "ember" | "mint" | "sun" | "rose" | "mono";

export type AgentInfo = {
  id: string;
  name: string;
  description: string;
  color: AgentColor;
  prompt: string;
  isDefault: boolean;
  isTemplate?: boolean;
  mediaOnly?: boolean;
  createdAt: string;
};

export type MediaModelInfo = {
  id: string;
  kind: "image" | "video";
  label: string;
  tier: "free" | "pro";
  locked: boolean;
};

export type SessionInfo = {
  id: string;
  agentId: string;
  title: string;
  status: string;
  createdAt: string;
};

export type AgentRequest = {
  id: string;
  session_id: string;
  kind: "question" | "approval" | "connect_app";
  subject: string | null;
  question: string;
  options: { id: string; label: string; description?: string }[];
  allow_free_text: boolean;
};

export class AgentApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in required");
  const headers = new Headers(edgeHeaders("agentsky", token));
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  const res = await fetch(`${edgeUrl("agentsky")}?path=${encodeURIComponent(path)}`, {
    ...init,
    headers,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new AgentApiError(
      res.status,
      body?.error?.code || "error",
      body?.error?.message || "Request failed",
    );
  return body as T;
}

export const agentApi = {
  bootstrap: () =>
    req<{ agents: AgentInfo[]; tier: "free" | "pro"; models: MediaModelInfo[] }>("bootstrap"),
  createAgent: (a: { name: string; description: string; prompt: string; color: AgentColor }) =>
    req<{ agent: AgentInfo }>("agents", { method: "POST", body: JSON.stringify(a) }),
  deleteAgent: (id: string) => req("agents/" + id, { method: "DELETE" }),
  sessions: () => req<{ sessions: SessionInfo[] }>("sessions"),
  createSession: (p: { agentId?: string; text: string; images?: string[] }) =>
    req<{ session: SessionInfo; agent?: AgentInfo }>("sessions", {
      method: "POST",
      body: JSON.stringify(p),
    }),
  session: (id: string) => req<{ session: SessionInfo }>("sessions/" + id),
  renameSession: (id: string, title: string) =>
    req("sessions/" + id, { method: "PATCH", body: JSON.stringify({ title }) }),
  deleteSession: (id: string) => req("sessions/" + id, { method: "DELETE" }),
  events: (id: string) => req<{ events: RawEvent[]; status: string }>(`sessions/${id}/events`),
  send: (id: string, text: string, images?: string[]) =>
    req(`sessions/${id}/messages`, { method: "POST", body: JSON.stringify({ text, images }) }),
  interrupt: (id: string) =>
    req<{ status: string }>(`sessions/${id}/interrupt`, { method: "POST", body: "{}" }),
  requests: (id: string) =>
    req<{ requests: AgentRequest[]; sessions: any[] }>(`sessions/${id}/requests`),
  tasks: () =>
    req<{
      tasks: {
        id: string;
        agentId: string;
        title: string | null;
        attention: string;
        statusLine: string | null;
        openRequests: number;
        helpers: number;
        lastActivityAt: string;
      }[];
    }>("tasks"),
  taskSessions: (id: string) =>
    req<{ sessions: { id: string }[] }>(`tasks/${encodeURIComponent(id)}`),
  media: (p: {
    kind: "image" | "video";
    prompt: string;
    aspect?: string;
    duration?: number;
    model?: string;
    idempotencyKey?: string;
  }) =>
    req<{ runId: string; token: string; model: string; status: string }>("media", {
      method: "POST",
      body: JSON.stringify(p),
    }),
};

export async function mediaStatus(runId: string, token: string) {
  const r = await fetch(
    `${edgeUrl("agentsky")}?route=media-status&runId=${encodeURIComponent(runId)}&t=${encodeURIComponent(token)}`,
    {
      headers: {
        apikey: edgeAnonKey("agentsky"),
        Authorization: `Bearer ${edgeAnonKey("agentsky")}`,
      },
    },
  );
  return (await r.json()) as { status: string; urls: string[]; error?: string };
}

/* ---------------- events ---------------- */

export type RawEvent = {
  id: string;
  type: string;
  at?: string;
  parts?: any[];
  part?: any;
  content?: any[];
  text?: string;
  stop_reason?: { type: string };
};

/** A true callback result closes this subscription at the logical end of a turn. */
export async function openStream(
  sessionId: string,
  onEvent: (e: RawEvent) => boolean | void,
  signal: AbortSignal,
) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in required");
  const res = await fetch(
    `${edgeUrl("agentsky")}?path=${encodeURIComponent(`sessions/${sessionId}/stream`)}`,
    {
      signal,
      headers: edgeHeaders("agentsky", token),
    },
  );
  if (!res.ok || !res.body) throw new AgentApiError(res.status, "stream", "Stream failed");
  await readEventStream(res.body, onEvent);
}
