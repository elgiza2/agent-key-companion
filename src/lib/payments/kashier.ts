/**
 * Kashier client — one place for every payment method we offer.
 *
 * The server (edge functions) creates the order, prices it from
 * `billing_catalog` and signs it; the browser only talks to Kashier's
 * Direct API with that signed order. Card data never touches our servers.
 */
import { supabase } from "@/integrations/supabase/client";
import { invokeFunction } from "@/lib/supabaseFunction";

export type BillingInterval = "monthly" | "yearly";
export type HostedMethod = "card" | "wallet" | "bank_installments" | "bnpl";

export type KashierOrder = {
  order_id: string;
  merchant_id: string;
  amount: number;
  currency: string;
  hash: string;
  endpoint: string;
  webhook_url: string;
  merchant_redirect?: string;
};

type KashierResponse = {
  status?: string;
  response?: {
    status?: string;
    result?: string;
    authentication?: { redirectUrl?: string };
  };
  messages?: { en?: string; ar?: string };
};

export type CardInput = {
  number: string;
  name: string;
  month: string;
  year: string;
  cvv: string;
};

export type CardResult =
  | { kind: "success"; orderId: string }
  | { kind: "3ds"; orderId: string; url: string };

export type WalletStatus = "pending" | "success" | "failed";

export class KashierError extends Error {}

/* ----------------------------------------------------------------- helpers */

export function isKashierUrl(url: string) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname === "kashier.io" || parsed.hostname.endsWith(".kashier.io"))
    );
  } catch {
    return false;
  }
}

export const onlyDigits = (value: string, max = 19) => value.replace(/\D/g, "").slice(0, max);

export const isValidEgyptMobile = (value: string) => /^01[0125]\d{8}$/.test(onlyDigits(value, 11));

export function isCardComplete(card: CardInput) {
  return (
    onlyDigits(card.number).length >= 12 &&
    card.name.trim().length > 0 &&
    /^\d{2}$/.test(card.month) &&
    /^\d{2}$/.test(card.year) &&
    /^\d{3,4}$/.test(card.cvv)
  );
}

async function session() {
  const { data } = await supabase.auth.getSession();
  const current = data.session;
  if (!current?.access_token) throw new KashierError("Your session expired. Please sign in again.");
  return current;
}

function messageOf(payload: KashierResponse, fallback: string) {
  return payload.messages?.en || payload.messages?.ar || fallback;
}

async function callKashier(
  url: string,
  init: { method: "POST" | "PUT"; hash?: string; body: unknown },
): Promise<{ ok: boolean; status: number; payload: KashierResponse; raw: string }> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (init.hash) headers["Kashier-Hash"] = init.hash;
  const res = await fetch(url, { method: init.method, headers, body: JSON.stringify(init.body) });
  const raw = await res.text();
  let payload: KashierResponse = {};
  try {
    payload = JSON.parse(raw) as KashierResponse;
  } catch {
    /* non-JSON error body */
  }
  return { ok: res.ok, status: res.status, payload, raw };
}

const isPaid = (p: KashierResponse) =>
  p.status === "SUCCESS" &&
  (p.response?.result === "SUCCESS" || p.response?.status === "CAPTURED");

/* ------------------------------------------------------------------ orders */

/** Create a signed, server-priced order for the chosen plan. */
export async function createOrder(tier: string, interval: BillingInterval, saveCard = false) {
  const current = await session();
  const { data, error } = await invokeFunction<KashierOrder>("kashier-direct-order", {
    body: { tier, interval, save: saveCard },
    headers: { Authorization: `Bearer ${current.access_token}` },
  });
  if (error || !data?.order_id) throw error || new KashierError("Couldn’t start the payment.");
  return { order: data, user: current.user };
}

/* -------------------------------------------------------------------- card */

export async function payWithCard(
  tier: string,
  interval: BillingInterval,
  card: CardInput,
): Promise<CardResult> {
  if (!isCardComplete(card))
    throw new KashierError("Check the card details and make sure they’re complete.");
  // Saving the card is what makes monthly auto-renew possible later.
  const { order, user } = await createOrder(tier, interval, true);
  const redirect =
    order.merchant_redirect ??
    `${window.location.origin}/billing/success?provider=kashier&order=${encodeURIComponent(order.order_id)}`;

  const { ok, status, payload, raw } = await callKashier(order.endpoint, {
    method: "POST",
    hash: order.hash,
    body: {
      apiOperation: "PAY",
      merchantId: order.merchant_id,
      interactionSource: "ECOMMERCE",
      newPaymentUI: true,
      paymentMethod: {
        type: "CARD",
        card: {
          number: onlyDigits(card.number),
          nameOnCard: card.name.trim(),
          expiry: { month: card.month, year: card.year },
          securityCode: card.cvv,
          save: true,
          enable3DS: true,
        },
      },
      order: {
        reference: order.order_id,
        amount: String(order.amount),
        currency: order.currency,
        description: `${tier} ${interval}`,
      },
      customer: { reference: user.id, email: user.email ?? "" },
      merchantRedirect: encodeURI(redirect),
      serverWebhook: order.webhook_url,
      reconciliation: { webhookUrl: order.webhook_url, merchantRedirect: redirect, redirect: false },
    },
  });

  if (!ok)
    throw new KashierError(
      messageOf(payload, raw || `The payment provider rejected the request (${status}).`),
    );
  const url = payload.response?.authentication?.redirectUrl;
  if (url && isKashierUrl(url)) return { kind: "3ds", orderId: order.order_id, url };
  if (isPaid(payload)) return { kind: "success", orderId: order.order_id };
  throw new KashierError(messageOf(payload, "The payment was declined."));
}

