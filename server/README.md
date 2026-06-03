<div dir="rtl">

# Da3wa Server — النواة الخلفية

خادم REST + Socket.io لمنصّة «دعوات» (إدارة الدعوات والحضور بالـ QR).
يغطّي هذا الإصدار: **قاعدة البيانات + المصادقة + APIs الأساسية**.

## التقنيات
Node.js · Express · MongoDB/Mongoose · Socket.io · helmet · express-rate-limit · JWT

## التشغيل

```bash
cd server
cp .env.example .env      # عدّل القيم (MONGO_URI, JWT_SECRET ...)
npm install
npm run dev               # أو: npm start
```

يتطلب **MongoDB** يعمل محليًا أو رابط Atlas في `MONGO_URI`.

## بنية المجلدات
```
src/
├── config/        # env + اتصال قاعدة البيانات
├── models/        # مخططات Mongoose: User, Event, Guest, Coordinator, OtpToken
├── middleware/    # المصادقة، محدّد المعدّل، معالج الأخطاء
├── utils/         # التوكنات، التحقق، الأخطاء
├── services/      # OTP + طبقة الرسائل المجرّدة (واتساب/إيميل — Stubs)
├── controllers/   # منطق الـ endpoints
├── routes/        # تعريف المسارات
├── sockets/       # Socket.io (المزامنة اللحظية)
├── app.js         # تطبيق Express
└── server.js      # إقلاع HTTP + Socket.io
```

## أهم نقاط الـ API

| الطريقة | المسار | الوصف | المصادقة |
|--------|--------|-------|----------|
| GET | `/api/health` | فحص الحالة | — |
| POST | `/api/auth/request-otp` | إرسال OTP | — |
| POST | `/api/auth/verify-otp` | دخول المالك | — |
| POST | `/api/auth/coordinator/verify-otp` | دخول المنسّق | — |
| POST | `/api/events` | إنشاء فعالية | Owner |
| GET | `/api/events` | قائمة الفعاليات | Owner |
| GET | `/api/events/:id` | تفاصيل فعالية | Owner |
| PATCH | `/api/events/:id` | تحديث (تصميم/تفاصيل) | Owner |
| GET | `/api/events/:id/stats` | إحصائيات لحظية | Owner |
| POST | `/api/events/:id/guests/import` | استيراد ضيوف | Owner |
| GET | `/api/events/:id/guests` | قائمة الضيوف | Owner |
| POST | `/api/events/:id/coordinators` | إضافة منسّقين | Owner |
| GET | `/api/events/:id/coordinators` | قائمة المنسّقين | Owner |
| DELETE | `/api/events/:id/coordinators/:coordinatorId` | حذف منسّق | Owner |
| POST | `/api/scan` | تسجيل حضور (ذري، منع تكرار) | Coordinator |
| POST | `/api/scan/undo` | تراجع عن مسح | Coordinator |
| GET | `/api/invite/:qrToken` | بيانات صفحة الدعوة | — (عامّة) |

## المزامنة اللحظية (Socket.io)
- الاتصال يتطلب `auth: { token }` (نفس JWT).
- `join:event { eventId }` للانضمام لغرفة الفعالية.
- أحداث الخادم: `scan:new`، `scan:undo`، `stats:update`.

## ملاحظات
- منع تكرار المسح يتم عبر تحديث **ذري** في القاعدة (شرط `attendance.status = absent`) — مصدر الحقيقة الوحيد — ثم البثّ عبر Socket.io.
- إرسال OTP/الدعوات حاليًا **Stubs** تُسجّل في الـ console؛ التكامل الفعلي (Unifonic/إيميل) في مرحلة الإرسال.
- استيراد الضيوف يقبل مصفوفة JSON الآن؛ رفع CSV/Excel يُضاف لاحقًا.

</div>
