import { isFastLaneEligible } from "./fastChat";

type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
  mode?: string;
  senderName?: string | null;
  senderAvatar?: string | null;
  agentSkySessionId?: string;
  agentSkyState?: string;
  agentSkyCards?: unknown[];
  agentSkyRequests?: unknown[];
  agentSkyAgent?: unknown;
  agentSkySteps?: unknown[];
  agentSkyStopped?: boolean;
  attachedImages?: string[];
  attachedVideos?: string[];
  attachedFiles?: unknown[];
  images?: string[];
  videos?: string[];
  audios?: string[];
  products?: unknown[];
  toolParts?: unknown[];
  computerTaskId?: string;
  computerPlan?: unknown[];
  operatorRunId?: string;
  mediaPlan?: unknown;
  mediaStatus?: string;
  mediaResults?: unknown[];
  mediaCurrentScene?: number;
  mediaFinalVideoUrl?: string;
  mediaMergeStatus?: string;
  mediaMergeError?: string;
  docsArtifact?: unknown;
  docsClarify?: unknown;
  docsPlan?: unknown;
  docsJobId?: string;
  slidesPlan?: unknown;
  slidesDeck?: unknown;
  slidesOutline?: unknown;
  slidesPendingTopic?: string;
  slidesJobId?: string;
  slidesStatus?: string;
  standardSlides?: unknown;
  imageSlides?: unknown;
  siteBuild?: unknown;
  paywall?: unknown;
  longRunId?: string;
  researchJobId?: string;
  videoJobId?: string;
  chatJobId?: string;
  agentPending?: boolean;
  interrupted?: boolean;
  resumeId?: string;
};

export interface FastChatDispatchOptions {
  userId: string | null | undefined;
  text: string;
  chatMode: string;
  messages: HistoryMessage[];
  requestedAgentId?: string | null;
  selectedAgentId?: string | null;
  hasSelectedModel: boolean;
  hasAttachments: boolean;
  computerUseEnabled: boolean;
}

const SPECIAL_HISTORY_FIELDS: Array<keyof HistoryMessage> = [
  "senderName",
  "senderAvatar",
  "agentSkySessionId",
  "agentSkyState",
  "agentSkyCards",
  "agentSkyRequests",
  "agentSkyAgent",
  "agentSkySteps",
  "agentSkyStopped",
  "attachedImages",
  "attachedVideos",
  "attachedFiles",
  "images",
  "videos",
  "audios",
  "products",
  "toolParts",
  "computerTaskId",
  "computerPlan",
  "operatorRunId",
  "mediaPlan",
  "mediaStatus",
  "mediaResults",
  "mediaCurrentScene",
  "mediaFinalVideoUrl",
  "mediaMergeStatus",
  "mediaMergeError",
  "docsArtifact",
  "docsClarify",
  "docsPlan",
  "docsJobId",
  "slidesPlan",
  "slidesDeck",
  "slidesOutline",
  "slidesPendingTopic",
  "slidesJobId",
  "slidesStatus",
  "standardSlides",
  "imageSlides",
  "siteBuild",
  "paywall",
  "longRunId",
  "researchJobId",
  "videoJobId",
  "chatJobId",
  "agentPending",
  "interrupted",
  "resumeId",
];

function hasValue(value: unknown): boolean {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

/**
 * Keep quick chat on the low-latency stream only for an ordinary, text-only
 * conversation. Explicit agents/models, media, files, computer mode, and any
 * existing AgentSky/tool/task transcript stay on their original execution route.
 */
export function shouldUseFastChat(options: FastChatDispatchOptions): boolean {
  const prompt = options.text.trim();
  if (
    !options.userId ||
    !prompt ||
    options.chatMode !== "normal" ||
    options.requestedAgentId ||
    options.selectedAgentId ||
    options.hasSelectedModel ||
    options.hasAttachments ||
    options.computerUseEnabled
  ) {
    return false;
  }

  const hasSpecialHistory = options.messages.some(
    (message) =>
      (message.mode && message.mode !== "normal") ||
      SPECIAL_HISTORY_FIELDS.some((field) => hasValue(message[field])),
  );
  if (hasSpecialHistory) return false;

  return isFastLaneEligible({
    messages: [
      ...options.messages.map(({ role, content }) => ({ role, content })),
      { role: "user", content: prompt },
    ],
    chatMode: options.chatMode,
    computerUseEnabled: options.computerUseEnabled,
  });
}
