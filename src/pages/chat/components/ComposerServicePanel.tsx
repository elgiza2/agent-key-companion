import { lazy, Suspense, useState } from "react";
import { ChevronDown, ImageIcon, Video, X } from "lucide-react";
import { findSlidesTemplate } from "@/lib/slidesTemplates";
import type { MediaModelChoice } from "@/components/chat/media/MediaModelPickerSheet";
import { BrandIcon, hasBrandIcon } from "@/components/chat/media/BrandIcon";

const MediaModelPickerSheet = lazy(
  () => import("@/components/chat/media/MediaModelPickerSheet"),
);

interface Props {
  chatMode: string;
  mediaModel?: MediaModelChoice | null;
  setMediaModel?: (m: MediaModelChoice) => void;
  slidesTemplate?: string;
  onOpenTemplatePicker?: () => void;
  onClear: () => void;
  /** Set when the docs agent is active. */
  isDocsAgent?: boolean;
  /** Set when the dev agent is active. */
  isDevAgent?: boolean;
}

/** Plain-text label for services that have no picker. */
const SERVICE_LABELS: Record<string, string> = {
  code: "Website",
  dev: "Dev",
  "deep-research": "Deep research",
  learning: "Learning",
  docs: "Documents",
};

/**
 * Minimal activation row that sits at the top of the composer while a mode is
 * active. For images / video / slides it is ONLY the model/template picker
 * button (plus a small close). Every other service shows plain text — no
 * icons, no bar background, nothing that looks like an extra part.
 */
export default function ComposerServicePanel({
  chatMode,
  mediaModel,
  setMediaModel,
  slidesTemplate,
  onOpenTemplatePicker,
  onClear,
  isDocsAgent,
  isDevAgent,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const key = isDocsAgent ? "docs" : isDevAgent ? "dev" : chatMode;

  const isImages = key === "images";
  const isVideo = key === "video";
  const isSlides = key === "slides" || key === "slides-images";
  const showMediaPicker = (isImages || isVideo) && !!setMediaModel;
  const showTemplatePicker = isSlides && !!onOpenTemplatePicker;
  const template = isSlides ? findSlidesTemplate(slidesTemplate || "") : null;
  const label = SERVICE_LABELS[key];
  const isArabicUi = typeof document !== "undefined" && document.documentElement.lang.startsWith("ar");
  const localizedLabel = isArabicUi
    ? ({ code: "موقع", dev: "برمجة", "deep-research": "بحث عميق", learning: "تعلّم", docs: "مستندات" } as Record<string, string>)[key]
    : label;

  if (!showMediaPicker && !showTemplatePicker && !label) return null;

  const pickerButtonClass =
    "flex h-full min-w-0 max-w-[min(60vw,220px)] items-center gap-1.5 rounded-full text-left text-[13px] font-medium text-foreground outline-none transition-colors focus:outline-none focus-visible:outline-none active:scale-[0.99]";

  const modeName =
    localizedLabel ||
    (isImages
      ? isArabicUi
        ? "صور"
        : "Images"
      : isVideo
        ? isArabicUi
          ? "فيديو"
          : "Video"
        : isSlides
          ? isArabicUi
            ? "عروض"
            : "Slides"
          : "");
  const MediaIcon = isVideo ? Video : ImageIcon;
  const modelHasBrandIcon = mediaModel ? hasBrandIcon(mediaModel.name, mediaModel.provider) : false;

  return (
    <div
      data-media-service-panel={showMediaPicker ? "true" : undefined}
      className="flex h-8 min-w-0 flex-1 items-center gap-1.5 bg-transparent"
    >
      {modeName ? (
        <span className="shrink-0 text-[12.5px] font-semibold text-foreground/70">{modeName}</span>
      ) : null}

      {showMediaPicker ? (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-label={isArabicUi ? (isVideo ? "اختار موديل الفيديو" : "اختار موديل الصور") : isVideo ? "Choose video model" : "Choose image model"}
          aria-haspopup="dialog"
          className={pickerButtonClass}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-foreground/[0.07]">
            {mediaModel?.thumbnail ? (
              <img src={mediaModel.thumbnail} alt="" className="h-full w-full object-cover" />
            ) : modelHasBrandIcon && mediaModel ? (
              <BrandIcon name={mediaModel.name} provider={mediaModel.provider} variant="color" size={16} />
            ) : (
              <MediaIcon className="h-3.5 w-3.5 text-foreground/65" />
            )}
          </span>
          <span className="min-w-0 truncate">
            {mediaModel?.name || (isArabicUi ? (isVideo ? "موديل فيديو" : "موديل صور") : isVideo ? "Video model" : "Image model")}
          </span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-foreground/40" strokeWidth={2.2} />
        </button>
      ) : null}

      {showTemplatePicker ? (
        <button
          type="button"
          onClick={() => onOpenTemplatePicker()}
          aria-label={isArabicUi ? "اختار قالب العرض" : "Choose slides template"}
          aria-haspopup="dialog"
          className={pickerButtonClass}
        >
          <span className="min-w-0 truncate">{template?.name || (isArabicUi ? "قالب العرض" : "Template")}</span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-foreground/40" strokeWidth={2.2} />
        </button>
      ) : null}


      <button
        type="button"
        onClick={onClear}
        aria-label={localizedLabel ? (isArabicUi ? `اقفل ${localizedLabel}` : `Close ${localizedLabel}`) : isArabicUi ? "اقفل الوضع" : "Close mode"}
        className="ms-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-foreground/45 transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
      >
        <X className="w-3.5 h-3.5" strokeWidth={2.2} />
      </button>

      {pickerOpen && showMediaPicker ? (
        <Suspense fallback={null}>
          <MediaModelPickerSheet
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            mode={isVideo ? "video" : "images"}
            selectedSlug={mediaModel?.slug}
            onSelect={(m) => {
              setMediaModel?.(m);
              setPickerOpen(false);
            }}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
