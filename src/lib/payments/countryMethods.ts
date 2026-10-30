/**
 * @doc Which hosted-checkout methods each visitor country sees in the payment box.
 *
 * Source: Dodo Payments "Supported Payment Methods" table. Only methods that Dodo
 * marks as working for subscriptions are listed, because every Megsy plan renews
 * automatically. Cards stay on the in-app card form; Vodafone Cash is Egypt-only
 * and handled elsewhere. Selecting one of these sends the customer to the hosted
 * checkout narrowed to that method (plus card fallback).
 */
import type { BrandSlug } from "./brandMarks";

export type LocalMethodId =
  | "apple_pay"
  | "google_pay"
  | "cashapp"
  | "klarna"
  | "upi"
  | "rupay"
  | "pix"
  | "kakao_pay"
  | "naver_pay"
  | "satispay";

export type LocalMethod = {
  id: LocalMethodId;
  label: string;
  /** Short helper line under the label. */
  hint: { en: string; ar: string };
  logo: { kind: "brand"; slug: BrandSlug } | { kind: "word"; text: string; color: string; bg?: string };
  /** Needs an Apple device / browser to appear at the hosted checkout. */
  appleOnly?: boolean;
};

const SATISPAY_COUNTRIES = new Set(["IT", "LU", "DE", "FR", "AT", "BE"]);

const M: Record<LocalMethodId, LocalMethod> = {
  apple_pay: { id: "apple_pay", label: "Apple Pay", hint: { en: "Pay with Face ID or Touch ID", ar: "ادفع بـ Face ID أو Touch ID" }, logo: { kind: "brand", slug: "applepay" }, appleOnly: true },
  google_pay: { id: "google_pay", label: "Google Pay", hint: { en: "Pay with your Google account", ar: "ادفع بحساب جوجل" }, logo: { kind: "brand", slug: "googlepay" } },
  cashapp: { id: "cashapp", label: "Cash App Pay", hint: { en: "Pay from your Cash App balance", ar: "ادفع من رصيد Cash App" }, logo: { kind: "brand", slug: "cashapp" } },
  klarna: { id: "klarna", label: "Klarna", hint: { en: "Pay with Klarna", ar: "ادفع عن طريق Klarna" }, logo: { kind: "brand", slug: "klarna" } },
  upi: { id: "upi", label: "UPI", hint: { en: "Google Pay, PhonePe, Paytm and any UPI app", ar: "أي تطبيق UPI مثل PhonePe و Paytm" }, logo: { kind: "word", text: "UPI", color: "#097939" } },
  rupay: { id: "rupay", label: "RuPay", hint: { en: "RuPay debit or credit card", ar: "بطاقة RuPay" }, logo: { kind: "word", text: "RuPay", color: "#0F4C81" } },
  pix: { id: "pix", label: "Pix", hint: { en: "Instant payment with your bank app", ar: "دفع فوري من تطبيق البنك" }, logo: { kind: "brand", slug: "pix" } },
  kakao_pay: { id: "kakao_pay", label: "Kakao Pay", hint: { en: "Pay with KakaoTalk", ar: "ادفع بـ KakaoTalk" }, logo: { kind: "brand", slug: "kakaotalk" } },
  naver_pay: { id: "naver_pay", label: "Naver Pay", hint: { en: "Pay with your Naver account", ar: "ادفع بحساب Naver" }, logo: { kind: "brand", slug: "naver" } },
  satispay: { id: "satispay", label: "Satispay", hint: { en: "Pay from the Satispay app", ar: "ادفع من تطبيق Satispay" }, logo: { kind: "word", text: "S", color: "#FFFFFF", bg: "#EF3E42" } },
};

/**
 * Ordered list of hosted-checkout methods for a visitor country (ISO alpha-2).
 * `amountUsd` matters for Klarna: Dodo shows it only for US checkouts above $50.
 */
export function localMethodsFor(country: string | null | undefined, amountUsd = 0): LocalMethod[] {
  const c = (country ?? "").toUpperCase();
  const out: LocalMethodId[] = [];
  if (c === "IN") out.push("upi", "rupay", "apple_pay");
  else if (c === "BR") out.push("pix", "apple_pay", "google_pay");
  else if (c === "KR") out.push("kakao_pay", "naver_pay", "apple_pay", "google_pay");
  else if (c === "US") {
    out.push("apple_pay", "google_pay", "cashapp");
    if (amountUsd > 50) out.push("klarna");
  } else {
    out.push("apple_pay", "google_pay");
    if (SATISPAY_COUNTRIES.has(c)) out.push("satispay");
  }
  return out.map((id) => M[id]);
}

export const LOCAL_METHOD_IDS = Object.keys(M) as LocalMethodId[];
