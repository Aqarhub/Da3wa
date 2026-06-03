'use strict';

const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const events = require('../controllers/events.controller');
const guests = require('../controllers/guests.controller');
const coordinators = require('../controllers/coordinators.controller');

// كل مسارات الفعاليات تخص صاحب الفعالية (owner)
router.use(authenticate, requireRole('owner', 'admin'));

// الفعاليات
router.post('/', events.createEvent);
router.get('/', events.listEvents);
router.get('/:id', events.getEvent);
router.patch('/:id', events.updateEvent);
router.get('/:id/stats', events.getEventStats);

// الضيوف (ضمن فعالية)
router.post('/:id/guests/import', guests.importGuests);
router.get('/:id/guests', guests.listGuests);

// المنسّقون (ضمن فعالية)
router.post('/:id/coordinators', coordinators.addCoordinators);
router.get('/:id/coordinators', coordinators.listCoordinators);
router.delete('/:id/coordinators/:coordinatorId', coordinators.removeCoordinator);

module.exports = router;
