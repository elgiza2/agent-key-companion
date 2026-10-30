/** Translate stored Megsy JSON answers to the original OpenUI primitives. */
import type { Block, UISpec } from "../genui/schema";
const q = (value: unknown) => JSON.stringify(value ?? null);
const call = (name: string, ...args: unknown[]) => `${name}(${args.map(q).join(", ")})`;
const col = (nodes: string[], gap = 4) => `Col([${nodes.join(", ")}], ${gap})`;
const grid = (nodes: string[]) => `Grid([${nodes.join(", ")}], 3, 140, 3)`;
const photo = (image: string, alt: string, ratio = 1.6) =>
  /^https?:\/\//.test(image) ? call("Image", image, alt, ratio) : call("SearchImage", image, ratio);
const button = (label: string, message = label) =>
  `Button(${q(label)}, @ToAssistant(${q(message)}), "outline")`;
export function specToOpenUI(spec: UISpec): string {
  const states: string[] = [];
  const nodes: string[] = [];
  if (spec.image && spec.blocks[0]?.type !== "hero")
    nodes.push(photo(spec.image, spec.title ?? ""));
  if (spec.title && spec.blocks[0]?.type !== "hero") nodes.push(call("Title", spec.title, "lg"));
  if (spec.subtitle) nodes.push(call("Text", spec.subtitle, "sm", "muted"));
  const block = (b: Block, i: number): string => {
    const variable = `$field${i}`;
    switch (b.type) {
      case "hero":
        return col(
          [
            photo(b.image, b.title),
            ...(b.tag ? [call("Badge", b.tag, "info")] : []),
            call("Title", b.title, "lg"),
            ...(b.subtitle ? [call("Text", b.subtitle, "sm", "muted")] : []),
          ],
          2,
        );
      case "gallery":
        return `Carousel([${b.items.map((g) => col([photo(g.image, g.caption ?? "", 1.25), call("Caption", g.caption ?? "")], 2)).join(", ")}], 200)`;
      case "choice":
        if (b.multi) {
          const defaults = Array.isArray(b.default) ? b.default : [];
          b.options.forEach((o, j) => states.push(`${variable}_${j} = ${defaults.includes(o)}`));
          return col(
            [
              call("Label", b.label),
              ...b.options.map((o, j) => `Checkbox(${variable}_${j}, ${q(o)})`),
            ],
            2,
          );
        }
        states.push(`${variable} = ${q(b.default ?? "")}`);
        return `RadioGroup(${variable}, ${q(b.options)}, ${q(b.label)}, "pills")`;
      case "slider":
        states.push(`${variable} = ${q(b.default ?? Math.round((b.min + b.max) / 2))}`);
        return `Slider(${variable}, ${b.min}, ${b.max}, ${b.step ?? 1}, ${q(b.label)}, ${q(b.unit)})`;
      case "number":
        states.push(`${variable} = ${q(b.default ?? b.min ?? 1)}`);
        return `Input(${variable}, ${q(b.label)}, "number")`;
      case "date":
        states.push(`${variable} = ""`);
        return `DatePicker(${variable}, ${q(b.label)})`;
      case "text":
        states.push(`${variable} = ""`);
        return `Input(${variable}, ${q(b.label)}, "text", ${q(b.placeholder)})`;
      case "cards":
        return `Carousel([${b.items.map((c) => `Card([${[photo(c.image ?? c.title, c.title, 1.33), call("Title", c.title, "md"), ...(c.subtitle ? [call("Text", c.subtitle, "sm", "muted")] : []), ...(c.price ? [call("Badge", c.price)] : []), ...(c.meta ? [call("Caption", c.meta)] : []), button(c.action ?? "More details", `${c.action ?? "Tell me more about"}: ${c.title}`)].join(", ")}])`).join(", ")}], 240)`;
      case "table":
        return call("Table", b.columns, b.rows);
      case "chart":
        return col([
          ...(b.label ? [call("Label", b.label)] : []),
          call(
            "Chart",
            "bar",
            b.items.map((x) => ({ label: x.label, value: x.value })),
            "label",
            ["value"],
          ),
        ]);
      case "stats":
        return grid(
          b.items.map(
            (s) =>
              `Card([${call("Caption", s.label)}, ${call("Title", String(s.value), "2xl")}], "soft", 4, 2)`,
          ),
        );
      case "steps":
        return call("List", b.items, "number", true);
      case "note":
        return `Card([${call("Text", b.text, "sm")}], "soft", 4)`;
      case "buttons":
        return `Row([${b.items.map((b) => button(b.label, b.action ?? b.label)).join(", ")}], 2, null, null, true)`;
    }
  };
  nodes.push(...spec.blocks.map(block));
  if (spec.submit) {
    const values = spec.blocks.flatMap((b, i) =>
      b.type === "choice" && b.multi
        ? [
            `${q(b.label)}: [${b.options.map((o, j) => `$field${i}_${j} ? ${q(o)} : ""`).join(", ")}]`,
          ]
        : "id" in b
          ? [`${q(b.label)}: $field${i}`]
          : [],
    );
    nodes.push(
      `Button(${q(spec.submit.label)}, @ToAssistant(${q(spec.submit.label)}, {${values.join(", ")}}), "solid", null, "lg", "arrow-right", false, true)`,
    );
  }
  return `root = ${spec.submit ? `Col([Form([${nodes.join(", ")}])], 4)` : col(nodes)}\n${states.join("\n")}`;
}
