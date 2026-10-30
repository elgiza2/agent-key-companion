export const AGENT_ROSTER_STORAGE_KEY = "megsy.agent-roster.v1";

const MAX_AGENT_IDS = 12;
const MAX_ID_LENGTH = 128;

type RosterSettings = {
  enabledIds?: unknown;
  autoJoinIds?: unknown;
};

function cleanIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of value) {
    if (typeof raw !== "string") continue;
    const id = raw.trim();
    if (!id || id.length > MAX_ID_LENGTH || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    if (result.length >= MAX_AGENT_IDS) break;
  }
  return result;
}

export function getAutoJoinAgentIds(rawSettings: string | null | undefined): string[] {
  if (!rawSettings) return [];
  try {
    const parsed = JSON.parse(rawSettings) as RosterSettings;
    const enabled = new Set(cleanIds(parsed?.enabledIds));
    return cleanIds(parsed?.autoJoinIds).filter((id) => enabled.has(id));
  } catch {
    return [];
  }
}

export function buildAgentRosterContext(rawSettings: string | null | undefined): string {
  const ids = getAutoJoinAgentIds(rawSettings);
  if (!ids.length) {
    return "SPECIALIST ROUTING PREFERENCE: no specialists are enabled for auto-join. Keep Megsy Quick Chat as the lead and do not auto-delegate; a specialist explicitly selected for this turn may still be used.";
  }
  return `SPECIALIST ROUTING PREFERENCE (browser-stored user setting): auto-join is enabled only for these specialist IDs: ${ids.join(", ")}. Keep Megsy Quick Chat as the lead and consider these specialists only when genuinely needed. This preference does not override safety or server-side access checks.`;
}

export function readAgentRosterContext(): string {
  try {
    if (typeof window === "undefined") return buildAgentRosterContext(null);
    return buildAgentRosterContext(window.localStorage.getItem(AGENT_ROSTER_STORAGE_KEY));
  } catch {
    return buildAgentRosterContext(null);
  }
}
