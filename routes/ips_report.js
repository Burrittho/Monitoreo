const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // Configuración de conexión a la base de datos

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
        
        // Si no hay datos, retornar array vacío
        if (pingData.length === 0) {
            return res.json([]);
        }

        // Verificar si todos los datos son success=0 (sin datos suficientes)
        let allFailures = true;
        for (let i = 0; i < pingData.length; i++) {
            if (pingData[i].success === 1) {
                allFailures = false;
                break;
            }
        }

        // Si todos son fallos y hay pocos datos, considerarlo como "sin datos suficientes"
        if (allFailures && pingData.length < 20) {
            return res.json([{
                downtime_start: startDate,
                downtime_end: endDate,
                downtime_duration: 'N/A',
                status: 'insufficient_data',
                message: 'No hay datos suficientes para determinar incidencias'
            }]);
        }
        
        // Buscar si había una caída activa antes del rango
        // Optimización: buscar solo los últimos 10 registros para verificar caída activa
        const [priorData] = await connection.query(`
            SELECT success
            FROM ping_logs
            WHERE ip_id = ? AND fecha < ?
            ORDER BY fecha DESC
            LIMIT 10
        `, [ipId, startDate]);
        
        // Verificar si hay caída activa al inicio del período
        let activeOutageAtStart = priorData.length >= 10 && priorData.every(row => row.success === 0);
        
        // Procesar los datos para encontrar intervalos de caída
        const intervals = [];
        let inOutage = activeOutageAtStart;
        let failRun = 0;
        let successRun = 0;
        let failRunStartTime = null;
        let outageStart = activeOutageAtStart ? startDate : null;
        let lastFailureTime = null;
        let incidentsCount = 0;

        for (let i = 0; i < pingData.length; i++) {
            const { success, fecha } = pingData[i];
            const ts = fecha;

            if (success === 0) {
                // fallo
                if (failRun === 0) failRunStartTime = ts;
                failRun++;
                lastFailureTime = ts;
                successRun = 0; // reiniciar éxitos

                // si alcanzamos 10 fallos y no estábamos en caída, comienza la caída
                if (!inOutage && failRun >= 10) {
                    inOutage = true;
                    outageStart = failRunStartTime || ts;
                    incidentsCount++;
                }
            } else {
                // éxito
                successRun++;
                failRun = 0;
                failRunStartTime = null;

                // si estamos en caída y alcanzamos 10 éxitos, finaliza la caída
                if (inOutage && successRun >= 10) {
                    const outageEnd = lastFailureTime || ts; // fin en el último fallo previo a la racha de éxitos

                    // calcular duración
                    const start = new Date(outageStart);
                    const end = new Date(outageEnd);
                    const durationMs = Math.max(0, end - start);
                    const hours = Math.floor(durationMs / (1000 * 60 * 60));
                    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
                    let durationString = '';
                    if (hours > 0) durationString += `${hours}h `;
                    if (minutes > 0) durationString += `${minutes}m `;
                    durationString += `${seconds}s`;

                    intervals.push({
                        downtime_start: outageStart,
                        downtime_end: outageEnd,
                        downtime_duration: durationString.trim(),
                        status: 'completed',
                        incident_number: incidentsCount
                    });

                    // reset de estado de caída
                    inOutage = false;
                    outageStart = null;
                    lastFailureTime = null;
                }
            }
        }

        // Si terminó el rango aún en caída, crear intervalo activo
        if (inOutage && outageStart) {
            const outageEnd = lastFailureTime || endDate;
            const start = new Date(outageStart);
            const end = new Date(outageEnd);
            const durationMs = Math.max(0, end - start);
            const hours = Math.floor(durationMs / (1000 * 60 * 60));
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
            let durationString = '';
            if (hours > 0) durationString += `${hours}h `;
            if (minutes > 0) durationString += `${minutes}m `;
            durationString += `${seconds}s`;

            intervals.push({
                downtime_start: outageStart,
                downtime_end: outageEnd,
                downtime_duration: durationString.trim(),
                status: activeOutageAtStart ? 'ongoing_throughout' : 'ongoing_started',
                incident_number: incidentsCount
            });
        }
        
        // Si después de revisar, no encontramos caídas, pero todos son fallos, 
        // se trata de un periodo de caída completa
        if (intervals.length === 0 && allFailures && pingData.length >= 20) {
            intervals.push({
                downtime_start: startDate,
                downtime_end: endDate,
                downtime_duration: 'Todo el período',
                status: 'complete_outage',
                message: 'Caída durante todo el período analizado',
                incident_number: 1
            });
        }
        
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
        
        // Calcular downtime_count usando la misma lógica que ping_history
        let downtimeCount = 0;
        let consecutiveFailures = 0;
        
        for (let i = 0; i < pingData.length; i++) {
            if (pingData[i].success === 0) {
                consecutiveFailures++;
                if (consecutiveFailures === 10) { // 10 fallos consecutivos = 1 downtime
                    downtimeCount++;
                }
            } else {
                consecutiveFailures = 0; // Reset al encontrar un éxito
            }
        }
        
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