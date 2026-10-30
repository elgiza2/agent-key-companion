/**
 * @doc Dodo hosted-checkout rules: which method types and currency a chosen method needs.
 *
 * Source: Dodo Payments "Supported Payment Methods" + "India Payment Methods" docs.
 * Dodo requires `credit` + `debit` in allowed_payment_method_types as a fallback, otherwise
 * the checkout fails when the chosen method is unavailable on the customer's device.
 */

/** Our method id -> Dodo `allowed_payment_method_types` values for that method. */
export const DODO_METHOD_TYPES: Record<string, string[]> = {
  apple_pay: ["apple_pay"],
  google_pay: ["google_pay"],
  cashapp: ["cashapp"],
  klarna: ["klarna"],
  upi: ["upi_intent", "upi_collect"],
  rupay: [],
  pix: ["pix"],
  kakao_pay: ["kakao_pay"],
  naver_pay: ["naver_pay"],
  satispay: ["satispay"],
};

/** Currency a method can only be paid in (Dodo table). */
export const DODO_METHOD_CURRENCY: Record<string, string> = {
  upi: "INR",
  rupay: "INR",
  pix: "BRL",
  kakao_pay: "KRW",
  naver_pay: "KRW",
  satispay: "EUR",
  cashapp: "USD",
  klarna: "USD",
};

/** Allowed method types for one chosen method: the method itself plus the card fallback. */
export function dodoAllowedTypes(methodId: string | null | undefined): string[] | null {
  if (!methodId || !(methodId in DODO_METHOD_TYPES)) return null;
  return [...DODO_METHOD_TYPES[methodId], "credit", "debit"];
}

const EURO = ["AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK"];

/** Visitor country (ISO alpha-2) -> local currency (ISO 4217). Unknown -> USD. */
export const COUNTRY_CURRENCY: Record<string, string> = {
  ...Object.fromEntries(EURO.map((c) => [c, "EUR"])),
  US: "USD", EG: "EGP", SA: "SAR", AE: "AED", KW: "KWD", QA: "QAR", BH: "BHD", OM: "OMR", JO: "JOD",
  MA: "MAD", DZ: "DZD", TN: "TND", IQ: "IQD", LB: "LBP", LY: "LYD", SD: "SDG", YE: "YER", PS: "ILS",
  IN: "INR", PK: "PKR", BD: "BDT", LK: "LKR", NP: "NPR", ID: "IDR", MY: "MYR", PH: "PHP", TH: "THB", VN: "VND",
  SG: "SGD", HK: "HKD", CN: "CNY", JP: "JPY", KR: "KRW", TW: "TWD", AU: "AUD", NZ: "NZD",
  GB: "GBP", CH: "CHF", NO: "NOK", SE: "SEK", DK: "DKK", PL: "PLN", CZ: "CZK", RO: "RON", HU: "HUF", BG: "BGN",
  TR: "TRY", UA: "UAH", IL: "ILS",
  CA: "CAD", MX: "MXN", BR: "BRL", AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN",
  NG: "NGN", KE: "KES", ZA: "ZAR", GH: "GHS",
};

export function currencyForCountry(country: string | null | undefined): string {
  return COUNTRY_CURRENCY[(country ?? "").toUpperCase()] ?? "USD";
}

/** Currency the hosted checkout should bill in for this method + country. */
export function dodoBillingCurrency(methodId: string | null | undefined, country: string | null | undefined): string {
  return (methodId && DODO_METHOD_CURRENCY[methodId]) || currencyForCountry(country);
}
