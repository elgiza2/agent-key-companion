/** @doc Agent chat: AgentSky session transcript with stacked steps, clean cards, stop + queued sends. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown } from "lucide-react";
import { useUserLang } from "@/lib/authI18n";
import { agentApi } from "@/lib/agentsky/client";
import { useWorkspaceStore, workspace, refreshSessions } from "@/lib/agentsky/store";
import { orbStateFor, type AgentTurn } from "@/lib/agentsky/transcript";
import { useAgentSession } from "@/hooks/useAgentSession";
import { AgentShell } from "@/components/agent/AgentShell";
import { AgentOrb } from "@/components/agent/AgentOrb";
import { StepTimeline } from "@/components/agent/StepTimeline";
import { Composer } from "@/components/agent/Composer";
import { ApprovalCard, MediaCard, PlanCard, QuestionCard, TaskCard, VideoProposalCard } from "@/components/agent/Cards";

export default function AgentChatPage() {
  const lang = useUserLang() === "ar-eg" ? "ar" : "en";
  const ar = lang === "ar";
  const { sessionId } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const ws = useWorkspaceStore();
  const [pickedAgent, setPickedAgent] = useState<string | null>(params.get("agent"));
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const s = useAgentSession(sessionId ?? null, lang);

  const session = ws.sessions.find((x) => x.id === sessionId);
  const agent = workspace.agent(session?.agentId ?? pickedAgent);
  const color = agent?.color ?? "aurora";

  const scroller = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);
  useEffect(() => {
    const el = scroller.current;
    if (el && pinned) el.scrollTop = el.scrollHeight;
  }, [s.turns, s.queue, pinned]);

  useEffect(() => {
    if (!s.running) void refreshSessions();
  }, [s.running]);

  const lastAgent = useMemo(() => [...s.turns].reverse().find((t) => t.type === "agent") as AgentTurn | undefined, [s.turns]);
  const orb = orbStateFor(lastAgent, s.running);

  const start = async (text: string) => {
    setStarting(true);
    setStartError(null);
    try {
      const r = await agentApi.createSession({ agentId: agent?.id, text });
      workspace.upsertSession(r.session);
      nav(`/agents/chat/${r.session.id}`);
    } catch (e: any) {
      setStartError(e.message);
    } finally {
      setStarting(false);
    }
  };

  const upgrade = () => nav("/pricing");

  /* ---------- empty / new chat ---------- */
  if (!sessionId) {
    return (
      <AgentShell lang={lang}>
        <div className="ag-scroll flex" data-agent-color={color}>
          <div className="ag-column my-auto flex flex-col items-center gap-6 text-center">
            <AgentOrb size={88} color={color} state={starting ? "thinking" : "idle"} />
            <div>
              <h1 className="text-[28px] font-bold tracking-tight">{ar ? "أعمل لك إيه النهارده؟" : "What should we get done?"}</h1>
              <p className="mt-1.5 text-[15px] text-[color:var(--ag-muted)]">
                {ar ? "يبحث، يتصفح، يعمل صور وفيديو، ويخلص المهام لوحده." : "It researches, browses, makes images and video, and finishes tasks on its own."}
              </p>
            </div>
            {ws.agents.filter((a) => !a.mediaOnly).length > 1 && (
              <div className="flex flex-wrap justify-center gap-2">
                {ws.agents.filter((a) => !a.mediaOnly).map((a) => (
                  <button key={a.id} type="button" className="ag-chip" data-selected={a.id === agent?.id} onClick={() => setPickedAgent(a.id)}>
                    <AgentOrb size={18} color={a.color} />
                    {a.name}
                  </button>
                ))}
              </div>
            )}
            <div className="w-full text-start">
              <Composer lang={lang} running={false} stopping={false} queue={[]} onSend={start} onStop={() => {}} onUnqueue={() => {}} autoFocus />
              {(startError || ws.error) && <p className="mt-2 text-center text-[13px] text-[color:var(--ag-danger)]">{startError || ws.error}</p>}
            </div>
          </div>
        </div>
      </AgentShell>
    );
  }

  /* ---------- live session ---------- */
  return (
    <AgentShell
      lang={lang}
      title={
        <span className="flex items-center gap-2.5" data-agent-color={color}>
          <AgentOrb size={26} color={color} state={orb} />
          <span className="truncate">{session?.title || agent?.name || "Megsy"}</span>
        </span>
      }
    >
      <div
        ref={scroller}
        className="ag-scroll relative"
        data-agent-color={color}
        onScroll={(e) => {
          const el = e.currentTarget;
          setPinned(el.scrollHeight - el.scrollTop - el.clientHeight < 120);
        }}
      >
        <div className="ag-column space-y-6">
          {s.loading && !s.turns.length && (
            <div className="flex justify-center py-16">
              <AgentOrb size={48} color={color} state="thinking" />
            </div>
          )}
          {s.turns.map((t, i) =>
            t.type === "user" ? (
              <div key={t.id} className="flex flex-col items-end gap-2 ag-fade-in">
                {t.images.map((u) => (
                  <img key={u} src={u} alt="" className="max-h-56 rounded-2xl" />
                ))}
                {t.text && (
                  <div className="ag-user" dir="auto">
                    {t.text}
                  </div>
                )}
              </div>
            ) : (
              <div key={t.id} className="flex gap-3">
                <div className="pt-0.5">
                  <AgentOrb size={28} color={color} state={i === s.turns.length - 1 ? orb : "idle"} />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <StepTimeline steps={t.steps} lang={lang} />
                  {t.cards
                    .filter((c) => c.kind === "plan")
                    .map((c) => c.kind === "plan" && <PlanCard key={c.id} title={c.title} steps={c.steps} lang={lang} />)}
                  {t.text && (
                    <div className="ag-answer" dir="auto">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: (p) => <a {...p} target="_blank" rel="noreferrer" /> }}>
                        {t.text}
                      </ReactMarkdown>
                    </div>
                  )}
                  {t.cards.map((c) => {
                    if (c.kind === "media") return <MediaCard key={c.id} media={c.media} lang={lang} />;
                    if (c.kind === "video")
                      return <VideoProposalCard key={c.id} proposal={c.proposal} models={ws.models} tier={ws.tier} lang={lang} onUpgrade={upgrade} />;
                    if (c.kind === "question")
                      return (
                        <QuestionCard
                          key={c.id}
                          question={c.question}
                          options={c.options}
                          allowFreeText={c.allowFreeText}
                          answered={c.answered}
                          lang={lang}
                          onAnswer={(v) => s.send(v)}
                        />
                      );
                    if (c.kind === "task") return <TaskCard key={c.id} title={c.title} dueAt={c.dueAt} lang={lang} onOpen={() => nav("/tasks")} />;
                    return null;
                  })}
                  {t.stopped && <p className="text-[13px] text-[color:var(--ag-muted)]">{ar ? "اتوقف." : "Stopped."}</p>}
                  {t.error && <p className="text-[13px] text-[color:var(--ag-danger)]">{t.error}</p>}
                  {t.running && !t.text && !t.steps.length && <span className="ag-shimmer text-[14px]">{ar ? "بيبدأ…" : "Getting started…"}</span>}
                </div>
              </div>
            ),
          )}
          {s.requests.map((r) => (
            <ApprovalCard
              key={r.id}
              request={r}
              lang={lang}
              onAnswer={(v) => {
                s.setRequests((q) => q.filter((x) => x.id !== r.id));
                s.send(v);
              }}
            />
          ))}
          {s.error && <p className="text-center text-[13px] text-[color:var(--ag-danger)]">{s.error}</p>}
        </div>
        {!pinned && (
          <button
            type="button"
            onClick={() => setPinned(true)}
            className="ag-icon-btn sticky bottom-3 mx-auto border border-[color:var(--ag-line)] bg-[color:var(--ag-surface)] shadow"
            aria-label="Scroll down"
          >
            <ChevronDown size={18} />
          </button>
        )}
      </div>
      <div className="mx-auto w-full max-w-[760px] px-4 pb-4 pt-1" data-agent-color={color}>
        <Composer
          lang={lang}
          running={s.running}
          stopping={s.stopping}
          queue={s.queue}
          onSend={(t) => {
            setPinned(true);
            s.send(t);
          }}
          onStop={s.stop}
          onUnqueue={s.unqueue}
        />
      </div>
    </AgentShell>
  );
}
