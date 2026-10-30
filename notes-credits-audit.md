# Megsy — Current Credit System: Full Audit

> Literal audit of how credits work today, read directly from the live Supabase project
> `qdnqxjzjecaieuavagvq` (tables, RPC bodies) and the repository code. Nothing here is assumed.

## 1. The unit

- The user-facing unit is **MC (Megsy Credits)**. It appears in the UI as `1,000 MC`, `5 MC`, etc.
- Internally credits are `numeric` on `credit_wallets`.

## 2. Wallet structure — four buckets

`public.credit_wallets` holds one row per user with four separate balances:

| Bucket | Column | Behaviour today |
|---|---|---|
| Daily | `daily_credits` | Set to **5** by `claim_daily_credits()`, once per calendar day. **Replaced, never stacked** (a user with 3 left gets 5, not 8). |
| Bonus | `bonus_credits` | Promotional credits. Referral reward = **+20 bonus credits** to the referrer (`maybe_grant_referral_credit`). |
| Plan | `plan_credits` | Subscription allowance: **1,000/month** on Pro, **12,000/year** on Pro yearly. |
| Purchased | `purchased_credits` | Bought top-up packs. Persist; they are the only bucket marketed as non-expiring. |

`get_credit_overview()` returns the total as `daily + bonus + plan + purchased`, plus `spent_today`,
`tasks_today`, `spent_this_month`, and a hardcoded `daily_allowance: 5`.

**Finding:** `daily_credit_allowance(_user_id)` is a one-line function that returns `SELECT 5`
for every user regardless of plan. Daily credits are not a plan benefit today.

## 3. Spending order

- `deduct_credits()` → `spend_credits_auto()` → `spend_user_credits()`; the 4-bucket order is
  resolved inside `spend_user_credits`.
- `spend_credits_auto(user, workspace, amount, …)` first tries the **workspace pool**
  (`workspaces.credits`) when the caller passes a workspace, enforcing
  `workspace_members.monthly_limit` and resetting `monthly_used` each calendar month; only then
  does it fall back to the personal wallet.
- `charge_credits_once(user, amount, action, description, operation_key)` is the idempotent variant
  used by media: the `operation_key` prevents double-charging the same request.
- `refund_credits_once(operation_key, reason)` reverses a charge — every failed media generation is
  auto-refunded.

## 4. What each action costs today

| Action | Cost | Where it is charged | Notes |
|---|---|---|---|
| Chat (text) | **0 credits** | `credit_pricing.feature = chat` → `credits 0, free = true` | Unlimited on every plan including free. |
| Image (Runway GPT Image 2 path) | **2 credits** | `media-video/image.ts` → `charge_credits_once(..., 2, "image_generation")` | Hardcoded constant. |
| Image (premium/Higgsfield path) | **0 for paid** | `premium_image_quota()` | Paid non-trial users are `unlimited: true`; trial users get 3/day; free users are blocked. |
| Video (live WaveSpeed path) | **25 credits** flat | `media-video/index.ts` → `handleWave()` `const cost = 25` | Model is picked by plan: paid → `wavespeed-seedance-2.0-mini`, free → `wavespeed-hailuo-2.3`. |
| Video (catalogue path, 29 models) | **60–300 credits** | `video_models.credits_per_video` read by `consume_video_quota()` | Price table: 0, 40, 60, 70, 90, 110, 120, 150, 160, 180, 200, 220, 240, 300. |
| Video (Anything API path) | per-model `credits` | `anything-api/index.ts` → `deduct_credits()` | Third pricing path for the same asset type. |
| Agent task | **1 credit to start** | `media-video/agent.ts` → `charge_credits_once(..., 1)` | UI advertises `estimated_credits: "1–50"`; only the start is charged. |
| Premium slides | **3/day free, then 1 credit** | `src/lib/slidesQuota.ts` → `consume_daily_free_or_credits("premium_slides", 3, 1)` | The only caller of the generic free-then-credit RPC. |
| Referral reward | **+20 bonus credits** | `maybe_grant_referral_credit()` | Granted to the referrer when the referral completes. |

`credit_pricing` (4 rows): `chat 0 (free)`, `image 2`, `video 25`, `agent 1 (min 1, max 50)`.

**Finding — three prices for one video:** the live path charges a flat 25, the catalogue says
60–300, and the Anything API charges its own number. A user can be charged 25 or 240 for the same
5-second clip depending on which code path the request takes.

