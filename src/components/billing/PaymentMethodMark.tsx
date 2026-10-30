/** @doc Renders one brand mark or wordmark chip for the payment-method grid. */
import { BRAND_MARKS, type BrandSlug } from "@/lib/payments/brandMarks";
import type { PaymentMark } from "@/lib/payments/paymentMethods";

/** Relative luminance of a `#rrggbb` colour — dark marks switch to currentColor. */
function isDarkHex(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const channel = (value: number) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  return luminance < 0.12;
}

export function BrandIcon({ slug, className }: { slug: BrandSlug; className?: string }) {
  const mark = BRAND_MARKS[slug];
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label={mark.title} className={className}>
      <path d={mark.path} fill={isDarkHex(mark.hex) ? "currentColor" : `#${mark.hex}`} />
    </svg>
  );
}

export function PaymentMethodMarkView({ mark }: { mark: PaymentMark }) {
  if (mark.kind === "brand") {
    return <BrandIcon slug={mark.slug} className="h-[17px] w-[17px] shrink-0" />;
  }
  return (
    <span
      className="text-[10.5px] font-bold leading-none tracking-[-0.01em] whitespace-nowrap"
      style={{ color: mark.color }}
    >
      {mark.text}
    </span>
  );
}

export function PaymentMethodMarks({ marks }: { marks: PaymentMark[] }) {
  return (
    <span className="flex shrink-0 items-center gap-1 text-foreground/85">
      {marks.map((mark, index) => (
        <PaymentMethodMarkView key={`${mark.kind}-${index}`} mark={mark} />
      ))}
    </span>
  );
}
