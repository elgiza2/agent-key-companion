# تسجيل الدخول بـ GitHub — دليل التنفيذ

> المشروع على Supabase: `qdnqxjzjecaieuavagvq`
> **رابط الكولباك الرسمي اللي هتحتاجه في GitHub:**
> `https://qdnqxjzjecaieuavagvq.supabase.co/auth/v1/callback`

> ملاحظة: زر **Microsoft** اتشال من الموقع بالكامل (سطح المكتب + الموبايل) بناءً على طلبك، فبقى المطلوب **GitHub** بس.

---

## الحالة الحالية (متفَحّصة فعليًا على الموقع الحي)

| المزوّد | الحالة | ملاحظة |
|---|---|---|
| Google | ✅ شغال | بيرجّع تحويل لصفحة جوجل |
| **GitHub** | ❌ ناقص تفعيل | بيرجّع `Unsupported provider: provider is not enabled` |
| Microsoft / Apple | — | اتشالوا / مش مستخدمين |

**الكود جاهز 100% من ناحيتي:** زر **Continue with GitHub** ظاهر في صفحة `/auth` (نسخة الكمبيوتر والموبايل) وبينده المزوّد `github` بالسكوبات `read:user user:email`. الناقص بس **تفعيل المزوّد في لوحة Supabase** بمفاتيح GitHub.

---

## 1) إزاي تجيب المفاتيح من GitHub

1. افتح: https://github.com/settings/developers
2. اضغط **OAuth Apps** ← **New OAuth App**.
3. املأ كده بالظبط:
   - **Application name:** `Megsy AI`
   - **Homepage URL:** `https://www.megsyai.com`
   - **Authorization callback URL:** `https://qdnqxjzjecaieuavagvq.supabase.co/auth/v1/callback`
4. اضغط **Register application**.
5. هتلاقي **Client ID** → انسخه.
6. اضغط **Generate a new client secret** → انسخ الـ **Secret** (بيظهر مرة واحدة بس، خزّنه).

**اللي هتحتاجه:** `Client ID` + `Client Secret`

---

## 2) تفعيل GitHub في Supabase (الخطوة الأخيرة)

1. افتح: https://supabase.com/dashboard/project/qdnqxjzjecaieuavagvq/auth/providers
2. دور على **GitHub** ← شغّل **Enable Sign in with GitHub**.
3. الصق **Client ID** و **Client Secret** ← **Save**.
4. اتأكد من: https://supabase.com/dashboard/project/qdnqxjzjecaieuavagvq/auth/url-configuration
   - **Site URL:** `https://www.megsyai.com`
   - **Redirect URLs** (كل واحدة في سطر):
     - `https://www.megsyai.com/**`
     - `https://megsyai.com/**`
     - `https://agentsky-nexus-3df67cfc.vercel.app/**`
5. جرّب على `https://www.megsyai.com/auth` — هتلاقي: **Google**، **GitHub**، **Continue with email**، ودوس GitHub وسجّل بحسابك.

### إزاي تتأكد إن التفعيل نجح (من غير ما تدوس)

```bash
curl "https://qdnqxjzjecaieuavagvq.supabase.co/auth/v1/authorize?provider=github" -H "apikey: <الـ anon key>"
```

- لو رجّع تحويل (302) لـ `github.com/login/oauth/authorize` → **تمام، مُفعّل**.
- لو رجّع `Unsupported provider: provider is not enabled` → لسه محتاج تفعيل.

---

## نصيحة أمان

- الـ Client Secret **مش** بيتحط في الكود خالص — بيتحط في Supabase بس، والكود بيتعامل معاه من غير ما يشوفه.
- لو الـ Secret اتسرّب يومًا: من نفس صفحة الـ OAuth App اضغط **Generate a new client secret** وحدّثه في Supabase.

---

## لو عايزني أفعّله بنفسي من غير ما تلمس اللوحة

محتاج حاجتين:
1. **Personal Access Token** من Supabase: https://supabase.com/dashboard/account/tokens ← **Generate new token** (بيبدأ بـ `sbp_`).
2. **Client ID** و **Client Secret** من GitHub (خطوات القسم الأول فوق).

ابعتهملي وأنا أفعّل المزوّد وأظبط الـ Redirect URLs وأتأكد إن الدخول شغال من الموقع الحي.
