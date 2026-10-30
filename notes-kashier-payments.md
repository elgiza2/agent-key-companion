# Kashier payments — verified notes (from developers.kashier.io, Oct 2026)

## Endpoints
- Payment sessions (v3): `POST https://api.kashier.io/v3/payment/sessions` (test: `test-api.kashier.io`).
  Headers: `Authorization: <SECRET KEY>`, `api-key: <PAYMENT API KEY>`.
  Body: `expireAt, maxFailureAttempts, paymentType:"credit", amount, currency, merchantId, merchantOrderId,
  merchantRedirect, display, type:"one-time", allowedMethods, defaultMethod, description, manualCapture:false,
  failureRedirect:false, customer:{reference,email}, saveCard:"optional|forced", retrieveSavedCard,
  agreement:{...}, interactionSource, enable3DS, serverWebhook`.
  Response: `{ status:"CREATED", _id, sessionUrl:"https://payments.kashier.io/session/<id>?mode=live" }`.
- Pay with token: `POST https://fep.kashier.io/v3/orders` (test: `test-fep.kashier.io`).
  Header `kashier-hash`. Body: `apiOperation:"PAY"`,
  `paymentMethod:{type:"CARD",card:{agreement:{id},enable3DS:false,cardToken}}`,
  `order:{reference,amount,currency}`, `interactionSource:"CONTAUTH"`,
  `reconciliation:{webhookUrl,merchantRedirect}`, `merchantId`, `customer:{reference}`.
- Hash: HMAC-SHA256 of `/?payment=<merchantId>.<orderId>.<amount>.<currency>` signed with the Payment API Key;
  **append `.{customerReference}` whenever `card.save`, `card.cardToken` or `card.agreement` is present**.
- List tokens: `GET /v3/payment/tokenization/tokens`. Delete: `DELETE /v3/payment/tokenization/tokens/:token`.
- Save token = a payment session with `agreement` + `saveCard`; the token + agreementId arrive on the webhook,
  never in the create response. Card token also returns at `response.paymentMethod.card.cardToken` for
  SUCCESS/PENDING when `card.save`/`card.agreement` was sent.
- Kashier has **no managed subscriptions API** — the merchant owns the schedule.
- Bulk charge is behind a per-merchant flag (assume off).

## Apple Pay (supported) — https://developers.kashier.io/docs/accept-payments/apple-pay
- Needs: HTTPS site, **domain given to Kashier support so Apple can verify it**, then the certificate file
  served at `https://<domain>/.well-known/apple-developer-merchantid-domain-association.txt`.
- SDK: `<script src="https://payments.kashier.io/kashier-sdk.js">` then
  `kashierSDK.load({ data:{ mode:'live', sessionId }, onSuccess, onFailure, locale:'en' })`,
  rendering into `#kashier-sdk-id` (optional `#kashier-success-id`, `#kashier-failure-id`).
  The SDK forces `allowedMethods='apple_pay'` and loads Apple's `apple-pay-sdk.js`.
- `enable3DS` is forced false for Apple Pay (the device cryptogram authenticates). Settles over MPGS card rail.
- **Google Pay is NOT supported by Kashier.**

## Google Pay
- Not offered by Kashier at all. A native GPay button would need another gateway (or a Google Pay
  business console merchant id + a PSP that can decrypt the token) — not possible on the current account.

## Fulfilment in Supabase (project qdnqxjzjecaieuavagvq)
- Triggers on `public.kashier_orders` when `status` becomes `paid`:
  - `fulfill_kashier_order()` — grants credits (`grant_credit_bucket`), sets `credit_wallets.plan_credits`,
    `plan_period_end = now() + 30d/365d`, `profiles.plan='pro'`, then **inserts or updates `subscriptions`**
    (plan/status/currency/amount_cents/current_period_end). It does NOT touch `auto_renew`.
  - `private.activate_paid_kashier_order()` — adds credits on `profiles` + writes `credit_transactions`.
- `kashier-webhook` matches the order by `data.merchantOrderId` against `kashier_orders.order_id` and sets
  `status` to paid/failed; it is the authoritative fulfilment entry point.
- `subscriptions` columns added for auto-renew: `auto_renew boolean not null default true`, `cancelled_at`.

## Current app wiring
- `src/lib/payments/kashier.ts` — Direct API card + wallet R2P, `openApplePaySession`, `loadKashierSdk`,
  `applePaySupported`. `openHostedSession` is now unused (hosted redirect removed from the checkout).
- `src/components/billing/CustomCardForm.tsx` — Card (3DS in a big in-page frame), Apple Pay (SDK, only on
  Apple devices), Vodafone wallet. Google Pay tile removed.
- Edge functions deployed: `kashier-checkout`, `kashier-direct-order`, `kashier-webhook`,
  `subscription-manage` (auto-renew on/off), `kashier-applepay-session` (Apple Pay session id).
- Still missing for monthly auto-renew: save the card token on the first payment (`card.save: true` +
  `.{customerReference}` in the hash), store the token on the subscription from the webhook, and a
  scheduled `kashier-renewals` engine that charges the token via Pay with Token when the period ends.
