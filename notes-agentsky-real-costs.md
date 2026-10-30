# Real provider costs — AgentSky (agentsky.dev)

Everything below comes from the live AgentSky catalog and pricing page (`GET /v1/endpoints`,
`GET /v1/models`, `agentsky.dev/pricing`, `platform.agentsky.dev/docs/capabilities`), read on
11 October 2026. This replaces every invented rate in the earlier drafts.

**We buy everything from one provider: AgentSky.** So our cost per action is not a guess — it
is AgentSky's published rate.

---

## 1. What AgentSky charges for

Two meters, plus media and tools:

| Meter | Rate |
|---|---|
| **Cloud compute while awake** | **$0.461/hour** on the default 2 vCPU · 8 GB machine — **$0.000128/second**, billed per second |
| Idle / parked | **$0** — the machine suspends when idle and storage stays included |
| **Model tokens** | At or below the maker's rate — most models are **30% off list** |
| Media | Per asset or per second (below) |
| Tools | Only when called (below) |

### Compute machine rates (16 sizes)

| Machine | Per hour | Always-on / month |
|---|---|---|
| 1 vCPU · 512 MB | **$0.117** | $84.24 |
| 1 vCPU · 1 GB | $0.133 | $95.90 |
| 1 vCPU · 2 GB | $0.166 | $119.23 |
| 1 vCPU · 4 GB | $0.230 | $165.89 |
| 2 vCPU · 512 MB | $0.218 | $156.82 |
| 2 vCPU · 1 GB | $0.234 | $168.48 |
| 2 vCPU · 2 GB | $0.266 | $191.81 |
| 2 vCPU · 4 GB | $0.331 | $238.46 |
| **2 vCPU · 8 GB (default)** | **$0.461** | $331.78 |

### Model rates (per 1M tokens, in / out)

| Model | In | Out | vs the cheapest |
|---|---|---|---|
| Claude Haiku 5.5 · GPT-6 Luna | $0.07 | $0.35 | 1× |
| GLM-5.3 | $0.98 | $3.08 | 14× |
| DeepSeek V4 Pro | $0.924 | $2.772 | 13× |
| Claude Sonnet 5.5 · GPT-6.1 Sol | $1.40 | $7.00 | 20× |
| Gemini 3.8 Flash | $1.50 | $7.50 | 21× |
| Grok 4.7 | $2.00 | $6.00 | 22× |
| Claude Opus 5.5 | $2.80 | $14.00 | 40× |
| Claude Opus 5 | $3.50 | $17.50 | 50× |
| **GPT-6 Astra · Claude Fable 5.1** | **$7.00** | **$35.00** | **100×** |

### Media rates (the five published ones)

| Media | Rate |
|---|---|
| Image generation — OpenAI | **$0.2321 / asset** |
| Image — Wan 2.7 | $0.02145 / image |
| Image — Wan 2.7 Pro | $0.053625 / image |
| Video generation — ByteDance (Seedance) | **$0.1672 / second** |
| Image-to-video — Alibaba (Wan 2.6 I2V) | **$0.02684 / second** |
| Video generation — MiniMax H3 | **$0.088 – $0.143 / second** |
| Audio transcription — Fish Audio | $0.00011 / second |

### Tool rates

| Tool | Rate |
|---|---|
| Web search (Exa) | $0.0084 / call |
| Web fetch (Exa contents) | $0.0012 / page |
| Text to speech — MiniMax HD | $0.00007 / character |
| Text to speech — MiniMax Turbo | $0.000042 / character |
| Sound generation — ElevenLabs | $0.01344 / call |
| SERP call — DataForSEO | $0.002 / call |

### The biggest lever in the whole account

> **$0 model usage on your Claude or ChatGPT plan.** Connect a Claude Pro/Max or ChatGPT
> Plus/Pro account once and model tokens cost nothing — only compute is metered.

## 2. Our real cost per action

Anchor unchanged: **1 MC = $0.001 of measured cost.** A chat turn = 8k in + 1k out tokens,
15 seconds awake on the default machine.

| Action | Real cost | MC |
|---|---|---|
| Chat turn — Haiku / Luna | $0.00283 | **3** |
| Chat turn — GLM-5.3 | $0.01284 | 13 |
| Chat turn — Sonnet / Sol | $0.02012 | 20 |
| Chat turn — Opus 5.5 | $0.03832 | 38 |
| Chat turn — GPT-6 Astra | $0.09292 | 93 |
| Chat turn — Haiku / Luna on a 1 vCPU · 512 MB machine | $0.00123 | **1** |
| Image — Wan 2.7 | $0.02145 | 21 |
| Image — Wan 2.7 Pro | $0.053625 | 54 |
| Image — OpenAI | $0.2321 | 232 |
| Video — Alibaba I2V, per second | $0.02684 | 27 |
| Video — MiniMax H3, per second | $0.088–0.143 | 88–143 |
| Video — Seedance, per second | $0.1672 | 167 |
| Audio transcription, per minute | $0.0066 | 7 |
| TTS HD, per 1,000 characters | $0.07 | 70 |
| Web search, per call | $0.0084 | 8 |
| Web fetch, per page | $0.0012 | 1 |
| Compute, per minute — default machine | $0.00768 | 8 |
| Compute, per minute — 1 vCPU · 512 MB | $0.00195 | 2 |
| Agent task (6 steps, 2 min awake, Sonnet) | $0.0532 | 53 |

