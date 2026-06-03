'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/invite.controller');

// عامّة، بدون مصادقة (الضيف يفتح الرابط مباشرة)
router.get('/:qrToken', ctrl.getInvite);

module.exports = router;
