/**
 * @doc POST /api/dodo-checkout — opens the hosted Dodo checkout narrowed to the chosen method.
 *
 * Verifies the caller's bearer session, creates the pending dodo_orders row (settled by the
 * existing dodo-webhook) and returns the payment link. Answers 503 { code: "not_configured" }
 * when this host has no Dodo / service keys, so the browser falls back to the old function.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/api/supabaseServerConfig";
import { DODO_PLANS, buildDodoAttempts, resolveDodoKey } from "@/lib/payments/dodoCheckoutCore";
import { LOCAL_METHOD_IDS } from "@/lib/payments/countryMethods";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export const Route = createFileRoute("/api/dodo-checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.DODO_PAYMENTS_API_KEY;
        if (!apiKey || !process.env.SUPABASE_SERVICE_ROLE_KEY) return json({ code: "not_configured" }, 503);

        const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
        if (!token) return json({ error: "unauthorized" }, 401);
        const anon = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data: auth } = await anon.auth.getUser(token);
        const user = auth?.user;
        if (!user) return json({ error: "unauthorized" }, 401);

        let payload: Record<string, unknown> = {};
        try {
          payload = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "invalid json" }, 400);
        }
        const methodRaw = String(payload.method_id ?? "");
        const methodId = (LOCAL_METHOD_IDS as string[]).includes(methodRaw) ? methodRaw : null;
        const countryRaw = String(payload.country ?? "").toUpperCase();
        const country =
          /^[A-Z]{2}$/.test(countryRaw)
            ? countryRaw
            : (request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || "").toUpperCase() || null;

        const key = resolveDodoKey(payload);
        const info = DODO_PLANS[key];
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const productKeys = key === "monthly_trial" ? [key, "monthly_intro", "monthly"] : [key];
        let productId = "";
        for (const candidate of productKeys) {
          const { data } = await supabaseAdmin
            .from("dodo_products")
            .select("product_id")
            .eq("interval", candidate)
            .eq("active", true)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          productId = data?.product_id ?? "";
          if (productId) break;
        }
        if (!productId) return json({ error: "This plan isn't available right now." }, 503);

        const orderId = `dodo_${crypto.randomUUID()}`;
        const { error: insertErr } = await supabaseAdmin.from("dodo_orders").insert({
          order_id: orderId,
          user_id: user.id,
          amount: info.amount,
          currency: "USD",
          credits: info.credits,
          plan: info.plan,
          status: "pending",
          raw: { plan_key: key, product_id: productId, method: methodId, country },
        });
        if (insertErr) {
          console.error("[dodo-checkout] order insert failed", insertErr.message);
          return json({ error: "Couldn't start the checkout. Please try again." }, 500);
        }

        const apiBase =
          (process.env.DODO_PAYMENTS_ENVIRONMENT || "live_mode") === "test_mode"
            ? "https://test.dodopayments.com"
            : "https://live.dodopayments.com";
        const attempts = buildDodoAttempts({
          productId,
          key,
          orderId,
          userId: user.id,
          email: user.email ?? "",
          name: String(user.user_metadata?.full_name ?? ""),
          country,
          methodId,
          siteUrl: process.env.SITE_URL || "https://megsyai.com",
        });

        let data: Record<string, unknown> = {};
        let ok = false;
        let status = 0;
        for (const body of attempts) {
          const res = await fetch(`${apiBase}/subscriptions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          status = res.status;
          data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
          if (res.ok) {
            ok = true;
            break;
          }
          console.warn("[dodo-checkout] attempt rejected", res.status, JSON.stringify(data).slice(0, 300));
          if (res.status === 401 || res.status === 403) break;
        }

        if (!ok) {
          await supabaseAdmin.from("dodo_orders").update({ status: "failed", raw: data as never }).eq("order_id", orderId);
          return json({ error: `Checkout error ${status}` }, 502);
        }

        await supabaseAdmin
          .from("dodo_orders")
          .update({
            dodo_payment_id: (data.payment_id as string) ?? null,
            dodo_subscription_id: (data.subscription_id as string) ?? null,
            raw: data as never,
          })
          .eq("order_id", orderId);

        const url = (data.payment_link || data.checkout_url || data.url) as string | undefined;
        return json({ ok: true, checkout_url: url ?? null, order_id: orderId, plan_key: key });
      },
    },
  },
});
