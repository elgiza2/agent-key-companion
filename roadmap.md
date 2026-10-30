# Roadmap

## Telegram key bot repair
- [x] Repair gateway transport, reply-carried provider selection and provider commands; include encrypted Plus AI storage explicitly marked unverified. Nine routing tests passed; local unauthorized requests return 401 and registered-admin /keys handling returns 200.
- [ ] Register the current project's webhook: blocked because its public hosted endpoint returns 500 "not configured" despite locally configured secrets. Old webhook left unchanged to avoid interrupting bot delivery; requires deployment with current secrets. Plus AI presentation consumer is absent, so storing a key does not activate generation.

## Current request — pricing and settings
- [x] Cancel the latest settings redesign and restore the original settings appearance before monochrome changes; pricing and checkout remain unchanged.
- [x] Remove secondary dollar amounts whenever pricing and checkout show a local currency; Egypt and India pricing verified in the signed-in mobile browser.
- [x] Review actual signed-in settings home and subpages on mobile and correct the monochrome presentation: remove colored preview buttons and danger actions, repair nested search/name fields and expired-avatar fallback, preserve light/dark selection. No account data or payments changed; 16 payment tests passed.
- [x] Make the pricing Subscribe button black; confirmed in the actual pricing page, with working yearly selection.
- [x] Reviewed product capabilities and revised pricing summary and benefits; corrected the payment FAQ to reflect country-specific methods without gateway branding.
- [x] Replace glass across settings routes with opaque monochrome tokens and a settings-only final style layer; checked light/dark presentation at mobile and desktop sizes, no runtime errors, 16 payment tests passed and build OK.
- [x] Account-specific settings review: signed in with the supplied test account and checked home, profile, privacy, memory, language, security, cloud browser, skills, email/password and two-factor pages on mobile without runtime errors or horizontal overflow.

## Current visual correction
- [x] Restore multicolored particle styling across question options, steps and strategy-tree nodes.
- [x] Match Google Play references for purchase and payment-method sheets, and redesign Add New Card consistently.
- [x] Checked purchase → methods → card form on mobile and desktop without payment; widget question advances correctly with 11 particle layers. Routing test passed and build OK. Clarity's external tracking script emitted an error; no checkout or widget error observed. Live generated chat and payment processing were not tested in this visual correction.

## Oct 30 batch
- [x] Store-style payment sheet (plan + price, method row, saved cards by last 4, add card opens card page); Vodafone Cash for Egypt only
- [x] Pricing photo bundled + compressed (1.4MB → 59KB), lighter glass
- [x] Welcome slide 2 new photo (woman); referral required-steps list removed; jump-to-latest button removed
- [x] Drawings: photos at natural size, question card (title + clean options), steps/tree restyle, send-button end icon removed, no trailing question lines, bold headings
- [x] Pink drifting chat background, transparent mobile top bar
- [ ] Auto-renew: renewal job (kashier-renewals) is not scheduled anywhere — needs a scheduled run + secret
- [ ] Import megsy-global-voice design for About / Media / Legal pages
- [ ] Unify thinking/steps look across all agents
- [ ] Memory system not working — investigate
- [ ] Agent Sky used for trivial tasks; agent unaware of its capabilities
- [ ] Vercel: drawings disappear + slow fast chat (missing Cerebras key / env on Vercel)
- [ ] Composer floating with content passing beneath (desktop)

- [x] Quick authenticated review: agents + opens chat draft, text response works, interactive question renders and its button sends the choice; settings, integrations, pricing and usage open. Removed auth-callback re-entry and history blocking from workspace loading; 100 existing tests and 2 new regression tests passed.
- [ ] External latency remains: specialist loading took 22–29 seconds and a widget required over 25 seconds; upstream generation/loading response time is not resolved by the workspace fix. Paid media, real payments and actual computer execution were not exercised in this quick review.

