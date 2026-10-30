/** @doc Team Workspace: paid-only 24/7 agent team.
 *
 * Flow:
 *  - Non-subscribers see a landing page and must subscribe to enter.
 *  - Subscribers send one goal message; the fast orchestrator proposes named
 *    agents, each with a role and a task, persisted server-side.
 *  - Agents keep running 24/7: a ticker re-invokes the orchestrator per agent
 *    so results stream back into the workspace loop.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Crown, Loader2, PauseCircle, Play, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/common/SEOHead";
import { edgeAnonKey, edgeUrl } from "@/lib/edgeRuntime";

type TeamAgent = {
  id: string;
  name: string;
  role: string;
  task: string;
  status: string;
  last_result: string;
  updated_at: string;
  cycles?: number;
};

const ROLE_SUGGESTIONS = [
  { role: "researcher", label: "Researcher", hint: "live facts, news, sources" },
  { role: "coder", label: "Engineer", hint: "code, repos, debugging" },
  { role: "analyst", label: "Analyst", hint: "numbers, finance, strategy" },
  { role: "writer", label: "Writer", hint: "copy, docs, scripts" },
  { role: "operator", label: "Operator", hint: "execution, automation" },
  { role: "designer", label: "Designer", hint: "UI, branding, landing" },
];

export default function TeamWorkspacePage() {
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);
  const [goal, setGoal] = useState("");
  const [agents, setAgents] = useState<TeamAgent[]>([]);
  const [workspaceStatus, setWorkspaceStatus] = useState("active");
  const [busy, setBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;
    let firstLoad = true;
    const refresh = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          if (!dead) { setPaid(false); setAgents([]); }
          return;
        }
        // edgeUrl()/edgeAnonKey() carry built-in fallbacks, so the page works on
        // a fresh deploy without manually setting VITE_* vars in Vercel.
        const resp = await fetch(edgeUrl("team-orchestrate"), {
          headers: {
            apikey: edgeAnonKey("team-orchestrate"),
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (resp.status === 402 || resp.status === 401) {
          if (!dead) { setPaid(false); setAgents([]); setError(null); }
          return;
        }
        if (!resp.ok) throw new Error(`workspace ${resp.status}`);
        const result = await resp.json();
        if (!dead) {
          setPaid(true);
          setAgents((result.agents ?? []) as TeamAgent[]);
          setWorkspaceStatus(String(result.workspace?.status ?? "active"));
          setError(null);
        }
      } catch (e) {
        if (!dead) setError(e instanceof Error ? e.message : "Could not refresh workspace");
      } finally {
        if (firstLoad && !dead) setLoading(false);
        firstLoad = false;
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => { dead = true; window.clearInterval(timer); };
  }, []);

  const start = useCallback(async () => {
    const text = goal.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(edgeUrl("team-orchestrate"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: edgeAnonKey("team-orchestrate"),
          Authorization: `Bearer ${session?.access_token ?? edgeAnonKey("team-orchestrate")}`,
        },
        body: JSON.stringify({ goal: text }),
      });
      if (!resp.ok) throw new Error(`orchestrator ${resp.status}`);
      const body = await resp.json();
      setAgents((body.agents ?? []) as TeamAgent[]);
      setWorkspaceStatus("active");
      setGoal("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to start team");
    } finally {
      setBusy(false);
    }
  }, [goal, busy]);

  const toggleWorkspace = useCallback(async () => {
    if (statusBusy) return;
    setStatusBusy(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const action = workspaceStatus === "active" ? "pause" : "resume";
      const resp = await fetch(edgeUrl("team-orchestrate"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: edgeAnonKey("team-orchestrate"),
          Authorization: `Bearer ${session?.access_token ?? edgeAnonKey("team-orchestrate")}`,
        },
        body: JSON.stringify({ action }),
      });
      if (!resp.ok) throw new Error(`workspace ${resp.status}`);
      const result = await resp.json();
      setWorkspaceStatus(String(result.workspace?.status ?? "active"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update workspace");
    } finally {
      setStatusBusy(false);
    }
  }, [statusBusy, workspaceStatus]);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  if (!paid) {
    return (
      <>
        <SEOHead path="/team" title="Team Workspace — Megsy" description="Your 24/7 AI agent team. Subscribe to unlock." />
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 to-indigo-500 text-white">
            <Bot size={26} />
          </span>
          <h1 className="mt-6 text-3xl font-bold">Team Workspace</h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed opacity-75">
            Send one message describing your goal. Megsy assembles a named agent team —
            each agent with its own role and task — and advances active tasks in the background.
          </p>
          {error && <p role="alert" className="mx-auto mt-3 max-w-xl text-sm text-red-500">{error}</p>}
          <ul className="mx-auto mt-8 grid max-w-xl gap-2 text-start text-sm">
            {ROLE_SUGGESTIONS.map((r) => (
              <li key={r.role} className="flex items-center gap-3 rounded-xl border px-4 py-3">
                <Bot size={16} className="flex-none opacity-60" />
                <strong>{r.label}</strong>
                <span className="opacity-60">{r.hint}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/pricing"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-indigo-500 px-6 py-3 font-semibold text-white"
          >
            <Crown size={16} /> Subscribe to unlock
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead path="/team" title="Team Workspace — Megsy" description="Your 24/7 AI agent team at work." />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Team Workspace</h1>
            <p className="mt-1 text-sm opacity-60">Agents take a background work step about every 5 minutes while the workspace is active.</p>
          </div>
          {["active", "paused"].includes(workspaceStatus) && agents.length > 0 && (
            <button type="button" onClick={toggleWorkspace} disabled={statusBusy} className="ag-btn shrink-0">
              {statusBusy ? <Loader2 size={16} className="animate-spin" /> : workspaceStatus === "active" ? <PauseCircle size={16} /> : <Play size={16} />}
              {workspaceStatus === "active" ? "Pause team" : "Resume team"}
            </button>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") start(); }}
            placeholder="e.g. monitor prices, draft weekly report, triage inbox…"
            className="ag-input flex-1"
            dir="auto"
          />
          <button type="button" onClick={start} disabled={busy || !goal.trim()} className="ag-btn ag-btn--agent">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Start team
          </button>
        </div>
        <p className="mt-2 text-xs opacity-50">Background agents work from the saved goal and notes; web searches and external app actions are not available in this runner yet.</p>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        <div className="mt-6 space-y-3">
          {agents.map((a) => (
            <div key={a.id} className="ag-card ag-fade-in p-4">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${a.status === "running" ? "bg-green-500 animate-pulse" : a.status === "blocked" ? "bg-amber-500" : "bg-gray-400"}`} />
                <strong>{a.name}</strong>
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">{a.role}</span>
                <span className="ms-auto text-xs opacity-50">{a.status}</span>
              </div>
              <p className="mt-2 text-sm opacity-80">{a.task}</p>
              {typeof a.cycles === "number" && <p className="mt-1 text-[11px] opacity-45">Background steps: {a.cycles}</p>}
              {a.last_result && (
                <p className="mt-2 line-clamp-3 rounded-xl bg-black/5 p-3 text-[13px] dark:bg-white/5">{a.last_result}</p>
              )}
            </div>
          ))}
          {!agents.length && !busy && (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm opacity-60">
              No agents yet — send your goal above and Megsy will assemble the team.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
