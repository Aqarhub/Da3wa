'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Guest, Event } = require('../models');

/**
 * GET /api/invite/:qrToken
 * بيانات صفحة الدعوة العامة للضيف (قراءة فقط، بدون مصادقة).
 */
const getInvite = asyncHandler(async (req, res) => {
  const guest = await Guest.findOne({ qrToken: req.params.qrToken })
    .select('name inviteImageUrl qrToken eventId attendance')
    .lean();
  if (!guest) throw ApiError.notFound('الدعوة غير موجودة');

  const event = await Event.findById(guest.eventId)
    .select('title type details design.imageUrl')
    .lean();
  if (!event) throw ApiError.notFound('الفعالية غير موجودة');

  res.json({
    guest: {
      name: guest.name,
      qrToken: guest.qrToken,
      inviteImageUrl: guest.inviteImageUrl,
      attended: guest.attendance.status === 'attended',
    },
    event: {
      title: event.title,
      type: event.type,
      details: event.details,
      designImageUrl: event.design && event.design.imageUrl,
    },
  });
});

module.exports = { getInvite };
