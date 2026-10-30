/** @doc anything-api — free-tier image/video service plus connected-app tools.
 * Subscribers' media runs on Agent Sky; this function serves non-subscribers
 * through deAPI only, with the free daily image allowance enforced here. */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Each Edge Function is bundled independently; keep its encrypted key lookup local.
async function vaultKeys(provider: string): Promise<Array<{ key: string }>> {
  const database = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const keys: Array<{ key: string }> = [];
  const secret = Deno.env.get("KEY_VAULT_SECRET")?.trim();
  if (secret) {
    const { data } = await database.from("service_keys")
      .select("key_cipher,key_iv").eq("provider", provider).eq("status", "active")
      .order("last_used_at", { ascending: true, nullsFirst: true }).limit(25);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
    const aes = await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["decrypt"]);
    for (const row of data ?? []) {
      try {
        const plaintext = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: Uint8Array.from(atob(row.key_iv), (c) => c.charCodeAt(0)) },
          aes, Uint8Array.from(atob(row.key_cipher), (c) => c.charCodeAt(0)),
        );
        keys.push({ key: new TextDecoder().decode(plaintext) });
      } catch { /* Skip an undecryptable key. */ }
    }
  }
  const { data: legacy } = await database.from("provider_api_keys")
    .select("api_key").eq("provider", provider).eq("status", "active")
    .order("last_used_at", { ascending: true, nullsFirst: true }).limit(25);
  for (const row of legacy ?? []) if (row.api_key) keys.push({ key: row.api_key });
  return keys;
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Aliases: slugs older clients may send -> real catalogue slug.
const SLUG_ALIASES: Record<string, string> = {
  "deapi-image": "deapi-flux-schnell",
};

// catalogue slug -> live model + capabilities.
const DEAPI_MODELS: Record<string, { api: string; edit: boolean; t2i: boolean; steps: number }> = {
  "deapi-flux-schnell": { api: "Flux1schnell", edit: false, t2i: true, steps: 4 },
  "deapi-flux-2-klein": { api: "Flux_2_Klein_4B_BF16", edit: true, t2i: true, steps: 4 },
  "deapi-qwen-image-edit": { api: "QwenImageEdit_Plus_NF4", edit: true, t2i: false, steps: 10 },
  "deapi-gpt-image-2": { api: "gpt-image-2", edit: true, t2i: true, steps: 0 },
  "deapi-nano-banana-2": { api: "nano-banana-2", edit: true, t2i: true, steps: 0 },
};

/** Same-service rescue chain so a busy model never reaches the user as an error. */
const IMAGE_FALLBACK_CHAIN: Record<string, string[]> = {
  "deapi-gpt-image-2": ["deapi-flux-2-klein", "deapi-flux-schnell"],
  "deapi-nano-banana-2": ["deapi-flux-2-klein", "deapi-flux-schnell"],
  "deapi-flux-2-klein": ["deapi-flux-schnell"],
};

const DEAPI_VIDEO: Record<string, { api: string; steps: number; fps: number }> = {
  "deapi-ltx-video": { api: "Ltxv_13B_0_9_8_Distilled_FP8", steps: 1, fps: 30 },
  "deapi-ltx-2-3": { api: "Ltx2_3_22B_Dist_INT8", steps: 1, fps: 30 },
  "deapi-minimax-h3": { api: "MiniMaxH3_33B_Turbo_INT8", steps: 1, fps: 30 },
};

const VIDEO_SLUG_ALIASES: Record<string, string> = {
  "deapi-ltx-2": "deapi-ltx-video",
  "deapi-video": "deapi-ltx-video",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));


async function resolveApiKey(admin: any): Promise<string | null> {
  const service = "deapi";
  try {
    const vault = await vaultKeys(service);
    if (vault.length) return vault[0].key;
  } catch {
    /* fall through */
  }
  const envKey = Deno.env.get("DEAPI_API_KEY")?.trim();
  if (envKey) return envKey;
  try {
    const { data } = await admin.rpc("next_provider_key", { p_provider: "d" });
    const row = Array.isArray(data) ? data[0] : data;
    if ((row as any)?.api_key) return String((row as any).api_key);
  } catch {
    /* fall through */
  }
  try {
    const { data } = await admin.rpc("get_image_provider_key", { p_provider: "d" });
    if (data) return data as string;
  } catch {
    /* fall through */
  }
  return null;
}

