import { describe, expect, it, vi } from "vitest";
import { withStreamAccounting } from "./streamAccounting";

describe("stream accounting", () => {
  it("delivers the first bytes before pending accounting completes", async () => {
    let release: (() => void) | undefined;
    const recordUse = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
    const source = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode("first token")); c.close(); } });
    const reader = withStreamAccounting(source, recordUse).getReader();
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toBe("first token");
    const completion = reader.read();
    await vi.waitFor(() => expect(recordUse).toHaveBeenCalledOnce());
    release?.();
    expect((await completion).done).toBe(true);
  });

  it("does not discard a successful answer when bookkeeping fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const source = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode("answer")); c.close(); } });
      expect(await new Response(withStreamAccounting(source, async () => { throw new Error("unavailable"); })).text()).toBe("answer");
    } finally { warn.mockRestore(); }
  });
});