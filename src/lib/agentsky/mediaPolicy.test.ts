import { describe, expect, it, vi } from "vitest";
vi.mock("./agentsky.server", () => ({
  AgentSkyError: class extends Error { constructor(public status: number, public code: string, message: string) { super(message); } },
  gateway: vi.fn(), sign: vi.fn(), verify: vi.fn(),
}));
import { pickModel, publicModels } from "./media.server";
import { detectMediaIntent } from "./mediaIntent";
describe("subscriber media policy", () => {
  it("denies both media kinds to free users", () => {
    expect(() => pickModel("image", "free")).toThrow("Pro plan");
    expect(() => pickModel("video", "free")).toThrow("Pro plan");
    expect(publicModels("free").every(m => m.locked)).toBe(true);
  });
  it("restricts subscribers to one configured fast endpoint per kind", () => {
    expect(pickModel("image", "pro", "img-pro").id).toBe("img-fast");
    expect(pickModel("video", "pro", "vid-seedance").id).toBe("vid-fast");
  });
  it("recognizes English and Egyptian media requests without external imports", () => {
    expect(detectMediaIntent("اعملي صورة قطة")).toBe("image");
    expect(detectMediaIntent("عايز فيديو لقطة")).toBe("video");
    expect(detectMediaIntent("create an image of a cat")).toBe("image");
    expect(detectMediaIntent("بلاش صور")).toBeNull();
    expect(detectMediaIntent("hello")).toBeNull();
  });
});
