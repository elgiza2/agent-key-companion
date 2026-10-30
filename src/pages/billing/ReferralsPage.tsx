/** @doc Referral program — 20 credits per verified invite, 10 per task. */
import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { ChevronLeft, Share2 } from "lucide-react";
import { toast } from "sonner";
import { translateExactText, useUserLang } from "@/lib/authI18n";

import { supabase } from "@/integrations/supabase/client";
import { safeCopyText } from "@/lib/safeClipboard";
import {
  useReferralMilestone,
  type UseReferralMilestone,
} from "@/hooks/useReferralMilestone";



export const WHATSAPP_PHONE = "201098821812";
export const PROMOTER_MESSAGE =
  "Hello, I want to join the Megsy AI promotion / referral system. Please send me the details.";
export const MIN_PAYOUT = 10;

/* Neutral, quiet palette — no gradients, no neon. */
export const PAGE_BG = "hsl(var(--background))";
export const SURFACE = "hsl(var(--foreground) / 0.035)";
export const SURFACE_2 = "hsl(var(--foreground) / 0.06)";
export const BORDER = "hsl(var(--foreground) / 0.10)";
export const TEXT = "hsl(var(--foreground))";
export const MUTED = "hsl(var(--foreground) / 0.6)";
export const INK = "hsl(var(--background))";
export const YELLOW = "hsl(var(--foreground))";
export const PINK = "hsl(var(--foreground) / 0.6)";
export const MINT = "hsl(var(--foreground) / 0.6)";
export const LAVENDER = "hsl(var(--foreground) / 0.6)";
export const PEACH = "hsl(var(--foreground) / 0.6)";
export const BLUE = "hsl(var(--foreground) / 0.6)";
export const GOLD = "#C9A24C";
export const GOLD_SOFT = "#F6E7B7";

export interface Referral {
  id: string;
  status: string;
  created_at: string;
}
export interface Earning {
  id: string;
  amount: number;
  source_action: string;
  created_at: string;
}
export interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  method: string;
  created_at: string;
}
export interface RewardTask {
  id: string;
  task_key: string;
  title: string;
  description: string | null;
  reward_credits: number;
  action_type: string;
  action_url: string | null;
  target_count: number;
  icon: string | null;
}
export interface UserTask {
  task_id: string;
  progress: number;
  completed_at: string | null;
  awarded_credits: number;
}

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export const statusTone = (s: string) => {
  if (s === "approved" || s === "paid" || s === "active")
    return "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20";
  if (s === "rejected") return "bg-rose-500/10 text-rose-400 ring-rose-500/20";
  return "bg-amber-500/10 text-amber-400 ring-amber-500/20";
};

export const statusLabel = (s: string) =>
  (
    ({
      approved: "Approved",
      pending: "Pending",
      rejected: "Rejected",
      paid: "Paid",
      active: "Active",
    }) as Record<string, string>
  )[s] ?? s;

export const EmptyState = ({ title, hint }: { title: string; hint: string }) => (
  <div className="flex flex-col items-center justify-center py-14 text-center">
    <p className="text-[15px] font-medium text-foreground">{title}</p>
    <p className="mt-1 max-w-[280px] text-[13px] leading-relaxed text-foreground/55">{hint}</p>
  </div>
);

/* ── Shared primitives ─────────────────────────────────────────── */

