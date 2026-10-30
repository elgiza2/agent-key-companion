/** @doc Plans, yearly toggle, MC top-up packs and the official pricing FAQ — cinematic redesign. */
import { Suspense, lazy, useState, useEffect, useRef } from "react";
import {
  m as motion,
  AnimatePresence,
  useInView,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import { Check, Loader2, ChevronDown, Menu, X, Plus, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WORKSPACE_PRODUCT_MAP, WORKSPACE_PLANS } from "@/lib/workspacePlans";
import SEOHead from "@/components/common/SEOHead";
import { Helmet } from "react-helmet-async";
import MegsyStar from "@/components/branding/MegsyStar";
import { usePromoCountdown } from "@/hooks/usePromoCountdown";
import { usePrefetchOnIdle } from "@/hooks/usePrefetchOnIdle";
import { useIsMobile } from "@/hooks/use-mobile";
import MobilePricingScreen from "@/components/mobile-showcase/MobilePricingScreen";
import AppSidebar from "@/components/layout/AppSidebar";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import PlanCard from "@/pages/billing/referrals/PlanCard";
import DesktopPricing from "./DesktopPricing";

import {
  PLANS as RAW_PLANS,
  FAQS as RAW_FAQS,
  PLAN_HIGHLIGHTS,
  YEARLY_FREE_MONTHS,
  getDisplayPrice,
  getPlan,
  type PlanTier,
} from "@/data/pricingData";
import { INTRO_PRICE } from "@/lib/pricingOffers";

import { brandText, getZoneBrand } from "@/lib/zoneBrand";
import { translateExactText, useUserLang } from "@/lib/authI18n";

const LandingFooter = lazy(() => import("@/components/landing/LandingFooter"));

const PRODUCT_MAP: Record<PlanTier, { monthly: string; yearly: string }> = WORKSPACE_PRODUCT_MAP;
const pad2 = (n: number) => String(n).padStart(2, "0");

const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260619_191346_9d19d66e-86a4-47f7-8dc6-712c1788c3b2.mp4";

const NAV_LINKS = [
  { label: "Plans", href: "#plans-grid" },
  { label: "FAQ", href: "#pricing-faq" },
  { label: "Support", href: "https://t.me/Torekr" },
];

/* ----------------------------- StaggeredFade ----------------------------- */
function StaggeredFade({
  text,
  className,
  startDelay = 0,
}: {
  text: string;
  className?: string;
  startDelay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const lang = useUserLang();
  const translated = translateExactText(text, lang);
  // Scripts whose glyphs must join / shape (Arabic, Hebrew, Persian, Urdu,
  // Indic, CJK). Splitting them into per-character inline-blocks breaks the
  // shaping and lets line-wrap happen INSIDE a word — which is what caused
  // the mangled "الإبداعية" on the pricing hero. For those scripts we fade
  // the whole string as a single unit and stagger by word instead.
  const isComplexScript =
    /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF]/.test(
      translated,
    );
  const isRTL = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF]/.test(
    translated,
  );

  if (isComplexScript) {
    // Split by whitespace so words stay intact; each word is one inline-block.
    const words = translated.split(/(\s+)/);
    return (
      <span
        ref={ref}
        className={className}
        aria-label={translated}
        data-no-translate="true"
        dir={"ltr"}
      >
        {words.map((w, i) => {
          if (/^\s+$/.test(w)) return <span key={i}>{w}</span>;
          return (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 14 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: startDelay + i * 0.12, ease: "easeOut" }}
              style={{ display: "inline-block", whiteSpace: "normal" }}
            >
              {w}
            </motion.span>
          );
        })}
      </span>
    );
  }

  const chars = Array.from(translated);
  return (
    <span ref={ref} className={className} aria-label={translated} data-no-translate="true">
      {chars.map((c, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: startDelay + i * 0.07, ease: "easeOut" }}
          style={{ display: "inline-block", whiteSpace: c === " " ? "pre" : "normal" }}
        >
          {c}
        </motion.span>
      ))}
    </span>
  );
}

/* ------------------------------- CountUp -------------------------------- */
function CountUp({
  value,
  duration = 0.8,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const mv = useMotionValue(value);
  const [display, setDisplay] = useState<string>(() => Math.round(value).toLocaleString("en-US"));
  const prev = useRef(value);
  const mounted = useRef(false);

  useEffect(() => {
    const unsub = mv.on("change", (v) => {
      setDisplay(Math.round(v).toLocaleString("en-US"));
    });
    return unsub;
  }, [mv]);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      mv.set(value);
      prev.current = value;
      return;
    }
    const controls = animate(mv, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      from: prev.current,
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, duration, mv]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}

