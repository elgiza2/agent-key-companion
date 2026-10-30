# Kashier مقابل Dodo Payments — كل طرق الدفع + مين الأفضل لـ Apple Pay و Google Pay

> الهدف: إضافة **Apple Pay** و **Google Pay** بشكل **native** داخل تطبيقنا (الشيت الأصلي يطلع فوق صفحتنا، بدون redirect لصفحة البوابة وبدون iframe)، ومستخدمونا **من كل العالم** مش مصر بس.
> المصادر: وثائق Kashier و Dodo الرسمية (روابطها في آخر الملف). كل رقم هنا من الوثيقة نفسها.

---

## 1) الخلاصة في 6 أسطر

| السؤال | الإجابة |
|---|---|
| مين يعطينا **Apple Pay native** في واجهتنا؟ | **Kashier** ✅ (زر Apple Pay في صفحتنا + الشيت الأصلي، بدون redirect وبدون iframe) |
| مين يعطينا **Google Pay**؟ | **Dodo** ✅ — لكن **جوه checkout بتاعهم** (overlay/inline)، مش شيت native في واجهتنا |
| مين **Google Pay native** في واجهتنا؟ | **ولا واحد** — Kashier مابيدعمهوش أصلاً، وDodo مابيعرضش توكنة محافظ |
| مين أحسن لجمهور **عالمي**؟ | **Dodo** (40+ طريقة دفع، 220+ دولة، MoR بيمسك الضرايب، تسوية بالدولار) |
| مين أحسن لمصر؟ | **Kashier** (ميزة، محافظ موبايل، تقسيط، InstaPay، تسوية على بنك مصري) |
| التوصية | **الاثنين مع بعض**: Dodo للعالمي + Kashier لـ Apple Pay native ومصر |

---

## 2) Kashier

**إيه هي:** بوابة دفع مصرية مرخّصة من البنك المركزي المصري، PCI DSS Level 1 و SOC 2 Type II. بتقبل تجار مصريين، وبتسوّي على أي بنك مصري بالجنيه.

**العملات اللي تقدر تحصّل بيها فعليًا:** `EGP`, `USD`, `GBP`, `EUR` فقط. (فيه endpoint لأسعار الصرف بيقرأ عملات كتير، لكن ده **للعرض/التسعير** مش للتحصيل — الوثيقة بتقول صريح: "A rate you can look up is not a currency you can charge in".)

### كل طرق الدفع عند Kashier

| الطريقة | تفاصيل |
|---|---|
| **كروت أونلاين** | Visa, Mastercard, **Meeza** (الميزة) — 2.75% + 3 جنيه |
| **كروت دولية** | مدعومة بس بسعر خاص (Contact sales) |
| **محافظ موبايل** | طلب دفع R2P على رقم المحفظة (`INITIATE_R2P` + `RECONCILE_WALLET`) — السعر بالاتفاق |
| **Apple Pay** | ✅ مدعوم (SDK) — السعر بالاتفاق |
| **تقسيط بنكي** | Banque Misr، البنك الأهلي، Emirates NBD — بخطة (`planId`) وEGP فقط |
| **BNPL / تمويل استهلاكي** | valU، Souhoola، Contact، Aman، Forsa، Mogo، Octo، TRU، Erada Finance |
| **كشك (Basata)** | كود مرجعي يدفعه العميل من منفذ Basata |
| **Aman (تقسيط في الكشك)** | OTP ثم شراء بالتقسيط |
| **Cash** | عملية تسجيل "مدفوع" داخلية — مفيش تعامل حقيقي، للتوثيق بس |
| **InstaPay** | QR أو Request-to-Pay |
| **روابط دفع** | بدون كود خالص |
| **دفع متكرر (Recurring)** | مدعوم — الجدول على التاجر نفسه (مفيش API اشتراكات مُدارة) |
| **POS / دفع في الفرع** | مدعوم |
| **Payouts** | تحويلات لأي بنك مصري |
| **Fawry** | ⚠️ غير مؤكد — الوثيقة بتقول `allowFawry` ممكن يظهر لكن "nothing routes to Fawry today" |

