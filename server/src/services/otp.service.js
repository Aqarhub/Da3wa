'use strict';

const { OtpToken } = require('../models');
const { generateOtpCode, hashOtp } = require('../utils/token');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const messaging = require('./messaging');

const MAX_ATTEMPTS = 5;

/**
 * ينشئ رمز OTP لرقم جوال، يخزّنه مُجزّأً، ويرسله عبر قناة الرسائل.
 * يُلغي أي رموز سابقة غير مستهلكة لنفس الرقم.
 * @returns {{ devCode?: string }}
 */
async function requestOtp(phone) {
  await OtpToken.deleteMany({ phone, consumed: false });

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + env.otpTtlSeconds * 1000);

  await OtpToken.create({
    phone,
    codeHash: hashOtp(code),
    expiresAt,
  });

  await messaging.sendOtp(phone, code);

  // في التطوير فقط نُرجِع الرمز لتسهيل الاختبار
  return env.otpDebugReturn ? { devCode: code } : {};
}

/**
 * يتحقق من رمز OTP لرقم جوال. يرمي خطأً عند الفشل.
 */
async function verifyOtp(phone, code) {
  const record = await OtpToken.findOne({ phone, consumed: false }).sort({ createdAt: -1 });

  if (!record) {
    throw ApiError.badRequest('لا يوجد رمز فعّال لهذا الرقم، اطلب رمزًا جديدًا');
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw ApiError.badRequest('انتهت صلاحية الرمز، اطلب رمزًا جديدًا');
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    throw ApiError.badRequest('تجاوزت عدد المحاولات، اطلب رمزًا جديدًا');
  }

  if (record.codeHash !== hashOtp(code)) {
    record.attempts += 1;
    await record.save();
    throw ApiError.badRequest('رمز غير صحيح');
  }

  record.consumed = true;
  await record.save();
  return true;
}

module.exports = { requestOtp, verifyOtp };
