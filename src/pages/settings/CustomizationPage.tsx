/** @doc Composer preferences — send-key behaviour. */
import { useState, useCallback, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getSendMode, setSendMode, type SendMode } from "@/lib/composerKey";

const CustomizationPage = () => {
  const navigate = useNavigate();
  const goBack = () => navigate("/settings");
  const [mode, setMode] = useState<SendMode>(() => getSendMode());

  useEffect(() => {
    document.body.classList.add("ms-theme");
    return () => {
      document.body.classList.remove("ms-theme");
    };
  }, []);

  const changeMode = useCallback((m: SendMode) => {
    setSendMode(m);
    setMode(m);
  }, []);

  return (
    <div className="gx-root">
      <style>{customizationCss}</style>
      <div className="gx-screen">
        <header className="gx-top">
          <button type="button" aria-label="Back" onClick={goBack} className="gx-hbtn">
            <ChevronLeft className="gx-hicon rtl:rotate-180" strokeWidth={2} />
          </button>
        </header>

        <h1 className="gx-title">Composer</h1>

        <div className="gx-content">
          <section className="gx-section">
            <h2 className="gx-section-title">Composer</h2>
            <p className="gx-section-note">How pressing Enter behaves.</p>
            <div className="gx-card">
              <button
                type="button"
                className={`gx-row gx-row-tap cust-row ${mode === "enter" ? "is-on" : ""}`}
                onClick={() => changeMode("enter")}
              >
                <span className="gx-row-body">
                  <span className="gx-row-label">Enter to send</span>
                  <span className="gx-row-hint">Shift + Enter for a new line</span>
                </span>
                <span className="cust-radio">{mode === "enter" && <span />}</span>
              </button>
              <button
                type="button"
                className={`gx-row gx-row-tap cust-row ${mode === "shift_enter" ? "is-on" : ""}`}
                onClick={() => changeMode("shift_enter")}
              >
                <span className="gx-row-body">
                  <span className="gx-row-label">Shift + Enter to send</span>
                  <span className="gx-row-hint">Enter inserts a new line</span>
                </span>
                <span className="cust-radio">{mode === "shift_enter" && <span />}</span>
              </button>
            </div>
          </section>
        </div>
        <div className="gx-spacer" />
      </div>
    </div>
  );
};

const customizationCss = `
.cust-radio {
  width: 22px; height: 22px; border-radius: 999px; flex-shrink: 0;
  border: 1.5px solid var(--settings-line);
  display: grid; place-items: center;
  transition: border-color 0.16s ease;
}
.cust-row.is-on .cust-radio { border-color: var(--settings-violet); }
.cust-radio span { width: 12px; height: 12px; border-radius: 999px; background: var(--settings-violet); }
`;

export default CustomizationPage;
