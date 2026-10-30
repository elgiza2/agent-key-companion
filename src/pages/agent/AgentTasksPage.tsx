/** Agent task list inside Megsy's original site navigation. */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ListTodo, ChevronRight, RefreshCw, ArrowUpRight } from "lucide-react";
import { useUserLang } from "@/lib/authI18n";
import { agentApi } from "@/lib/agentsky/client";
import { useWorkspaceStore } from "@/lib/agentsky/store";
import { AgentShell } from "@/components/agent/AgentShell";
import { AgentOrb } from "@/components/agent/AgentOrb";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/common/SEOHead";
import { supabase } from "@/integrations/supabase/client";

type Task = Awaited<ReturnType<typeof agentApi.tasks>>["tasks"][number];
export default function AgentTasksPage() {
  const lang = useUserLang() === "ar-eg" ? "ar" : "en";
  const ar = lang === "ar";
  const nav = useNavigate();
  const { sessions, agents } = useWorkspaceStore();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const load = useCallback(async () => {
    setRefreshing(true);
    try { const result = await agentApi.tasks(); setTasks(result.tasks); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load tasks"); }
    finally { setRefreshing(false); }
  }, []);
  useEffect(() => { void load(); const timer = setInterval(() => void load(), 10000); return () => clearInterval(timer); }, [load]);
  const labels: Record<string, string> = { all: ar ? "الكل" : "All", working: ar ? "شغالة" : "Working", waiting_on_you: ar ? "مستنياك" : "Needs you", done: ar ? "خلصت" : "Done", failed: ar ? "وقفت" : "Failed" };
  const open = async (task: Task) => {
    setOpening(task.id);
    try {
      const { sessions: taskSessions } = await agentApi.taskSessions(task.id);
      const sessionIds = taskSessions.map((session) => session.id).filter(Boolean);
      if (!sessionIds.length) throw new Error(ar ? "المهمة دي ملهاش محادثة متاحة لسه." : "No conversation is available for this task yet.");
      const { data, error: queryError } = await supabase.from("messages").select("conversation_id").in("metadata->>agentSkySessionId", sessionIds).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (queryError) throw queryError;
      if (data?.conversation_id) nav(`/chat?conv=${encodeURIComponent(data.conversation_id)}`);
      else setError(ar ? "المحادثة المرتبطة بالمهمة دي لسه متحفظتش." : "This task's conversation has not been saved yet.");
    } catch (e) { setError(e instanceof Error ? e.message : (ar ? "مش قادر أفتح المحادثة" : "Could not open conversation")); }
    finally { setOpening(null); }
  };
  const visible = (tasks ?? []).filter((task) => filter === "all" || task.attention === filter);
  return <AgentShell lang={lang} title={ar ? "المهام" : "Tasks"} actions={<Button variant="outline" size="sm" onClick={() => nav("/tasks/life")}><ListTodo />{ar ? "مهامي" : "My tasks"}</Button>}>
    <SEOHead path="/tasks" title="Tasks — Megsy AI" description="Follow your agents' work and tasks in Megsy." />
    <div className="flex-1 overflow-y-auto px-5 py-8 md:px-10 md:py-12"><div className="mx-auto w-full max-w-5xl">
      <div className="mb-8 flex items-center justify-between gap-4"><div><h1 className="text-3xl font-semibold">{ar ? "الشغل الجاري" : "Work in progress"}</h1><p className="mt-2 text-sm text-muted-foreground">{tasks?.length ?? 0} {ar ? "مهمة" : "tasks"}</p></div><Button variant="ghost" size="icon" disabled={refreshing} onClick={() => void load()} title={ar ? "تحديث" : "Refresh"} aria-label={ar ? "تحديث" : "Refresh"}><RefreshCw className={refreshing ? "motion-safe:animate-spin" : ""} /></Button></div>
      <div className="mb-6 flex flex-wrap gap-1 border-b border-border" role="tablist" aria-label={ar ? "حالة المهام" : "Task status"}>{Object.entries(labels).map(([key, label]) => <Button variant="ghost" role="tab" aria-selected={filter === key} key={key} onClick={() => setFilter(key)} className={`rounded-none border-b-2 px-3 ${filter === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>{label}<span className="text-xs text-muted-foreground">{(tasks ?? []).filter((t) => key === "all" || t.attention === key).length}</span></Button>)}</div>
      {error && <p role="alert" className="mb-5 text-sm text-destructive">{error}</p>}
      {!tasks && !error && <div className="flex items-center justify-center gap-3 py-16" role="status"><AgentOrb size={42} state="awakening" /><span className="text-sm text-muted-foreground">{ar ? "بنجهز المهام…" : "Loading tasks…"}</span></div>}
      <div className="space-y-3">{visible.map((task) => {
        const session = sessions.find((s) => s.id === task.id);
        const agent = agents.find((a) => a.id === (task.agentId || session?.agentId));
        const state = task.attention === "working" ? "tool" : task.attention === "failed" ? "error" : task.attention === "done" ? "done" : "idle";
        return <Button variant="outline" key={task.id} disabled={opening === task.id} onClick={() => void open(task)} className="h-auto w-full justify-start gap-4 rounded-lg p-4 text-start md:p-5">
          <AgentOrb size={40} color={agent?.color} state={state} />
          <div className="min-w-0 flex-1"><div className="truncate font-semibold">{task.title || session?.title || (ar ? "مهمة" : "Task")}</div><div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-normal text-muted-foreground"><span>{agent?.name ?? "Megsy"}</span><span>{labels[task.attention] ?? task.attention}</span>{task.helpers > 0 && <span>{task.helpers} {ar ? "مساعد" : "helpers"}</span>}</div>{task.statusLine && <div className="mt-2 truncate text-sm font-normal text-muted-foreground">{task.statusLine}</div>}</div>
          {task.openRequests > 0 && <span className="text-xs text-primary">{task.openRequests} {ar ? "مستنياك" : "pending"}</span>}<ChevronRight className="shrink-0 text-muted-foreground rtl:rotate-180" />
        </Button>;
      })}</div>
      {tasks && !visible.length && <div className="flex flex-col items-center gap-5 py-16 text-center"><ListTodo className="h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">{ar ? "مفيش مهام هنا لسه" : "No tasks here yet"}</p><Button variant="outline" onClick={() => nav("/chat")}>{ar ? "ابدأ شات" : "Start chat"}<ArrowUpRight /></Button></div>}
    </div></div>
  </AgentShell>;
}
