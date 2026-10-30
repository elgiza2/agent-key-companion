import { describe, expect, it } from "vitest";
import { cleanTraceLine } from "./ThinkingTrace";

// Step rows must stay words-only: tool narration arrives with arrow/bullet
// glyphs, and the same step then shows twice ("→ web search · q" vs the plain
// line), so the cleaner has to drop the leading glyph before de-duplicating.
describe("cleanTraceLine", () => {
  it("drops a leading arrow from a tool step", () => {
    expect(cleanTraceLine("→ web search · آخر أخبار الذكاء الاصطناعي")).toBe(
      "web search · آخر أخبار الذكاء الاصطناعي",
    );
  });

  it("drops repeated arrows and bullets", () => {
    expect(cleanTraceLine("→ → ran code")).toBe("ran code");
    expect(cleanTraceLine("• opened https://example.com")).toBe("opened https://example.com");
  });

  it("collapses the two spellings of the same step into one line", () => {
    const lines = new Set([
      cleanTraceLine("→ web search · الطقس في القاهرة"),
      cleanTraceLine("web search · الطقس في القاهرة"),
    ]);
    expect([...lines]).toEqual(["web search · الطقس في القاهرة"]);
  });

  it("keeps hiding raw tool payloads", () => {
    expect(cleanTraceLine('{"tool_call":"search","arguments":{}}')).toBe("");
    expect(cleanTraceLine("[[MEGSY_ESCALATE]]")).toBe("");
  });
});
