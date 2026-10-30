/** Morning plan setting (life_settings): on/off + local time. Sent by /api/public/reminders-tick. */
import { useEffect, useState } from "react";
import { Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function MorningPlanCard({ ar }: { ar: boolean }) {
  const [on, setOn] = useState(false);
  const [time, setTime] = useState("08:00");
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setUid(data.user.id);
      const { data: s } = await supabase.from("life_settings").select("morning_enabled,morning_time").eq("user_id", data.user.id).maybeSingle();
      if (s) {
        setOn(s.morning_enabled);
        setTime(s.morning_time);
      }
    })();
  }, []);

  const save = async (next: { on?: boolean; time?: string }) => {
    const o = next.on ?? on;
    const tm = next.time ?? time;
    setOn(o);
    setTime(tm);
    if (!uid) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Cairo";
    await supabase.from("life_settings").upsert({ user_id: uid, morning_enabled: o, morning_time: tm, tz }, { onConflict: "user_id" });
  };

  return (
    <section className="rounded-[28px] bg-card p-6 ring-1 ring-border/60">
      <div className="flex items-center gap-4">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-muted">
          <Sun className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-semibold">{ar ? "خطة الصبح" : "Morning plan"}</h2>
          <p className="text-sm text-muted-foreground">
            {ar ? "ميغسي تبعتلك مهام وأهداف النهارده كل يوم." : "Megsy sends you today's tasks and goals every day."}
          </p>
        </div>
        <button
          onClick={() => void save({ on: !on })}
          role="switch"
          aria-checked={on}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-foreground" : "bg-muted"}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-background transition-all ${on ? "start-6" : "start-1"}`} />
        </button>
      </div>
      {on && (
        <input
          type="time"
          value={time}
          onChange={(e) => void save({ time: e.target.value })}
          className="mt-4 w-full rounded-2xl bg-muted px-4 py-3 text-foreground outline-none"
        />
      )}
    </section>
  );
}
