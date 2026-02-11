/**
 * NRDP Processor - Procesa checkresults de NSClient++
 * Maneja la lógica de persistencia de métricas y servidores
 */

const pool = require('../config/db');
const { parsePerfdata, extractPerfdata } = require('../utils/perfdataParser');

/**
 * Procesa un array de checkresults de NRDP
 * @param {Object} data - Objeto con checkresults
 * @returns {Object} Resultado del procesamiento
 */
async function processCheckResults(data) {
  const checkResults = data.checkresults || [];
  let processedCount = 0;
  const errors = [];
  const serverUpdates = new Set();
  
  for (const result of checkResults) {
    try {
      const hostname = await processCheckResult(result);
      if (hostname) {
        serverUpdates.add(hostname);
        processedCount++;
      }
    } catch (err) {
      console.error('Error processing check result:', err);
      errors.push({ 
        result: {
          hostname: result.hostname,
          service: result.servicename || 'HOST'
        }, 
        error: err.message 
      });
    }
  }
  
  return {
    count: processedCount,
    total: checkResults.length,
    servers_updated: serverUpdates.size,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Procesa un checkresult individual
 * @param {Object} result - Checkresult de NRDP
 * @returns {string} Hostname del servidor procesado
 */
async function processCheckResult(result) {
  const { hostname, servicename, state, output } = result;
  
  // Validaciones básicas
  if (!hostname || typeof hostname !== 'string') {
    throw new Error('Hostname is required and must be a string');
  }
  
  if (state === undefined || state === null) {
    throw new Error('State is required');
  }
  
  const numericState = parseInt(state);
  if (isNaN(numericState) || numericState < 0 || numericState > 3) {
    throw new Error('State must be 0 (OK), 1 (WARN), 2 (CRIT), or 3 (UNKNOWN)');
  }
  
  const conn = await pool.getConnection();
  
  try {
    await conn.beginTransaction();
    
    // Obtener o crear servidor
    const serverId = await getOrCreateServer(conn, hostname);
    
    // Actualizar last_seen
    await conn.query(
      'UPDATE servers SET last_seen = NOW(), updated_at = NOW() WHERE id = ?',
      [serverId]
    );
    
    // Extraer perfdata del output
    const perfdata = extractPerfdata(output);
    
    // Insertar métrica
    const [metricResult] = await conn.query(
      `INSERT INTO server_metrics 
       (server_id, service_name, state, output, perfdata) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        serverId,
        servicename || 'HOST',
        numericState,
        output || '',
        perfdata
      ]
    );
    
    // Parsear y guardar perfdata si existe
    if (perfdata) {
      const parsed = parsePerfdata(perfdata);
      
      for (const metric of parsed) {
        try {
          await conn.query(
            `INSERT INTO server_perfdata_parsed 
             (metric_id, server_id, service_name, metric_name, 
              value, uom, warning, critical, min_value, max_value) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              metricResult.insertId,
              serverId,
              servicename || 'HOST',
              metric.name,
              metric.value,
              metric.uom,
              metric.warning,
              metric.critical,
              metric.min,
              metric.max
            ]
          );
        } catch (perfdataErr) {
          console.warn(`Error inserting perfdata for ${metric.name}:`, perfdataErr.message);
          // Continuar con otras métricas
        }
      }
    }
    
    await conn.commit();
    
    // Log exitoso
    console.log(`Processed check result: ${hostname} - ${servicename || 'HOST'} - State: ${numericState}`);
    
    return hostname;
    
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Obtiene el ID de un servidor o lo crea si no existe
 * @param {Connection} conn - Conexión a la BD
 * @param {string} hostname - Nombre del servidor
 * @returns {number} ID del servidor
 */
async function getOrCreateServer(conn, hostname) {
  // Intentar obtener servidor existente
  const [[server]] = await conn.query(
    'SELECT id FROM servers WHERE hostname = ?',
    [hostname]
  );
  
  if (server) {
    return server.id;
  }
  
  // Crear nuevo servidor
  const [insertResult] = await conn.query(
    `INSERT INTO servers (hostname, last_seen) VALUES (?, NOW())`,
    [hostname]
  );
  
  console.log(`New server registered: ${hostname} (ID: ${insertResult.insertId})`);
  
  return insertResult.insertId;
}

/**
 * Obtiene el estado actual de un servidor
 * @param {string} hostname - Nombre del servidor
 * @returns {Object|null} Estado del servidor
 */
async function getServerStatus(hostname) {
  const conn = await pool.getConnection();
  
  try {
    const [[server]] = await conn.query(
      `SELECT 
        id, hostname, ip_address, description, os, location,
        is_active, last_seen, created_at, updated_at,
        TIMESTAMPDIFF(MINUTE, last_seen, NOW()) as minutes_since_last_seen
      FROM servers 
      WHERE hostname = ?`,
      [hostname]
    );
    
    if (!server) {
      return null;
    }
    
    // Obtener últimas métricas
    const [metrics] = await conn.query(
      `SELECT 
        service_name, state, output, perfdata, received_at
      FROM server_metrics
      WHERE server_id = ?
      ORDER BY received_at DESC
      LIMIT 20`,
      [server.id]
    );
    
    return {
      ...server,
      metrics: metrics
    };
    
  } finally {
    conn.release();
  }
}

/**
 * Obtiene estadísticas de un servidor
 * @param {number} serverId - ID del servidor
 * @param {number} hours - Horas hacia atrás (default: 24)
 * @returns {Object} Estadísticas
 */
async function getServerStats(serverId, hours = 24) {
  const conn = await pool.getConnection();
  
  try {
    const [[stats]] = await conn.query(
      `SELECT 
        COUNT(*) as total_checks,
        SUM(CASE WHEN state = 0 THEN 1 ELSE 0 END) as ok_count,
        SUM(CASE WHEN state = 1 THEN 1 ELSE 0 END) as warning_count,
        SUM(CASE WHEN state = 2 THEN 1 ELSE 0 END) as critical_count,
        SUM(CASE WHEN state = 3 THEN 1 ELSE 0 END) as unknown_count,
        MIN(received_at) as first_check,
        MAX(received_at) as last_check
      FROM server_metrics
      WHERE server_id = ? 
        AND received_at > DATE_SUB(NOW(), INTERVAL ? HOUR)`,
      [serverId, hours]
    );
    
    return stats || {
      total_checks: 0,
      ok_count: 0,
      warning_count: 0,
      critical_count: 0,
      unknown_count: 0
    };
    
  } finally {
    conn.release();
  }
}

module.exports = {
  processCheckResults,
  processCheckResult,
  getOrCreateServer,
  getServerStatus,
  getServerStats
};
