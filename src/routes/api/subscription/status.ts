import { timingSafeEqual } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";

const MAX_BODY_BYTES = 4_096;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store, max-age=0",
      "x-content-type-options": "nosniff",
    },
  });
}

function apiKeyMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/subscription/status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedKey = process.env.SUBSCRIPTION_STATUS_API_KEY?.trim();
        if (!expectedKey) return json({ error: "not_configured" }, 503);

        const providedKey = request.headers.get("x-api-key") ?? "";
        if (!providedKey || !apiKeyMatches(providedKey, expectedKey)) {
          return json({ error: "unauthorized" }, 401);
        }

        if (
          !(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")
        ) {
          return json({ error: "content_type_must_be_application_json" }, 415);
        }

        const contentLength = Number(request.headers.get("content-length") ?? 0);
        if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
          return json({ error: "payload_too_large" }, 413);
        }

        let rawBody: string;
        try {
          rawBody = await request.text();
        } catch {
          return json({ error: "invalid_json" }, 400);
        }
        if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
          return json({ error: "payload_too_large" }, 413);
        }

        let payload: unknown;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return json({ error: "invalid_json" }, 400);
        }

        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
          return json({ error: "invalid_request" }, 400);
        }

        const emailValue = (payload as { email?: unknown }).email;
        if (typeof emailValue !== "string") {
          return json({ error: "email_required" }, 400);
        }

        const email = emailValue.trim().toLowerCase();
        if (email.length > 320 || !EMAIL_PATTERN.test(email)) {
          return json({ error: "invalid_email" }, 400);
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.rpc("is_subscribed_by_email", {
            p_email: email,
          });

          if (error) {
            console.error("[subscription-status] lookup failed", { code: error.code ?? "unknown" });
            return json({ error: "lookup_unavailable" }, 503);
          }

          const isSubscribed = data === true;
          return json({
            status: isSubscribed ? "subscribed" : "free",
            isSubscribed,
          });
        } catch (error) {
          console.error("[subscription-status] handler unavailable", {
            name: error instanceof Error ? error.name : "unknown",
          });
          return json({ error: "lookup_unavailable" }, 503);
        }
      },
    },
  },
});
