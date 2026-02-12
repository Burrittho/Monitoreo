const express = require('express');
const env = require('./config/env');
const requestContext = require('./middlewares/requestContext');
const compressJson = require('./middlewares/compressJson');
const errorHandler = require('./middlewares/errorHandler');
const { requireApiKey } = require('./middlewares/auth');

// legacy routes
const ipsRoutes = require('../routes/ips');
const ipsReportRoutes = require('../routes/ips_report');
const pingHistoryRoutes = require('../routes/ping_history');
const internetRoutes = require('../routes/internet');
const reportsRoutes = require('../routes/reports');
const consoleRoutes = require('../routes/console');
const configRoutes = require('../routes/config');
const chartsRoutes = require('../routes/api_charts');
const nrdpRoutes = require('../routes/nrdp');

const liveRoutes = require('./routes/live');
const healthRoutes = require('./routes/health');

function applyCors(req, res, next) {
  const origin = req.headers.origin;
  const allowAny = env.corsOrigins.includes('*');
  if (allowAny || (origin && env.corsOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', allowAny ? '*' : origin);
  }
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Request-Id');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
}

function buildApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(applyCors);
  app.use(requestContext);
  app.use(compressJson);

  app.use('/api', healthRoutes);
  app.use('/api', liveRoutes);

  // legacy compatibility
  app.use('/api/ips', ipsRoutes);
  app.use('/api/ips_report', ipsReportRoutes);
  app.use('/api/ping_history', pingHistoryRoutes);
  app.use('/api/internet', internetRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/console', consoleRoutes);
  app.use('/api/config', requireApiKey, configRoutes);
  app.use('/api', chartsRoutes);
  app.use('/api', nrdpRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
  });
  app.use(errorHandler);

  return app;
}

module.exports = { buildApp };
