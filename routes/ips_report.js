const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // Configuración de conexión a la base de datos
const { buildIncidents, calculateConsecutiveTransitions, resolveAssetThresholds } = require('../services/downtimeService');
const monitoreoConfig = require('../config/monitoreo');

// endpoint para obtener los logs de ping y calcular la latencia media (Reporte)
router.get('/latency', async (req, res) => {
    const { ipId, startDate, endDate } = req.query;

    if (!ipId || !startDate || !endDate) {
        return res.status(400).send('ipId, startDate, and endDate query parameters are required.');
    }

    let connection;
    try {
        connection = await pool.getConnection();
        
        const query = `
            SELECT 
                AVG(latency) AS average_latency,
                COUNT(*) as total_records,
                COUNT(CASE WHEN success = 1 THEN 1 END) as successful_pings
            FROM ping_logs
            WHERE ip_id = ? AND fecha BETWEEN ? AND ?
        `;
        const [rows] = await connection.query(query, [ipId, startDate, endDate]);
        
        res.json({ 
            average_latency: Number(rows[0].average_latency) || 0,
            total_records: Number(rows[0].total_records) || 0,
            successful_pings: Number(rows[0].successful_pings) || 0
        });
    } catch (err) {
        console.error('Error in latency endpoint:', err);
        res.status(500).send(err.toString());
    } finally {
        if (connection) connection.release();
    }
});

// endpoint para obtener latencia mínima
router.get('/min-latency', async (req, res) => {
    const { ipId, startDate, endDate } = req.query;

    if (!ipId || !startDate || !endDate) {
        return res.status(400).send('ipId, startDate, and endDate query parameters are required.');
    }

    let connection;
    try {
        connection = await pool.getConnection();
        
        const query = `
            SELECT 
                MIN(latency) AS min_latency
            FROM ping_logs
            WHERE ip_id = ? AND fecha BETWEEN ? AND ? AND success = 1 AND latency > 0
        `;
        const [rows] = await connection.query(query, [ipId, startDate, endDate]);
        
        res.json({ 
            min_latency: Number(rows[0].min_latency) || 0
        });
    } catch (err) {
        console.error('Error in min-latency endpoint:', err);
        res.status(500).send(err.toString());
    } finally {
        if (connection) connection.release();
    }
});

// endpoint para obtener latencia máxima
router.get('/max-latency', async (req, res) => {
    const { ipId, startDate, endDate } = req.query;

    if (!ipId || !startDate || !endDate) {
        return res.status(400).send('ipId, startDate, and endDate query parameters are required.');
    }

    let connection;
    try {
        connection = await pool.getConnection();
        
        const query = `
            SELECT 
                MAX(latency) AS max_latency
            FROM ping_logs
            WHERE ip_id = ? AND fecha BETWEEN ? AND ? AND success = 1 AND latency > 0
        `;
        const [rows] = await connection.query(query, [ipId, startDate, endDate]);
        
        res.json({ 
            max_latency: Number(rows[0].max_latency) || 0
        });
    } catch (err) {
        console.error('Error in max-latency endpoint:', err);
        res.status(500).send(err.toString());
    } finally {
        if (connection) connection.release();
    }
});

// endpoint para contar los paquetes perdidos (Reporte)
router.get('/packetloss', async (req, res) => {
    const { ipId, startDate, endDate } = req.query;

    if (!ipId || !startDate || !endDate) {
        return res.status(400).send('ipId, startDate, and endDate query parameters are required.');
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const query = `
            SELECT COUNT(*) AS packet_loss
            FROM ping_logs
            WHERE ip_id = ? AND success = 0 AND fecha BETWEEN ? AND ?
        `;
        const [rows] = await connection.query(query, [ipId, startDate, endDate]);
        res.json({ packet_loss: Number(rows[0].packet_loss) });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.toString());
    } finally {
        if (connection) connection.release(); // Corregido
    }
});

