/** Live "thinking" line for the agent: glowing orb + the agent's real current thought. */
import { useUserLang } from "@/lib/authI18n";
import LoaderLetters from "./LoaderLetters";

export default function AgentThinkingLine({ text }: { text?: string | null }) {
  const isAr = useUserLang() === "ar-eg";
  const line = (text || "").trim() || (isAr ? "بيفكر…" : "Thinking…");
  return (
    <div className="mtrace my-2 flex items-start gap-2.5" role="status" aria-live="polite">
      <span className="mring mt-[1px]" aria-hidden />
      <LoaderLetters key={line} text={line} className="max-w-full whitespace-pre-wrap break-words" />
    </div>
  );
}
