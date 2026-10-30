/** Curated production catalogue for the media picker. */

const key = (m: any) => `${m?.slug || m?.id || ""} ${m?.name || ""} ${m?.provider || ""}`.toLowerCase();

// Keep only current, verified image families. Routing providers are intentionally
// ignored here; the model identity is what controls the user-facing catalogue.
const IMAGE_ALLOW_PATTERNS: RegExp[] = [
  /gpt[\s_-]*image[\s_-]*2[._ -]?5\b/i,
  /nano[\s_-]*banana[\s_-]*2\b/i,
  /seedream[\s_-]*5(?:[._ -]?0)?(?:\s+lite)?/i,
  /grok[\s_-]*(?:imagine[\s_-]*)?image/i,
  /gen[\s_-]*4[._ -]*image[\s_-]*turbo/i,
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const VIDEO_ALLOW_PATTERNS: RegExp[] = [
  /sora[\s_-]*2\b/i,
  /seedance[\s_-]*2(?:[._ -]?5)?\b/i,
  /gen[\s_-]*4[._ -]*5\b/i,
  /veo[\s_-]*3[._ -]*1\b/i,
  /kling[\s_-]*3\b/i,
];

export function isAllowedImageModel(model: any): boolean {
  return !/megsy/i.test(key(model)) && IMAGE_ALLOW_PATTERNS.some((re) => re.test(key(model)));
}

export function isFreeImageModel(model: any): boolean {
  return false;
}

export function filterImageModels<T>(models: T[]): T[] {
  return models.filter(isAllowedImageModel);
}

/** Video is served only by WaveSpeedAI; other catalogue rows are hidden. */
export function filterVideoModels<T>(models: T[]): T[] {
  return models.filter((model: any) => model?.provider === "wavespeed");
}
