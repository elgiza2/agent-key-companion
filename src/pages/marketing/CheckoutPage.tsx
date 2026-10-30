// @doc Dedicated checkout page — the payment flow lives on its own route, separate from /pricing.
import { Suspense, lazy, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/common/SEOHead";
import CustomCardForm from "@/components/billing/CustomCardForm";
import type { PlanTier } from "@/data/pricingData";
import { getZoneBrand } from "@/lib/zoneBrand";

type CheckoutState = { tier?: PlanTier; interval?: "monthly" | "yearly" };

const PricingPage = lazy(() => import("./PricingPage"));

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as CheckoutState;
  const params = new URLSearchParams(location.search);
  const tier = (state.tier ?? (params.get("tier") as PlanTier | null)) || "pro";
  const interval: "monthly" | "yearly" =
    state.interval ?? (params.get("interval") === "yearly" ? "yearly" : "monthly");
  const BRAND = getZoneBrand();

  // The payment page needs a signed-in session; guests go to sign-in first.
  // ?preview=1 skips the guard so the design can be reviewed without a session.
  const preview = params.get("preview") === "1";
  useEffect(() => {
    if (preview) return;
    let cancelled = false;
    (async () => {
      let {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        session = refreshed.session;
      }
      if (!session?.access_token && !cancelled) {
        await supabase.auth.signOut().catch(() => {});
        toast.error("Please sign in again to continue.");
        navigate("/auth?redirect=/checkout", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, preview]);

  return (
    <>
      {/* The pricing page stays visible behind the floating payment box. */}
      <div aria-hidden="true" inert className="pointer-events-none select-none">
        <Suspense fallback={null}>
          <PricingPage />
        </Suspense>
      </div>
      <SEOHead
        title={`Checkout — ${BRAND} AI`}
        description="Complete your subscription payment."
        path="/checkout"
      />
      <CustomCardForm open tier={tier} interval={interval} onClose={() => navigate("/pricing", { replace: true })} />
    </>
  );
};

export default CheckoutPage;
