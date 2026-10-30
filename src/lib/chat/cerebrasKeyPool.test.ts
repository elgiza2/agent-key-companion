import { describe, expect, it } from "vitest";
import { mergeCerebrasKeyCandidates } from "../../../supabase/functions/_shared/cerebrasKeyPool";

describe("mergeCerebrasKeyCandidates", () => {
  it("keeps vault priority, then appends legacy and environment keys without duplicates", () => {
    const result = mergeCerebrasKeyCandidates(
      [{ id: "vault-1", key: "vault-key-0123456789" }],
      [
        { api_key: "legacy-key-0123456789" },
        { api_key: "vault-key-0123456789" },
      ],
      "env-key-0123456789",
    );

    expect(result).toEqual([
      { id: "vault-1", key: "vault-key-0123456789" },
      { id: "", key: "legacy-key-0123456789" },
      { id: "", key: "env-key-0123456789" },
    ]);
  });

  it("ignores missing, non-string, and too-short legacy values", () => {
    const result = mergeCerebrasKeyCandidates(
      [],
      [{}, { api_key: null }, { api_key: 123 }, { api_key: "short" }],
      "",
    );

    expect(result).toEqual([]);
  });
});
