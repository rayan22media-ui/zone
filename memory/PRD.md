# منصة بدل - PRD (Product Requirements Document)

## المعلومات الأساسية
- **اسم المشروع:** منصة بدل للمقايضة
- **اللغة:** العربية
- **المنطقة:** سوريا
- **التقنيات:** React + FastAPI + MongoDB

## الوصف العام
منصة سورية للمقايضة والتبادل التجاري بدون نقود، تربط المستخدمين لتبادل السلع والخدمات.

---

## المتطلبات المنفذة ✅

### 1. النظام الأساسي
- [x] تسجيل المستخدمين وتسجيل الدخول (JWT)
- [x] إدارة العروض (إنشاء، تعديل، حذف)
- [x] نظام المراسلات بين المستخدمين
- [x] نظام المفضلة
- [x] نظام الإشعارات
- [x] لوحة تحكم الأدمن

### 2. واجهة المستخدم
- [x] الصفحة الرئيسية (تصميم عصري)
- [x] صفحة تصفح العروض
- [x] صفحة تفاصيل العرض
- [x] صفحة المراسلات
- [x] أيقونات خطية (lucide-react)

### 3. ميزات إضافية
- [x] الصفحات الديناميكية (Page Builder)
- [x] رفع الصور مباشرة
- [x] المدونة

---

## المتطلبات قيد التنفيذ 🔄

### نظام التحقق عبر WhatsApp (P0)
**الحالة:** قيد التنفيذ

#### المتطلبات:
1. إضافة حقل رقم الهاتف مع كود الدولة في التسجيل ✅
2. إرسال كود OTP عبر WhatsApp عند التسجيل
3. صفحة التحقق من OTP
4. عدم تفعيل الحساب إلا بعد التحقق
5. استثناء حساب الأدمن
6. لوحة تحكم للأدمن لإدارة ربط WhatsApp

#### ما تم تنفيذه:
- [x] حقل رقم الهاتف في صفحة التسجيل
- [x] قائمة أكواد الدول (+963 سوريا افتراضياً)
- [x] نقاط نهاية WhatsApp في الواجهة الخلفية
- [x] خدمة WhatsApp المحاكية (whatsapp_service.py)

#### المتبقي:
- [ ] صفحة إدخال كود OTP
- [ ] ربط التسجيل بإرسال OTP
- [ ] لوحة تحكم WhatsApp للأدمن
- [ ] اختبار التدفق الكامل

---

## المتطلبات المستقبلية 📋

### P1 - أولوية متوسطة
- [ ] إصلاح تحذيرات ESLint
- [ ] تحسين أداء التطبيق

### P2 - أولوية منخفضة
- [ ] إعادة هيكلة App.js (تقسيم الملف الضخم)
- [ ] إضافة اختبارات آلية

---

## الملفات الرئيسية

### Frontend
- `/app/frontend/src/App.js` - الملف الرئيسي (3800+ سطر)

### Backend
- `/app/backend/server.py` - API الرئيسي
- `/app/backend/whatsapp_service.py` - خدمة WhatsApp

---

## سجل التغييرات

### 2025-01-14
- ✅ إصلاح خطأ `get_current_admin_user` في server.py
- ✅ التطبيق يعمل بشكل طبيعي

---

## Latest Update (December 2025):
- Simplified OfferCard design by removing:
  - Timestamp/time display
  - Owner name
  - "Wanted in exchange" section
- Card now shows only: Image, Category, Location, Title, and Description

**Completed work in this session**

---

## ملاحظات تقنية

### نقاط نهاية WhatsApp:
- `GET /api/whatsapp/status` - حالة الاتصال
- `POST /api/whatsapp/generate-qr` - توليد QR
- `POST /api/whatsapp/connect` - الاتصال
- `POST /api/whatsapp/disconnect` - قطع الاتصال
- `POST /api/auth/send-otp` - إرسال OTP
- `POST /api/auth/verify-otp` - التحقق من OTP
