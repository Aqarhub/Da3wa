'use strict';

const ApiError = require('../utils/ApiError');
const env = require('../config/env');

// 404 لأي مسار غير معروف
function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`المسار غير موجود: ${req.method} ${req.originalUrl}`));
}

// معالج الأخطاء الموحّد
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'خطأ داخلي في الخادم';
  let details = err.details;

  // أخطاء mongoose الشائعة
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'بيانات غير صالحة';
    details = Object.values(err.errors).map((e) => e.message);
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'معرّف غير صالح';
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'قيمة مكرّرة';
    details = err.keyValue;
  }

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  res.status(statusCode).json({
    error: {
      message,
      ...(details ? { details } : {}),
      ...(env.isProd ? {} : { stack: err.stack }),
    },
  });
}

module.exports = { notFoundHandler, errorHandler };
