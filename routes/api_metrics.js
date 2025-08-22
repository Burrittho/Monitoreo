const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET: Obtener métricas generales del dashboard
router.get('/dashboard-metrics', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        
        // Consulta para métricas de Sucursales
        const sucursalesQuery = `
            SELECT 
                COUNT(DISTINCT d.id) as total_sucursales,
                COUNT(CASE WHEN latest.success = 1 AND latest.latency <= 70 THEN 1 END) as sucursales_activas,
                COUNT(CASE WHEN latest.success = 0 THEN 1 END) as sucursales_caidas,
                COUNT(CASE WHEN latest.success = 1 AND latest.latency > 70 THEN 1 END) as sucursales_advertencia,
                AVG(CASE WHEN latest.success = 1 THEN latest.latency END) as latencia_promedio
            FROM ips d
            LEFT JOIN (
                SELECT 
                    pl.ip_id,
                    pl.latency,
                    pl.success,
                    pl.timestamp,
                    ROW_NUMBER() OVER (PARTITION BY pl.ip_id ORDER BY pl.timestamp DESC) as rn
                FROM ping_logs pl
                WHERE pl.timestamp >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
            ) latest ON d.id = latest.ip_id AND latest.rn = 1
        `;
        
        // Consulta para métricas de DVR
        const dvrQuery = `
            SELECT 
                COUNT(DISTINCT d.id) as total_dvr,
                COUNT(CASE WHEN latest.success = 1 THEN 1 END) as dvr_activos,
                COUNT(CASE WHEN latest.success = 0 THEN 1 END) as dvr_offline,
                COUNT(CASE WHEN latest.success = 1 AND latest.latency > 100 THEN 1 END) as dvr_advertencia
            FROM ips_dvr d
            LEFT JOIN (
                SELECT 
                    pl.ip_id,
                    pl.latency,
                    pl.success,
                    pl.timestamp,
                    ROW_NUMBER() OVER (PARTITION BY pl.ip_id ORDER BY pl.timestamp DESC) as rn
                FROM ping_logs_dvr pl
                WHERE pl.timestamp >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
            ) latest ON d.id = latest.ip_id AND latest.rn = 1
        `;
        
        const [sucursalesResult] = await conn.query(sucursalesQuery);
        const [dvrResult] = await conn.query(dvrQuery);
        
        conn.release();
        
        const sucursalesMetrics = sucursalesResult[0] || {
            total_sucursales: 0,
            sucursales_activas: 0,
            sucursales_caidas: 0,
            sucursales_advertencia: 0,
            latencia_promedio: 0
        };
        
        const dvrMetrics = dvrResult[0] || {
            total_dvr: 0,
            dvr_activos: 0,
            dvr_offline: 0,
            dvr_advertencia: 0
        };
        
        // Calcular uptime general
        const totalSistemas = sucursalesMetrics.total_sucursales + dvrMetrics.total_dvr;
        const sistemasActivos = sucursalesMetrics.sucursales_activas + dvrMetrics.dvr_activos;
        const uptime = totalSistemas > 0 ? ((sistemasActivos / totalSistemas) * 100).toFixed(1) : 0;
        
        // Calcular alertas activas
        const alertasActivas = sucursalesMetrics.sucursales_caidas + 
                              sucursalesMetrics.sucursales_advertencia + 
                              dvrMetrics.dvr_offline + 
                              dvrMetrics.dvr_advertencia;
        
        const metrics = {
            sucursales: {
                total: parseInt(sucursalesMetrics.total_sucursales),
                activas: parseInt(sucursalesMetrics.sucursales_activas),
                caidas: parseInt(sucursalesMetrics.sucursales_caidas),
                advertencia: parseInt(sucursalesMetrics.sucursales_advertencia),
                latencia_promedio: Math.round(sucursalesMetrics.latencia_promedio || 0)
            },
            dvr: {
                total: parseInt(dvrMetrics.total_dvr),
                activos: parseInt(dvrMetrics.dvr_activos),
                offline: parseInt(dvrMetrics.dvr_offline),
                advertencia: parseInt(dvrMetrics.dvr_advertencia)
            },
            general: {
                uptime: parseFloat(uptime),
                alertas_activas: alertasActivas,
                latencia_promedio: Math.round(sucursalesMetrics.latencia_promedio || 0),
                sistemas_monitoreados: totalSistemas
            }
        };
        
        res.json({
            success: true,
            metrics: metrics,
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// GET: Obtener estadísticas de red en tiempo real
router.get('/network-stats', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        
        const query = `
            SELECT 
                COUNT(*) as total_pings,
                AVG(latency) as latencia_promedio,
                MIN(latency) as latencia_minima,
                MAX(latency) as latencia_maxima,
                COUNT(CASE WHEN success = 1 THEN 1 END) as pings_exitosos,
                COUNT(CASE WHEN success = 0 THEN 1 END) as pings_fallidos
            FROM (
                SELECT latency, success FROM ping_logs WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
                UNION ALL
                SELECT latency, success FROM ping_logs_dvr WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
            ) combined_logs
        `;
        
        const [result] = await conn.query(query);
        conn.release();
        
        const stats = result[0] || {};
        
        res.json({
            success: true,
            stats: {
                total_pings: parseInt(stats.total_pings || 0),
                latencia_promedio: Math.round(stats.latencia_promedio || 0),
                latencia_minima: Math.round(stats.latencia_minima || 0),
                latencia_maxima: Math.round(stats.latencia_maxima || 0),
                tasa_exito: stats.total_pings > 0 ? 
                    ((stats.pings_exitosos / stats.total_pings) * 100).toFixed(1) : 0,
                pings_exitosos: parseInt(stats.pings_exitosos || 0),
                pings_fallidos: parseInt(stats.pings_fallidos || 0)
            },
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('Error fetching network stats:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

module.exports = router;
