import { afterEach, describe, expect, it, vi } from "vitest";
import { findPhoto } from "./photoLookup";

const page = (title: string, src: string, index = 1) => ({ title, index, thumbnail: { source: src } });
function mockWiki(handler: (url: string) => unknown[]) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => ({
    ok: true,
    json: async () => ({ query: { pages: Object.fromEntries(handler(url).map((p, i) => [i, p])) } }),
  })));
}
afterEach(() => vi.unstubAllGlobals());

describe("findPhoto", () => {
  it("drops filler words so 'Cairo skyline' resolves to the Cairo article", async () => {
    mockWiki((u) => (u.includes("titles=cairo") ? [page("Cairo", "cairo.jpg")] : []));
    expect(await findPhoto("Cairo skyline")).toBe("cairo.jpg");
  });
  it("rejects search hits that share no word with the query", async () => {
    mockWiki((u) => (u.includes("generator=search") ? [page("Nile river mountains", "wrong.jpg")] : []));
    expect(await findPhoto("Cairo skyline")).toBeNull();
  });
  it("accepts a search hit whose title shares a word", async () => {
    mockWiki((u) => (u.includes("generator=search") ? [page("Other", "x.jpg", 1), page("Giza pyramid complex", "giza.jpg", 2)] : []));
    expect(await findPhoto("Pyramids of Giza at sunset")).toBe("giza.jpg");
  });
  it("is self-contained so the widget frame can run its source text", () => {
    const fn = new Function(`return (${findPhoto.toString()})`)();
    expect(typeof fn).toBe("function");
  });
});