### Apple Pay عند Kashier — الطريقة التقنية (المهم)
- `<script src="https://payments.kashier.io/kashier-sdk.js">` ثم `kashierSDK.load({ data:{ mode:'live', sessionId }, onSuccess, onFailure, locale:'en' })` ويرسم الزر في `#kashier-sdk-id` **داخل صفحتنا**.
- الشيت بيطلع من نظام Apple **فوق صفحتنا**: مفيش redirect ومفيش iframe ✅
- المطلوب قبل التشغيل: (1) دومين الموقع **HTTPS**، (2) تبعت الدومين لفريق Kashier يسجّلوه مع Apple، (3) بعد ما يبعتوا ملف الشهادة، نرفعه على:
  `https://megsyai.com/.well-known/apple-developer-merchantid-domain-association.txt`
- `enable3DS` بيتجبر `false` (كارت Apple Pay بيتحقق بالبصمة أصلاً)، والتسوية بتمشي على مسار الكارت (MPGS) فالاسترداد زي أي كارت.
- يعمل على أجهزة Apple فقط (iOS 17+ / iPadOS 17+ / Safari 17+).

### Google Pay عند Kashier
> **مش مدعوم.** نص الوثيقة حرفيًا: **"Google Pay is not supported."**

### الرسوم (من صفحة الأسعار الرسمية)
| البند | السعر |
|---|---|
| كروت أونلاين (Visa/Mastercard/Meeza) | **2.75% + EGP 3.00** لكل عملية ناجحة |
| VAT | 14% على **رسوم Kashier فقط**، مش على مبلغ العملية |
| رسوم إعداد / شهرية | **صفر** |
| محافظ / تقسيط / POS / كروت دولية / Apple Pay | بالاتفاق مع المبيعات |

### قيود لازم تعرفها
- **مش بوابة عالمية**: 4 عملات تحصيل، تسوية بالجنيه على بنك مصري، والكروت الدولية بسعر خاص.
- مفيش اشتراكات مُدارة (الجدول عندك) ومفيش دعم لمحافظ جوجل.

---

## 3) Dodo Payments

**إيه هي:** منصة **Merchant of Record (MoR)** — يعني هي البائع القانوني: بتتحصّل باسمها، وبتمسك الضرايب (VAT/GST/sales tax) في 190+ دولة، والـ chargebacks والنزاعات، وبتصرفلك التسوية (بالدولار، SWIFT للشركات غير الأمريكية بـ 25$). بتقبل تجار من مصر (مصر مذكورة في قائمة الدول المقبولة).

### كل طرق الدفع عند Dodo (40+ طريقة / 220+ دولة)

| الفئة | الطرق |
|---|---|
| **كروت** | Credit Cards، Debit Cards (Visa, Mastercard, Amex, Discover, JCB, UnionPay...) |
| **محافظ** | **Apple Pay**، **Google Pay**، Amazon Pay، Cash App Pay، RevolutPay |
| **BNPL** | Klarna، Afterpay/Clearpay، Billie |
| **بنكي** | ACH Direct Debit (US)، SEPA Direct Debit (EU) |
| **الهند** | UPI، Rupay، Apple Pay بالروبية (بمِنْديت RBI) |
| **أوروبا** | iDEAL (هولندا)، Bancontact (بلجيكا)، EPS (النمسا)، Multibanco (البرتغال)، BLIK (بولندا)، Satispay |
| **آسيا** | WeChat Pay، Alipay HK، FPS (هونج كونج)، GCash (الفلبين)، Touch 'n Go (ماليزيا) |
| **كوريا** | Kakao Pay، Naver Pay، PAYCO |
| **البرازيل** | Pix |
| **عملات رقمية** | Stablecoins |
| **أخرى** | PayPal (متوقف مؤقتًا)، تحويلات بنكية |

