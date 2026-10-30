/**
 * @doc Required steps on the referral page. All of them must be finished —
 * together with five verified invites — before free Pro can be claimed.
 * No credits are involved: these are unlock conditions, not paid rewards.
 * Styled with the shared glass rows so the page reads like the settings pages.
 */
import { useState } from "react";
import { ExternalLink, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { translateExactText, useUserLang } from "@/lib/authI18n";
import { GlassCard, GlassSection } from "@/components/profile/ProfileGlassShell";
import { useReferrals } from "@/pages/billing/ReferralsPage";

export default function ReferralTasksList({ className = "" }: { className?: string }) {
  const lang = useUserLang();
  const copy = (t: string) => translateExactText(t, lang);
  const { milestone } = useReferrals();
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const tasks = milestone.tasks;
  if (tasks.length === 0) return null;

  const run = async (key: string, url: string | null) => {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    setBusy(key);
    try {
      const ok = await milestone.completeTask(key);
      if (!ok) toast.error(copy("We couldn't save this step yet"));
    } finally {
      setBusy(null);
    }
  };

  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <GlassSection title={copy("Required steps")} className={className}>
      <GlassCard>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="gx-row gx-row-tap"
        >
          <span className="gx-row-body">
            <span className="gx-row-label">{copy("Finish these to unlock Pro")}</span>
            <span className="gx-row-hint">
              {doneCount} / {tasks.length} {copy("done")}
            </span>
          </span>
          <ChevronDown
            className={`gx-chev transition-transform ${open ? "rotate-180" : ""}`}
            strokeWidth={1.9}
            aria-hidden="true"
          />
        </button>

        {open &&
          tasks.map((task) => (
            <button
              key={task.key}
              type="button"
              onClick={() => run(task.key, task.url)}
              disabled={task.done || busy === task.key}
              className="gx-row gx-row-tap disabled:opacity-60"
            >
              <span className="gx-row-body">
                <span className="gx-row-label">{copy(task.title)}</span>
                {task.description ? <span className="gx-row-hint">{copy(task.description)}</span> : null}
              </span>
              <span className="gx-row-trailing">
                {task.done ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <>
                    <span>+10</span>
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </span>
            </button>
          ))}
      </GlassCard>
      <p className="gx-section-note">{copy("Each task you finish adds 10 credits, once.")}</p>
    </GlassSection>
  );
}
