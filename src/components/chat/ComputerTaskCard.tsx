/**
 * @doc Silent in-chat surface for a Computer Agent task.
 *
 * Deliberately chrome-less: while the computer works it is a single quiet
 * progress line — no labels, no icons, no buttons. The narration lives in the
 * thinking trace above it, so this surface only carries what the task actually
 * produced (text + files) once it is finished.
 */
import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import {
  computerErrorMessage,
  loadStoredComputerTask,
  pollComputerTask,
  stopComputerTask,
  type ComputerTask,
  type ComputerEvent,
} from "@/lib/computer/client";
import { cleanAgentResult } from "@/lib/computer/resultText";
import ChatMessage from "@/components/chat/ChatMessage";
import { useNavigate } from "react-router-dom";
import { stashFileForPreview } from "@/lib/filePreviewStore";
import { useUserLang } from "@/lib/authI18n";
import AgentThinkingLine from "@/components/chat/AgentThinkingLine";
import { extractLifeActions, saveLifeActions } from "@/lib/life/agentActions";
import { toast } from "sonner";


import { clearActiveComputerRun, setActiveComputerRun } from "@/lib/computer/activeRun";
import { clearComputerLiveView, setComputerLiveView } from "@/lib/computer/liveView";


interface Props {
  taskId: string;
}

const POLL_MS = 1500;
const TASK_TIMEOUT_MS = 45 * 60 * 1000;


