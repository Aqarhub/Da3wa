'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * OtpToken = رمز التحقق المؤقت المرتبط برقم جوال.
 * يُخزَّن مُجزّأً (hash) وله انتهاء صلاحية يُحذف تلقائيًا عبر TTL index.
 */
const OtpTokenSchema = new Schema(
  {
    phone: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    consumed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// حذف تلقائي عند انتهاء الصلاحية
OtpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OtpToken', OtpTokenSchema);
