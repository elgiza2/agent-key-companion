// Computer agent endpoint (deployed under the legacy `media-video` name).
// Media generation lives elsewhere: Agent Sky for subscribers, the free media
// service for everyone else.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const out = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return out({ error: true, message: "invalid json" }, 400);
  }

  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: authData } = token
    ? await db.auth.getUser(token)
    : ({ data: { user: null } } as any);
  const user = authData?.user;
  if (!user) return out({ error: true, paywall: true, message: "Sign in first." }, 401);

  // The backup computer (cloud browser) for the primary agent.
  if (body.kind === "agent") {
    const { handleAgent } = await import("./agent.ts");
    return handleAgent(db, user.id, body, out);
  }
  return out({ error: true, message: "Unsupported request." }, 400);
});
