'use strict';

const router = require('express').Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'da3wa-server', time: new Date().toISOString() });
});

router.use('/auth', require('./auth.routes'));
router.use('/events', require('./events.routes'));
router.use('/scan', require('./scan.routes'));
router.use('/invite', require('./invite.routes'));

module.exports = router;
