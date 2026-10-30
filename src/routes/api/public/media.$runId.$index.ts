/** Signed media link: serves the image/video from its Telegram archive when
 *  present; otherwise re-reads the AgentSky run, archives the bytes on Telegram
 *  (files up to 19 MB) and streams them. */
import { createFileRoute } from "@tanstack/react-router";
import { extractMedia, readRun, verifyMediaLink } from "@/lib/agentsky/media.server";

export const Route = createFileRoute("/api/public/media/$runId/$index")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const index = Number(params.index) || 0;
        const s = new URL(request.url).searchParams.get("s") || "";
        if (!verifyMediaLink(params.runId, index, s)) return new Response("Forbidden", { status: 403 });
        const range = request.headers.get("range");
        const sourceKey = `agentsky:${params.runId}:${index}`;
        const store = await import("@/lib/telegramMediaStore.server");

        const archived = await store.findArchived(sourceKey).catch(() => null);
        if (archived) {
          const fromTelegram = await store.streamArchived(sourceKey, archived, range).catch(() => null);
          if (fromTelegram) return fromTelegram;
        }

        const run = await readRun(params.runId).catch(() => null);
        const item = run ? extractMedia(run)[index] : null;
        if (!item) return new Response("Not found", { status: 404 });
        const cache = { "Cache-Control": "private, max-age=3000" };
        if (item.kind === "b64") {
          const bytes = Buffer.from(item.value, "base64");
          if (!archived) await store.archiveToTelegram(sourceKey, new Uint8Array(bytes), item.mime);
          return new Response(bytes, { headers: { "Content-Type": item.mime, ...cache } });
        }

        // First full (non-range) view: download once, archive, serve the same bytes.
        if (!range && !archived) {
          const upstream = await fetch(item.value);
          if (!upstream.ok) return new Response("Upstream error", { status: upstream.status });
          const mime = upstream.headers.get("content-type") || "application/octet-stream";
          const size = Number(upstream.headers.get("content-length") || 0);
          if (size && size > 19 * 1024 * 1024) {
            const h = new Headers(cache);
            h.set("content-type", mime);
            h.set("content-length", String(size));
            return new Response(upstream.body, { headers: h });
          }
          const bytes = new Uint8Array(await upstream.arrayBuffer());
          await store.archiveToTelegram(sourceKey, bytes, mime);
          return new Response(bytes, {
            headers: { "Content-Type": mime, "Content-Length": String(bytes.byteLength), ...cache },
          });
        }

        const upstream = await fetch(item.value, range ? { headers: { range } } : undefined);
        const h = new Headers(cache);
        for (const k of ["content-type", "content-length", "content-range", "accept-ranges"]) {
          const v = upstream.headers.get(k);
          if (v) h.set(k, v);
        }
        return new Response(upstream.body, { status: upstream.status, headers: h });
      },
    },
  },
});
