import { describe, expect, it } from "vitest";
import { shouldFallbackToBrowserUse } from "./fallbackPolicy";

describe("shouldFallbackToBrowserUse", () => {
  const safe = { isMedia: false, hasVisibleOutput: false, hasPerformedAction: false };

  it("falls back on transient provider/server/network failures", () => {
    expect(shouldFallbackToBrowserUse({ status: 503 }, safe)).toBe(true);
    expect(shouldFallbackToBrowserUse({ status: 429 }, safe)).toBe(true);
    expect(shouldFallbackToBrowserUse(new TypeError("fetch failed"), safe)).toBe(true);
    expect(shouldFallbackToBrowserUse(new Error("session.error: provider unavailable"), safe)).toBe(
      true,
    );
  });

  it("does not retry permission/validation errors or tasks that already produced output/actions", () => {
    expect(shouldFallbackToBrowserUse({ status: 403 }, safe)).toBe(false);
    expect(shouldFallbackToBrowserUse({ status: 422 }, safe)).toBe(false);
    expect(shouldFallbackToBrowserUse(new Error("network error"), { ...safe, isMedia: true })).toBe(
      false,
    );
    expect(
      shouldFallbackToBrowserUse(new Error("network error"), { ...safe, hasVisibleOutput: true }),
    ).toBe(false);
    expect(
      shouldFallbackToBrowserUse(new Error("network error"), { ...safe, hasPerformedAction: true }),
    ).toBe(false);
  });

  it("hands an unconfigured AgentSky turn to the Browser Use fallback", () => {
    expect(shouldFallbackToBrowserUse(new Error("AgentSky is not configured"), safe)).toBe(true);
  });
});
