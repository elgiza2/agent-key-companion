/** @doc Appearance control — one tidy glass segment: Light / Dark / System. */
import { Monitor, Moon, Sun } from "lucide-react";
import { translateExactText, useUserLang } from "@/lib/authI18n";
import type { ThemeMode } from "@/lib/theme";

const OPTIONS: Array<{ value: ThemeMode; label: string; Icon: typeof Sun }> = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export default function ThemeSegmented({
  value,
  onChange,
  compact = false,
}: {
  value: ThemeMode;
  onChange: (mode: ThemeMode) => void;
  /** Icons only — used where the row is already labelled. */
  compact?: boolean;
}) {
  const lang = useUserLang();
  const tx = (s: string) => translateExactText(s, lang);

  return (
    <div className="th-seg" role="radiogroup" aria-label={tx("Appearance")}>
      {OPTIONS.map(({ value: mode, label, Icon }) => {
        const on = value === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={tx(label)}
            title={tx(label)}
            data-on={on ? "true" : "false"}
            onClick={() => onChange(mode)}
            className={`th-seg-btn${compact ? " th-seg-icon" : ""}`}
          >
            <Icon strokeWidth={1.9} />
            {!compact && <span>{tx(label)}</span>}
          </button>
        );
      })}
    </div>
  );
}
