'use strict';

const ApiError = require('../utils/ApiError');
const { verifyJwt } = require('../utils/token');

/**
 * يستخرج ويتحقق من توكن JWT من رأس Authorization.
 * يضع req.auth = { sub, role, eventId? }
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('رمز الدخول مفقود'));
  }

  try {
    req.auth = verifyJwt(token);
    return next();
  } catch (err) {
    return next(ApiError.unauthorized('رمز الدخول غير صالح أو منتهٍ'));
  }
}

/**
 * يقيّد الوصول على أدوار محددة.
 */
function requireRole(...roles) {
  return function roleGuard(req, res, next) {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return next(ApiError.forbidden('ليس لديك صلاحية لهذا الإجراء'));
    }
    return next();
  };
}

module.exports = { authenticate, requireRole };
