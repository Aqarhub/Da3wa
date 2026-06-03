'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Event } = require('../models');
const { requireFields, assertEnum } = require('../utils/validate');

/**
 * يجلب فعالية ويتأكد أنها مملوكة للمستخدم الحالي.
 */
async function getOwnedEventOr404(eventId, ownerId) {
  const event = await Event.findOne({ _id: eventId, ownerId });
  if (!event) throw ApiError.notFound('الفعالية غير موجودة');
  return event;
}

/**
 * POST /api/events  — إنشاء فعالية (مسودة، الخطوة 1).
 */
const createEvent = asyncHandler(async (req, res) => {
  requireFields(req.body, ['title', 'type', 'deliveryChannel']);
  assertEnum(req.body.type, Event.EVENT_TYPES, 'type');
  assertEnum(req.body.deliveryChannel, Event.DELIVERY_CHANNELS, 'deliveryChannel');

  const event = await Event.create({
    ownerId: req.auth.sub,
    title: req.body.title,
    type: req.body.type,
    deliveryChannel: req.body.deliveryChannel,
    details: req.body.details || {},
    status: 'draft',
  });

  res.status(201).json({ event });
});

/**
 * GET /api/events — قائمة فعاليات المالك.
 */
const listEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({ ownerId: req.auth.sub })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ events });
});

/**
 * GET /api/events/:id — تفاصيل فعالية.
 */
const getEvent = asyncHandler(async (req, res) => {
  const event = await getOwnedEventOr404(req.params.id, req.auth.sub);
  res.json({ event });
});

/**
 * PATCH /api/events/:id — تحديث التصميم/التفاصيل/الحالة (الخطوات 2 و3).
 */
const updateEvent = asyncHandler(async (req, res) => {
  const event = await getOwnedEventOr404(req.params.id, req.auth.sub);

  const updatable = ['title', 'design', 'details', 'pricing'];
  for (const key of updatable) {
    if (req.body[key] !== undefined) event.set(key, req.body[key]);
  }

  if (req.body.status !== undefined) {
    assertEnum(req.body.status, Event.EVENT_STATUSES, 'status');
    event.status = req.body.status;
  }

  await event.save();
  res.json({ event });
});

/**
 * GET /api/events/:id/stats — الإحصائيات اللحظية (تُقرأ مباشرة من العدّادات).
 */
const getEventStats = asyncHandler(async (req, res) => {
  const event = await Event.findOne({ _id: req.params.id, ownerId: req.auth.sub })
    .select('stats status')
    .lean();
  if (!event) throw ApiError.notFound('الفعالية غير موجودة');
  res.json({ stats: event.stats, status: event.status });
});

module.exports = {
  getOwnedEventOr404,
  createEvent,
  listEvents,
  getEvent,
  updateEvent,
  getEventStats,
};