export const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-2xl border border-foreground/10 bg-foreground/[0.03] ${className}`}
  >
    {children}
  </div>
);

export const PrimaryButton = ({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[14px] font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
  >
    {children}
  </button>
);

export const GhostButton = ({
  children,
  onClick,
  disabled,
  className = "",
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-foreground/15 bg-foreground/[0.04] px-5 text-[14px] font-medium text-foreground transition hover:bg-foreground/[0.08] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
  >
    {children}
  </button>
);

/* ── Context ───────────────────────────────────────────────────── */

export interface ReferralsContextValue {
  userId: string | null;
  code: string;
  link: string;
  refs: Referral[];
  earns: Earning[];
  wds: Withdrawal[];
  tasks: RewardTask[];
  userTasks: UserTask[];
  totalEarned: number;
  committed: number;
  available: number;
  signups: number;
  canWithdraw: boolean;
  justCopied: boolean;
  claimTask: (t: RewardTask) => void;
  copyLink: () => Promise<void>;
  shareLink: () => Promise<void>;
  openPromoter: () => void;
  openQr: () => void;
  reload: () => void;
  milestone: UseReferralMilestone;
}

const REFERRALS_FALLBACK: ReferralsContextValue = {
  userId: null,
  code: "",
  link: "",
  refs: [],
  earns: [],
  wds: [],
  tasks: [],
  userTasks: [],
  totalEarned: 0,
  committed: 0,
  available: 0,
  signups: 0,
  canWithdraw: false,
  justCopied: false,
  claimTask: () => {},
  copyLink: async () => {},
  shareLink: async () => {},
  openPromoter: () => {},
  openQr: () => {},
  reload: () => {},
  milestone: {
    state: null,
    loading: true,
    failed: false,
    claiming: false,
    isPartner: false,
    referrals: 0,
    target: 5,
    remaining: 5,
    tasks: [],
    tasksComplete: false,
    canClaim: false,
    completeTask: async () => false,
    claim: async () => ({ ok: false, granted: false }),
    reload: async () => {},
  },
};

const ReferralsCtx = createContext<ReferralsContextValue | null>(null);
export const useReferrals = () => useContext(ReferralsCtx) ?? REFERRALS_FALLBACK;

const ReferralsPage = () => {
  const navigate = useNavigate();
  const lang = useUserLang();
  const milestone = useReferralMilestone();
  const [userId, setUserId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [refs, setRefs] = useState<Referral[]>([]);
  const [earns, setEarns] = useState<Earning[]>([]);
  const [wds, setWds] = useState<Withdrawal[]>([]);
  const [tasks, setTasks] = useState<RewardTask[]>([]);
  const [userTasks, setUserTasks] = useState<UserTask[]>([]);
  const [justCopied, setJustCopied] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: codes } = await supabase
        .from("referral_codes")
        .select("code")
        .eq("user_id", user.id)
        .limit(1);
      let row = codes?.[0] as { code: string } | undefined;
      if (!row) {
        const newCode = `NOVA-${user.id.substring(0, 6).toUpperCase()}`;
        await supabase
          .from("referral_codes")
          .insert({ user_id: user.id, code: newCode, referral_mode: "cash" });
        row = { code: newCode };
      }
      setCode(row.code);

      const [r, e, w, tk, ut] = await Promise.all([
        supabase
          .from("referrals")
          .select("*")
          .eq("referrer_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("referral_earnings")
          .select("*")
          .eq("referrer_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("withdrawal_requests")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("reward_tasks").select("*").eq("active", true).order("sort_order"),
        supabase
          .from("user_reward_tasks")
          .select("task_id, progress, completed_at, awarded_credits")
          .eq("user_id", user.id),
      ]);
      setRefs(r.data ?? []);
      setEarns(e.data ?? []);
      setWds(w.data ?? []);
      setTasks((tk.data as RewardTask[]) ?? []);
      setUserTasks((ut.data as UserTask[]) ?? []);
    } catch {
      // A failed lookup must never blank the page — the invite UI still works.
    }
  }, []);


  useEffect(() => {
    loadData();
  }, [loadData]);

  const claimTask = async (task: RewardTask) => {
    if (!userId) return;
    const existing = userTasks.find((u) => u.task_id === task.id);
    if (existing?.completed_at) return;

    if (task.action_type === "invite_friends") {
      const progress = refs.length;
      if (progress < task.target_count) {
        toast.error(`Invite ${task.target_count - progress} more friends first`);
        return;
      }
    } else if (task.action_url) {
      window.open(task.action_url, "_blank", "noopener,noreferrer");
    }

    // Credit grants must be verified and awarded atomically by a privileged
    // backend flow; never trust a browser-written completion row or amount.
    toast.info("This reward is awaiting secure verification");
  };

  const link = code ? `${window.location.origin}/ref/${code}` : "";
  const totalEarned = earns.reduce((s, x) => s + Number(x.amount), 0);
  const committed = wds
    .filter((w) => w.status !== "rejected")
    .reduce((s, x) => s + Number(x.amount), 0);
  const available = totalEarned - committed;
  const signups = refs.length;
  const canWithdraw = available >= MIN_PAYOUT;

  const copyLink = async () => {
    if (!link) return;
    await safeCopyText(link);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 1600);
    toast.success(translateExactText("Invite link copied", lang));
  };

  const shareLink = async () => {
    if (!link) return;
    const shareText = `Join Megsy AI with my invite link:\n${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Megsy AI", text: shareText, url: link });
        return;
      } catch {
        /* fallthrough */
      }
    }
    await safeCopyText(shareText);
    toast.success(translateExactText("Invite message copied", lang));
  };

  const openPromoter = () => {
    const url = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(PROMOTER_MESSAGE)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const ctx: ReferralsContextValue = {
    userId,
    code,
    link,
    refs,
    earns,
    wds,
    tasks,
    userTasks,
    totalEarned,
    committed,
    available,
    signups,
    canWithdraw,
    justCopied,
    claimTask,
    copyLink,
    shareLink,
    openPromoter,
    openQr: () => {},
    reload: loadData,
    milestone,
  };

  const claimPro = async () => {
    if (!milestone.canClaim || milestone.claiming || milestone.isPartner) {
      if (milestone.remaining > 0)
        toast.error(translateExactText("Invite 5 friends first", lang));
      else if (!milestone.tasksComplete)
        toast.error(translateExactText("Finish all required steps first", lang));
      return;
    }
    try {
      const result = await milestone.claim();
      if (result.granted) toast.success(translateExactText("Pro activated", lang));
      else toast.error(translateExactText("We couldn't activate Pro yet", lang));
    } catch {
      toast.error(translateExactText("We couldn't activate Pro yet", lang));
    }
  };

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate("/chat"));

  return (
    <ReferralsCtx.Provider value={ctx}>
      <div className="gx-root" dir={lang === "ar-eg" ? "rtl" : "ltr"}>
        <div className="gx-screen">
          <header className="gx-top">
            <button type="button" onClick={back} aria-label="Back" className="gx-hbtn">
              <ChevronLeft className="gx-hicon rtl:rotate-180" strokeWidth={2} />
            </button>
            <div className="gx-top-trail">
              <button
                type="button"
                onClick={shareLink}
                disabled={!link}
                aria-label="Share invite link"
                className="gx-hbtn gx-hbtn-sm"
              >
                <Share2 className="gx-hicon" strokeWidth={2} />
              </button>
            </div>
          </header>

          <h1 className="gx-title">{translateExactText("Invite friends", lang)}</h1>
          <p className="gx-sub">
            {translateExactText(
              "Invite a friend and you both get credits — they are credited when they join, you are credited when they start using Megsy. Five verified invites unlock Pro.",
              lang,
            )}
          </p>

          <div className="gx-content">
            <Outlet />
            <button type="button" onClick={shareLink} disabled={!link} className="gx-pill gx-pill-wide">
              <Share2 size={17} />
              {translateExactText("Invite friends", lang)}
            </button>
          </div>
          <div className="gx-spacer" />
        </div>
      </div>
    </ReferralsCtx.Provider>
  );
};

export default ReferralsPage;
