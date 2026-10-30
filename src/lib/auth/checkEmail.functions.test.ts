import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    inputValidator: (validate: (data: unknown) => unknown) => ({
      handler: (handler: (input: { data: unknown }) => unknown) =>
        (input: { data: unknown }) => handler({ data: validate(input.data) }),
    }),
  }),
}));

import { checkEmailRegistered } from "./checkEmail.functions";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function reply(body: unknown, status = 200) {
  vi.stubEnv("SUPABASE_URL", "https://auth.example.com");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-server-key");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));
}

describe("server email lookup", () => {
  it("recognizes the registered support account with normalized email", async () => {
    reply({ users: [{ email: "support@megsyai.com" }] });
    expect(await checkEmailRegistered({ data: { email: " SUPPORT@megsyai.com " } })).toEqual({ exists: true });
  });

  it("returns false for a new email without creating an account", async () => {
    reply({ users: [] });
    expect(await checkEmailRegistered({ data: { email: "new@example.com" } })).toEqual({ exists: false });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain("/auth/v1/admin/users?");
  });

  it("does not mistake a partial email match for a registered account", async () => {
    reply({ users: [{ email: "other-support@megsyai.com" }] });
    expect(await checkEmailRegistered({ data: { email: "support@megsyai.com" } })).toEqual({ exists: false });
  });

  it("keeps service errors distinct from an unregistered email", async () => {
    reply({ error: "unavailable" }, 503);
    expect(await checkEmailRegistered({ data: { email: "support@megsyai.com" } })).toEqual({ exists: null });
  });

  it("keeps malformed results distinct from an unregistered email", async () => {
    reply({});
    expect(await checkEmailRegistered({ data: { email: "support@megsyai.com" } })).toEqual({ exists: null });
  });
});