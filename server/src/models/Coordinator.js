'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * Coordinator = منسّق البوابة.
 * مرتبط بفعالية واحدة، يسجّل الدخول برقم جواله فقط.
 */
const CoordinatorSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    phone: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    gate: { type: String, trim: true },

    isActive: { type: Boolean, default: true },
    scanCount: { type: Number, default: 0 },
    lastSeenAt: { type: Date },
  },
  { timestamps: true }
);

// منسّق واحد لكل (فعالية + رقم جوال)
CoordinatorSchema.index({ eventId: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('Coordinator', CoordinatorSchema);
