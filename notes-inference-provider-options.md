# Unlimited inference + very high throughput — provider options

Research for hosting Megsy's agents with flat-rate ("unlimited") usage and the capacity to
survive thousands of requests per second. Prices read live in October 2026.

---

## 0. The honest starting point

Two things are being asked for, and they have different answers:

1. **"Unlimited"** — impossible for *media* (an image or a video second is GPU work that costs
   money no matter who runs it). Very possible for **text**: a handful of providers sell
   flat-rate unlimited-token subscriptions on open-weight models.
2. **"Thousands of requests per second"** — possible, but it is a **fleet** question, not a
   vendor question. Throughput is bounded by GPUs, and the bill scales with them.

The number that matters: **one H100 running vLLM serves about 8.95 requests/second on an 8B
model at ~2,271 tokens/second total.** So 1,000 requests/second is roughly **110 H100s** for an
8B model at ~250-token replies — about **$313k/month** on Modal's $3.95/hr, or **$118k/month**
on Vast.ai's $1.49/hr floor.

Before sizing for thousands of RPS, size for the actual traffic:

| Subscribers | Messages/day | Average RPS | Peak RPS (10×) |
|---|---|---|---|
| 10,000 | 200,000 | **2.3** | 23 |
| 100,000 | 2,000,000 | **23** | 231 |
| 1,000,000 | 20,000,000 | **231** | 2,315 |

**"Thousands of requests per second" is the traffic of a one-million-user product.** At 100k
subscribers we need ~23 RPS, which is one to three GPUs.

## 1. Flat-rate unlimited text providers

These are the only providers that genuinely sell unlimited usage for a fixed monthly price.

| Provider | Price | Models | Concurrency | Catch |
|---|---|---|---|---|
| **CheapestInference** | **from $22/mo** (Core: DeepSeek V4.1 Flash, MiMo V2.6 Flash) · Frontier (GLM 5.3, MiniMax M3) · Flagship **from $199/mo** (Kimi K3, Qwen3.8 Max) | frontier open weights | **one request at a time per key** — stack subscriptions into a "combined key" for parallelism | you buy daily 8-hour blocks; three blocks = 24/7 |
| **Featherless.ai** | Premium **$25/mo** (4 units) · Agent **$100–$200/mo** (8 units) | 30,000+ open weights | 4–8 concurrency units | the $25 chat plan **forbids app/API traffic** — production needs Agent/Business |
| **Awan LLM** | $5–$80/mo | Llama 3.1 only | 100–200 req/min | catalogue is two generations behind |
| **Giotto.ai** | 49.90 CHF/mo | Giotto 1 only | 1 request | not actually purchasable |
| **Cerebras Code** | $50 / $200/mo | GLM 4.7 on Cerebras | 24M–120M tokens/day | quota, not unlimited; sold out |

**The concurrency trap:** flat-rate pricing caps *lanes*, not tokens. To serve 50 simultaneous
requests you need 50 subscriptions. That is still far cheaper than per-token at volume, but the
cost scales with concurrency, not with users.

Quality check: Kimi K3 scores **44** on the Artificial Analysis Intelligence Index (top score 53)
— above Claude Opus 4.8, Sonnet 5 and GPT-5.5. GLM 5.3, MiniMax M3 and DeepSeek V4.1 Flash are
solid but below Claude Opus 5.5 / GPT-6 Astra.

## 2. Rent the GPUs — the only true "unlimited at any scale"

You pay for the machine, so inference is unlimited inside its capacity.

| Provider | H100 SXM | Other | Notes |
|---|---|---|---|
| **Vast.ai** | **from $1.49/hr** (marketplace floor) | A100 from ~$1.43/hr | cheapest; variable reliability |
| **RunPod** | **$2.98/hr** | small GPUs $0.34–0.69/hr | per-minute billing, no idle storage fee |
| **Modal** | **$3.95/hr** ($0.001097/s) | H200 $4.54 · B200 $6.25 · A100 80GB $2.50 · L4 $0.80 · T4 $0.59 | per-second, nothing for idle; **autoscales**; 10 GPU concurrency on Starter, 50 on Team ($250/mo) |
| **Lambda** | $3.29–3.99/hr | A100 $1.99–2.79/hr | on-demand |
| **Together AI dedicated** | **$5.49/hr per replica** (≈$3,950/mo) | — | managed serving |
| **Fireworks** | reserved capacity | — | 1-year enterprise commitments |

