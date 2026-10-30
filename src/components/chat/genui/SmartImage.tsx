/** @doc Image for generative UI. The model gives either an https URL or a short
 *  search phrase ("Pyramids of Giza"); phrases resolve to a real photo through
 *  Wikipedia's public API (CORS-enabled, no key). Falls back to a soft gradient. */
import { useEffect, useState } from "react";
import { findPhoto } from "./photoLookup";

const cache = new Map<string, Promise<string | null>>();

async function lookup(q: string): Promise<string | null> {
  const en = await findPhoto(q, "en");
  if (en) return en;
  return /[\u0600-\u06FF]/.test(q) ? findPhoto(q, "ar") : null;
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
