# تعديل تعليمات الوكيل من غير نشر (No-deploy editing)

أي تعليمات عايز تضيفها أو تعدّلها للوكيل بقت **من قاعدة البيانات** مباشرة — مفيش commit، مفيش build، مفيش deploy.

## إزاي بيشتغل

```
Supabase: agent_prompt_config (صف واحد)
        ↓  يقرأه السيرفر في كل رسالة
BASE_PROMPT (الكود)  +  extra_prompt (قاعدة البيانات)  +  <!--megsy-prompt:VERSION-->
        ↓  لو النسخة اللي في الوكيل قديمة
PATCH على الوكيل عند المزوّد (AgentSky) + إعادة إرسال mcpServers
        ↓
الوكيل بيشتغل بالتعليمات الجديدة من الرسالة الجاية
```

**المفتاح كله = عمود `version`.** كل ما تزوّده، السيرفر يكتشف إن الوكيل لسه على النسخة القديمة ويعمل re-sync تلقائي.

## الجدول

```sql
-- public.agent_prompt_config
id            integer  primary key default 1   -- صف واحد بس (check id = 1)
version       integer  not null default 1      -- ⬅ زوّده مع كل تعديل
extra_prompt  text     not null default ''     -- ⬅ التعليمات الإضافية
updated_at    timestamptz
```

RLS مفعّل ومفيش أي صلاحية لـ anon/authenticated — السيرفر بس (service role) اللي يقرأه.

## إضافة تعليمات (طريقة واحدة سريعة)

**من Supabase → Table Editor → `agent_prompt_config`:** اكتب في `extra_prompt` وزوّد `version` بـ 1.

**أو بأمر واحد:**

```sql
update public.agent_prompt_config
set extra_prompt = extra_prompt || E'\n- Always answer in the user''s language.',
    version = version + 1,
    updated_at = now()
where id = 1;
```

**استبدال التعليمات بالكامل:**

```sql
update public.agent_prompt_config
set extra_prompt = '- Never use the session dashboard; show everything with megsy_card.',
    version = version + 1,
    updated_at = now()
where id = 1;
```

خلاص. المستخدم يبعت رسالة → الوكيل ياخد التعليمات الجديدة.

## إيه اللي لسه محتاج نشر

| الحاجة | محتاجة نشر؟ |
|---|---|
| تعليمات/قواعد/نبرة/لغة الوكيل | ❌ لأ — قاعدة البيانات |
| أسماء المربعات وحقولها (وصف أداة MCP) | ✅ أيوه — الكود |
| مربع جديد نفسه (مكوّن React) | ✅ أيوه — الكود |
| صلاحيات/موديلات/حدود | ❌ لأ — قاعدة البيانات أو إعدادات المزوّد |

> السبب: التعليمات نص، فبتتغير في صف واحد. أما المربع فهو واجهة React، فلازم يتبني.

## ملاحظة مهمة عن المزوّد

AgentSky **بيثبّت قائمة أدوات الـ MCP لحظة إنشاء الوكيل**. فأي أداة جديدة نضيفها للسيرفر مش بتوصل للوكيل القديم — عشان كده السيرفر **بيعيد إرسال `mcpServers`** مع كل re-sync. من غير الخطوة دي، الوكيل يفضل شايف الأدوات القديمة ويروح للداشبورد الداخلي بتاعه.
