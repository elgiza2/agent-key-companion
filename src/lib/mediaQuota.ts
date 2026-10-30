/**
 * Media generation policy (UI-advisory only — the server re-validates).
 *
 * Images: Wan catalogue via the AI gateway (wan2.7-image $0.0215/image,
 *         wan2.7-image-pro $0.0536/image, billed at gateway account rates).
 *         Free signed-in users receive 5 generations per calendar day.
 *         Paid plans are unlimited on Wan images.
 * Video:  premium-only. Every video model costs MC from the monthly balance.
 */
export type MediaPlanTier = "free" | "pro" | "elite";

/** Free image allowance: 5 Wan images per user per calendar day. */
export const FREE_DAILY_IMAGE_LIMIT = 5;
/** Wan image models served through the gateway (price per image in USD). */
export const WAN_IMAGE_MODELS = [
  { id: "wan2.7-image", priceUsd: 0.0215 },
  { id: "wan2.7-image-pro", priceUsd: 0.0536 },
] as const;

/** Retained for compatibility with older callers; the curated picker is paid-only. */
export function isUnlimitedMediaModel(model: {
  slug?: string;
  id?: string;
  provider?: string;
  name?: string;
  credits?: number;
}): boolean {
  const key = `${model?.slug || model?.id || ""} ${model?.provider || ""} ${model?.name || ""}`;
  return false;
}

/** Runway images are included for paid subscribers; Runway videos remain metered. */
export function isUnlimitedImageModel(model: {
  slug?: string;
  id?: string;
  provider?: string;
  name?: string;
}): boolean {
  const key = `${model?.slug || model?.id || ""} ${model?.provider || ""} ${model?.name || ""}`;
  return /runway|gpt_image_2_5|seedream5_pro|grok_imagine_image_2|muse_image|gemini_image3\.1_flash|gen4_image_turbo/i.test(key);
}

/** Paid plans are unlimited on Wan images; free users get 5/day (server-enforced). */
export const IMAGES_UNLIMITED = false;

/** Soft monthly video allowance per plan (all video models are premium). */
export const VIDEO_MONTHLY_ALLOWANCE: Record<MediaPlanTier, number> = {
  free: 0,
  pro: 40,
  elite: 120,
};

export function normalizeMediaPlan(plan: string | null | undefined): MediaPlanTier {
  const p = (plan || "free").toLowerCase();
  if (["elite", "max", "business", "team", "enterprise", "ultimate"].includes(p)) return "elite";
  if (["pro", "plus", "pro_plus", "premium", "starter"].includes(p)) return "pro";
  return "free";
}

/** Fallback MC cost for a premium video model with no explicit price row. */
export const DEFAULT_VIDEO_CREDIT_COST = 10;

/** MC cost shown on a media model card. 0 means free/unlimited. */
export function mediaModelCost(model: { credits?: number }, unlimited: boolean): number {
  return unlimited ? 0 : Number(model?.credits || 0);
}

/** Short badge label for a media model card. */
export function mediaModelBadge(
  model: { slug?: string; id?: string; provider?: string; name?: string; credits?: number },
  kind: "image" | "video",
): string {
  if (kind === "image") return "5 / day free";
  // Paid video model: always price it, never show it as included.
  const cost = Number(model?.credits || 0) || DEFAULT_VIDEO_CREDIT_COST;
  return `${cost} MC`;
}
