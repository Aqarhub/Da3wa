'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * User = صاحب الفعالية (Event Owner).
 * الدخول عبر رقم الجوال + OTP (بدون كلمة مرور).
 */
const UserSchema = new Schema(
  {
    phone: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },

    role: { type: String, enum: ['owner', 'admin'], default: 'owner' },

    // الباقة الحالية للمالك (تفاصيل التسعير على مستوى الفعالية)
    plan: { type: String, default: 'free' },

    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
