import { describe, expect, it } from "vitest";
import { shouldUseFastChat } from "./shouldUseFastChat";

const base = {
  userId: "user-1",
  text: "What is 2 + 2?",
  chatMode: "normal",
  messages: [] as Array<{ role: "user" | "assistant"; content: string }>,
  hasSelectedModel: false,
  hasAttachments: false,
  computerUseEnabled: false,
};

describe("shouldUseFastChat", () => {
  it("routes ordinary signed-in text turns and plain-text history to the quick lane", () => {
    expect(shouldUseFastChat(base)).toBe(true);
    expect(
      shouldUseFastChat({
        ...base,
        messages: [
          { role: "user", content: "Earlier question", mode: "normal" },
          { role: "assistant", content: "Earlier answer", mode: "normal" },
        ],
      }),
    ).toBe(true);
  });

  it("keeps explicit agents, models, non-normal modes, and guests on their existing route", () => {
    expect(shouldUseFastChat({ ...base, userId: null })).toBe(false);
    expect(shouldUseFastChat({ ...base, chatMode: "deep-research" })).toBe(false);
    expect(shouldUseFastChat({ ...base, requestedAgentId: "agent-1" })).toBe(false);
    expect(shouldUseFastChat({ ...base, selectedAgentId: "agent-1" })).toBe(false);
    expect(shouldUseFastChat({ ...base, hasSelectedModel: true })).toBe(false);
  });

  it("sends explicit media requests straight to the media agent and keeps attachment/computer routing", () => {
    expect(shouldUseFastChat({ ...base, text: "Make a logo for my cafe" })).toBe(false);
    expect(shouldUseFastChat({ ...base, text: "عايز فيديو قصير" })).toBe(false);
    expect(shouldUseFastChat({ ...base, text: "What is a good logo color?" })).toBe(true);
    expect(shouldUseFastChat({ ...base, hasAttachments: true })).toBe(false);
    expect(shouldUseFastChat({ ...base, computerUseEnabled: true })).toBe(false);
  });

  it("keeps AgentSky, task, tool, rich-media, docs, and shared-chat transcripts on their existing route", () => {
    const specialHistories = [
      { role: "assistant" as const, content: "Previous answer", agentSkySessionId: "session-1" },
      { role: "assistant" as const, content: "Agent turn", agentSkyAgent: { id: "agent-1" } },
      { role: "assistant" as const, content: "Previous answer", toolParts: [{}] },
      { role: "user" as const, content: "See attached image", attachedImages: ["image-url"] },
      { role: "assistant" as const, content: "Earlier slide", mode: "slides" },
      { role: "assistant" as const, content: "Team member message", senderName: "Teammate" },
      { role: "assistant" as const, content: "Generated media", videos: ["video-url"] },
      {
        role: "assistant" as const,
        content: "Document in progress",
        docsPlan: { status: "review" },
      },
    ];
    for (const message of specialHistories) {
      expect(shouldUseFastChat({ ...base, messages: [message] })).toBe(false);
    }
  });

  it("respects the fast lane's empty, escalation-marker, and context-size safeguards", () => {
    expect(shouldUseFastChat({ ...base, text: "   " })).toBe(false);
    expect(shouldUseFastChat({ ...base, text: "ESCALATE" })).toBe(false);
    expect(
      shouldUseFastChat({
        ...base,
        messages: [{ role: "user", content: "x".repeat(20_000) }],
      }),
    ).toBe(false);
  });
});
