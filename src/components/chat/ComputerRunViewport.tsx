import { useState } from "react";
import { ChevronDown } from "lucide-react";
import MegsyStar from "@/components/branding/MegsyStar";
import { useUserLang } from "@/lib/authI18n";

interface ComputerRunViewportProps {
  url?: string | null;
  poster?: string | null;
  active?: boolean;
  status?: string;
}

/**
 * Megsy computer surface. Collapsed it is a single quiet pill sized to its own
 * label — it never reserves screen space and the actual screen only mounts once
 * the user opens it.
 */
export default function ComputerRunViewport({
  url,
  poster,
  active,
  status,
}: ComputerRunViewportProps) {
  const [expanded, setExpanded] = useState(false);
  const isArabic = useUserLang() === "ar-eg";

  // The live status belongs to the thinking badge higher up in the chat; the
  // pill stays a fixed, quiet label so the same status is not printed twice.
  const label = isArabic ? "كمبيوتر ميغسي" : "Megsy computer";
  void status;

  return (
    <section
      data-computer-viewport
      className={`relative ${expanded ? "w-full overflow-hidden rounded-2xl bg-foreground/[0.03]" : "w-fit"}`}
      aria-label={isArabic ? "كمبيوتر ميغسي" : "Megsy computer"}
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className={`inline-flex h-8 max-w-full items-center gap-2 rounded-full bg-transparent px-2.5 text-start outline-none transition-colors hover:bg-foreground/[0.05] focus:outline-none focus-visible:outline-none ${
          expanded ? "w-full rounded-b-none" : ""
        }`}
      >
        <MegsyStar
          className={`h-3.5 w-3.5 shrink-0 text-[var(--megsy-gold)] ${active ? "motion-safe:animate-[spin_4s_linear_infinite]" : ""}`}
        />
        <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-muted-foreground">
          {label}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>

      {expanded && (
        <div className="relative h-[min(52vh,420px)] w-full overflow-hidden rounded-2xl rounded-t-none bg-muted/20">
          {url ? (
            <iframe
              src={url}
              aria-label={isArabic ? "عرض كمبيوتر ميغسي" : "Megsy computer preview"}
              className="absolute inset-0 h-full w-full border-0"
              allow="clipboard-read; clipboard-write"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          ) : poster ? (
            <img
              src={poster}
              alt={isArabic ? "آخر شاشة من كمبيوتر ميغسي" : "Latest Megsy computer screen"}
              className="h-full w-full object-cover object-top"
            />
          ) : (
            <div
              className="absolute inset-0 grid place-items-center"
              aria-label={isArabic ? "جاري تجهيز الشاشة" : "Preparing the screen"}
            >
              <div className="relative grid h-24 w-24 place-items-center">
                <span className="absolute inset-0 rounded-full border border-primary/20 motion-safe:animate-[spin_4s_linear_infinite]" />
                <span className="absolute inset-3 rounded-full border border-primary/20 border-t-primary/80 motion-safe:animate-[spin_2s_linear_infinite]" />
                <MegsyStar className="h-7 w-7 text-[var(--megsy-gold)] motion-safe:animate-pulse" />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
