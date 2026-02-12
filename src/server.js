const env = require('./config/env');
const logger = require('./config/logger');
const { buildApp } = require('./app');
const dbHealthService = require('./services/dbHealthService');
const { createPingMonitor } = require('./services/pingMonitorFactory');
const pool = require('../config/db');
const { startWorker } = require('../controllers/mailcontroller');

const branchesMonitor = createPingMonitor({
  group: 'branches',
  inventoryTable: 'ips',
  logsTable: 'ping_logs',
  intervalMs: 1000,
});
const dvrMonitor = createPingMonitor({
  group: 'dvr',
  inventoryTable: 'ips_dvr',
  logsTable: 'ping_logs_dvr',
  intervalMs: 1000,
});
const serversMonitor = createPingMonitor({
  group: 'servers',
  inventoryTable: 'ips_server',
  logsTable: 'ping_logs_server',
  intervalMs: 1000,
});

function start() {
  const app = buildApp();

  dbHealthService.start();
  branchesMonitor.start();
  dvrMonitor.start();
  serversMonitor.start();

  // legacy worker for email transitions
  startWorker(pool);

  app.listen(env.port, () => {
    logger.info('Servidor iniciado', { port: env.port });
  });
}

module.exports = { start };
