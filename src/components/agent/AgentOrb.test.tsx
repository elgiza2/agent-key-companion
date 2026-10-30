import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgentOrb } from "./AgentOrb";

describe("AgentOrb", () => {
  it.each(["thinking", "tool"] as const)("shows MegsyStar instead of the orb while %s", (state) => {
    const { container } = render(<AgentOrb state={state} size={24} />);

    expect(container.querySelector(".megsy-thinking-star svg")).not.toBeNull();
    expect(container.querySelector(".ag-orb")).toBeNull();
  });

  it("keeps the orb for idle state", () => {
    const { container } = render(<AgentOrb state="idle" size={24} />);

    expect(container.querySelector(".ag-orb[data-state='idle']")).not.toBeNull();
    expect(container.querySelector(".megsy-thinking-star")).toBeNull();
  });
});
