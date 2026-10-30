/** @doc Image for generative UI. The model gives either an https URL or a short
 *  search phrase ("Pyramids of Giza"); phrases resolve to a real photo through
 *  Wikipedia's public API (CORS-enabled, no key). Falls back to a soft gradient. */
import { useEffect, useState } from "react";

const cache = new Map<string, Promise<string | null>>();

async function lookup(q: string): Promise<string | null> {
  const tryLang = async (lang: string) => {
    // Exact named subjects first: search ranking can return a related dish or
    // another product ahead of the actual article the user asked about.
    const exact = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&titles=${encodeURIComponent(q)}&prop=pageimages&piprop=thumbnail&pithumbsize=800`);
    if (exact.ok) {
      const data = await exact.json();
      const pages = Object.values(data?.query?.pages ?? {}) as { thumbnail?: { source?: string } }[];
      const photo = pages.find((page) => page.thumbnail?.source)?.thumbnail?.source;
      if (photo) return photo;
    }
    const u = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=3&prop=pageimages&piprop=thumbnail&pithumbsize=800`;
    const r = await fetch(u);
    if (!r.ok) return null;
    const j = await r.json();
    const pages = Object.values(j?.query?.pages ?? {}) as any[];
    pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    return pages.find((p) => p.thumbnail?.source)?.thumbnail.source ?? null;
  };
  try {
    return (await tryLang("en")) ?? (/[\u0600-\u06FF]/.test(q) ? await tryLang("ar") : null);
  } catch {
    return null;
  }
}

export function resolveImage(q: string) {
  const key = q.trim().toLowerCase();
  const existing = cache.get(key);
  if (existing) return existing;
  const request = lookup(q.trim());
  cache.set(key, request);
  return request;
}

export function SmartImage({ src, query, className = "", alt = "" }: { src?: string; query?: string; className?: string; alt?: string }) {
  const direct = src && /^https:\/\//.test(src) ? src : undefined;
  const q = (src && !direct ? src : query) || "";
  const [url, setUrl] = useState<string | null | undefined>(direct);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    if (direct) setUrl(direct);
    else if (q) resolveImage(q).then((u) => alive && setUrl(u));
    else setUrl(null);
    return () => { alive = false; };
  }, [direct, q]);

  const onError = () => {
    if (url === direct && q) resolveImage(q).then(setUrl);
    else if (url === direct && query) resolveImage(query).then(setUrl);
    else setUrl(null);
  };

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-primary/25 via-muted to-accent/30 ${className}`}>
      {!loaded && url !== null && <div className="absolute inset-0 animate-pulse bg-foreground/[0.06]" />}
      {url && (
        <img src={url} alt={alt} loading="lazy" onLoad={() => setLoaded(true)} onError={onError} style={{ width: "100%", height: "100%", maxWidth: "none" }}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`} />
      )}
      {url === null && alt && (
        <span className="absolute inset-0 grid place-items-center text-3xl font-semibold text-foreground/30">{alt.slice(0, 1)}</span>
      )}
    </div>
  );
}
