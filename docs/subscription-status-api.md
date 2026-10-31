# Megsy subscription status API

This endpoint is intended for **server-to-server** calls from a trusted backend. Never call it directly from a browser or mobile client, and never put its API key in client-side code.

## Request

- Method: `POST`
- URL: `https://www.megsyai.com/api/subscription/status`
- Header: `x-api-key: <SUBSCRIPTION_STATUS_API_KEY>`
- Header: `content-type: application/json`
- Body: `{"email":"person@example.com"}`

Example:

```sh
curl -X POST 'https://www.megsyai.com/api/subscription/status' \
  -H 'content-type: application/json' \
  -H 'x-api-key: YOUR_SERVER_SIDE_API_KEY' \
  --data '{"email":"person@example.com"}'
```

## Response

Subscribed:

```json
{"status":"subscribed","isSubscribed":true}
```

Free, unknown email, expired, or otherwise ineligible:

```json
{"status":"free","isSubscribed":false}
```

The API intentionally returns no email, user ID, plan details, payment data, or distinction between an unknown account and a free account.

The check reads the current `subscriptions` record for the exact normalized email. `active`, `trialing`, and `past_due` statuses count while the subscription is within the same three-day lapse grace period used by Megsy; a non-free plan is required. An unset period end is treated as active, consistent with Megsy's current subscription logic.

## Errors

- `400`: invalid JSON/request or missing/invalid email
- `401`: missing or invalid API key
- `413`: request body exceeds the small payload limit
- `415`: request is not JSON
- `503`: the API key/database lookup is not configured or unavailable

Store the same strong, random key in Vercel as the sensitive server-only `SUBSCRIPTION_STATUS_API_KEY` variable and in the external backend's secret manager. Do not commit it or expose it to end users.
