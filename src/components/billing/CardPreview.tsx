/** Live card face for the checkout card step: the brand mark follows the number
 *  being typed, and the number and holder name are printed on the card itself. */

export type CardBrand = "visa" | "mastercard" | "meeza" | null;

export function detectCardBrand(value: string): CardBrand {
  const n = value.replace(/\D/g, "");
  if (!n) return null;
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "mastercard";
  if (/^62/.test(n)) return "meeza";
  return null;
}

export function BrandMark({ brand, className = "" }: { brand: CardBrand; className?: string }) {
  switch (brand) {
    case "visa":
      return (
        <svg viewBox="0 8 24 8" className={`payment-visa ${className}`} role="img" aria-label="Visa">
          <path fill="currentColor" d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z" />
        </svg>
      );
    case "mastercard":
      return (
        <svg viewBox="0 0 32 20" className={`h-[26px] w-[42px] ${className}`} aria-hidden="true">
          <circle cx="11" cy="10" r="9" className="payment-red" />
          <circle cx="21" cy="10" r="9" className="payment-yellow" />
          <path d="M16 2.5a9 9 0 0 1 0 15 9 9 0 0 1 0-15z" className="payment-orange" />
        </svg>
      );
    case "meeza":
      return (
        <svg viewBox="0 0 24 24" className={`h-[22px] w-[22px] ${className}`} aria-hidden="true">
          <path className="payment-green" d="M12 2 3 7v10l9 5 9-5V7z" />
          <path className="payment-white" d="M8 14.5V9.8l4 3 4-3v4.7" />
        </svg>
      );
    default:
      return (
        <span
          className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border border-foreground/15 ${className}`}
          aria-hidden="true"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/25" />
        </span>
      );
  }
}

function pad(digits: string, length: number) {
  return digits.length >= length ? digits.slice(0, length) : digits + "•".repeat(length - digits.length);
}

export function CardPreview({
  number,
  name,
  month,
  year,
  fallbackBrand,
}: {
  number: string;
  name: string;
  month: string;
  year: string;
  fallbackBrand: CardBrand;
}) {
  const digits = number.replace(/\D/g, "");
  const brand = detectCardBrand(digits) ?? fallbackBrand;
  const groups = pad(digits, 16).match(/.{1,4}/g) ?? [];
  const holder = name.trim();

  return (
    <div className="card-face" dir="ltr" aria-label="Card preview">
      <div className="flex items-center justify-between">
        <span className="card-chip" aria-hidden="true"><span /><span /><span /></span>
        <BrandMark brand={brand} />
      </div>
      <div className="card-number" aria-label="Card number preview">
        {groups.map((group, index) => <span key={index}>{group}</span>)}
      </div>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className="card-caption">Cardholder</span>
          <p className="card-holder">{holder || "Your name"}</p>
        </div>
        <div className="shrink-0">
          <span className="card-caption">Expires</span>
          <p className="card-holder tabular-nums">{month || "MM"} / {year || "YY"}</p>
        </div>
      </div>
    </div>
  );
}
