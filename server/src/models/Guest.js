'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * Guest = الضيف.
 * يحمل qrToken فريدًا (هوية الدعوة) وحالة الإرسال وحالة الحضور.
 * الفهارس مُصمّمة لتسريع المسح والاستعلامات التحليلية.
 */
const GuestSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },

    // معرّف الدعوة / محتوى الـ QR — فريد وغير قابل للتخمين
    qrToken: { type: String, required: true, unique: true, index: true },
    inviteImageUrl: { type: String },

    // حالة الإرسال
    delivery: {
      status: { type: String, enum: ['pending', 'sent', 'delivered', 'failed'], default: 'pending' },
      channel: { type: String, enum: ['whatsapp', 'email'] },
      sentAt: Date,
      providerMessageId: String,
      error: String,
    },

    // حالة الحضور
    attendance: {
      status: { type: String, enum: ['absent', 'attended'], default: 'absent', index: true },
      checkedInAt: Date,
      checkedInBy: { type: Schema.Types.ObjectId, ref: 'Coordinator' },
      gate: String,
    },
  },
  { timestamps: true }
);

// فهارس للاستعلامات التحليلية والمسح السريع
GuestSchema.index({ eventId: 1, 'attendance.status': 1 });
GuestSchema.index({ eventId: 1, 'delivery.status': 1 });
GuestSchema.index({ eventId: 1, name: 1 });

module.exports = mongoose.model('Guest', GuestSchema);
