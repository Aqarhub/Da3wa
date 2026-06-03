<div dir="rtl">

# 02 — نموذج البيانات (MongoDB + Mongoose)

> **تصميم فقط (توثيق).** هذه المخططات مرجع للتنفيذ في المرحلة 1، مصمّمة لدعم
> **استعلامات تحليلية سريعة** (تجميع الحضور/الغياب لحظيًا) عبر الفهرسة والعدّادات
> المخزّنة (denormalized counters).

</div>

## مخطط Event (الفعالية)

```js
const EventSchema = new mongoose.Schema({
  ownerId:      { type: ObjectId, ref: 'User', required: true, index: true },
  title:        { type: String, required: true, trim: true },
  type:         { type: String, enum: ['wedding','graduation','grand_opening','conference','business_dinner'], required: true },
  deliveryChannel: { type: String, enum: ['whatsapp','email'], required: true },

  // التصميم
  design: {
    source:       { type: String, enum: ['custom','template'], required: true },
    templateId:   { type: String },
    imageUrl:     { type: String },           // التصميم الأساسي على التخزين السحابي
    namePosition: { x: Number, y: Number, fontSize: Number, color: String, align: String },
    qrPosition:   { x: Number, y: Number, size: Number },
  },

  // التفاصيل المعروضة للضيف
  details: {
    datetime:  { type: Date, required: true },
    venueName: String,
    address:   String,
    location:  { lat: Number, lng: Number },   // للاتجاهات
    notes:     String,
  },

  // عدّادات لحظية (denormalized) لاستعلامات سريعة بلا aggregation ثقيل
  stats: {
    totalGuests: { type: Number, default: 0 },
    attended:    { type: Number, default: 0 },
    absent:      { type: Number, default: 0 },
    sent:        { type: Number, default: 0 },
  },

  status:  { type: String, enum: ['draft','paid','sending','active','closed'], default: 'draft', index: true },

  // التسعير/الدفع
  pricing: {
    tier:        String,
    unitPrice:   Number,        // سعر الرسالة الواحدة حسب القناة
    guestCount:  Number,
    totalAmount: Number,
    currency:    { type: String, default: 'SAR' },
    paymentStatus: { type: String, enum: ['pending','paid','failed'], default: 'pending' },
    paymentRef:  String,
  },
}, { timestamps: true });

EventSchema.index({ ownerId: 1, createdAt: -1 });
EventSchema.index({ status: 1, 'details.datetime': 1 });
```

## مخطط Guest (الضيف)

```js
const GuestSchema = new mongoose.Schema({
  eventId:  { type: ObjectId, ref: 'Event', required: true, index: true },
  name:     { type: String, required: true, trim: true },
  phone:    { type: String },                 // لواتساب
  email:    { type: String },                 // للإيميل

  // معرّف الدعوة/الـ QR — فريد وغير قابل للتخمين
  qrToken:  { type: String, required: true, unique: true, index: true },
  inviteImageUrl: String,                      // صورة الدعوة النهائية المولّدة

  // حالة الإرسال
  delivery: {
    status:    { type: String, enum: ['pending','sent','delivered','failed'], default: 'pending' },
    channel:   { type: String, enum: ['whatsapp','email'] },
    sentAt:    Date,
    providerMessageId: String,
    error:     String,
  },

  // حالة الحضور
  attendance: {
    status:        { type: String, enum: ['absent','attended'], default: 'absent', index: true },
    checkedInAt:   Date,
    checkedInBy:   { type: ObjectId, ref: 'Coordinator' },  // أي منسّق مسحه
    gate:          String,
  },
}, { timestamps: true });

// فهارس لتسريع الاستعلامات التحليلية والمسح
GuestSchema.index({ eventId: 1, 'attendance.status': 1 });
GuestSchema.index({ eventId: 1, 'delivery.status': 1 });
GuestSchema.index({ eventId: 1, name: 1 });
```

## مخطط Coordinator (منسّق البوابة)

```js
const CoordinatorSchema = new mongoose.Schema({
  eventId: { type: ObjectId, ref: 'Event', required: true, index: true },
  phone:   { type: String, required: true },      // الدخول برقم الجوال فقط
  name:    { type: String },
  gate:    { type: String },                        // البوابة المسندة (اختياري)

  isActive:    { type: Boolean, default: true },
  scanCount:   { type: Number, default: 0 },        // إحصائية أداء المنسّق
  lastSeenAt:  Date,
}, { timestamps: true });

CoordinatorSchema.index({ eventId: 1, phone: 1 }, { unique: true });
```

<div dir="rtl">

## 🔎 الاستعلامات التحليلية اللحظية

- **بطاقات اللوحة** تُقرأ مباشرة من `event.stats` (O(1)) بدل aggregation متكرّر.
- **تحديث العدّادات** عند المسح يتم ذريًّا (atomic) عبر `findOneAndUpdate` + `$inc`،
  ويُبثّ عبر Socket.io.
- عند الحاجة لإعادة الاحتساب (تدقيق): `aggregate` بـ `$group` على `attendance.status`.

```js
// مثال: تسجيل حضور ذري ومنع التكرار في خطوة واحدة
const guest = await Guest.findOneAndUpdate(
  { qrToken, 'attendance.status': 'absent' },   // يمنع التكرار شرطيًّا
  { $set: { 'attendance.status': 'attended', 'attendance.checkedInAt': new Date(),
            'attendance.checkedInBy': coordinatorId } },
  { new: true }
);
if (guest) await Event.updateOne({ _id: eventId }, { $inc: { 'stats.attended': 1, 'stats.absent': -1 } });
// guest === null  → إمّا QR غير صالح أو حضر مسبقًا (نميّز بينهما باستعلام تالٍ)
```

## نموذج User (صاحب الفعالية) — مختصر
يُربط بالمالك (`ownerId`). الحقول: `phone`, `name`, `email`, طريقة الدخول (OTP بالجوال)،
والباقة. يُفصّل في المرحلة 1.

</div>
