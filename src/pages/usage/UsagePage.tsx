/**
 * @doc Billing — the single statement page. Glass sheet: back, big title, thin
 * icon rows (renewal, amount, auto-renew), past statements, and sheets that open
 * with the real statement data and the real auto-renew controls.
 */
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Wallet,
  RefreshCcw,
  FileText,
  ChevronRight,
  ChevronLeft,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { invokeFunction } from "@/lib/supabaseFunction";
import { fetchCreditOverview, type CreditOverview } from "@/lib/creditsSystem";
import { translateExactText, useUserLang, type AuthLang } from "@/lib/authI18n";

type Sub = {
  id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
  amount_cents: number | null;
  currency: string | null;
  created_at: string;
  auto_renew: boolean | null;
};

const locale = (lang: AuthLang) => (lang === "ar-eg" ? "ar-EG" : "en-US");

const fmtDate = (s: string | null | undefined, lang: AuthLang) =>
  s
    ? new Date(s).toLocaleDateString(locale(lang), {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";

const money = (cents: number | null, currency: string | null) =>
  cents ? `${(cents / 100).toFixed(0)} ${currency || "EGP"}` : "—";

/* ── One statement row: tinted icon tile, label over value, optional chevron ── */
const Row = ({
  icon: Icon,
  label,
  value,
  tone = "neutral",
  onClick,
  chevron = false,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  tone?: "neutral" | "violet" | "blue" | "green" | "yellow";
  onClick?: () => void;
  chevron?: boolean;
}) => {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`gx-row gx-tone-${tone} ${onClick ? "gx-row-tap" : ""}`}
    >
      <span className="gx-tile">
        <Icon strokeWidth={1.7} />
      </span>
      <span className="gx-row-body">
        <span className="gx-row-label">{label}</span>
        <span className="gx-row-hint">{value}</span>
      </span>
      {chevron && <ChevronRight className="gx-chev rtl:rotate-180" strokeWidth={1.9} />}
    </Tag>
  );
};

/* ── Label / value line inside a sheet ── */
const Fact = ({ label, value }: { label: string; value: string }) => (
  <div className="gx-fact">
    <span className="gx-fact-label">{label}</span>
    <span className="gx-fact-value">{value}</span>
  </div>
);

