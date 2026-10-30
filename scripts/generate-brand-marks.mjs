/**
 * @doc Generates src/lib/payments/brandMarks.ts from simple-icons.
 *
 * Only the brands Megsy actually shows are written out, so the app bundle never
 * pulls the full ~5 MB simple-icons index. Re-run after bumping simple-icons:
 *
 *   node scripts/generate-brand-marks.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as si from "simple-icons";

const SLUGS = [
  "visa",
  "mastercard",
  "americanexpress",
  "discover",
  "jcb",
  "applepay",
  "googlepay",
  "paypal",
  "cashapp",
  "revolut",
  "klarna",
  "afterpay",
  "pix",
  "wechat",
  "alipay",
  "kakaotalk",
  "naver",
  "tether",
  "sepa",
  "stripe",
];

const pascal = (slug) =>
  "si" +
  slug
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const entries = [];
for (const slug of SLUGS) {
  const icon = si[pascal(slug)];
  if (!icon) {
    console.warn(`! missing icon: ${slug}`);
    continue;
  }
  entries.push(
    `  ${JSON.stringify(slug)}: { title: ${JSON.stringify(icon.title)}, hex: ${JSON.stringify(
      icon.hex,
    )}, path: ${JSON.stringify(icon.path)} },`,
  );
}

const out = `/**
 * @doc Brand marks used by the payment-method UI. GENERATED FILE — do not edit.
 *
 * Source: simple-icons (CC0-1.0). Regenerate with:
 *   node scripts/generate-brand-marks.mjs
 */
export interface BrandMarkData {
  title: string;
  hex: string;
  path: string;
}

export const BRAND_MARKS = {
${entries.join("\n")}
} as const satisfies Record<string, BrandMarkData>;

export type BrandSlug = keyof typeof BRAND_MARKS;
`;

const target = "src/lib/payments/brandMarks.ts";
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, out);
console.log(`wrote ${target} with ${entries.length} marks`);
