const express = require('express');
const router = express.Router();
const { getChartData, getMonitoredIps, getPingHistoryForChart, getChartStatistics } = require('../models/grafica');
const { validateIpId, validateDateRange, validatePagination } = require('../utils/queryValidators');
const { calculateDowntimeCountFromChartData, countDowntimesFromSuccessSeries } = require('../utils/pingAnalytics');

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
    const { ipId, startDate, endDate, limit, offset } = req.query;

    const ipIdValidation = validateIpId(ipId);
    if (!ipIdValidation.valid) {
      return res.status(400).json({ error: ipIdValidation.error });
    }

    const dateValidation = validateDateRange(startDate, endDate);
    if (!dateValidation.valid) {
      return res.status(400).json({ error: dateValidation.error });
    }

    const paginationValidation = validatePagination(limit, offset, { defaultLimit: 0, maxLimit: 86400, defaultOffset: 0, allowZeroLimit: true });
    if (!paginationValidation.valid) {
      return res.status(400).json({ error: paginationValidation.error });
    }

    const start = dateValidation.start;
    const end = dateValidation.end;

    let recordLimit = paginationValidation.value.limit;
    if (recordLimit === 0) {
      const timeRangeHours = (end - start) / (1000 * 60 * 60);
      if (timeRangeHours <= 1) recordLimit = 3600;
      else if (timeRangeHours <= 12) recordLimit = 43200;
      else recordLimit = 86400;
    }

    const data = await getChartData(ipIdValidation.value, start, end, recordLimit);
    
    // Mapear las estadísticas del modelo a los nombres que espera el frontend
    const mappedStatistics = {
      average_latency: Number(data.statistics.avgLatency) || 0,
      min_latency: Number(data.statistics.minLatency) || 0,
      max_latency: Number(data.statistics.maxLatency) || 0,
      packet_loss: Number(data.statistics.failureCount) || 0,
      downtime_count: calculateDowntimeCountFromChartData(data.chartData),
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
    const { ipId, startDate, endDate, limit, offset } = req.query;

    const ipIdValidation = validateIpId(ipId);
    if (!ipIdValidation.valid) {
      return res.status(400).json({ error: ipIdValidation.error });
    }

    const dateValidation = validateDateRange(startDate, endDate);
    if (!dateValidation.valid) {
      return res.status(400).json({ error: dateValidation.error });
    }

    const paginationValidation = validatePagination(limit, offset, { defaultLimit: 0, maxLimit: 86400, defaultOffset: 0, allowZeroLimit: true });
    if (!paginationValidation.valid) {
      return res.status(400).json({ error: paginationValidation.error });
    }

    const start = dateValidation.start;
    const end = dateValidation.end;

    let recordLimit = paginationValidation.value.limit;
    if (recordLimit === 0) {
      const timeRangeHours = (end - start) / (1000 * 60 * 60);
      if (timeRangeHours <= 1) recordLimit = 3600;
      else if (timeRangeHours <= 12) recordLimit = 43200;
      else recordLimit = 86400;
    }

    const pingData = await getPingHistoryForChart(ipIdValidation.value, start, end, recordLimit);
    const stats = getChartStatistics(pingData);

    const downtimeCount = countDowntimesFromSuccessSeries(pingData.map((entry) => entry.success));

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

/**
 * GET /api/ping-history/logs
 * Historial paginado consistente: items, total, limit, offset
 */
router.get('/logs', async (req, res) => {
  try {
    const { ipId, startDate, endDate } = req.query;
    if (!ipId) {
      return res.status(400).json({ error: 'Se requiere ipId' });
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    const { limit, offset } = parsePagination(req.query, {
      defaultLimit: LOGS_LIMIT_DEFAULT,
      maxLimit: LOGS_LIMIT_MAX,
    });

    const [items, total] = await Promise.all([
      getPingHistoryForChart(ipId, start, end, limit, offset),
      pingRepository.countPingHistory({ ipId, startDate: start, endDate: end })
    ]);

    res.json({ items, total, limit, offset });
  } catch (error) {
    console.error('Error al obtener logs de ping:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