const UsagePage = () => {
  const navigate = useNavigate();
  const lang = useUserLang();
  const copy = (s: string) => translateExactText(s, lang);
  const ar = lang === "ar-eg";

  const [overview, setOverview] = useState<CreditOverview | null>(null);
  const [credits, setCredits] = useState(0);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [openBill, setOpenBill] = useState<Sub | "current" | null>(null);
  const [autoSheet, setAutoSheet] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!dead) {
          setSignedOut(true);
          setLoading(false);
        }
        return;
      }
      const [ov, profile, subRows] = await Promise.all([
        fetchCreditOverview().catch(() => null),
        supabase.from("profiles").select("credits").eq("id", user.id).single(),
        supabase
          .from("subscriptions")
          .select("id, plan, status, current_period_end, amount_cents, currency, created_at, auto_renew")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(12),
      ]);
      if (dead) return;
      if (ov) {
        setOverview(ov);
        setCredits(Number(ov.credits) || 0);
      } else if (profile.data) {
        setCredits(Number(profile.data.credits) || 0);
      }
      if (subRows.data) setSubs(subRows.data as Sub[]);
      setLoading(false);
    })();
    return () => {
      dead = true;
    };
  }, []);

  const sub = subs[0] ?? null;
  const isActive = sub?.status === "active" || sub?.status === "trialing";
  const autoRenew = Boolean(sub?.auto_renew) && isActive;
  const amountLabel = sub?.amount_cents
    ? money(sub.amount_cents, sub.currency)
    : `${credits.toLocaleString(locale(lang))} MC`;

  /** Time until the plan renews — there is no daily credit refresh any more. */
  const renewsIn = useMemo(() => {
    if (!overview?.nextRefresh) return "—";
    const mins = Math.max(
      0,
      Math.round((new Date(overview.nextRefresh).getTime() - Date.now()) / 60000),
    );
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
  }, [overview?.nextRefresh]);

  /** Real enable / disable of monthly auto-renew, stored on the subscription. */
  const setAuto = async (on: boolean) => {
    setAutoBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error(copy("Sign in again to continue."));
      const { error } = await invokeFunction("subscription-manage", {
        body: { action: on ? "auto-renew-on" : "auto-renew-off" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      setSubs((rows) =>
        rows.map((r, i) => (i === 0 ? { ...r, auto_renew: on } : r)),
      );
      setAutoSheet(false);
      toast.success(
        on
          ? copy("Auto-renew is on. Your plan renews every month.")
          : copy("Auto-renew is off. Your plan stays active until the period ends."),
      );
    } catch (e: any) {
      toast.error(e?.message || copy("Could not update auto-renew right now."));
    } finally {
      setAutoBusy(false);
    }
  };

  const billFacts = useMemo(() => {
    const bal = `${credits.toLocaleString(locale(lang))} MC`;
    if (openBill === "current" || !openBill) {
      return [
        { label: copy("Plan"), value: isActive && sub ? sub.plan : copy("Free") },
        { label: copy("Amount"), value: amountLabel },
        { label: copy("Credit balance"), value: bal },
        {
          label: copy("Used today"),
          value: overview ? `${Math.round(overview.spentToday)} MC` : "—",
        },
        {
          label: copy("Used this month"),
          value: overview ? `${Math.round(overview.spentThisMonth)} MC` : "—",
        },
        { label: copy("Plan renews in"), value: renewsIn },
      ];
    }
    return [
      { label: copy("Plan"), value: openBill.plan },
      {
        label: copy("Status"),
        value:
          openBill.status === "active" || openBill.status === "trialing"
            ? copy("Active")
            : openBill.status === "cancelled"
              ? copy("Cancelled")
              : openBill.status || "—",
      },
      { label: copy("Amount"), value: money(openBill.amount_cents, openBill.currency) },
      { label: copy("Statement date"), value: fmtDate(openBill.created_at, lang) },
      {
        label: copy("Billing period ends"),
        value: fmtDate(openBill.current_period_end, lang),
      },
      { label: copy("Credit balance"), value: bal },
    ];
  }, [openBill, credits, lang, isActive, sub, amountLabel, overview, renewsIn, copy]);

  const renewFacts = [
    { label: copy("Plan"), value: isActive && sub ? sub.plan : copy("Free") },
    { label: copy("Amount"), value: amountLabel },
    { label: copy("Every"), value: copy("Month") },
    {
      label: autoRenew ? copy("Next charge") : copy("Access ends"),
      value: fmtDate(sub?.current_period_end, lang),
    },
  ];

  return (
    <div className="gx-root" dir={ar ? "rtl" : "ltr"}>
      <div className="gx-screen">
        <header className="gx-top">
          <button
            type="button"
            aria-label={copy("Back")}
            onClick={() => navigate("/settings")}
            className="gx-hbtn"
          >
            <ChevronLeft className="gx-hicon rtl:rotate-180" strokeWidth={2} />
          </button>
        </header>

        <h1 className="gx-title">{copy("Billing")}</h1>

        {loading ? (
          <div className="gx-card gx-loading">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{copy("Loading…")}</span>
          </div>
        ) : signedOut ? (
          <div className="gx-card gx-empty">
            <p>{copy("Sign in to see your credits")}</p>
            <button
              type="button"
              className="gx-pill"
              onClick={() => navigate("/auth?redirect=/usage")}
            >
              {copy("Sign in")}
            </button>
          </div>
        ) : (
          <>
            <section className="gx-card">
              <Row
                icon={CalendarDays}
                tone="blue"
                label={copy("Next renewal")}
                value={
                  isActive && sub?.current_period_end
                    ? fmtDate(sub.current_period_end, lang)
                    : copy("No active subscription")
                }
              />
              <Row
                icon={Wallet}
                tone="violet"
                label={copy("Amount")}
                value={amountLabel}
                onClick={() => setOpenBill(sub ?? "current")}
                chevron
              />
              <Row
                icon={RefreshCcw}
                tone={autoRenew ? "green" : "neutral"}
                label={copy("Auto-renew")}
                value={
                  isActive
                    ? autoRenew
                      ? copy("On · renews monthly")
                      : copy("Off · ends this period")
                    : copy("No active subscription")
                }
                onClick={() => setAutoSheet(true)}
                chevron
              />
            </section>

            <h2 className="gx-section-title mt-7">{copy("Past statements")}</h2>
            <section className="gx-card">
              {subs.length ? (
                subs.map((s) => (
                  <Row
                    key={s.id}
                    icon={FileText}
                    label={fmtDate(s.created_at, lang)}
                    value={s.amount_cents ? money(s.amount_cents, s.currency) : copy("Free")}
                    onClick={() => setOpenBill(s)}
                    chevron
                  />
                ))
              ) : (
                <p className="px-4 py-5 text-[14px] text-[color:var(--settings-muted)]">
                  {copy("No statements yet")}
                </p>
              )}
            </section>

            <div className="mt-auto pt-8 pb-7">
              <button
                type="button"
                className="gx-pill gx-pill-wide"
                onClick={() => setOpenBill(sub ?? "current")}
              >
                {copy("View bill")}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Bill sheet ── */}
      {openBill && (
        <div className="gx-scrim" onClick={() => setOpenBill(null)}>
          <div className="gx-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="gx-sheet-bar" />
            <div className="gx-sheet-head">
              <h3 className="gx-sheet-title">
                {openBill === "current" || !openBill
                  ? copy("Current bill")
                  : fmtDate(openBill.created_at, lang)}
              </h3>
              <button
                type="button"
                aria-label={copy("Close")}
                onClick={() => setOpenBill(null)}
                className="gx-hbtn gx-hbtn-sm"
              >
                <X className="gx-hicon" strokeWidth={2} />
              </button>
            </div>

            <div className="gx-sheet-body">
              {billFacts.map((f) => (
                <Fact key={f.label} label={f.label} value={f.value} />
              ))}
            </div>

            <button
              type="button"
              className="gx-pill gx-pill-wide"
              onClick={() => navigate("/pricing")}
            >
              {copy("Buy credits")}
            </button>
          </div>
        </div>
      )}

      {/* ── Auto-renew sheet: real on / off ── */}
      {autoSheet && (
        <div className="gx-scrim" onClick={() => setAutoSheet(false)}>
          <div className="gx-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="gx-sheet-bar" />
            <div className="gx-sheet-head">
              <h3 className="gx-sheet-title">{copy("Auto-renew")}</h3>
              <button
                type="button"
                aria-label={copy("Close")}
                onClick={() => setAutoSheet(false)}
                className="gx-hbtn gx-hbtn-sm"
              >
                <X className="gx-hicon" strokeWidth={2} />
              </button>
            </div>

            <div className="gx-sheet-body">
              {renewFacts.map((f) => (
                <Fact key={f.label} label={f.label} value={f.value} />
              ))}
              <p className="mt-2 px-1 text-[13px] leading-relaxed text-[color:var(--settings-muted)]">
                {!isActive
                  ? copy("You don't have an active subscription yet. Pick a plan to start one.")
                  : autoRenew
                    ? copy(
                        "We charge your saved payment method every month and top up your credits automatically.",
                      )
                    : copy(
                        "Auto-renew is off, so nothing will be charged. Your plan stays active until the end of the period you already paid for.",
                      )}
              </p>
            </div>

            {!isActive ? (
              <button
                type="button"
                className="gx-pill gx-pill-wide"
                onClick={() => {
                  setAutoSheet(false);
                  navigate("/pricing");
                }}
              >
                {copy("See plans")}
              </button>
            ) : autoRenew ? (
              <button
                type="button"
                disabled={autoBusy}
                className="gx-pill gx-pill-wide gx-pill-danger"
                onClick={() => void setAuto(false)}
              >
                {autoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : copy("Turn off auto-renew")}
              </button>
            ) : (
              <button
                type="button"
                disabled={autoBusy}
                className="gx-pill gx-pill-wide"
                onClick={() => void setAuto(true)}
              >
                {autoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : copy("Turn on auto-renew")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UsagePage;
