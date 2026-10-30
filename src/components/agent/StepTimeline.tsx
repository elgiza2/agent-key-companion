/** @doc Agent step list rendered with the same thinking surface as fast chat (ThinkingTrace). */
import type { Step } from "@/lib/agentsky/transcript";
import ThinkingTrace from "@/components/chat/ThinkingTrace";

export function StepTimeline({ steps }: { steps: Step[]; lang?: "en" | "ar" }) {
  // Thinking is shown only while it is happening; once the agent acts, the line becomes the action.
  const shown = steps.filter((s, i) => s.kind !== "thought" || (s.status === "active" && i === steps.length - 1));
  if (!shown.length) return null;
  const active = shown.some((s) => s.status === "active");
  const live = [...shown].reverse().find((s) => s.status === "active");
  return (
    <ThinkingTrace
      steps={shown.map((s) => s.label)}
      status={live?.label}
      active={active}
      variant={active ? "default" : "tools"}
      defaultOpen={active}
    />
  );
}
