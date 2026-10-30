// Parallel runner for the chat-driven media generation flow.
// Subscribers generate through Agent Sky; everyone else uses the free image and
// video service. Reports progress via callbacks so the UI updates as results land.

import { supabase } from "@/integrations/supabase/client";
import type { MediaPlan, MediaPlanScene } from "@/components/chat/media/MediaPlanCard";
import type { MediaSceneResult } from "@/components/chat/media/MediaResultCard";

// Free tier (non-subscribers): one image model and one video model.
const FREE_FN = "anything-api";
const FREE_IMAGE_SLUG = "deapi-flux-schnell";
const FREE_VIDEO_SLUG = "deapi-ltx-video";

interface ScenePartialCb {
  (index: number, previewDataUrl: string, progress: number): void;
}

/**
 * Drives a synthetic progress ticker for non-streaming generations so the UI
 * shows ChatGPT-style live progress for every model.
 * Approaches but never reaches 0.95 until the real result arrives.
 */
function startProgressTicker(
  sceneIndex: number,
  estimatedMs: number,
  onPartial: ScenePartialCb | undefined,
): () => void {
  if (!onPartial) return () => {};
  const started = Date.now();
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    const elapsed = Date.now() - started;
    // Easing: fast at first, asymptotic to 0.95
    const p = Math.min(0.95, 1 - Math.exp(-elapsed / estimatedMs));
    onPartial(sceneIndex, "", p);
  };
  tick();
  const id = window.setInterval(tick, 600);
  return () => {
    stopped = true;
    window.clearInterval(id);
  };
}

/** Subscriber media: Agent Sky. */
async function generateViaAgentSky(
  kind: "image" | "video",
  scene: MediaPlanScene,
  onPartial: ScenePartialCb | undefined,
  aspectRatio?: string,
): Promise<string> {
  const { agentApi, mediaStatus } = await import("@/lib/agentsky/client");
  const stop = startProgressTicker(scene.index, kind === "video" ? 90_000 : 18_000, onPartial);
  try {
    const run = await agentApi.media({
      kind,
      prompt: scene.prompt,
      aspect: normalizeAspect(kind, (kind === "video" ? scene.aspect_ratio : undefined) || aspectRatio),
      duration: kind === "video" ? scene.duration_seconds || 5 : undefined,
      idempotencyKey: crypto.randomUUID(),
    });
    const started = Date.now();
    while (Date.now() - started < 15 * 60_000) {
      await new Promise((r) => setTimeout(r, kind === "video" ? 5000 : 2500));
      const st = await mediaStatus(run.runId, run.token).catch(() => null);
      if (!st) continue;
      if (st.urls?.length) {
        onPartial?.(scene.index, kind === "image" ? st.urls[0] : "", 1);
        return st.urls[0];
      }
      if (/FAIL|ERROR|CANCEL/i.test(st.status || "")) throw new Error(st.error || `${kind} failed`);
    }
    throw new Error("timeout");
  } finally {
    stop();
  }
}

async function invokeFree(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke(FREE_FN, { body });
  if (error) {
    let detail = error.message || "generation failed";
    try {
      const payload = await (error as any).context?.clone?.().json?.();
      detail = payload?.message || payload?.error || detail;
    } catch {
      // FunctionsHttpError.context is not present in older supabase-js builds.
    }
    throw new Error(detail);
  }
  if (data?.paywall) {
    const e = new Error(data.message || "Upgrade required");
    (e as any).paywall = true;
    throw e;
  }
  if (data?.error) throw new Error(data.message || data.error);
  return data;
}

/** Non-subscriber image: the free image service with its daily allowance. */
async function generateFreeImage(
  scene: MediaPlanScene,
  onPartial: ScenePartialCb | undefined,
  aspectRatio?: string,
): Promise<string> {
  const stop = startProgressTicker(scene.index, 12_000, onPartial);
  try {
    const refs: string[] = Array.isArray((scene as any).reference_image_urls)
      ? ((scene as any).reference_image_urls as string[])
      : scene.reference_image_url
        ? [scene.reference_image_url]
        : [];
    const data = await invokeFree({
      prompt: scene.prompt,
      model_slug: FREE_IMAGE_SLUG,
      aspect_ratio: aspectRatio,
      ...(refs.length ? { reference_image_urls: refs } : {}),
    });
    const url = data?.image_url || (Array.isArray(data?.image_urls) ? data.image_urls[0] : null);
    if (!url) throw new Error("no image returned");
    onPartial?.(scene.index, url, 1);
    return url;
  } finally {
    stop();
  }
}

/** Non-subscriber video: submit to the free service, then poll it. */
async function generateFreeVideo(
  scene: MediaPlanScene,
  onPartial: ScenePartialCb | undefined,
  aspectRatio?: string,
): Promise<string> {
  onPartial?.(scene.index, "", NaN);
  const data = await invokeFree({
    kind: "video",
    prompt: scene.prompt,
    model_slug: FREE_VIDEO_SLUG,
    duration: scene.duration_seconds || 5,
    aspect_ratio: scene.aspect_ratio || aspectRatio,
    ...(scene.first_frame_url ? { start_frame: scene.first_frame_url } : {}),
  });
  const jobId = data?.job_id;
  if (!jobId) throw new Error("no video job id");
  const started = Date.now();
  while (Date.now() - started < 5 * 60_000) {
    await new Promise((r) => setTimeout(r, 3000));
    const poll = await invokeFree({ kind: "video_poll", job_id: jobId }).catch(() => null);
    if (!poll) continue;
    const reported = Number(poll.progress ?? NaN);
    if (Number.isFinite(reported) && reported > 0) {
      onPartial?.(scene.index, "", reported > 1 ? Math.min(0.95, reported / 100) : Math.min(0.95, reported));
    }
    if (poll.status === "completed" && poll.video_url) {
      onPartial?.(scene.index, "", 1);
      return String(poll.video_url);
    }
    if (poll.status === "failed") throw new Error(poll.error || "video job failed");
  }
  throw new Error("timeout");
}

