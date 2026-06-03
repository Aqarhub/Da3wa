'use strict';

const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { scanLimiter } = require('../middleware/rateLimiters');
const ctrl = require('../controllers/scan.controller');

router.use(authenticate, requireRole('coordinator'));

router.post('/', scanLimiter, ctrl.scan);
router.post('/undo', scanLimiter, ctrl.undoScan);

module.exports = router;
