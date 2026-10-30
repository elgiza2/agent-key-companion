/** @doc Real agent marks. Every brand icon comes from @lobehub/icons (the
 * official logo of the agent/model it names) and is a dynamic import, so only
 * the icons actually on screen are downloaded. Agents with no published logo —
 * starting with Megsy itself — get the robot. */
import { lazy, Suspense, useMemo, type ComponentType } from "react";
import { Bot, Clapperboard } from "lucide-react";
import { AgentOrb } from "./AgentOrb";
import type { AgentColor, AgentInfo } from "@/lib/agentsky/client";
import higgsfieldLogo from "@/assets/higgsfield-logo.png";

type IconModule = { default: ComponentType<any> & { Color?: ComponentType<any> } };

/* Official marks available in @lobehub/icons/es (v5.23). */
const BRANDS: Record<string, () => Promise<IconModule>> = {
  /* coding agents */
  openclaw: () => import("@lobehub/icons/es/OpenClaw"),
  openhands: () => import("@lobehub/icons/es/OpenHands"),
  hermes: () => import("@lobehub/icons/es/HermesAgent"),
  claudecode: () => import("@lobehub/icons/es/ClaudeCode"),
  claude: () => import("@lobehub/icons/es/Claude"),
  anthropic: () => import("@lobehub/icons/es/Anthropic"),
  devin: () => import("@lobehub/icons/es/Devin"),
  cursor: () => import("@lobehub/icons/es/Cursor"),
  copilot: () => import("@lobehub/icons/es/Copilot"),
  cline: () => import("@lobehub/icons/es/Cline"),
  codex: () => import("@lobehub/icons/es/Codex"),
  windsurf: () => import("@lobehub/icons/es/Windsurf"),
  dify: () => import("@lobehub/icons/es/Dify"),
  coze: () => import("@lobehub/icons/es/Coze"),
  github: () => import("@lobehub/icons/es/Github"),
  /* models */
  openai: () => import("@lobehub/icons/es/OpenAI"),
  gemini: () => import("@lobehub/icons/es/Gemini"),
  deepseek: () => import("@lobehub/icons/es/DeepSeek"),
  grok: () => import("@lobehub/icons/es/Grok"),
  qwen: () => import("@lobehub/icons/es/Qwen"),
  kimi: () => import("@lobehub/icons/es/Kimi"),
  moonshot: () => import("@lobehub/icons/es/Moonshot"),
  mistral: () => import("@lobehub/icons/es/Mistral"),
  meta: () => import("@lobehub/icons/es/Meta"),
  nous: () => import("@lobehub/icons/es/NousResearch"),
  perplexity: () => import("@lobehub/icons/es/Perplexity"),
  manus: () => import("@lobehub/icons/es/Manus"),
  /* media */
  nanobanana: () => import("@lobehub/icons/es/NanoBanana"),
  midjourney: () => import("@lobehub/icons/es/Midjourney"),
  flux: () => import("@lobehub/icons/es/Flux"),
  ideogram: () => import("@lobehub/icons/es/Ideogram"),
  recraft: () => import("@lobehub/icons/es/Recraft"),
  stability: () => import("@lobehub/icons/es/Stability"),
  kling: () => import("@lobehub/icons/es/Kling"),
  runway: () => import("@lobehub/icons/es/Runway"),
  luma: () => import("@lobehub/icons/es/Luma"),
  sora: () => import("@lobehub/icons/es/Sora"),
  hailuo: () => import("@lobehub/icons/es/Hailuo"),
  pika: () => import("@lobehub/icons/es/Pika"),
  vidu: () => import("@lobehub/icons/es/Vidu"),
  minimax: () => import("@lobehub/icons/es/Minimax"),
  pixverse: () => import("@lobehub/icons/es/PixVerse"),
  hunyuan: () => import("@lobehub/icons/es/Hunyuan"),
  kolors: () => import("@lobehub/icons/es/Kolors"),
  elevenlabs: () => import("@lobehub/icons/es/ElevenLabs"),
  suno: () => import("@lobehub/icons/es/Suno"),
  capcut: () => import("@lobehub/icons/es/CapCut"),
  meshy: () => import("@lobehub/icons/es/Meshy"),
  lovart: () => import("@lobehub/icons/es/Lovart"),
  topaz: () => import("@lobehub/icons/es/TopazLabs"),
  /* Higgsfield publishes its own app mark, so it ships with the app instead of
     coming from the icon package. */
  higgsfield: async () => ({ default: HiggsfieldMark as ComponentType<any> }),
};

