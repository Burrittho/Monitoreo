/**
 * Configuración del sistema de monitoreo
 * Constantes y parámetros centralizados
 */

module.exports = {
  // Estados posibles de un host
  STATE_UP: 'ONLINE',
  STATE_DOWN: 'OFFLINE',
  
  // Parámetros de análisis de logs
  LOGS_TO_ANALYZE: 360,        // Número de logs a revisar para determinar estado
  CONSECUTIVE_REQUIRED: 300,   // Logs consecutivos necesarios para confirmar cambio
  
  // Intervalo de revisión (30 segundos por defecto, se puede sobrescribir desde BD)
  CHECK_INTERVAL: 30000,       // milisegundos
  
  // Configuración de batch processing
  BATCH_SIZE: 3,               // Hosts a procesar en paralelo
  BATCH_DELAY: 50,             // Delay entre batches (ms)
  
  // Configuración de ConnectionManager
  MAX_CONNECTIONS: 5,          // Conexiones persistentes máximas
  MAX_IDLE_TIME: 300000,       // 5 minutos antes de cerrar conexión idle
  CLEANUP_INTERVAL: 60000,     // Cada 1 minuto limpiar conexiones idle
  
  // Retry de queries
  QUERY_RETRIES: 3             // Número de reintentos para queries fallidas
};
