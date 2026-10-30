/** Browserbase page reader for agents (server-only).
 *  Keys come from the encrypted `service_keys` vault (provider "browserbase"),
 *  least-recently-used first, decrypted with KEY_VAULT_SECRET. Falls back to the
 *  BROWSERBASE_API_KEY env var. Plaintext keys never leave this module. */
import { createClient } from "@supabase/supabase-js";

const MAX_OUTPUT = 8000;
const clip = (s: string) => (s.length > MAX_OUTPUT ? `${s.slice(0, MAX_OUTPUT)}\n…[truncated]` : s);
const unb64 = (v: string) => Uint8Array.from(atob(v), (c) => c.charCodeAt(0));

function admin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function decrypt(cipher: string, iv: string): Promise<string | null> {
  const secret = process.env.KEY_VAULT_SECRET?.trim();
  if (!secret) return null;
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
    const key = await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
      "decrypt",
    ]);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, key, unb64(cipher));
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

type VaultKey = { id: string | null; key: string };

async function browserbaseKeys(): Promise<VaultKey[]> {
  const out: VaultKey[] = [];
  const db = admin();
  if (db) {
    const { data } = await db
      .from("service_keys")
      .select("id,key_cipher,key_iv")
      .eq("provider", "browserbase")
      .eq("status", "active")
      .order("last_used_at", { ascending: true, nullsFirst: true })
      .limit(5);
    for (const row of data ?? []) {
      const key = await decrypt(row.key_cipher, row.key_iv);
      if (key) out.push({ id: row.id, key });
    }
  }
  const env = process.env.BROWSERBASE_API_KEY?.trim();
  if (env) out.push({ id: null, key: env });
  return out;
}

async function markKey(id: string | null, ok: boolean, error?: string) {
  if (!id) return;
  const db = admin();
  if (!db) return;
  const now = new Date().toISOString();
  if (ok) {
    await db.from("service_keys").update({ last_used_at: now, fail_count: 0 }).eq("id", id);
    return;
  }
  const { data } = await db.from("service_keys").select("fail_count").eq("id", id).maybeSingle();
  const fails = Number(data?.fail_count ?? 0) + 1;
  await db
    .from("service_keys")
    .update({
      last_used_at: now,
      fail_count: fails,
      last_error: (error || "").slice(0, 300),
      ...(fails >= 3 ? { status: "banned", banned_at: now } : {}),
    })
    .eq("id", id);
}

export function browserbaseConfigured(): boolean {
  return Boolean(process.env.BROWSERBASE_API_KEY?.trim() || process.env.KEY_VAULT_SECRET?.trim());
}

/** Reads a page through Browserbase (real browser identity, optional proxies) as markdown. */
export async function browserbaseFetch(
  rawUrl: string,
  opts: { proxies?: boolean } = {},
): Promise<{ ok: boolean; output: string }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, output: "Invalid URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
    return { ok: false, output: "Only http/https URLs are allowed" };
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/i.test(parsed.hostname))
    return { ok: false, output: "Private network addresses are blocked" };

  const keys = await browserbaseKeys();
  if (!keys.length) return { ok: false, output: "Browserbase is not connected yet." };

  let last = "";
  for (const k of keys) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30_000);
      const resp = await fetch("https://api.browserbase.com/v1/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-BB-API-Key": k.key },
        body: JSON.stringify({
          url: parsed.toString(),
          allowRedirects: true,
          proxies: Boolean(opts.proxies),
          format: "markdown",
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (resp.status === 401 || resp.status === 403 || resp.status === 402 || resp.status === 429) {
        last = `Browserbase key rejected (${resp.status})`;
        await markKey(k.id, false, last);
        continue;
      }
      const body: any = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        last = `Browserbase fetch failed (${resp.status})`;
        continue;
      }
      await markKey(k.id, true);
      const content = String(body?.content ?? "").trim();
      const status = Number(body?.statusCode ?? 0);
      if (!content) return { ok: false, output: `Page returned no content (status ${status || "?"}).` };
      return { ok: status === 0 || status < 400, output: clip(content) };
    } catch (e: any) {
      last = `Browserbase error: ${String(e?.message || e).slice(0, 200)}`;
    }
  }
  return { ok: false, output: last || "Browserbase fetch failed" };
}

/** First http(s) URL mentioned in a free-form browser task, if any. */
export function firstUrl(task: string): string | null {
  const m = String(task || "").match(/https?:\/\/[^\s"'<>)]+/i);
  return m ? m[0].replace(/[.,;:!?]+$/, "") : null;
}
