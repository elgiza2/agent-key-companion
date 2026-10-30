/**
 * @doc Single source of truth for every payment method Megsy can offer.
 *
 * Two rails:
 *  - `internal` → charged inside Megsy through Kashier (cards, Meeza, Apple Pay,
 *    Egyptian wallets). No redirect: the customer never leaves our checkout.
 *  - `redirect` → opens the secure Dodo Payments checkout, which carries the
 *    worldwide methods (Google Pay, Klarna, iDEAL, UPI, Pix, ...).
 *
 * UI must read this registry instead of hard-coding a method list, so adding a
 * method is a one-line change here.
 */
import type { BrandSlug } from "./brandMarks";

export type PaymentRail = "internal" | "redirect";
export type PaymentProvider = "kashier" | "dodo";
export type PaymentGroup = "cards" | "wallets" | "bnpl" | "bank" | "asia" | "crypto";

export type PaymentMark =
  | { kind: "brand"; slug: BrandSlug }
  | { kind: "word"; text: string; color?: string };

export interface PaymentMethod {
  id: string;
  /** English label — the product UI is English only. */
  label: string;
  provider: PaymentProvider;
  rail: PaymentRail;
  group: PaymentGroup;
  marks: PaymentMark[];
  /** Where customers commonly use it. */
  region: string;
  /** Works for recurring subscriptions at the provider. */
  recurring: boolean;
  /** Chargeable today (false = provider supports it, we have not switched it on). */
  live: boolean;
  /** Value passed to Dodo's `allowed_payment_method_types`. */
  dodoType?: string;
}

export const PAYMENT_GROUP_ORDER: PaymentGroup[] = [
  "cards",
  "wallets",
  "bnpl",
  "bank",
  "asia",
  "crypto",
];

export const PAYMENT_GROUP_LABELS: Record<PaymentGroup, string> = {
  cards: "Cards",
  wallets: "Wallets & instant pay",
  bnpl: "Buy now, pay later",
  bank: "Bank transfers & local methods",
  asia: "Asia-Pacific wallets",
  crypto: "Digital assets",
};

/* Egypt brand colours (used by the wordmark marks). */
const EGYPT_GREEN = "#00954C";
const EGYPT_BLUE = "#0F5CA8";
const VODAFONE_RED = "#E60000";
const VALU_PURPLE = "#5B2E91";
const SOUHOOLA_TEAL = "#00A9A5";
const BASATA_ORANGE = "#F58220";

