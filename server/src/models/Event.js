'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const EVENT_TYPES = ['wedding', 'graduation', 'grand_opening', 'conference', 'business_dinner'];
const DELIVERY_CHANNELS = ['whatsapp', 'email'];
const EVENT_STATUSES = ['draft', 'paid', 'sending', 'active', 'closed'];

/**
 * Event = الفعالية.
 * تحمل عدّادات لحظية (stats) بشكل denormalized لتسريع لوحة الإحصائيات
 * دون الحاجة لـ aggregation ثقيل في كل قراءة.
 */
const EventSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: EVENT_TYPES, required: true },
    deliveryChannel: { type: String, enum: DELIVERY_CHANNELS, required: true },

    // التصميم
    design: {
      source: { type: String, enum: ['custom', 'template'], default: 'template' },
      templateId: { type: String },
      imageUrl: { type: String },
      namePosition: {
        x: Number,
        y: Number,
        fontSize: Number,
        color: String,
        align: { type: String, enum: ['right', 'center', 'left'], default: 'center' },
      },
      qrPosition: { x: Number, y: Number, size: Number },
    },

    // تفاصيل تُعرض للضيف
    details: {
      datetime: { type: Date },
      venueName: String,
      address: String,
      location: { lat: Number, lng: Number },
      notes: String,
    },

    // عدّادات لحظية (denormalized)
    stats: {
      totalGuests: { type: Number, default: 0 },
      attended: { type: Number, default: 0 },
      absent: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
    },

    status: { type: String, enum: EVENT_STATUSES, default: 'draft', index: true },

    // التسعير/الدفع
    pricing: {
      tier: String,
      unitPrice: Number,
      guestCount: Number,
      totalAmount: Number,
      currency: { type: String, default: 'SAR' },
      paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
      paymentRef: String,
    },
  },
  { timestamps: true }
);

EventSchema.index({ ownerId: 1, createdAt: -1 });
EventSchema.index({ status: 1, 'details.datetime': 1 });

EventSchema.statics.EVENT_TYPES = EVENT_TYPES;
EventSchema.statics.DELIVERY_CHANNELS = DELIVERY_CHANNELS;
EventSchema.statics.EVENT_STATUSES = EVENT_STATUSES;

module.exports = mongoose.model('Event', EventSchema);
