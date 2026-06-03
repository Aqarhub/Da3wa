'use strict';

/**
 * طبقة الرسائل المجرّدة.
 * توفّر واجهة موحّدة فوق مزوّدي الإرسال (واتساب/SMS عبر Unifonic، والإيميل).
 * في المرحلة الحالية كل المزوّدين عبارة عن Stubs تُسجّل في الـ console،
 * ويُستبدَل التنفيذ الفعلي في مرحلة الإرسال (Phase 3).
 */

const env = require('../../config/env');

/**
 * @typedef {Object} MessagingProvider
 * @property {(to: string, mediaUrl: string, caption: string) => Promise<{messageId: string, status: string}>} sendInvite
 * @property {(to: string, code: string) => Promise<{messageId: string, status: string}>} sendOtp
 */

/** @implements {MessagingProvider} */
const whatsappProvider = {
  async sendInvite(to, mediaUrl, caption) {
    // TODO(Phase 3): تكامل Unifonic WhatsApp
    log('whatsapp:invite', { to, mediaUrl, caption });
    return { messageId: stubId(), status: 'queued' };
  },
  async sendOtp(to, code) {
    log('whatsapp:otp', { to, code });
    return { messageId: stubId(), status: 'queued' };
  },
};

/** @implements {MessagingProvider} */
const emailProvider = {
  async sendInvite(to, mediaUrl, caption) {
    // TODO(Phase 3): تكامل nodemailer/SendGrid
    log('email:invite', { to, mediaUrl, caption });
    return { messageId: stubId(), status: 'queued' };
  },
  async sendOtp(to, code) {
    log('email:otp', { to, code });
    return { messageId: stubId(), status: 'queued' };
  },
};

function providerFor(channel) {
  return channel === 'email' ? emailProvider : whatsappProvider;
}

/**
 * إرسال رمز OTP — افتراضيًا عبر قناة الرسائل (واتساب/SMS).
 */
async function sendOtp(phone, code) {
  return whatsappProvider.sendOtp(phone, code);
}

function stubId() {
  return 'stub_' + Math.random().toString(36).slice(2, 10);
}

function log(kind, payload) {
  if (!env.isProd) {
    // eslint-disable-next-line no-console
    console.log(`[messaging:${kind}]`, JSON.stringify(payload));
  }
}

module.exports = {
  whatsappProvider,
  emailProvider,
  providerFor,
  sendOtp,
};
