/**
 * Endpoint adicional para obtener métricas agrupadas por categoría
 * GET /api/nrdp/servers/:hostname/metrics/grouped
 */
const express = require('express');
const pool = require('../config/db');

async function getGroupedMetrics(hostname) {
  const conn = await pool.getConnection();
  
  try {
    // Obtener el server_id
    const [[server]] = await conn.query(
      'SELECT id FROM servers WHERE hostname = ? AND is_active = 1',
      [hostname]
    );
    
    if (!server) {
      conn.release();
      return null;
    }
    
    // Obtener últimas métricas agrupadas por categoría
    const [metrics] = await conn.query(`
      SELECT 
        service_name,
        state,
        output,
        perfdata,
        received_at,
        CASE 
          WHEN service_name LIKE '%cpu%' OR service_name LIKE '%processor%' THEN 'cpu'
          WHEN service_name LIKE '%memory%' OR service_name LIKE '%ram%' OR service_name LIKE '%committed%' THEN 'memory'
          WHEN service_name LIKE '%disk%' OR service_name LIKE '%drive%' THEN 'disk'
          WHEN service_name LIKE '%network%' OR service_name LIKE '%net%' THEN 'network'
          WHEN service_name LIKE '%service%' OR service_name LIKE '%process%' THEN 'services'
          WHEN service_name LIKE '%uptime%' OR service_name LIKE '%boot%' THEN 'system'
          WHEN service_name LIKE '%os%' OR service_name LIKE '%version%' THEN 'system'
          ELSE 'other'
        END as category
      FROM server_metrics
      WHERE server_id = ?
        AND received_at >= NOW() - INTERVAL 5 MINUTE
      ORDER BY received_at DESC
    `, [server.id]);
    
    conn.release();
    
    // Agrupar por categoría
    const grouped = {
      cpu: [],
      memory: [],
      disk: [],
      network: [],
      services: [],
      system: [],
      other: []
    };
    
    for (const metric of metrics) {
      const category = metric.category;
      delete metric.category;
      
      // Solo agregar si no existe ya (tomar la más reciente)
      const exists = grouped[category].find(m => m.service_name === metric.service_name);
      if (!exists) {
        grouped[category].push(metric);
      }
    }
    
    return grouped;
  } catch (err) {
    conn.release();
    throw err;
  }
}

/**
 * Parsear perfdata y extraer valores clave
 */
function extractKeyMetrics(perfdata) {
  if (!perfdata) return null;
  
  const metrics = {};
  
  // Extraer valores de CPU
  const cpuMatch = perfdata.match(/(?:cpu|load|processor)[^=]*=([0-9.]+)%?/i);
  if (cpuMatch) {
    metrics.cpu_percent = parseFloat(cpuMatch[1]);
  }
  
  // Extraer memoria usada (porcentaje o valor)
  const memMatch = perfdata.match(/(?:memory|ram|used)[^=]*=([0-9.]+)([GMK]?B)?[^;]*;[^;]*;[^;]*;[^;]*;([0-9.]+)/i);
  if (memMatch) {
    metrics.memory_used = parseFloat(memMatch[1]);
    metrics.memory_unit = memMatch[2] || 'B';
    metrics.memory_total = parseFloat(memMatch[3]);
  }
  
  // Extraer uso de disco
  const diskMatch = perfdata.match(/(?:disk|drive)[^=]*=([0-9.]+)([GMK]?B)?[^;]*;[^;]*;[^;]*;[^;]*;([0-9.]+)/i);
  if (diskMatch) {
    metrics.disk_used = parseFloat(diskMatch[1]);
    metrics.disk_unit = diskMatch[2] || 'B';
    metrics.disk_total = parseFloat(diskMatch[3]);
  }
  
  return Object.keys(metrics).length > 0 ? metrics : null;
}

module.exports = {
  getGroupedMetrics,
  extractKeyMetrics
};
