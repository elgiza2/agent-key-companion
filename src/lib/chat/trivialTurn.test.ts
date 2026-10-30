import { describe, expect, it } from "vitest";
import { isTrivialTurn, shouldForceFastTurn } from "./trivialTurn";

describe("isTrivialTurn", () => {
  it("recognizes Arabic greetings without relying on ASCII word boundaries", () => {
    expect(isTrivialTurn([{ role: "user", content: "تمام" }])).toBe(true);
    expect(isTrivialTurn([{ role: "user", content: "شكرًا" }])).toBe(true);
  });

  it("recognizes a simple Arabic arithmetic question", () => {
    expect(isTrivialTurn([{ role: "user", content: "كم يساوي 2+2؟ أجب برقم فقط." }])).toBe(true);
  });

  it("does not classify tool requests, multiline prompts, or long messages as trivial", () => {
    expect(isTrivialTurn([{ role: "user", content: "ابحث عن حالة الطقس في القاهرة" }])).toBe(false);
    expect(isTrivialTurn([{ role: "user", content: "تمام\nوابحث عن الطقس" }])).toBe(false);
    expect(isTrivialTurn([{ role: "user", content: "تمام ".padEnd(90, "x") }])).toBe(false);
  });
});

describe("shouldForceFastTurn", () => {
  it("forces only a single-message greeting or arithmetic turn", () => {
    expect(shouldForceFastTurn([{ role: "user", content: "تمام" }])).toBe(true);
    expect(shouldForceFastTurn([{ role: "user", content: "كم يساوي 2+2؟ أجب برقم فقط." }])).toBe(
      true,
    );
  });

  it("does not bypass routing for conversation follow-ups", () => {
    expect(
      shouldForceFastTurn([
        { role: "user", content: "ابحث عن الطقس" },
        { role: "assistant", content: "جاري البحث" },
        { role: "user", content: "تمام" },
      ]),
    ).toBe(false);
  });
});
