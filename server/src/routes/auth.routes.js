'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { authLimiter } = require('../middleware/rateLimiters');

router.post('/request-otp', authLimiter, ctrl.requestOtp);
router.post('/verify-otp', authLimiter, ctrl.verifyOtpOwner);
router.post('/coordinator/verify-otp', authLimiter, ctrl.verifyOtpCoordinator);

module.exports = router;
