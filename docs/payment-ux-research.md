# Payment UX research — October 2026

## Decision
The current payment UI should not lead with four large feature cards. Research-backed checkout patterns favor a single focused checkout surface: card/express payment first, a compact payment-method selector, contextual fields only for the selected method, and a persistent order summary.

## Evidence
- Stripe Checkout presents the payment form as a focused flow with email, payment information, a clear amount-specific CTA, real-time validation, saved-payment reuse, and responsive layouts. It supports brand customization without turning the page into a marketing grid: https://stripe.com/payments/checkout
- Stripe Payment Element recommends ordering methods by relevance, using tabs or an accordion for alternatives, and revealing the fields needed by the selected method. It also documents localized, specific decline states: https://docs.stripe.com/payments/payment-element
- Apple HIG recommends a cohesive branded checkout, putting Apple Pay first when available, avoiding unnecessary account creation, preferring the payment sheet's complete information, and giving actionable errors plus a confirmation page: https://developer.apple.com/design/human-interface-guidelines/apple-pay
- Klarna's presentation guidance says payment options should be recognizable, dynamically described, and that the primary CTA must change to explain what happens next (for example, Continue with Klarna). It also supports collapsing alternatives when a method is preselected: https://docs.klarna.com/klarna-network-distribution/payment-presentation/present-klarna-in-the-checkout/
- Baymard's payment UX research recommends logical grouping, making the most likely method prominent, keeping alternative methods available, auto-detecting and formatting cards, using field-specific errors, never clearing entered data on validation errors, and explaining financing terms before confirmation: https://baymard.com/blog/payment-ux
- Shopify's payment UX guidance recommends client-side validation before network calls and field-specific errors with a focused error summary when multiple fields fail: https://shopify.dev/docs/apps/build/checkout/payments/ux-for-payments

## Applied design direction
- Remove the large 2x2 payment-card chooser as the first screen.
- Use a Stripe-like single checkout canvas with a light neutral page, compact brand header, two-column desktop layout, and a stacked mobile layout.
- Default to the most common method (card) with fields visible immediately.
- Put alternative methods in a compact accordion/list below the card form, not as oversized promotional tiles.
- Keep the CTA specific: “ادفع الآن” for card and “المتابعة مع Kashier” for hosted methods.
- Preserve entered values during validation errors; clear sensitive values only after a request completes.
- Keep the order summary, processor, security note, and payment-method marks visible without competing with the form.
- Do not render a fake Apple Pay button. Apple Pay is shown as an accepted card/wallet capability and is only a payment button when a real Apple Pay session is available.
