import { describe, expect, it } from "vitest";
import { dodoAllowedTypes, dodoBillingCurrency, currencyForCountry } from "./dodoMethodRules";
import { buildDodoAttempts, resolveDodoKey } from "./dodoCheckoutCore";
import { toLocal } from "./localPrice";

const base = { productId: "pdt_1", key: "monthly_intro", orderId: "dodo_x", userId: "u", email: "a@b.c", name: "A", siteUrl: "https://megsyai.com" };

describe("hosted checkout opens on the chosen method", () => {
  it("UPI checkout allows only UPI plus the card fallback Dodo requires", () => {
    expect(dodoAllowedTypes("upi")).toEqual(["upi_intent", "upi_collect", "credit", "debit"]);
  });
  it("first attempt sends the chosen method, local currency and the real country", () => {
    const [first] = buildDodoAttempts({ ...base, country: "IN", methodId: "upi" });
    expect(first.allowed_payment_method_types).toEqual(["upi_intent", "upi_collect", "credit", "debit"]);
    expect(first.billing_currency).toBe("INR");
    expect((first.billing as { country: string }).country).toBe("IN");
  });
  it("Pix bills in Brazilian reais", () => {
    expect(dodoBillingCurrency("pix", "BR")).toBe("BRL");
  });
  it("the last attempt has no method filter so checkout still opens", () => {
    const all = buildDodoAttempts({ ...base, country: "IN", methodId: "upi" });
    expect(all.at(-1)).not.toHaveProperty("allowed_payment_method_types");
  });
  it("monthly defaults to the discounted first month and yearly stays yearly", () => {
    expect(resolveDodoKey({ interval: "monthly" })).toBe("monthly_intro");
    expect(resolveDodoKey({ interval: "yearly" })).toBe("yearly");
  });
});

describe("local currency prices", () => {
  it("Egypt shows the exact pound price, not a conversion", () => {
    const p = toLocal(7, "EGP", { EGP: 50 }, 349);
    expect(p?.approx).toBe(false);
    expect(p?.text).toContain("349");
  });
  it("India converts the dollar price at the live rate", () => {
    const p = toLocal(7, "INR", { INR: 88 });
    expect(p?.approx).toBe(true);
    expect(p?.text).toContain("616");
  });
  it("US visitors keep the dollar price", () => {
    expect(currencyForCountry("US")).toBe("USD");
    expect(toLocal(7, "USD", { USD: 1 })).toBeNull();
  });
});
