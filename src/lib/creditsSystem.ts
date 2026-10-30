/** @doc Credits: live balance and real consumption — server-owned, no free allowance.
 *
 *  Server side owns everything:
 *  - `get_credit_overview()` returns the balance per bucket, the plan, today's spend
 *    and the next plan renewal.
 *  - `consume_daily_free_or_credits()` (used across the app) always charges real
 *    credits. There is no free daily allowance any more.
 *  - Credits enter a wallet only through a purchase, a referral reward, or an
 *    explicit grant — never automatically.
 */
import { supabase } from "@/integrations/supabase/client";
import { CREDITS_CHANGED_EVENT } from "@/hooks/useCredits";

export interface CreditOverview {
  credits: number;
  plan: string;
  claimedToday: boolean;
  grantedToday: number;
  nextRefresh: string | null;
  spentToday: number;
  tasksToday: number;
  spentThisMonth: number;
  dailyCredits: number;
  bonusCredits: number;
  planCredits: number;
  purchasedCredits: number;
}

/**
 * Re-reads the server balance and tells the app to refresh its caches. Nothing is
 * granted here: the balance only moves when something is bought, earned through a
 * referral, or spent.
 */
export async function refreshCredits(): Promise<number> {
  const { data, error } = await supabase.rpc("get_credit_overview");
  if (error || !data) return 0;
  const credits = Number((data as { credits?: number } | null)?.credits ?? 0);
  window.dispatchEvent(new Event(CREDITS_CHANGED_EVENT));
  return credits;
}

/** Full credits picture for the usage screen. */
export async function fetchCreditOverview(): Promise<CreditOverview | null> {
  const { data, error } = await supabase.rpc("get_credit_overview");
  if (error || !data) return null;
  const d = data as Record<string, unknown>;
  if (d.success !== true) return null;
  return {
    credits: Number(d.credits ?? 0),
    plan: String(d.plan ?? "free"),
    claimedToday: !!d.claimed_today,
    grantedToday: Number(d.granted_today ?? 0),
    nextRefresh: (d.next_refresh as string | null) ?? null,
    spentToday: Number(d.spent_today ?? 0),
    tasksToday: Number(d.tasks_today ?? 0),
    spentThisMonth: Number(d.spent_this_month ?? 0),
    dailyCredits: Number(d.daily_credits ?? 0),
    bonusCredits: Number(d.bonus_credits ?? 0),
    planCredits: Number(d.plan_credits ?? 0),
    purchasedCredits: Number(d.purchased_credits ?? 0),
  };
}
