import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { formatMemoryBrief, isRecallQuestion, recallKeywords } from "./memoryContext";

describe("memory brief", () => {
  it("detects questions about earlier chats and the user", () => {
    expect(isRecallQuestion("فاكر اتكلمنا عن ايه قبل كده؟")).toBe(true);
    expect(isRecallQuestion("تعرف ايه عني؟")).toBe(true);
    expect(isRecallQuestion("what did we talk about last time?")).toBe(true);
    expect(isRecallQuestion("اكتبلي قصيدة عن البحر")).toBe(false);
  });

  it("keeps only distinctive search words", () => {
    expect(recallKeywords("فاكر لما اتكلمنا عن لعبة الجري؟")).toEqual(["الجري", "لعبة"]);
  });

  it("includes saved facts on every turn but past chats only for recall questions", () => {
    const base = {
      facts: [{ key: "language", value: "Prefers Arabic" }],
      notes: [],
      recentTitles: ["Runner game (2026-10-30)"],
      snippets: [{ title: "Runner game", role: "user", content: "اعملي لعبة جري" }],
    };
    const normal = formatMemoryBrief({ ...base, recall: false });
    expect(normal).toContain("Prefers Arabic");
    expect(normal).not.toContain("Runner game");
    const recall = formatMemoryBrief({ ...base, recall: true });
    expect(recall).toContain("Runner game (2026-10-30)");
    expect(recall).toContain("اعملي لعبة جري");
  });

  it("stays within the token budget", () => {
    const facts = Array.from({ length: 30 }, (_, i) => ({ key: `k${i}`, value: "x".repeat(200) + i }));
    expect(formatMemoryBrief({ facts, notes: [], recentTitles: [], snippets: [], recall: false }).length).toBeLessThanOrEqual(3500);
  });
});
