const express = require('express');
const dbHealthService = require('../services/dbHealthService');
const liveStateStore = require('../services/liveStateStore');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

router.get('/ready', (req, res) => {
  const snapshot = liveStateStore.getSnapshot();
  if (dbHealthService.connected) {
    return res.json({ status: 'ready', degradedMode: false, db: 'online' });
  }
  return res.status(503).json({
    status: 'degraded',
    degradedMode: true,
    db: 'offline',
    message: snapshot.dbMessage,
  });
});

module.exports = router;