## 3. What 10,000 MC buys (Pro, $15)

| | Count per month |
|---|---|
| Chat turns — Haiku on a small machine | **10,000** |
| Chat turns — Haiku on the default machine | 3,333 |
| Chat turns — Sonnet | 500 |
| Chat turns — GPT-6 Astra | 107 |
| Images — Wan 2.7 | **476** |
| Images — OpenAI | 43 |
| Video 5 s — Alibaba I2V | **74 clips** |
| Video 5 s — MiniMax H3 | 22 clips |
| Video 5 s — Seedance | 11 clips |
| Video 10 s — Seedance | 5 clips |
| Audio transcription | 1,428 minutes (24 h) |
| Text to speech (HD) | 142,000 characters (≈2.4 h of speech) |
| Web searches | 1,250 |
| Compute minutes on the default machine | 1,250 |

## 4. The number that decides everything: awake time

| Awake time | Per month | Cost |
|---|---|---|
| 0.5 h/day | 15 h | $6.92 |
| 1 h/day | 30 h | $13.83 |
| 2 h/day | 60 h | **$27.66** |
| 3 h/day | 90 h | $41.49 |

**A $15 plan breaks even at 1.08 hours of awake time per day on the default machine.** AgentSky's
own example — 20 turns a day, 2 hours awake, Claude Opus 5.5 — costs **$49.49/month**
($21.84 model + $27.65 compute). Compute is 56% of it.

Three consequences, and they are not optional:

1. **Route to the cheap tier by default.** Haiku/Luna is 20× cheaper than Sonnet and 100×
   cheaper than Astra for the same turn shape.
2. **Pick the smallest machine that fits.** A light chat turn on 1 vCPU · 512 MB costs
   1 MC instead of 3 MC — a 4× difference on our single highest-volume action.
3. **Suspend aggressively.** Every idle minute on the default machine is 8 MC. Parked is free.

## 5. Count comparison — are we more generous or not?

Price-normalised to roughly the same monthly spend (~$15). Market figures come from the
published vendor pages collected in `notes-credit-market-benchmark.md`.

| | Price | Video per month | Images | Chat |
|---|---|---|---|---|
| **Megsy Pro — cheap defaults** | **$15** | **74** (5 s I2V) | **476** | **10,000 turns** |
| Megsy Pro — premium routing | $15 | 11 (Seedance 5 s) | 43 (OpenAI) | 107 (Astra) |
| Runway Standard | $12 | ~10 (Gen-4.5, 5 s) | 125 (Gen-4 Turbo) | — |
| Gemini AI Pro | $19.99 | ~50 (Veo Fast 8 s) | — | — |
| Midjourney Basic | $10 | — | ~200 | — |
| ChatGPT Plus | $20 | not offered | ~50+ | effectively unlimited text |
| Claude Pro | $20 | not offered | not published | session/weekly caps |
| ElevenLabs Starter | $6 | — | — | 30,000 characters TTS |
| Manus Basic | $19 | — | — | 4,000 credits/mo |
| Perplexity Pro | $20 | none buyable | not published | 4,000 bonus credits, once |

### The verdict

- **On cheap-path defaults we are the most generous in the table, by a wide margin.** 74 video
  clips against Runway's 10 and Gemini's 50; 476 images against Midjourney's 200; and a chat
  volume no one publishes because no one meters chat the way we do.
- **On premium routing we are ordinary.** 11 Seedance clips is Runway's ~10; 43 OpenAI images
  is well under Midjourney's 200.
- **Where we lose is "unlimited text".** ChatGPT Plus advertises unlimited everyday chat. We
  cannot match an unlimited claim, but 10,000 turns a month is ~333 a day — more than a person
  can type.

**So the answer to "are we more generous?" is: it is a routing decision, not a pricing
decision.** Same $15, same provider, same credits — the default model and the machine size
decide whether we are 7× more generous than the market or exactly average.

## 6. Recommendations that follow from these numbers

1. **Default the composer to the cheap tier** (Haiku / Luna / GLM), with premium models as an
   explicit, priced choice shown before the turn runs.
2. **Two machine profiles:** a small one (1 vCPU · 512 MB) for chat and light turns, the
   default 2 vCPU · 8 GB only for real agent work.
3. **Connect our own Claude / ChatGPT plan to AgentSky** so model usage on our own agents is
   $0 — compute is then the only meter that matters for internal work.
4. **Default video to Alibaba I2V at $0.02684/s**, and price Seedance as a premium SKU at 6×.
5. **Default images to Wan at $0.02145**, and treat OpenAI image generation as premium at 11×.
6. **Meter awake seconds explicitly** in the usage screen. It is the line item users will not
   otherwise understand, and it is the one that can bankrupt a $15 plan.
7. **Keep 10,000 MC.** It is $10 of measured cost on a $15 plan — 33% margin at full
   utilisation, ~60% at realistic use — and it still beats every competitor in the table on
   the cheap path.
