/** @doc Appearance picker — three live theme previews with a clear selection ring. */
import { Check } from "lucide-react";
import { translateExactText, useUserLang } from "@/lib/authI18n";
import type { ThemeMode } from "@/lib/theme";

const OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/** Miniature of the real UI so the choice is obvious before it is applied. */
function Preview({ mode }: { mode: ThemeMode }) {
  return (
    <span className="th-pv" data-mode={mode} aria-hidden="true">
      <span className="th-pv-top">
        <span className="th-pv-avatar" />
        <span className="th-pv-pill" />
      </span>
      <span className="th-pv-body">
        <span className="th-pv-line" />
        <span className="th-pv-line th-pv-line-2" />
      </span>
      <span className="th-pv-cta" />
    </span>
  );
}

export default function ThemePreviewPicker({
  value,
  onChange,
}: {
  value: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}) {
  const lang = useUserLang();
  const tx = (s: string) => translateExactText(s, lang);

  return (
    <div className="th-picker" role="radiogroup" aria-label={tx("Appearance")}>
      <style>{pickerCss}</style>
      {OPTIONS.map(({ value: mode, label }) => {
        const on = value === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={tx(label)}
            data-on={on ? "true" : "false"}
            onClick={() => onChange(mode)}
            className="th-opt"
          >
            <Preview mode={mode} />
            <span className="th-opt-label">{tx(label)}</span>
            {on && (
              <span className="th-opt-check" aria-hidden="true">
                <Check strokeWidth={3.2} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

const pickerCss = `
.th-picker { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; width: 100%; }
.th-opt {
  position: relative; display: flex; flex-direction: column; align-items: stretch; gap: 8px;
  padding: 9px 9px 10px; border: 0; cursor: pointer; font: inherit; color: inherit;
  border-radius: 20px; background: var(--settings-surface);
  -webkit-backdrop-filter: var(--settings-frost); backdrop-filter: var(--settings-frost);
  box-shadow: inset 0 0 0 1px var(--settings-line), var(--settings-shadow);
  transition: transform .16s ease, box-shadow .18s ease;
}
.th-opt:active { transform: scale(.975); }
.th-opt[data-on="true"] {
  box-shadow: inset 0 0 0 1.5px var(--settings-violet), 0 8px 22px -14px var(--settings-violet);
}
.th-opt-label {
  font-size: 12.5px; font-weight: 620; letter-spacing: -.01em; text-align: center;
  color: var(--settings-ink); line-height: 1;
}
.th-opt-check {
  position: absolute; top: 7px; inset-inline-end: 7px; width: 19px; height: 19px;
  border-radius: 999px; display: grid; place-items: center;
  background: var(--settings-violet); color: #fff; box-shadow: 0 4px 10px -6px rgba(0,0,0,.6);
}
.th-opt-check > svg { width: 11px; height: 11px; }

/* Previews use fixed colours — they show the theme, not the current one. */
.th-pv {
  position: relative; display: flex; flex-direction: column; gap: 5px;
  height: 62px; padding: 7px 7px 6px; border-radius: 13px; overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.06);
}
.th-pv[data-mode="light"] { background: linear-gradient(180deg, #ffffff, #f2f3f7); }
.th-pv[data-mode="dark"] { background: linear-gradient(180deg, #1a1d24, #121419); }
.th-pv[data-mode="system"] {
  background: linear-gradient(104deg, #ffffff 0 44%, #14171d 56% 100%);
}
.th-pv-top { display: flex; align-items: center; gap: 5px; }
.th-pv-avatar { width: 9px; height: 9px; border-radius: 999px; background: #c9ccd6; }
.th-pv-pill { height: 9px; flex: 1; border-radius: 999px; background: #e4e6ed; }
.th-pv[data-mode="dark"] .th-pv-avatar { background: #3a4049; }
.th-pv[data-mode="dark"] .th-pv-pill { background: #262b34; }
.th-pv[data-mode="system"] .th-pv-avatar { background: #9aa2b1; }
.th-pv[data-mode="system"] .th-pv-pill { background: rgba(154,162,177,.42); }

.th-pv-body { display: flex; flex-direction: column; gap: 4px; padding: 4px 1px 0; }
.th-pv-line { height: 6px; border-radius: 999px; background: #e9ebf1; }
.th-pv-line-2 { width: 62%; }
.th-pv[data-mode="dark"] .th-pv-line { background: #2b313b; }
.th-pv[data-mode="system"] .th-pv-line { background: rgba(154,162,177,.42); }
.th-pv[data-mode="system"] .th-pv-line-2 { background: rgba(154,162,177,.3); }

.th-pv-cta {
  margin-top: auto; height: 8px; width: 42%; border-radius: 999px;
  background: linear-gradient(90deg, #7c5cff, #a56bff);
}
`;
