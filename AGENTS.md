<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Generative UI: chat models answer with a ```ui JSON block validated by src/components/chat/genui/schema.ts and rendered by GenUIBlock; the prompt lives in genui/prompt.ts and is copied into supabase/functions/_shared/genui.ts (used by chat-fast and chat-alibaba; Deno cannot import src) — keep both in sync. ui blocks render outside the markdown pipeline so math/sanitize plugins cannot break them.
- Chat HTML widgets: ```widget blocks render in a sandboxed iframe (allow-scripts only) via genui/HtmlWidget.tsx with a built-in stylesheet; replies go back through megsy.send/postMessage. Why: rich model-drawn UI without access to the app session.
- Chat interactive answers use the vendored thesysdev/open-intelligent-ui component catalogue with @openuidev/react-lang, lazy-loaded behind ClientOnly; native openui fences and translated legacy ui specs share this renderer. Why: preserve original library behavior without importing Next.js or changing the primary agent.
- OpenUI SearchImage uses the existing browser-safe search resolver, and its CSS tokens are scoped to the chat and derived from Megsy's theme. Why: retain real searched photos and prevent library styles from changing the rest of the app.
- Domain cards extend the existing OpenUI catalogue and reuse its photo resolver and rendered action children; instructions are shared by browser and agent prompts. Why: keep places, menus and schedules interactive without a separate renderer or booking engine.
- Chat transport attaches the caller's bearer session to local proxy requests and waits for completion or explicit cancellation without browser generation deadlines; reasoning-only or empty streams are not successful answers. Why: avoid unauthorized proxy fallback, discarded generation and false completion.
- Manual crypto checkout shares one inline payment panel; only supported comment-bearing networks are offered, and confirmation calls the service-only atomic settlement function. Why: prevent reference ambiguity, reused transactions and partial credit activation.
- Reward task eligibility uses a shared allowlist and server-only atomic claims; unavailable external verification must not award points. Why: prevent arbitrary tasks and fabricated completions.
- Telegram fullscreen and inset events update shared safe-area variables, and profile pictures synchronize after verified Telegram sign-in. Why: keep native controls clear and returning-user identity current.
- Telegram sign-in uses one shared in-flight promise and relies on verifyOtp to persist its session. Why: startup and the auth page must not race single-use login tokens or publish duplicate sign-in transitions.
- Email sign-in intent uses the exact-match TanStack server lookup exclusively; unavailable lookups stop progression instead of implying signup. Why: the legacy deployed auth lookup reports false for existing accounts; password login retains its verified-session MFA check.
- Fast answers stream after sentinel-prefix validation; only recognizable routing preambles retain the defensive hold. Received text is rendered directly with frame-coalesced updates, including whitespace and completion tails. Why: avoid delaying short answers and interactive blocks behind artificial character queues while keeping routing markers hidden.
- SPA thinking shimmer wraps legacy HSL tokens and retains a readable fallback; live progress expands by default using shared Button. Why: invalid gradients hid text and collapsed steps obscured updates.
- Provider key-use bookkeeping runs at stream completion inside a passthrough transform, not before returning the response. Why: retain accounting within the response lifetime without blocking first-byte delivery.
- Chat visuals use only the glass `widget` format; the browser re-sends GENUI_PROMPT as the final customSystem block and blocks the OpenUI devtools auto-mount. Why: the deployed server prompt may lag, and the dev inspector covered the chat.
- Edge text routing falls back to the Lovable AI gateway after Cerebras and before the browser agent; the provider breaker also blocks 404 (archived) models. Why: dead/archived Cerebras models cost ~10s per turn.
- Widget connect buttons (data-connect / megsy.connect) are handled by the host page via connectFromWidget, so apps connect in-chat. Why: the sandboxed drawing cannot open sign-in windows itself.
- Central chat robot styling is scoped with ag-orb--chat and shared global animation tokens; other agent avatars keep their configured colors. Why: welcome-screen styling must not override personalized agents elsewhere.
- Checkout purchase sheets and card entry share isolated payment-sheet CSS loaded after legacy styles in the active app stylesheet. Why: chat animations and legacy checkout rules must not override payment controls.
- Full in-chat apps live in src/components/chat/genui/widgetApps.ts and mount from <div data-app=ID>; the prompt lists the IDs. Why: complete tools without the model writing app code each time.
- Hosted-checkout payment methods per visitor country come only from src/lib/payments/countryMethods.ts (subscription-capable methods from the Dodo docs table). Why: one place to match the gateway's real per-country availability.
- Settings presentation uses the original settings-home/settings-glass styles and pass-through SettingsShell; do not load the discarded monochrome override. Why: restore the original settings without changing pricing, payment sheets or chat.
- Key vault deployment: read docs/key-vault-operations.md before moving hosts/repositories or changing vault configuration; provision the same server-only KEY_VAULT_SECRET securely for all writers/readers, never commit its value or replace it while retaining encrypted rows. Why: repository moves do not transfer secrets, and mismatched secrets make saved provider keys unreadable.
- Telegram key bot: provider selection travels in a forced-reply message marker, with explicit commands as fallback; prefer the linked Telegram gateway and never echo key fragments. Plus AI vault entries remain explicitly unverified until a documented validation/consumer exists. Why: stateless webhook instances cannot reliably retain selections and stored credentials are not proof of provider activation.
