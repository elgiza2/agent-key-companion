import { memo, useEffect, useMemo, useState } from "react";
import LoaderLetters from "./LoaderLetters";
import { useUserLang } from "@/lib/authI18n";
import { detectServiceKind } from "./ServiceIcon";

export interface ThinkingTraceProps {
  /** Live status line — always the real current operation, never a placeholder. */
  status?: string;
  /** Ordered narration steps (deep research, tools, slides, media…). */
  steps?: string[];
  /** Raw reasoning tokens from the model. */
  text?: string;
  /** True while the turn is still running. */
  active?: boolean;
  /** Kept for API compatibility. */
  running?: boolean;
  /** Real tool family currently executing — drives the headline wording. */
  tool?: string | null;
  /** "tools" renders the used-tools timeline after the run ends. */
  variant?: "default" | "tools";
  /** Start expanded. */
  defaultOpen?: boolean;
  className?: string;
}

const RTL_LANGS = new Set(["ar", "ar-eg", "fa", "he"]);

// Raw stream lines can carry tool markers, routing tags or JSON — never show those.
export const cleanTraceLine = (raw: string): string => {
  let v = String(raw || "")
    .replace(/\[\[\s*MEGSY_ESCALATE[^\]]*\]\]/gi, " ")
    .replace(/<\/?[a-z_]+(?:\s[^>]*)?>/gi, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_`#]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  // Tool narration arrives as "→ web search · q"; strip the leading arrow or
  // bullet so the same step can't show up twice under two spellings.
  v = v.replace(/^[\s>+→⇒➜›»•·\-–—✓✔☑]+/, "").trim();
  if (/^[[{]/.test(v) || /"(tool_call|function_call|arguments|parameters)"/.test(v)) return "";
  if (/^(we need to|i need to|i will|i am currently|let me|the user)/i.test(v)) return "";
  if (v.length > 140) v = `${v.slice(0, 140)}…`;
  return v;
};

/**
 * Single quiet "thinking / tools" surface for every turn type.
 * - Collapsed: one line — CSS ring (or dot once done) and live headline.
 * - Expanded: numbered flat rows on a thin gradient rail; no icons, no shadows.
 */
const ThinkingTrace = ({
  status,
  steps,
  text,
  active,
  variant = "default",
  defaultOpen,
  className = "",
}: ThinkingTraceProps) => {
  const lang = useUserLang();
  const [open, setOpen] = useState(defaultOpen ?? !!active);
  const rtl = RTL_LANGS.has(lang);
  const isAr = lang.startsWith("ar");

  const [history, setHistory] = useState<string[]>([]);
  useEffect(() => {
    const incoming = [...(steps || []), status || ""].map(cleanTraceLine).filter(Boolean);
    if (!incoming.length) return;
    setHistory((prev) => {
      const next = [...prev];
      for (const l of incoming) if (!next.includes(l)) next.push(l);
      return next.length === prev.length ? prev : next.slice(-40);
    });
  }, [steps, status]);

  const reasoningLines = useMemo(() => {
    if (!text?.trim()) return [] as string[];
    const out: string[] = [];
    for (const p of text.trim().split(/\n+/)) {
      const v = cleanTraceLine(p);
      if (v && !out.includes(v)) out.push(v);
      if (out.length >= 3) break;
    }
    return out;
  }, [text]);

  const lines = Array.from(new Set([...history, ...reasoningLines]));
  const live = cleanTraceLine(status || "") || history[history.length - 1] || "";
  const headerKind = detectServiceKind(live);

  if (!lines.length && !active) return null;

  const KIND_AR: Record<string, string> = { search: "بيدوّر على الإنترنت", browse: "بيقرا الصفحات", code: "بيكتب ويشغّل كود", agent: "بيكلّم وكيل متخصص", video: "بيجهز الفيديو", image: "بيرسم الصورة", slides: "بيعمل الشرائح", docs: "بيكتب المستند", memory: "بيفتكر كلامكم", computer: "بيشتغل على الكمبيوتر", integration: "بيفتح تطبيقاتك", tool: "بيستخدم أداة" };
  const KIND_EN: Record<string, string> = { search: "Searching the web", browse: "Reading pages", code: "Writing and running code", agent: "Asking a specialist agent", video: "Making the video", image: "Drawing the image", slides: "Building slides", docs: "Writing the document", memory: "Recalling", computer: "Using the computer", integration: "Opening your apps", tool: "Using a tool" };
  const kindLine = headerKind !== "thinking" ? (isAr ? KIND_AR : KIND_EN)[headerKind] : "";
  const idle = isAr ? "بيفكر" : "Thinking";
  const liveLabel = live || kindLine || reasoningLines[reasoningLines.length - 1] || idle;
  const usedTools = variant === "tools" || history.length > 1;
  const label = active
    ? liveLabel
    : usedTools
      ? isAr
        ? `استخدم ${lines.length} ${lines.length === 1 ? "خطوة" : "خطوات"}`
        : `Used ${lines.length} ${lines.length === 1 ? "step" : "steps"}`
      : isAr ? "عرض التفكير" : "Show thinking";

  return (
    <div
      className={`mtrace ${className}`}
      dir={rtl ? "rtl" : undefined}
      data-tool-timeline={variant === "tools" ? true : undefined}
    >
      <button
        type="button"
        onClick={() => lines.length && setOpen((v) => !v)}
        aria-expanded={open}
        disabled={!lines.length}
        className="mtrace-head"
      >
        {active ? <span className="mring" aria-hidden /> : <span className="mdot" aria-hidden />}
        {active ? (
          <LoaderLetters key={label} text={label} />
        ) : (
          <span key="done" className="mtrace-label" aria-live="polite">
            {label}
          </span>
        )}
        {lines.length > 0 && (
          <span className="mtoggle">{open ? (isAr ? "إخفاء" : "Hide") : (isAr ? "التفاصيل" : "Details")}</span>
        )}
      </button>

      {open && lines.length > 0 && (
        <ol className="msteps">
          {lines.map((line, i) => (
            <li key={`${i}-${line.slice(0, 20)}`} className={`mstep ${active && i === lines.length - 1 ? "is-live" : ""}`}>
              <span className="mstep-idx" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="mstep-text">{line}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default memo(ThinkingTrace);