### Apple Pay و Google Pay عند Dodo — الحقيقة الكاملة
- **Google Pay**: مدعوم، **ومحتاج صفر إعداد**. ملاحظة: مايظهرش في Safari ولا أي متصفح على iOS — كروم/أندرويد/فايرفوكس ديسكتوب بس.
- **Apple Pay**: مدعوم، وبيحتاج **توثيق الدومين مع Apple** — بس **في الـ inline checkout فقط** (الهوستد مش محتاج).
- **⚠️ القيد الحاسم:** المحافظ بتشتغل **جوه checkout بتاعهم** بس:
  - **Overlay (مودال)**: **Apple Pay غير مدعوم فيه نهائيًا** (نص الوثيقة: "Apple Pay is not available in overlay checkout").
  - **Inline**: بيقول حرفيًا "renders a secure Dodo Payments **frame** into a container on your page" → **إطار مدمج = iframe**.
  - **Hosted**: redirect لصفحة `checkout.dodopayments.com`.
  - **Mobile SDKs** (iOS/Android/React Native/Flutter): بتفتح الهوستد في **متصفح النظام** (SFSafariViewController / Chrome Custom Tabs).
- **مفيش API توكنة محافظ**: `POST /payments` بتاعهم مابياخدش بيانات كارت ولا wallet token — يا `payment_method_id` محفوظ من checkout بتاعهم، يا payment link. يعني **مستحيل** تجيب الشيت الأصلي من واجهتك انت.
- **BYOP (Bring Your Own Processor)**: توصل حساب **Stripe أو Adyen** بتاعك — بس ده بيغيّر المعالج، الواجهة تفضل واجهة Dodo (رسوم 0.5%).

### الرسوم (من صفحة الأسعار الرسمية)
| البند | السعر |
|---|---|
| كروت ومحافظ (داخل أمريكا) | **4% + 40¢** |
| دفع دولي (كروت/طرق بره أمريكا) | **+1.5%** |
| اشتراكات / Addons / Usage-based | **+0.5%** |
| BNPL (Klarna/Afterpay) أو PayPal | **+3%** |
| ACH (US) / SEPA (EU) | 1.5% بسقف 15$ / 15€ (بدل رسوم الكارت) |
| India (INR) | 4% + 15¢ |
| BYOP | 0.5% |
| استرداد | 1$ للعملية |
| نزاع/chargeback | 30$ (Visa RDR 18$، Ethoca 27$، deflection 15$) |
| Payouts | مجانًا (5$ لو أقل من 1000$، وSWIFT 25$) |
| إعداد / شهري | **صفر** |

---

## 4) جدول مقارنة مباشر

| المعيار | **Kashier** | **Dodo Payments** |
|---|---|---|
| نوع البوابة | بوابة دفع مصرية (CBE regulated) | Merchant of Record عالمي |
| يقبل تاجر مصري؟ | ✅ (شرط أساسي) | ✅ |
| جمهور عالمي؟ | محدود (4 عملات + كروت دولية بسعر خاص) | ✅ 220+ دولة، 40+ طريقة |
| **Apple Pay** | ✅ **native في واجهتنا** (SDK، بدون redirect/iframe) | ⚠️ داخل checkout بتاعهم فقط (inline iframe / hosted redirect) — **مش في overlay** |
| **Google Pay** | ❌ **غير مدعوم نهائيًا** | ✅ مدعوم (overlay/inline/hosted) بدون أي إعداد |
| شيت محفظة native في واجهتنا (بدون redirect/iframe)؟ | Apple Pay بس | ❌ ولا واحد |
| توثيق دومين مع Apple | مطلوب (عبر سابورت Kashier) | مطلوب للـ inline فقط |
| الضرايب العالمية (VAT/Sales tax) | على العميل/التاجر (مش MoR) | ✅ مضمّنة (190+ دولة) |
| تحصيل بالدولار من أي دولة | محدود | ✅ |
| التسوية | بالجنيه على بنك مصري | بالدولار (SWIFT 25$ لو بره أمريكا) |
| الاشتراكات | merchant-managed | ✅ مُدارة + Dunning + Retries |
| طرق مصرية (ميزة/محافظ/تقسيط/InstaPay) | ✅ كاملة | ❌ |
| الرسوم الأساسية | 2.75% + 3 EGP | 4% + 40¢ (+1.5% دولي) |
| رسوم إعداد/شهرية | صفر | صفر |

---

## 5) مين الأفضل لإيه