/** Agent Sky answers 402 for accounts without a subscription. */
export function needsFreeTier(e: unknown): boolean {
  if ((e as any)?.status === 402) return true;
  return /upgrade|pro plan|\b402\b/i.test(e instanceof Error ? e.message : String(e));
}

async function generateImageScene(
  scene: MediaPlanScene,
  _modelSlug: string,
  onPartial?: ScenePartialCb,
  aspectRatio?: string,
): Promise<string> {
  try {
    return await generateViaAgentSky("image", scene, onPartial, aspectRatio);
  } catch (e) {
    if (!needsFreeTier(e)) throw e;
    return generateFreeImage(scene, onPartial, aspectRatio);
  }
}

async function generateVideoScene(
  scene: MediaPlanScene,
  _modelSlug: string,
  onPartial?: ScenePartialCb,
  aspectRatio?: string,
  onCountdown?: (index: number, endsAt: number | null) => void,
): Promise<string> {
  void onCountdown;
  try {
    return await generateViaAgentSky("video", scene, onPartial, aspectRatio);
  } catch (e) {
    if (!needsFreeTier(e)) throw e;
    return generateFreeVideo(scene, onPartial, aspectRatio);
  }
}

export interface RunMediaPlanOptions {
  plan: MediaPlan;
  onSceneStart: (index: number) => void;
  onSceneDone: (result: MediaSceneResult) => void;
  /** Fires with progressive previews (ChatGPT-style) while an image is rendering. */
  onScenePartial?: (index: number, previewUrl: string, progress: number) => void;
  /** For video tasks: timestamp (ms) when the initial ~5 min wait ends, or null to clear. */
  onSceneCountdown?: (index: number, endsAt: number | null) => void;
  shouldCancel?: () => boolean;
}

export async function runMediaPlan(opts: RunMediaPlanOptions): Promise<void> {
  const { plan, onSceneStart, onSceneDone, onScenePartial, onSceneCountdown, shouldCancel } = opts;
  // Keep premium video unlimited at the request level, but never fan out an
  // unbounded number of provider jobs. This is the client-side admission layer
  // until the durable Supabase worker is deployed; the provider must still
  // enforce the authoritative per-user/global limits server-side.
  const concurrency = plan.mode === "video" ? 2 : 4;
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < plan.scenes.length) {
      const scene = plan.scenes[nextIndex++];
      if (shouldCancel?.()) return;
      onSceneStart(scene.index);
      try {
        const url =
          plan.mode === "video"
            ? await generateVideoScene(
                scene,
                plan.modelSlug,
                onScenePartial,
                plan.aspectRatio,
                onSceneCountdown,
              )
            : await generateImageScene(scene, plan.modelSlug, onScenePartial, plan.aspectRatio);
        if (plan.mode === "images" && url) {
          try {
            const { rememberCharacter } = await import("./media/characterMemory");
            rememberCharacter({
              name: plan.originalPrompt || plan.summary,
              descriptor: scene.identity || scene.prompt,
              refUrl: url,
            });
          } catch {
            /* memory is best-effort */
          }
        }
        onSceneDone({
          index: scene.index,
          title: scene.title,
          status: "done",
          url,
          type: plan.mode === "video" ? "video" : "image",
        });
      } catch (e) {
        onSceneDone({
          index: scene.index,
          title: scene.title,
          status: "error",
          error: e instanceof Error ? e.message : "failed",
          type: plan.mode === "video" ? "video" : "image",
        });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, plan.scenes.length) }, worker));
}

export async function regenerateScene(
  plan: MediaPlan,
  sceneIndex: number,
  onPartial?: (index: number, previewUrl: string, progress: number) => void,
  onCountdown?: (index: number, endsAt: number | null) => void,
): Promise<MediaSceneResult> {
  const scene = plan.scenes.find((s) => s.index === sceneIndex);
  if (!scene) throw new Error("scene not found");
  try {
    const url =
      plan.mode === "video"
        ? await generateVideoScene(scene, plan.modelSlug, onPartial, plan.aspectRatio, onCountdown)
        : await generateImageScene(scene, plan.modelSlug, onPartial, plan.aspectRatio);
    return {
      index: scene.index,
      title: scene.title,
      status: "done",
      url,
      type: plan.mode === "video" ? "video" : "image",
    };
  } catch (e) {
    return {
      index: scene.index,
      title: scene.title,
      status: "error",
      error: e instanceof Error ? e.message : "failed",
      type: plan.mode === "video" ? "video" : "image",
    };
  }
}

/** AgentSky accepts a fixed ratio list; videos only support landscape/portrait. */
function normalizeAspect(kind: "image" | "video", a?: string): string {
  const v = String(a || "").trim();
  if (kind === "video") return v === "9:16" ? "9:16" : "16:9";
  return ["1:1", "16:9", "9:16", "4:3", "3:4"].includes(v) ? v : "1:1";
}
