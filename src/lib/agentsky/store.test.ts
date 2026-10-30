import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  bootstrap: vi.fn(),
  sessions: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));
vi.mock("./client", () => ({ agentApi: mocks }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: mocks } }));

describe("workspace loading", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.onAuthStateChange.mockReturnValue({ data: { subscription: {} } });
    mocks.bootstrap.mockResolvedValue({ agents: [{ id: "main" }], tier: "pro", models: [] });
    mocks.sessions.mockResolvedValue({ sessions: [] });
  });
  afterEach(() => cleanup());

  it("shows agents even when optional history is pending", async () => {
    mocks.sessions.mockReturnValue(new Promise(() => {}));
    const store = await import("./store");
    const { result } = renderHook(() => store.useWorkspaceStore());
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await store.loadWorkspace(); });
    expect(result.current.ready).toBe(true);
    expect(result.current.agents[0]?.id).toBe("main");
  });

  it("does not call session-dependent APIs inside an auth callback", async () => {
    const store = await import("./store");
    renderHook(() => store.useWorkspaceStore());
    const callback = mocks.onAuthStateChange.mock.calls[0]?.[0];
    expect(callback).toBeTypeOf("function");
    act(() => { callback("SIGNED_IN", { user: { id: "test-user" } }); });
    expect(mocks.bootstrap).not.toHaveBeenCalled();
    await waitFor(() => expect(mocks.bootstrap).toHaveBeenCalledTimes(1));
  });
});