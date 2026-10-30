import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useChatNewChat } from "./useChatLifecycleActions";

describe("useChatNewChat", () => {
  it("starts ordinary new chats with computer use disabled", () => {
    const setComputerUseEnabled = vi.fn();
    const args = {
      slidesGenerationTokenRef: { current: 0 },
      slidesTimeoutsRef: { current: {} },
      studyAudioRef: { current: null },
      setStudyTimers: vi.fn(),
      setStudyMusic: vi.fn(),
      setMessages: vi.fn(),
      setConversationId: vi.fn(),
      setConversationTitle: vi.fn(),
      setIsLoading: vi.fn(),
      setIsThinking: vi.fn(),
      setAttachedFiles: vi.fn(),
      resetToolUi: vi.fn(),
      setChatMode: vi.fn(),
      setSearchEnabled: vi.fn(),
      setComputerUseEnabled,
      setIsShared: vi.fn(),
      setShareId: vi.fn(),
      setShareMode: vi.fn(),
      setIsPinned: vi.fn(),
      setPendingQuestions: vi.fn(),
      setSelectedModel: vi.fn(),
      setSelectedAgent: vi.fn(),
      isSubmittingRef: { current: true },
    };

    const { result } = renderHook(() => useChatNewChat(args));
    act(() => result.current());

    expect(setComputerUseEnabled).toHaveBeenCalledWith(false);
  });
});
