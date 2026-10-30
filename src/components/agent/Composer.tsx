/** @doc Composer: always typeable. While the agent works, Send queues and a Stop button cancels the run. */
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Square, Clock, X, Loader2 } from "lucide-react";
import type { Queued } from "@/hooks/useAgentSession";

export function Composer({
  lang,
  running,
  stopping,
  queue,
  onSend,
  onStop,
  onUnqueue,
  placeholder,
  autoFocus,
}: {
  lang: "en" | "ar";
  running: boolean;
  stopping: boolean;
  queue: Queued[];
  onSend: (text: string) => void;
  onStop: () => void;
  onUnqueue: (id: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const ar = lang === "ar";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }, [text]);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };

  return (
    <div className="space-y-2">
      {queue.map((q) => (
        <div key={q.id} className="ag-queue ag-fade-in">
          <Clock size={14} className="flex-none text-[color:var(--ag-muted)]" />
          <span className="min-w-0 flex-1 truncate">{q.text}</span>
          <span className="text-[12px] text-[color:var(--ag-muted)]">{ar ? "هتتبعت لما يخلص" : "Sends when done"}</span>
          <button type="button" onClick={() => onUnqueue(q.id)} className="ag-icon-btn !h-7 !w-7" aria-label={ar ? "شيل" : "Remove"}>
            <X size={14} />
          </button>
        </div>
      ))}
      <div className="ag-composer">
        <textarea
          ref={ref}
          rows={1}
          value={text}
          autoFocus={autoFocus}
          dir="auto"
          placeholder={placeholder ?? (ar ? "اطلب أي حاجة…" : "Ask for anything…")}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="flex items-center justify-end gap-2 px-1 pb-0.5">
          {running && (
            <button
              type="button"
              onClick={onStop}
              disabled={stopping}
              className="ag-icon-btn bg-[color:var(--ag-soft)]"
              aria-label={ar ? "إيقاف" : "Stop"}
              title={ar ? "إيقاف" : "Stop"}
            >
              {stopping ? <Loader2 size={15} className="animate-spin" /> : <Square size={13} fill="currentColor" />}
            </button>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim()}
            className="ag-icon-btn bg-[color:var(--ag-ink)] text-[color:var(--ag-bg)]"
            aria-label={running ? (ar ? "ضيف للطابور" : "Queue message") : ar ? "إرسال" : "Send"}
            title={running ? (ar ? "هتتبعت لما يخلص" : "Sends when the agent finishes") : undefined}
          >
            <ArrowUp size={18} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}
