'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { User, Coordinator } = require('../models');
const { signJwt } = require('../utils/token');
const { requireFields, isPhone, normalizePhone } = require('../utils/validate');
const otpService = require('../services/otp.service');

/**
 * POST /api/auth/request-otp
 * يطلب رمز OTP لرقم جوال (للمالك أو المنسّق).
 */
const requestOtp = asyncHandler(async (req, res) => {
  requireFields(req.body, ['phone']);
  const phone = normalizePhone(req.body.phone);
  if (!isPhone(phone)) throw ApiError.badRequest('رقم الجوال غير صالح');

  const result = await otpService.requestOtp(phone);
  res.json({ message: 'تم إرسال رمز التحقق', ...result });
});

/**
 * POST /api/auth/verify-otp
 * يتحقق من الرمز ويسجّل دخول صاحب الفعالية (Owner)، مع إنشاء حسابه إن لم يوجد.
 */
const verifyOtpOwner = asyncHandler(async (req, res) => {
  requireFields(req.body, ['phone', 'code']);
  const phone = normalizePhone(req.body.phone);
  if (!isPhone(phone)) throw ApiError.badRequest('رقم الجوال غير صالح');

  await otpService.verifyOtp(phone, String(req.body.code));

  const user = await User.findOneAndUpdate(
    { phone },
    { $set: { lastLoginAt: new Date() }, $setOnInsert: { phone, role: 'owner' } },
    { new: true, upsert: true }
  );

  const token = signJwt({ sub: user._id.toString(), role: user.role });
  res.json({
    token,
    user: { id: user._id, phone: user.phone, name: user.name, role: user.role },
  });
});

/**
 * POST /api/auth/coordinator/verify-otp
 * يتحقق من الرمز ويسجّل دخول منسّق البوابة.
 * يجب أن يكون الرقم مُضافًا كمنسّق في فعالية واحدة على الأقل.
 */
const verifyOtpCoordinator = asyncHandler(async (req, res) => {
  requireFields(req.body, ['phone', 'code']);
  const phone = normalizePhone(req.body.phone);
  if (!isPhone(phone)) throw ApiError.badRequest('رقم الجوال غير صالح');

  const assignments = await Coordinator.find({ phone, isActive: true }).select('eventId gate');
  if (assignments.length === 0) {
    throw ApiError.forbidden('هذا الرقم غير مُضاف كمنسّق في أي فعالية');
  }

  await otpService.verifyOtp(phone, String(req.body.code));

  const token = signJwt({ sub: phone, role: 'coordinator' });
  res.json({
    token,
    coordinator: { phone },
    events: assignments.map((a) => ({ eventId: a.eventId, gate: a.gate })),
  });
});

module.exports = { requestOtp, verifyOtpOwner, verifyOtpCoordinator };
