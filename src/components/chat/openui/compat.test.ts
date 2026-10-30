import { describe, expect, it } from "vitest";
import { createParser } from "@openuidev/react-lang";
import { library } from "./library";
import { specToOpenUI } from "./compat";
import { actionMessage } from "./action-message";
import { parseUISpec } from "../genui/schema";
const parser = createParser(library.toJSONSchema(), "Col");
describe("Open Intelligent UI integration", () => {
  it("preserves queries and searched image URLs in the real library", () => {
    const spec = parseUISpec(
      JSON.stringify({
        blocks: [
          { type: "hero", title: "Egypt", image: "Pyramids of Giza" },
          {
            type: "gallery",
            items: [
              {
                image: "https://upload.wikimedia.org/wikipedia/commons/a/ab/photo.jpg",
                caption: "Cairo",
              },
            ],
          },
        ],
      }),
    );
    if (!spec) throw new Error("invalid spec");
    const program = specToOpenUI(spec);
    expect(parser.parse(program).meta.errors).toEqual([]);
    expect(program).toContain('SearchImage("Pyramids of Giza"');
    expect(program).toContain(
      'Image("https://upload.wikimedia.org/wikipedia/commons/a/ab/photo.jpg"',
    );
  });
  it("sends budget and selected choices back unchanged", () => {
    expect(
      actionMessage({
        humanFriendlyMessage: "Plan my trip",
        params: { context: { Budget: 1500, Style: ["Beach", "Historic"] } },
      }),
    ).toBe("Plan my trip\n- Budget: 1500\n- Style: Beach, Historic");
  });
  it("parses stored interactive fields with the original catalogue", () => {
    const spec = parseUISpec(
      JSON.stringify({
        title: "Trip",
        blocks: [
          {
            type: "choice",
            id: "style",
            label: "Style",
            options: ["Beach", "Historic"],
            multi: true,
          },
          { type: "slider", id: "budget", label: "Budget", min: 300, max: 5000, default: 1500 },
          { type: "number", id: "days", label: "Days", default: 5 },
          { type: "date", id: "date", label: "Date" },
          { type: "text", id: "name", label: "Name" },
          { type: "cards", items: [{ title: "Luxor", image: "Luxor Temple", price: "$100" }] },
          { type: "table", columns: ["Place", "Price"], rows: [["Cairo", 100]] },
          { type: "chart", items: [{ label: "Day 1", value: 50 }] },
          { type: "stats", items: [{ label: "Days", value: 5 }] },
          { type: "steps", items: ["Arrive", "Explore"] },
          { type: "note", text: "Book ahead" },
          { type: "buttons", items: [{ label: "More" }] },
        ],
      }),
    );
    if (!spec) throw new Error("invalid spec");
    expect(parser.parse(specToOpenUI(spec)).meta.errors).toEqual([]);
  });
});
