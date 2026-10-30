/** @doc Tasks — goals, tasks/reminders/alarms and Megsy's ideas (life_goals, life_tasks, life_ideas). */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlarmClock, ArrowLeft, Bell, Check, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserLang } from "@/lib/authI18n";
import { cancelNativeTask, isNativeApp, syncNativeTask } from "@/lib/native/bridge";
import MorningPlanCard from "@/components/life/MorningPlanCard";

type Goal = { id: string; title: string; done: boolean };
type Task = {
  id: string;
  title: string;
  notes: string | null;
  kind: string;
  remind_at: string | null;
  status: string;
  source: string;
};
type Idea = { id: string; emoji: string; title: string; body: string | null; prompt: string };

const T = {
  en: {
    title: "Tasks",
    goals: "Goals",
    tasks: "To do",
    ideas: "Ideas",
    addGoal: "New goal",
    addTask: "New task",
    goalPh: "e.g. Save 5,000 this month",
    taskPh: "What needs doing?",
    when: "Remind me at",
    alarm: "Alarm",
    save: "Add",
    noGoals: "No goals yet. Add one and Megsy will help you reach it.",
    noTasks: "Nothing to do. Enjoy it.",
    done: "Done",
    byMegsy: "By Megsy",
    failed: "Could not save",
    alarmSoon: "Open Megsy on your Android phone to set this as a real alarm.",
  },
  ar: {
    title: "المهام",
    goals: "الأهداف",
    tasks: "المطلوب",
    ideas: "أفكار",
    addGoal: "هدف جديد",
    addTask: "مهمة جديدة",
    goalPh: "مثلًا: أحوّش ٥٠٠٠ الشهر ده",
    taskPh: "إيه المطلوب؟",
    when: "فكّرني الساعة",
    alarm: "منبّه",
    save: "إضافة",
    noGoals: "لسه مفيش أهداف. ضيف هدف وميغسي هيساعدك توصله.",
    noTasks: "مفيش حاجة مطلوبة. استمتع.",
    done: "خلصت",
    byMegsy: "من ميغسي",
    failed: "مقدرناش نحفظ",
    alarmSoon: "افتح ميغسي من تطبيق الأندرويد عشان يتضبط كمنبه حقيقي.",
  },
};

const STARTER_IDEAS = {
  en: [
    { emoji: "🗓️", title: "I can plan your week", body: "Tell me what's coming up and I'll turn it into a clean plan with reminders.", prompt: "Help me plan my week. Ask me what's coming up, then create tasks with reminders." },
    { emoji: "⏰", title: "I can remind you every day", body: "Medicine, water, prayer, gym — say it once and I'll remind you on time.", prompt: "I want a daily reminder. Ask me what and when, then set it up." },
    { emoji: "🎯", title: "I can break a goal into steps", body: "Pick a goal and I'll split it into small weekly tasks you can actually finish.", prompt: "Take my first goal and break it into small weekly tasks with due dates." },
  ],
  ar: [
    { emoji: "🗓️", title: "أقدر أرتّبلك أسبوعك", body: "قولّي إيه اللي جاي وأنا أحوّله لخطة نضيفة بتذكيرات.", prompt: "ساعدني أخطط أسبوعي. اسألني إيه اللي جاي وبعدين اعمل مهام بتذكيرات." },
    { emoji: "⏰", title: "أقدر أفكّرك كل يوم", body: "دوا، مية، صلاة، جيم — قولها مرة وأنا أفكّرك في ميعادها.", prompt: "عايز تذكير يومي. اسألني بإيه وإمتى وبعدين اضبطه." },
    { emoji: "🎯", title: "أقدر أقسّم هدفك لخطوات", body: "اختار هدف وأنا أقسّمه لمهام صغيرة كل أسبوع تقدر تخلّصها.", prompt: "خد أول هدف عندي وقسّمه لمهام أسبوعية صغيرة بمواعيد." },
  ],
};