// endpoint para contar caidas de ping (Reporte)
router.get('/downtime', async (req, res) => {
    const { ipId, startDate, endDate, assetType = 'sucursal' } = req.query;

    if (!ipId || !startDate || !endDate) {
        return res.status(400).send('ipId, startDate, and endDate query parameters are required.');
    }

    let connection;
    try {
        connection = await pool.getConnection();

        const thresholds = resolveAssetThresholds(assetType, monitoreoConfig.ASSET_THRESHOLDS);

        // Obtener los datos de ping ordenados cronológicamente
        const [pingData] = await connection.query(`
            SELECT success, fecha
            FROM ping_logs
            WHERE ip_id = ? AND fecha BETWEEN ? AND ?
            ORDER BY fecha ASC
        `, [ipId, startDate, endDate]);

        if (pingData.length === 0) {
            return res.json([]);
        }

        // Identificar si ya venía en caída antes del rango
        const [priorData] = await connection.query(`
            SELECT success
            FROM ping_logs
            WHERE ip_id = ? AND fecha < ?
            ORDER BY fecha DESC
            LIMIT ?
        `, [ipId, startDate, thresholds.failThreshold]);

        const activeOutageAtStart =
            priorData.length >= thresholds.failThreshold && priorData.every(row => row.success === 0);

        const intervals = buildIncidents(pingData, {
            failThreshold: thresholds.failThreshold,
            recoveryThreshold: thresholds.recoveryThreshold,
            startDate,
            endDate,
            initialState: activeOutageAtStart ? 'OFFLINE' : 'ONLINE'
        });

        res.json(intervals);
    } catch (err) {
        console.error('Error in downtime endpoint:', err);
        res.status(500).send(err.toString());
    } finally {
        if (connection) connection.release();
    }
});

// endpoint para obtener cantidad de caídas (estadística numérica)
router.get('/downtime-count', async (req, res) => {
    const { ipId, startDate, endDate } = req.query;

    if (!ipId || !startDate || !endDate) {
        return res.status(400).send('ipId, startDate, and endDate query parameters are required.');
    }

    let connection;
    try {
        connection = await pool.getConnection();
        
        // Obtener los datos de ping ordenados cronológicamente
        const [pingData] = await connection.query(`
            SELECT success, fecha
            FROM ping_logs
            WHERE ip_id = ? AND fecha BETWEEN ? AND ?
            ORDER BY fecha ASC
        `, [ipId, startDate, endDate]);
        
        const { failThreshold, recoveryThreshold } = resolveAssetThresholds(req.query.assetType || 'sucursal', monitoreoConfig.ASSET_THRESHOLDS);
        const transitions = calculateConsecutiveTransitions(pingData, {
            failThreshold,
            recoveryThreshold,
            initialState: 'ONLINE'
        });

        const downtimeCount = transitions.transitions.filter(t => t.type === 'DOWN').length;

        res.json({
            downtime_count: downtimeCount
        });
    } catch (err) {
        console.error('Error in downtime-count endpoint:', err);
        res.status(500).send(err.toString());
    } finally {
        if (connection) connection.release();
    }
});

// Endpoint para obtener los resultados del ping (Monitor)
router.get('/ping-results', async (req, res, next) => {
    try {
        const conn = await pool.getConnection();
        
        // Consulta mejorada que verifica los pings más recientes
        const rows = await conn.query(
            `SELECT 
                ips.id, 
                ips.name, 
                ips.ip, 
                IFNULL(ping_logs.latency, 0) as latency, 
                IFNULL(ping_logs.success, 0) as success,
                ping_logs.fecha as last_ping_time
            FROM ips
            LEFT JOIN (
                SELECT ip_id, MAX(id) AS max_id
                FROM ping_logs
                GROUP BY ip_id
            ) AS latest_logs ON ips.id = latest_logs.ip_id
            LEFT JOIN ping_logs ON latest_logs.max_id = ping_logs.id
            ORDER BY 
                IFNULL(ping_logs.success, 0) ASC, 
                IFNULL(ping_logs.latency, 0) DESC, 
                ips.name ASC
        `);
        
        conn.release();
        res.json(rows);
    } catch (err) {
        console.error('Error al obtener resultados de ping:', err);
        next(err);
    }
});

