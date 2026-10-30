/** Desktop-only pricing layout — liquid glass, same language as checkout. Mobile uses MobilePricingScreen. */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, Plus, Minus, ArrowRight, ArrowLeft } from "lucide-react";
import { getDisplayPrice, type PlanCardConfig, type PlanTier } from "@/data/pricingData";
import { translateExactText, useUserLang } from "@/lib/authI18n";
import CreditPacks from "@/components/billing/CreditPacks";
import PaymentMethodsShowcase from "@/components/billing/PaymentMethodsShowcase";
import MobilePricingScreen from "@/components/mobile-showcase/MobilePricingScreen";

type Props = {
  plans: PlanCardConfig[];
  faqs: { q: string; a: string }[];
  isYearly: boolean;
  setIsYearly: (v: boolean) => void;
  loadingTier: PlanTier | null;
  currentPlan: string | null;
  onSubscribe: (tier: PlanTier) => void;
};

const ORDER: PlanTier[] = ["starter", "pro", "elite", "business"];

export default function DesktopPricing({ plans, faqs, isYearly, setIsYearly, loadingTier, currentPlan, onSubscribe }: Props) {
  const lang = useUserLang();
  const t = (s: string) => translateExactText(s, lang);
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const curIdx = ORDER.indexOf(((currentPlan ?? "starter").toLowerCase() as PlanTier));
  const shown = plans.filter((p) => p.tier === "pro");

  return (
    <div className="botanical-desktop w-full">
      <MobilePricingScreen
        isYearly={isYearly}
        onToggleYearly={setIsYearly}
        loadingTier={loadingTier}
        onSubscribe={onSubscribe}
      />
      <div className="mx-auto w-full max-w-[1080px] px-8 pb-20">
      <div className="mt-16 border-b border-foreground/10">
        <CreditPacks isPro={!!currentPlan && currentPlan !== "free"} />
      </div>

      {/* Talk-to-us line */}
      <div className="flex items-center justify-between border-b border-foreground/10 py-8 text-[14px]">
        <span className="text-foreground/65">{t("Not sure yet? Top up with a credit pack whenever you like.")}</span>
        <a href="https://t.me/Torekr" className="font-semibold underline underline-offset-4">
          {t("Talk to us")}
        </a>
      </div>

      {/* Payment methods */}
      <section id="pricing-payments" className="grid gap-10 pt-20 md:grid-cols-[280px_1fr]">
        <div>
          <h2 className="text-[32px] leading-tight font-semibold tracking-[-0.03em]">
            {t("Payment methods")}
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-foreground/60">
            {t(
              "Pay with whatever you already use — cards, wallets, bank transfers and local methods from around the world.",
            )}
          </p>
        </div>
        <PaymentMethodsShowcase />
      </section>

      {/* FAQ */}
      <section id="pricing-faq" className="grid grid-cols-[280px_1fr] gap-16 pt-20">
        <h2 className="text-[32px] leading-tight font-semibold tracking-[-0.03em]">{t("Questions")}</h2>
        <div className="border-t border-foreground/10">
          {faqs.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={f.q} className="border-b border-foreground/10">
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="flex w-full items-center justify-between gap-6 py-5 text-start text-[15px] font-medium"
                >
                  {f.q}
                  {open ? <Minus className="h-4 w-4 shrink-0" /> : <Plus className="h-4 w-4 shrink-0" />}
                </button>
                {open && <p className="pb-6 pe-10 text-[14px] leading-relaxed text-foreground/65">{f.a}</p>}
              </div>
            );
          })}
        </div>
      </section>
      </div>
    </div>
  );
}
