/** Trims conversation history before sending to save tokens: keeps the last
 * `keep` turns and shortens long text in all but the newest `fullTail` turns. */
export function compactHistory<T extends { role?: string; content?: unknown }>(
  messages: T[],
  keep = 10,
  fullTail = 4,
  maxChars = 1200,
): T[] {
  const recent = messages.slice(-keep);
  const cut = recent.length - fullTail;
  return recent.map((m, i) => {
    if (i >= cut || typeof m.content !== "string" || m.content.length <= maxChars) return m;
    return { ...m, content: `${m.content.slice(0, maxChars)}\n…[earlier text shortened]` };
  });
}
