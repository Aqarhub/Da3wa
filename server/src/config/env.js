'use strict';

const dotenv = require('dotenv');
dotenv.config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  port: parseInt(process.env.PORT || '4000', 10),
  corsOrigins: (process.env.CORS_ORIGINS || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  mongoUri: required('MONGO_URI', 'mongodb://127.0.0.1:27017/da3wa'),

  jwtSecret: required('JWT_SECRET', 'dev-insecure-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  otpTtlSeconds: parseInt(process.env.OTP_TTL_SECONDS || '300', 10),
  otpLength: parseInt(process.env.OTP_LENGTH || '4', 10),
  otpDebugReturn: (process.env.OTP_DEBUG_RETURN || 'false') === 'true',

  publicInviteBaseUrl: process.env.PUBLIC_INVITE_BASE_URL || 'http://localhost:3000/i',
};

module.exports = env;
