<div dir="rtl">

# 03 — الخادم وواجهة الـ API

> **تصميم فقط.** هذا توثيق لنقاط الـ API والخدمات، يُنفّذ في المراحل 1–6.

## 🌐 نقاط الـ API (REST)

### المصادقة (Auth)
| الطريقة | المسار | الوصف |
|--------|--------|-------|
| POST | `/api/auth/request-otp` | إرسال OTP إلى رقم الجوال (للمالك والمنسّق) |
| POST | `/api/auth/verify-otp` | التحقق من OTP وإرجاع JWT |

### الفعاليات (Events)
| الطريقة | المسار | الوصف |
|--------|--------|-------|
| POST | `/api/events` | إنشاء فعالية (المسودة — خطوة 1) |
| PATCH | `/api/events/:id` | تحديث (التصميم/التفاصيل — خطوات 2،3) |
| GET | `/api/events` | قائمة فعاليات المالك |
| GET | `/api/events/:id` | تفاصيل فعالية |
| GET | `/api/events/:id/stats` | الإحصائيات اللحظية (للوحة) |

### الضيوف (Guests)
| الطريقة | المسار | الوصف |
|--------|--------|-------|
| POST | `/api/events/:id/guests/import` | استيراد CSV/Excel |
| GET | `/api/events/:id/guests` | قائمة الضيوف + حالاتهم (مع تصفية/ترقيم) |
| POST | `/api/events/:id/guests/generate` | توليد صور الدعوات + QR |
| POST | `/api/events/:id/guests/send` | بدء الإرسال (واتساب/إيميل) |

### المنسّقون (Coordinators)
| الطريقة | المسار | الوصف |
|--------|--------|-------|
| POST | `/api/events/:id/coordinators` | إضافة منسّق برقم جواله |
| GET | `/api/events/:id/coordinators` | القائمة |
| DELETE | `/api/coordinators/:id` | إزالة |

### المسح (Scan)
| الطريقة | المسار | الوصف |
|--------|--------|-------|
| POST | `/api/scan` | تسجيل حضور بـ `qrToken` (ذري، منع تكرار) |
| POST | `/api/scan/undo` | تراجع عن آخر مسح |

### الدعوة العامة (الضيف — قراءة فقط)
| الطريقة | المسار | الوصف |
|--------|--------|-------|
| GET | `/api/invite/:qrToken` | بيانات صفحة الدعوة (البطاقة + التفاصيل) |

### الدفع (Payments)
| الطريقة | المسار | الوصف |
|--------|--------|-------|
| GET | `/api/pricing/quote` | حساب التكلفة حسب العدد + القناة |
| POST | `/api/payments/checkout` | بدء عملية الدفع |
| POST | `/api/payments/webhook` | تأكيد الدفع من مزوّد الدفع |

---

## ⚡ Socket.io — المزامنة اللحظية

**الهدف:** منع تكرار مسح نفس الـ QR على عدة بوابات، وتحديث اللوحة فورًا.

| الحدث | الاتجاه | الحمولة |
|------|---------|---------|
| `join:event` | client → server | `{ eventId }` (المنسّق/المالك ينضم لغرفة الفعالية) |
| `scan:new` | server → room | `{ guestName, status, gate, at }` بثّ لكل المنسّقين |
| `stats:update` | server → room | `{ totalGuests, attended, absent }` تحديث اللوحة |
| `guest:already-scanned` | server → client | تنبيه التكرار للماسح المعني |

**منع التكرار:** يعتمد على التحديث الذري في القاعدة (`findOneAndUpdate` بشرط
`attendance.status: 'absent'`) — مصدر الحقيقة الوحيد — ثم البثّ عبر Socket.io.

---

## 🧩 خدمات مجرّدة (Service Layer)

### 1) خدمة الإرسال (Messaging) — واجهة موحّدة
```
interface MessagingProvider {
  sendInvite(to, mediaUrl, caption): Promise<{ messageId, status }>
}
class UnifonicWhatsAppProvider implements MessagingProvider { ... }   // واتساب/SMS
class EmailProvider implements MessagingProvider { ... }               // nodemailer/SendGrid
```
- اختيار المزوّد حسب `event.deliveryChannel`.
- طابور إرسال (queue) مع إعادة المحاولة وتحديث `guest.delivery.status`.

### 2) خدمة توليد الدعوة (Invite Generation)
- توليد `qrToken` فريد موقّع.
- توليد صورة QR عبر **qrcode**.
- دمج الاسم + QR على التصميم عبر **sharp** حسب `design.namePosition`/`qrPosition`.
- رفع الصورة النهائية إلى التخزين السحابي وحفظ `inviteImageUrl`.

### 3) خدمة التخزين (Storage)
- واجهة موحّدة فوق S3 / Spaces / Cloudinary.
- روابط موقّعة، تنظيف الملفات المؤقتة.

---

## 🛡️ Middleware
- `helmet()` لكل الطلبات.
- `express-rate-limit` على `/auth/*` و`/scan` و`/guests/import`.
- تحقق JWT + صلاحيات (المالك يملك فعالياته، المنسّق محصور بفعاليته).
- التحقق من المدخلات (validation) ومعالجة الأخطاء الموحّدة.

</div>
