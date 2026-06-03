'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const env = require('./config/env');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimiters');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  // خلف Cloudflare/Proxy — لقراءة IP الحقيقي ولـ rate-limit
  app.set('trust proxy', 1);

  // الأمان
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins.includes('*') ? true : env.corsOrigins,
      credentials: true,
    })
  );

  // التحليل والتسجيل
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (!env.isProd) app.use(morgan('dev'));

  // محدّد المعدّل العام
  app.use('/api', apiLimiter);

  // المسارات
  app.use('/api', routes);

  // 404 + معالج الأخطاء (آخر شيء)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
