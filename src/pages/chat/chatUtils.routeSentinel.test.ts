import { describe, expect, it } from "vitest";
import { sanitizeLeakedToolText, stripRouteSentinel } from "./chatUtils";

describe("stripRouteSentinel", () => {
  it("removes the bare sentinel", () => {
    expect(stripRouteSentinel("hello [[MEGSY_ESCALATE_TO_FULL_CHAT]] world")).toBe(
      "hello world",
    );
  });
  it("removes the sentinel with a media suffix (the reported leak)", () => {
    expect(
      stripRouteSentinel(
        "We need to generate an image using the tool.\n[[MEGSY_ESCALATE_TO_FULL_CHAT:media]]",
      ),
    ).not.toContain("MEGSY_ESCALATE");
  });
  it("leaves ordinary answers untouched", () => {
    const text = "الخطوة الجاية: قولي الألوان وأنا أعمل النسخة المعدلة.";
    expect(stripRouteSentinel(text)).toBe(text);
  });
});

describe("sanitizeLeakedToolText", () => {
  it("never exposes the route sentinel in rendered content", () => {
    const leaked =
      "We need to generate an image using the tool.\n[[MEGSY_ESCALATE_TO_FULL_CHAT:media]]";
    expect(sanitizeLeakedToolText(leaked)).not.toContain("MEGSY_ESCALATE");
  });
});

import { sanitizeLeakedToolText as _s } from "./chatUtils";
describe("degenerate repeats", () => {
  it("removes a giant %20 link", () => {
    expect(_s("hello [x](https://a.com/" + "%20".repeat(200) + ")")).not.toContain("%20%20");
  });
});
