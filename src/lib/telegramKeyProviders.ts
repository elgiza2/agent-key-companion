export type ProviderId = "cerebras" | "agentsky" | "browser-use" | "deapi" | "plusai";

export function normalizeProvider(raw: string): ProviderId | null {
  const value = raw.trim().toLowerCase().replace(/[\s_-]/g, "");
  if (["cerebras", "c"].includes(value)) return "cerebras";
  if (["agentsky", "agent", "a"].includes(value)) return "agentsky";
  if (["browseruse", "browser", "b"].includes(value)) return "browser-use";
  if (["deapi", "d"].includes(value)) return "deapi";
  if (["plusai", "plus"].includes(value)) return "plusai";
  return null;
}

export function providerFromReply(text: string): ProviderId | null {
  const match = text.match(/^KEY_PROVIDER:(\S+)/);
  return match ? normalizeProvider(match[1]) : null;
}