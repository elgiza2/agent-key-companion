import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Returns only whether an account exists for this exact email (used to pick sign-in vs sign-up). */
export const checkEmailRegistered = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: z.string().trim().toLowerCase().email().max(254) }).parse(d))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return { exists: null as boolean | null };
    try {
      const res = await fetch(
        `${url}/auth/v1/admin/users?filter=${encodeURIComponent(data.email)}&per_page=50`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } },
      );
      if (!res.ok) return { exists: null as boolean | null };
      const json = (await res.json()) as { users?: { email?: string | null }[] };
      if (!Array.isArray(json.users)) return { exists: null as boolean | null };
      const exists = json.users.some((u) => typeof u.email === "string" && u.email.toLowerCase() === data.email);
      return { exists: exists as boolean | null };
    } catch {
      return { exists: null as boolean | null };
    }
  });
