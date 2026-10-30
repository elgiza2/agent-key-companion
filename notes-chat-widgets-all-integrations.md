# مربعات الشات — التغطية الكاملة لكل التكاملات + النظام الزجاجي

> **قرار المستخدم:** نمشي على **Generative UI** (معيار MCP Apps)، بتصميم **زجاجي**،
> وتغطية **كل** خدمة/تطبيق/تكامل ممكن — مش قايمة مختارة.
> كل نصوص الواجهة **إنجليزية**.

---

## 1) الأرقام الحقيقية عندنا (مش تقديرات)

| المصدر | العدد |
|---|---|
| خدمات موصولة عبر Nango (`nango.generated.json`) | **586 خدمة** |
| شعارات جاهزة (`logos.generated.ts`) | **984 شعار** |
| تطبيقات API بمنتجاتها (`catalog.ts`) | يدوية + كتالوج |
| مزوّدو OAuth في التكاملات | Google Workspace · Microsoft 365 · Slack · Notion · GitHub · Linear |
| تصنيفات Nango الخام | data 352 · comms 113 · dev 75 · finance 34 · media 10 · search 2 |

**الخلاصة:** مستحيل نعمل مربع مخصّص لكل خدمة من 586. الحل الصح:
**مربعات حسب القدرة (Capability)** + **مربع عام واحد** يغطّي أي خدمة تانية.

---

## 2) إزاي كل خدمة بتاخد مربع؟ (3 طبقات تغطية)

```
خدمة (586)  →  [1] تصنيف بالقدرة  →  [2] مربع القدرة (22 عائلة)
                      ↓ لو مش معروفة
                 [3] المربع العام service_action  ←  يغطّي أي خدمة موجودة أو جديدة
```

### الطبقة 1 — قواعد التصنيف (من اسم الخدمة + التصنيف الخام)
| القدرة | كلمات مفتاحية في الاسم | مربع العائلة |
|---|---|---|
| `email` | mail, gmail, outlook, imap, smtp, sendgrid, postmark, resend | `email_draft` / `email_list` |
| `calendar` | calendar, cal.com, calendly, acuity, scheduling, booking | `calendar_event` / `slot_picker` |
| `crm` | hubspot, salesforce, pipedrive, zoho, close, attio, crm, deals | `crm_record` / `pipeline` |
| `commerce` | shopify, woocommerce, bigcommerce, magento, square, commerce, store | `product_menu` → `cart` → `order_status` |
| `payments` | stripe, paypal, braintree, adyen, checkout, razorpay, paddle | `payment_link` / `receipt` |
| `files` | drive, dropbox, onedrive, box, s3, storage, sharepoint | `file_picker` / `file` |
| `docs` | notion, docs, confluence, coda, quip, evernote, airtable | `note_card` / `doc_preview` |
| `sheets` | sheets, excel, smartsheet, tabular, grid | `sheet_row` / `table` |
| `chat` | slack, discord, teams, telegram, whatsapp, intercom, chat | `message_card` / `channel_picker` |
| `meetings` | zoom, meet, webex, whereby, teams call | `meeting_card` / `join_link` |
| `tasks` | asana, jira, trello, clickup, monday, todoist, linear, notion tasks | `task_card` / `kanban` |
| `dev` | github, gitlab, bitbucket, vercel, sentry, jenkins, circleci | `repo_card` / `pr_card` / `issue_card` |
| `support` | zendesk, freshdesk, helpscout, gorgias, intercom tickets | `ticket_card` |
| `marketing` | mailchimp, klaviyo, hubspot mkt, activecampaign, brevo, campaign | `campaign` / `audience_card` |
| `social` | twitter/x, linkedin, instagram, facebook, tiktok, buffer, zernio | `social_post` |
| `ads` | google ads, meta ads, linkedin ads, tiktok ads, adwords | `campaign` / `ad_performance` |
| `analytics` | analytics, mixpanel, amplitude, segment, posthog, ga4, clarity | `chart` / `kpi` |
| `hr` | bamboohr, workday, gusto, rippling, adp, personio, lms | `employee_card` / `leave_card` |
| `logistics` | shipstation, easypost, shippo, dhl, fedex, ups, aftership | `shipment` / `route` |
| `finance` | quickbooks, xero, netsuite, expensify, ramp, brex, plaid | `invoice_card` / `expense_card` |
| `data` | snowflake, bigquery, postgres, mongodb, airbyte, fivetran | `query_result` / `table` |
| `ai` | openai, anthropic, replicate, elevenlabs, deepgram | `model_run` / `audio` |
| `maps/weather` | maps, weather, openweather, here, mapbox | `map` / `weather_now` |
| `identity` | okta, auth0, onelogin, jumpcloud | `account_picker` |

