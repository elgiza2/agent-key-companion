/** @doc Agent hub: a WhatsApp-style messenger for the user's agents.
 *
 * Layout mirrors WhatsApp — a conversation list beside the open chat:
 *  - Desktop: two panes side by side (agent list + conversation).
 *  - Mobile: the list, and tapping an agent opens its conversation full-screen.
 *
 * Every agent keeps MANY saved conversations (one per session), not a single
 * rolling one: the user starts a new conversation, browses past ones for that
 * agent, and reopens any of them. Sessions persist server-side through the
 * AgentSky API (`agentApi.sessions/createSession/deleteSession`), so they
 * survive reloads and other devices.
 *
 * Agent creation/editing lives in the same place: the "new agent" panel
 * exposes name, icon colour, description and system instructions, saved via
 * `agentApi.createAgent`. All UI text is English; the global (non-Egyptian)
 * audience rule applies — no regional wording anywhere.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Lock,
  MessageSquarePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { agentApi, type AgentColor, type AgentInfo, type SessionInfo } from "@/lib/agentsky/client";
import { useWorkspaceStore, workspace, loadWorkspace, refreshSessions } from "@/lib/agentsky/store";
import { useAgentSession } from "@/hooks/useAgentSession";
import { AgentIcon } from "@/components/agent/AgentIcon";
import { AgentOrb } from "@/components/agent/AgentOrb";
import { StepTimeline } from "@/components/agent/StepTimeline";
import { Composer } from "@/components/agent/Composer";
import { ApprovalCard, MediaCard, PlanCard, QuestionCard, TaskCard, VideoProposalCard } from "@/components/agent/Cards";
import { orbStateFor, type AgentTurn } from "@/lib/agentsky/transcript";
import { useUserLang } from "@/lib/authI18n";
import { canUseAgent } from "@/lib/octoberOffer";
import { promptUpgrade } from "@/lib/upgradeMoment";
import { isPaidUser } from "@/lib/subscriptionGating";
import SEOHead from "@/components/common/SEOHead";

const HUB_CSS = `
  .hub { display: flex; height: 100dvh; width: 100%; overflow: hidden; background: var(--settings-backdrop); color: var(--settings-ink); }
  .hub-list {
    width: 340px; flex: none; display: flex; flex-direction: column; min-height: 0;
    border-inline-end: 1px solid var(--settings-line);
    background: color-mix(in oklch, var(--settings-backdrop) 82%, transparent);
  }
  .hub-list-head { padding: 16px 16px 8px; }
  .hub-list-head h1 { font-size: 21px; font-weight: 700; letter-spacing: -0.01em; margin: 0; }
  .hub-search {
    display: flex; align-items: center; gap: 8px; margin-top: 12px; padding: 0 12px; height: 38px;
    border-radius: 999px; background: var(--settings-surface); border: 1px solid var(--settings-line);
  }
  .hub-search input { flex: 1; min-width: 0; background: transparent; border: 0; outline: none; font-size: 14px; color: inherit; }
  .hub-search input::placeholder { color: var(--settings-muted); }
  .hub-rows { flex: 1; overflow-y: auto; padding: 8px 8px 16px; overscroll-behavior: contain; }
  .hub-row {
    width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 10px;
    border: 0; background: transparent; color: inherit; font: inherit; text-align: start; cursor: pointer;
    border-radius: 16px; -webkit-tap-highlight-color: transparent;
  }
  .hub-row:hover { background: var(--settings-line); }
  .hub-row[data-active="true"] { background: var(--settings-surface); box-shadow: var(--settings-shadow); }
  .hub-avatar { width: 48px; height: 48px; flex: none; display: grid; place-items: center; border-radius: 50%; overflow: hidden; background: var(--settings-surface); border: 1px solid var(--settings-line); }
  .hub-row-main { flex: 1; min-width: 0; }
  .hub-row-top { display: flex; align-items: baseline; gap: 8px; }
  .hub-row-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; font-weight: 600; }
  .hub-row-time { flex: none; font-size: 11.5px; color: var(--settings-muted); }
  .hub-row-sub { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
  .hub-row-preview { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13.5px; color: var(--settings-muted); }
  .hub-unread { flex: none; min-width: 20px; height: 20px; padding: 0 6px; display: grid; place-items: center; border-radius: 999px; font-size: 11px; font-weight: 700; color: #fff; background: var(--settings-violet); }
  .hub-live { flex: none; font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 999px; color: var(--settings-green); background: color-mix(in oklch, var(--settings-green) 14%, transparent); }
  .hub-section { font-size: 11.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--settings-muted); padding: 14px 12px 4px; }
  .hub-chat { flex: 1; min-width: 0; display: flex; flex-direction: column; min-height: 0; background: color-mix(in oklch, var(--settings-backdrop) 90%, transparent); }
  .hub-chat-head {
    display: flex; align-items: center; gap: 10px; padding: 10px 16px; min-height: 64px; flex: none;
    background: color-mix(in oklch, var(--settings-surface) 72%, transparent);
    border-bottom: 1px solid var(--settings-line);
    backdrop-filter: var(--settings-frost);
  }
  .hub-conv-chip {
    flex: none; display: inline-flex; align-items: center; gap: 6px; max-width: 220px;
    padding: 6px 12px; border-radius: 999px; font-size: 12.5px; font-weight: 600;
    background: var(--settings-surface); border: 1px solid var(--settings-line); color: inherit;
  }
  .hub-conv-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hub-icon-btn { flex: none; width: 36px; height: 36px; display: grid; place-items: center; border: 0; border-radius: 50%; background: transparent; color: var(--settings-muted); cursor: pointer; }
  .hub-icon-btn:hover { background: var(--settings-line); color: var(--settings-ink); }
  .hub-conv-menu { position: absolute; top: 60px; inset-inline-end: 12px; z-index: 30; width: 280px; max-height: 320px; overflow-y: auto; border-radius: 18px; padding: 6px; background: var(--settings-surface); border: 1px solid var(--settings-line); box-shadow: var(--settings-shadow); backdrop-filter: var(--settings-frost); }
  .hub-conv-item { width: 100%; display: flex; align-items: center; gap: 8px; padding: 9px 10px; border: 0; background: transparent; color: inherit; font: inherit; font-size: 13.5px; text-align: start; border-radius: 12px; cursor: pointer; }
  .hub-conv-item:hover { background: var(--settings-line); }
  .hub-conv-item[data-active="true"] { background: var(--settings-line); font-weight: 600; }
  .hub-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; padding: 32px; color: var(--settings-muted); }
  .hub-form { display: flex; flex-direction: column; gap: 12px; padding: 20px; max-width: 520px; margin: 0 auto; width: 100%; }
  .hub-field { display: flex; flex-direction: column; gap: 6px; }
  .hub-field label { font-size: 13px; font-weight: 600; }
  .hub-input, .hub-area { width: 100%; border: 1px solid var(--settings-line); background: var(--settings-surface); border-radius: 14px; padding: 11px 13px; font-size: 15px; color: inherit; outline: none; font-family: inherit; }
  .hub-input:focus, .hub-area:focus { border-color: var(--settings-violet); }
  .hub-area { min-height: 110px; resize: vertical; line-height: 1.55; }
  .hub-swatches { display: flex; gap: 10px; flex-wrap: wrap; }
  .hub-swatch { width: 38px; height: 38px; border-radius: 50%; border: 0; cursor: pointer; }
  .hub-swatch[data-on="true"] { box-shadow: 0 0 0 2px var(--settings-backdrop), 0 0 0 4px currentColor; }
  .hub-primary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 44px; padding: 0 20px; border: 0; border-radius: 999px; font-size: 14.5px; font-weight: 650; background: var(--settings-ink); color: var(--settings-backdrop); cursor: pointer; }
  .hub-primary:disabled { opacity: 0.45; cursor: not-allowed; }
  @media (max-width: 860px) {
    .hub-list { width: 100%; border-inline-end: 0; }
    .hub[data-view="chat"] .hub-list { display: none; }
    .hub[data-view="list"] .hub-chat { display: none; }
  }
  @media (min-width: 861px) {
    .hub-back { display: none; }
  }
`;

const COLORS: { id: AgentColor; css: string }[] = [
  { id: "aurora", css: "#8295ff" },
  { id: "ocean", css: "#2f80ff" },
  { id: "ember", css: "#ff5a1a" },
  { id: "mint", css: "#10b981" },
  { id: "sun", css: "#f59e0b" },
  { id: "rose", css: "#e11d74" },
  { id: "mono", css: "#6b6e76" },
];

function timeAgo(iso: string | undefined, now: number): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const m = Math.max(0, Math.round((now - t) / 60000));
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function AgentForm({
  initial,
  saving,
  saveError,
  onSave,
  onCancel,
}: {
  initial?: AgentInfo | null;
  saving: boolean;
  saveError: string | null;
  onSave: (v: { name: string; description: string; prompt: string; color: AgentColor }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [color, setColor] = useState<AgentColor>(initial?.color ?? "aurora");
  return (
    <div className="ag-scroll">
      <div className="hub-form">
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
          {initial ? "Edit agent" : "New agent"}
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--settings-muted)", margin: 0 }}>
          {initial
            ? "Update how this agent looks and behaves."
            : "Give your agent a name, a look and its instructions. It uses AgentSky under the hood."}
        </p>
        <div className="hub-field">
          <label htmlFor="hub-agent-name">Name</label>
          <input
            id="hub-agent-name"
            className="hub-input"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Research assistant"
          />
        </div>
        <div className="hub-field">
          <label>Icon colour</label>
          <div className="hub-swatches">
            {COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                className="hub-swatch"
                data-on={color === c.id ? "true" : "false"}
                style={{ background: c.css, color: c.css }}
                aria-label={c.id}
                onClick={() => setColor(c.id)}
              />
            ))}
          </div>
        </div>
        <div className="hub-field">
          <label htmlFor="hub-agent-desc">Description</label>
          <input
            id="hub-agent-desc"
            className="hub-input"
            value={description}
            maxLength={160}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="One line about what it does"
          />
        </div>
        <div className="hub-field">
          <label htmlFor="hub-agent-prompt">Instructions</label>
          <textarea
            id="hub-agent-prompt"
            className="hub-area"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="How should this agent behave? Tone, rules, tools it may use…"
          />
        </div>
        {saveError && (
          <p role="alert" style={{ fontSize: 13, color: "var(--settings-red)", margin: 0 }}>
            {saveError}
          </p>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="hub-primary"
            disabled={saving || !name.trim()}
            onClick={() => onSave({ name: name.trim(), description: description.trim(), prompt, color })}
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {initial ? "Save changes" : "Create agent"}
          </button>
          <button
            type="button"
            className="hub-conv-chip"
            style={{ height: 44, padding: "0 20px", cursor: "pointer" }}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AgentHubPage() {
  const lang = useUserLang() === "ar-eg" ? "ar" : "en";
  const nav = useNavigate();
  const ws = useWorkspaceStore();
  const [now] = useState(Date.now());
  const [query, setQuery] = useState("");
  const [agentId, setAgentId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [convOpen, setConvOpen] = useState(false);
  const [mode, setMode] = useState<"chat" | "new" | "edit">("chat");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [deletingConv, setDeletingConv] = useState(false);
  const [pinned, setPinned] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadWorkspace();
  }, []);

  const paid = isPaidUser(ws.tier);
  const agents = ws.agents;
  const agent = useMemo(
    () => agents.find((a) => a.id === agentId) ?? agents.find((a) => a.isDefault) ?? agents[0] ?? null,
    [agents, agentId],
  );
  const convs = useMemo(
    () => (agent ? ws.sessions.filter((s) => s.agentId === agent.id) : []),
    [ws.sessions, agent],
  );
  const session = useMemo(
    () => convs.find((s) => s.id === sessionId) ?? convs[0] ?? null,
    [convs, sessionId],
  );
  const s = useAgentSession(session?.id ?? null, lang);
  const color = agent?.color ?? "aurora";
  const locked = !!agent && !agent.isDefault && !canUseAgent(ws.tier, !!agent.mediaOnly, now);

  useEffect(() => {
    setSessionId(null);
    setMode("chat");
    setConvOpen(false);
    setPinned(true);
  }, [agent?.id]);

  useEffect(() => {
    const el = scroller.current;
    if (el && pinned) el.scrollTop = el.scrollHeight;
  }, [s.turns, s.queue, pinned]);

  useEffect(() => {
    if (!s.running) void refreshSessions();
  }, [s.running]);

  const q = query.trim().toLowerCase();
  const visible = q
    ? agents.filter((a) => `${a.name} ${a.description}`.toLowerCase().includes(q))
    : agents;

  const pickAgent = (a: AgentInfo) => {
    if (!a.isDefault && !canUseAgent(ws.tier, !!a.mediaOnly, now)) {
      nav("/pricing");
      return;
    }
    setAgentId(a.id);
  };

  const startConversation = useCallback(
    async (text: string) => {
      if (!agent) return;
      setStarting(true);
      setStartError(null);
      try {
        const r = await agentApi.createSession({ agentId: agent.id, text });
        workspace.upsertSession(r.session);
        setSessionId(r.session.id);
        setMode("chat");
      } catch (e) {
        setStartError(e instanceof Error ? e.message : "Could not start the conversation");
      } finally {
        setStarting(false);
      }
    },
    [agent],
  );

  const deleteConversation = async (c: SessionInfo) => {
    if (!confirm(`Delete "${c.title || "this conversation"}"?`)) return;
    setDeletingConv(true);
    try {
      await agentApi.deleteSession(c.id);
      workspace.removeSession(c.id);
      if (session?.id === c.id) setSessionId(null);
    } catch {
      /* keep the row */
    } finally {
      setDeletingConv(false);
    }
  };

  const saveAgent = async (v: { name: string; description: string; prompt: string; color: AgentColor }) => {
    setSaving(true);
    setSaveError(null);
    try {
      const r = await agentApi.createAgent(v);
      workspace.addAgent(r.agent);
      setAgentId(r.agent.id);
      setMode("chat");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save the agent");
    } finally {
      setSaving(false);
    }
  };

  const removeAgent = async (a: AgentInfo) => {
    if (!confirm(`Delete ${a.name}? Your conversations will not be deleted.`)) return;
    try {
      await agentApi.deleteAgent(a.id);
      workspace.removeAgent(a.id);
      if (agent?.id === a.id) setAgentId(null);
    } catch {
      /* keep the row */
    }
  };

  const lastAgent = useMemo(
    () => [...s.turns].reverse().find((t) => t.type === "agent") as AgentTurn | undefined,
    [s.turns],
  );
  const orb = orbStateFor(lastAgent, s.running);
  const showChat = !!agent && mode === "chat";
  const mobileView: "list" | "chat" = agent && mode !== "new" ? "chat" : "list";

  return (
    <div className="hub" data-view={mobileView} data-no-translate>
      <style>{HUB_CSS}</style>
      <SEOHead
        locale="en"
        path="/agents"
        title="Your agents"
        description="Chat with your Megsy AI agents — every agent keeps its own saved conversations."
      />

      {/* ── Conversation list ── */}
      <aside className="hub-list" aria-label="Agents">
        <div className="hub-list-head">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ flex: 1 }}>Agents</h1>
            <button
              type="button"
              className="hub-icon-btn"
              aria-label="New agent"
              title="New agent"
              onClick={() => {
                if (!paid) {
                  promptUpgrade("New agent", "Create your own agents with custom instructions.");
                  return;
                }
                setMode("new");
              }}
            >
              <Plus size={19} />
            </button>
          </div>
          <div className="hub-search">
            <Search size={15} style={{ flex: "none", color: "var(--settings-muted)" }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search agents" aria-label="Search agents" />
            {query && (
              <button type="button" className="hub-icon-btn" style={{ width: 26, height: 26 }} aria-label="Clear" onClick={() => setQuery("")}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="hub-rows">
          {!ws.ready && (
            <div className="hub-empty">
              <Loader2 size={20} className="animate-spin" />
              <p>Loading your agents…</p>
            </div>
          )}
          {ws.ready && !visible.length && (
            <div className="hub-empty">
              <p>{q ? `No agents match "${query}"` : "Your next agent starts with a conversation."}</p>
              {!q && (
                <button type="button" className="hub-primary" onClick={() => setMode("new")}>
                  <Plus size={16} /> New agent
                </button>
              )}
            </div>
          )}
          {visible.map((a) => {
            const aConvs = ws.sessions.filter((x) => x.agentId === a.id);
            const latest = aConvs[0];
            const live = aConvs.filter((x) => x.status === "running").length;
            const isLocked = !a.isDefault && !canUseAgent(ws.tier, !!a.mediaOnly, now);
            return (
              <button
                key={a.id}
                type="button"
                className="hub-row"
                data-active={agent?.id === a.id && mode !== "new" ? "true" : "false"}
                onClick={() => pickAgent(a)}
                aria-label={`Open ${a.name}`}
              >
                <span className="hub-avatar" data-agent-color={a.color}>
                  <AgentIcon agent={a} />
                </span>
                <span className="hub-row-main">
                  <span className="hub-row-top">
                    <span className="hub-row-name">{a.name}</span>
                    <span className="hub-row-time">{timeAgo(latest?.createdAt, now)}</span>
                  </span>
                  <span className="hub-row-sub">
                    <span className="hub-row-preview">
                      {latest ? latest.title || "Conversation" : a.description || "Personal AI agent"}
                    </span>
                    {live > 0 && <span className="hub-live">{live} live</span>}
                    {isLocked && <Lock size={13} style={{ flex: "none", color: "var(--settings-muted)" }} />}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Open conversation ── */}
      <section className="hub-chat" aria-label={agent ? `${agent.name} conversation` : "Conversation"}>
        {mode === "new" && (
          <>
            <div className="hub-chat-head">
              <button type="button" className="hub-icon-btn hub-back" aria-label="Back" onClick={() => setMode("chat")}>
                <ArrowLeft size={19} />
              </button>
              <div style={{ flex: 1, fontWeight: 650 }}>New agent</div>
            </div>
            <AgentForm saving={saving} saveError={saveError} onSave={saveAgent} onCancel={() => setMode("chat")} />
          </>
        )}

        {mode === "edit" && agent && (
          <>
            <div className="hub-chat-head">
              <button type="button" className="hub-icon-btn hub-back" aria-label="Back" onClick={() => setMode("chat")}>
                <ArrowLeft size={19} />
              </button>
              <div style={{ flex: 1, fontWeight: 650 }}>Edit agent</div>
            </div>
            <AgentForm initial={agent} saving={saving} saveError={saveError} onSave={saveAgent} onCancel={() => setMode("chat")} />
          </>
        )}

        {showChat && agent && (
          <>
            <div className="hub-chat-head" data-agent-color={color}>
              <button type="button" className="hub-icon-btn hub-back" aria-label="Back to agents" onClick={() => setAgentId(null)}>
                <ArrowLeft size={19} />
              </button>
              <span className="hub-avatar" style={{ width: 42, height: 42 }}>
                <AgentOrb size={30} color={color} state={s.running ? "thinking" : "idle"} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 650, fontSize: 15.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {agent.name}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--settings-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.running ? "working…" : agent.description || "Personal AI agent"}
                </div>
              </div>
              {convs.length > 0 && (
                <button type="button" className="hub-conv-chip" onClick={() => setConvOpen((v) => !v)} aria-label="Conversations">
                  <span>{session?.title || `Chat ${convs.findIndex((c) => c.id === session?.id) + 1 || 1}`}</span>
                  <ChevronDown size={14} style={{ flex: "none" }} />
                </button>
              )}
              <button type="button" className="hub-icon-btn" aria-label="New conversation" title="New conversation" onClick={() => setSessionId(null)}>
                <MessageSquarePlus size={18} />
              </button>
              {!agent.isDefault && !agent.isTemplate && (
                <>
                  <button type="button" className="hub-icon-btn" aria-label="Edit agent" title="Edit agent" onClick={() => setMode("edit")}>
                    <Pencil size={17} />
                  </button>
                  <button type="button" className="hub-icon-btn" aria-label={`Delete ${agent.name}`} title="Delete agent" onClick={() => void removeAgent(agent)}>
                    <Trash2 size={17} />
                  </button>
                </>
              )}
            </div>

            {convOpen && convs.length > 0 && (
              <div className="hub-conv-menu" role="menu" aria-label="Conversations">
                <button
                  type="button"
                  className="hub-conv-item"
                  data-active={session ? "false" : "true"}
                  onClick={() => {
                    setSessionId(null);
                    setConvOpen(false);
                  }}
                >
                  <MessageSquarePlus size={15} style={{ flex: "none" }} /> New conversation
                </button>
                {convs.map((c, i) => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <button
                      type="button"
                      className="hub-conv-item"
                      data-active={session?.id === c.id ? "true" : "false"}
                      style={{ flex: 1 }}
                      onClick={() => {
                        setSessionId(c.id);
                        setConvOpen(false);
                      }}
                    >
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.title || `Conversation ${convs.length - i}`}
                      </span>
                      <span style={{ fontSize: 11.5, color: "var(--settings-muted)", flex: "none" }}>
                        {timeAgo(c.createdAt, now)}
                      </span>
                      {c.status === "running" && <span className="hub-live">live</span>}
                    </button>
                    <button
                      type="button"
                      className="hub-icon-btn"
                      style={{ width: 30, height: 30 }}
                      aria-label="Delete conversation"
                      disabled={deletingConv}
                      onClick={() => void deleteConversation(c)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!session ? (
              <div className="ag-scroll">
                <div className="ag-column" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, textAlign: "center", paddingTop: 56 }} data-agent-color={color}>
                  <AgentOrb size={84} color={color} state={starting ? "thinking" : "idle"} />
                  <div>
                    <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Chat with {agent.name}</h2>
                    <p style={{ margin: "6px 0 0", fontSize: 14.5, color: "var(--settings-muted)" }}>
                      {locked
                        ? "This agent needs a Pro subscription."
                        : "It researches, browses, makes images and video, and finishes tasks on its own."}
                    </p>
                  </div>
                  {locked ? (
                    <button type="button" className="hub-primary" onClick={() => nav("/pricing")}>
                      <Lock size={15} /> Go Pro
                    </button>
                  ) : (
                    <div style={{ width: "100%" }} data-agent-color={color}>
                      <Composer
                        lang={lang}
                        running={false}
                        stopping={false}
                        queue={[]}
                        onSend={(t) => void startConversation(t)}
                        onStop={() => {}}
                        onUnqueue={() => {}}
                        autoFocus
                      />
                      {(startError || ws.error) && (
                        <p style={{ marginTop: 8, fontSize: 13, color: "var(--settings-red)" }}>{startError || ws.error}</p>
                      )}
                      {convs.length > 0 && (
                        <p style={{ marginTop: 10, fontSize: 12.5, color: "var(--settings-muted)" }}>
                          {convs.length} saved conversation{convs.length === 1 ? "" : "s"} — pick one from the menu above.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
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
                                return <VideoProposalCard key={c.id} proposal={c.proposal} models={ws.models} tier={ws.tier} lang={lang} onUpgrade={() => nav("/pricing")} />;
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
                            {t.stopped && <p className="text-[13px] text-[color:var(--ag-muted)]">Stopped.</p>}
                            {t.error && <p className="text-[13px] text-[color:var(--ag-danger)]">{t.error}</p>}
                            {t.running && !t.text && !t.steps.length && <span className="ag-shimmer text-[14px]">Getting started…</span>}
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
              </>
            )}
          </>
        )}

        {showChat && !agent && (
          <div className="hub-empty">
            <Check size={0} style={{ display: "none" }} />
            <p>No agents yet. Create your first one.</p>
            <button type="button" className="hub-primary" onClick={() => setMode("new")}>
              <Plus size={16} /> New agent
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export function AgentHubNewPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/agents", { replace: true });
  }, [navigate]);
  return null;
}