- [x] Allow computer app access, remove thinking/agent elapsed times, shrink drawn send buttons, and animate the central robot in button colors. Actual components checked at desktop/mobile sizes: no timing badges, 72×34px send action with 8px corners, 10 particles, no robot shadow; 19 tests passed.
- [ ] Authenticated live conversation check for this polish: user-managed sign-in prevents restoring a managed preview session; only actual presentation components were verified.

- [x] Fix streaming delays: direct answers release after prefix validation, received text renders without artificial reveal, and provider accounting runs after bytes are delivered; 25 focused tests passed.
- [x] Remove initial buffering for forced trivial fast turns; keep ordinary route-marker protection.
- [x] Restore readable thinking shimmer and expand live progress steps with elapsed time.
- [x] Strengthen interactive drawing/card/button instructions; verify renderer action callback.
- [x] Verified live answers with the test account: text starts in ~3s, glass widgets render.

- [x] Redesign Tasks with Orange point icon and five character images; restrict active tasks to the five requested types.
- [x] Remove main Agents +; remove Earn tasks and rename Earn to Referral with Telegram-only invite links.
- [x] Inline manual TON/USDT-TON checkout; strict reference matching and atomic settlement with transaction reuse prevention.
- [x] Synchronize returning Telegram profile photos and fullscreen/safe-area events; native Back navigation.
- [x] Remove visible old sharing/help branding; restore readable shimmering thinking text.
- [x] 13 targeted tests passed; public Tasks and inline Crypto navigation checked on mobile without runtime errors.
- [ ] Real transfer and authenticated read-back: unavailable without a real payment/session; other networks are disabled pending reliable verification.
- [ ] X follow and ORANGE purchase rewards: require X account verification and cryptographic wallet ownership proof; opening links never grants points.
- [ ] Verify fullscreen, native Back and profile image inside an actual Telegram client.
- [x] Chat drawings: gold/violet/blue/yellow tiles with the button glow and rising dots, comparisons drawn as tiles and bars instead of markdown tables; verified live with the test account.

- [x] Rename Megsy/Nova AI → Orange AI (UI + translations + support links @Torekr)
- [x] Telegram login (Mini App initData → session) + /api/public/telegram-auth
- [x] Reward tasks migration (telegram_join, daily_checkin; old Trustpilot/X tasks deactivated)
- [x] /tasks page — server-verified completion, credits awarded by /api/tasks/complete
- [x] Telegram button on the sign-in page
- [x] Crypto wallet addresses saved as secrets (TON / ETH / BSC / SOL / TRON)
- [x] crypto_payments migration
- [x] /api/crypto/invoice — invoice creation + on-chain verification + fulfilment
- [x] Legacy crypto page now uses the manual panel; current checkout keeps crypto inline.
- [x] Bot /start auto-link: webhook route deployed and registered (verified via getWebhookInfo)
- [x] New bot token: TELEGRAM_BOT_TOKEN secret replaced
- [x] Bot admin panel /101 — user count + add/edit/delete tasks (name, link, image)
- [x] Bot /start welcome image + two daily channel posts (English, bold captions, Open Orange AI button) + admin "post now" button
- [x] Orange AI logo + favicon/icons applied from the uploaded circular logo
- [x] reward_tasks image_url column + tasks UI shows task image
- [ ] Additional payment networks require transaction-specific secure verification; wallet-connect is no longer requested.
- [ ] Publish (Vercel token exposed in chat — do not use; publish via Lovable instead)

