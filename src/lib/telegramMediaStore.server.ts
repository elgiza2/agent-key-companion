/** Generated photos/videos archived on Telegram instead of database storage (server-only).
 *  Files are sent as documents (no recompression) to the storage chat: the
 *  TELEGRAM_STORAGE_CHAT_ID env var, else the chat registered with the keys
 *  bot's /storage command, else the first key-bot admin's private chat.
 *  The bot can only download files up to 20 MB again, so larger files stay
 *  with the original provider link. The bot token never reaches the browser:
 *  bytes are streamed through our own route. */
const MAX_ARCHIVE_BYTES = 19 * 1024 * 1024;
const FILE_PATH_TTL_MS = 50 * 60 * 1000;
export const STORAGE_CHAT_KEY = "__storage_chat__";

function botToken(): string | null {
  return process.env.TELEGRAM_KEYS_BOT_TOKEN?.trim() || null;
}

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function storageChatId(): Promise<string | null> {
  const env = process.env.TELEGRAM_STORAGE_CHAT_ID?.trim();
  if (env) return env;
  const client = await db();
  const { data: cfg } = await client
    .from("telegram_media_files")
    .select("file_id")
    .eq("source_key", STORAGE_CHAT_KEY)
    .maybeSingle();
  if (cfg?.file_id) return String(cfg.file_id);
  const { data: admin } = await client
    .from("telegram_key_admins")
    .select("telegram_user_id")
    .limit(1)
    .maybeSingle();
  return admin?.telegram_user_id ? String(admin.telegram_user_id) : null;
}

export async function setStorageChat(chatId: number | string): Promise<void> {
  const client = await db();
  await client
    .from("telegram_media_files")
    .upsert({ source_key: STORAGE_CHAT_KEY, file_id: String(chatId), mime: "config" });
}

type Archived = { fileId: string; filePath: string | null; filePathAt: string | null; mime: string | null };

export async function findArchived(sourceKey: string): Promise<Archived | null> {
  const client = await db();
  const { data } = await client
    .from("telegram_media_files")
    .select("file_id,file_path,file_path_at,mime")
    .eq("source_key", sourceKey)
    .maybeSingle();
  return data
    ? { fileId: data.file_id, filePath: data.file_path, filePathAt: data.file_path_at, mime: data.mime }
    : null;
}

async function freshFilePath(sourceKey: string, a: Archived): Promise<string | null> {
  if (a.filePath && a.filePathAt && Date.now() - new Date(a.filePathAt).getTime() < FILE_PATH_TTL_MS)
    return a.filePath;
  const token = botToken();
  if (!token) return null;
  const r = await fetch(`https://api.telegram.org/bot${token}/getFile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: a.fileId }),
  });
  const j: any = await r.json().catch(() => null);
  const path = j?.ok ? String(j.result?.file_path || "") : "";
  if (!path) return null;
  const client = await db();
  await client
    .from("telegram_media_files")
    .update({ file_path: path, file_path_at: new Date().toISOString() })
    .eq("source_key", sourceKey);
  return path;
}

/** Streams an archived file from Telegram, honouring Range requests. */
export async function streamArchived(sourceKey: string, a: Archived, range: string | null): Promise<Response | null> {
  const token = botToken();
  if (!token) return null;
  const path = await freshFilePath(sourceKey, a);
  if (!path) return null;
  const upstream = await fetch(`https://api.telegram.org/file/bot${token}/${path}`, range ? { headers: { range } } : undefined);
  if (!upstream.ok && upstream.status !== 206) return null;
  const h = new Headers({ "Cache-Control": "private, max-age=86400" });
  if (a.mime) h.set("content-type", a.mime);
  for (const k of ["content-length", "content-range", "accept-ranges"]) {
    const v = upstream.headers.get(k);
    if (v) h.set(k, v);
  }
  return new Response(upstream.body, { status: upstream.status, headers: h });
}

/** Uploads bytes to the storage chat and records the file. Never throws. */
export async function archiveToTelegram(sourceKey: string, bytes: Uint8Array, mime: string): Promise<boolean> {
  try {
    if (!bytes.byteLength || bytes.byteLength > MAX_ARCHIVE_BYTES) return false;
    const token = botToken();
    const chatId = await storageChatId();
    if (!token || !chatId) return false;
    const ext = (mime.split("/")[1] || "bin").split(";")[0].replace("jpeg", "jpg");
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("disable_notification", "true");
    form.append("caption", `megsy:${sourceKey}`.slice(0, 200));
    form.append("document", new Blob([bytes], { type: mime }), `megsy-${Date.now()}.${ext}`);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    const r = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: "POST",
      body: form,
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const j: any = await r.json().catch(() => null);
    const doc = j?.result?.document || j?.result?.video || j?.result?.animation;
    const fileId = doc?.file_id;
    if (!j?.ok || !fileId) return false;
    const client = await db();
    const { error } = await client.from("telegram_media_files").upsert({
      source_key: sourceKey,
      file_id: fileId,
      mime,
      size_bytes: bytes.byteLength,
    });
    return !error;
  } catch {
    return false;
  }
}
