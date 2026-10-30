/** @doc Generative UI contract — the only components the chat model may draw.
 *
 *  The model writes one ```ui fenced block holding a compact JSON spec; the app
 *  validates it here and renders it with its own components. Unknown or broken
 *  blocks are dropped, never shown raw.
 */
import { z } from "zod";

const str = z.string().trim().min(1).max(400);
const opt = z.string().trim().max(400).optional();
const id = z.string().trim().min(1).max(40);

export const BLOCKS = {
  choice: z.object({ type: z.literal("choice"), id, label: str, options: z.array(str).min(1).max(12), multi: z.boolean().optional(), default: z.union([z.string(), z.array(z.string())]).optional() }),
  slider: z.object({ type: z.literal("slider"), id, label: str, min: z.number(), max: z.number(), step: z.number().positive().optional(), unit: opt, default: z.number().optional() }),
  number: z.object({ type: z.literal("number"), id, label: str, min: z.number().optional(), max: z.number().optional(), default: z.number().optional() }),
  date: z.object({ type: z.literal("date"), id, label: str }),
  text: z.object({ type: z.literal("text"), id, label: str, placeholder: opt }),
  cards: z.object({ type: z.literal("cards"), items: z.array(z.object({ title: str, subtitle: opt, image: opt, meta: opt, price: opt, action: opt })).min(1).max(10) }),
  table: z.object({ type: z.literal("table"), columns: z.array(z.string()).min(1).max(8), rows: z.array(z.array(z.union([z.string(), z.number()]))).min(1).max(30) }),
  chart: z.object({ type: z.literal("chart"), label: opt, unit: opt, items: z.array(z.object({ label: str, value: z.number() })).min(1).max(12) }),
  stats: z.object({ type: z.literal("stats"), items: z.array(z.object({ label: str, value: z.union([z.string(), z.number()]) })).min(1).max(6) }),
  steps: z.object({ type: z.literal("steps"), items: z.array(str).min(1).max(12) }),
  hero: z.object({ type: z.literal("hero"), title: str, subtitle: opt, image: str, tag: opt }),
  gallery: z.object({ type: z.literal("gallery"), items: z.array(z.object({ image: str, caption: opt })).min(1).max(8) }),
  note: z.object({ type: z.literal("note"), text: str }),
  buttons: z.object({ type: z.literal("buttons"), items: z.array(z.object({ label: str, action: opt })).min(1).max(6) }),
} as const;

export type BlockType = keyof typeof BLOCKS;
export type Block = { [K in BlockType]: z.infer<(typeof BLOCKS)[K]> }[BlockType];
export type UISpec = { title?: string; subtitle?: string; image?: string; blocks: Block[]; submit?: { label: string } };

const INPUTS = new Set(["choice", "slider", "number", "date", "text"]);
export const isInput = (b: Block) => INPUTS.has(b.type);

/** Parses a (possibly partial) block. Returns null while the JSON is incomplete. */
export function parseUISpec(source: string): UISpec | null {
  let raw: any;
  try {
    raw = JSON.parse(source.trim());
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.blocks)) return null;
  const blocks: Block[] = [];
  for (const b of raw.blocks) {
    const schema = BLOCKS[b?.type as BlockType];
    const r = schema?.safeParse(b);
    if (r?.success) blocks.push(r.data as Block);
  }
  if (!blocks.length) return null;
  const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 160) : undefined);
  const submitLabel = s(raw.submit?.label) ?? (typeof raw.submit === "string" ? s(raw.submit) : undefined);
  const hasInputs = blocks.some(isInput);
  return {
    title: s(raw.title),
    subtitle: s(raw.subtitle),
    image: s(raw.image),
    blocks,
    submit: hasInputs ? { label: submitLabel ?? "Continue" } : undefined,
  };
}

export type Values = Record<string, string | number | string[] | undefined>;

/** The readable message a submit sends back to the agent. */
export function formatSubmission(spec: UISpec, values: Values): string {
  const lines = [spec.submit?.label ?? "Continue"];
  for (const b of spec.blocks) {
    if (!isInput(b)) continue;
    const v = values[(b as any).id];
    if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) continue;
    const unit = b.type === "slider" && b.unit ? ` ${b.unit}` : "";
    lines.push(`- ${(b as any).label}: ${Array.isArray(v) ? v.join(", ") : v}${unit}`);
  }
  return lines.join("\n");
}

/** Removes ```ui blocks from text (used for copy/share/plain previews). */
export const stripUIBlocks = (text: string) => text.replace(/```[ \t]*(?:ui|widget|openui)\b[\s\S]*?(```|$)/g, "").trim();

/**
 * Some pipelines drop the ```ui fence and leave the raw JSON spec in the text.
 * Re-wrap any bare top-level JSON object that looks like a UI spec
 * (has a "blocks" array) so it still renders as a card.
 */
export function wrapBareUISpecs(input: string): string {
  if (!input.includes('"blocks"')) return input;
  // Close a trailing ```ui fence the model forgot to close.
  let text = input;
  const fenceCount = (text.match(/```/g) || []).length;
  if (fenceCount % 2 === 1 && /```[ \t]*ui\b[^`]*$/.test(text)) text = text.replace(/\s*$/, "\n```");
  const fences: Array<[number, number]> = [];
  text.replace(/```[\s\S]*?(```|$)/g, (m, _e, off: number) => (fences.push([off, off + m.length]), m));
  const inFence = (i: number) => fences.some(([a, b]) => i >= a && i < b);
  let out = "";
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf("{", i);
    if (start < 0 || inFence(start)) {
      if (start < 0) break;
      out += text.slice(i, start + 1);
      i = start + 1;
      continue;
    }
    let depth = 0, end = -1, inStr = false, esc = false;
    for (let j = start; j < text.length; j++) {
      const c = text[j];
      if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true;
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) { end = j; break; }
    }
    if (end < 0) break;
    const chunk = text.slice(start, end + 1);
    let ok = false;
    try { const o = JSON.parse(chunk); ok = !!o && Array.isArray(o.blocks); } catch { /* not json */ }
    out += text.slice(i, start) + (ok ? "\n```ui\n" + chunk + "\n```\n" : chunk);
    i = end + 1;
  }
  return out + text.slice(i);
}
