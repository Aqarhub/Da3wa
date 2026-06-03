'use strict';

const ApiError = require('./ApiError');

/**
 * أدوات تحقق خفيفة من المدخلات (بدون اعتماديات خارجية).
 */

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

// رقم جوال بصيغة دولية مبسّطة: + اختيارية ثم 7-15 رقمًا
function isPhone(v) {
  return typeof v === 'string' && /^\+?\d{7,15}$/.test(v.trim());
}

function normalizePhone(v) {
  return String(v || '').trim().replace(/\s+/g, '');
}

function isEmail(v) {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/**
 * يتحقق أن الحقول المطلوبة موجودة وغير فارغة، وإلا يرمي 400.
 */
function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length) {
    throw ApiError.badRequest('حقول مطلوبة ناقصة', { missing });
  }
}

function assertEnum(value, allowed, fieldName) {
  if (!allowed.includes(value)) {
    throw ApiError.badRequest(`قيمة غير صالحة للحقل ${fieldName}`, { allowed });
  }
}

module.exports = {
  isNonEmptyString,
  isPhone,
  normalizePhone,
  isEmail,
  requireFields,
  assertEnum,
};
