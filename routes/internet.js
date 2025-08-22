const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * GET /api/internet/primary/:ipId
 * Obtiene información del internet primario para una IP específica
 * @param {number} ipId - ID de la IP a consultar
 */
router.get('/primary/:ipId', async (req, res) => {
    const { ipId } = req.params;

    if (!ipId) {
        return res.status(400).json({ error: 'Se requiere ipId' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        
        const query = `
            SELECT 
                ci.proveedor1 as proveedor,
                ci.interfaz1 as puerto,
                ci.tipo1 as configuracion,
                ci.ip1 as ip,
                ci.trazado1 as estado,
                ci.fecha as ultima_revision
            FROM check_internet ci
            WHERE ci.ip_id = ?
            ORDER BY ci.fecha DESC
            LIMIT 1
        `;
        
        const [rows] = await connection.query(query, [ipId]);
        
        if (rows.length === 0) {
            return res.json({
                proveedor: 'N/A',
                puerto: 'N/A',
                configuracion: 'N/A',
                ip: 'N/A',
                estado: 'N/A',
                ultima_revision: null
            });
        }
        
        res.json(rows[0]);
    } catch (err) {
        console.error('Error al obtener información de internet primario:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * GET /api/internet/secondary/:ipId
 * Obtiene información del internet secundario para una IP específica
 * @param {number} ipId - ID de la IP a consultar
 */
router.get('/secondary/:ipId', async (req, res) => {
    const { ipId } = req.params;

    if (!ipId) {
        return res.status(400).json({ error: 'Se requiere ipId' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        
        const query = `
            SELECT 
                ci.proveedor2 as proveedor,
                ci.interfaz2 as puerto,
                ci.tipo2 as configuracion,
                ci.ip2 as ip,
                ci.trazado2 as estado,
                ci.fecha as ultima_revision
            FROM check_internet ci
            WHERE ci.ip_id = ?
            ORDER BY ci.fecha DESC
            LIMIT 1
        `;
        
        const [rows] = await connection.query(query, [ipId]);
        
        if (rows.length === 0) {
            return res.json({
                proveedor: 'N/A',
                puerto: 'N/A',
                configuracion: 'N/A',
                ip: 'N/A',
                estado: 'N/A',
                ultima_revision: null
            });
        }
        
        res.json(rows[0]);
    } catch (err) {
        console.error('Error al obtener información de internet secundario:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * GET /api/internet/both/:ipId
 * Obtiene información de ambos internets (primario y secundario) para una IP específica
 * @param {number} ipId - ID de la IP a consultar
 */
router.get('/both/:ipId', async (req, res) => {
    const { ipId } = req.params;

    if (!ipId) {
        return res.status(400).json({ error: 'Se requiere ipId' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        
        const query = `
            SELECT 
                ci.proveedor1 as proveedor_primario,
                ci.interfaz1 as puerto_primario,
                ci.tipo1 as configuracion_primario,
                ci.ip1 as ip_primario,
                ci.trazado1 as estado_primario,
                ci.proveedor2 as proveedor_secundario,
                ci.interfaz2 as puerto_secundario,
                ci.tipo2 as configuracion_secundario,
                ci.ip2 as ip_secundario,
                ci.trazado2 as estado_secundario,
                ci.fecha as ultima_revision
            FROM check_internet ci
            WHERE ci.ip_id = ?
            ORDER BY ci.fecha DESC
            LIMIT 1
        `;
        
        const [rows] = await connection.query(query, [ipId]);
        
        if (rows.length === 0) {
            return res.json({
                primario: {
                    proveedor: 'N/A',
                    puerto: 'N/A',
                    configuracion: 'N/A',
                    ip: 'N/A',
                    estado: 'N/A'
                },
                secundario: {
                    proveedor: 'N/A',
                    puerto: 'N/A',
                    configuracion: 'N/A',
                    ip: 'N/A',
                    estado: 'N/A'
                },
                ultima_revision: null
            });
        }
        
        const data = rows[0];
        
        res.json({
            primario: {
                proveedor: data.proveedor_primario,
                puerto: data.puerto_primario,
                configuracion: data.configuracion_primario,
                ip: data.ip_primario,
                estado: data.estado_primario
            },
            secundario: {
                proveedor: data.proveedor_secundario,
                puerto: data.puerto_secundario,
                configuracion: data.configuracion_secundario,
                ip: data.ip_secundario,
                estado: data.estado_secundario
            },
            ultima_revision: data.ultima_revision
        });
    } catch (err) {
        console.error('Error al obtener información de ambos internets:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * GET /api/internet/history/:ipId
 * Obtiene el historial de cambios de configuración de internet para una IP específica
 * @param {number} ipId - ID de la IP a consultar
 * @param {number} limit - Límite de registros (opcional, default: 10)
 */
router.get('/history/:ipId', async (req, res) => {
    const { ipId } = req.params;
    const { limit = 10 } = req.query;

    if (!ipId) {
        return res.status(400).json({ error: 'Se requiere ipId' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        
        const query = `
            SELECT 
                ci.proveedor1 as proveedor_primario,
                ci.interfaz1 as puerto_primario,
                ci.tipo1 as configuracion_primario,
                ci.ip1 as ip_primario,
                ci.trazado1 as estado_primario,
                ci.proveedor2 as proveedor_secundario,
                ci.interfaz2 as puerto_secundario,
                ci.tipo2 as configuracion_secundario,
                ci.ip2 as ip_secundario,
                ci.trazado2 as estado_secundario,
                ci.fecha as fecha_revision
            FROM check_internet ci
            WHERE ci.ip_id = ?
            ORDER BY ci.fecha DESC
            LIMIT ?
        `;
        
        const [rows] = await connection.query(query, [ipId, parseInt(limit)]);
        
        res.json(rows);
    } catch (err) {
        console.error('Error al obtener historial de internet:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
