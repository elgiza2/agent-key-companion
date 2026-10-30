/** @doc Payment status page — Apple-like clarity with Stripe-style status hierarchy. */
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  Home,
  Loader2,
  Send,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { m as motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import SecondMonthOfferCard from "@/components/billing/SecondMonthOfferCard";
import { clearAbandonedCheckout } from "@/lib/pricingOffers";
import { trackTikTokCompletePayment } from "@/lib/analytics/tiktokPixel";
import { markIntroTrialUsed } from "@/lib/introTrial";
import { useUserLang } from "@/lib/authI18n";

const BillingSuccessPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const lang = useUserLang();
  const ar = String(lang).startsWith("ar");
  const [status, setStatus] = useState<"loading" | "success" | "pending" | "failed">("loading");
  const [details, setDetails] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const t = (en: string, arText: string) => (ar ? arText : en);
  useEffect(() => {
    if (status === "success") {
      clearAbandonedCheckout();
      if (details?.is_trial) void markIntroTrialUsed();
    }
  }, [details, status]);
  useEffect(() => {
    if (status !== "success" || !details?.payment_id) return;
    trackTikTokCompletePayment({
      paymentId: details.payment_id,
      value: details.amount != null ? Number(details.amount) / 100 : undefined,
      currency: details.currency,
      productName: details.product_name,
    });
  }, [details, status]);
  useEffect(() => {
    const provider = params.get("provider");
    const kashierOrder = params.get("order");
    if (provider === "kashier" && kashierOrder) {
      const redirectParams: Record<string, string> = {};
      params.forEach((value, key) => {
        if (key !== "provider" && key !== "order") redirectParams[key] = value;
      });
      const paymentStatus = (redirectParams.paymentStatus || "").toUpperCase();
      if (redirectParams.signature)
        void supabase.functions
          .invoke("kashier-webhook", { body: { type: "redirect", params: redirectParams } })
          .catch(() => undefined);
      clearAbandonedCheckout();
      if (paymentStatus && paymentStatus !== "SUCCESS") setStatus("failed");
      else {
        setDetails({
          payment_id: kashierOrder,
          product_name: "Megsy subscription",
          currency: "EGP",
        });
        setStatus("success");
      }
      return;
    }
    setStatus("failed");
  }, [params]);
  const handleSuccessContinue = async () => {
    setCreating(true);
    const pendingWorkspaceName = sessionStorage.getItem("megsy_pending_workspace_name");
    const pendingWorkspacePlan = sessionStorage.getItem("megsy_pending_workspace_plan");
    if (pendingWorkspaceName && pendingWorkspacePlan) {
      const { data, error } = await supabase.rpc("create_workspace", {
        p_name: pendingWorkspaceName,
        p_plan: pendingWorkspacePlan,
      } as never);
      if (!error && data) {
        const wsId = (data as any).id;
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user)
            await supabase
              .from("profiles")
              .update({ active_workspace_id: wsId } as any)
              .eq("id", user.id);
        } catch {}
        try {
          sessionStorage.removeItem("megsy_pending_workspace_name");
          sessionStorage.removeItem("megsy_pending_workspace_plan");
        } catch {}
        navigate(`/settings/workspaces/${wsId}`);
        return;
      }
    }
    navigate("/");
  };
  const copy = useMemo(
    () => ({
      title:
        status === "loading"
          ? t("Confirming payment", "بنأكد الدفع")
          : status === "success"
            ? t("Payment successful", "تم الدفع بنجاح")
            : status === "pending"
              ? t("Payment processing", "الدفع قيد المعالجة")
              : t("Payment declined", "لم يتم الدفع"),
      subtitle:
        status === "loading"
          ? t("Hang tight, this only takes a moment.", "لحظات وهنأكد العملية.")
          : status === "success"
            ? t("Your subscription is ready to use.", "اشتراكك جاهز للاستخدام.")
            : status === "pending"
              ? t("Your bank is still confirming the transaction.", "البنك ما زال بيأكد العملية.")
              : t(
                  "The payment was not completed. No subscription was activated.",
                  "العملية لم تكتمل، ولم يتم تفعيل الاشتراك.",
                ),
    }),
    [status, ar],
  );
  const Icon =
    status === "success"
      ? CheckCircle2
      : status === "failed"
        ? XCircle
        : status === "pending"
          ? Clock3
          : Loader2;
  const iconTone =
    status === "success"
      ? "text-emerald-600 bg-emerald-50"
      : status === "failed"
        ? "text-red-600 bg-red-50"
        : status === "pending"
          ? "text-amber-600 bg-amber-50"
          : "text-[#635bff] bg-[#635bff]/10";
  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="min-h-dvh bg-[#f4f6f8] px-4 py-8 text-[#17191c] sm:px-6 sm:py-14"
    >
      <div className="mx-auto w-full max-w-[720px]">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#17191c] text-white">
              <span className="text-sm font-bold">m</span>
            </div>
            <span className="text-sm font-semibold">Megsy</span>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-black/45">
            <ShieldCheck className="h-4 w-4" /> {t("Secure checkout", "دفع آمن")}
          </span>
        </header>
        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden rounded-[30px] border border-black/[0.07] bg-white shadow-[0_24px_80px_rgba(15,23,42,.10)]"
        >
          <div className="p-6 text-center sm:p-10">
            <div
              className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${iconTone}`}
            >
              <Icon className={`h-9 w-9 ${status === "loading" ? "animate-spin" : ""}`} />
            </div>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
              {status === "success"
                ? t("Complete", "اكتملت العملية")
                : t("Payment status", "حالة الدفع")}
            </p>
            <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.045em] sm:text-[38px]">
              {copy.title}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-black/55">{copy.subtitle}</p>
          </div>
          {status !== "failed" && status !== "loading" && (
            <div className="mx-6 rounded-2xl border border-black/[0.07] bg-[#fafafa] p-4 sm:mx-10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black/60 shadow-sm">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {details?.product_name || t("Megsy subscription", "اشتراك Megsy")}
                  </p>
                  <p className="mt-1 text-xs text-black/45">
                    {t("Processed by Kashier", "تمت المعالجة عبر Kashier")}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                >
                  {status === "success" ? t("Paid", "مدفوع") : t("Pending", "قيد المراجعة")}
                </span>
              </div>
            </div>
          )}
          {status === "success" && (
            <div className="px-6 pt-5 sm:px-10">
              <SecondMonthOfferCard />
            </div>
          )}
          <div className="flex flex-col gap-2 p-6 sm:p-10 sm:pt-6">
            {status === "success" && (
              <>
                <button
                  onClick={handleSuccessContinue}
                  disabled={creating}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#17191c] px-4 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {creating
                    ? t("Setting up…", "بنجهز حسابك…")
                    : t("Continue to dashboard", "الانتقال للوحة التحكم")}
                </button>
                <button
                  onClick={() => navigate("/usage")}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 text-sm font-medium text-black/65 transition hover:bg-black/[0.03]"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t("View billing", "عرض الفوترة")}
                </button>
              </>
            )}
            {status === "pending" && (
              <>
                <button
                  onClick={() => window.location.reload()}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#17191c] px-4 text-sm font-semibold text-white"
                >
                  <RefreshCw className="h-4 w-4" />
                  {t("Refresh status", "تحديث الحالة")}
                </button>
                <button
                  onClick={() => navigate("/usage")}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 text-sm font-medium text-black/65"
                >
                  {t("View billing", "عرض الفوترة")}
                </button>
              </>
            )}
            {status === "failed" && (
              <>
                <button
                  onClick={() => navigate("/pricing")}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#17191c] px-4 text-sm font-semibold text-white"
                >
                  <CreditCard className="h-4 w-4" />
                  {t("Try another method", "جرّب وسيلة دفع أخرى")}
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 text-sm font-medium text-black/65"
                >
                  <Home className="h-4 w-4" />
                  {t("Go home", "العودة للرئيسية")}
                </button>
              </>
            )}
            {status === "loading" && (
              <div className="flex justify-center py-3">
                <Loader2 className="h-5 w-5 animate-spin text-[#635bff]" />
              </div>
            )}
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-black/40">
              <Send className="h-3.5 w-3.5" /> {t("Need help?", "محتاج مساعدة؟")}{" "}
              <a href="https://t.me/Torekr" className="font-medium text-black/65 underline">
                @Torekr on Telegram
              </a>
            </p>
          </div>
        </motion.main>
        <p className="mt-5 text-center text-[11px] text-black/35">
          {t(
            "Your card details are handled securely by Kashier and never stored by Megsy.",
            "بيانات بطاقتك تتم معالجتها بأمان عبر Kashier ولا يتم حفظها لدى Megsy.",
          )}
        </p>
      </div>
    </div>
  );
};
export default BillingSuccessPage;
