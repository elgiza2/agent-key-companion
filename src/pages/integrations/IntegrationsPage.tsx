/** @doc Apps — glass grid of integrations: icon + name tiles, connected first. */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronLeft, Loader2, Search } from "lucide-react";
import { integrations as CATALOG } from "@/lib/integrationsData";
import { loadIntegrationConnections } from "@/lib/integrationBackend";
import { IntegrationLogo } from "@/components/chat/integrations/IntegrationRow";
import { useUserLang } from "@/lib/authI18n";

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const ar = useUserLang() === "ar-eg";
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.title = "Apps — Megsy";
    loadIntegrationConnections(CATALOG)
      .then((s) => setConnected(s.connectedApps || {}))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? CATALOG.filter((i) => `${i.name} ${i.description ?? ""}`.toLowerCase().includes(q))
      : CATALOG;
  }, [query]);
  const mine = filtered.filter((i) => connected[i.app]);
  const rest = filtered.filter((i) => !connected[i.app]);

  /** A tile is just the logo and the name — everything else lives in the detail page. */
  const Grid = ({ items }: { items: typeof CATALOG }) => (
    <div className="app-grid">
      {items.map((item) => {
        const on = !!connected[item.app];
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(`/integrations/${encodeURIComponent(item.app)}`)}
            title={item.description ?? item.name}
            className="app-tile"
            data-connected={on ? "true" : "false"}
          >
            <span className="app-tile-logo">
              <IntegrationLogo item={item} size={24} />
            </span>
            <span className="app-tile-name">{item.name}</span>
            {on && (
              <span className="app-tile-check" title={ar ? "متصل" : "Connected"}>
                <Check strokeWidth={3.2} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="gx-root" dir={ar ? "rtl" : "ltr"}>
      <style>{integrationsCss}</style>
      <div className="gx-screen">
        <header className="gx-top">
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate("/settings", { replace: true })}
            className="gx-hbtn"
          >
            <ChevronLeft className="gx-hicon rtl:rotate-180" strokeWidth={2} />
          </button>
        </header>

        <h1 className="gx-title">{ar ? "التطبيقات" : "Apps"}</h1>
        <p className="gx-sub">
          {ar
            ? "اربط تطبيقاتك وميغسي هيستخدمها وقت ما يحتاج."
            : "Connect your apps and Megsy uses them when needed."}
        </p>

        <div className="gx-content">
          <div className="int-search">
            <Search className="int-search-icon" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={ar ? "ابحث" : "Search"}
              aria-label={ar ? "ابحث" : "Search"}
              className="int-search-input"
            />
          </div>

          {loading ? (
            <div className="gx-card gx-loading">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="gx-empty">{ar ? "لا نتائج" : "No results"}</p>
          ) : (
            <>
              {mine.length > 0 && (
                <>
                  <h2 className="gx-section-title int-section">{ar ? "متصل" : "Connected"}</h2>
                  <Grid items={mine} />
                </>
              )}
              <h2 className="gx-section-title int-section">
                {mine.length > 0 ? (ar ? "كل التطبيقات" : "All apps") : ar ? "التطبيقات" : "Apps"}
              </h2>
              <Grid items={rest} />
            </>
          )}
        </div>
        <div className="gx-spacer" />
      </div>
    </div>
  );
}

const integrationsCss = `
.int-search { position: relative; display: flex; align-items: center; margin-bottom: 18px; }
.int-search-icon { position: absolute; inset-inline-start: 16px; width: 16px; height: 16px; color: var(--settings-muted); pointer-events: none; }
.int-search-input {
  width: 100%; height: 46px; padding: 0 16px 0 42px; border-radius: 999px;
  border: 1px solid var(--settings-line); background: var(--settings-surface);
  -webkit-backdrop-filter: var(--settings-frost); backdrop-filter: var(--settings-frost);
  color: var(--settings-ink); font: inherit; font-size: 14.5px; outline: none;
  box-shadow: var(--settings-shadow);
}
[dir="rtl"] .int-search-input { padding: 0 42px 0 16px; }
.int-search-input::placeholder { color: var(--settings-muted); }
.int-search-input:focus-visible { border-color: var(--settings-violet); }
.int-section { margin-top: 22px; }
.int-section:first-of-type { margin-top: 0; }

/* Two tidy columns of icon + name tiles: logos line up, names sit beside them. */
.app-grid {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;
}
@media (min-width: 620px) { .app-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (min-width: 900px) { .app-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }

.app-tile {
  position: relative; display: flex; align-items: center; gap: 10px; min-height: 62px;
  padding: 11px 12px; border: 0; cursor: pointer; font: inherit; color: inherit;
  text-align: start; border-radius: 18px; background: var(--settings-surface);
  -webkit-backdrop-filter: var(--settings-frost); backdrop-filter: var(--settings-frost);
  box-shadow: inset 0 0 0 1px var(--settings-line), var(--settings-shadow);
  transition: transform .16s ease, box-shadow .16s ease;
}
.app-tile:active { transform: scale(.975); }
.app-tile[data-connected="true"] { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--settings-violet) 34%, transparent), var(--settings-shadow); }

.app-tile-logo {
  flex: none; width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center;
  background: var(--settings-frost-strong, rgba(255,255,255,.55));
  box-shadow: inset 0 0 0 1px var(--settings-line); overflow: hidden;
}
.app-tile-name {
  min-width: 0; font-size: 13.5px; font-weight: 620; letter-spacing: -.01em;
  color: var(--settings-ink); line-height: 1.25;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.app-tile-check {
  position: absolute; top: 8px; inset-inline-end: 8px;
  width: 18px; height: 18px; border-radius: 999px; display: grid; place-items: center;
  background: var(--settings-violet); color: var(--settings-surface);
}
.app-tile-check > svg { width: 10px; height: 10px; }
`;
