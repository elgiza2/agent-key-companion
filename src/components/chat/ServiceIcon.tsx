/**
 * ServiceIcon — one distinctive animated glyph per service family.
 *
 * Design contract (user request):
 * - The base mark is always the Megsy star (the same star from the chat).
 * - While a service is running, its own distinctive icon animates beside it:
 *   search pulses, code types, agent orbits, media shimmers — each simple.
 * - Finished traces show the same icons statically (no animation).
 */
import { memo } from "react";
import {
  Bot,
  Brain,
  Code2,
  FileText,
  Globe,
  Image as ImageIcon,
  Layers,
  MonitorSmartphone,
  Plug,
  Search,
  Sparkles,
  Terminal,
  Video,
  Wrench,
} from "lucide-react";
import MegsyStar from "@/components/branding/MegsyStar";
import { cn } from "@/lib/utils";

export type ServiceKind =
  | "thinking"
  | "search"
  | "browse"
  | "code"
  | "agent"
  | "image"
  | "video"
  | "slides"
  | "docs"
  | "memory"
  | "computer"
  | "integration"
  | "tool";

const SERVICE_GLYPH: Record<Exclude<ServiceKind, "thinking">, typeof Search> = {
  search: Search,
  browse: Globe,
  code: Terminal,
  agent: Bot,
  image: ImageIcon,
  video: Video,
  slides: Layers,
  docs: FileText,
  memory: Brain,
  computer: MonitorSmartphone,
  integration: Plug,
  tool: Wrench,
};

/** Map any tool/status text to its service family. */
export function detectServiceKind(input: string): ServiceKind {
  const t = String(input || "").toLowerCase();
  if (/search|بحث|أبحث|ابحث|web_search|deep_research|exa/.test(t)) return "search";
  if (/brows|navigat|open.*page|visit|فتح|تصفح|تصفح|browse_website|tinyfish|fetch.*url|read.*url/.test(t))
    return "browse";
  if (/code|coder|coding|exec|terminal|run_code|كود|برمج|ينفذ|python|javascript|typescript/.test(t))
    return "code";
  if (/agent|وكيل|delegate|spawn_helper|helper|sub-agent/.test(t)) return "agent";
  if (/video|فيديو|كليب|generate_video/.test(t)) return "video";
  if (/image|صورة|صور|poster|logo|generate_image|شعار|رسمة/.test(t)) return "image";
  if (/slide|شرائح|عرض تقديمي|presentation|deck/.test(t)) return "slides";
  if (/doc|document|report|write.*file|مستند|تقرير|وثيقة/.test(t)) return "docs";
  if (/remember|recall|memory|ذاكرة|يتذكر/.test(t)) return "memory";
  if (/computer|click|tap|scroll|نقر|ضغط|سكرول|browser.*task|screen/.test(t)) return "computer";
  if (/integrat|mcp|connect|gmail|sheets|calendar|تطبيق|متصل/.test(t)) return "integration";
  if (/tool|skill|function|أداة/.test(t)) return "tool";
  return "thinking";
}

interface ServiceIconProps {
  kind?: ServiceKind | string | null;
  /** True while the service is actively running — enables the animation. */
  active?: boolean;
  size?: number;
  className?: string;
}

/**
 * Renders the Megsy star with the service glyph. When active, the service
 * icon gets its own signature micro-animation (all calm, all CSS-only):
 * - search: gentle ping ring
 * - browse: slow orbit dot
 * - code: blinking caret bar
 * - agent: rotating orbit ring
 * - image/video: soft shimmer sweep
 * - everything else: calm breathe
 */
const ServiceIcon = memo(function ServiceIcon({
  kind,
  active,
  size = 15,
  className,
}: ServiceIconProps) {
  const service: ServiceKind =
    kind && typeof kind === "string" && kind in SERVICE_GLYPH
      ? (kind as ServiceKind)
      : kind === "thinking"
        ? "thinking"
        : detectServiceKind(typeof kind === "string" ? kind : "");

  if (service === "thinking") {
    return (
      <span
        className={cn("megsy-service-icon megsy-service-thinking", className)}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <MegsyStar style={{ width: size, height: size }} />
      </span>
    );
  }

  const Glyph = SERVICE_GLYPH[service] ?? Sparkles;
  return (
    <span
      className={cn(
        "megsy-service-icon",
        `megsy-service-${service}`,
        active && "megsy-service-active",
        className,
      )}
      style={{ width: size, height: size }}
      data-service={service}
      aria-hidden
    >
      <span className="megsy-service-star">
        <MegsyStar style={{ width: size, height: size }} />
      </span>
      <span className="megsy-service-glyph">
        <Glyph style={{ width: size * 0.62, height: size * 0.62 }} strokeWidth={2.2} />
      </span>
      {service === "code" && <span className="megsy-service-caret" />}
    </span>
  );
});

export default ServiceIcon;
export { Code2 };
