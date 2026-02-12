const express = require('express');
const router = express.Router();
const { getChartData, getMonitoredIps } = require('../models/grafica');
const { validateIpId, validateDateRange, validatePagination } = require('../utils/queryValidators');

/**
 * Endpoint para obtener datos de gráficas
 * GET /api/chart-data?ipId=1&startDate=2025-01-01&endDate=2025-01-02
 */
router.get('/chart-data', async (req, res) => {
    try {
        const { ipId, startDate, endDate, limit, offset } = req.query;

        const ipIdValidation = validateIpId(ipId);
        if (!ipIdValidation.valid) {
            return res.status(400).json({ error: ipIdValidation.error });
        }

        const dateValidation = validateDateRange(startDate, endDate, { requireBoth: true });
        if (!dateValidation.valid) {
            return res.status(400).json({ error: dateValidation.error });
        }

        const paginationValidation = validatePagination(limit, offset, { defaultLimit: 841000, maxLimit: 841000, allowZeroLimit: false });
        if (!paginationValidation.valid) {
            return res.status(400).json({ error: paginationValidation.error });
        }

        const data = await getChartData(
            ipIdValidation.value,
            dateValidation.start,
            dateValidation.end,
            paginationValidation.value.limit,
        );
        
        res.json(data);
        
    } catch (error) {
        console.error('Error getting chart data:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

/**
 * Endpoint para obtener la lista de IPs monitoreadas
 * GET /api/monitored-ips
 */
router.get('/monitored-ips', async (req, res) => {
    try {
        const ips = await getMonitoredIps();
        res.json(ips);
    } catch (error) {
        console.error('Error getting monitored IPs:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

/**
 * Endpoint para obtener estadísticas generales del dashboard
 * GET /api/dashboard-stats
 */
router.get('/dashboard-stats', async (req, res) => {
    try {
        const { timeRange = '24h' } = req.query;
        
        // Obtener todas las IPs
        const allIps = await getMonitoredIps();
        
        const endDate = new Date();
        const startDate = new Date();
        
        switch(timeRange) {
            case '24h':
                startDate.setHours(endDate.getHours() - 24);
                break;
            case '7d':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(endDate.getDate() - 30);
                break;
        }
        
        // Obtener estadísticas para todas las IPs
        const stats = {
            totalIps: allIps.length,
            activeIps: 0,
            inactiveIps: 0,
            avgLatency: 0,
            totalUptime: 0,
            totalAlerts: 0
        };
        
        // Procesar cada IP para obtener estadísticas
        let totalLatencySum = 0;
        let totalUptimeSum = 0;
        
        for (const ip of allIps) {
            try {
                const ipData = await getChartData(ip.id, startDate, endDate, 100);
                
                if (ipData.statistics.successRate > 80) {
                    stats.activeIps++;
                } else {
                    stats.inactiveIps++;
                }
                
                totalLatencySum += ipData.statistics.avgLatency;
                totalUptimeSum += ipData.statistics.successRate;
                
                // Simular alertas basadas en latencia y tasa de éxito
                if (ipData.statistics.avgLatency > 100 || ipData.statistics.successRate < 95) {
                    stats.totalAlerts++;
                }
                
            } catch (ipError) {
                console.warn(`Error processing IP ${ip.id}:`, ipError.message);
                stats.inactiveIps++;
            }
        }
        
        stats.avgLatency = allIps.length > 0 ? Math.round(totalLatencySum / allIps.length) : 0;
        stats.totalUptime = allIps.length > 0 ? Math.round(totalUptimeSum / allIps.length) : 0;
        
        res.json(stats);
        
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

module.exports = router;
