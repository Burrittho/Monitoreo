const express = require('express');
const router = express.Router();
const { getChartData, getMonitoredIps, getPingHistoryForChart, getChartStatistics } = require('../models/grafica');
const pool = require('../config/db'); // Agregamos la conexión a la base de datos

/**
 * GET /api/ping-history/chart
 * Obtiene datos para gráfica de historial de ping
 * @param {number} ipId - ID de la IP a consultar
 * @param {string} startDate - Fecha de inicio (ISO string)
 * @param {string} endDate - Fecha de fin (ISO string)
 * @param {number} limit - Límite de registros (opcional)
 */
router.get('/chart', async (req, res) => {
  try {
    const { ipId, startDate, endDate, limit } = req.query;
    
    // Validaciones básicas
    if (!ipId) {
      return res.status(400).json({ error: 'Se requiere ipId' });
    }
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h atrás por defecto
    const end = endDate ? new Date(endDate) : new Date();
    
    // Calcular límite dinámico basado en el rango de tiempo
    let recordLimit = limit ? parseInt(limit) : null;
    if (!recordLimit) {
      const timeRangeHours = (end - start) / (1000 * 60 * 60);
      if (timeRangeHours <= 1) {
        recordLimit = 3600; // 1 registro por segundo máximo
      } else if (timeRangeHours <= 12) {
        recordLimit = 43200; // Hasta 12h con 1 reg/segundo
      } else {
        recordLimit = 86400; // Límite mayor para rangos largos
      }
    }
    
    const data = await getChartData(ipId, start, end, recordLimit);
    
    // Mapear las estadísticas del modelo a los nombres que espera el frontend
    const mappedStatistics = {
      average_latency: Number(data.statistics.avgLatency) || 0,
      min_latency: Number(data.statistics.minLatency) || 0,
      max_latency: Number(data.statistics.maxLatency) || 0,
      packet_loss: Number(data.statistics.failureCount) || 0,
      downtime_count: calculateDowntimeCount(data.chartData),
      total_records: Number(data.statistics.totalPings) || 0,
      successful_pings: Number(data.statistics.successCount) || 0
    };
    
    // Agregar las estadísticas mapeadas a la respuesta
    const response = {
      ...data,
      statistics: mappedStatistics
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error al obtener datos para la gráfica:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /api/ping-history/stats
 * Devuelve solo estadísticas para el rango solicitado sin construir datasets de gráfica
 * @param {number} ipId
 * @param {string} startDate
 * @param {string} endDate
 * @param {number} limit (opcional)
 */
router.get('/stats', async (req, res) => {
  try {
    const { ipId, startDate, endDate, limit } = req.query;
    if (!ipId) {
      return res.status(400).json({ error: 'Se requiere ipId' });
    }
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Calcular límite dinámico similar al endpoint de chart
    let recordLimit = limit ? parseInt(limit) : null;
    if (!recordLimit) {
      const timeRangeHours = (end - start) / (1000 * 60 * 60);
      if (timeRangeHours <= 1) recordLimit = 3600;
      else if (timeRangeHours <= 12) recordLimit = 43200;
      else recordLimit = 86400;
    }

    // Obtener datos y calcular estadísticas sin construir datasets de Chart.js
    const pingData = await getPingHistoryForChart(ipId, start, end, recordLimit);
    const stats = getChartStatistics(pingData);

    // Calcular downtime_count con la misma lógica: 10 fallos para abrir, 10 éxitos para cerrar
    let downtimeCount = 0;
    let consecutiveFailures = 0;
    let consecutiveSuccesses = 0;
    let inOutage = false;
    for (let i = 0; i < pingData.length; i++) {
      if (pingData[i].success === 0) {
        consecutiveFailures++;
        consecutiveSuccesses = 0;
        if (!inOutage && consecutiveFailures >= 10) {
          downtimeCount++;
          inOutage = true;
        }
      } else {
        consecutiveSuccesses++;
        consecutiveFailures = 0;
        if (inOutage && consecutiveSuccesses >= 10) {
          inOutage = false;
        }
      }
    }

    const mappedStatistics = {
      average_latency: Number(stats.avgLatency) || 0,
      min_latency: Number(stats.minLatency) || 0,
      max_latency: Number(stats.maxLatency) || 0,
      packet_loss: Number(stats.failureCount) || 0,
      downtime_count: downtimeCount,
      total_records: Number(stats.totalPings) || 0,
      successful_pings: Number(stats.successCount) || 0,
    };

    res.json({ statistics: mappedStatistics });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * Calcula el número de períodos de caída (downtime) a partir de los datos del chart
 * @param {Object} chartData - Datos del chart de Chart.js
 * @returns {number} Número de períodos de caída detectados
 */
function calculateDowntimeCount(chartData) {
  if (!chartData || !chartData.datasets || chartData.datasets.length < 2) {
    return 0;
  }

  const failureData = chartData.datasets[1].data; // Segunda dataset contiene los fallos
  if (!Array.isArray(failureData)) {
    return 0;
  }

  let downtimeCount = 0;
  let consecutiveFailures = 0;
  let consecutiveSuccesses = 0;
  let inOutage = false;

  for (let i = 0; i < failureData.length; i++) {
    if (failureData[i] !== null) { // Fallo detectado
      consecutiveFailures++;
      consecutiveSuccesses = 0;
      if (!inOutage && consecutiveFailures >= 10) {
        downtimeCount++;
        inOutage = true;
      }
    } else { // Éxito
      consecutiveSuccesses++;
      consecutiveFailures = 0;
      if (inOutage && consecutiveSuccesses >= 10) {
        inOutage = false;
      }
    }
  }

  return downtimeCount;
}

/**
 * GET /api/ping-history/ips
 * Obtiene la lista de IPs monitoreadas
 */
router.get('/ips', async (req, res) => {
  try {
    const ips = await getMonitoredIps();
    res.json(ips);
  } catch (error) {
    console.error('Error al obtener IPs monitoreadas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
