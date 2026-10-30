/**
 * @doc Google Play–style purchase sheet: brand header, product + price, the chosen
 * method row (light blue), one blue buy button. Tapping the method opens the
 * "Payment methods" page; "Add card" opens the add-card page. Card numbers are never
 * stored here — only the masked last digits the payment provider returns.
 * Provider names are never shown to customers.
 */
import { useEffect, useState } from "react";
import { m as motion } from "framer-motion";
import { ArrowLeft, Check, ChevronLeft, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "./CardPreview";
import { BRAND_MARKS, type BrandSlug } from "@/lib/payments/brandMarks";
import { getDisplayPrice, getPlan, type PlanTier } from "@/data/pricingData";
import { useUserLang } from "@/lib/authI18n";
import { megsyIcon } from "@/hooks/useBrandLogo";
import { useLocalPrices } from "@/lib/payments/localPrice";
import { localMethodsFor, type LocalMethod, type LocalMethodId } from "@/lib/payments/countryMethods";

export type GlobalMethodId = LocalMethodId;

export type SheetMethod =
  | { kind: "saved"; id: string; brand: "visa" | "mastercard" | "card"; last4: string }
  | { kind: "vodafone" }
  | { kind: "global"; id: GlobalMethodId }
  | { kind: "new_card" };

type Props = {
  tier: PlanTier;
  interval: "monthly" | "yearly";
  savedCards: Array<Extract<SheetMethod, { kind: "saved" }>>;
  showVodafone: boolean;
  showApplePay: boolean;
  /** Visitor country (ISO alpha-2); picks the local hosted-checkout methods. */
  country?: string | null;
  selected: SheetMethod;
  onSelect: (m: SheetMethod) => void;
  onBuy: () => void;
  onClose: () => void;
  busy?: boolean;
  note?: string | null;
  /** Card number / name / expiry / CVV fields for the add-card page. */
  cardFields?: React.ReactNode;
  /** Extra inputs under the method row (e.g. wallet number). */
  children?: React.ReactNode;
};

export function lastFour(masked: string | null | undefined): string | null {
  const digits = (masked ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

export function brandOf(masked: string | null | undefined): "visa" | "mastercard" | "card" {
  const d = (masked ?? "").replace(/\D/g, "");
  if (d.startsWith("4")) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "mastercard";
  return "card";
}

/** Wordmark logos are wide, so each brand gets a cropped viewBox to fill its chip. */
const CROP: Partial<Record<BrandSlug, string>> = { googlepay: "0 6.6 24 10.8", applepay: "0 4.2 24 15.6", paypal: "0 0 24 24", klarna: "0 0 24 24" };

function Simple({ slug, mono }: { slug: BrandSlug; mono?: boolean }) {
  const b = BRAND_MARKS[slug];
  return (
    <svg viewBox={CROP[slug] ?? "0 0 24 24"} className={`gp-logo gp-logo--${slug}`} role="img" aria-label={b.title}>
      <path d={b.path} fill={mono ? "currentColor" : `#${b.hex}`} />
    </svg>
  );
}

export function VodafoneMark() {
  return (
    <svg viewBox="0 0 24 24" className="gp-logo gp-logo--vodafone" role="img" aria-label="Vodafone Cash">
      <circle cx="12" cy="12" r="12" fill="#E60000" />
      <path fill="#fff" d="M12.7 5.3c2.2-.6 4.2.1 4.9.6-1.8.1-3.4 1.4-3.4 3.5 1.9.5 3.3 2 3.3 4.1 0 2.7-2.3 4.9-5.2 4.9-3.3 0-5.7-2.7-5.7-6 0-3.6 2.5-6.4 6.1-7.1z" />
    </svg>
  );
}

function LocalLogo({ m }: { m: LocalMethod }) {
  if (m.logo.kind === "brand") return <Simple slug={m.logo.slug} mono={m.logo.slug === "applepay" || m.logo.slug === "klarna"} />;
  return (
    <span className="gp-word" style={{ color: m.logo.color, background: m.logo.bg }}>{m.logo.text}</span>
  );
}

function MethodIcon({ m, locals }: { m: SheetMethod; locals: LocalMethod[] }) {
  let inner: React.ReactNode = <CreditCard className="h-4 w-4" strokeWidth={1.8} />;
  if (m.kind === "saved" && m.brand !== "card") inner = <BrandMark brand={m.brand} />;
  else if (m.kind === "vodafone") inner = <VodafoneMark />;
  else if (m.kind === "global") {
    const local = locals.find((l) => l.id === m.id);
    if (local) inner = <LocalLogo m={local} />;
  }
  return <span className="gp-ico" data-kind={m.kind === "global" ? m.id : m.kind}>{inner}</span>;
}

/** Row of accepted-method logos shown under the buy button. */
function AcceptedStrip({ vodafone, locals }: { vodafone: boolean; locals: LocalMethod[] }) {
  return (
    <div className="gp-accepted" dir="ltr" aria-label="Accepted payment methods">
      <span className="gp-chip"><BrandMark brand="visa" /></span>
      <span className="gp-chip"><BrandMark brand="mastercard" /></span>
      {vodafone && <span className="gp-chip"><VodafoneMark /></span>}
      {locals.map((l) => <span key={l.id} className="gp-chip"><LocalLogo m={l} /></span>)}
    </div>
  );
}

type View = "main" | "list" | "add";

export default function CheckoutSheet(props: Props) {
  const { tier, interval, savedCards, showVodafone, showApplePay, country, selected, onSelect, onBuy, onClose, busy, note, cardFields, children } =
    props;
  const ar = useUserLang().startsWith("ar");
  const t = (en: string, a: string) => (ar ? a : en);
  const [view, setView] = useState<View>("main");
  const plan = getPlan(tier);
  const price = plan ? getDisplayPrice(plan, interval === "yearly") : null;
  const locals = localMethodsFor(country, price?.price ?? 0).filter((l) => !l.appleOnly || showApplePay);
  const [local] = useLocalPrices([{ usd: price?.price ?? 0, slot: interval === "yearly" ? "yearly" : "monthly_intro" }], ar);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (view === "main" ? onClose() : setView("main"));
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, view]);

  const label = (m: SheetMethod) =>
    m.kind === "saved"
      ? `${m.brand === "visa" ? "Visa" : m.brand === "mastercard" ? "Mastercard" : t("Card", "بطاقة")} •••• ${m.last4}`
      : m.kind === "vodafone"
        ? "Vodafone Cash"
        : m.kind === "global"
          ? locals.find((l) => l.id === m.id)?.label ?? m.id
          : t("Add card", "إضافة بطاقة");

  const sub = (m: SheetMethod) =>
    m.kind === "vodafone"
      ? t("Approve the payment on your phone", "هتأكد الدفع من موبايلك")
      : m.kind === "global"
        ? (() => { const h = locals.find((l) => l.id === m.id)?.hint; return h ? t(h.en, h.ar) : null; })()
        : m.kind === "new_card"
          ? t("Visa or Mastercard", "فيزا أو ماستركارد")
          : null;

  const same = (a: SheetMethod, b: SheetMethod) =>
    a.kind === b.kind &&
    (a.kind !== "saved" || (b.kind === "saved" && a.id === b.id)) &&
    (a.kind !== "global" || (b.kind === "global" && a.id === b.id));

  const methods: SheetMethod[] = [
    ...savedCards,
    ...(showVodafone ? [{ kind: "vodafone" } as const] : []),
    ...locals.map((l) => ({ kind: "global", id: l.id }) as const),
  ];
  const key = (m: SheetMethod) => (m.kind === "saved" ? m.id : m.kind === "global" ? m.id : m.kind);
  const buyLabel = t("Subscribe", "اشترك");
  const full = view !== "main";

  return (
    <div dir={ar ? "rtl" : "ltr"} className="gp-overlay">
      <div className="gp-scrim" onClick={busy ? undefined : onClose} />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ type: "tween", duration: 0.28, ease: [0.2, 0, 0, 1] }}
        className="gp-sheet" data-full={full || undefined}>
        <div role="dialog" aria-modal="true" aria-label={t("Checkout", "الدفع")} className="contents">
        {view === "main" && (
          <>
            <div className="gp-product">
              <span className="gp-app-icon" aria-hidden="true"><img src={megsyIcon} alt="" width={40} height={40} /></span>
              <div className="gp-product-name">
                <h2>{plan?.name ?? "Megsy"}</h2>
                <p>{interval === "yearly" ? t("Yearly subscription", "اشتراك سنوي") : t("Monthly subscription", "اشتراك شهري")}</p>
              </div>
              {price && (
                <span className="gp-price" dir="ltr">
                  {local ? `${local.approx ? "≈ " : ""}${local.text}` : `$${price.price}`}
                </span>
              )}
            </div>
            <Button variant="ghost" className="gp-selected gp-selected--compact" onClick={() => setView("list")} disabled={busy}>
              <MethodIcon m={selected} locals={locals} />
              <span className="gp-label" dir="auto">
                {label(selected)}
                <small className="gp-renew">{selected.kind === "new_card" ? t("Tap to choose how to pay", "اختار طريقة الدفع") : interval === "yearly" ? t("Renews every year · cancel anytime", "يتجدد كل سنة · تقدر تلغي في أي وقت") : t("Renews every month · cancel anytime", "يتجدد كل شهر · تقدر تلغي في أي وقت")}</small>
              </span>
              <span className="gp-chev"><ChevronLeft className="h-4 w-4 ltr:rotate-180" /></span>
            </Button>
            <div className="gp-foot">
              {children}
              {note && <p role="status" className="gp-error">{note}</p>}
              <p className="gp-hint">
                {t(`Tap "${buyLabel}" to complete your purchase. `, `انقر على "${buyLabel}" لإكمال عملية الشراء. `)}
                <a href="/terms" target="_blank" rel="noreferrer">{t("More", "المزيد")}</a>
              </p>
              <Button variant="ghost" className="gp-buy" onClick={() => (selected.kind === "new_card" ? setView("add") : onBuy())} disabled={busy}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : buyLabel}
              </Button>
              <AcceptedStrip vodafone={showVodafone} locals={locals} />
            </div>
          </>
        )}

        {view === "list" && (
          <div className="gp-page">
            <div className="gp-page-head">
              <Button variant="ghost" className="gp-icon-btn" onClick={() => setView("main")} aria-label={t("Back", "رجوع")}>
                <ArrowLeft className="h-6 w-6 rtl:rotate-180" />
              </Button>
              <div>
                <h2>{t("Payment methods", "طرق الدفع")}</h2>
              </div>
            </div>
            <ul className="gp-list">
              {methods.map((m) => (
                <li key={key(m)}>
                  <Button variant="ghost" className="gp-row" onClick={() => { onSelect(m); setView("main"); }}>
                    <MethodIcon m={m} locals={locals} />
                    <span className="gp-label" dir="auto">{label(m)}{sub(m) && <small>{sub(m)}</small>}</span>
                    {same(m, selected) && <span className="gp-check"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>}
                  </Button>
                </li>
              ))}
            </ul>
            <div className="gp-divider" />
            <p className="gp-section">{t("Add a payment method to your account", "إضافة طريقة دفع إلى حسابك")}</p>
            <Button variant="ghost" className="gp-row" onClick={() => { onSelect({ kind: "new_card" }); setView("add"); }}>
              <span className="gp-plain-ico"><CreditCard className="h-6 w-6" strokeWidth={2} /></span>
              <span className="gp-label">{t("Add card", "إضافة بطاقة")}</span>
              <span className="gp-brands" dir="ltr"><span className="gp-chip"><BrandMark brand="mastercard" /></span><span className="gp-chip"><BrandMark brand="visa" /></span></span>
            </Button>
          </div>
        )}

        {view === "add" && (
          <div className="gp-page">
            <div className="gp-page-head">
              <Button variant="ghost" className="gp-icon-btn" onClick={() => setView("list")} disabled={busy} aria-label={t("Back", "رجوع")}>
                <ArrowLeft className="h-6 w-6 rtl:rotate-180" />
              </Button>
              <div>
                <h2>{t("Add card", "إضافة بطاقة")}</h2>
              </div>
            </div>
            <div className="gp-add-brands" dir="ltr"><span className="gp-chip"><BrandMark brand="visa" /></span><span className="gp-chip"><BrandMark brand="mastercard" /></span></div>
            <div className="gp-fields">{cardFields}</div>
            <div className="gp-foot gp-foot--page">
              {note && <p role="status" className="gp-error">{note}</p>}
              <p className="gp-hint">{t("Your card is saved securely with the payment provider. We only keep the last 4 digits.", "بطاقتك بتتحفظ بأمان عند مزود الدفع. إحنا بنحتفظ بآخر ٤ أرقام بس.")}</p>
              <Button variant="ghost" className="gp-buy" onClick={onBuy} disabled={busy}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : t("Save and subscribe", "حفظ واشتراك")}
              </Button>
            </div>
          </div>
        )}
        </div>
      </motion.div>
    </div>
  );
}
