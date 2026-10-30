/** @doc Language settings — one clean glass list: flag chip, native name, tick. */
import { useNavigate } from "react-router-dom";
import { Check, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { AVAILABLE_LANGS, setUserLang, translateExactText, useUserLang, type AuthLang } from "@/lib/authI18n";

/** Flat, tidy flags — no poles, no waving, just the country's real colours. */
function FlagEN({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 40" className={className} aria-hidden>
      <rect width="60" height="40" fill="#1f4aa8" />
      <path d="M0 0 L60 40 M60 0 L0 40" stroke="#fff" strokeWidth="9" />
      <path d="M0 0 L60 40 M60 0 L0 40" stroke="#d62839" strokeWidth="3.5" />
      <path d="M30 0 V40 M0 20 H60" stroke="#fff" strokeWidth="12" />
      <path d="M30 0 V40 M0 20 H60" stroke="#d62839" strokeWidth="6.5" />
    </svg>
  );
}

function FlagEG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 40" className={className} aria-hidden>
      <rect width="60" height="13.4" fill="#d62839" />
      <rect y="13.4" width="60" height="13.2" fill="#fff" />
      <rect y="26.6" width="60" height="13.4" fill="#1d1d1f" />
      <path d="M30 15.4 l2.6 2.6 -1 5.4 h-3.2 l-1 -5.4 z" fill="#e0a526" />
    </svg>
  );
}

const FLAGS: Record<string, (p: { className?: string }) => JSX.Element> = {
  en: FlagEN,
  "ar-eg": FlagEG,
};

export default function LanguagePage() {
  const navigate = useNavigate();
  const lang = useUserLang();
  const ar = lang === "ar-eg";
  const tx = (s: string) => translateExactText(s, lang);

  const pick = async (code: AuthLang) => {
    if (code === lang) return;
    await setUserLang(code);
    toast.success(tx("Language updated"));
  };

  return (
    <div className="gx-root" dir={ar ? "rtl" : "ltr"}>
      <style>{languageCss}</style>
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

        <h1 className="gx-title">{tx("Language")}</h1>
        <p className="gx-sub">{tx("Pick how Megsy talks to you.")}</p>

        <div className="gx-content">
          <section className="gx-card" role="radiogroup" aria-label={tx("Language")}>
            {AVAILABLE_LANGS.map((l, i) => {
              const Flag = FLAGS[l.code] ?? FlagEN;
              const active = lang === l.code;
              return (
                <button
                  key={l.code}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => void pick(l.code as AuthLang)}
                  className={`lang-row${i > 0 ? " lang-row-div" : ""}`}
                >
                  <span className="lang-flag">
                    <Flag className="lang-flag-art" />
                  </span>
                  <span className="lang-text">
                    <span className="lang-native">{l.native}</span>
                    <span className="lang-label">{l.label}</span>
                  </span>
                  <span className={`lang-tick${active ? " is-on" : ""}`} aria-hidden>
                    {active ? <Check strokeWidth={3} /> : null}
                  </span>
                </button>
              );
            })}
          </section>
        </div>
        <div className="gx-spacer" />
      </div>
    </div>
  );
}

const languageCss = `
.lang-row {
  width: 100%; display: flex; align-items: center; gap: 14px;
  padding: 14px 16px; border: 0; background: transparent; cursor: pointer;
  font: inherit; color: inherit; text-align: start;
  transition: background 0.18s ease;
}
.lang-row-div { box-shadow: inset 0 1px 0 var(--settings-line); }
.lang-row:active { background: var(--settings-line); }
.lang-flag {
  flex: none; width: 46px; height: 32px; border-radius: 9px; overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.16), inset 0 0 0 1px var(--settings-line);
}
.lang-flag-art { display: block; width: 100%; height: 100%; }
.lang-text { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.lang-native { font-size: 15.5px; font-weight: 650; letter-spacing: -0.01em; color: var(--settings-ink); }
.lang-label { font-size: 12.5px; color: var(--settings-muted); }
.lang-tick {
  flex: none; width: 24px; height: 24px; border-radius: 999px;
  display: grid; place-items: center; color: var(--settings-surface);
  background: var(--settings-line); transition: background 0.18s ease;
}
.lang-tick.is-on { background: var(--settings-violet); }
.lang-tick > svg { width: 14px; height: 14px; }
`;
