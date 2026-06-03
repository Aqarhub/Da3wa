'use strict';

/**
 * خطأ تشغيلي معروف يحمل رمز حالة HTTP ورسالة مناسبة للعميل.
 */
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = 'طلب غير صالح', details) {
    return new ApiError(400, msg, details);
  }
  static unauthorized(msg = 'غير مصرّح') {
    return new ApiError(401, msg);
  }
  static forbidden(msg = 'ممنوع') {
    return new ApiError(403, msg);
  }
  static notFound(msg = 'غير موجود') {
    return new ApiError(404, msg);
  }
  static conflict(msg = 'تعارض') {
    return new ApiError(409, msg);
  }
}

module.exports = ApiError;
