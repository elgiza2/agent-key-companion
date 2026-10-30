# Single repository

All Megsy AI work lives in this repository: **`elgiza2/sky-nexus-hub`**.
It is the only source deployed to Vercel (project `agentsky-nexus-3df67cfc` → `megsyai.com`).

## What was consolidated

`elgiza2/sky-nexus-core-99ae8155` was an earlier parallel copy of the same TanStack Start app.
It was fully superseded: this repository already contained every file from it except three,
which are now kept here:

| File | Where it went |
|---|---|
| `docs/android-bridge.md` | `docs/android-bridge.md` |
| `docs/payment-ux-research.md` | `docs/payment-ux-research.md` |
| `src/pages/billing/BillingPage.tsx` | `docs/legacy-BillingPage.react-router.tsx.txt` (reference only) |

The billing page was **not** merged as code: it imports `react-router-dom`, which this app no
longer uses (TanStack Router replaced it), so it is kept as a text reference instead of a
source file that would fail the type check.

## Rule from now on

- Build, test, commit and deploy **only** from this repository.
- Do not re-create a second copy of the app; branch here instead.