### الطبقة 3 — المربع العام `service_action` (شبكة الأمان)
أي خدمة **مش** في القواعد فوق (وهي كتير — زي 1Password · 3CX · Accelo · Adyen · ADP…) تاخد المربع ده تلقائيًا:

```
┌──────────────────────────────────────────────┐
│  ◉ ServiceName                    [Connected]│   ← شعار الخدمة الحقيقي + شارة الحالة
│  Action · what it will do                     │
│  ────────────────────────────────────────────│
│  Field 1        [ ________________ ]          │   ← فورم من بارامترات الأداة الحقيقية
│  Field 2        [ ________________ ]          │
│  ────────────────────────────────────────────│
│  ┌───────────────┐                            │
│  │      Run      │   Cancel                   │   ← زر أساسي واحد
│  └───────────────┘                            │
└──────────────────────────────────────────────┘
        ↓ بعد التشغيل
┌──────────────────────────────────────────────┐
│  ✓ Done · 12 results · 0.4s                   │
│  ┌────────────────────────────────────────┐  │
│  │  نتيجة ذكية: جدول / قائمة / تفاصيل      │  │   ← عرض تلقائي حسب شكل البيانات
│  └────────────────────────────────────────┘  │
│  Export CSV · View raw                        │
└──────────────────────────────────────────────┘
```

**يعني: 586 خدمة كلها مغطّاة** — 22 عائلة مخصّصة للخدمات الشائعة، والباقي على المربع العام.

---

## 3) النظام الزجاجي (Glass System) — يُطبَّق على كل مربع

### الرموز (Tokens) — بنستخدم نفس متغيرات التطبيق
| العنصر | القيمة |
|---|---|
| خلفية المربع | `rgba(255,255,255,0.06)` في الوضع الداكن · `rgba(255,255,255,0.55)` في الفاتح |
| الضبابية | `backdrop-filter: blur(22px) saturate(160%)` |
| الحدود | `1px solid rgba(255,255,255,0.14)` + خط علوي أفتح `rgba(255,255,255,0.25)` |
| الحواف | `border-radius: 22px` للمربع · `14px` للعناصر الداخلية · `999px` للشرائح |
| الظل | `0 8px 30px rgba(0,0,0,0.18)` — خفيف، من غير حدود قوية |
| الحشو | `16px` (زجاجي) · الفجوة بين المربعات `10px` |
| الخط | عنوان `13.5px/600` · نص `12.5px/400` رمادي · رقم مهم `15px/650` `dir="ltr"` |
| الحركة | دخول `opacity + translateY(6px)` في `180ms ease-out` |

### قواعد ثابتة
1. **زجاج واحد للحالة كلها:** المربع نفسه، العناصر الداخلية (خلايا/صفوف) بخلفية `rgba(255,255,255,0.04)` — مش بيضاء صلبة.
2. **حدود خفيفة بس** — مفيش `border` غامق ولا `shadow` تقيل.
3. **زر أساسي واحد** بخلفية براند شبه شفافة + نص أبيض، والباقي `ghost` بلا خلفية.
4. **الأيقونة/الشعار دايمًا في دايرة زجاجية** 40–44px.
5. **الشريط السفلي للإجراءات** مفصول بخط رفيع شفاف، والالتصاق بأسفل المربع.
6. **الحالات:** تحميل = هيكل عظمي شفاف (shimmer) · فراغ = رسالة قصيرة + إجراء · خطأ = خلفية حمراء شفافة 6% + زر `Retry`.
7. **أقصى ارتفاع 420px** مع سكرول داخلي، والسكرول شفاف رفيع.
8. في الوضع الفاتح الزجاج يكون **أفتح من الخلفية** مش أغمق.

---

## 4) الكتالوج الكامل — المربعات وعائلاتها

### أ) التكاملات (Connect)
`connect_app` · `account_picker` · `permission_list` · `connection_health` · `reauth_prompt`

### ب) الإيميل — Gmail · Outlook · IMAP · SendGrid · Postmark · Resend · Mailgun
`email_draft` · `email_thread` · `email_list` · `attachment_picker` · `label_picker`

### ج) التقويم والحجز — Google Calendar · Outlook · Cal.com · Calendly · Acuity
`calendar_event` · `slot_picker` · `day_view` · `week_view` · `booking_confirm` · `timezone`

### د) الشات والقنوات — Slack · Discord · Teams · Telegram · WhatsApp · Intercom
`message_card` · `channel_picker` · `thread_view` · `mention_card`