/* Ordered: the most specific agent identity wins. */
const RULES: [RegExp, keyof typeof BRANDS][] = [
  [/\bhiggsfield\b|\bhiggs\b/, "higgsfield"],
  [/\bclaude\s*code\b|\bclaudecode\b/, "claudecode"],
  [/\bopenclaw\b|\bclaw\b/, "openclaw"],
  [/\bopenhands\b/, "openhands"],
  [/\bhermes\b|\bnous\b|nousresearch/, "hermes"],
  [/\bdevin\b/, "devin"],
  [/\bcursor\b/, "cursor"],
  [/\bcopilot\b/, "copilot"],
  [/\bcline\b/, "cline"],
  [/\bcodex\b/, "codex"],
  [/\bwindsurf\b/, "windsurf"],
  [/\bdeepseek\b/, "deepseek"],
  [/\bperplexity\b|\bsonar\b/, "perplexity"],
  [/\bmistral\b|\bmixtral\b/, "mistral"],
  [/\bmoonshot\b|\bkimi\b/, "moonshot"],
  [/\bqwen\b|\btongyi\b/, "qwen"],
  [/\bgrok\b|\bxai\b/, "grok"],
  [/\bgemini\b|\bimagen\b|\bveo\b/, "gemini"],
  [/\bllama\b|\bmeta\b/, "meta"],
  [/\bclaude\b|\banthropic\b/, "claude"],
  [/\bgpt\b|\bopenai\b|\bo[34]\b/, "openai"],
  [/\bnano\s*banana\b|nanobanana/, "nanobanana"],
  [/\bmidjourney\b|\bmj\b/, "midjourney"],
  [/\bflux\b|\bbfl\b/, "flux"],
  [/\bideogram\b/, "ideogram"],
  [/\brecraft\b/, "recraft"],
  [/\bstability\b|\bsdxl\b/, "stability"],
  [/\bkling\b/, "kling"],
  [/\brunway\b|\bgen-?[34]\b/, "runway"],
  [/\bluma\b|\bdream machine\b/, "luma"],
  [/\bsora\b/, "sora"],
  [/\bhailuo\b|\bminimax\b/, "minimax"],
  [/\bpika\b/, "pika"],
  [/\bvidu\b/, "vidu"],
  [/\bpixverse\b/, "pixverse"],
  [/\bhunyuan\b/, "hunyuan"],
  [/\bkolors\b/, "kolors"],
  [/\belevenlabs\b/, "elevenlabs"],
  [/\bsuno\b/, "suno"],
  [/\bcapcut\b/, "capcut"],
  [/\bmeshy\b|\btripo\b/, "meshy"],
  [/\blovart\b/, "lovart"],
  [/\btopaz\b/, "topaz"],
  [/\bdify\b/, "dify"],
  [/\bcoze\b/, "coze"],
  [/\bgithub\b/, "github"],
  [/\bmanus\b/, "manus"],
];

/** The published logo for this agent, or null when it has none. */
export function agentBrandKey(agent: AgentInfo): keyof typeof BRANDS | null {
  // Megsy itself is the robot, never a third-party logo.
  if (agent.isDefault) return null;
  const text = `${agent.name} ${agent.description} ${agent.prompt}`.toLowerCase();
  for (const [re, key] of RULES) if (re.test(text)) return key;
  return null;
}

const cache = new Map<string, ReturnType<typeof lazy>>();
const EmptyIcon: ComponentType<any> = () => null;

function lazyBrand(key: string) {
  const hit = cache.get(key);
  if (hit) return hit;
  const Comp = lazy(async () => {
    // A brand mark is cosmetic: a failed chunk fetch must never blank the page.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const mod = await BRANDS[key]();
        const Root = mod.default;
        return { default: (Root?.Color ?? Root) as ComponentType<any> };
      } catch {
        /* retry once */
      }
    }
    cache.delete(key);
    return { default: EmptyIcon };
  });
  cache.set(key, Comp);
  return Comp;
}

/** Megsy's own mark. It belongs to the main agent alone, so every other
 *  logo-less agent gets its own generic mark instead of borrowing it. */
/** Megsy's own mark: the same orb creature the chat page greets you with. */
export function MegsyMark({ color = "aurora", size = 28, className }: { color?: AgentColor; size?: number; className?: string }) {
  return <AgentOrb color={color} size={size} state="idle" className={className} />;
}

/** Higgsfield's published app mark. */
function HiggsfieldMark({ size = 23, className }: { size?: number; className?: string }) {
  return (
    <img
      src={higgsfieldLogo}
      alt=""
      width={size}
      height={size}
      className={className}
      loading="lazy"
      decoding="async"
    />
  );
}

const GenericMark = ({ kind, size, className }: { kind: "media" | "agent"; size: number; className?: string }) =>
  kind === "media" ? (
    <Clapperboard className={className} width={size} height={size} strokeWidth={1.7} aria-hidden />
  ) : (
    <Bot className={className} width={size} height={size} strokeWidth={1.7} aria-hidden />
  );

export function AgentIcon({ agent, size = 23, className }: { agent: AgentInfo; size?: number; className?: string }) {
  const key = useMemo(
    () => agentBrandKey(agent),
    [agent.id, agent.name, agent.description, agent.prompt, agent.isDefault],
  );
  const kind = agent.mediaOnly ? "media" : "agent";
  const fallback = agent.isDefault ? (
    <MegsyMark color="aurora" size={size + 5} className={className} />
  ) : (
    <GenericMark kind={kind} size={size - 3} className={className} />
  );
  if (!key) return fallback;
  const Lazy = lazyBrand(key);
  return (
    <Suspense fallback={fallback}>
      <Lazy size={size} className={className} />
    </Suspense>
  );
}
