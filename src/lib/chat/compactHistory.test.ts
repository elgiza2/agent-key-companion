import { describe, it, expect } from "vitest";
import { compactHistory } from "./compactHistory";
const mk = (n: number, len = 10) => Array.from({ length: n }, (_, i) => ({ role: "user", content: String(i).padEnd(len, "x") }));
describe("compactHistory", () => {
  it("keeps only the last 10 messages", () => { expect(compactHistory(mk(30))).toHaveLength(10); });
  it("shortens long older messages but keeps the last 4 whole", () => {
    const out = compactHistory(mk(10, 5000));
    expect(out[0].content.length).toBeLessThan(1300);
    expect(out[9].content.length).toBe(5000);
  });
});
