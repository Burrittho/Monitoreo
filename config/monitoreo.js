/**
 * Configuración del sistema de monitoreo
 * Constantes y parámetros centralizados
 */

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

const ASSET_THRESHOLDS = {
  sucursal: {
    failThreshold: toInt(process.env.SUCURSAL_FAIL_THRESHOLD, 300),
    recoveryThreshold: toInt(process.env.SUCURSAL_RECOVERY_THRESHOLD, 300),
    logsToAnalyze: toInt(process.env.SUCURSAL_LOGS_TO_ANALYZE, 360)
  },
  dvr: {
    failThreshold: toInt(process.env.DVR_FAIL_THRESHOLD, 10),
    recoveryThreshold: toInt(process.env.DVR_RECOVERY_THRESHOLD, 10),
    logsToAnalyze: toInt(process.env.DVR_LOGS_TO_ANALYZE, 120)
  },
  server: {
    failThreshold: toInt(process.env.SERVER_FAIL_THRESHOLD, 10),
    recoveryThreshold: toInt(process.env.SERVER_RECOVERY_THRESHOLD, 10),
    logsToAnalyze: toInt(process.env.SERVER_LOGS_TO_ANALYZE, 120)
  }
};

module.exports = {
  // Estados posibles de un host
  STATE_UP: 'ONLINE',
  STATE_DOWN: 'OFFLINE',

  // Configuración por tipo de activo (se puede sobrescribir desde tabla config)
  ASSET_THRESHOLDS,

  // Compatibilidad hacia atrás
  LOGS_TO_ANALYZE: ASSET_THRESHOLDS.sucursal.logsToAnalyze,
  CONSECUTIVE_REQUIRED: ASSET_THRESHOLDS.sucursal.failThreshold,

  // Intervalo de revisión (30 segundos por defecto, se puede sobrescribir desde BD)
  CHECK_INTERVAL: 30000,

  // Configuración de batch processing
  BATCH_SIZE: 3,
  BATCH_DELAY: 50,

  // Configuración de ConnectionManager
  MAX_CONNECTIONS: 5,
  MAX_IDLE_TIME: 300000,
  CLEANUP_INTERVAL: 60000,

  // Retry de queries
  QUERY_RETRIES: 3
};
