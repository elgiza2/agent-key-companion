import { describe, expect, it } from "vitest";
import { localMethodsFor } from "./countryMethods";

const ids = (c: string | null) => localMethodsFor(c).map((m) => m.id);

describe("payment methods per country (Dodo Payments table)", () => {
  it("India gets UPI and RuPay, and no Google Pay", () => {
    expect(ids("IN")).toEqual(["upi", "rupay", "apple_pay"]);
  });

  it("Brazil gets Pix first", () => {
    expect(ids("BR")[0]).toBe("pix");
  });

  it("South Korea gets Kakao Pay and Naver Pay", () => {
    expect(ids("KR").slice(0, 2)).toEqual(["kakao_pay", "naver_pay"]);
  });

  it("Indian methods never show outside India", () => {
    expect(ids("EG")).not.toContain("upi");
    expect(ids("US")).not.toContain("rupay");
  });

  it("no generic 'other methods' entry is offered", () => {
    for (const c of ["IN", "EG", "US", "DE", null]) expect(ids(c)).not.toContain("more");
  });
});

describe("Klarna follows Dodo's US-only, above-$50 rule", () => {
  it("is not offered in Europe", () => {
    expect(localMethodsFor("DE", 120).map((m) => m.id)).not.toContain("klarna");
  });
  it("is not offered for the $7 month in the US", () => {
    expect(localMethodsFor("US", 7).map((m) => m.id)).not.toContain("klarna");
  });
  it("is offered for the $120 year in the US", () => {
    expect(localMethodsFor("US", 120).map((m) => m.id)).toContain("klarna");
  });
});