### هـ) الملفات والتخزين — Drive · Dropbox · OneDrive · Box · S3 · SharePoint
`file_picker` · `file` · `folder_tree` · `upload_progress` · `share_link`

### و) المستندات والمعرفة — Notion · Confluence · Coda · Evernote · Airtable
`note_card` · `doc_preview` · `page_tree` · `database_row`

### ز) الجداول — Sheets · Excel · Smartsheet
`sheet_row` · `sheet_range` · `table` · `formula_card`

### ح) المهام والمشاريع — Asana · Jira · Trello · ClickUp · Monday · Linear · Todoist
`task_card` · `kanban` · `sprint_card` · `issue_card` · `milestone`

### ط) التطوير — GitHub · GitLab · Bitbucket · Vercel · Sentry · CircleCI
`repo_card` · `pr_card` · `commit_list` · `issue_card` · `deploy_status` · `ci_run` · `error_trace`

### ي) الدعم — Zendesk · Freshdesk · Help Scout · Gorgias
`ticket_card` · `ticket_queue` · `sla_badge` · `reply_draft`

### ك) التسويق والجمهور — Mailchimp · Klaviyo · Brevo · ActiveCampaign
`campaign` · `audience_card` · `flow_builder` · `email_blast_preview`

### ل) السوشيال — X · LinkedIn · Instagram · Facebook · TikTok · Buffer · Zernio
`social_post` · `post_preview` · `schedule_picker` · `engagement_card`

### م) الإعلانات — Google Ads · Meta Ads · LinkedIn Ads · TikTok Ads
`ad_performance` · `budget_card` · `audience_target` · `creative_preview`

### ن) التحليلات — GA4 · Mixpanel · Amplitude · PostHog · Segment · Clarity
`kpi` · `chart` · `funnel` · `cohort_table` · `heatmap_card`

### س) التجارة — Shopify · WooCommerce · BigCommerce · Magento · Square
`product_menu` · `option_picker` · `cart` · `checkout` · `order_status` · `receipt` · `inventory_card` · `product_card`

### ع) المدفوعات والمالية — Stripe · PayPal · Adyen · QuickBooks · Xero · Expensify
`payment_link` · `invoice_card` · `expense_card` · `balance_card` · `payout_card`

### ف) الموارد البشرية — BambooHR · Workday · Gusto · Rippling · ADP
`employee_card` · `leave_card` · `payroll_card` · `candidate_card`

### ص) اللوجستيات — ShipStation · EasyPost · DHL · FedEx · UPS · AfterShip
`shipment` · `label_card` · `route` · `rate_compare`

### ق) البيانات — Snowflake · BigQuery · Postgres · MongoDB · Airbyte
`query_result` · `table` · `schema_card` · `sync_status`

### ر) الذكاء الاصطناعي — OpenAI · Anthropic · Replicate · ElevenLabs · Deepgram
`model_run` · `audio` · `voice_note` · `transcript_card`

### ش) الخرائط والطقس — Google Maps · Mapbox · OpenWeather
`map` · `places` · `route` · `weather_now` · `weather_forecast` · `air_quality`

### ت) الهوية والصلاحيات — Okta · Auth0 · OneLogin · JumpCloud
`account_picker` · `permission_list` · `access_review`

### ث) عامة (تشتغل جوه أي مربع)
`approval` · `question` · `form` · `error_card` · `result_table` · `result_list` · `result_detail` · `chart` · `image` · `audio` · `video` · `file` · `code` · `diff` · `diagram` · `steps` · `progress` · `plan`

**الإجمالي: 24 عائلة قدرة · ~140 مربع · تغطية 586 خدمة (100%).**

---

## 5) ترتيب التنفيذ

| # | المرحلة | المحتوى | التغطية الناتجة |
|---|---|---|---|
| **1** | **الأساس الزجاجي** | Glass primitives + Registry + Action loop + `service_action` العام | **586 خدمة** فورًا |
| **2** | التواصل | `connect_app` · إيميل · تقويم · شات · ملفات | ~150 خدمة |
| **3** | العمل | مهام · مستندات · جداول · تطوير · دعم | ~180 خدمة |
| **4** | النمو والمال | تسويق · سوشيال · إعلانات · تحليلات · تجارة · مدفوعات | ~150 خدمة |
| **5** | الباقي | HR · لوجستيات · بيانات · AI · خرائط · هوية | ~100 خدمة |

> **المرحلة 1 لوحدها** بتخلي **أي خدمة من الـ 586** تظهر في الشات كمربع زجاجي نظيف — من غير ما ننتظر باقي المراحل.
