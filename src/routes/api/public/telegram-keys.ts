/** Telegram bot that fills the provider key pools (Cerebras / AgentSky / Browser Use / deAPI).
 *  Only Telegram (verified by the webhook secret header) can call it; only
 *  registered admins can add, list or remove keys. The first person to send
 *  /start becomes the admin.
 *
 *  Rotation model (no new logic needed — it reuses the existing clean system):
 *  - Cerebras + Browser Use go to the encrypted `service_keys` vault
 *    (providers `cerebras` / `browser-use`). Edge runtime reads them
 *    least-recently-used first, bans a key after 3 consecutive failures and
 *    revives cooled-down keys automatically (`keyVault.ts`).
 *  - AgentSky keeps its existing `agentsky_keys` pool with LRU
 *    (`take_agentsky_key()`), unchanged.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";
import { validateAgentSkyKey } from "@/lib/agentsky/agentsky.server";
import { normalizeProvider, providerFromReply, type ProviderId } from "@/lib/telegramKeyProviders";

export function telegramWebhookSecret(token: string) {
  return createHash("sha256").update(`megsy-keys:${token}`).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const mask = (_k: string) => "مفتاح محفوظ";

const PROVIDERS: Record<ProviderId, { label: string; icon: string }> = {
  cerebras: { label: "Cerebras", icon: "🧠" },
  agentsky: { label: "AgentSky", icon: "🤖" },
  "browser-use": { label: "Browser Use", icon: "🌐" },
  deapi: { label: "deAPI", icon: "🎨" },
  plusai: { label: "Plus AI", icon: "📊" },
};

// Webhook instances are stateless, so the pending provider lives in memory AND
// every action also has an explicit command form (/add_cerebras KEY …) that
// works even if the instance restarted between the tap and the key message.
const pendingProvider = new Map<number, ProviderId>();

const HELP = [
  "🔑 <b>مفاتيح المزودين</b>",
  "",
  "اختار المزود من الأزرار، وبعدين ابعت المفتاح كرسالة عادية.",
  "رد على رسالة اختيار المزود، أو ابعت مباشرة: <code>/add_cerebras KEY</code> أو <code>/add_agentsky KEY</code> أو <code>/add_browseruse KEY</code> أو <code>/add_deapi KEY</code> أو <code>/add_plusai KEY</code>",
  "",
  "/keys — عرض كل المزودين",
  "/keys_cerebras — مفاتيح Cerebras",
  "/keys_agentsky — مفاتيح AgentSky",
  "/keys_browseruse — مفاتيح Browser Use",
  "/keys_deapi — مفاتيح deAPI",
  "/keys_plusai — مفاتيح Plus AI",
  "/del_cerebras رقم — حذف مفتاح",
  "/on_cerebras رقم — تفعيل مفتاح",
  "(نفس الصيغة لـ agentsky و browseruse و deapi)",
].join("\n");

function providerMenu() {
  return {
    inline_keyboard: [
      [
        { text: "🧠 Cerebras", callback_data: "keys:provider:cerebras" },
        { text: "🤖 AgentSky", callback_data: "keys:provider:agentsky" },
      ],
      [
        { text: "🌐 Browser Use", callback_data: "keys:provider:browser-use" },
        { text: "🎨 deAPI", callback_data: "keys:provider:deapi" },
      ],
      [{ text: "📊 Plus AI", callback_data: "keys:provider:plusai" }],
      [{ text: "📊 الإحصائيات", callback_data: "keys:stats" }],
    ],
  };
}

async function validateCerebrasKey(key: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.cerebras.ai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    // 401/403 = bad key. Anything else (200, 404, 405…) means auth passed.
    if (res.status === 401 || res.status === 403) return false;
    return res.ok;
  } catch {
    return false;
  }
}

async function validateBrowserUseKey(key: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.browser-use.com/api/v2/tasks", {
      headers: { "X-Browser-Use-API-Key": key },
    });
    // Credit/auth rejections belong to the key → invalid for rotation.
    if ([401, 402, 403].includes(res.status)) return false;
    return res.ok;
  } catch {
    return false;
  }
}

async function validateDeapiKey(key: string): Promise<boolean> {
  try {
    // Generation-only keys may lack the balance permission (403), so check the
    // model list, which every working key can read.
    const res = await fetch("https://api.deapi.ai/api/v1/client/models?per_page=1", {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

function vaultAvailable() {
  return Boolean(process.env.KEY_VAULT_SECRET?.trim());
}

/** Node-side AES-GCM encryption compatible with supabase/functions/_shared/keyVault.ts */
async function encryptVaultKey(plain: string): Promise<{ cipher: string; iv: string } | null> {
  const secret = process.env.KEY_VAULT_SECRET?.trim();
  if (!secret) return null;
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
    const aesKey = await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
      "encrypt",
    ]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      new TextEncoder().encode(plain),
    );
    const toB64 = (buf: ArrayBuffer) => Buffer.from(buf).toString("base64");
    const toB64Bytes = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");
    return { cipher: toB64(enc), iv: toB64Bytes(iv) };
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/telegram-keys")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const gatewayKey = process.env.TELEGRAM_API_KEY;
        const gatewayAuth = process.env.LOVABLE_API_KEY;
        const token = gatewayKey || process.env.TELEGRAM_KEYS_BOT_TOKEN;
        if (!token || (gatewayKey && !gatewayAuth)) return new Response("not configured", { status: 500 });
        const header = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(header, telegramWebhookSecret(token)))
          return new Response("Unauthorized", { status: 401 });

        const update = await request.json().catch(() => null);
        const telegramCall = async (method: string, body: unknown) => {
          const response = await fetch(gatewayKey ? `https://connector-gateway.lovable.dev/telegram/${method}` : `https://api.telegram.org/bot${token}/${method}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(gatewayKey ? { Authorization: `Bearer ${gatewayAuth}`, "X-Connection-Api-Key": gatewayKey } : {}) },
            body: JSON.stringify(body),
          });
          const result = await response.json().catch(() => null);
          if (!response.ok || result?.ok !== true) {
            // Never include provider text: it may echo request credentials.
            throw new Error(`Telegram ${method} failed (${response.status})`);
          }
          return result;
        };
        const send = (chatId: number, text: string, replyMarkup?: unknown) =>
          telegramCall("sendMessage", {
              chat_id: chatId, text, parse_mode: "HTML",
              ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
          });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        const { data: admins, error: adminError } = await db.from("telegram_key_admins").select("telegram_user_id");
        if (adminError) return new Response("Admin lookup unavailable", { status: 503 });
        const isAdminUser = (id: number) =>
          (admins ?? []).some((a: any) => Number(a.telegram_user_id) === Number(id));

        // ---- Inline button taps (callback_query) ----
        const callback = update?.callback_query;
        if (callback) {
          const fromId = Number(callback?.from?.id);
          const chatId = Number(callback?.message?.chat?.id);
          const data = String(callback?.data ?? "");
          await telegramCall("answerCallbackQuery", { callback_query_id: callback.id }).catch(() => undefined);
          if (!chatId || !fromId || !isAdminUser(fromId)) return Response.json({ ok: true });

          if (data === "keys:stats") {
            const { data: rows } = await db.from("service_keys").select("provider,status");
            const counts: Record<string, { active: number; banned: number }> = {};
            for (const r of (rows ?? []) as Array<{ provider: string; status: string }>) {
              counts[r.provider] ??= { active: 0, banned: 0 };
              if (r.status === "banned") counts[r.provider].banned += 1;
              else counts[r.provider].active += 1;
            }
            const { data: agents } = await db.from("agentsky_keys").select("id,active");
            const aActive = (agents ?? []).filter((r: any) => r.active).length;
            const aOff = (agents ?? []).length - aActive;
            await send(
              chatId,
              [
                "📊 <b>المفاتيح</b>",
                `🧠 Cerebras: ${counts["cerebras"]?.active ?? 0} نشط / ${counts["cerebras"]?.banned ?? 0} محظور`,
                `🤖 AgentSky: ${aActive} نشط / ${aOff} متوقف`,
                `🌐 Browser Use: ${counts["browser-use"]?.active ?? 0} نشط / ${counts["browser-use"]?.banned ?? 0} محظور`,
                `🎨 deAPI: ${counts["deapi"]?.active ?? 0} نشط / ${counts["deapi"]?.banned ?? 0} محظور`,
                `📊 Plus AI: ${counts["plusai"]?.active ?? 0} محفوظ`,
                "",
                "التدوير تلقائي: الأقل استخدامًا أولًا، وحظر بعد 3 فشل متتالي مع إحياء تلقائي.",
              ].join("\n"),
              providerMenu(),
            );
            return Response.json({ ok: true });
          }

          const picked = data.startsWith("keys:provider:")
            ? normalizeProvider(data.slice(15))
            : null;
          if (picked) {
            pendingProvider.set(fromId, picked);
            const p = PROVIDERS[picked];
            await send(
              chatId,
              `KEY_PROVIDER:${picked}\n${p.icon} <b>${p.label}</b>\n\nرد على الرسالة دي بالمفتاح، أو استخدم:\n<code>/add_${picked.replace("-", "")} KEY</code>`,
              { force_reply: true, selective: true },
            );
          }
          return Response.json({ ok: true });
        }

        const msg = update?.message;
        const chatId = msg?.chat?.id;
        const fromId = msg?.from?.id;
        const text = String(msg?.text ?? "").trim();
        if (!chatId || !fromId || !text) return Response.json({ ok: true });
        const reply = (body: string, markup?: unknown) => send(chatId, body, markup);

        let isAdmin = isAdminUser(fromId);
        if (!isAdmin && (admins ?? []).length === 0 && text.startsWith("/start")) {
          const { error } = await db.from("telegram_key_admins").insert({ telegram_user_id: fromId });
          isAdmin = !error;
        }
        if (!isAdmin) {
          await reply("غير مسموح.");
          return Response.json({ ok: true });
        }

        const listAgentsky = async () => {
          const { data } = await db
            .from("agentsky_keys")
            .select("id,key_value,active,last_used_at,last_error")
            .order("created_at");
          return (data ?? []) as any[];
        };
        const listVault = async (provider: string) => {
          const { data } = await db
            .from("service_keys")
            .select("id,key_hint,status,last_error,last_used_at")
            .eq("provider", provider)
            .order("created_at");
          return (data ?? []) as any[];
        };
        const formatVaultRows = (rows: any[], icon: string, label: string) =>
          rows.length
            ? [
                `${icon} <b>${label}</b>`,
                ...rows.map(
                  (r, i) =>
                    `${i + 1}. <code>مفتاح محفوظ</code> ${r.status === "banned" ? "⛔" : "🟢"}`,
                ),
              ].join("\n")
            : `${icon} <b>${label}</b>\nمفيش مفاتيح لسه.`;

        const addKey = async (provider: ProviderId, key: string) => {
          if (provider === "agentsky") {
            const ok = await validateAgentSkyKey(key).catch(() => false);
            if (!ok) {
              await reply("المفتاح ده مش شغال عند المزود ❌");
              return;
            }
            const { error } = await db
              .from("agentsky_keys")
              .insert({ key_value: key, added_by_telegram: fromId });
            await reply(
              error
                ? error.code === "23505"
                  ? "المفتاح ده متضاف قبل كده."
                  : "حصلت مشكلة في الحفظ."
                : `اتضاف ${mask(key)} ✅`,
            );
            return;
          }
          const vaultProvider = provider;
          const ok =
            provider === "plusai" ? true : provider === "cerebras"
              ? await validateCerebrasKey(key)
              : provider === "deapi"
                ? await validateDeapiKey(key)
                : await validateBrowserUseKey(key);
          if (!ok) {
            await reply("المفتاح ده مش شغال عند المزود ❌");
            return;
          }
          if (!vaultAvailable()) {
            await reply(
              "KEY_VAULT_SECRET مش متظبط على السيرفر — المفتاح سليم لكن الحفظ المشفر متوقف ❌",
            );
            return;
          }
          const enc = await encryptVaultKey(key.trim());
          if (!enc) {
            await reply("حصلت مشكلة في التشفير قبل الحفظ ❌");
            return;
          }
          const { error } = await db.from("service_keys").insert({
            provider: vaultProvider,
            key_cipher: enc.cipher,
            key_iv: enc.iv,

            label: provider === "plusai" ? "telegram:unverified" : "telegram",
            status: "active",
            fail_count: 0,
            success_count: 0,
          });
          await reply(
            error
              ? "حصلت مشكلة في الحفظ."
              : provider === "plusai"
                ? "اتحفظ مفتاح Plus AI مشفّر ✅ — لسه غير متحقق منه، وتشغيله في إنشاء العروض محتاج توصيل الخدمة."
                : "اتحفظ المفتاح ✅\nهيدخل التدوير تلقائيًا (الأقل استخدامًا أولًا).",
          );
        };

        // ---- Commands ----
        if (text.startsWith("/start") || text.startsWith("/help")) {
          pendingProvider.delete(fromId);
          await reply(HELP, providerMenu());
          return Response.json({ ok: true });
        }

        const addMatch = text.match(
          /^\/add[_-]?(cerebras|agentsky|agent|browseruse|browser-use|browser|deapi|plusai|plus-ai|plus_ai|plus)\s+(\S+)\s*$/i,
        );
        if (addMatch) {
          const provider = normalizeProvider(addMatch[1]);
          if (provider) {
            pendingProvider.delete(fromId);
            await addKey(provider, addMatch[2]);
            return Response.json({ ok: true });
          }
        }

        const selectMatch = text.match(
          /^\/(cerebras|agentsky|agent|browseruse|browser-use|browser|deapi|plusai|plus-ai|plus_ai|plus)\s*$/i,
        );
        if (selectMatch) {
          const provider = normalizeProvider(selectMatch[1]);
          if (provider) {
            pendingProvider.set(fromId, provider);
            const p = PROVIDERS[provider];
            await reply(`KEY_PROVIDER:${provider}\n${p.icon} <b>${p.label}</b>\n\nرد على الرسالة دي بالمفتاح.`, { force_reply: true, selective: true });
            return Response.json({ ok: true });
          }
        }

        if (/^\/keys(?=$|[\s_-])/i.test(text)) {
          const rest = text
            .replace(/^\/keys(?=$|[\s_-])/i, "")
            .trim()
            .replace(/_/g, "-")
            .replace(/^-+/, "");
          const only = rest ? normalizeProvider(rest) : null;
          if (only === "cerebras" || only === "browser-use" || only === "deapi" || only === "plusai") {
            const vaultProvider = only;
            await reply(
              formatVaultRows(
                await listVault(vaultProvider),
                PROVIDERS[only].icon,
                PROVIDERS[only].label,
              ),
              providerMenu(),
            );
          } else if (only === "agentsky") {
            const rows = await listAgentsky();
            await reply(
              rows.length
                ? [
                    "🤖 <b>AgentSky</b>",
                    ...rows.map(
                      (r, i) =>
                        `${i + 1}. <code>${mask(r.key_value)}</code> ${r.active ? "🟢" : "🔴"}`,
                    ),
                  ].join("\n")
                : "🤖 <b>AgentSky</b>\nمفيش مفاتيح لسه.",
              providerMenu(),
            );
          } else if (/^\/keys$/i.test(text)) {
            const [c, b, a, d, plus] = await Promise.all([
              listVault("cerebras"),
              listVault("browser-use"),
              listAgentsky(),
              listVault("deapi"),
              listVault("plusai"),
            ]);
            await reply(
              [
                formatVaultRows(c, "🧠", "Cerebras"),
                "",
                formatVaultRows(b, "🌐", "Browser Use"),
                "",
                formatVaultRows(d, "🎨", "deAPI"),
                formatVaultRows(plus, "📊", "Plus AI"),
                "",
                a.length
                  ? [
                      "🤖 <b>AgentSky</b>",
                      ...a.map(
                        (r, i) =>
                          `${i + 1}. <code>${mask(r.key_value)}</code> ${r.active ? "🟢" : "🔴"}`,
                      ),
                    ].join("\n")
                  : "🤖 <b>AgentSky</b>\nمفيش مفاتيح لسه.",
              ].join("\n"),
              providerMenu(),
            );
          } else {
            await reply(HELP, providerMenu());
          }
          return Response.json({ ok: true });
        }

        const modMatch = text.match(
          /^\/(del|on)[_-]?(cerebras|agentsky|agent|browseruse|browser-use|browser|deapi|plusai|plus-ai|plus_ai|plus)?\s+(\d+)\s*$/i,
        );
        if (modMatch) {
          const cmd = modMatch[1].toLowerCase();
          const provider = normalizeProvider(modMatch[2] || "agentsky") ?? "agentsky";
          const n = Number(modMatch[3]);
          if (provider === "agentsky") {
            const row = (await listAgentsky())[n - 1];
            if (!row) await reply("الرقم ده مش موجود.");
            else if (cmd === "del") {
              await db.from("agentsky_keys").delete().eq("id", row.id);
              await reply(`اتحذف ${mask(row.key_value)} ✅`);
            } else {
              await db
                .from("agentsky_keys")
                .update({ active: true, last_error: null })
                .eq("id", row.id);
              await reply(`اتفعل ${mask(row.key_value)} ✅`);
            }
          } else {
            const vaultProvider = provider;
            const row = (await listVault(vaultProvider))[n - 1];
            if (!row) await reply("الرقم ده مش موجود.");
            else if (cmd === "del") {
              await db.from("service_keys").delete().eq("id", row.id);
              await reply(`اتحذف مفتاح محفوظ ✅`);
            } else {
              await db
                .from("service_keys")
                .update({ status: "active", fail_count: 0, banned_at: null, last_error: null })
                .eq("id", row.id);
              await reply(`اتفعل مفتاح محفوظ ✅`);
            }
          }
          return Response.json({ ok: true });
        }

        // Backward-compatible: /del N and /on N manage AgentSky keys.
        if (/^\/(del|on)\s+\d+/.test(text)) {
          const [cmd, n] = text.split(/\s+/);
          const row = (await listAgentsky())[Number(n) - 1];
          if (!row) await reply("الرقم ده مش موجود.");
          else if (cmd === "/del") {
            await db.from("agentsky_keys").delete().eq("id", row.id);
            await reply(`اتحذف ${mask(row.key_value)} ✅`);
          } else {
            await db
              .from("agentsky_keys")
              .update({ active: true, last_error: null })
              .eq("id", row.id);
            await reply(`اتفعل ${mask(row.key_value)} ✅`);
          }
          return Response.json({ ok: true });
        }

        // Plain key message → pending provider (button-selected) or AgentSky legacy.
        if (/^\S{20,300}$/.test(text)) {
          const provider = providerFromReply(String(msg?.reply_to_message?.text ?? "")) ?? pendingProvider.get(fromId);
          if (!provider) {
            await reply("اختار المزود ورد على رسالة الاختيار، أو استخدم أمر /add باسم المزود.", providerMenu());
            return Response.json({ ok: true });
          }
          pendingProvider.delete(fromId);
          await addKey(provider, text);
          return Response.json({ ok: true });
        }

        await reply(HELP, providerMenu());
        return Response.json({ ok: true });
      },
    },
  },
});
