import { describe, expect, it } from "vitest";
import { formatSubmission, parseUISpec, stripUIBlocks } from "./schema";

const trip = JSON.stringify({
  title: "Plan your Egypt trip",
  blocks: [
    { type: "slider", id: "budget", label: "Budget", min: 300, max: 5000, unit: "USD" },
    { type: "choice", id: "style", label: "Style", options: ["Beach", "Historic"], multi: true },
    { type: "bogus", id: "x" },
  ],
  submit: { label: "Suggest my trip" },
});

describe("generative UI spec", () => {
  it("returns null while the streamed JSON is incomplete", () => {
    expect(parseUISpec(trip.slice(0, 40))).toBeNull();
  });
  it("drops unknown blocks instead of failing", () => {
    expect(parseUISpec(trip)!.blocks.map((b) => b.type)).toEqual(["slider", "choice"]);
  });
  it("sends the user's choices back as a readable message", () => {
    const spec = parseUISpec(trip)!;
    expect(formatSubmission(spec, { budget: 1500, style: ["Beach"] })).toBe(
      "Suggest my trip\n- Budget: 1500 USD\n- Style: Beach",
    );
  });
  it("strips ui blocks from plain text", () => {
    expect(stripUIBlocks("Hi\n```ui\n{}\n```")).toBe("Hi");
  });
});

import { wrapBareUISpecs } from "./schema";
describe("wrapBareUISpecs", () => {
  it("re-wraps a bare spec in a ui fence", () => {
    const t = 'Hi\n{\n "title": "T",\n "blocks": [{"type":"note","text":"a {b}"}]\n}\nbye';
    expect(wrapBareUISpecs(t)).toContain('```ui\n{\n "title": "T"');
  });
  it("leaves fenced specs and other json alone", () => {
    const t = '```ui\n{"title":"T","blocks":[]}\n```\n{"a":1}';
    expect(wrapBareUISpecs(t)).toBe(t);
  });
  it("closes an unclosed ui fence", () => {
    expect(wrapBareUISpecs('```ui\n{"title":"T","blocks":[]}\n')).toBe('```ui\n{"title":"T","blocks":[]}\n```');
  });
});
