import { beforeEach, describe, expect, it, vi } from "vitest";
import { runAgentSkyTurn } from "./runAgentSkyTurn";
import type { Message } from "../chatConstants";
import type { RawEvent } from "@/lib/agentsky/client";

const mocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  session: vi.fn(),
  events: vi.fn(),
  send: vi.fn(),
  interrupt: vi.fn(),
  requests: vi.fn(),
  stream: vi.fn(),
}));
vi.mock("@/lib/agentsky/client", () => ({ agentApi: mocks, openStream: mocks.stream }));
vi.mock("@/lib/agentsky/store", () => ({
  loadWorkspace: vi.fn(),
  workspace: {
    agent: () => ({ id: "agent", name: "Researcher", color: "ocean" }),
    upsertSession: vi.fn(),
    addAgent: vi.fn(),
  },
}));

function setup(sessionId?: string) {
  let messages: Message[] = [];
  const saveMessage = vi.fn().mockResolvedValue("saved");
  const args = {
    text: "Hello",
    userMsg: { role: "user" as const, content: "Hello" },
    localTurnId: "turn",
    sessionId,
    lang: "en" as const,
    setMessages: (update: Message[] | ((prev: Message[]) => Message[])) => {
      messages = typeof update === "function" ? update(messages) : update;
    },
    setInput: vi.fn(),
    setAttachedFiles: vi.fn(),
    setIsLoading: vi.fn(),
    setIsThinking: vi.fn(),
    abortControllerRef: { current: null as AbortController | null },
    createOrUpdateConversation: vi.fn().mockResolvedValue("conversation"),
    saveMessage,
    ownInsertedIdsRef: { current: new Set<string>() },
    onRequests: vi.fn(),
    onSession: vi.fn(),
    onFallback: vi.fn().mockResolvedValue(false),
  };
  return { args, messages: () => messages, saveMessage };
}
const running: RawEvent = { id: "run", type: "session.status_running" };
const answer: RawEvent = {
  id: "answer",
  type: "agent.message",
  parts: [{ type: "text", text: "Hi there" }],
};
const idle: RawEvent = { id: "idle", type: "session.status_idle" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.createSession.mockResolvedValue({ session: { id: "session", agentId: "agent" } });
  mocks.session.mockResolvedValue({ session: { id: "session", agentId: "agent" } });
  mocks.events.mockResolvedValue({ events: [], status: "idle" });
  mocks.requests.mockResolvedValue({ requests: [] });
  mocks.interrupt.mockResolvedValue({ status: "idle" });
});
describe("original chat agent turn lifecycle", () => {
  it("routes media to Hypit and preserves the yellow Higgsfield identity", async () => {
    const test = setup("old-session");
    test.args.text = "Create an image of a cat";
    mocks.createSession.mockResolvedValue({
      session: { id: "media-session", agentId: "hypit-owned" },
      agent: { id: "hypit-owned", name: "higgsfield", color: "sun" },
    });
    mocks.stream.mockImplementation(async (_sid, callback) => {
      callback(running);
      callback(idle);
    });
    await runAgentSkyTurn(test.args);
    expect(mocks.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: "higgsfield" }),
    );
    expect(mocks.send).not.toHaveBeenCalled();
    expect(test.messages()[1].agentSkyAgent).toMatchObject({ name: "higgsfield", color: "sun" });
  });
  it("wakes on the first turn only and thinks immediately on subsequent turns", async () => {
    const first = setup();
    mocks.stream.mockImplementation(async (_sid, callback) => {
      expect(first.messages()[1].agentSkyState).toBe("awakening");
      callback(running);
      callback(idle);
    });
    await runAgentSkyTurn(first.args);
    const next = setup("session");
    mocks.stream.mockImplementation(async (_sid, callback) => {
      expect(next.messages()[1].agentSkyState).toBe("thinking");
      callback(running);
      callback(idle);
    });
    await runAgentSkyTurn(next.args);
  });
  it("returns terminal signal, releases loading and saves identity and completed response", async () => {
    mocks.stream.mockImplementation(async (_sid, callback) => {
      expect(callback(running)).toBe(false);
      expect(callback(answer)).toBe(false);
      expect(callback(idle)).toBe(true);
    });
    const test = setup();
    await runAgentSkyTurn(test.args);
    expect(test.args.setIsLoading).toHaveBeenLastCalledWith(false);
    expect(test.messages()[1]).toMatchObject({
      content: "Hi there",
      agentPending: false,
      agentSkyState: "done",
      agentSkyAgent: { name: "Researcher", color: "ocean" },
    });
    expect(test.saveMessage).toHaveBeenCalledWith(
      "conversation",
      "assistant",
      "Hi there",
      undefined,
      expect.objectContaining({ agentSkyAgent: expect.objectContaining({ id: "agent" }) }),
    );
  });
  it("ignores replayed terminal events from previous turns", async () => {
    mocks.events.mockResolvedValue({
      events: [{ id: "old-idle", type: "session.status_idle" }],
      status: "idle",
    });
    mocks.stream.mockImplementation(async (_sid, callback) => {
      expect(callback({ id: "old-idle", type: "session.status_idle" })).toBe(false);
      callback(running);
      callback(answer);
      expect(callback(idle)).toBe(true);
    });
    const test = setup("session");
    await runAgentSkyTurn(test.args);
    expect(test.messages()[1].content).toBe("Hi there");
  });
  it("stops before first tokens, interrupts the agent and removes the waiting state", async () => {
    const test = setup();
    mocks.stream.mockImplementation(async (_sid, _callback, signal) => {
      test.args.abortControllerRef.current?.abort();
      expect(signal.aborted).toBe(true);
      throw new DOMException("Aborted", "AbortError");
    });
    await runAgentSkyTurn(test.args);
    expect(mocks.interrupt).toHaveBeenCalledWith("session");
    expect(test.messages()[1]).toMatchObject({
      agentPending: false,
      agentSkyStopped: true,
      agentSkyState: "idle",
    });
    expect(test.args.setIsThinking).toHaveBeenLastCalledWith(false);
  });
  it("preserves partial text and settled steps when stopped mid-stream", async () => {
    const test = setup();
    mocks.stream.mockImplementation(async (_sid, callback) => {
      callback(running);
      callback(answer);
      test.args.abortControllerRef.current?.abort();
      throw new DOMException("Aborted", "AbortError");
    });
    await runAgentSkyTurn(test.args);
    expect(test.messages()[1]).toMatchObject({ content: "Hi there", agentSkyStopped: true });
    expect(test.saveMessage).toHaveBeenCalledWith(
      "conversation",
      "assistant",
      "Hi there",
      undefined,
      expect.objectContaining({ agentSkyStopped: true }),
    );
  });
  it("uses the Browser Use fallback when AgentSky is temporarily unavailable", async () => {
    const test = setup();
    mocks.createSession.mockRejectedValue(
      Object.assign(new Error("upstream unavailable"), { status: 503 }),
    );
    test.args.onFallback = vi.fn(async () => {
      test.args.setMessages((prev) =>
        prev.map((message) =>
          message.clientId === "assistant-turn"
            ? { ...message, content: "Browser Use fallback running", agentPending: false }
            : message,
        ),
      );
      return true;
    });

    await runAgentSkyTurn(test.args);

    expect(test.args.onFallback).toHaveBeenCalledWith("upstream unavailable");
    expect(test.messages()[1].content).toBe("Browser Use fallback running");
    expect(test.saveMessage).not.toHaveBeenCalled();
    expect(test.args.setIsLoading).toHaveBeenLastCalledWith(false);
  });
  it("does not use Browser Use as a media-policy bypass", async () => {
    const test = setup();
    test.args.text = "Create an image of a cat";
    mocks.createSession.mockRejectedValue(
      Object.assign(new Error("upstream unavailable"), { status: 503 }),
    );

    await runAgentSkyTurn(test.args);

    expect(test.args.onFallback).not.toHaveBeenCalled();
    expect(test.saveMessage).toHaveBeenCalled();
  });
  it("retries session creation once on a transient blip instead of failing", async () => {
    const test = setup();
    mocks.createSession
      .mockRejectedValueOnce(Object.assign(new Error("upstream unavailable"), { status: 503 }))
      .mockResolvedValue({ session: { id: "session", agentId: "agent" } });
    mocks.stream.mockImplementation(async (_sid, callback) => {
      callback(running);
      callback(answer);
      callback(idle);
    });
    await runAgentSkyTurn(test.args);
    expect(mocks.createSession).toHaveBeenCalledTimes(2);
    expect(test.messages()[1].content).toBe("Hi there");
  });
  it("drops a dead session and starts fresh instead of failing the turn", async () => {
    const test = setup("dead-session");
    mocks.session.mockRejectedValue(Object.assign(new Error("session not found"), { status: 404 }));
    mocks.createSession.mockResolvedValue({ session: { id: "fresh", agentId: "agent" } });
    mocks.stream.mockImplementation(async (_sid, callback) => {
      callback(running);
      callback(answer);
      callback(idle);
    });
    await runAgentSkyTurn(test.args);
    expect(mocks.createSession).toHaveBeenCalled();
    expect(test.messages()[1].content).toBe("Hi there");
  });
  it("explains a rejected key instead of showing a raw provider error", async () => {
    const test = setup();
    mocks.createSession.mockRejectedValue(
      Object.assign(new Error("AgentSky 401"), { status: 401 }),
    );
    await runAgentSkyTurn(test.args);
    expect(test.messages()[1].content).toMatch(/401\/403|مفتاح الوكيل/);
  });
  it("keeps watching through short stream blips instead of failing after 3", async () => {
    const test = setup();
    let calls = 0;
    mocks.stream.mockImplementation(async (_sid, callback) => {
      calls++;
      if (calls <= 3) throw new Error("network blip");
      callback(running);
      callback(answer);
      callback(idle);
    });
    await runAgentSkyTurn(test.args);
    expect(calls).toBeGreaterThan(3);
    expect(test.messages()[1].content).toBe("Hi there");
  }, 30_000);
});
