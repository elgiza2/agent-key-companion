/**
 * @doc Plan prices in the visitor's local currency.
 *
 * Egypt shows the exact Egyptian-pound amount local payments charge (billing_catalog).
 * Every other country shows the dollar price converted at the live rate, marked "≈",
 * because the hosted checkout converts it again at payment time.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { currencyForCountry } from "./dodoMethodRules";

export type PriceSlot = "monthly_intro" | "monthly" | "yearly";

export type LocalPrice = {
  /** Formatted local amount, e.g. "₹620" or "349 ج.م". */
  text: string;
  /** True when converted from dollars (not the exact charged amount). */
  approx: boolean;
  currency: string;
};

let countryP: Promise<string | null> | null = null;
let ratesP: Promise<Record<string, number> | null> | null = null;
let egpP: Promise<Record<string, number> | null> | null = null;

export function visitorCountry(): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const forced = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("pay_country") : null;
  if (forced && /^[A-Za-z]{2}$/.test(forced)) return Promise.resolve(forced.toUpperCase());
  countryP ??= fetch("/api/public/geo")
    .then((r) => r.json())
    .then((j: { country?: string | null }) => j.country ?? null)
    .catch(() => null);
  return countryP;
}

function usdRates() {
  ratesP ??= fetch("/api/public/fx")
    .then((r) => r.json())
    .then((j: { rates?: Record<string, number> | null }) => j.rates ?? null)
    .catch(() => null);
  return ratesP;
}

function egpCatalog() {
  egpP ??= Promise.resolve(
    supabase.from("billing_catalog").select("tier, interval, egp_price").eq("tier", "pro").eq("active", true),
  )
    .then(({ data }) => {
      if (!data) return null;
      const out: Record<string, number> = {};
      for (const row of data as Array<{ interval: string; egp_price: number | null }>) {
        if (row.egp_price) out[row.interval] = Number(row.egp_price);
      }
      return out;
    })
    .catch(() => null);
  return egpP;
}

/** Formats an amount in a currency without trailing zeros for large units. */
export function formatMoney(amount: number, currency: string, ar = false): string {
  const whole = amount >= 100 || ["JPY", "KRW", "IDR", "VND", "CLP", "IQD", "LBP", "SYP", "YER"].includes(currency);
  try {
    return new Intl.NumberFormat(ar ? "ar-EG-u-nu-latn" : "en-US", {
      style: "currency",
      currency,
      currencyDisplay: currency === "EGP" && !ar ? "code" : "narrowSymbol",
      maximumFractionDigits: whole ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(whole ? Math.round(amount) : amount);
  } catch {
    return `${whole ? Math.round(amount) : amount.toFixed(2)} ${currency}`;
  }
}

/** Pure conversion used by the hook (and tests). Returns null for dollar countries. */
export function toLocal(
  usd: number,
  currency: string,
  rates: Record<string, number> | null,
  exact?: number | null,
  ar = false,
): LocalPrice | null {
  if (currency === "USD") return null;
  if (exact && exact > 0) return { text: formatMoney(exact, currency, ar), approx: false, currency };
  const rate = rates?.[currency];
  if (!rate || !Number.isFinite(rate)) return null;
  return { text: formatMoney(usd * rate, currency, ar), approx: true, currency };
}

/**
 * Local prices for the given dollar amounts. `slots` pairs each amount with its
 * catalogue slot so Egypt can show the exact pound price.
 */
export function useLocalPrices(items: Array<{ usd: number; slot?: PriceSlot }>, ar = false): Array<LocalPrice | null> {
  const [state, setState] = useState<{ country: string | null; rates: Record<string, number> | null; egp: Record<string, number> | null }>({
    country: null,
    rates: null,
    egp: null,
  });

  useEffect(() => {
    let alive = true;
    void visitorCountry().then(async (country) => {
      if (!alive || !country) return;
      const currency = currencyForCountry(country);
      if (currency === "USD") return;
      const [rates, egp] = await Promise.all([usdRates(), currency === "EGP" ? egpCatalog() : Promise.resolve(null)]);
      if (alive) setState({ country, rates, egp });
    });
    return () => {
      alive = false;
    };
  }, []);

  const currency = currencyForCountry(state.country);
  return items.map((it) => toLocal(it.usd, currency, state.rates, it.slot ? state.egp?.[it.slot] : null, ar));
}
