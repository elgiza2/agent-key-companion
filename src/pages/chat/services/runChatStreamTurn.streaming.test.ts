import { afterEach, describe, expect, it, vi } from "vitest";
import type { Message } from "../chatConstants";

const { streamMock } = vi.hoisted(() => ({ streamMock: vi.fn() }));
vi.mock("@/lib/streamChat", () => ({ streamChat: streamMock, GUEST_QUOTA_ERROR: "quota" }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/cachedUser", () => ({ getCachedUser: vi.fn() }));
vi.mock("./conversationApi", () => ({ updateMessageMetadata: vi.fn() }));
import { runChatStreamTurn, type RunChatStreamTurnOptions } from "./runChatStreamTurn";

describe("received chat content", () => {
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it("shows the entire first chunk immediately and preserves whitespace deltas", async () => {
    vi.useFakeTimers();
    let messages: Message[] = [{ role: "assistant", content: "", clientId: "assistant-test" }];
    const noop = vi.fn();
    const options: RunChatStreamTurnOptions = {
      messages: [], userMsg: { role: "user", content: "اشرح الفكرة" }, currentFiles: [], userInput: "اشرح الفكرة",
      localTurnId: "test", assistantMessageIndex: 0, conversationId: null, conversationPromise: Promise.resolve(null),
      chatMode: "normal", searchEnabled: false, megsyTier: "free", chatUserId: null,
      computerUseEnabled: false, selectedAgent: null, selectedModel: null, enabledSkills: [], librarySkills: [], researchDepth: "normal",
      setMessages: (update) => { messages = typeof update === "function" ? update(messages) : update; },
      setIsLoading: noop, setIsThinking: noop, setSearchStatus: noop, setActiveResearchJobId: noop,
      setNarrations: noop, setClarifyQs: noop, setToolActivity: noop, setParallelTasks: noop,
      abortControllerRef: { current: null }, presenceChannelRef: { current: null }, ownInsertedIdsRef: { current: new Set() },
      isSubmittingRef: { current: true }, resetToolUi: noop, pushNarration: noop, saveMessage: async () => undefined,
    };
    const firstChunk = "ده أول جزء كامل من الإجابة بدون انتظار كتابة مصطنعة.";
    streamMock.mockImplementation(async ({ onDelta }) => {
      onDelta(firstChunk);
      expect(messages[0]?.content).toBe(firstChunk);
      onDelta("\n\n");
      onDelta("الجزء التالي");
      await vi.advanceTimersByTimeAsync(16);
      expect(messages[0]?.content).toBe(`${firstChunk}\n\nالجزء التالي`);
    });
    await runChatStreamTurn(options);
  });
});