// Endpoint para obtener sucursales en estado OFFLINE desde host_state_log
router.get('/current-outages', async (req, res, next) => {
    try {
        const conn = await pool.getConnection();
        
        // Consulta para obtener sucursales que están OFFLINE usando host_state_log
        const [rows] = await conn.query(
            `SELECT 
                ips.id,
                ips.name,
                ips.ip,
                hsl.state,
                hsl.changed_at as down_since,
                hsl.changed_at as updated_at,
                TIMESTAMPDIFF(MINUTE, hsl.changed_at, NOW()) as minutes_down,
                TIMESTAMPDIFF(MINUTE, hsl.changed_at, NOW()) as downtime_minutes
            FROM host_state_log hsl
            INNER JOIN ips ON hsl.ip_id = ips.id
            WHERE hsl.is_active = 1 
            AND (hsl.state = 'OFFLINE' OR hsl.state = 'DOWN')
            ORDER BY hsl.changed_at DESC
        `);
    
        conn.release();
        
        // Devolver solo los datos, sin metadatos
        res.json(rows);
    } catch (err) {
        console.error('Error al obtener sucursales en estado OFFLINE:', err);
        next(err);
    }
});

// Endpoint para obtener los resultados del ping dvr(Monitor)
router.get('/ping-results-dvr', async (req, res, next) => {
    try {
        const conn = await pool.getConnection();
        
        // Consulta mejorada que verifica los pings más recientes
        const rows = await conn.query(
            `SELECT 
                ips_dvr.id,
                ips_dvr.ip,  
                ips_dvr.name, 
                IFNULL(ping_logs_dvr.latency, 0) as latency, 
                IFNULL(ping_logs_dvr.success, 0) as success,
                ping_logs_dvr.fecha as last_ping_time
            FROM ips_dvr
            LEFT JOIN (
                SELECT ip_id, MAX(id) AS max_id
                FROM ping_logs_dvr
                GROUP BY ip_id
            ) AS latest_logs ON ips_dvr.id = latest_logs.ip_id
            LEFT JOIN ping_logs_dvr ON latest_logs.max_id = ping_logs_dvr.id
            ORDER BY 
                IFNULL(ping_logs_dvr.success, 0) ASC, 
                IFNULL(ping_logs_dvr.latency, 0) DESC, 
                ips_dvr.name ASC
        `);
        
        conn.release();
        res.json(rows);
    } catch (err) {
        console.error('Error al obtener resultados de ping:', err);
        next(err);
    }
});

// Nuevo Endpoint para obtener los resultados del ping de servidores (Monitor-)
router.get('/ping-results-server', async (req, res, next) => {
    try {
        const conn = await pool.getConnection();
        const rows = await conn.query(
            `SELECT 
                ips_server.id,
                ips_server.ip,
                ips_server.name,
                IFNULL(ping_logs_server.latency, 0) as latency,
                IFNULL(ping_logs_server.success, 0) as success,
                ping_logs_server.fecha as last_ping_time
            FROM ips_server
            LEFT JOIN (
                SELECT ip_id, MAX(id) AS max_id
                FROM ping_logs_server
                GROUP BY ip_id
            ) AS latest_logs ON ips_server.id = latest_logs.ip_id
            LEFT JOIN ping_logs_server ON latest_logs.max_id = ping_logs_server.id
            ORDER BY 
                IFNULL(ping_logs_server.success, 0) ASC,
                IFNULL(ping_logs_server.latency, 0) DESC,
                ips_server.name ASC`
        );
        conn.release();
        res.json(rows);
    } catch (err) {
        console.error('Error al obtener resultados de ping (server):', err);
        next(err);
    }
});

module.exports = router;