'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Event, Guest, Coordinator } = require('../models');
const { requireFields } = require('../utils/validate');
const { emitToEvent } = require('../sockets');

/**
 * يتأكد أن المنسّق الحالي مسند لهذه الفعالية، ويعيد وثيقته.
 */
async function getCoordinatorOr403(eventId, phone) {
  const coordinator = await Coordinator.findOne({ eventId, phone, isActive: true });
  if (!coordinator) throw ApiError.forbidden('لست منسّقًا في هذه الفعالية');
  return coordinator;
}

/**
 * POST /api/scan
 * تسجيل حضور بـ qrToken بشكل ذري لمنع التكرار حتى مع عدة بوابات.
 * body: { eventId, qrToken, gate? }
 */
const scan = asyncHandler(async (req, res) => {
  requireFields(req.body, ['eventId', 'qrToken']);
  const { eventId, qrToken, gate } = req.body;

  const coordinator = await getCoordinatorOr403(eventId, req.auth.sub);

  // تحديث ذري: يُسجّل الحضور فقط إذا كان الضيف "غائبًا" — هذا يمنع التكرار.
  const guest = await Guest.findOneAndUpdate(
    { eventId, qrToken, 'attendance.status': 'absent' },
    {
      $set: {
        'attendance.status': 'attended',
        'attendance.checkedInAt': new Date(),
        'attendance.checkedInBy': coordinator._id,
        'attendance.gate': gate || coordinator.gate,
      },
    },
    { new: true }
  );

  if (!guest) {
    // التمييز بين: QR غير صالح، أو حضر مسبقًا
    const existing = await Guest.findOne({ eventId, qrToken }).select('name attendance').lean();
    if (!existing) {
      return res.status(404).json({ result: 'invalid', message: 'رمز غير صالح لهذه الفعالية' });
    }
    return res.status(409).json({
      result: 'already_attended',
      message: 'تم تسجيل حضور هذا الضيف مسبقًا',
      guest: {
        id: existing._id,
        name: existing.name,
        checkedInAt: existing.attendance.checkedInAt,
        gate: existing.attendance.gate,
      },
    });
  }

  // تحديث العدّادات اللحظية + عدّاد المنسّق
  const [event] = await Promise.all([
    Event.findByIdAndUpdate(
      eventId,
      { $inc: { 'stats.attended': 1, 'stats.absent': -1 } },
      { new: true, select: 'stats' }
    ),
    Coordinator.updateOne(
      { _id: coordinator._id },
      { $inc: { scanCount: 1 }, $set: { lastSeenAt: new Date() } }
    ),
  ]);

  // البثّ اللحظي لكل المنسّقين واللوحة
  emitToEvent(eventId, 'scan:new', {
    guestId: guest._id,
    guestName: guest.name,
    status: 'attended',
    gate: guest.attendance.gate,
    at: guest.attendance.checkedInAt,
  });
  emitToEvent(eventId, 'stats:update', event.stats);

  res.json({
    result: 'success',
    guest: { id: guest._id, name: guest.name, checkedInAt: guest.attendance.checkedInAt },
    stats: event.stats,
  });
});

/**
 * POST /api/scan/undo
 * تراجع عن آخر تسجيل حضور لضيف (يعيده إلى "غائب").
 * body: { eventId, guestId }
 */
const undoScan = asyncHandler(async (req, res) => {
  requireFields(req.body, ['eventId', 'guestId']);
  const { eventId, guestId } = req.body;

  await getCoordinatorOr403(eventId, req.auth.sub);

  const guest = await Guest.findOneAndUpdate(
    { _id: guestId, eventId, 'attendance.status': 'attended' },
    {
      $set: { 'attendance.status': 'absent' },
      $unset: { 'attendance.checkedInAt': '', 'attendance.checkedInBy': '', 'attendance.gate': '' },
    },
    { new: true }
  );

  if (!guest) {
    throw ApiError.badRequest('لا يوجد حضور مسجّل لهذا الضيف للتراجع عنه');
  }

  const event = await Event.findByIdAndUpdate(
    eventId,
    { $inc: { 'stats.attended': -1, 'stats.absent': 1 } },
    { new: true, select: 'stats' }
  );

  emitToEvent(eventId, 'scan:undo', { guestId: guest._id, guestName: guest.name });
  emitToEvent(eventId, 'stats:update', event.stats);

  res.json({ result: 'undone', guest: { id: guest._id, name: guest.name }, stats: event.stats });
});

module.exports = { scan, undoScan };