CPU (for the agent runtime, tools, sandboxes) is nearly free next to GPU: Modal charges
**$0.047/core-hour** and **$0.0028/GiB-hour**.

## 3. What the same traffic costs on each route

Assumptions: 250 output tokens per message, 4 s wall time, an 8B open-weight model,
~8.95 RPS per H100, provisioned at average load with autoscaling for peaks.

| Subscribers | RPS | GPUs | **Vast.ai** | **Modal** | **AgentSky per-token** |
|---|---|---|---|---|---|
| 10,000 | 2.3 | 1 | **$1,090/mo** | **$2,880/mo** | $17,000/mo |
| 100,000 | 23 | 3 | **$3,260/mo** | **$8,650/mo** | $170,000/mo |
| 1,000,000 | 231 | 26 | **$28,300/mo** | **$74,900/mo** | $1,700,000/mo |

At 100k subscribers, self-hosting is **~20× cheaper** than per-token inference; at 1M it is
**~23× cheaper**. Flat-rate lanes sit between the two: roughly 4,600 concurrent-capable lanes
would be needed at 231 RPS × 4 s latency, so at $22–$199 per lane the flat-rate route only wins
for a small number of high-value lanes, not for a public chat surface at scale.

## 4. The one thing that cannot be made unlimited

Media. Image and video generation is GPU work with a hard cost floor:

| Media | Cheapest available |
|---|---|
| Image — Wan 2.7 | $0.02145 / image |
| Image — OpenAI | $0.2321 / image |
| Video — Alibaba image-to-video | $0.02684 / second |
| Video — MiniMax H3 | $0.088–0.143 / second |
| Video — Seedance | $0.1672 / second |

Any "unlimited video" claim would be a bet on user behaviour, not an engineering capability.
Keep media metered.

## 5. Recommended architecture for Megsy

Three layers, because one provider cannot be best at all three:

**Layer 1 — Text, the unlimited surface.**
Flat-rate unlimited on an open-weight pool (CheapestInference Frontier: GLM 5.3 + MiniMax M3)
as the default model for chat and light agent turns. Premium frontier models (Claude Opus 5.5,
GPT-6 Astra) stay on AgentSky as a per-credit, explicitly priced option. This is exactly the
market pattern, but with a real cost ceiling.

**Layer 2 — Agent runtime: tools, memory, sandboxes, scheduling.**
Our own containers rather than a vendor's agent runtime — Modal (autoscaling, $0.047/core-hr,
per-second billing) or RunPod/Fly for always-on pieces. This is where "our agent on their
servers" actually belongs; the LLM is a separate dependency.

**Layer 3 — Media.**
Stay metered. AgentSky's media rates are already at or below the makers' list prices, so there
is no margin to win by moving this layer.

### Migration order

1. Point the composer's default model at the flat-rate provider behind a feature flag; keep
   AgentSky as the fallback path.
2. Move the agent runtime to Modal with autoscaling; measure real concurrency before buying any
   reserved GPU.
3. Only when sustained load passes ~50 RPS does owning GPUs on Vast/RunPod beat flat-rate lanes
   on cost — and that is the point to hire for it, not before.
4. Never move media off metering.

### The throughput ceiling to design for

| Target | What it takes |
|---|---|
| 50 RPS | flat-rate lanes, no GPUs owned |
| 250 RPS | 3–6 rented GPUs + vLLM, or ~250 flat-rate lanes |
| 1,000 RPS | ~110 H100s on an 8B model — $118k–$313k/month |
| 2,000+ RPS | a multi-region GPU fleet; this is a platform team, not a vendor choice |

## 6. Bottom line

- **Unlimited text: yes, today, from $22/month** — CheapestInference or Featherless, with the
  concurrency caveat.
- **Unlimited media: no, and no provider can honestly sell it.**
- **Thousands of requests per second: yes, but you buy it in GPUs** — and the traffic that
  actually needs it is a million-user product, not ours today.
- **The right move now:** flat-rate unlimited for text as the default, AgentSky for premium
  models and all media, our own autoscaling containers for the agent runtime. That combination
  is unlimited where it can be, metered where it must be, and roughly 20× cheaper than per-token
  at the scale we are heading for.