- **لو الأولوية Apple Pay داخل التطبيق بشكل native** → **Kashier**. ده الوحيد اللي بيديك الشيت الأصلي فوق صفحتك، والكود عندنا جاهز بالفعل (`openApplePaySession` + `kashier-applepay-session` + تابل Apple Pay في `CustomCardForm.tsx`).
- **لو الأولوية Google Pay** → **Dodo** (Kashier مستحيل). بس لازم تتقبل إن التجربة جوه checkout بتاعهم (مودال/إطار).
- **لو الأولوية جمهور عالمي + ضرايب + طرق دفع محلية في كل بلد** → **Dodo** بفرق كبير. وده الأنسب لمستخدمين من كل العالم.
- **لو الأولوية مصر** → **Kashier** (ميزة، محافظ، تقسيط، InstaPay، تسوية بالجنيه).

### التوصية النهائية (الاثنين مع بعض)
1. **Dodo = البوابة الأساسية للعالم**: كروت + Apple Pay + Google Pay + Klarna/UPI/iDEAL/Pix... + الضرايب والاشتراكات. استخدم **Inline checkout** (بتوثيق دومين Apple) لأن ده اللي يديك Apple Pay و Google Pay مع بعض، أو **Overlay** لو كفاية Google Pay + كروت.
2. **Kashier = طبقة مصر + تجربة Apple Pay الـ native**: محافظ مصرية، ميزة، تقسيط، InstaPay، وسعر أرخص (2.75% + 3ج) للكروت المصرية.
3. لو عايز **شيت Apple Pay native في واجهتك** (مش إطار) → فعّله من Kashier على أجهزة Apple، وسيب باقي العالم على Dodo.

> لو الأهم عندك هو إن الاتنين يشتغلوا فورًا وبأقل شغل: **Dodo وحده** بيديك Apple Pay + Google Pay على طول (Google Pay صفر إعداد، Apple Pay توثيق دومين مرة واحدة) — بس جوه checkout بتاعهم.

---

## 6) خطوات التنفيذ المقترحة

**أ) مع Kashier (Apple Pay native):**
1. ابعت `megsyai.com` لسابورت Kashier (`techsupport@kashier.io`) لتسجيل الدومين مع Apple.
2. استلم ملف الشهادة وارفع على `https://megsyai.com/.well-known/apple-developer-merchantid-domain-association.txt` (ملف static في `public/.well-known/`).
3. نتأكد إن `kashierSDK.load()` بيرسم الزر ويشتغل على جهاز Apple حقيقي.
4. نحافظ على زرار Apple Pay يظهر **بس** على أجهزة Apple (فيه `applePaySupported` عندنا أصلاً).

**ب) مع Dodo (العالم + Google Pay):**
1. فتح حساب Dodo والتحقق من النشاط.
2. إنشاء Products للمخططات (شهري/سنوي) بما إنهم MoR.
3. ربط checkout sessions من الـ backend + webhooks للتفعيل.
4. لو هنستخدم Inline: نعمل Apple Pay domain verification من Dashboard → Settings → Payment Methods → Apple Pay → Manage domains.
5. ضبط الـ theme واللغة لتطابق هوية Megsy.

---

## 7) المصادر الرسمية
- Kashier — Accept payments: https://developers.kashier.io/docs/accept-payments
- Kashier — Apple Pay: https://developers.kashier.io/docs/accept-payments/apple-pay
- Kashier — Payment sessions: https://developers.kashier.io/docs/accept-payments/payment-sessions
- Kashier — Wallet payments: https://developers.kashier.io/docs/direct-api/wallet-payments
- Kashier — Installment & BNPL: https://developers.kashier.io/docs/direct-api/installment-plans
- Kashier — Kiosk & cash: https://developers.kashier.io/docs/direct-api/kiosk-payments
- Kashier — Currency conversion: https://developers.kashier.io/docs/accept-payments/currency-conversion
- Kashier — Pricing: https://www.kashier.io/pricing
- Dodo — Payment methods: https://docs.dodopayments.com/features/payment-methods
- Dodo — Digital wallets: https://docs.dodopayments.com/features/payment-methods/digital-wallets
- Dodo — Overlay checkout: https://docs.dodopayments.com/developer-resources/overlay-checkout
- Dodo — Inline checkout: https://docs.dodopayments.com/developer-resources/inline-checkout
- Dodo — Payments API: https://docs.dodopayments.com/api-reference/payments/post-payments
- Dodo — BYOP: https://docs.dodopayments.com/features/byop
- Dodo — Pricing: https://dodopayments.com/pricing
