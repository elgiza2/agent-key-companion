import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jobs/client", () => ({ startJob: vi.fn(), subscribeJob: vi.fn(), resumeJob: vi.fn() }));
vi.mock("@/lib/anonFingerprint", () => ({ getAnonFingerprint: () => "f" }));
vi.mock("@/lib/agentsky/rosterSettings", () => ({ readAgentRosterContext: () => "" }));
vi.mock("@/lib/chatModelPreferences", () => ({ readChatModelPreferences: () => ({}), chatModelPreferenceHint: () => "" }));
vi.mock("@/lib/chat/turnContext", () => ({ fetchTurnContext: async () => ({}), buildTurnContextBrief: () => "", turnContextPayload: () => ({}) }));
vi.mock("@/lib/modelSystemPrompts", () => ({ buildCustomSystem: () => "" }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: "caller-token", expires_at: 9999999999 } } }) } } }));

import { streamChat } from "./streamChat";

describe("full chat completion", () => {
  afterEach(() => vi.unstubAllGlobals());
  const response = (frames: string) => new Response(frames, { headers: { "Content-Type": "text/event-stream" } });
  const messages = [{ role: "user" as const, content: "x".repeat(21000) }];

  it("routes empty completion to error instead of successful completion", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response("data:[DONE]\n\n")));
    const onDone = vi.fn();
    const onError = vi.fn();
    await streamChat({ messages, onDelta: vi.fn(), onDone, onError });
    expect(onError).toHaveBeenCalledOnce();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("reads compact and unterminated SSE frames with the signed-in session", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response('data:{"choices":[{"delta":{"content":"Real answer"}}]}\n\ndata:[DONE]'));
    vi.stubGlobal("fetch", fetchMock);
    const onDelta = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();
    await streamChat({ messages, onDelta, onDone, onError });
    expect(onDelta).toHaveBeenCalledWith("Real answer");
    expect(onDone).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get("Authorization")).toBe("Bearer caller-token");
  });
});