/* ============================== Pricing Page ============================== */
const PricingPage = () => {
  const navigate = useNavigate();
  // Warm the auth chunk while the user is comparing plans.
  usePrefetchOnIdle(["/auth", "/chat"], 1500);
  const [isYearly, setIsYearly] = useState(false);
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [settled, setSettled] = useState(false);

  const BRAND = getZoneBrand();
  const promo = usePromoCountdown();
  const lang = useUserLang();
  const isAr = typeof lang === "string" && lang.toLowerCase().startsWith("ar");
  const [sidebarCollapsed] = useSidebarCollapsed();
  const PLANS = brandText(RAW_PLANS);
  const FAQS = brandText(RAW_FAQS);

  const pricingLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Megsy AI",
    description:
      "AI agent workspace for chat, deep research, image and video generation, presentations, documents and app building.",
    brand: { "@type": "Brand", name: "Megsy AI" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: Math.min(...PLANS.map((p) => p.monthlyPrice)).toString(),
      highPrice: Math.max(...PLANS.map((p) => p.monthlyPrice)).toString(),
      offerCount: PLANS.length,
      offers: PLANS.map((p) => ({
        "@type": "Offer",
        name: p.name,
        priceCurrency: "USD",
        price: p.monthlyPrice.toString(),
        url: "/pricing",
        category: "SubscriptionMonthly",
      })),
    },
  };

  useEffect(() => {
    const id = window.setTimeout(() => setSettled(true), 250);
    return () => window.clearTimeout(id);
  }, []);

  // Load Garamond + Geist webfonts once
  useEffect(() => {
    const links: HTMLLinkElement[] = [];
    const add = (href: string, rel = "stylesheet") => {
      const l = document.createElement("link");
      l.rel = rel;
      l.href = href;
      l.crossOrigin = "anonymous";
      document.head.appendChild(l);
      links.push(l);
    };
    add("https://fonts.googleapis.com", "preconnect");
    add("https://fonts.gstatic.com", "preconnect");
    add("https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500&display=swap");
    // Served by Google Fonts: the previous onlinewebfonts file failed OTS parsing.
    add("https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&display=swap");
    return () => {
      links.forEach((l) => l.parentNode && l.parentNode.removeChild(l));
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: ws } = await supabase
        .from("workspaces")
        .select("plan")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setCurrentPlan((ws as any)?.plan ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubscribe = async (
    tier: PlanTier,
    opts: { trial?: boolean; interval?: "monthly" | "yearly" } = {},
  ) => {
    if (loadingTier) return;
    const interval: "monthly" | "yearly" = opts.interval ?? (isYearly ? "yearly" : "monthly");

    // Ensure signed in before the checkout page opens.
    let {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      session = refreshed.session;
    }
    if (!session?.access_token) {
      await supabase.auth.signOut().catch(() => {});
      toast.error("Please sign in again to continue.");
      navigate("/auth?redirect=/pricing");
      return;
    }

    navigate("/checkout", { state: { tier, interval } });
  };

  const scrollTo = (id: string) => {
    if (id.startsWith("#")) {
      document.querySelector(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.href = id;
    }
    setMobileOpen(false);
  };

  const isMobile = useIsMobile();
  const proPlan = PLANS.find((p) => p.tier === "pro");

  // ─── Mobile-only pricing showcase ──
  if (proPlan && isMobile) {
    return (
      <>
        <SEOHead
          title={`Pricing — ${BRAND} AI Plans & Credits`}
          description={`Choose a ${BRAND} AI plan for chat, deep research, image and video generation, presentations, documents and app building.`}
          path="/pricing"
        />
        <Helmet>
          <script type="application/ld+json">{JSON.stringify(pricingLd)}</script>
        </Helmet>
        {/* Same overlay sidebar the chat page uses on mobile. */}
        <div>
          <AppSidebar
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            onNewChat={() => navigate("/")}
            currentMode="chat"
          />
        </div>
        <div className={isMobile ? "" : "min-h-[100dvh] bg-background"}>
          <div className={isMobile ? "" : "mx-auto w-full max-w-[480px] [transform:translateZ(0)]"}>
            <MobilePricingScreen
              isYearly={isYearly}
              onToggleYearly={setIsYearly}
              loadingTier={loadingTier}
              onSubscribe={(tier, opts) =>
                handleSubscribe(tier, {
                  interval: isYearly ? "yearly" : "monthly",
                  trial: opts?.trial === true,
                })
              }
              onMenuClick={() => setMobileOpen(true)}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title={`Pricing — ${BRAND} AI Plans & Credits`}
        description={`Compare ${BRAND} AI plans for AI chat, research, image and video generation, presentations, documents and full-stack app building.`}
        path="/pricing"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(pricingLd)}</script>
      </Helmet>
      {/* Pricing page adapts to the app theme: dark surface in dark mode,
          matches the chat light surface in light mode. */}
      <div
        data-pricing-scope
        className="flex min-h-[100dvh] w-full overflow-x-hidden rtl:flex-row-reverse bg-background light-scope:bg-[hsl(var(--background))]"
      >
        {/* Desktop app sidebar — persistent on the left */}
        <aside
          data-chat-sidebar="true"
          style={{ width: 320, minWidth: 320, flexBasis: 320 }}
          className="hidden md:flex shrink-0 overflow-hidden border-e border-foreground/10 transition-[width] duration-200 ease-out"
        >
          <AppSidebar
            inline
            open
            forceExpanded
            onClose={() => {}}
            onNewChat={() => navigate("/")}
            onSelectConversation={() => {}}
            currentMode="chat"
          />
        </aside>

        <main className="flex-1 flex flex-col overflow-visible min-w-0">
          <div
            className="flex-1 overflow-visible custom-pricing-scrollbar"
            style={{ scrollBehavior: "smooth" }}
          >
            <div className="min-h-dvh w-full bg-background text-foreground">
              <DesktopPricing
                plans={PLANS}
                faqs={FAQS}
                isYearly={isYearly}
                setIsYearly={setIsYearly}
                loadingTier={loadingTier}
                currentPlan={currentPlan}
                onSubscribe={(tier) =>
                  handleSubscribe(tier, { interval: isYearly ? "yearly" : "monthly", trial: false })
                }
              />
              {settled && (
                <Suspense fallback={null}>
                  <LandingFooter />
                </Suspense>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default PricingPage;
