# خطة إصلاح بث الدردشة ومؤشرات الانتظار

## الهدف الحالي
إزالة علامتي الانتظار المتكررتين مع الإبقاء على التفكير الداخلي والأدوات والخطوات، ضمان أن sentinel التصعيد لا يظهر حتى مع suffix مثل `:research`، ومنع رسالة «حصل تأخير» الناتجة عن تشغيل `onComplete` بالتوازي مع fallback بعد `onError`. كذلك نوضح خطأ AgentSky غير المهيأ دون إخفاء أن إعداد الخادم يحتاج مفتاحًا.

## الخطة التنفيذية الحالية
1. توسيع محلل sentinel في `fastChat.ts` لالتقاط الصيغة ذات suffix والحالات المتدفقة على عدة chunks؛ تحديث تعليمات النموذج إلى صيغة واحدة ثابتة واختبار عدم تسريب العلامة.
2. إظهار سطح انتظار واحد فقط: الحفاظ على `ThinkingTrace` reasoning/tools، وإخفاء spinner احتياطي مكرر؛ إزالة `AgentThinkingLine` الزائد عندما يعرض `AgentPresence` الحالة نفسها، مع الإبقاء على `StepTimeline`.
3. في أخطاء البث: عدم استدعاء `onDone` بعد `onError`؛ خطأ handler هو صاحب إنهاء الدور أو بدء Browser Use fallback. هذا يمنع الحفظ المبكر لرسالة فارغة أثناء عمل fallback.
4. وضع اختبار/تأكيد لمسار AgentSky `not_configured` ومحاولة Browser Use الموجودة؛ لا نتجاوز إعداد مفتاح الخدمة أو نغيّر سياسة الوسائط والصلاحيات.
5. تشغيل الاختبارات المرتبطة، build، lint/format للملفات المعدلة، و`git diff --check`.

## الملفات المحورية الحالية
- `src/lib/chat/fastChat.ts` و`src/lib/chat/fastChat.test.ts`: sentinel وSSE.
- `src/lib/streamChat.ts`: ترتيب onError/onDone ومواصلة المسار الكامل.
- `src/components/chat/ChatMessage.tsx`: أثر التفكير والخطوات ومؤشر انتظار النص.
- `src/pages/chat/components/ChatMessageItem.tsx`: AgentPresence وAgentThinkingLine وStepTimeline.
- `src/pages/chat/services/runChatStreamTurn.ts`: إتمام الدور ورسالة الاستجابة الفارغة.
- `src/pages/chat/services/runAgentSkyTurn.ts` و`src/lib/agentsky/fallbackPolicy.ts`: خطأ AgentSky وBrowser Use fallback.
- `src/lib/agentsky/agentsky.server.ts`: اختيار المفتاح من `agentsky_keys` أو `AGENTSKY_API_KEY`.

## قرارات وحدود
قرار التوجيه العادي يبقى من `chat-fast`؛ توسيع صيغة sentinel هو parsing للقرار الصادر من النموذج وليس heuristic أماميًا. إعداد AgentSky غير موجود في Sandbox (`AGENTSKY_API_KEY` غائب) ومشروع Supabase المهيأ في المستودع `qdnqxjzjecaieuavagvq` لا يطابق المشروع الوحيد المتاح في موصل Supabase (`loprpsajnxkszqarrvcp`)؛ لذلك لن نفحص أو نعدل قاعدة بيانات لا نعرف أنها تخص التطبيق. لو استمر خطأ not_configured بعد الإصلاح، يلزم إعداد مفتاح فعلي عبر pool `agentsky_keys`/Telegram admin أو متغير الخادم، ولا نطلب من المستخدم إرسال السر في المحادثة.
