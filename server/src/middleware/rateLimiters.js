'use strict';

const rateLimit = require('express-rate-limit');

const json = (message) => ({ error: { message } });

// محدّد عام لكل الـ API
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: json('عدد كبير من الطلبات، حاول لاحقًا'),
});

// محدّد صارم لنقاط المصادقة (طلب/تحقق OTP)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: json('محاولات كثيرة، انتظر دقيقة ثم أعد المحاولة'),
});

// محدّد لنقطة المسح (حماية من إساءة الاستخدام مع السماح بمعدل عالٍ للتشغيل الميداني)
const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: json('معدل مسح مرتفع جدًا'),
});

module.exports = { apiLimiter, authLimiter, scanLimiter };