/* ------------------------------------------------------------------ wallet */

/** Sends a Request-to-Pay to the customer's mobile wallet (Vodafone Cash etc.). */
export async function requestWalletPayment(tier: string, interval: BillingInterval, phone: string) {
  const mobile = onlyDigits(phone, 11);
  if (!isValidEgyptMobile(mobile))
    throw new KashierError("Enter a valid wallet number (11 digits starting with 01).");
  const { order, user } = await createOrder(tier, interval);
  const { ok, payload } = await callKashier(order.endpoint, {
    method: "POST",
    hash: order.hash,
    body: {
      apiOperation: "INITIATE_R2P",
      merchantId: order.merchant_id,
      interactionSource: "ECOMMERCE",
      paymentMethod: { type: "wallet" },
      order: { reference: order.order_id, amount: order.amount, currency: order.currency },
      customer: { mobilePhone: mobile, reference: user.id, email: user.email ?? "" },
      serverWebhook: order.webhook_url,
      reconciliation: { webhookUrl: order.webhook_url },
    },
  });
  if (!ok || payload.status !== "SUCCESS")
    throw new KashierError(messageOf(payload, "This number isn’t linked to a wallet. Try another one."));
  return order;
}

export async function checkWalletPayment(order: KashierOrder): Promise<WalletStatus> {
  const url = `${order.endpoint.replace(/\/?$/, "/")}${encodeURIComponent(order.order_id)}`;
  try {
    const { payload } = await callKashier(url, {
      method: "PUT",
      body: {
        apiOperation: "RECONCILE_WALLET",
        merchantId: order.merchant_id,
        paymentMethod: { type: "wallet" },
      },
    });
    const state = payload.response?.status || payload.status;
    if (state === "SUCCESS" || state === "CAPTURED") return "success";
    if (state === "FAILURE" || state === "FAILED") return "failed";
  } catch {
    /* network blip — keep waiting */
  }
  return "pending";
}

/** Polls the wallet until approved, declined, cancelled or timed out. */
export function watchWalletPayment(
  order: KashierOrder,
  onDone: (status: "success" | "failed" | "expired") => void,
  { everyMs = 4000, timeoutMs = 5 * 60_000 } = {},
) {
  const started = Date.now();
  let stopped = false;
  const timer = window.setInterval(async () => {
    if (stopped) return;
    if (Date.now() - started > timeoutMs) {
      stop();
      onDone("expired");
      return;
    }
    const status = await checkWalletPayment(order);
    if (stopped || status === "pending") return;
    stop();
    onDone(status);
  }, everyMs);
  function stop() {
    stopped = true;
    window.clearInterval(timer);
  }
  return stop;
}

/* ------------------------------------------------------------ Apple/Google */

/**
 * Apple Pay / Google Pay need Kashier's own wallet sheet (domain-verified
 * tokens), so they run in Kashier's secure page embedded inside our checkout.
 */
export async function openHostedSession(
  tier: string,
  interval: BillingInterval,
  method: HostedMethod,
) {
  const current = await session();
  const { data, error } = await invokeFunction<{ checkout_url?: string; url?: string; error?: string }>(
    "kashier-checkout",
    {
      body: { kind: "checkout", tier, interval, provider: "kashier", method, display: "en" },
      headers: { Authorization: `Bearer ${current.access_token}` },
    },
  );
  if (error) throw error;
  const url = data?.checkout_url || data?.url;
  if (!url || !isKashierUrl(url)) throw new KashierError(data?.error || "Couldn’t open the payment page.");
  return url;
}

/* --------------------------------------------------------------- Apple Pay */
/** Kashier renders a real Apple Pay button inside our own page via their SDK. */
const KASHIER_SDK_SRC = "https://payments.kashier.io/kashier-sdk.js";

/** Apple Pay only exists on Apple devices that have a card in Wallet. */
export function applePaySupported(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean((window as any).ApplePaySession?.canMakePayments?.());
  } catch {
    return false;
  }
}

let sdkPromise: Promise<void> | null = null;
/** Loads kashier-sdk.js once and resolves as soon as window.kashierSDK exists. */
export function loadKashierSdk(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if ((window as any).kashierSDK) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = KASHIER_SDK_SRC;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => {
      sdkPromise = null;
      reject(new KashierError("Couldn't load Apple Pay. Check your connection."));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export type ApplePaySessionInfo = { sessionId: string; mode: "test" | "live"; orderId: string };

/** Opens the Kashier payment session the Apple Pay SDK renders. */
export async function openApplePaySession(
  tier: string,
  interval: BillingInterval,
): Promise<ApplePaySessionInfo> {
  const current = await session();
  const { data, error } = await invokeFunction<{
    session_id?: string;
    mode?: string;
    order_id?: string;
    error?: string;
  }>("kashier-applepay-session", {
    body: { tier, interval },
    headers: { Authorization: `Bearer ${current.access_token}` },
  });
  if (error) throw error;
  if (!data?.session_id)
    throw new KashierError(data?.error || "Apple Pay isn't available for this account yet.");
  return {
    sessionId: data.session_id,
    mode: data.mode === "test" ? "test" : "live",
    orderId: data.order_id ?? "",
  };
}
