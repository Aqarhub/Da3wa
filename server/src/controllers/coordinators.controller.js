'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Coordinator } = require('../models');
const { getOwnedEventOr404 } = require('./events.controller');
const { isPhone, normalizePhone } = require('../utils/validate');

/**
 * POST /api/events/:id/coordinators
 * يضيف منسّقًا (أو عدة منسّقين) بمجرّد إدخال أرقام الجوال.
 * body: { phones: ["+9665..", ..] }  أو  { phone, name?, gate? }
 */
const addCoordinators = asyncHandler(async (req, res) => {
  const event = await getOwnedEventOr404(req.params.id, req.auth.sub);

  let entries = [];
  if (Array.isArray(req.body.phones)) {
    entries = req.body.phones.map((p) => ({ phone: p }));
  } else if (req.body.phone) {
    entries = [{ phone: req.body.phone, name: req.body.name, gate: req.body.gate }];
  } else {
    throw ApiError.badRequest('أرسل "phone" أو مصفوفة "phones"');
  }

  const added = [];
  const skipped = [];
  for (const e of entries) {
    const phone = normalizePhone(e.phone);
    if (!isPhone(phone)) {
      skipped.push({ phone: e.phone, reason: 'رقم غير صالح' });
      continue;
    }
    try {
      const doc = await Coordinator.findOneAndUpdate(
        { eventId: event._id, phone },
        { $setOnInsert: { eventId: event._id, phone, name: e.name, gate: e.gate, isActive: true } },
        { new: true, upsert: true }
      );
      added.push({ id: doc._id, phone: doc.phone, gate: doc.gate });
    } catch (err) {
      skipped.push({ phone, reason: 'تعذّرت الإضافة' });
    }
  }

  res.status(201).json({ added, skipped });
});

/**
 * GET /api/events/:id/coordinators — قائمة منسّقي الفعالية.
 */
const listCoordinators = asyncHandler(async (req, res) => {
  await getOwnedEventOr404(req.params.id, req.auth.sub);
  const coordinators = await Coordinator.find({ eventId: req.params.id })
    .select('phone name gate isActive scanCount lastSeenAt')
    .lean();
  res.json({ coordinators });
});

/**
 * DELETE /api/events/:id/coordinators/:coordinatorId — إزالة منسّق.
 */
const removeCoordinator = asyncHandler(async (req, res) => {
  await getOwnedEventOr404(req.params.id, req.auth.sub);
  const deleted = await Coordinator.findOneAndDelete({
    _id: req.params.coordinatorId,
    eventId: req.params.id,
  });
  if (!deleted) throw ApiError.notFound('المنسّق غير موجود');
  res.json({ message: 'تم حذف المنسّق' });
});

module.exports = { addCoordinators, listCoordinators, removeCoordinator };
