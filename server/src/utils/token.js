'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * معرّف فريد غير قابل للتخمين لرمز الدعوة (qrToken).
 */
function generateQrToken() {
  // 32 بايت عشوائية بترميز base64url آمن للروابط
  return crypto.randomBytes(24).toString('base64url');
}

/**
 * توليد رمز OTP رقمي بالطول المحدّد.
 */
function generateOtpCode(length = env.otpLength) {
  const max = 10 ** length;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(length, '0');
}

/**
 * تجزئة (hash) رمز الـ OTP قبل التخزين.
 */
function hashOtp(code) {
  return crypto.createHmac('sha256', env.jwtSecret).update(String(code)).digest('hex');
}

/**
 * إصدار توكن JWT للمستخدم/المنسّق.
 * payload يحمل { sub, role, eventId? }
 */
function signJwt(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function verifyJwt(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = {
  generateQrToken,
  generateOtpCode,
  hashOtp,
  signJwt,
  verifyJwt,
};
