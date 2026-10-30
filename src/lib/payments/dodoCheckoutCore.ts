/**
 * @doc Builds the Dodo Payments subscription request for one chosen method.
 *
 * Mirrors supabase/functions/dodo-checkout (same catalogue keys, order row and metadata,
 * so the existing dodo-webhook settles it), and adds what that function cannot:
 * the hosted page is narrowed to the chosen method (+ the card fallback Dodo requires),
 * billed in the method's / visitor's local currency, with the real billing country.
 */
import { dodoAllowedTypes, dodoBillingCurrency } from "./dodoMethodRules";

export const DODO_PLANS: Record<string, { plan: string; amount: number; credits: number }> = {
  monthly: { plan: "pro", amount: 15, credits: 1000 },
  monthly_intro: { plan: "pro", amount: 7, credits: 1000 },
  monthly_trial: { plan: "pro", amount: 1, credits: 1000 },
  monthly_winback: { plan: "pro", amount: 5, credits: 1000 },
  yearly: { plan: "pro", amount: 120, credits: 12000 },
  yearly_winback: { plan: "pro", amount: 149, credits: 12000 },
};

const TRIAL_DAYS: Record<string, number> = { monthly_trial: 3 };

/** Same rules as resolveKey in the dodo-checkout function. */
export function resolveDodoKey(p: { interval?: unknown; offer?: unknown }): string {
  const raw = String(p.interval ?? "monthly").toLowerCase();
  const yearly = raw === "y" || /year|annual/.test(raw);
  const offer = String(p.offer ?? "").toLowerCase();
  const winback = /winback|win_back|return/.test(offer);
  if (yearly) return winback ? "yearly_winback" : "yearly";
  if (winback) return "monthly_winback";
  if (/free_trial|trial3|3day|3-day/.test(offer)) return "monthly_trial";
  return "monthly_intro";
}

/**
 * Request bodies to try in order: full (method + currency), then without the currency
 * (adaptive currency off), then without the method filter. Each retry only drops options.
 */
export function buildDodoAttempts(input: {
  productId: string;
  key: string;
  orderId: string;
  userId: string;
  email: string;
  name: string;
  country: string | null;
  methodId: string | null;
  siteUrl: string;
}): Record<string, unknown>[] {
  const info = DODO_PLANS[input.key];
  const trialDays = TRIAL_DAYS[input.key] ?? 0;
  const country = input.country && /^[A-Z]{2}$/.test(input.country) ? input.country : "US";
  const base: Record<string, unknown> = {
    payment_link: true,
    product_id: input.productId,
    quantity: 1,
    return_url: `${input.siteUrl}/billing/success?provider=dodo&order=${input.orderId}`,
    customer: { email: input.email, name: input.name || input.email },
    billing: { city: "NA", country, state: "NA", street: "NA", zipcode: "00000" },
    metadata: {
      order_id: input.orderId,
      user_id: input.userId,
      sku: "",
      plan_key: input.key,
      credits: String(info?.credits ?? 0),
      plan: info?.plan ?? "pro",
      trial_days: String(trialDays),
      method: input.methodId ?? "",
    },
    ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
  };
  const allowed = dodoAllowedTypes(input.methodId);
  const currency = dodoBillingCurrency(input.methodId, country);
  const attempts: Record<string, unknown>[] = [];
  if (allowed) {
    attempts.push({ ...base, allowed_payment_method_types: allowed, ...(currency !== "USD" ? { billing_currency: currency } : {}) });
    if (currency !== "USD") attempts.push({ ...base, allowed_payment_method_types: allowed });
  } else if (currency !== "USD") {
    attempts.push({ ...base, billing_currency: currency });
  }
  attempts.push(base);
  if (trialDays > 0) {
    const { trial_period_days: _t, ...noTrial } = base;
    attempts.push(noTrial);
  }
  return attempts;
}