function fmt(iso: string, ar: boolean) {
  return new Date(iso).toLocaleString(ar ? "ar-EG" : "en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
}

export default function TasksPage() {
  const navigate = useNavigate();
  const ar = useUserLang() === "ar-eg";
  const t = ar ? T.ar : T.en;

  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<null | "goal" | "task">(null);
  const [text, setText] = useState("");
  const [when, setWhen] = useState("");
  const [alarm, setAlarm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [g, tk, i] = await Promise.all([
      supabase.from("life_goals").select("id,title,done").order("done").order("created_at", { ascending: false }),
      supabase
        .from("life_tasks")
        .select("id,title,notes,kind,remind_at,status,source")
        .order("status", { ascending: false })
        .order("remind_at", { ascending: true, nullsFirst: false })
        .limit(200),
      supabase.from("life_ideas").select("id,emoji,title,body,prompt").eq("dismissed", false).order("created_at", { ascending: false }).limit(6),
    ]);
    setGoals((g.data as Goal[]) ?? []);
    setTasks((tk.data as Task[]) ?? []);
    setIdeas((i.data as Idea[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleGoal = async (g: Goal) => {
    setGoals((p) => p.map((x) => (x.id === g.id ? { ...x, done: !x.done } : x)));
    await supabase.from("life_goals").update({ done: !g.done }).eq("id", g.id);
  };
  const toggleTask = async (tk: Task) => {
    const status = tk.status === "done" ? "todo" : "done";
    setTasks((p) => p.map((x) => (x.id === tk.id ? { ...x, status } : x)));
    syncNativeTask({ ...tk, status });
    await supabase.from("life_tasks").update({ status }).eq("id", tk.id);
  };
  const removeTask = async (id: string) => {
    setTasks((p) => p.filter((x) => x.id !== id));
    cancelNativeTask(id);
    await supabase.from("life_tasks").delete().eq("id", id);
  };

  const save = async () => {
    const title = text.trim();
    if (!title) return;
    setSaving(true);
    const res =
      sheet === "goal"
        ? await supabase.from("life_goals").insert({ title })
        : await supabase
            .from("life_tasks")
            .insert({
              title,
              kind: alarm ? "alarm" : "task",
              remind_at: when ? new Date(when).toISOString() : null,
              due_at: when ? new Date(when).toISOString() : null,
            })
            .select("id,title,kind,remind_at,status")
            .single();
    if (sheet !== "goal" && res.data) syncNativeTask(res.data as Task);
    setSaving(false);
    if (res.error) {
      toast.error(t.failed);
      return;
    }
    if (alarm && !isNativeApp()) toast(t.alarmSoon);
    if (when && "Notification" in window && Notification.permission === "default") void Notification.requestPermission();
    setSheet(null);
    setText("");
    setWhen("");
    setAlarm(false);
    void load();
  };

  const askMegsy = (prompt: string) => {
    sessionStorage.setItem("megsy:pending-prompt", prompt);
    navigate("/chat");
  };

  const shownIdeas = ideas.length ? ideas : STARTER_IDEAS[ar ? "ar" : "en"].map((x, i) => ({ id: `s${i}`, ...x }));
  const open = tasks.filter((x) => x.status !== "done");
  const closed = tasks.filter((x) => x.status === "done").slice(0, 5);

  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/90 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate("/chat", { replace: true })}
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className={`h-5 w-5 ${ar ? "rotate-180" : ""}`} />
        </button>
        <h1 className="text-xl font-semibold">{t.title}</h1>
      </header>

      {loading ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <main className="mx-auto grid max-w-5xl gap-4 px-4 pb-28 md:grid-cols-2">
          {/* Goals */}
          <section className="rounded-[28px] bg-card p-6 ring-1 ring-border/60">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">{t.goals}</h2>
              <button onClick={() => setSheet("goal")} className="grid h-9 w-9 place-items-center rounded-full bg-muted hover:bg-muted/70" aria-label={t.addGoal}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {goals.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">{t.noGoals}</p>
            ) : (
              <ul className="space-y-1">
                {goals.map((g) => (
                  <li key={g.id}>
                    <button onClick={() => void toggleGoal(g)} className="flex w-full items-center gap-4 rounded-2xl px-1 py-3 text-start">
                      <Box checked={g.done} />
                      <span className={`text-[17px] ${g.done ? "text-muted-foreground" : ""}`}>{g.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Ideas */}
          <section className="rounded-[28px] bg-card p-6 ring-1 ring-border/60 md:row-span-2">
            <h2 className="mb-2 text-2xl font-semibold">{t.ideas}</h2>
            <ul className="divide-y divide-border/60">
              {shownIdeas.map((i) => (
                <li key={i.id}>
                  <button onClick={() => askMegsy(i.prompt)} className="flex w-full gap-4 py-5 text-start">
                    <span className="text-4xl leading-none">{i.emoji}</span>
                    <span>
                      <span className="block text-[17px] font-medium">{i.title}</span>
                      {i.body && <span className="mt-1 block text-[15px] leading-relaxed text-muted-foreground">{i.body}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <MorningPlanCard ar={ar} />

          {/* Tasks */}
          <section className="rounded-[28px] bg-card p-6 ring-1 ring-border/60">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">{t.tasks}</h2>
              <button onClick={() => setSheet("task")} className="grid h-9 w-9 place-items-center rounded-full bg-muted hover:bg-muted/70" aria-label={t.addTask}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {open.length === 0 && closed.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">{t.noTasks}</p>
            ) : (
              <ul className="space-y-1">
                {[...open, ...closed].map((tk) => {
                  const done = tk.status === "done";
                  return (
                    <li key={tk.id} className="group flex items-center gap-4 py-3">
                      <button onClick={() => void toggleTask(tk)} aria-label={t.done}>
                        <Box checked={done} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-[17px] ${done ? "text-muted-foreground line-through" : ""}`}>{tk.title}</p>
                        {(tk.remind_at || tk.source === "agent") && (
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            {tk.remind_at && (
                              <>
                                {tk.kind === "alarm" ? <AlarmClock className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
                                {fmt(tk.remind_at, ar)}
                              </>
                            )}
                            {tk.source === "agent" && <span>· {t.byMegsy}</span>}
                          </p>
                        )}
                      </div>
                      <button onClick={() => void removeTask(tk.id)} className="opacity-0 transition group-hover:opacity-100" aria-label="Delete">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </main>
      )}

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm md:items-center" onClick={() => setSheet(null)}>
          <div className="w-full max-w-md rounded-t-[28px] bg-card p-6 ring-1 ring-border md:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{sheet === "goal" ? t.addGoal : t.addTask}</h3>
              <button onClick={() => setSheet(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void save()}
              placeholder={sheet === "goal" ? t.goalPh : t.taskPh}
              className="w-full rounded-2xl bg-muted px-4 py-3 text-[16px] outline-none"
            />
            {sheet === "task" && (
              <div className="mt-3 space-y-3">
                <label className="block text-sm text-muted-foreground">
                  {t.when}
                  <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="mt-1 w-full rounded-2xl bg-muted px-4 py-3 text-foreground outline-none" />
                </label>
                <button
                  onClick={() => setAlarm((a) => !a)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm ring-1 ${alarm ? "bg-foreground text-background ring-foreground" : "ring-border"}`}
                >
                  <AlarmClock className="h-4 w-4" /> {t.alarm}
                </button>
              </div>
            )}
            <button
              onClick={() => void save()}
              disabled={saving || !text.trim()}
              className="mt-5 w-full rounded-full bg-foreground py-3 font-medium text-background disabled:opacity-40"
            >
              {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t.save}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Box({ checked }: { checked: boolean }) {
  return (
    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${checked ? "border-muted-foreground/40 bg-muted-foreground/40" : "border-muted-foreground/50"}`}>
      {checked && <Check className="h-4 w-4 text-background" strokeWidth={3} />}
    </span>
  );
}
