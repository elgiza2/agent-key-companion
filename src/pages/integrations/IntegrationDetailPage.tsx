/** @doc One app — glass detail: hero, linked accounts, connect, how Megsy uses it. */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Loader2, Plus, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { integrations as CATALOG } from "@/lib/integrationsData";
import {
  loadIntegrationConnections,
  startIntegrationConnection,
  disconnectIntegration,
  waitForConnectionRefresh,
  type IntegrationMeta,
} from "@/lib/integrationBackend";
import { IntegrationLogo } from "@/components/chat/integrations/IntegrationRow";
import { useUserLang } from "@/lib/authI18n";

export default function IntegrationDetailPage() {
  const { app = "" } = useParams();
  const navigate = useNavigate();
  const ar = useUserLang() === "ar-eg";
  const item = CATALOG.find((i) => i.app === app);
  const [meta, setMeta] = useState<IntegrationMeta | null>(null);
  const [on, setOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"connect" | "disconnect" | null>(null);

  const refresh = async () => {
    if (!item) return false;
    try {
      const s = await loadIntegrationConnections([item]);
      const isOn = !!s.connectedApps[item.app];
      setOn(isOn);
      setMeta(s.appMeta[item.app] ?? null);
      return isOn;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (item) document.title = `${item.name} — Megsy`;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app]);

  if (!item) {
    return (
      <div className="gx-root" dir={ar ? "rtl" : "ltr"}>
        <div className="gx-screen">
          <p className="gx-empty">{ar ? "التطبيق ده مش موجود" : "App not found"}</p>
        </div>
      </div>
    );
  }

  const connect = async () => {
    setBusy("connect");
    try {
      const res = await startIntegrationConnection(item);
      if ("popup" in res && res.popup) await waitForConnectionRefresh(refresh, res.popup);
      else await refresh();
      window.dispatchEvent(new CustomEvent("megsy:integrations-changed"));
      toast.success(ar ? `تم ربط ${item.name}` : `${item.name} connected`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't connect");
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    setBusy("disconnect");
    try {
      await disconnectIntegration(item);
      await refresh();
      window.dispatchEvent(new CustomEvent("megsy:integrations-changed"));
      toast.success(ar ? "تم الفصل" : "Disconnected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't disconnect");
    } finally {
      setBusy(null);
    }
  };

  const m = (meta ?? {}) as Record<string, unknown>;
  const accountName =
    (m.account_name as string) ||
    (m.email_address as string) ||
    (m.telegram_username as string) ||
    (m.name as string) ||
    (m.login as string) ||
    (ar ? "الحساب الرئيسي" : "Main account");

  return (
    <div className="gx-root" dir={ar ? "rtl" : "ltr"}>
      <style>{detailCss}</style>
      <div className="gx-screen">
        <header className="gx-top">
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate("/integrations", { replace: true })}
            className="gx-hbtn"
          >
            <ChevronLeft className="gx-hicon rtl:rotate-180" strokeWidth={2} />
          </button>
        </header>

        <div className="gx-content">
          <section className="gx-card app-hero">
            <span className="app-hero-logo">
              <IntegrationLogo item={item} size={46} />
            </span>
            <h1 className="app-hero-name">{item.name}</h1>
            <p className="app-hero-desc">{item.description}</p>
            <span className={`app-state${on ? " is-on" : ""}`}>
              <span className="app-state-dot" />
              {loading ? "…" : on ? (ar ? "متصل" : "Connected") : ar ? "غير متصل" : "Not connected"}
            </span>
          </section>

          <h2 className="gx-section-title app-section">{ar ? "الحسابات" : "Accounts"}</h2>
          <section className="gx-card">
            {loading ? (
              <div className="gx-loading">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : on ? (
              <div className="app-account">
                <span className="app-account-tile">
                  <UserRound strokeWidth={1.8} />
                </span>
                <span className="app-account-name">{accountName}</span>
                <button
                  type="button"
                  onClick={() => void disconnect()}
                  disabled={!!busy}
                  aria-label={ar ? "فصل" : "Disconnect"}
                  className="app-icon-btn app-icon-danger"
                >
                  {busy === "disconnect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            ) : (
              <p className="app-none">{ar ? "مفيش حسابات مربوطة لسه" : "No accounts linked yet"}</p>
            )}

            <button
              type="button"
              onClick={() => void connect()}
              disabled={!!busy}
              className={`app-connect${on ? " app-connect-div" : ""}`}
            >
              <span className="app-connect-tile">
                {busy === "connect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </span>
              <span className="app-connect-label">
                {on ? (ar ? "إضافة حساب تاني" : "Add another account") : ar ? `ربط ${item.name}` : `Connect ${item.name}`}
              </span>
            </button>
          </section>

          <section className="gx-card app-note">
            <h3 className="app-note-title">
              <ShieldCheck strokeWidth={1.8} />
              {ar ? "ميغسي بيستخدمه إزاي" : "How Megsy uses it"}
            </h3>
            <p className="app-note-text">
              {ar
                ? "لما تطلب حاجة محتاجة التطبيق ده، ميغسي بيستخدم حسابك المربوط تلقائيًا، وبيسألك قبل أي خطوة مهمة."
                : "When a request needs this app, Megsy uses your linked account automatically and asks before important steps."}
            </p>
          </section>
        </div>
        <div className="gx-spacer" />
      </div>
    </div>
  );
}

const detailCss = `
.app-hero { display: grid; justify-items: center; gap: 4px; padding: 26px 22px 22px; text-align: center; }
.app-hero-logo {
  width: 84px; height: 84px; border-radius: 26px; display: grid; place-items: center;
  background: var(--settings-surface); box-shadow: inset 0 0 0 1px var(--settings-line);
  margin-bottom: 10px; overflow: hidden;
}
.app-hero-name { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -.02em; color: var(--settings-ink); }
.app-hero-desc { margin: 2px 0 0; max-width: 34ch; font-size: 13.5px; line-height: 1.5; color: var(--settings-muted); }
.app-state {
  margin-top: 12px; display: inline-flex; align-items: center; gap: 7px;
  padding: 6px 14px; border-radius: 999px; font-size: 12.5px; font-weight: 600;
  background: var(--settings-line); color: var(--settings-muted);
}
.app-state.is-on { background: var(--settings-violet); color: var(--settings-surface); }
.app-state-dot { width: 6px; height: 6px; border-radius: 999px; background: currentColor; opacity: .9; }
.app-section { margin-top: 24px; }
.app-account { display: flex; align-items: center; gap: 12px; padding: 13px 16px; }
.app-account-tile {
  flex: none; width: 38px; height: 38px; border-radius: 999px; display: grid; place-items: center;
  background: var(--settings-line); color: var(--settings-ink);
}
.app-account-tile > svg { width: 18px; height: 18px; }
.app-account-name {
  min-width: 0; flex: 1; font-size: 14.5px; font-weight: 600; color: var(--settings-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.app-icon-btn {
  flex: none; width: 36px; height: 36px; display: grid; place-items: center; border: 0;
  border-radius: 999px; background: transparent; color: var(--settings-muted); cursor: pointer;
  transition: background .18s ease, color .18s ease;
}
.app-icon-danger:hover { background: oklch(.55 .19 25 / .12); color: oklch(.55 .19 25); }
.app-none { margin: 0; padding: 20px 16px; text-align: center; font-size: 13.5px; color: var(--settings-muted); }
.app-connect {
  width: 100%; display: flex; align-items: center; gap: 12px; padding: 13px 16px;
  border: 0; background: transparent; cursor: pointer; font: inherit; text-align: start;
  color: var(--settings-ink); transition: background .18s ease;
}
.app-connect-div { box-shadow: inset 0 1px 0 var(--settings-line); }
.app-connect:active { background: var(--settings-line); }
.app-connect:disabled { opacity: .6; }
.app-connect-tile {
  flex: none; width: 38px; height: 38px; border-radius: 999px; display: grid; place-items: center;
  background: var(--settings-violet); color: var(--settings-surface);
}
.app-connect-label { font-size: 14.5px; font-weight: 620; }
.app-note { padding: 16px 18px; margin-top: 14px; }
.app-note-title {
  margin: 0; display: flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 650; color: var(--settings-ink);
}
.app-note-title > svg { width: 16px; height: 16px; color: var(--settings-muted); }
.app-note-text { margin: 6px 0 0; font-size: 13.5px; line-height: 1.55; color: var(--settings-muted); }
`;
