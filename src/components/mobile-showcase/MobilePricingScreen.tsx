/** Immersive subscription screen. Prices and checkout stay in the shared catalogue and parent. */
import { useMemo } from "react";
import { useLocalPrices, type LocalPrice } from "@/lib/payments/localPrice";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useUserLang } from "@/lib/authI18n";
import { useUserPlan } from "@/hooks/useUserPlan";
import { getDisplayPrice, getPlan, type PlanTier } from "@/data/pricingData";
import artCoatUrl from "@/assets/pricing-seaside-editorial.jpg";
const artCoat = { url: artCoatUrl };
import MobileSidebarButton from "@/components/shared/MobileSidebarButton";

interface Props {
  isYearly: boolean;
  onToggleYearly: (yearly: boolean) => void;
  onSubscribe: (tier: PlanTier, opts?: { trial?: boolean }) => void;
  loadingTier?: PlanTier | null;
  onMenuClick?: () => void;
}

export default function MobilePricingScreen({ isYearly, onToggleYearly, onSubscribe, loadingTier, onMenuClick }: Props) {
  const isAr = useUserLang() === "ar-eg";
  const navigate = useNavigate();
  const artwork = useMemo(() => ({ ...artCoat, key: "coat" }), []);
  const { plan } = useUserPlan();
  const subscribed = plan === "pro" || plan === "max" || plan === "elite";
  const pro = getPlan("pro");
  const [localMonthly, localYearly, localThen, localYearMo] = useLocalPrices(
    [
      { usd: pro ? getDisplayPrice(pro, false).price : 0, slot: "monthly_intro" },
      { usd: pro ? getDisplayPrice(pro, true).price : 0, slot: "yearly" },
      { usd: pro?.monthlyPrice ?? 0, slot: "monthly" },
      { usd: pro ? getDisplayPrice(pro, true).price / 12 : 0 },
    ],
    isAr,
  );
  if (!pro) return null;
  const monthly = getDisplayPrice(pro, false);
  const yearly = getDisplayPrice(pro, true);
  const benefits = isAr
    ? ["١٬٠٠٠ رصيد Megsy كل شهر", "بحث على الويب، برمجة وتحليل ملفات", "صور وفيديو وأدوات تفاعلية داخل الشات"]
    : ["1,000 Megsy Credits every month", "Web research, coding & file analysis", "Images, video & interactive tools in chat"];
  const shown = (l: LocalPrice | null, usd: string) => (l ? `${l.approx ? "≈ " : ""}${l.text}` : usd);
  const options = [
    { yearly: false, label: isAr ? "شهري" : "Monthly", price: shown(localMonthly, `$${monthly.price.toFixed(2)}`), note: isAr ? "للشهر الأول" : "First month", detail: isAr ? `ثم ${shown(localThen, `$${pro.monthlyPrice}`)} / شهر` : `Then ${shown(localThen, `$${pro.monthlyPrice}`)} / month` },
    { yearly: true, label: isAr ? "سنوي" : "Yearly", price: shown(localYearly, `$${yearly.price.toFixed(2)}`), note: isAr ? "دفع سنوي" : "Billed yearly", detail: isAr ? `يعادل ${shown(localYearMo, `$${(yearly.price / 12).toFixed(2)}`)} / شهر` : `${shown(localYearMo, `$${(yearly.price / 12).toFixed(2)}`)} / month equivalent` },
  ];

  return (
    <section className="botanical-pricing" data-art={artwork.key} dir={isAr ? "rtl" : "ltr"} aria-label={isAr ? "اشتراك Megsy Pro" : "Megsy Pro subscription"}>
      <div className="botanical-art" aria-hidden="true">
        <img src={artwork.url} alt="" fetchPriority="high" width={1024} height={1536} />
      </div>
      <div className="botanical-scrim" aria-hidden="true" />
      <div className="botanical-content">
        <header className="botanical-nav">
          {onMenuClick && <MobileSidebarButton edge side={isAr ? "right" : "left"} className="botanical-menu" ariaLabel={isAr ? "فتح القائمة" : "Open menu"} onClick={onMenuClick} />}
        </header>
        <div className="botanical-heading">
          <h1 dir="ltr">megsy <span>pro</span></h1>
          <p>{isAr ? "من أول سؤال لحد إنجاز شغلك." : "From your first question to finished work."}<br />{isAr ? "ابحث، حلّل وابتكر مع وكيلك الذكي." : "Research, analyse & create with your AI agent."}</p>
        </div>
        <div className="botanical-details">
          <ul className="botanical-benefits">
            {benefits.map(text => <li key={text}><Check aria-hidden="true" /><span>{text}</span></li>)}
          </ul>
          <div className="botanical-options" role="group" aria-label={isAr ? "مدة الاشتراك" : "Billing interval"}>
            {options.map(option => {
              const selected = isYearly === option.yearly;
              return <Button key={String(option.yearly)} variant="ghost" className="botanical-option" data-selected={selected} aria-pressed={selected} onClick={() => onToggleYearly(option.yearly)}>
                <span className="botanical-option-label">{option.label}</span>
                <span className="botanical-price" dir="ltr">{option.price}</span>
                <span className="botanical-option-note">{option.note}</span>
                <span className="botanical-option-detail">{option.detail}</span>
              </Button>;
            })}
          </div>
          <Button variant="neutral" className="botanical-subscribe" disabled={loadingTier === "pro"} onClick={() => subscribed ? navigate("/usage") : onSubscribe("pro", { trial: false })}>
            {loadingTier === "pro" ? <Loader2 className="animate-spin" /> : <>{subscribed ? (isAr ? "إدارة الاشتراك" : "Manage subscription") : (isAr ? "اشترك الآن" : "Subscribe")}<ChevronRight className="rtl-flip" /></>}
          </Button>
        </div>
      </div>
    </section>
  );
}
