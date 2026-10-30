# Credit-based model platforms — buy a balance, use any model

For topping up a small balance ($5 up to $200) and using many models immediately, with no
monthly subscription. Prices and terms read live in October 2026.

---

## 1. The direct answer: OpenRouter

It is the one platform built exactly for this.

| | |
|---|---|
| **Minimum top-up** | **$5** per transaction (maximum $25,000) |
| **Models** | **500+** from every major lab, one OpenAI-compatible API |
| **Markup on inference** | **Zero** — you pay the provider's own published rate |
| **Fee on buying credits** | **5.5%** via card ($0.80 minimum) · **5%** via USDC crypto |
| **Auto top-up** | Yes — refills automatically when the balance drops below your threshold |
| **Free models** | 50 requests/day with no credits · **1,000/day once you have bought ≥ $10** |
| **Fallback** | Automatic provider failover — same model, next provider, no error surfaced |
| **Routing variants** | `:nitro` fastest provider · `:floor` cheapest · `:exacto` best tool-calling |
| **BYOK** | Bring your own provider keys; free up to $25,000/month of list-price usage, then 5% |
| **Credit expiry** | May expire after one year of purchase |
| **Refunds** | Within 24 hours of purchase, unused credits only |
| **Payment** | Cards, AliPay, USDC |

**Why it fits:** $5 gets you every model in the catalogue immediately, the balance never
expires inside a year, and there is no subscription to cancel. A $5–$200 balance is exactly the
working range.

## 2. The other credit platforms, by minimum

| Platform | Minimum / entry | Catalogue | Markup | Notes |
|---|---|---|---|---|
| **OpenRouter** | **$5** | 500+ models | none (5.5% on top-up) | the reference option |
| **NanoGPT** | **$0.10 minimum balance** | large | — | cheapest possible entry |
| **Chutes** | **$5 top-up** | open weights | — | $5 doubles as identity verification; PAYG from $0.01/M; $20/mo = 5,000 req/day |
| **Cerebras** | **$5 promotional credit** | own silicon | — | needs a verified payment method; fastest inference on the market |
| **SambaNova** | **$5 credit** | own silicon | — | pay-as-you-go credits |
| **DeepInfra** | pay-what-you-use | 100+ models | none | **200 concurrent requests per account**; prepaid or card; H100/A100 |
| **Together AI** | start free | very wide, incl. image/video/audio | none | serverless, provisioned throughput, dedicated GPU |
| **Novita AI** | pay-as-you-go | 200+ models | none | plus GPU and a **per-second agent sandbox runtime** |
| **Requesty** | free tier 200 req/day | 600+ models | **5%** | gateway with routing and caching |
| **Fireworks** | prepaid credits | wide | none | spend gated by tier: $50/mo with a card, then $500 → $5,000 → $50,000 |
| **AgentSky** (current) | **$10 top-up** | 101 models | 30% **below** list on many | already our provider |

## 3. The price catch worth knowing

Two facts that decide where each model should run:

- **AgentSky sells many models at 30% below the maker's list price** (Claude Sonnet 5.5 at
  $1.40/$7.00 instead of $2/$10, GPT-6.1 Sol at $1.40/$7.00, Opus 5.5 at $2.80/$14.00).
- **OpenRouter passes through list price with no markup** — so on those same models OpenRouter
  costs **~43% more** than AgentSky.

So the two are not substitutes:

| Need | Best platform |
|---|---|
| Widest catalogue, $5 entry, automatic failover, one balance | **OpenRouter** |
| The specific models AgentSky discounts 30% | **AgentSky** (keep it) |
| Cheapest open-weight text + high concurrency | **DeepInfra** (200 concurrent/account) |
| Media (image, video, audio) | compare — see below |
| Reserve capacity for high sustained throughput | **Together provisioned throughput** |

### Media price check (per unit, cheapest published)

| Media | AgentSky | Together AI | Winner |
|---|---|---|---|
| Image — OpenAI GPT Image | $0.2321 / asset | **$0.053** (GPT Image 2) | **Together — 4.4× cheaper** |
| Image — Wan | **$0.02145** | $0.03 (Wan 2.6) | AgentSky |
| Image — cheap FLUX | — | **$0.0154** (FLUX.2 dev) | Together |
| Video — Seedance 5 s | **$0.836** ($0.1672/s) | $0.115–$0.16 per video | **Together — ~6× cheaper** |
| Video — cheap tier | $0.134 (Alibaba I2V 5 s) | $0.14 (HappyHorse 1.1) | tie |
| Audio — transcription | $0.0066/min | **$0.0015/min** (Whisper Large v3) | **Together — 4.4× cheaper** |

**Together AI is materially cheaper on the exact media we use most** — OpenAI images, Seedance
video and Whisper transcription. That is worth a direct test before the next media invoice.

## 4. Recommended setup

1. **Open the OpenRouter account with a $20–$50 balance.** It becomes the fallback and the
   catalogue for any model AgentSky does not carry, and the $10 threshold unlocks 1,000 free
   requests/day.
2. **Keep AgentSky** for the models it sells 30% below list — moving those to OpenRouter would
   raise our cost.
3. **Open a Together AI account** and test OpenAI image generation and Seedance there. On
   published rates the saving is 4–6× on the two most expensive media lines.
4. **Test DeepInfra** for high-concurrency open-weight text — 200 concurrent requests per
   account is the highest published ceiling of the credit platforms, and its DeepSeek/GLM rates
   are at the bottom of the market.
5. **Route, do not migrate.** Keep one internal model registry with per-model routing, so a
   price change at any provider is a config edit rather than a code change.

## 5. Bottom line

- **The site you asked for is OpenRouter:** $5 minimum, 500+ models, zero markup on inference,
  auto top-up, no subscription.
- **But do not move everything there.** AgentSky's 30% discount beats OpenRouter's list price on
  several key models, so the right move is a second balance used for breadth and failover, not a
  replacement.
- **The bigger saving is media:** Together AI's published rates on OpenAI images, Seedance video
  and Whisper transcription are 4–6× below what we pay now.
