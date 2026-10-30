import { useUserLang } from "@/lib/authI18n";
import { AgentOrb } from "./AgentOrb";
import type { Message } from "@/pages/chat/chatConstants";

export function AgentPresence({ message, live }: { message: Message; live?: string }) {
  const ar = useUserLang() === "ar-eg";
  const state = message.agentSkyState ?? "done";
  const labels = {
    sleeping: ar ? "نايم" : "Sleeping", hello: ar ? "أهلاً!" : "Hello!",
    awakening: ar ? "الوكيل يستيقظ" : "Agent is waking up",
    thinking: ar ? "بيفكر…" : "Thinking…",
    tool: ar ? "بينفّذ…" : "Working…",
    talking: ar ? "بيرد…" : "Responding…",
    done: "", error: ar ? "الطلب وقف" : "Request stopped", idle: ar ? "اتوقف" : "Stopped",
  };
  // While the agent is thinking or working, show what it is really doing right
  // now instead of a generic label — the user asked to watch the agent work.
  const liveNow = (live || "").trim();
  const busy = state === "thinking" || state === "tool";
  const status = busy && liveNow ? (liveNow.length > 160 ? `${liveNow.slice(0, 160)}…` : liveNow) : labels[state];
  return (
    <div className="mb-3 flex min-h-12 items-center gap-3 px-3 md:px-12" data-agent-color={message.agentSkyAgent?.color ?? "aurora"}>
      <AgentOrb size={38} state={state} color={message.agentSkyAgent?.color} />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-foreground">{message.agentSkyAgent?.name ?? "Megsy"}</div>
        {status && <div className="line-clamp-2 text-xs leading-relaxed text-muted-foreground" role="status"><span className={state === "awakening" || state === "thinking" ? "ag-shimmer" : ""}>{status}</span></div>}
      </div>
    </div>
  );
}
