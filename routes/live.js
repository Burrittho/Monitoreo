const express = require('express');
const router = express.Router();
const liveStateStore = require('../services/liveStateStore');

router.get('/live', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(liveStateStore.snapshot());
});

router.get('/live/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const write = (event, payload) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  write('snapshot', liveStateStore.snapshot());

  const onUpdate = (payload) => write('update', payload);
  liveStateStore.on('update', onUpdate);

  const keepAlive = setInterval(() => {
    res.write(':keepalive\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    liveStateStore.off('update', onUpdate);
  });
});

module.exports = router;