export const PAYMENT_METHODS: PaymentMethod[] = [
  /* ── Cards ─────────────────────────────────────────────────────────── */
  {
    id: "card",
    label: "Credit & debit cards",
    provider: "kashier",
    rail: "internal",
    group: "cards",
    marks: [{ kind: "brand", slug: "visa" }, { kind: "brand", slug: "mastercard" }],
    region: "Worldwide",
    recurring: true,
    live: true,
  },
  {
    id: "meeza",
    label: "Meeza",
    provider: "kashier",
    rail: "internal",
    group: "cards",
    marks: [{ kind: "word", text: "Meeza", color: EGYPT_GREEN }],
    region: "Egypt",
    recurring: true,
    live: true,
  },
  {
    id: "unionpay",
    label: "UnionPay",
    provider: "dodo",
    rail: "redirect",
    group: "cards",
    marks: [{ kind: "word", text: "UnionPay", color: "#00447C" }],
    region: "China & Asia",
    recurring: true,
    live: false,
    dodoType: "credit",
  },

  /* ── Wallets & instant pay ─────────────────────────────────────────── */
  {
    id: "apple_pay",
    label: "Apple Pay",
    provider: "kashier",
    rail: "internal",
    group: "wallets",
    marks: [{ kind: "brand", slug: "applepay" }],
    region: "Worldwide",
    recurring: true,
    live: true,
  },
  {
    id: "google_pay",
    label: "Google Pay",
    provider: "dodo",
    rail: "redirect",
    group: "wallets",
    marks: [{ kind: "brand", slug: "googlepay" }],
    region: "Worldwide (Chrome & Android)",
    recurring: true,
    live: false,
    dodoType: "google_pay",
  },
  {
    id: "paypal",
    label: "PayPal",
    provider: "dodo",
    rail: "redirect",
    group: "wallets",
    marks: [{ kind: "brand", slug: "paypal" }],
    region: "Worldwide",
    recurring: true,
    live: false,
    dodoType: "paypal",
  },
  {
    id: "amazon_pay",
    label: "Amazon Pay",
    provider: "dodo",
    rail: "redirect",
    group: "wallets",
    marks: [{ kind: "word", text: "amazon pay", color: "#E88B00" }],
    region: "US & Europe",
    recurring: false,
    live: false,
    dodoType: "amazon_pay",
  },
  {
    id: "cashapp",
    label: "Cash App Pay",
    provider: "dodo",
    rail: "redirect",
    group: "wallets",
    marks: [{ kind: "brand", slug: "cashapp" }],
    region: "United States",
    recurring: true,
    live: false,
    dodoType: "cashapp",
  },
  {
    id: "revolut_pay",
    label: "Revolut Pay",
    provider: "dodo",
    rail: "redirect",
    group: "wallets",
    marks: [{ kind: "brand", slug: "revolut" }],
    region: "UK & Europe",
    recurring: false,
    live: false,
    dodoType: "revolut_pay",
  },
  {
    id: "vodafone_cash",
    label: "Mobile wallets",
    provider: "kashier",
    rail: "internal",
    group: "wallets",
    marks: [{ kind: "word", text: "Vodafone Cash", color: VODAFONE_RED }],
    region: "Egypt",
    recurring: false,
    live: true,
  },
  {
    id: "instapay",
    label: "InstaPay",
    provider: "kashier",
    rail: "internal",
    group: "wallets",
    marks: [{ kind: "word", text: "InstaPay", color: EGYPT_BLUE }],
    region: "Egypt",
    recurring: false,
    live: false,
  },

  /* ── Buy now, pay later ────────────────────────────────────────────── */
  {
    id: "klarna",
    label: "Klarna",
    provider: "dodo",
    rail: "redirect",
    group: "bnpl",
    marks: [{ kind: "brand", slug: "klarna" }],
    region: "Europe & US",
    recurring: true,
    live: false,
    dodoType: "klarna",
  },
  {
    id: "afterpay",
    label: "Afterpay",
    provider: "dodo",
    rail: "redirect",
    group: "bnpl",
    marks: [{ kind: "brand", slug: "afterpay" }],
    region: "US, UK & Australia",
    recurring: false,
    live: false,
    dodoType: "afterpay_clearpay",
  },
  {
    id: "billie",
    label: "Billie",
    provider: "dodo",
    rail: "redirect",
    group: "bnpl",
    marks: [{ kind: "word", text: "Billie", color: "#1F3A5F" }],
    region: "Europe (business)",
    recurring: false,
    live: false,
    dodoType: "billie",
  },
  {
    id: "valu",
    label: "valU",
    provider: "kashier",
    rail: "internal",
    group: "bnpl",
    marks: [{ kind: "word", text: "valU", color: VALU_PURPLE }],
    region: "Egypt",
    recurring: false,
    live: false,
  },
  {
    id: "souhoola",
    label: "Souhoola",
    provider: "kashier",
    rail: "internal",
    group: "bnpl",
    marks: [{ kind: "word", text: "Souhoola", color: SOUHOOLA_TEAL }],
    region: "Egypt",
    recurring: false,
    live: false,
  },

  /* ── Bank transfers & local methods ────────────────────────────────── */
  {
    id: "ideal",
    label: "iDEAL",
    provider: "dodo",
    rail: "redirect",
    group: "bank",
    marks: [{ kind: "word", text: "iDEAL", color: "#CC0066" }],
    region: "Netherlands",
    recurring: false,
    live: false,
    dodoType: "ideal",
  },
  {
    id: "bancontact",
    label: "Bancontact",
    provider: "dodo",
    rail: "redirect",
    group: "bank",
    marks: [{ kind: "word", text: "Bancontact", color: "#005498" }],
    region: "Belgium",
    recurring: false,
    live: false,
    dodoType: "bancontact_card",
  },
  {
    id: "blik",
    label: "BLIK",
    provider: "dodo",
    rail: "redirect",
    group: "bank",
    marks: [{ kind: "word", text: "BLIK" }],
    region: "Poland",
    recurring: false,
    live: false,
    dodoType: "blik",
  },
  {
    id: "satispay",
    label: "Satispay",
    provider: "dodo",
    rail: "redirect",
    group: "bank",
    marks: [{ kind: "word", text: "Satispay", color: "#EF3E42" }],
    region: "Italy",
    recurring: true,
    live: false,
    dodoType: "satispay",
  },
  {
    id: "eps",
    label: "EPS",
    provider: "dodo",
    rail: "redirect",
    group: "bank",
    marks: [{ kind: "word", text: "EPS", color: "#C8102E" }],
    region: "Austria",
    recurring: false,
    live: false,
    dodoType: "eps",
  },
  {
    id: "multibanco",
    label: "Multibanco",
    provider: "dodo",
    rail: "redirect",
    group: "bank",
    marks: [{ kind: "word", text: "Multibanco", color: "#00558C" }],
    region: "Portugal",
    recurring: false,
    live: false,
    dodoType: "multibanco",
  },
  {
    id: "sepa",
    label: "SEPA Direct Debit",
    provider: "dodo",
    rail: "redirect",
    group: "bank",
    marks: [{ kind: "brand", slug: "sepa" }],
    region: "Eurozone",
    recurring: false,
    live: false,
    dodoType: "sepa",
  },
  {
    id: "ach",
    label: "ACH Direct Debit",
    provider: "dodo",
    rail: "redirect",
    group: "bank",
    marks: [{ kind: "word", text: "ACH" }],
    region: "United States",
    recurring: false,
    live: false,
    dodoType: "ach",
  },
  {
    id: "upi",
    label: "UPI",
    provider: "dodo",
    rail: "redirect",
    group: "bank",
    marks: [{ kind: "word", text: "UPI", color: "#097939" }],
    region: "India",
    recurring: true,
    live: false,
    dodoType: "upi_collect",
  },
  {
    id: "rupay",
    label: "RuPay",
    provider: "dodo",
    rail: "redirect",
    group: "bank",
    marks: [{ kind: "word", text: "RuPay", color: "#0F7A3D" }],
    region: "India",
    recurring: false,
    live: false,
    dodoType: "credit",
  },
  {
    id: "pix",
    label: "Pix",
    provider: "dodo",
    rail: "redirect",
    group: "bank",
    marks: [{ kind: "brand", slug: "pix" }],
    region: "Brazil",
    recurring: true,
    live: false,
    dodoType: "pix",
  },
  {
    id: "basata",
    label: "Basata kiosk",
    provider: "kashier",
    rail: "internal",
    group: "bank",
    marks: [{ kind: "word", text: "Basata", color: BASATA_ORANGE }],
    region: "Egypt",
    recurring: false,
    live: false,
  },

  /* ── Asia-Pacific wallets ──────────────────────────────────────────── */
  {
    id: "wechat_pay",
    label: "WeChat Pay",
    provider: "dodo",
    rail: "redirect",
    group: "asia",
    marks: [{ kind: "brand", slug: "wechat" }],
    region: "China",
    recurring: false,
    live: false,
    dodoType: "we_chat_pay",
  },
  {
    id: "alipay_hk",
    label: "Alipay HK",
    provider: "dodo",
    rail: "redirect",
    group: "asia",
    marks: [{ kind: "brand", slug: "alipay" }],
    region: "Hong Kong",
    recurring: false,
    live: false,
    dodoType: "ali_pay_hk",
  },
  {
    id: "fps",
    label: "FPS",
    provider: "dodo",
    rail: "redirect",
    group: "asia",
    marks: [{ kind: "word", text: "FPS", color: "#B01B2E" }],
    region: "Hong Kong",
    recurring: false,
    live: false,
    dodoType: "fps",
  },
  {
    id: "gcash",
    label: "GCash",
    provider: "dodo",
    rail: "redirect",
    group: "asia",
    marks: [{ kind: "word", text: "GCash", color: "#0070E0" }],
    region: "Philippines",
    recurring: false,
    live: false,
    dodoType: "gcash",
  },
  {
    id: "touch_n_go",
    label: "Touch 'n Go",
    provider: "dodo",
    rail: "redirect",
    group: "asia",
    marks: [{ kind: "word", text: "Touch 'n Go", color: "#C89211" }],
    region: "Malaysia",
    recurring: false,
    live: false,
    dodoType: "touch_n_go",
  },
  {
    id: "kakao_pay",
    label: "Kakao Pay",
    provider: "dodo",
    rail: "redirect",
    group: "asia",
    marks: [{ kind: "brand", slug: "kakaotalk" }],
    region: "South Korea",
    recurring: true,
    live: false,
    dodoType: "kakao_pay",
  },
  {
    id: "naver_pay",
    label: "Naver Pay",
    provider: "dodo",
    rail: "redirect",
    group: "asia",
    marks: [{ kind: "brand", slug: "naver" }],
    region: "South Korea",
    recurring: true,
    live: false,
    dodoType: "naver_pay",
  },
  {
    id: "payco",
    label: "PAYCO",
    provider: "dodo",
    rail: "redirect",
    group: "asia",
    marks: [{ kind: "word", text: "PAYCO", color: "#FA2828" }],
    region: "South Korea",
    recurring: false,
    live: false,
    dodoType: "payco",
  },

  /* ── Digital assets ────────────────────────────────────────────────── */
  {
    id: "stablecoins",
    label: "Stablecoins",
    provider: "dodo",
    rail: "redirect",
    group: "crypto",
    marks: [{ kind: "brand", slug: "tether" }],
    region: "Worldwide (USDT / USDC)",
    recurring: false,
    live: false,
    dodoType: "crypto_currency",
  },
];

