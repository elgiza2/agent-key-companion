import { describe, expect, it } from "vitest";
import { detectServiceKind } from "./ServiceIcon";

describe("detectServiceKind", () => {
  it("detects search turns", () => {
    expect(detectServiceKind("Searching the web for news")).toBe("search");
    expect(detectServiceKind("يبحث عن الأخبار")).toBe("search");
  });
  it("detects code turns", () => {
    expect(detectServiceKind("Running code agent")).toBe("code");
    expect(detectServiceKind("يشغّل وكيل البرمجة")).toBe("code");
  });
  it("detects media turns", () => {
    expect(detectServiceKind("Generating image")).toBe("image");
    expect(detectServiceKind("يرندر فيديو")).toBe("video");
    expect(detectServiceKind("اعملي صورة")).toBe("image");
  });
  it("detects agent turns", () => {
    expect(detectServiceKind("Delegating to helper agent")).toBe("agent");
  });
  it("falls back to thinking for plain text", () => {
    expect(detectServiceKind("Hello there")).toBe("thinking");
    expect(detectServiceKind("")).toBe("thinking");
  });
});
