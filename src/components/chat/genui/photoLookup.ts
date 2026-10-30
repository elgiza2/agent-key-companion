/** Photo lookup for chat answers (Wikipedia, CORS-enabled, no key).
 *  `findPhoto` is fully self-contained on purpose: the sandboxed widget iframe
 *  receives its source text via `findPhoto.toString()`, so it must not
 *  reference anything outside its own body.
 *  Order: exact title → title without filler words → search results whose
 *  title shares a real word with the query. A wrong photo is worse than none,
 *  so loose search hits that share no word are rejected. */
export async function findPhoto(query: string, lang?: string): Promise<string | null> {
  const q = String(query || "").trim();
  if (!q) return null;
  const host = "https://" + (lang || "en") + ".wikipedia.org/w/api.php";
  const base =
    host +
    "?action=query&format=json&origin=*&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=800";
  const filler = [
    "the", "and", "skyline", "view", "views", "photo", "photos", "image", "picture",
    "panorama", "aerial", "night", "day", "landscape", "official", "logo", "scenery",
    "beautiful", "famous", "best", "top", "street", "streets", "city", "center", "centre",
  ];
  const words = q
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f\u0600-\u06ff ]+/g, " ")
    .split(/ +/)
    .filter((w) => w.length > 2 && filler.indexOf(w) < 0);
  const core = words.join(" ");
  type Page = { title?: string; index?: number; thumbnail?: { source?: string } };
  const get = async (params: string): Promise<Page[]> => {
    try {
      const r = await fetch(base + params);
      if (!r.ok) return [];
      const j = await r.json();
      const pages = Object.values((j && j.query && j.query.pages) || {}) as Page[];
      return pages
        .filter((p) => p && p.thumbnail && p.thumbnail.source)
        .sort((a, b) => (a.index || 0) - (b.index || 0));
    } catch {
      return [];
    }
  };
  const exact = await get("&titles=" + encodeURIComponent(q));
  if (exact[0]) return exact[0].thumbnail!.source!;
  if (core && core !== q.toLowerCase()) {
    const trimmed = await get("&titles=" + encodeURIComponent(core));
    if (trimmed[0]) return trimmed[0].thumbnail!.source!;
  }
  const hits = await get("&generator=search&gsrlimit=6&gsrsearch=" + encodeURIComponent(core || q));
  if (!words.length) return hits[0] ? hits[0].thumbnail!.source! : null;
  const match = hits.find((p) => {
    const t = String(p.title || "").toLowerCase();
    return words.some((w) => t.indexOf(w) >= 0);
  });
  return match ? match.thumbnail!.source! : null;
}