- [x] Start message rewrite (bold, characters, community + buy ORANGE buttons), daily user notifications, Telegram-only login, full-screen Mini App with top safe area
- [ ] Confirm /start and daily notification in real Telegram
- [x] Short start message + characters image, fixed broken images on Vercel, tasks (channel/X/ORANGE) with verification, Telegram Back button, crypto replaces Google Pay
- [ ] Bot must be admin in @oraien for channel-join verification
- [x] Tasks entry in app menu, real full screen, Telegram back button, crypto page Buffer crash, start image characters together, combined crypto icon
- [x] Tasks page: compact rows (image, name, Go button)
- [x] Telegram profile photo not showing
- [x] Chat thinking text not showing
- [x] Remove two extra buttons next to copy/like/dislike in chat
- [ ] Real TON/USDT wallet payment test (needs user's wallet)
- [x] New tasks added via bot appear in the app tasks page (allowlist removed, image_url used)
- [x] Regenerated 5 task images sized for small circular rows
- [x] Welcome post published to channel (msg 375, button opens Mini App via t.me/Noveaibot?startapp)
- [x] Channel post button opens Mini App
- [x] Deleted 10 oldest Vercel projects (all 204)
- [x] Vercel account blocked (fair use) — published on Lovable instead: https://nova-quest-rewards-hub.lovable.app
- [x] Updated all links (manifest, bot, TON payment, slides) to the Lovable URL
- [x] Webhook + menu button re-registered with secret token; /start verified (200 ok)
- [x] Telegram sign-in race fix shipped in this publish
- [x] One-off channel post scheduled for 2026-10-24 02:00 UTC (fires on next bot traffic)
- [x] Replace OpenUI chat visuals (glass widget only, OpenUI Inspect panel blocked)
- [x] Fast replies: skip out-of-credit text provider, use quick backup for simple chat (~1s)
- [x] Visual answers: model instructed to draw with built-in widget styling instead of OpenUI
- [ ] Images/video/files/code/computer in chat: blocked — Cerebras and abliteration accounts are out of credit (402/insufficient_credits), so the tool-capable agent cannot run
- [x] Remove chat suggestions (follow-up suggestion buttons banned in prompt)
- [x] Remove all icons and every shadow from chat drawings, and make the user message pink.
- [x] New icon-free, shadow-free design for the thinking steps and agent steps shown while working.
- [x] When the AI needs information from the user, it must draw the question itself (choice buttons, text box, or any other input type) with its own question label.

- [x] Telegram bot adds keys for the 4 allowed providers only (agentsky, browser-use, cerebras, deapi)
- [x] Remove other AI providers from main paths (leftover names in model lists/admin page still to clean)

## Oct 30 — payments, tools, games
- [x] Floating glass payment sheet with grouped methods and icons; cards + Vodafone Cash via local gateway, Apple Pay / Google Pay / others via international gateway; gateway names hidden
- [x] 17 full in-chat tools (photo editor, invoices, CV, code, QR, currency, Egypt salary, loan, BMI, passwords, text, charts, social posts, timer, colors, units, notes)
- [x] 8 Egyptian games (XO, 2048, word guess, Egypt quiz, proverbs, food memory, snake, runner); new waiting game while media generates
- [ ] Server-side prompt copy (supabase/functions/_shared/genui.ts) not updated: edits there are blocked; browser re-sends the prompt so chat still knows the apps

## Oct 30 — payment box per country
- [x] Remove glass from pricing subscription choices; replace artwork with a seaside editorial photo matching the reference. Mobile choices checked without blur or clipped text; monthly/yearly selection works.
- [x] Remove "!" icon, "Megsy AI" header text and user email; app logo instead of "M"
- [x] Local methods per visitor country from Dodo's official payment-methods table (subscription-capable only); "other methods" removed; Vodafone Cash Egypt-only
- [x] Dodo checkout narrowed to the picked method + local currency via the app's own checkout endpoint (falls back to the old path until the payment key is set on the host)
- [x] Prices shown in the visitor's local currency (exact EGP for Egypt, approximate elsewhere) on pricing and checkout
- [ ] Publish to megsyai.com: waiting on a fresh Vercel connection in this workspace, plus the Dodo key and service key in Vercel settings

## Oct 30 — keys, + menu, thinking, savings
- [x] + menu: floating white card with 3 square tiles over dimmed page (matches screenshot)
- [x] Owner keys saved to pools (Cerebras exists, deAPI, Browser Use, AgentSky, Plus AI unverified)
- [ ] Settings switches reported broken: work in tests (memory, capabilities, cloud browser) — need user's screenshot
- [ ] Browserbase key: store and make available to agents
- [ ] Unified thinking design (agent + fast chat)
- [ ] Token savings ~90% with high quality
