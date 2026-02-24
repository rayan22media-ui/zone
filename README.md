# Zone

## دعم قاعدة بيانات MySQL (Hostinger)

تمت إضافة وضع تشغيل جديد للباك-إند عبر المتغير `DB_BACKEND=mysql`.

### الإعداد السريع
1. انسخ الملف:
   ```bash
   cp backend/.env.hostinger.example backend/.env
   ```
2. عدّل بيانات MySQL الخاصة بحساب Hostinger.
3. ثبّت المتطلبات ثم شغّل السيرفر.

> ملاحظة: التطبيق كان مبنيًا أساسًا على MongoDB، وتمت إضافة طبقة توافق لتعمل على MySQL عبر تخزين JSON داخل جدول `app_documents`.
