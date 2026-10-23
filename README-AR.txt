SPACE Creative Studio — لوحة الإدارة (نسخة متعددة الصفحات)

الصفحات:
- login.html: تسجيل الدخول
- index.html: نظرة عامة (الإحصائيات + روابط سريعة)
- settings.html: معلومات الشركة
- services.html: الخدمات
- portfolio.html: المعرض (رفع صور وفيديو)
- requests.html: طلبات العملاء
- sales.html: الحسابات والإيرادات

الملفات المشتركة:
- style.css: التصميم
- config.js: اتصال Supabase (المفتاح هنا public/publishable فقط)
- admin.js: كل الوظائف (يشتغل على كل الصفحات حسب data-page)
- SUPABASE-SETUP-SQL.txt: إعداد جدول المبيعات والتخزين (نفس الملف السابق بدون تغيير)

طريقة الرفع:
1. ارفع كل الملفات إلى مستودع لوحة الإدارة مع استبدال القديمة.
2. افتح login.html (أو index.html وراح يحوّلك لتسجيل الدخول تلقائياً).
3. إذا ما نفّذت ملف SQL سابقاً: Supabase > SQL Editor > الصق محتوى SUPABASE-SETUP-SQL.txt ثم Run.

ملاحظات:
- أي صفحة بدون تسجيل دخول تحوّلك تلقائياً إلى login.html.
- حد حجم ملف الصورة/الفيديو 50MB.
- الإيرادات المحسوبة هي المبالغ المستلمة فعلياً.
- لا تضع أي secret/service_role key في ملفات الموقع أو GitHub.
