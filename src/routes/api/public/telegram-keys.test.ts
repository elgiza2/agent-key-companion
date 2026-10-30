import { describe, expect, it } from "vitest";
import { normalizeProvider, providerFromReply } from "@/lib/telegramKeyProviders";

describe("telegram provider routing", () => {
  it.each([
    ["deapi", "deapi"], ["browseruse", "browser-use"],
    ["agentsky", "agentsky"], ["cerebras", "cerebras"], ["Plus ai", "plusai"],
  ])("routes %s to its own pool", (input, expected) => {
    expect(normalizeProvider(input)).toBe(expected);
  });
  it("preserves selection in a reply across webhook restarts", () => {
    expect(providerFromReply("KEY_PROVIDER:browser-use\nBrowser Use")).toBe("browser-use");
    expect(providerFromReply("KEY_PROVIDER:plusai\nPlus AI")).toBe("plusai");
    expect(providerFromReply("unrelated message")).toBeNull();
  });
  it("maps buttons and commands to the three chat providers", () => {
    expect(normalizeProvider("keys:provider:cerebras".slice("keys:provider:".length))).toBe(
      "cerebras",
    );
    expect(normalizeProvider("cerebras")).toBe("cerebras");
    expect(normalizeProvider("agentsky")).toBe("agentsky");
    expect(normalizeProvider("browseruse")).toBe("browser-use");
    expect(normalizeProvider("browser-use")).toBe("browser-use");
  });

  it("parses explicit add commands without relying on pending state", () => {
    const add = "/add_browseruse bu-key-123".match(
      /^\/add[_-]?(cerebras|agentsky|agent|browseruse|browser-use|browser)\s+(\S+)\s*$/i,
    );
    expect(add?.[1]).toBe("browseruse");
    expect(add?.[2]).toBe("bu-key-123");
    expect(normalizeProvider(add?.[1] ?? "")).toBe("browser-use");
  });

  it("parses per-provider delete/enable commands", () => {
    const mod = "/del_cerebras 2".match(
      /^\/(del|on)[_-]?(cerebras|agentsky|agent|browseruse|browser-use|browser)?\s+(\d+)\s*$/i,
    );
    expect(mod?.[1]).toBe("del");
    expect(normalizeProvider(mod?.[2] ?? "")).toBe("cerebras");
    expect(mod?.[3]).toBe("2");
  });
});
