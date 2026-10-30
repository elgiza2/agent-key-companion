import { describe, expect, it } from "vitest";
import { createParser } from "@openuidev/react-lang";
import { library } from "./library";

const parser = createParser(library.toJSONSchema(), "Col");
describe("destination catalogue", () => {
  it("accepts map markers and interactive selected locations", () => {
    const result = parser.parse(
      'root = Col([Map([MapMarker("Giza", 29.9792, 31.1342, "Places")], false, $place, 320), Text($place)])\n$place = "Giza"',
    );
    expect(result.meta.errors).toEqual([]);
    expect(JSON.stringify(result.root)).toContain("29.9792");
  });
  it("accepts photo-led hotels, meals and proposed appointments with actions", () => {
    const source =
      'root = Col([PlaceCard("Hotel", "Marriott Mena House", "hotel", "Giza", ["Pool"], null, null, [Button("Check availability", @ToAssistant("Check this hotel"))]), MenuItem("Koshary", "Egyptian dish", "Koshary", null, ["Vegetarian"]), ScheduleItem("Visit", "2026-10-20", "09:00 Cairo", "Giza", "suggested", [Button("Plan visit", @ToAssistant("Plan my visit"))])])';
    const result = parser.parse(source);
    expect(result.meta.errors).toEqual([]);
    expect(JSON.stringify(result.root)).toContain("Marriott Mena House");
    expect(JSON.stringify(result.root)).toContain("suggested");
  });
});