export default function ComputerTaskCard({ taskId }: Props) {
  const [task, setTask] = useState<ComputerTask | null>(null);
  const [events, setEvents] = useState<ComputerEvent[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const notesRef = useRef(0);
  const [timedOut, setTimedOut] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [decision, setDecision] = useState<"allow" | "deny" | null>(null);
  useEffect(() => {
    try {
      const v = localStorage.getItem(`megsy:approval:${taskId}`);
      if (v === "allow" || v === "deny") setDecision(v);
    } catch {
      /* ignore */
    }
  }, [taskId]);
  const navigate = useNavigate();
  const lang0 = useUserLang();
  useEffect(() => {
    if (task?.status !== "completed" && task?.status !== "done") return;
    const { actions } = extractLifeActions(task?.result_text || "");
    if (!actions.length) return;
    void saveLifeActions(taskId, actions).then((ok) => {
      if (!ok) return;
      const ar = lang0 === "ar-eg";
      toast(ar ? "اتضاف للمهام" : "Added to your tasks", {
        action: { label: ar ? "افتح" : "Open", onClick: () => navigate("/tasks") },
      });
    });
  }, [task?.status, task?.result_text, taskId, lang0, navigate]);
  // Files open on their own full page (/file-preview/:id) instead of an overlay
  // stacked on the conversation, so the viewer is clean and shareable.
  const openPreview = (file: { url: string; name: string; type?: string | null }) => {
    const id = stashFileForPreview({
      name: file.name,
      type: file.type || "application/octet-stream",
      url: file.url,
    });
    navigate(`/file-preview/${id}`);
  };
  // These two labels used to be hard-coded in Arabic and showed up in English
  // sessions too; follow the user's interface language instead.
  const lang = useUserLang();
  const isAr = lang === "ar-eg";
  const labels = isAr
    ? {
        run: "تشغيل المعاينة",
        open: "معاينة",
        download: "تحميل",
        tap: "اضغط للمعاينة",
        timedOut: "المهمة استغرقت وقتًا أطول من المتوقع وتم إيقافها.",
        failed: "المهمة على الكمبيوتر اتوقفت قبل ما تخلص. جرّب تبعتها تاني بصيغة أوضح.",
        empty: "المهمة خلصت من غير نتيجة مكتوبة.",
      }
    : {
        run: "Open preview",
        open: "Preview",
        download: "Download",
        tap: "Tap to preview",
        timedOut: "This task ran longer than expected and was stopped.",
        failed: "The computer task stopped before finishing. Try sending it again more clearly.",
        empty: "The task finished without a written result.",
      };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);


  useEffect(() => {
    let cancelled = false;
    const deadline = Date.now() + TASK_TIMEOUT_MS;

    // Paint whatever the database already holds before touching the provider:
    // a finished task keeps its result, files and step list on re-entry even if
    // the provider session is long gone.
    const hydrate = async () => {
      const stored = await loadStoredComputerTask(taskId);
      if (cancelled || !stored) return false;
      setTask(stored.task);
      setEvents(stored.events);
      setLoaded(true);
      return stored.task.status === "done" || stored.task.status === "failed";
    };


    const tick = async () => {
      try {
        if (Date.now() >= deadline) {
          setTimedOut(true);
          clearActiveComputerRun(taskId);
          await stopComputerTask(taskId).catch(() => undefined);
          return;
        }
        const res = await pollComputerTask(taskId);
        if (cancelled) return;
        // Keep stored results when a late poll comes back empty, so a finished
        // answer is never blanked out by the provider forgetting the session.
        setTask((prev) => ({
          ...res.task,
          result_text: res.task.result_text ?? prev?.result_text ?? null,
          files: res.task.files?.length ? res.task.files : (prev?.files ?? []),
          prompt: res.task.prompt || prev?.prompt || "",
        }));
        setLoaded(true);
        setEvents((prev) => (res.events?.length ? res.events : prev));
        const finished = res.task.status === "done" || res.task.status === "failed";
        // A task the provider stopped reporting on (page closed, provider drop)
        // must never keep the composer locked: after 10 quiet minutes it is
        // treated as abandoned so the user can send again immediately.
        const last = Date.parse(res.task.updated_at || res.task.created_at || "") || 0;
        const stale = last > 0 && Date.now() - last > 10 * 60 * 1000;
        if (finished || stale) {
          clearActiveComputerRun(taskId);
          if (stale && !finished) {
            setTimedOut(true);
            await stopComputerTask(taskId).catch(() => undefined);
          }
        } else {
          setActiveComputerRun(taskId);
          // Periodic user-facing progress note (~every 2 min): a milestone, a
          // problem, or steady progress — generated from the fresh step list.
          const seen = notesRef.current;
          const elapsedMin = (Date.now() - (Date.parse(res.task.created_at || "") || Date.now())) / 60000;
          if (elapsedMin >= (seen + 1) * 2 && (res.events?.length ?? 0) >= 2) {
            notesRef.current = seen + 1;
            const stepLines = (res.events ?? []).map((e: ComputerEvent) =>
              e.detail ? `${e.title} — ${e.detail}` : e.title,
            );
            const prompt = res.task.prompt || task?.prompt || "";
            void (async () => {
              try {
                const { generateProgressNote } = await import("@/lib/computer/narration");
                const note = await generateProgressNote({
                  task: prompt,
                  steps: stepLines,
                  minutes: Math.round(elapsedMin),
                });
                if (note && !cancelled) setNotes((prev) => [...prev.slice(-3), note]);
              } catch {
                /* a missing note is never an error */
              }
            })();
          }
          timer.current = setTimeout(tick, POLL_MS);
        }
      } catch {
        // Never leave the send button stuck as a stop button on a broken poll.
        clearActiveComputerRun(taskId);
        if (!cancelled) timer.current = setTimeout(tick, POLL_MS * 2);
      }

    };
    void (async () => {
      const alreadyFinished = await hydrate();
      // A task that already ended never needs the provider again.
      if (alreadyFinished || cancelled) {
        clearActiveComputerRun(taskId);
        return;
      }
      await tick();
    })();

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      clearActiveComputerRun(taskId);
    };
  }, [taskId]);

  // Until the first poll answers we know nothing: never claim the agent is
  // working, so a finished conversation opens straight on its result.
  const running =
    !timedOut &&
    loaded &&
    (task?.status === "pending" || task?.status === "running" || task?.status === "paused");
  const files = task?.files ?? [];

  const liveUrl = task?.live_url ? `${task.live_url}${task.live_url.includes("?") ? "&" : "?"}view_only=true` : null;

  // While it works the screen lives inside the composer dock, not in the chat.
  useEffect(() => {
    if (!running) {
      clearComputerLiveView(taskId);
      return;
    }
    setComputerLiveView({
      id: taskId,
      url: liveUrl,
      poster: null,
      status: task?.progress || events.at(-1)?.title || "",
      active: true,
    });
  }, [running, liveUrl, taskId, task?.progress, events]);
  useEffect(() => () => clearComputerLiveView(taskId), [taskId]);

  if (!loaded) return <AgentThinkingLine />;

  if (running) {
    const live = events.at(-1);
    // Mirror the provider: show its own internal reasoning when it streams it.
    const status = live?.detail || live?.title || task?.progress;
    const notesView = notes.length ? (
      <div className="mt-2 space-y-1.5">
        {notes.map((n, i) => (
          <p key={i} className="text-[13px] leading-relaxed text-foreground/85">{n}</p>
        ))}
      </div>
    ) : null;
    if (!liveUrl) {
      return (
        <div className="my-2">
          <AgentThinkingLine text={status} />
          {notesView}
        </div>
      );
    }
    return (
      <div className="my-4 max-w-md overflow-hidden rounded-[26px] bg-card p-3 ring-1 ring-border/60">
        <div className="flex items-center gap-3 px-1 pb-3 pt-1">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Globe className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-foreground">{isAr ? "المتصفح" : "Browser"}</span>
            <span className="ai-shimmer block truncate text-[12.5px]">{status || (isAr ? "بيشتغل…" : "Working…")}</span>
          </span>
        </div>
        {notesView}
        <div className="aspect-video overflow-hidden rounded-2xl bg-muted">
          <iframe src={liveUrl} title="Browser" className="pointer-events-none h-full w-full border-0" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => window.open(liveUrl.replace(/[?&]view_only=true/, ""), "_blank", "noopener,noreferrer")}
            className="h-11 rounded-full bg-primary text-[13.5px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {isAr ? "افتح المتصفح" : "Open browser"}
          </button>
          <button
            type="button"
            onClick={() => void stopComputerTask(taskId).catch(() => undefined)}
            className="h-11 rounded-full bg-muted text-[13.5px] font-semibold text-foreground transition-colors hover:bg-muted/70"
          >
            {isAr ? "إيقاف" : "Stop"}
          </button>
        </div>
      </div>
    );
  }

  // The provider often hands back its own raw payload (JSON, "Final result:",
  // internal reprs). Readers get the prose, never the machinery.
  const rawResult = cleanAgentResult(task?.result_text);
  // The agent pauses before sensitive actions and ends with [[APPROVAL: …]].
  const approvalMatch = /\[\[\s*APPROVAL\s*:\s*([\s\S]*?)\]\]/i.exec(rawResult || "");
  const approvalAction = approvalMatch?.[1]?.trim() || "";
  const afterApproval = approvalMatch ? (rawResult || "").replace(approvalMatch[0], "").trim() : rawResult;
  // Tasks / alarms / goals the agent created: saved once, hidden from the text.
  const { clean: resultText } = extractLifeActions(afterApproval || "");

  if (timedOut || task?.status === "failed") {
    const reason =
      (timedOut ? labels.timedOut : "") ||
      computerErrorMessage(task?.error) ||
      resultText ||
      labels.failed;
    return (
      <div className="my-4 space-y-4">
        <p className="text-[13px] leading-relaxed text-destructive">{reason}</p>
      </div>
    );
  }

  if (!resultText && files.length === 0 && !approvalAction) {
    return (
      <div className="my-4 space-y-4">
        <p className="text-[13px] leading-relaxed text-muted-foreground">{labels.empty}</p>
      </div>
    );
  }

  const htmlFile = files.find((f) => /\.html?$/i.test(f.name));

  /** Runs the produced code inside the app: CSS/JS are inlined into the page. */
  const runPreview = async () => {
    if (!htmlFile) return;
    try {
      const texts = await Promise.all(
        files.map(async (f) => ({ name: f.name, text: await fetch(f.url).then((r) => r.text()) })),
      );
      let html = texts.find((t) => t.name === htmlFile.name)?.text ?? "";
      for (const t of texts) {
        if (/\.css$/i.test(t.name)) {
          html = html.replace(
            new RegExp(`<link[^>]*${t.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^>]*>`, "i"),
            `<style>\n${t.text}\n</style>`,
          );
        } else if (/\.js$/i.test(t.name)) {
          html = html.replace(
            new RegExp(`<script[^>]*${t.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^>]*>\\s*</script>`, "i"),
            `<script>\n${t.text}\n</script>`,
          );
        }
      }
      const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
      openPreview({ url, name: htmlFile.name, type: "text/html" });
    } catch {
      openPreview({ url: htmlFile.url, name: htmlFile.name, type: "text/html" });
    }
  };

  const decide = (d: "allow" | "deny") => {
    setDecision(d);
    try {
      localStorage.setItem(`megsy:approval:${taskId}`, d);
    } catch {
      /* ignore */
    }
    const text =
      d === "allow"
        ? isAr
          ? `موافق. نفّذ الخطوة دي دلوقتي: ${approvalAction}`
          : `Approved. Go ahead and do this now: ${approvalAction}`
        : isAr
          ? `مرفوض. متنفذش الخطوة دي: ${approvalAction}. وقف واقترح بديل لو فيه.`
          : `Denied. Do not do this: ${approvalAction}. Stop and suggest an alternative if there is one.`;
    window.dispatchEvent(new CustomEvent("megsy:send-message", { detail: { text } }));
  };

  const approvalCard = approvalAction ? (
    <div className="max-w-md rounded-[24px] bg-card p-4 ring-1 ring-border/60">
      <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
        {isAr ? "محتاج موافقتك" : "Needs your approval"}
      </p>
      <p className="mt-1.5 text-[14px] leading-relaxed text-foreground">{approvalAction}</p>
      {decision ? (
        <p className="mt-3 text-[13px] font-medium text-muted-foreground">
          {decision === "allow" ? (isAr ? "✓ سمحت بالخطوة" : "✓ Allowed") : isAr ? "✕ رفضت الخطوة" : "✕ Denied"}
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => decide("deny")}
            className="h-10 rounded-full bg-muted text-[13px] font-semibold text-foreground transition-colors hover:bg-muted/70"
          >
            {isAr ? "رفض" : "Deny"}
          </button>
          <button
            type="button"
            onClick={() => decide("allow")}
            className="h-10 rounded-full bg-primary text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {isAr ? "سماح" : "Allow"}
          </button>
        </div>
      )}
    </div>
  ) : null;
  const quickReplies: string[] = [];

  const fileGrid =
    files.length > 0 || approvalCard ? (
      <div className="mt-3 space-y-2.5">
        {htmlFile ? (
          <button
            type="button"
            onClick={() => void runPreview()}
            className="w-full rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-[13px] font-medium text-primary transition-colors hover:bg-primary/15"
          >
            {labels.run}
          </button>
        ) : null}
        <div className="grid grid-cols-1 gap-3">
        {files.map((f) => {
          const isImage =
            /\.(png|jpe?g|webp|gif|avif)$/i.test(f.url) || !!f.type?.startsWith("image/");
          const isVideo = /\.(mp4|webm|mov)$/i.test(f.url) || !!f.type?.startsWith("video/");
          const ext = (f.name.split(".").pop() || "file").toLowerCase().slice(0, 4);
          const open = () => openPreview({ url: f.url, name: f.name, type: f.type });
          return (
            <div key={f.url} className="max-w-md overflow-hidden rounded-[24px] bg-card p-2.5 ring-1 ring-border/60">
              {(isImage || isVideo) && (
                <button type="button" onClick={open} className="block w-full overflow-hidden rounded-2xl bg-muted">
                  {isImage ? (
                    <img src={f.url} alt={f.name} loading="lazy" className="max-h-72 w-full object-cover" />
                  ) : (
                    <video src={f.url} muted playsInline preload="metadata" className="max-h-72 w-full object-cover" />
                  )}
                </button>
              )}
              <div className="flex items-center gap-3 px-1.5 py-2">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-[11px] font-bold uppercase text-primary">
                  {ext}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-foreground">{f.name}</span>
                  <span className="block text-[12px] uppercase text-muted-foreground">{ext}</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={open}
                  className="h-10 rounded-full bg-primary text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {labels.open}
                </button>
                <a
                  href={f.url}
                  download={f.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-10 place-items-center rounded-full bg-muted text-[13px] font-semibold text-foreground transition-colors hover:bg-muted/70"
                >
                  {labels.download}
                </a>
              </div>
            </div>
          );
        })}
        </div>
        {quickReplies.length > 0 && null}
        {approvalCard}
      </div>
    ) : null;


  return (
    <div className="my-4 space-y-4">
      {resultText ? (
        <ChatMessage role="assistant" content={resultText} bottomSlot={fileGrid} />
      ) : (
        fileGrid
      )}
    </div>
  );
}
