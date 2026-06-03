'use strict';
/*
 * اختبار تكاملي للدخان (smoke test): يشغّل الخادم على MongoDB في الذاكرة
 * ويتحقق من التدفّق الأساسي (مصادقة → فعالية → ضيوف → منسّق → مسح/منع تكرار → دعوة).
 * التشغيل:  npm run smoke
 * يتطلب توفّر تنزيل ثنائي MongoDB (mongodb-memory-server) أو متغيّر MONGOMS_SYSTEM_BINARY.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('da3wa_test');
  process.env.JWT_SECRET = 'test-secret';
  process.env.OTP_DEBUG_RETURN = 'true';
  process.env.PORT = '4111';
  process.env.NODE_ENV = 'test';

  const http = require('http');
  const { Server } = require('socket.io');
  const { connectDB } = require('./src/config/db');
  const { createApp } = require('./src/app');
  const { initSockets } = require('./src/sockets');

  await connectDB();
  const app = createApp();
  const server = http.createServer(app);
  initSockets(new Server(server));
  await new Promise((r) => server.listen(4111, r));

  const base = 'http://127.0.0.1:4111/api';
  const call = async (method, path, body, token) => {
    const res = await fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  };

  const results = [];
  const check = (name, cond, extra = '') => {
    results.push({ name, pass: !!cond, extra });
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
  };

  // 1) health
  let r = await call('GET', '/health');
  check('health', r.status === 200 && r.body.status === 'ok');

  // 2) owner login
  const ownerPhone = '+966500000001';
  r = await call('POST', '/auth/request-otp', { phone: ownerPhone });
  check('owner request-otp', r.status === 200 && r.body.devCode, 'code=' + r.body.devCode);
  const ownerCode = r.body.devCode;
  r = await call('POST', '/auth/verify-otp', { phone: ownerPhone, code: ownerCode });
  check('owner verify-otp', r.status === 200 && r.body.token);
  const ownerToken = r.body.token;

  // 3) create event
  r = await call('POST', '/events', { title: 'زواج', type: 'wedding', deliveryChannel: 'whatsapp' }, ownerToken);
  check('create event', r.status === 201 && r.body.event._id);
  const eventId = r.body.event._id;

  // 4) import guests
  r = await call('POST', `/events/${eventId}/guests/import`, {
    guests: [{ name: 'أحمد', phone: '+966500000010' }, { name: 'سارة' }, { name: '' }],
  }, ownerToken);
  check('import guests (2 ok, 1 skipped)', r.status === 201 && r.body.importedCount === 2 && r.body.skippedCount === 1);

  // 5) stats reflect totals
  r = await call('GET', `/events/${eventId}/stats`, null, ownerToken);
  check('stats after import', r.body.stats.totalGuests === 2 && r.body.stats.absent === 2 && r.body.stats.attended === 0);

  // get a guest qrToken
  r = await call('GET', `/events/${eventId}/guests`, null, ownerToken);
  const guest = r.body.guests.find((g) => g.name === 'أحمد');
  check('list guests has qrToken', guest && guest.qrToken);
  const qrToken = guest.qrToken;

  // 6) add coordinator
  const coordPhone = '+966500000099';
  r = await call('POST', `/events/${eventId}/coordinators`, { phones: [coordPhone, 'bad'] }, ownerToken);
  check('add coordinators (1 ok, 1 bad)', r.status === 201 && r.body.added.length === 1 && r.body.skipped.length === 1);

  // 7) coordinator login
  r = await call('POST', '/auth/request-otp', { phone: coordPhone });
  const coordCode = r.body.devCode;
  r = await call('POST', '/auth/coordinator/verify-otp', { phone: coordPhone, code: coordCode });
  check('coordinator login', r.status === 200 && r.body.token && r.body.events.length === 1);
  const coordToken = r.body.token;

  // 8) first scan -> success
  r = await call('POST', '/scan', { eventId, qrToken }, coordToken);
  check('scan #1 success', r.status === 200 && r.body.result === 'success' && r.body.stats.attended === 1);

  // 9) duplicate scan -> already_attended (dedup)
  r = await call('POST', '/scan', { eventId, qrToken }, coordToken);
  check('scan #2 duplicate blocked', r.status === 409 && r.body.result === 'already_attended');

  // 10) invalid qr
  r = await call('POST', '/scan', { eventId, qrToken: 'nonexistent' }, coordToken);
  check('scan invalid token', r.status === 404 && r.body.result === 'invalid');

  // 11) owner cannot scan (role guard)
  r = await call('POST', '/scan', { eventId, qrToken }, ownerToken);
  check('owner forbidden from scan', r.status === 403);

  // 12) undo
  const guestId = guest._id;
  r = await call('POST', '/scan/undo', { eventId, guestId }, coordToken);
  check('undo scan', r.status === 200 && r.body.result === 'undone' && r.body.stats.attended === 0);

  // 13) public invite page data
  r = await call('GET', `/invite/${qrToken}`);
  check('public invite data', r.status === 200 && r.body.guest.name === 'أحمد' && r.body.event.title === 'زواج');

  // 14) auth required on protected route
  r = await call('GET', '/events');
  check('unauthorized blocked', r.status === 401);

  const failed = results.filter((x) => !x.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

  server.close();
  await mongod.stop();
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error('E2E ERROR:', e);
  process.exit(1);
});
