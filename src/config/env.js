require('dotenv').config();

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
  port: toInt(process.env.PORT, 3000),
  corsOrigins: (process.env.CORS_ORIGINS || '*').split(',').map((v) => v.trim()),
  apiKey: process.env.API_KEY || '',
  dbBackfillOnRecovery: String(process.env.DB_BACKFILL_ON_RECOVERY || 'false').toLowerCase() === 'true',
  liveEventBufferPerGroup: toInt(process.env.LIVE_EVENT_BUFFER_PER_GROUP, 500),
  dbHealthInitialRetryMs: toInt(process.env.DB_HEALTH_INITIAL_RETRY_MS, 10000),
  dbHealthMaxRetryMs: toInt(process.env.DB_HEALTH_MAX_RETRY_MS, 60000),
  inventoryCacheDir: process.env.INVENTORY_CACHE_DIR || '.cache/inventory',
  noInventoryWarnIntervalMs: toInt(process.env.NO_INVENTORY_WARN_INTERVAL_MS, 60000),
};
