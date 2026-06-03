'use strict';

const { verifyJwt } = require('../utils/token');

let ioRef = null;

/**
 * يهيّئ Socket.io: المصادقة عبر JWT والانضمام لغرف الفعاليات.
 * كل فعالية لها غرفة باسم event:<eventId> يبثّ إليها تحديثات الحضور.
 */
function initSockets(io) {
  ioRef = io;

  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error('unauthorized'));
    try {
      socket.auth = verifyJwt(token);
      return next();
    } catch (err) {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join:event', ({ eventId } = {}) => {
      if (eventId) socket.join(roomFor(eventId));
    });
    socket.on('leave:event', ({ eventId } = {}) => {
      if (eventId) socket.leave(roomFor(eventId));
    });
  });
}

function roomFor(eventId) {
  return `event:${eventId}`;
}

/**
 * يبثّ حدثًا لكل المنضمّين لغرفة فعالية.
 */
function emitToEvent(eventId, eventName, payload) {
  if (!ioRef) return;
  ioRef.to(roomFor(eventId)).emit(eventName, payload);
}

module.exports = { initSockets, emitToEvent, roomFor };