function firstUrl(value: unknown, depth = 0): string | null {
  if (depth > 6 || value == null) return null;
  if (typeof value === "string") {
    if (/^https?:\/\/\S+/.test(value) && /\.(png|jpe?g|webp|gif)(\?\S*)?$/i.test(value))
      return value;
    if (/^https?:\/\/\S*(results|cdn|image|img|output)\S*/i.test(value)) return value;
    return null;
  }
  if (Array.isArray(value)) {
    for (const v of value) {
      const hit = firstUrl(v, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      const hit = firstUrl(v, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

// ---------- deapi (v2) ----------
/**
 * deapi sits behind Cloudflare and intermittently answers 520/522/5xx while the
 * origin GPU pool is saturated. Those are transient, so the submit call is
 * retried with backoff instead of surfacing a raw gateway error to the user.
 */
async function fetchWithRetry(
  input: string,
  init: RequestInit,
  attempts = 4,
): Promise<{ res: Response; text: string }> {
  let lastText = "";
  let lastRes: Response | null = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(input, init);
      const text = await res.text();
      if (res.ok || res.status < 500) return { res, text };
      lastRes = res;
      lastText = text;
    } catch (e) {
      lastText = e instanceof Error ? e.message : String(e);
    }
    if (i < attempts - 1) await sleep(1500 * (i + 1));
  }
  if (lastRes) return { res: lastRes, text: lastText };
  throw new Error(lastText || "upstream unreachable");
}

async function deapiGenerate(opts: {
  key: string;
  model: string;
  prompt: string;
  images: string[];
  aspectRatio?: string;
  steps: number;
}): Promise<string> {
  const editing = opts.images.length > 0;
  const endpoint = editing
    ? "https://api.deapi.ai/api/v2/images/edits"
    : "https://api.deapi.ai/api/v2/images/generations";
  const seed = Math.floor(Math.random() * 2_147_483_647);
  let res: Response;
  let text: string;
  if (editing) {
    // The edits endpoint is multipart/form-data with binary image parts —
    // image URLs are not accepted, so download the bytes first.
    const form = new FormData();
    form.append("model", opts.model);
    form.append("prompt", opts.prompt);
    form.append("seed", String(seed));
    if (opts.steps > 0) form.append("steps", String(opts.steps));
    const blobs = await Promise.all(
      opts.images.map(async (u, i) => {
        const r = await fetch(u);
        if (!r.ok) throw new Error(`failed to download reference image (${r.status})`);
        const ct = r.headers.get("content-type") ?? "image/png";
        const ext = ct.includes("jpeg") ? "jpg" : ct.includes("webp") ? "webp" : "png";
        return { blob: await r.blob(), name: `reference-${i}.${ext}` };
      }),
    );
    if (blobs.length === 1) form.append("image", blobs[0].blob, blobs[0].name);
    else for (const b of blobs) form.append("images[]", b.blob, b.name);
    ({ res, text } = await fetchWithRetry(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.key}`, Accept: "application/json" },
      body: form,
    }));
  } else {
    const [width, height] =
      opts.aspectRatio === "9:16"
        ? [768, 1344]
        : opts.aspectRatio === "16:9"
          ? [1344, 768]
          : [1024, 1024];
    ({ res, text } = await fetchWithRetry(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model,
        prompt: opts.prompt,
        width,
        height,
        seed,
        // Hosted models (gpt-image-2 / nano-banana-2) take no diffusion params.
        ...(opts.steps > 0 ? { steps: opts.steps, guidance: 3.5 } : {}),
      }),
    }));
  }
  if (!res.ok) {
    // Cloudflare 5xx pages are noise to a chat user; keep the message human.
    if (res.status >= 500) {
      throw new Error("مزود الصور مشغول حاليًا. جرّب تبعت الطلب تاني بعد لحظات.");
    }
    throw new Error(`deapi ${res.status}: ${text.slice(0, 300)}`);
  }
  let payload: any;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("deapi returned non-JSON");
  }
  const requestId =
    payload?.data?.request_id || payload?.request_id || payload?.data?.id || payload?.id;
  if (!requestId) {
    const direct = firstUrl(payload);
    if (direct) return direct;
    throw new Error(`deapi: no request id (${text.slice(0, 200)})`);
  }
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await sleep(2500);
    const st = await fetch(`https://api.deapi.ai/api/v2/jobs/${requestId}`, {
      headers: { Authorization: `Bearer ${opts.key}`, Accept: "application/json" },
    });
    if (!st.ok) continue;
    const job: any = await st.json().catch(() => null);
    const status = String(job?.data?.status ?? job?.status ?? "").toLowerCase();
    if (["completed", "complete", "succeeded", "success", "done"].includes(status)) {
      const url = firstUrl(job);
      if (url) return url;
      throw new Error("deapi: completed without an image URL");
    }
    if (["failed", "error", "cancelled"].includes(status)) {
      throw new Error(`deapi job failed: ${JSON.stringify(job).slice(0, 300)}`);
    }
  }
  throw new Error("deapi: timed out waiting for image");
}


// ---------- video helpers ----------
function firstVideoUrl(value: unknown, depth = 0): string | null {
  if (depth > 6 || value == null) return null;
  if (typeof value === "string") {
    if (/^https?:\/\/\S+\.(mp4|webm|mov|m4v)(\?\S*)?$/i.test(value)) return value;
    if (
      /^https?:\/\/\S*(results|cdn|output|video)\S*/i.test(value) &&
      /mp4|webm|mov/i.test(value)
    ) {
      return value;
    }
    return null;
  }
  if (Array.isArray(value)) {
    for (const v of value) {
      const hit = firstVideoUrl(v, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      const hit = firstVideoUrl(v, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

function videoDims(aspect?: string): [number, number] {
  if (aspect === "9:16") return [480, 832];
  if (aspect === "1:1") return [640, 640];
  return [832, 480];
}

// Submit a deapi video job -> request id (jobs resolve in seconds/minutes).
async function deapiVideoSubmit(opts: {
  key: string;
  model: string;
  prompt: string;
  steps: number;
  fps: number;
  duration: number;
  aspectRatio?: string;
  image?: string;
}): Promise<string> {
  const [width, height] = videoDims(opts.aspectRatio);
  const frames = Math.max(24, Math.min(241, Math.round(opts.duration * opts.fps)));
  const form = new FormData();
  form.append("model", opts.model);
  form.append("prompt", opts.prompt);
  form.append("width", String(width));
  form.append("height", String(height));
  form.append("seed", String(Math.floor(Math.random() * 2_147_483_647)));
  form.append("frames", String(frames));
  form.append("fps", String(opts.fps));
  form.append("steps", String(opts.steps));

  let res: Response;
  let text: string;
  if (opts.image) {
    const r = await fetch(opts.image);
    if (!r.ok) throw new Error(`failed to download the reference image (${r.status})`);
    const ct = r.headers.get("content-type") ?? "image/png";
    const ext = ct.includes("jpeg") ? "jpg" : ct.includes("webp") ? "webp" : "png";
    form.append("image", await r.blob(), `frame.${ext}`);
    ({ res, text } = await fetchWithRetry("https://api.deapi.ai/api/v2/videos/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.key}`, Accept: "application/json" },
      body: form,
    }));
  } else {
    const body: Record<string, unknown> = {
      model: opts.model,
      prompt: opts.prompt,
      width,
      height,
      seed: Math.floor(Math.random() * 2_147_483_647),
      frames,
      fps: opts.fps,
      steps: opts.steps,
    };
    ({ res, text } = await fetchWithRetry("https://api.deapi.ai/api/v2/videos/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }));
  }
  if (!res.ok) {
    if (res.status >= 500) {
      throw new Error("مزود الفيديو مشغول حاليًا. جرّب تاني بعد لحظات.");
    }
    throw new Error(`deapi ${res.status}: ${text.slice(0, 300)}`);
  }
  const payload = JSON.parse(text);
  const id = payload?.data?.request_id ?? payload?.request_id ?? payload?.data?.id ?? payload?.id;
  if (!id) throw new Error(`deapi: no video request id (${text.slice(0, 200)})`);
  return String(id);
}


// job_id format: "<provider>:<id>" so the client can poll a single endpoint.
async function pollVideoJob(
  admin: ReturnType<typeof createClient>,
  jobId: string,
): Promise<Response> {
  const id = jobId.replace(/^deapi:/, "");
  const key = await resolveApiKey(admin);
  if (!key) return json({ status: "failed", error: "video service is not configured" });
  const st = await fetch(`https://api.deapi.ai/api/v2/jobs/${id}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!st.ok) return json({ status: "processing" });
  const job: any = await st.json().catch(() => null);
  const status = String(job?.data?.status ?? job?.status ?? "").toLowerCase();
  if (["done", "completed", "complete", "succeeded", "success"].includes(status)) {
    const url = firstVideoUrl(job) ?? job?.data?.result_url ?? null;
    if (url) return json({ status: "completed", video_url: url });
    return json({ status: "failed", error: "video finished without a URL" });
  }
  if (["failed", "error", "cancelled"].includes(status)) {
    return json({ status: "failed", error: "video job failed" });
  }
  return json({ status: "processing", progress: Number(job?.data?.progress ?? 0) });
}

async function handleVideo(
  req: Request,
  admin: ReturnType<typeof createClient>,
  body: any,
): Promise<Response> {
  const prompt = String(body?.prompt ?? "").trim();
  if (!prompt) return json({ error: true, message: "prompt is required" }, 400);

  let slug = String(body?.model_slug ?? "").trim();
  slug = VIDEO_SLUG_ALIASES[slug] ?? slug;
  if (!DEAPI_VIDEO[slug]) slug = "deapi-ltx-video";
  const cfg = DEAPI_VIDEO[slug];

  const duration = Math.max(2, Math.min(10, Number(body?.duration ?? 5) || 5));
  const aspectRatio = typeof body?.aspect_ratio === "string" ? body.aspect_ratio : undefined;
  const startFrame = typeof body?.start_frame === "string" ? body.start_frame : undefined;

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  let userId: string | null = null;
  if (token) {
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? SERVICE_KEY);
    const { data: userData } = await userClient.auth.getUser(token);
    userId = userData?.user?.id ?? null;
  }
  if (!userId) {
    return json({ error: true, paywall: true, message: "سجّل الدخول أولًا لإنشاء الفيديو." });
  }

  try {
    const key = await resolveApiKey(admin);
    if (!key) throw new Error("video service is not configured");
    const id = await deapiVideoSubmit({
      key,
      model: cfg.api,
      prompt,
      steps: cfg.steps,
      fps: cfg.fps,
      duration,
      aspectRatio,
      image: startFrame,
    });
    return json({ job_id: `deapi:${id}`, provider: "megsy", model_slug: slug, model_name: "Megsy Video" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "video generation failed";
    return json({ error: true, message: msg }, 502);
  }
}

// ===================== connected-app agent tools =====================
// Uses the connected-apps credentials already stored as function secrets, so
// the browser only ever sends its own session token.

const TOOLS_API = "https://api.pipedream.com/v1";

function toolsConfig() {
  const pick = (...names: string[]) => {
    for (const n of names) {
      const v = Deno.env.get(n);
      if (v) return v;
    }
    return undefined;
  };
  const clientId = pick("PIPEDREAM_CLIENT_ID", "PIPEDREAM_OAUTH_CLIENT_ID");
  const clientSecret = pick("PIPEDREAM_CLIENT_SECRET", "PIPEDREAM_OAUTH_CLIENT_SECRET");
  const projectId = pick("PIPEDREAM_PROJECT_ID", "PIPEDREAM_PROJECT");
  if (!clientId || !clientSecret || !projectId) return null;
  return {
    clientId,
    clientSecret,
    projectId,
    environment: pick("PIPEDREAM_ENVIRONMENT", "PIPEDREAM_ENV") ?? "production",
  };
}

type ToolsCfg = NonNullable<ReturnType<typeof toolsConfig>>;

let toolsToken: { value: string; expiresAt: number } | null = null;

async function toolsAccessToken(cfg: ToolsCfg): Promise<string> {
  if (toolsToken && toolsToken.expiresAt > Date.now() + 30_000) return toolsToken.value;
  const res = await fetch(`${TOOLS_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.access_token) throw new Error(`app tools auth failed [${res.status}]`);
  toolsToken = {
    value: String(data.access_token),
    expiresAt: Date.now() + Math.max(60_000, Number(data.expires_in ?? 3600) * 1000),
  };
  return toolsToken.value;
}

async function toolsFetchEnv(
  cfg: ToolsCfg,
  environment: string,
  path: string,
  init: { method?: string; body?: unknown; query?: Record<string, string | undefined> } = {},
) {
  const token = await toolsAccessToken(cfg);
  const url = new URL(`${TOOLS_API}/connect/${cfg.projectId}${path}`);
  for (const [k, v] of Object.entries(init.query ?? {})) if (v) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-PD-Environment": environment,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const detail = typeof data?.error === "string" ? data.error : text.slice(0, 300);
    throw new Error(`app request failed [${res.status}]: ${detail}`);
  }
  return data;
}

/** Tries the configured environment, then the alternate one (accounts may be linked in either). */
async function toolsFetch(
  cfg: ToolsCfg,
  path: string,
  init: { method?: string; body?: unknown; query?: Record<string, string | undefined> } = {},
) {
  const alt = cfg.environment === "production" ? "development" : "production";
  try {
    return await toolsFetchEnv(cfg, cfg.environment, path, init);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/404|not found/i.test(msg)) return await toolsFetchEnv(cfg, alt, path, init);
    throw e;
  }
}

const toolsAppSlug = (a: any) =>
  a?.app?.name_slug ?? a?.app?.slug ?? a?.app_slug ?? a?.appSlug ?? null;

/** Pipedream actions need the connected account passed as their `app` prop. */
async function toolsWithAuth(
  cfg: ToolsCfg,
  admin: ReturnType<typeof createClient>,
  userId: string,
  toolId: string,
  appHint: string,
  configured: Record<string, any>,
): Promise<Record<string, any>> {
  const props = { ...(configured ?? {}) };
  let authProps: { name: string; app: string }[] = [];
  try {
    const meta = await toolsFetch(cfg, `/components/${encodeURIComponent(toolId)}`);
    const list: any[] = meta?.data?.configurable_props ?? meta?.configurable_props ?? [];
    authProps = list
      .filter((p) => p?.type === "app" && p?.name)
      .map((p) => ({ name: String(p.name), app: String(p.app ?? appHint) }));
  } catch (_e) {
    // fall back to slug-derived guess below
  }
  if (!authProps.length && appHint) {
    const camel = appHint.replace(/_([a-z])/g, (_m, c) => c.toUpperCase());
    authProps = [{ name: camel, app: appHint }];
  }
  for (const p of authProps) {
    if (props[p.name]) continue;
    const { data: acc } = await admin
      .from("pipedream_accounts")
      .select("account_id")
      .eq("user_id", userId)
      .eq("app_slug", p.app || appHint)
      .maybeSingle();
    const accountId = (acc as any)?.account_id;
    if (accountId) props[p.name] = { authProvisionId: String(accountId) };
  }
  return props;
}

/** The external-user namespace the app's account was linked under. */
async function toolsExternalUser(
  admin: ReturnType<typeof createClient>,
  userId: string,
  fallback: string,
  app: string,
): Promise<string> {
  if (!app) return fallback;
  const { data } = await admin
    .from("pipedream_accounts")
    .select("external_user_id")
    .eq("user_id", userId)
    .eq("app_slug", app)
    .maybeSingle();
  const ext = (data as any)?.external_user_id;
  return ext ? String(ext) : fallback;
}

async function handleTools(
  req: Request,
  admin: ReturnType<typeof createClient>,
  body: any,
): Promise<Response> {
  const action = String(body?.action ?? "").trim();
  if (!action) return json({ ok: false, error: "Missing action" }, 400);

  const token = String(
    body?.token ?? (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, ""),
  );
  const { data: userData } = await admin.auth.getUser(token);
  const userId = userData?.user?.id;
  if (!userId) return json({ ok: false, error: "Sign in first" }, 401);

  const cfg = toolsConfig();
  if (!cfg) {
    if (action === "list") return json({ ok: true, configured: false, apps: [] });
    return json({ ok: false, error: "App tools are not configured yet" }, 400);
  }

  // Same external-user convention as the account-linking function.
  const externalUserId = `megsy_${userId}`;

  try {
    if (action === "list") {
      let rows: any[] = [];
      const accounts: any[] = [];
      for (const ext of [externalUserId, userId]) {
        try {
          const data = await toolsFetch(cfg, "/accounts", {
            query: { external_user_id: ext, limit: "100" },
          });
          if (Array.isArray(data?.data)) {
            for (const a of data.data) accounts.push({ ...a, _ext: ext });
          }
        } catch (_e) {
          // ignore: this external-user namespace may not exist
        }
      }
      const seen = new Set<string>();
      rows = accounts
        .map((a) => {
          const slug = toolsAppSlug(a);
          if (!slug || !a?.id || seen.has(String(slug))) return null;
          seen.add(String(slug));
          return {
            user_id: userId,
            external_user_id: String(a._ext ?? externalUserId),
            app_slug: String(slug),
            account_id: String(a.id),
            account_name: String(a.name ?? a.external_id ?? slug),
            healthy: a.healthy !== false,
            metadata: { app_name: a?.app?.name ?? null },
            updated_at: new Date().toISOString(),
          };
        })
        .filter(Boolean) as any[];
      if (rows.length) {
        await admin.from("pipedream_accounts").upsert(rows, { onConflict: "user_id,app_slug" });
      }
      // Merge in accounts linked through the connect flow (stored locally).
      {
        const { data } = await admin
          .from("pipedream_accounts")
          .select("app_slug, account_id, account_name, healthy")
          .eq("user_id", userId);
        for (const r of (data as any[]) ?? []) {
          const slug = String(r.app_slug ?? "");
          if (!slug || seen.has(slug)) continue;
          seen.add(slug);
          rows.push(r);
        }
      }

      const { data: prefs } = await admin
        .from("pipedream_tool_settings")
        .select("app_slug, enabled")
        .eq("user_id", userId);
      const off = new Set(
        ((prefs as any[]) ?? []).filter((r) => r.enabled === false).map((r) => String(r.app_slug)),
      );

      return json({
        ok: true,
        configured: true,
        apps: rows.map((a) => ({
          app: String(a.app_slug),
          account_id: String(a.account_id ?? ""),
          account_name: a.account_name ?? null,
          healthy: a.healthy !== false,
          enabled: !off.has(String(a.app_slug)),
        })),
      });
    }

    if (action === "actions") {
      const app = String(body?.app ?? "").trim();
      if (!app) return json({ ok: false, error: "Missing app" }, 400);
      const data = await toolsFetch(cfg, "/actions", { query: { app, limit: "100" } });
      const list: any[] = Array.isArray(data?.data) ? data.data : [];
      return json({
        ok: true,
        app,
        tools: list.map((a) => ({
          key: String(a?.key ?? a?.id ?? ""),
          app,
          name: String(a?.name ?? a?.key ?? "Action"),
          description: String(a?.description ?? "").slice(0, 400),
          version: a?.version ? String(a.version) : undefined,
        })),
      });
    }

    if (action === "props") {
      const tool = String(body?.tool ?? "");
      if (!tool) return json({ ok: false, error: "Missing tool" }, 400);
      const appHint = String(body?.app ?? tool.split("-")[0] ?? "").trim();
      const configured = await toolsWithAuth(
        cfg,
        admin,
        userId,
        tool,
        appHint,
        body?.configured_props ?? {},
      );
      const extUser = await toolsExternalUser(admin, userId, externalUserId, appHint);
      const data = await toolsFetch(cfg, "/actions/configure", {
        method: "POST",
        body: {
          external_user_id: extUser,

          id: tool,
          prop_name: body?.prop_name,
          configured_props: configured,
          query: body?.query,
        },
      });
      return json({ ok: true, result: data });
    }

    if (action === "run") {
      const tool = String(body?.tool ?? "");
      if (!tool) return json({ ok: false, error: "Missing tool" }, 400);
      const app = String(body?.app ?? tool.split("-")[0] ?? "").trim();
      if (app) {
        const { data: setting } = await admin
          .from("pipedream_tool_settings")
          .select("enabled")
          .eq("user_id", userId)
          .eq("app_slug", app)
          .maybeSingle();
        if (setting && (setting as any).enabled === false) {
          return json({ ok: false, error: "This app is turned off for the assistant" }, 403);
        }
      }
      const configured = await toolsWithAuth(
        cfg,
        admin,
        userId,
        tool,
        app,
        body?.configured_props ?? {},
      );
      const extUser = await toolsExternalUser(admin, userId, externalUserId, app);
      const data = await toolsFetch(cfg, "/actions/run", {
        method: "POST",
        body: {
          external_user_id: extUser,

          id: tool,
          configured_props: configured,
        },
      });
      return json({ ok: true, result: data?.ret ?? data, exports: data?.exports ?? null });
    }

    // Creates a link session in the same environment the tool runtime uses,
    // so newly connected apps can actually run actions.
    if (action === "connect") {
      const data = await toolsFetch(cfg, "/tokens", {
        method: "POST",
        body: {
          external_user_id: externalUserId,
          allowed_origins: Array.isArray(body?.allowed_origins)
            ? body.allowed_origins
            : body?.redirect_origin
              ? [String(body.redirect_origin)]
              : undefined,
        },
      });
      const link = data?.connect_link_url ?? data?.connectLinkUrl ?? null;
      if (!link) return json({ ok: false, error: "Could not start the connection" }, 500);
      return json({ ok: true, connect_link_url: String(link), token: data?.token ?? null });
    }

    if (action === "set_enabled") {
      const app = String(body?.app ?? "").trim();
      if (!app) return json({ ok: false, error: "Missing app" }, 400);
      const enabled = body?.enabled !== false;
      const { error } = await admin
        .from("pipedream_tool_settings")
        .upsert(
          { user_id: userId, app_slug: app, enabled, updated_at: new Date().toISOString() },
          { onConflict: "user_id,app_slug" },
        );
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, app, enabled });
    }

    return json({ ok: false, error: "Unknown action" }, 400);
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "tools_failed" }, 500);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json().catch(() => ({}));

    // connected-app tools (list / actions / props / run / set_enabled)
    if (body?.kind === "tools" || body?.tools === true) {
      return await handleTools(req, createClient(SUPABASE_URL, SERVICE_KEY), body);
    }

    // ready-made API apps (bring your own key)
    if (body?.kind === "api_app") {
      const { handleApiApp } = await import("./apiAppRunner.ts");
      return await handleApiApp(req, createClient(SUPABASE_URL, SERVICE_KEY), body);
    }

    // Telegram-backed file storage (upload / resolve / list / status)
    if (body?.kind === "telegram_storage") {
      const { handleTelegramStorage } = await import("./telegramStorage.ts");
      return await handleTelegramStorage(req, body);
    }

    // video generation
    if (body?.kind === "video" || body?.media === "video") {
      return await handleVideo(req, createClient(SUPABASE_URL, SERVICE_KEY), body);
    }

    // video job status
    if (body?.kind === "video_poll" && typeof body?.job_id === "string") {
      return await pollVideoJob(createClient(SUPABASE_URL, SERVICE_KEY), body.job_id);
    }


    const prompt = String(body?.prompt ?? "").trim();
    if (!prompt) return json({ error: true, message: "prompt is required" }, 400);

    const rawImages: unknown =
      body?.reference_image_urls ?? body?.reference_image_url ?? body?.image_url ?? body?.images;
    const images: string[] = (Array.isArray(rawImages) ? rawImages : rawImages ? [rawImages] : [])
      .map((u) => String(u))
      .filter((u) => /^https?:\/\//.test(u));
    const aspectRatio = typeof body?.aspect_ratio === "string" ? body.aspect_ratio : undefined;

    let slug = String(body?.model_slug ?? "").trim();
    slug = SLUG_ALIASES[slug] ?? slug;
    const fits = (s: string) =>
      !!DEAPI_MODELS[s] && (images.length ? DEAPI_MODELS[s].edit : DEAPI_MODELS[s].t2i);
    if (!fits(slug)) slug = images.length ? "deapi-flux-2-klein" : "deapi-flux-schnell";

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    let userId: string | null = null;
    if (token) {
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? SERVICE_KEY);
      const { data: userData } = await userClient.auth.getUser(token);
      userId = userData?.user?.id ?? null;
    }
    if (!userId) {
      return json({ error: true, paywall: true, message: "سجّل الدخول أولًا لإنشاء الصور." });
    }

    const { data: paidResult, error: paidError } = await admin.rpc("has_paid_plan", {
      p_user_id: userId,
    });
    if (paidError) {
      return json({ error: true, message: "تعذّر التحقق من اشتراكك، حاول تاني." }, 503);
    }
    const isPaid = paidResult === true;

    // Free accounts keep their daily image allowance.
    let freeImageReservationId: string | null = null;
    if (!isPaid) {
      const { data: quota, error: quotaError } = await admin.rpc("consume_free_wan_image", {
        p_user_id: userId,
      });
      if (quotaError) {
        return json({ error: true, message: "تعذّر التحقق من حصة الصور اليومية، حاول تاني." }, 503);
      }
      const q: any = quota ?? {};
      if (q.allowed !== true) {
        return json({
          error: true,
          paywall: true,
          message: "استخدمت الصور المجانية لليوم. جرّب تاني بكرة أو اشترك.",
          remaining: 0,
        }, 402);
      }
      freeImageReservationId = typeof q.generation_id === "string" ? q.generation_id : null;
    }

    const attempts = [slug, ...(IMAGE_FALLBACK_CHAIN[slug] ?? [])].filter(
      (s, i, arr) => arr.indexOf(s) === i && fits(s),
    );

    try {
      const key = await resolveApiKey(admin);
      if (!key) throw new Error("image service is not configured");
      let done: { url: string; slug: string } | null = null;
      let lastErr: unknown = null;
      for (const attemptSlug of attempts) {
        try {
          const url = await deapiGenerate({
            key,
            model: DEAPI_MODELS[attemptSlug].api,
            prompt,
            images,
            aspectRatio,
            steps: DEAPI_MODELS[attemptSlug].steps,
          });
          done = { url, slug: attemptSlug };
          break;
        } catch (err) {
          lastErr = err;
          console.error(`image attempt failed (${attemptSlug}):`, err);
        }
      }
      if (!done) throw lastErr ?? new Error("image generation failed");
      if (freeImageReservationId) {
        const { error: finalizeError } = await admin
          .from("image_generations")
          .update({ model: done.slug, status: "completed" })
          .eq("id", freeImageReservationId)
          .eq("user_id", userId);
        if (finalizeError) console.error("image quota finalize failed", finalizeError.message);
      }
      return json({
        image_url: done.url,
        image_urls: [done.url],
        provider: "megsy",
        model_slug: done.slug,
        model_name: "Megsy Image",
        fell_back: done.slug !== slug,
      });
    } catch (e) {
      if (freeImageReservationId) {
        await admin
          .from("image_generations")
          .delete()
          .eq("id", freeImageReservationId)
          .eq("user_id", userId);
      }
      const msg = e instanceof Error ? e.message : "image generation failed";
      return json({ error: true, message: msg }, 502);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unexpected error";
    return json({ error: true, message: msg }, 500);
  }
});
