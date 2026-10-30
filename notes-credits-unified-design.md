# Megsy Credit System 2.0 — unified design (rev. 2, Oct 2026)

Supersedes the per-action pricing draft. Three decisions drive everything below:

1. **Credits measure real consumption**, not actions. A clip costs by the second and the
   resolution; a message costs by the tokens; an image costs by the pixels.
2. **One plan only — Pro.** No tiers, no ladder, no Max.
3. **Nothing is free.** No free plan, no trial, no daily allowance, chat included.

Existing prices are unchanged: **$7 first month → $15/month**, **$120/year**.

---

## 1. The anchor

> **1 MC = $0.001 of measured provider cost.**
> **1,000 MC = $1 of real consumption.**

Every charge is derived from a measured quantity multiplied by a published rate. Nothing is
hand-picked per action, and no two code paths can produce two prices for the same asset.

## 2. The rate card (`credit_rates`)

| Measured unit | Provider cost | MC |
|---|---|---|
| Text — per 1,000 tokens, standard model | $0.001 | **1** |
| Text — per 1,000 tokens, frontier/reasoning model | $0.006 | **6** |
| Image — 1K | $0.02 | **20** |
| Image — 2K | $0.04 | **40** |
| Image — 4K | $0.10 | **100** |
| Video — per second, 720p | $0.10 | **100** |
| Video — per second, 1080p | $0.25 | **250** |
| Voice — text to speech, per 1,000 characters | $0.006 | **6** |
| Voice — speech to text, per minute | $0.006 | **6** |
| Web search — per call | $0.005 | **5** |
| Agent step — per step | $0.02 | **20** |
| Browser — per minute of runtime | $0.01 | **10** |
| Code execution — per minute | $0.005 | **5** |
| Document/page analysis — per page | $0.015 | **15** |

Charged amount = `measured quantity × rate`, rounded to a whole MC, charged only after the
operation succeeds.

### Worked examples

| Real operation | Consumption | Cost |
|---|---|---|
| Chat message | 8,000 tokens (in + out), standard | **8 MC** |
| Chat message on a frontier model | 8,000 tokens | **48 MC** |
| Image | 2K output | **40 MC** |
| Video | 5 s @ 720p | **500 MC** |
| Video | 5 s @ 1080p | **1,250 MC** |
| Video | 10 s @ 1080p | **2,500 MC** |
| Voice note | 1 minute speech to text | **6 MC** |
| Web search inside a turn | 1 call | **5 MC** |
| Agent task | 6 steps | **120 MC** |
| Deep research run | 20 searches + 60k tokens | **160 MC** |

## 3. The plan

**Pro — the only plan.**

| | Monthly | Yearly |
|---|---|---|
| Price | $7 first month, then **$15/month** | **$120/year** |
| Balance | **10,000 MC / month** | **96,000 MC, delivered upfront** |
| Effective credit price | $0.0015 per MC | $0.00125 per MC |

- 10,000 MC = **$10 of metered provider cost** on a $15 plan → 1.5× cost coverage at 100%
  utilisation.
- At a realistic **60% utilisation** our cost is ≈$6 of $15 → **~60% gross margin**.
- Yearly buyers get a better per-credit rate ($0.00125) — the only discount in the system.

**Top-ups (overflow only, never better than the subscription):**

| Pack | Price | Per credit |
|---|---|---|
| 5,000 MC | $9 | $0.0018 |
| 12,000 MC | $19 | $0.00158 |
| 25,000 MC | $39 | $0.00156 |

**No free anything:** an account without an active Pro subscription cannot use chat, media,
agents, research, slides or code. There is no trial, no daily allowance, no free bucket.

## 4. What 10,000 MC buys

1,250 chat messages (8 MC each) · 250 images at 2K · 20 videos of 5 s at 720p · 8 videos of
5 s at 1080p · 83 agent tasks (6 steps) · or any mix — the balance is one pool.

## 5. Metering pipeline (what to build)

1. One measurement layer: input/output token counter on every model call.
2. Media measured from real output: video seconds × resolution, image pixels, audio duration,
   agent step count, browser/code minutes.
3. `credit_rates` table mapping each measured unit to MC.
4. One RPC — `spend_credits(action_key, usage, operation_key)` — takes the measured usage and
   returns the charge. Idempotent on `operation_key`.
5. Store `provider_cost_usd` on every operation so margin is measured, not guessed.
6. Delete the daily allowance and every free path; every call must pass the balance check.
7. Collapse the two image paths onto one pixel-based meter.
8. Usage screen shows unit, quantity, cost and MC per operation.

## 6. Rules

- Purchased credits never expire. Plan credits roll over one month, capped at one allowance.
- Charge on success, auto-refund on failure — the existing operation-key pattern becomes the
  only write path.
- Pre-flight estimate from expected consumption (token estimate, duration, resolution) before
  anything above 20 MC runs.
- Low-balance prompts at 20% and 5%, with a one-tap top-up sheet.
- Refunds stated in credits, not percentages.
- Referral pays **1,000 MC** when the referred user subscribes — nothing for a signup.

## 7. What we will not copy

Claude ("at least 5x Free"), Gemini (2x/4x/20x on an unpublished quota) and Grok (a percentage
bar) all sell an allowance they never quantify, which lets them cut it mid-cycle without
changing a published number. Megsy publishes the unit, the quantity and the rate — and gives
nothing away for free, so there is no allowance to renegotiate.
