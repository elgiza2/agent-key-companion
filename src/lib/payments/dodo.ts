/**
 * @doc The Dodo Payments rail.
 *
 * Methods Megsy cannot charge in-app are handed to the Dodo Payments checkout:
 * `dodo-checkout` creates the session server-side (Dodo is the Merchant of
 * Record, so it collects the money and handles tax) and we open the returned
 * payment link. Switch the rail off with VITE_DODO_CHECKOUT_ENABLED=false.
 */
import { supabase } from "@/integrations/supabase/client";

export const DODO_READY = import.meta.env.VITE_DODO_CHECKOUT_ENABLED !== "false";

const ALLOWED_HOSTS = ["dodopayments.com", "www.dodopayments.com", "checkout.dodopayments.com"];

/** Sends the browser to an external checkout, escaping any embedding frame first. */
export function openExternalCheckout(url: string): boolean {
  if (typeof window === "undefined" || !url) return false;

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    console.error("Blocked invalid checkout URL");
    return false;
  }
  if (target.protocol !== "https:" || !ALLOWED_HOSTS.includes(target.hostname)) {
    console.error("Blocked non-Dodo checkout URL");
    return false;
  }

  const framed = window.top && window.top !== window;
  if (framed) {
    try {
      window.top!.location.href = target.toString();
      return true;
    } catch {
      /* cross-origin or sandboxed — fall through */
    }
    const tab = window.open(target.toString(), "_blank", "noopener,noreferrer");
    if (tab) return true;
  }
  window.location.href = target.toString();
  return true;
}

export type DodoFailureReason = "not-configured" | "unauthenticated" | "failed";

export interface DodoStartResult {
  ok: boolean;
  reason?: DodoFailureReason;
  message?: string;
}

/**
 * Creates the Dodo checkout for this account and sends the customer to it.
 *
 * The monthly slot always uses the discounted first month, exactly like the
 * Kashier rail (`catalogSlot` in kashier-checkout): the checkout page shows the
 * first-month price, so the gateway must charge the same one. Dodo's own
 * renewal then moves the customer to the standard monthly price.
 */
export async function startDodoCheckout(input: {
  tier: string;
  interval: "monthly" | "yearly";
  methodId?: string;
  /** Visitor country (ISO alpha-2) so the hosted checkout shows local methods. */
  country?: string;
}): Promise<DodoStartResult> {
  if (!DODO_READY) return { ok: false, reason: "not-configured" };

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return { ok: false, reason: "unauthenticated" };

    // Preferred: this site's own checkout endpoint, which narrows the hosted page to the
    // chosen method and bills in local currency. Falls back to the older backend function
    // when this host has no payment keys yet.
    try {
      const res = await fetch("/api/dodo-checkout", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          tier: input.tier,
          interval: input.interval,
          offer: input.interval === "yearly" ? "standard" : "intro",
          method_id: input.methodId ?? null,
          country: input.country ?? null,
        }),
      });
      const body = (await res.json().catch(() => null)) as { checkout_url?: string | null; error?: string; code?: string } | null;
      if (res.ok && body?.checkout_url) {
        openExternalCheckout(body.checkout_url);
        return { ok: true };
      }
      if (res.status !== 503 && res.status !== 404 && body?.code !== "not_configured" && body?.error) {
        return { ok: false, reason: res.status === 401 ? "unauthenticated" : "failed", message: body.error };
      }
    } catch {
      /* fall through to the backend function */
    }

    const { data, error } = await supabase.functions.invoke("dodo-checkout", {
      body: {
        tier: input.tier,
        interval: input.interval,
        offer: input.interval === "yearly" ? "standard" : "intro",
        method_id: input.methodId ?? null,
        ...(input.country ? { country: input.country } : {}),
      },
    });

    if (error) return { ok: false, reason: "failed", message: error.message };

    const payload = data as { checkout_url?: string | null; error?: string } | null;
    const url = payload?.checkout_url;
    if (!url) {
      return {
        ok: false,
        reason: "failed",
        message: payload?.error ?? "The secure checkout link is missing. Please try another method.",
      };
    }

    openExternalCheckout(url);
    return { ok: true };
  } catch (cause) {
    return {
      ok: false,
      reason: "failed",
      message: cause instanceof Error ? cause.message : "Something went wrong.",
    };
  }
}
