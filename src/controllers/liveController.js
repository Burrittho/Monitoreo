const liveStateStore = require('../services/liveStateStore');
const dbHealthService = require('../services/dbHealthService');
const repository = require('../repositories/liveRepository');

async function getLive(req, res) {
  const snapshot = liveStateStore.getSnapshot();
  res.setHeader('Cache-Control', 'no-store');
  res.json(snapshot);
}

function streamLive(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event, payload) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  send('snapshot', liveStateStore.getSnapshot());

  const onLive = ({ group, host }) => send('live-update', { group, host, degradedMode: !dbHealthService.connected });
  const onDb = (payload) => send('db-status', payload);

  liveStateStore.on('live-update', onLive);
  liveStateStore.on('db-status', onDb);

  const keepAlive = setInterval(() => res.write(':keepalive\n\n'), 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    liveStateStore.off('live-update', onLive);
    liveStateStore.off('db-status', onDb);
  });
}

async function getLogs(req, res, next) {
  try {
    const payload = await repository.getPaginatedLogs(req.validated);
    res.setHeader('Cache-Control', 'private, max-age=15');
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

async function getDowntime(req, res, next) {
  try {
    const payload = await repository.getDowntimeAggregates(req.validated);
    res.setHeader('Cache-Control', 'private, max-age=30');
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

async function getSummary(req, res, next) {
  try {
    const payload = await repository.getSummary(req.validated);
    res.setHeader('Cache-Control', 'private, max-age=30');
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getLive,
  streamLive,
  getLogs,
  getDowntime,
  getSummary,
};
