/** Extracts [[TASK|ALARM|GOAL: …]] lines from agent replies and saves them once per task. */
import { supabase } from "@/integrations/supabase/client";
import { syncNativeTask, type NativeTask } from "@/lib/native/bridge";

const RE = /\[\[\s*(TASK|ALARM|GOAL)\s*:\s*([^\]|]+?)\s*(?:\|\s*([^\]]+?)\s*)?\]\]/gi;

export type LifeAction = { type: "task" | "alarm" | "goal"; title: string; at: string | null };

export function extractLifeActions(text: string): { clean: string; actions: LifeAction[] } {
  const actions: LifeAction[] = [];
  const clean = (text || "")
    .replace(RE, (_m, type: string, title: string, when?: string) => {
      const d = when ? new Date(when.trim()) : null;
      actions.push({
        type: type.toLowerCase() as LifeAction["type"],
        title: title.trim(),
        at: d && !isNaN(d.getTime()) ? d.toISOString() : null,
      });
      return "";
    })
    .trim();
  return { clean, actions };
}

const SAVED_KEY = "megsy:life-saved";

export async function saveLifeActions(taskId: string, actions: LifeAction[]): Promise<boolean> {
  if (!actions.length) return false;
  const saved = new Set<string>(JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"));
  if (saved.has(taskId)) return false;
  saved.add(taskId);
  localStorage.setItem(SAVED_KEY, JSON.stringify([...saved].slice(-300)));

  const goals = actions.filter((a) => a.type === "goal").map((a) => ({ title: a.title }));
  const tasks = actions
    .filter((a) => a.type !== "goal")
    .map((a) => ({ title: a.title, kind: a.type, remind_at: a.at, due_at: a.at, source: "agent" }));
  const [g, t] = await Promise.all([
    goals.length ? supabase.from("life_goals").insert(goals) : Promise.resolve({ error: null }),
    tasks.length
      ? supabase.from("life_tasks").insert(tasks).select("id,title,kind,remind_at,status")
      : Promise.resolve({ error: null, data: [] }),
  ]);
  for (const row of (t.data as NativeTask[] | null) ?? []) syncNativeTask(row);
  return !g.error && !t.error;
}
