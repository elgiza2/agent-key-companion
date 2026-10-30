# Dodo Payments — تفاصيل التكامل التقني (من الوثائق الرسمية)

## إنشاء جلسة دفع (Checkout Session)
- **Endpoint:** `POST https://live.dodopayments.com/checkouts` (تجريبي: `https://test.dodopayments.com/checkouts`)
- **Auth:** هيدر `Authorization: Bearer <DODO_PAYMENTS_API_KEY>`
- **Body (JSON):**
  ```json
  {
    "product_cart": [{ "product_id": "pdt_xxx", "quantity": 1 }],
    "allowed_payment_method_types": ["credit", "debit", "apple_pay", "google_pay", "klarna"],
    "return_url": "https://www.megsyai.com/checkout/return",
    "short_link": false,
    "show_saved_payment_methods": true,
    "metadata": { "user_id": "..." }
  }
  ```
- **Response:** `{ "session_id": "...", "checkout_url": "https://checkout.dodopayments.com/session/cks_...", "client_secret": "..." }`
  (`checkout_url` بيكون `null` لو مررت `payment_method_id` مع `confirm: true`.)
- للاشتراكات: تمرر `subscription_data` (فيه `trial_period_days` وغيره)، والـ cart يقبل منتجات one-time وsubscription مع بعض (بحد أقصى 20 عنصر).
- **قيم `allowed_payment_method_types`:** `credit, debit, apple_pay, google_pay, amazon_pay, cashapp, ach, klarna, afterpay_clearpay, upi_collect, ideal, bancontact_card, eps, multibanco, blik, sepa, satispay, payco, naver_pay, kakao_pay, revolut_pay, billie, pix, crypto_currency, we_chat_pay, gcash, ali_pay_hk, fps, touch_n_go`
- **مهم:** لو كل الطرق المحددة غير متاحة للعميل، الـ checkout بيفشل — فدايمًا ضيف `credit` و `debit` كـ fallback.

## الـ SDK للـ Checkout (لو حبينا overlay/inline)
- `npm install dodopayments-checkout`
- `DodoPayments.Initialize({ mode: "live", displayType: "overlay" | "inline", onEvent })`
- `DodoPayments.Checkout.open({ checkoutUrl })`
- **قيود:** Apple Pay غير مدعوم في overlay؛ inline بيعرض **frame** (iframe) وبيحتاج توثيق دومين مع Apple.

## المتغيرات اللي محتاجينها في Supabase Edge Function
- `DODO_PAYMENTS_API_KEY` (secret)
- `DODO_MODE` = `test` أو `live`
- منتجات Dodo لكل خطة: `DODO_PRODUCT_PRO_MONTHLY`, `DODO_PRODUCT_PRO_YEARLY`, ... (تُنشأ في لوحة Dodo)

## Webhooks
- نتوقع أحداث الدفع/الاشتراك من Dodo لتأكيد التفعيل server-side (زي ما عملنا مع Kashier).
- التفعيل لازم يكون من الـ webhook مش من الواجهة.
