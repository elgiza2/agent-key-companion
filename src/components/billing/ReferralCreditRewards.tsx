/** @doc Referral credit rewards — the live numbers behind the invite link.
 *
 *  Every figure comes from `referral_settings` on the server, so changing the reward in
 *  the database changes this card too. Nothing here is hardcoded.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/profile/ProfileGlassShell";
import { translateExactText, useUserLang } from "@/lib/authI18n";

interface Rewards {
  referrer_credits: number;
  referred_credits: number;
  milestone_refs: number;
  milestone_days: number;
  revenue_share_percent: number;
}

export default function ReferralCreditRewards() {
  const lang = useUserLang();
  const copy = (text: string) => translateExactText(text, lang);
  const [rewards, setRewards] = useState<Rewards | null>(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      // The generated database types predate this table, so the read is untyped here.
      const { data } = await (supabase as any)
        .from("referral_settings")
        .select("referrer_credits, referred_credits, milestone_refs, milestone_days, revenue_share_percent")
        .maybeSingle();
      if (!dead && data) setRewards(data as Rewards);
    })();
    return () => {
      dead = true;
    };
  }, []);

  if (!rewards) return null;
  const n = (value: number) => Number(value || 0).toLocaleString();

  const rows = [
    {
      label: copy("They join with your link"),
      value: `${n(rewards.referred_credits)} MC`,
      hint: copy("Credited the moment they sign up."),
    },
    {
      label: copy("They start using Megsy"),
      value: `${n(rewards.referrer_credits)} MC`,
      hint: copy("Credited to you on their first real use."),
    },
    {
      label: `${rewards.milestone_refs} ${copy("verified invites")}`,
      value: `${rewards.milestone_days} ${copy("days of Pro")}`,
      hint: `${rewards.revenue_share_percent}% ${copy("revenue share on everything they pay, for as long as they stay.")}`,
    },
  ];

  return (
    <GlassCard className="px-5 py-5">
      <h2 className="text-[15px] font-semibold text-foreground">{copy("Referral credits")}</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
        {copy("Credits are what runs Megsy. Invite someone and both of you get more.")}
      </p>
      <dl className="mt-4 flex flex-col divide-y divide-border/60">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <dt className="text-[13.5px] font-medium text-foreground">{row.label}</dt>
              <dd className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{row.hint}</dd>
            </div>
            <span className="shrink-0 text-[14px] font-semibold text-foreground" dir="ltr">
              {row.value}
            </span>
          </div>
        ))}
      </dl>
    </GlassCard>
  );
}
