# What a Pro subscription actually buys

Reference for the consumption-metered credit system. **1 MC = $0.001 of measured provider
cost. 1,000 MC = $1 of real consumption.**

**Pro balance: 10,000 MC per month = $10 of real compute, on a $15 plan.**

---

## 1. The rate card (measured units)

| Measured unit | MC | Cost |
|---|---|---|
| Text — per 1,000 tokens, standard model | 1 | $0.001 |
| Text — per 1,000 tokens, frontier/reasoning model | 6 | $0.006 |
| Image — 1K | 20 | $0.02 |
| Image — 2K | 40 | $0.04 |
| Image — 4K | 100 | $0.10 |
| Video — per second, 720p | 100 | $0.10 |
| Video — per second, 1080p | 250 | $0.25 |
| Voice — text to speech, per 1,000 characters | 6 | $0.006 |
| Voice — speech to text, per minute | 6 | $0.006 |
| Web search — per call | 5 | $0.005 |
| Agent step — per step (includes the tokens inside that step) | 20 | $0.02 |
| Browser — per minute of runtime | 10 | $0.01 |
| Code execution — per minute | 5 | $0.005 |
| Document analysis — per page | 15 | $0.015 |

## 2. What 10,000 MC buys — one modality at a time

### Video

| Output | MC each | How many per month | Total seconds |
|---|---|---|---|
| 5 s @ 720p | 500 | **20 clips** | 100 s |
| 10 s @ 720p | 1,000 | **10 clips** | 100 s |
| 5 s @ 1080p | 1,250 | **8 clips** | 40 s |
| 10 s @ 1080p | 2,500 | **4 clips** | 40 s |
| Mixed: 10 × 720p + 4 × 1080p (all 5 s) | — | **14 clips** | 70 s |

Video is the most expensive thing in the product: **one second of 1080p costs 250 MC — a
quarter of a dollar of compute.**

### Text / chat

| Model | MC per 1,000 tokens | Total tokens per month |
|---|---|---|
| Standard | 1 | **10,000,000 tokens (10M)** |
| Frontier / reasoning | 6 | **1,666,000 tokens (1.67M)** |

| Message size (in + out) | MC each | Messages per month |
|---|---|---|
| Short, 2,000 tokens | 2 | **5,000** |
| Typical, 8,000 tokens | 8 | **1,250** |
| Heavy, 20,000 tokens | 20 | **500** |
| Typical on a frontier model, 8,000 tokens | 48 | **208** |

### Images

| Resolution | MC each | Images per month |
|---|---|---|
| 1K | 20 | **500** |
| 2K | 40 | **250** |
| 4K | 100 | **100** |

### Voice

| Task | MC | Per month |
|---|---|---|
| Speech to text | 6 per minute | **1,666 minutes (≈28 hours)** |
| Text to speech | 6 per 1,000 characters | **1,666,000 characters (≈28 hours of speech)** |

### Agents, browsing, code, research

| Task | MC each | Per month |
|---|---|---|
| Agent task, 6 steps | 120 | **83 tasks** |
| Agent task, 10 steps | 200 | **50 tasks** |
| Browser runtime | 10 per minute | **1,000 minutes (≈17 hours)** |
| Code execution | 5 per minute | **2,000 minutes (≈33 hours)** |
| Web search call | 5 | **2,000 searches** |
| Document page analysis | 15 | **666 pages** |
| Deep research run (20 searches + 60k tokens) | 160 | **62 runs** |

## 3. Real mixes — five users on the same 10,000 MC

| | Chat | Video | Images | Agents | Research | Docs |
|---|---|---|---|---|---|---|
| **Chat-heavy** | 1,250 msgs (10,000) | — | — | — | — | — |
| **Content creator** | 300 msgs (2,400) | 5 × 1080p (6,250) | 20 × 2K (800) | — | 110 searches (550) | — |
| **Social marketer** | 500 msgs (4,000) | 10 × 720p (5,000) | 50 × 1K (1,000) | — | — | — |
| **Agent operator** | 500 msgs (4,000) | — | 75 × 2K (3,000) | 25 tasks (3,000) | — | — |
| **Researcher** | 300 msgs (2,400) | — | — | — | 40 deep runs (6,400) | 80 pages (1,200) |

Every column above adds up to exactly 10,000 MC.

## 4. Rollover and top-ups

- Unused plan credits roll over **one month**, capped at one allowance → a careful user can
  bank a maximum of **20,000 MC**.
- Top-ups: 5,000 MC for $9 · 12,000 MC for $19 · 25,000 MC for $39 — always a worse per-credit
  rate than the subscription, so Pro stays the best deal.
- Purchased credits never expire; the plan balance refreshes every billing cycle.

## 5. The economics in one line

10,000 MC = **$10 of metered provider cost** sold inside a **$15** plan → the user pays 1.5×
cost at full utilisation, and at a realistic 60% utilisation our cost is ≈$6 → **~60% gross
margin**.

## 6. Sanity check against the market

| | Megsy Pro | Runway Standard | Gemini AI Pro |
|---|---|---|---|
| Price | $15/mo | $12/mo | $19.99/mo |
| 5 s clip cost | 500 MC ($0.50 of compute) | 60 credits (≈$1.15 of the plan) | ~100 Flow credits |
| Clips per month | **20 @ 720p / 8 @ 1080p** | ~10 | ~20 (Flow, not in the app) |

Megsy gives more video per dollar than Runway Standard, and video is only one of the things
the same balance pays for.
