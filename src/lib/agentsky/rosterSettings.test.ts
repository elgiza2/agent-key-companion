import { describe, expect, it } from "vitest";
import { buildAgentRosterContext, getAutoJoinAgentIds } from "./rosterSettings";

describe("agent roster routing preferences", () => {
  it("allows auto-join only for enabled specialist IDs", () => {
    const raw = JSON.stringify({
      enabledIds: ["agent-a", "agent-b"],
      autoJoinIds: ["agent-b", "agent-disabled", "agent-b"],
    });
    expect(getAutoJoinAgentIds(raw)).toEqual(["agent-b"]);
    expect(buildAgentRosterContext(raw)).toContain("agent-b");
    expect(buildAgentRosterContext(raw)).not.toContain("agent-disabled");
  });

  it("defaults to no auto-join when settings are missing or malformed", () => {
    expect(getAutoJoinAgentIds(null)).toEqual([]);
    expect(getAutoJoinAgentIds("not json")).toEqual([]);
    expect(buildAgentRosterContext(null)).toContain("no specialists are enabled");
  });
});
