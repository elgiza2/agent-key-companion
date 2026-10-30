import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { promptUpgrade } from "@/lib/upgradeMoment";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useDynamicModels } from "@/hooks/useModels";
import { AlertCircle, Check, RefreshCw } from "lucide-react";
import { useUserPlan } from "@/hooks/useUserPlan";
import { isPaidUser } from "@/lib/subscriptionGating";
import { filterImageModels, filterVideoModels } from "@/lib/mediaModelPolicy";
import { useUserLang } from "@/lib/authI18n";
import megsyModelIcon from "@/assets/megsy-model.jpg";

function ModelIcon(_: { model: any }) {
  return <img src={megsyModelIcon} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />;
}

export interface MediaModelChoice {
  slug: string;
  name: string;
  provider: string;
  credits: number;
  thumbnail?: string;
  type: "image" | "video";
  isPremium?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "images" | "video";
  selectedSlug?: string;
  onSelect: (model: MediaModelChoice) => void;
}

const modelKey = (model: any) => `${model?.slug || model?.id || ""} ${model?.name || ""}`.toLowerCase();

function englishModelName(model: any): string {
  if (model?.provider === "wavespeed") return String(model.name);
  const key = modelKey(model);
  if (/gpt[\s_-]*image[\s_-]*2[._ -]*5.*flare/i.test(key)) return "GPT Image 2.5 Flare";
  if (/gpt[\s_-]*image[\s_-]*2[._ -]*5.*sunburst/i.test(key)) return "GPT Image 2.5 Sunburst";
  if (/gpt[\s_-]*image[\s_-]*2[._ -]*5/i.test(key)) return "GPT Image 2.5";
  if (/gen[\s_-]*4[._ -]*image[\s_-]*turbo/i.test(key)) return "Gen-4 Image Turbo";
  if (/grok[\s_-]*imagine[\s_-]*image/i.test(key)) return "Grok Imagine Image 2";
  if (/grok[\s_-]*image/i.test(key)) return "Grok Image";
  if (/nano[\s_-]*banana[\s_-]*2/i.test(key)) return "Nano Banana 2";
  if (/nano[\s_-]*banana/i.test(key)) return "Nano Banana";
  if (/seedream[\s_-]*5.*lite/i.test(key)) return "Seedream 5 Lite";
  if (/seedream[\s_-]*5.*(?:pro|5[._ -]*0)/i.test(key)) return "Seedream 5.0 Pro";
  if (/sora[\s_-]*2/i.test(key)) return "Sora 2";
  if (/seedance[\s_-]*2.*5/i.test(key)) return "Seedance 2.5";
  if (/seedance[\s_-]*2/i.test(key)) return "Seedance 2";
  if (/gen[\s_-]*4[._ -]*5/i.test(key)) return "Gen-4.5";
  if (/veo[\s_-]*3[._ -]*1/i.test(key)) return "Veo 3.1";
  return String(model.name || model.slug || model.id || "Model").replace(/\s*Free\s*/gi, " ").trim();
}

const IMAGE_ORDER = [
  "GPT Image 2.5", "GPT Image 2.5 Flare", "GPT Image 2.5 Sunburst",
  "Nano Banana 2", "Seedream 5 Lite", "Seedream 5.0 Pro",
  "Grok Image", "Grok Imagine Image 2", "Gen-4 Image Turbo",
];
const VIDEO_ORDER = ["MiniMax H3", "Seedance 2.5", "OpenVideo", "Seedance 1.5 Pro", "Hailuo 2.3", "Grok Imagine 1.5"];

export default function MediaModelPickerSheet({ open, onOpenChange, mode, selectedSlug, onSelect }: Props) {
  const { models, loading, error, reload } = useDynamicModels();
  const { plan } = useUserPlan();
  const paid = isPaidUser(plan);
  const isAr = useUserLang().startsWith("ar");
  const navigate = useNavigate();
  const filtered = useMemo(() => {
    const target = mode === "video" ? ["video", "video-i2v"] : ["image"];
    const scoped = models.filter((m) => target.includes(m.type as string));
    const order = mode === "video" ? VIDEO_ORDER : IMAGE_ORDER;
    const sorted = (mode === "video" ? filterVideoModels(scoped) : filterImageModels(scoped)).sort((a, b) => {
      const aName = englishModelName(a);
      const bName = englishModelName(b);
      const aRank = order.indexOf(aName);
      const bRank = order.indexOf(bName);
      return (aRank < 0 ? 999 : aRank) - (bRank < 0 ? 999 : bRank) || aName.localeCompare(bName);
    });
    const unique = sorted.filter((model, index, list) => list.findIndex((candidate) => englishModelName(candidate) === englishModelName(model)) === index);
    return unique;
  }, [models, mode]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" onOpenAutoFocus={(event) => event.preventDefault()} className="z-[100] max-h-[82dvh] rounded-t-[30px] border border-border/60 bg-background p-0 shadow-[0_-24px_80px_-28px_rgba(0,0,0,.7)] [&>button.absolute]:hidden">
        <SheetHeader className="border-b border-border/60 px-5 pb-4 pt-4">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-foreground/15" />
          <SheetTitle className="text-left text-[17px] font-semibold tracking-tight text-foreground">{isAr ? "اختر نموذجًا" : "Choose a model"}</SheetTitle>
        </SheetHeader>
        <div className="h-[calc(82dvh-76px)] min-h-0 overflow-y-auto overscroll-contain px-4 pb-6 pt-4 [scrollbar-width:thin]" dir="ltr">
          {loading && <div className="rounded-2xl border border-border/60 bg-card p-5 text-center text-sm text-muted-foreground">Loading models…</div>}
          {error && !loading && <div className="flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-left"><AlertCircle className="h-4 w-4 shrink-0 text-amber-600" /><span className="min-w-0 flex-1 text-xs text-foreground/75">{error}</span><button type="button" onClick={reload} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-background px-2.5 py-1.5 text-[11px] font-semibold"><RefreshCw className="h-3 w-3" /> Retry</button></div>}
          {!loading && filtered.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">No models available right now</div>}
          <div className="space-y-2">
            {filtered.map((m, mi) => {
              const neutralName = `Megsy ${mode === "video" ? "Video" : "Image"} ${mi + 1}`;
              const active = m.slug === selectedSlug;
              // Images are premium catalogue entries but guests may select them;
              // the server enforces the real 3-image / 12-hour guest quota.
              // Video is premium-only: do not expose a free video path here.
              const locked = mode === "video" && !paid;
              return <button key={m.id} type="button" onClick={() => {
                if (locked) { promptUpgrade(neutralName); onOpenChange(false); navigate("/pricing"); return; }
                const displayName = neutralName;
                onSelect({ slug: m.slug || m.id, name: displayName, provider: "megsy", credits: m.credits, thumbnail: m.thumbnailUrl || m.iconUrl, type: mode === "video" ? "video" : "image", isPremium: !!m.isPremium });
                toast.success(`Selected: ${displayName}`);
              }} className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.035] ${active ? "border-primary/50 bg-primary/[0.07]" : "border-border/70 bg-card"}`}>
                <ModelIcon model={m} />
                <span translate="no" dir="ltr" className="min-w-0 flex-1 truncate text-left text-[14px] font-semibold text-foreground">{neutralName}</span>
                {active && <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.8} />}
              </button>;
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