## 5. Plan gate vs credit gate

- `consume_video_quota()`: free plan → **blocked entirely** (`video_requires_paid_plan`); paid →
  cost read from `video_models.credits_per_video`; a time-boxed `premium_day_offers` promo can
  grant free videos (`cost 0`) with its own `video_limit`.
- `video_quota_tier()` → `free` / `pro` / `elite`.
- Media and agent switching are **subscriber-only**; chat is free for everyone.
- `has_paid_plan()` / `has_elite_plan()` are the gate helpers.

## 6. Catalogue and pricing (live rows)

### Plans (`billing_catalog`)

| Tier | Interval | USD | Credits | Active |
|---|---|---|---|---|
| pro | monthly | 15 | 1,000 | yes |
| pro | monthly_intro (first month) | 7 | 1,000 | yes |
| pro | yearly | 120 | 12,000 | yes |
| pro | monthly_trial (7 days) | 7 | 24 | no |
| pro | monthly_winback | 5 | 240 | no |
| pro | yearly_winback | 149 | 3,600 | no |
| elite (Max) | monthly | 40 | 600 | no |
| elite (Max) | monthly_intro | 17 | 600 | no |
| elite (Max) | yearly | 320 | 9,000 | no |
| elite (Max) | monthly_winback | 12 | 600 | no |
| elite (Max) | yearly_winback | 299 | 9,000 | no |

**Finding:** Max at $40/month is configured with **600 credits — fewer than Pro's 1,000 at $15**.
The rows are inactive, but the configuration contradicts the UI (`Max` is marketed above Pro).

### Credit packs (`billing_catalog`, tier `credits`)

| Pack | USD | Credits | $ per credit | Active |
|---|---|---|---|---|
| pack_100 | 6 | 100 | 0.060 | no |
| pack_300 | 15 | 300 | 0.050 | no |
| pack_500 | 9 | 500 | 0.018 | yes |
| pack_700 | 29 | 700 | 0.041 | no |
| pack_1200 | 19 | 1,200 | 0.0158 | yes |
| pack_3000 | 39 | 3,000 | 0.013 | yes |

### Implied credit value

- Pro monthly: $15 / 1,000 = **$0.0150 per credit**
- Pro yearly: $120 / 12,000 = **$0.0100 per credit**
- Largest pack: $39 / 3,000 = **$0.0130 per credit**

**Finding:** the yearly plan sells credits cheaper than any top-up pack, so a rational subscriber
never buys a pack. Pack pricing does not sit above the subscription rate as it should.

## 7. Marketing promises already published

From `src/data/pricingData.ts` and the FAQ:

- "Megsy Credits — Pro includes 1,000 monthly credits. Chat remains available on the free plan;
  media and agent switching require a subscription."
- "Your first month costs $7, then Pro renews at $15 a month. Each month includes 1,000 credits."
- "Daily free credits refresh to 5 and do not stack. Purchased credits stay available; plan credits
  refresh with the subscription."
- Refund window: 7 days, provided **no more than 10% of included credits** have been consumed;
  packs are non-refundable once any credit is spent; failed generations auto-refund.

## 8. Services that exist in the product (and would fall under one unified credit)

Chat (multi-model) · Agents catalogue + agent tasks · OpenClaw agent runtime · Browser Use Cloud ·
Coding and Python execution · Deep research · Images · Video (29 models) · Premium slides ·
Documents / sheets / PDF previews · Workspaces (shared pools + per-member monthly limits) ·
Integrations · Memory · Referrals (Earn).

## 9. Inconsistencies found (the case for a unified system)

1. Three different prices for one video (25 / 60–300 / Anything API).
2. Two image systems: 2 credits on one path, "unlimited" for paid on the other.
3. Daily allowance hardcoded to 5 for every plan — Pro and free get the same daily credits.
4. Max (elite) configured below Pro on credits while priced above it.
5. Top-up packs priced above the effective subscription rate, so packs cannibalise nothing.
6. Chat costs 0 while every other action costs credits, so the unit has no anchor.
7. `consume_daily_free_or_credits()` exists but only slides use it — no shared free-tier logic.
8. No single pricing table: costs live in TypeScript constants, a DB table, and another edge
   function, so a price change needs three edits.
9. Referral pays 20 bonus credits regardless of plan value.
10. Refund policy depends on "% of credits consumed", a number the customer cannot see in a
    per-feature breakdown.