export const PAYMENT_METHODS_BY_GROUP: Array<{
  group: PaymentGroup;
  label: string;
  methods: PaymentMethod[];
}> = PAYMENT_GROUP_ORDER.map((group) => ({
  group,
  label: PAYMENT_GROUP_LABELS[group],
  methods: PAYMENT_METHODS.filter((method) => method.group === group),
})).filter((section) => section.methods.length > 0);

export const INTERNAL_PAYMENT_METHODS = PAYMENT_METHODS.filter((m) => m.rail === "internal");
export const REDIRECT_PAYMENT_METHODS = PAYMENT_METHODS.filter((m) => m.rail === "redirect");

/** Dodo method types for a checkout session — always keeps card fallbacks. */
export function dodoMethodTypesFor(methodId?: string): string[] {
  const chosen = methodId ? PAYMENT_METHODS.find((m) => m.id === methodId) : undefined;
  const types = new Set<string>(["credit", "debit"]);
  if (chosen?.dodoType) types.add(chosen.dodoType);
  return [...types];
}

export function paymentMethodById(id: string): PaymentMethod | undefined {
  return PAYMENT_METHODS.find((method) => method.id === id);
}

/** Total number of methods we advertise (used by the showcase headline). */
export const PAYMENT_METHOD_COUNT = PAYMENT_METHODS.length;
