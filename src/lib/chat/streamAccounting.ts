/** Keep bookkeeping inside the response lifetime, but off first-byte delivery. */
export function withStreamAccounting(
  body: ReadableStream<Uint8Array>,
  recordUse: () => Promise<void>,
): ReadableStream<Uint8Array> {
  return body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    async flush() {
      try {
        await recordUse();
      } catch {
        console.warn("[chat] Could not record provider key use");
      }
    },
  }));
}