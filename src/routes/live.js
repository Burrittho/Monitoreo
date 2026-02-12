const express = require('express');
const controller = require('../controllers/liveController');
const validateQuery = require('../middlewares/validate');
const createRateLimit = require('../middlewares/rateLimit');

const router = express.Router();
const readLimiter = createRateLimit({ windowMs: 60000, max: 240 });

router.get('/live', readLimiter, controller.getLive);
router.get('/live/stream', readLimiter, controller.streamLive);
router.get('/logs', readLimiter, validateQuery, controller.getLogs);
router.get('/downtime', readLimiter, validateQuery, controller.getDowntime);
router.get('/summary', readLimiter, validateQuery, controller.getSummary);

module.exports = router;
