import { afterEach, describe, expect, it, vi } from "vitest";
import { isFastLaneEligible, tryFastChat } from "./fastChat";

describe("isFastLaneEligible media routing", () => {
  it("routes Arabic image requests straight to the full lane", () => {
    expect(
      isFastLaneEligible({
        messages: [{ role: "user", content: "اعملي صورة تعبر عنه" }],
      }),
    ).toBe(false);
  });
  it("routes Arabic video requests straight to the full lane", () => {
    expect(
      isFastLaneEligible({
        messages: [{ role: "user", content: "اعمل فيديو قصير" }],
      }),
    ).toBe(false);
  });
  it("keeps ordinary text questions on the fast lane", () => {
    expect(
      isFastLaneEligible({
        messages: [{ role: "user", content: "ما هي عاصمة مصر؟" }],
      }),
    ).toBe(true);
  });
});

function sseResponse(contents: string[]) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const content of contents) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`),
        );
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

function rawSseResponse(frame: string) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(frame));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

describe("tryFastChat request options", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("attaches the caller session to the local chat endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseResponse(["Hello"]));
    vi.stubGlobal("fetch", fetchMock);
    await tryFastChat({ messages: [{ role: "user", content: "Hello" }], authToken: "caller-token", fingerprint: "f", onDelta: vi.fn() });
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get("Authorization")).toBe("Bearer caller-token");
  });

  it("does not count reasoning-only completion as an answer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(rawSseResponse('data:{"choices":[{"delta":{"reasoning_content":"thinking"}}]}\n\ndata:[DONE]\n')));
    const onDelta = vi.fn();
    expect(await tryFastChat({ messages: [{ role: "user", content: "Hello" }], authToken: "t", fingerprint: "f", onDelta })).toBe("escalate");
    expect(onDelta).not.toHaveBeenCalled();
  });

  it("allows delayed response headers until the user stops", async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal("fetch", vi.fn((_url, init) => new Promise((resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("Stopped", "AbortError")));
        setTimeout(() => resolve(sseResponse(["Answer after waiting"])), 30000);
      })));
      const onDelta = vi.fn();
      const turn = tryFastChat({ messages: [{ role: "user", content: "Hello" }], authToken: "t", fingerprint: "f", onDelta });
      await vi.advanceTimersByTimeAsync(30000);
      expect(await turn).toBe("answered");
      expect(onDelta).toHaveBeenCalledWith("Answer after waiting");
    } finally { vi.useRealTimers(); }
  });

  it("keeps the small output budget when forcing a safe trivial turn", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ escalate: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await tryFastChat({
      messages: [{ role: "user", content: "تمام" }],
      authToken: "test-token",
      fingerprint: "test-fingerprint",
      force: true,
      maxTokens: 700,
      routingContext: "specialist_auto_join=none",
      onDelta: () => undefined,
    });

    expect(outcome).toBe("escalate");
    const edgeCall = fetchMock.mock.calls.find(([url]) => String(url).includes("chat-fast"));
    expect(edgeCall).toBeDefined();
    const requestBody = JSON.parse((edgeCall?.[1] as RequestInit).body as string);
    expect(requestBody).toMatchObject({
      force: true,
      maxTokens: 700,
      routingContext: "specialist_auto_join=none",
      messages: [{ role: "user", content: "تمام" }],
    });
  });

  it("intercepts a split route sentinel without showing it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(sseResponse(["[[MEGSY_ESCALATE_", "TO_FULL_CHAT]]", "\n"])),
    );
    const onDelta = vi.fn();

    const outcome = await tryFastChat({
      messages: [{ role: "user", content: "ابحث عن آخر الأخبار" }],
      authToken: "test-token",
      fingerprint: "test-fingerprint",
      onDelta,
    });

    expect(outcome).toBe("escalate");
    expect(onDelta).not.toHaveBeenCalled();
  });

  it("intercepts the research route suffix even when it arrives in separate chunks", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(sseResponse(["[[MEGSY_ESCALATE_TO_FULL_CHAT", ":research", "]]", "\n"])),
    );
    const onDelta = vi.fn();

    const outcome = await tryFastChat({
      messages: [{ role: "user", content: "ابحث عن الموضوع" }],
      authToken: "test-token",
      fingerprint: "test-fingerprint",
      onDelta,
    });

    expect(outcome).toBe("escalate");
    expect(onDelta).not.toHaveBeenCalled();
  });

  it("streams a direct answer as soon as the route prefix is not a sentinel", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(sseResponse(["Hello", " there"])));
    const onDelta = vi.fn();

    const outcome = await tryFastChat({
      messages: [{ role: "user", content: "Say hello" }],
      authToken: "test-token",
      fingerprint: "test-fingerprint",
      onDelta,
    });

    expect(outcome).toBe("answered");
    expect(onDelta.mock.calls.flat().join("")).toBe("Hello there");
  });

  it("shows a forced greeting before stream completion", async () => {
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    const body = new ReadableStream<Uint8Array>({ start(c) { controller = c; } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { headers: { "content-type": "text/event-stream" } })));
    const onDelta = vi.fn();
    const turn = tryFastChat({ messages: [{ role: "user", content: "Hello" }], authToken: "t", fingerprint: "f", force: true, onDelta });
    controller?.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'));
    await vi.waitFor(() => expect(onDelta).toHaveBeenCalledWith("Hello"));
    controller?.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
    controller?.close();
    expect(await turn).toBe("answered");
  });

  it("shows an ordinary short answer before the provider finishes", async () => {
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    const body = new ReadableStream<Uint8Array>({ start(c) { controller = c; } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { headers: { "content-type": "text/event-stream" } })));
    const onDelta = vi.fn();
    const turn = tryFastChat({ messages: [{ role: "user", content: "ما هي عاصمة مصر؟" }], authToken: "t", fingerprint: "f", onDelta });
    controller?.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"القاهرة"}}]}\n\n'));
    await vi.waitFor(() => expect(onDelta).toHaveBeenCalledWith("القاهرة"));
    controller?.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":" هي العاصمة."}}]}\n\ndata: [DONE]\n\n'));
    controller?.close();
    expect(await turn).toBe("answered");
    expect(onDelta.mock.calls.flat().join("")).toBe("القاهرة هي العاصمة.");
  });

  it("parses a final data: frame without a space or trailing newline", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          rawSseResponse(
            `data:${JSON.stringify({ choices: [{ delta: { content: "وصل الرد" } }] })}`,
          ),
        ),
    );
    const onDelta = vi.fn();

    const outcome = await tryFastChat({
      messages: [{ role: "user", content: "سؤال سريع" }],
      authToken: "test-token",
      fingerprint: "test-fingerprint",
      onDelta,
    });

    expect(outcome).toBe("answered");
    expect(onDelta.mock.calls.flat().join("")).toBe("وصل الرد");
  });

  it("delivers reasoning separately from visible answer text", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: "تحليل" } }] })}\n\n` +
              `data: ${JSON.stringify({ choices: [{ delta: { content: "الإجابة" } }] })}\n\n` +
              "data: [DONE]\n\n",
          ),
        );
        controller.close();
      },
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(body, { headers: { "content-type": "text/event-stream" } }),
        ),
    );
    const onDelta = vi.fn();
    const onReasoning = vi.fn();

    const outcome = await tryFastChat({
      messages: [{ role: "user", content: "اشرح" }],
      authToken: "test-token",
      fingerprint: "test-fingerprint",
      onDelta,
      onReasoning,
    });

    expect(outcome).toBe("answered");
    expect(onReasoning.mock.calls.flat().join("")).toBe("تحليل");
    expect(onDelta.mock.calls.flat().join("")).toBe("الإجابة");
  });
});

describe("route marker after a preamble", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("escalates without showing the preamble when the marker comes mid-answer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse(["We need to generate an image using the tool. ", "[[MEGSY_ESCALATE_TO_FULL_CHAT:media]]"]),
      ),
    );
    const shown: string[] = [];
    const outcome = await tryFastChat({
      messages: [{ role: "user", content: "hi" }],
      authToken: "t",
      fingerprint: "f",
      onDelta: (c) => shown.push(c),
    });
    expect(outcome).toBe("escalate");
    expect(shown.join("")).toBe("");
  });
});
