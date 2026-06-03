'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Event, Guest } = require('../models');
const { generateQrToken } = require('../utils/token');
const { getOwnedEventOr404 } = require('./events.controller');
const { isNonEmptyString, normalizePhone } = require('../utils/validate');

/**
 * POST /api/events/:id/guests/import
 * يستورد قائمة ضيوف (مصفوفة JSON الآن؛ يُضاف رفع CSV/Excel في مرحلة لاحقة).
 * body: { guests: [{ name, phone?, email? }, ...] }
 */
const importGuests = asyncHandler(async (req, res) => {
  const event = await getOwnedEventOr404(req.params.id, req.auth.sub);

  const rows = Array.isArray(req.body.guests) ? req.body.guests : null;
  if (!rows || rows.length === 0) {
    throw ApiError.badRequest('أرسل مصفوفة "guests" تحتوي على ضيف واحد على الأقل');
  }

  const docs = [];
  const skipped = [];
  rows.forEach((row, i) => {
    if (!isNonEmptyString(row.name)) {
      skipped.push({ index: i, reason: 'الاسم مطلوب' });
      return;
    }
    docs.push({
      eventId: event._id,
      name: row.name.trim(),
      phone: row.phone ? normalizePhone(row.phone) : undefined,
      email: row.email ? String(row.email).trim().toLowerCase() : undefined,
      qrToken: generateQrToken(),
      delivery: { channel: event.deliveryChannel, status: 'pending' },
    });
  });

  if (docs.length === 0) {
    throw ApiError.badRequest('لا يوجد ضيوف صالحون للاستيراد', { skipped });
  }

  const inserted = await Guest.insertMany(docs, { ordered: false });

  // تحديث العدّادات اللحظية
  await Event.updateOne(
    { _id: event._id },
    { $inc: { 'stats.totalGuests': inserted.length, 'stats.absent': inserted.length } }
  );

  res.status(201).json({
    importedCount: inserted.length,
    skippedCount: skipped.length,
    skipped,
  });
});

/**
 * GET /api/events/:id/guests
 * قائمة الضيوف مع تصفية وترقيم.
 * query: ?status=attended|absent &delivery=sent|pending &search= &page= &limit=
 */
const listGuests = asyncHandler(async (req, res) => {
  await getOwnedEventOr404(req.params.id, req.auth.sub);

  const filter = { eventId: req.params.id };
  if (req.query.status) filter['attendance.status'] = req.query.status;
  if (req.query.delivery) filter['delivery.status'] = req.query.delivery;
  if (req.query.search) filter.name = { $regex: String(req.query.search).trim(), $options: 'i' };

  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));

  const [guests, total] = await Promise.all([
    Guest.find(filter)
      .select('name phone email attendance delivery qrToken createdAt')
      .sort({ 'attendance.checkedInAt': -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Guest.countDocuments(filter),
  ]);

  res.json({ guests, page, limit, total, pages: Math.ceil(total / limit) });
});

module.exports = { importGuests, listGuests };
