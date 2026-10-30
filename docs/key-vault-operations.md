# Key vault deployment and migration

`KEY_VAULT_SECRET` is the server-only encryption secret for provider keys in
`service_keys`. The Telegram webhook writes encrypted keys; existing Supabase
functions read them. Every writer and reader must receive the **same value**.
Never expose it in source, chat, logs, agent instructions or tracked `.env`
files. Never prefix it with `VITE_`.

## Current configuration

The secret was generated and saved in this Lovable project's encrypted secret
store. That does not confirm configuration on Vercel or external Supabase.
Generated secret values cannot be retrieved through the secrets tools; do not
promise that a future agent can copy the value to another host.

## Moving a repository or host

1. Preserve this document, `.env.example` and root `AGENTS.md`.
2. Preserve the existing secret when retaining encrypted rows. A repository
   transfer does not automatically transfer hosting environment variables.
3. Securely provision the same value in Vercel project → Settings → Environment
   Variables and the external Supabase project's function secrets. Never put
   the value in the repository, including `.env` or this template.
4. Redeploy the affected app/functions and verify an authorized save followed
   by server-side decrypt/read, without outputting any provider key.

## An inaccessible or missing secret

Do not generate a replacement while encrypted rows remain: a different value
makes them unreadable. Recover the original through secure configuration.
If recovery is impossible, agree on an explicit reset and re-entry of keys
with the owner; never silently rotate the secret or delete data.

When multiple hosts need manual entry and the existing value cannot be
securely transferred, use a secure secret-entry form with generate/copy and
the other host named as destination. Updating an existing secret requires
the update form and explicit agreement before rotation.

`.env.example` contains only an empty configuration name. The project's
`.gitignore` is platform-managed and currently does not exclude `.env`, so
never write private values there. Keep real values in secure host settings.