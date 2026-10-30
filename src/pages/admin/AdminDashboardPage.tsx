import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Gift,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
  Video,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type RpcClient = {
  rpc: (
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: Error | null }>;
};

const adminDb = supabase as unknown as RpcClient;

type Snapshot = {
  kpis: {
    users: number;
    new_users_30d: number;
    paid_users: number;
    referrals: number;
    active_offers: number;
    video_uses_30d: number;
  };
  users: Array<{
    id: string;
    email: string | null;
    created_at: string;
    plan: string;
    subscribed: boolean;
    referrals: number;
    offer_expires_at: string | null;
  }>;
};

const fmtDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

export default function AdminDashboardPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [offerEmail, setOfferEmail] = useState("zjra00@gmail.com");
  const [granting, setGranting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: snapshot, error } = await adminDb.rpc("admin_dashboard_snapshot");
      if (error) throw error;
      setData(snapshot as Snapshot);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Admin access required");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const grantOffer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!offerEmail.trim()) return;
    setGranting(true);
    try {
      const { error } = await adminDb.rpc("admin_upsert_premium_day_offer", {
        target_email: offerEmail.trim(),
        duration_days: 1,
        video_limit: 3,
      });
      if (error) throw error;
      toast.success("Premium day offer activated for 24 hours");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not activate offer");
    } finally {
      setGranting(false);
    }
  };

  const k = data?.kpis;
  const cards = [
    ["Total users", k?.users ?? 0, Users, "text-sky-500"],
    ["New in 30 days", k?.new_users_30d ?? 0, Activity, "text-violet-500"],
    ["Active subscribers", k?.paid_users ?? 0, WalletCards, "text-emerald-500"],
    ["Referrals", k?.referrals ?? 0, Gift, "text-amber-500"],
  ] as const;

  return (
    <main className="min-h-screen bg-[#f7f7f8] px-5 py-8 text-[#171719] dark:bg-[#121214] dark:text-white md:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
              <ShieldCheck className="h-4 w-4" /> Admin workspace
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Growth overview</h1>
            <p className="mt-2 text-sm text-foreground/55">
              Live account, subscription, referral and video activity.
            </p>
          </div>
          <button
            onClick={() => void refresh()}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-medium shadow-sm transition hover:bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </header>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([label, value, Icon, color]) => (
            <div
              key={label}
              className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,.04)] dark:border-white/10 dark:bg-white/[0.05]"
            >
              <Icon className={`mb-5 h-5 w-5 ${color}`} />
              <div className="text-3xl font-semibold tracking-tight">
                {loading ? "—" : value.toLocaleString()}
              </div>
              <div className="mt-1 text-sm text-foreground/50">{label}</div>
            </div>
          ))}
        </section>
        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-[0_8px_30px_rgba(0,0,0,.04)] dark:border-white/10 dark:bg-white/[0.05]">
            <div className="flex items-center justify-between border-b border-black/[0.07] px-5 py-4 dark:border-white/10">
              <div>
                <h2 className="font-semibold">Recent users</h2>
                <p className="mt-1 text-xs text-foreground/45">
                  The latest 100 accounts from the live database.
                </p>
              </div>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-foreground/40" />}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-black/[0.025] text-xs uppercase tracking-wide text-foreground/45 dark:bg-white/[0.03]">
                  <tr>
                    <th className="px-5 py-3 font-medium">User</th>
                    <th className="px-5 py-3 font-medium">Plan</th>
                    <th className="px-5 py-3 font-medium">Referrals</th>
                    <th className="px-5 py-3 font-medium">Joined</th>
                    <th className="px-5 py-3 font-medium">Offer</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.users ?? []).map((user) => (
                    <tr
                      key={user.id}
                      className="border-t border-black/[0.06] dark:border-white/[0.08]"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-medium">{user.email ?? "Unknown email"}</div>
                        <div className="mt-0.5 text-xs text-foreground/40">
                          {user.id.slice(0, 8)}…
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.subscribed ? "bg-emerald-500/10 text-emerald-600" : "bg-black/[0.05] text-foreground/55 dark:bg-white/[0.08]"}`}
                        >
                          {user.subscribed ? user.plan || "premium" : "free"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-foreground/65">{user.referrals}</td>
                      <td className="px-5 py-3.5 text-foreground/60">{fmtDate(user.created_at)}</td>
                      <td className="px-5 py-3.5 text-foreground/60">
                        {user.offer_expires_at ? `Until ${fmtDate(user.offer_expires_at)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && !data?.users?.length && (
                <div className="p-10 text-center text-sm text-foreground/45">No users found.</div>
              )}
            </div>
          </div>
          <aside className="space-y-6">
            <form
              onSubmit={grantOffer}
              className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,.04)] dark:border-white/10 dark:bg-white/[0.05]"
            >
              <div className="mb-4 flex items-center gap-2">
                <Gift className="h-5 w-5 text-amber-500" />
                <h2 className="font-semibold">Premium day offer</h2>
              </div>
              <p className="mb-4 text-sm leading-6 text-foreground/55">
                Grant 24 hours of Premium access and up to 3 videos. This is enforced server-side
                and can be reused for future influencers.
              </p>
              <label className="mb-2 block text-xs font-medium text-foreground/55">
                User email
              </label>
              <input
                value={offerEmail}
                onChange={(e) => setOfferEmail(e.target.value)}
                type="email"
                className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-primary dark:border-white/10"
              />
              <button
                disabled={granting}
                className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#171719] text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {granting && <Loader2 className="h-4 w-4 animate-spin" />} Activate for 1 day
              </button>
            </form>
            <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,.04)] dark:border-white/10 dark:bg-white/[0.05]">
              <div className="mb-4 flex items-center gap-2">
                <Video className="h-5 w-5 text-sky-500" />
                <h2 className="font-semibold">Usage pulse</h2>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-sm text-foreground/55">Video uses · 30 days</span>
                <strong className="text-2xl">{k?.video_uses_30d ?? 0}</strong>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <span className="text-sm text-foreground/55">Active offers</span>
                <strong className="text-2xl">{k?.active_offers ?? 0}</strong>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
