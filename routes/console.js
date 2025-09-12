const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/console/info/:ipId - Obtener información de consola para una IP específica
router.get('/info/:ipId', async (req, res) => {
    try {
        const { ipId } = req.params;
        
        const [result] = await pool.execute(`
            SELECT 
                l.id,
                l.ip_id,
                l.sucursal,
                l.expiracion,
                l.mac,
                l.url,
                l.firmware,
                l.firmware_last,
                l.firmware_default,
                l.serie,
                l.modelo,
                l.version,
                l.fecha,
                i.name as sucursal_nombre,
                i.ip as ip_address
            FROM licencia l
            LEFT JOIN ips i ON l.ip_id = i.id
            WHERE l.ip_id = ?
            ORDER BY l.fecha DESC
            LIMIT 1
        `, [ipId]);
        
        if (result.length === 0) {
            return res.json({
                success: true,
                data: {
                    modelo: null,
                    version: null,
                    mac: null,
                    serie: null,
                    firmware: null,
                    exists: false
                }
            });
        }
        
        const consoleInfo = result[0];
        
        res.json({
            success: true,
            data: {
                modelo: consoleInfo.modelo,
                version: consoleInfo.version,
                mac: consoleInfo.mac,
                serie: consoleInfo.serie,
                firmware: consoleInfo.firmware,
                url: consoleInfo.url,
                expiracion: consoleInfo.expiracion,
                firmware_last: consoleInfo.firmware_last,
                firmware_default: consoleInfo.firmware_default,
                sucursal: consoleInfo.sucursal,
                sucursal_nombre: consoleInfo.sucursal_nombre,
                ip_address: consoleInfo.ip_address,
                fecha: consoleInfo.fecha,
                exists: true
            }
        });
        
    } catch (error) {
        console.error('Error getting console info:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al obtener información de consola', 
            details: error.message 
        });
    }
});

// GET /api/console/all - Obtener información de todas las consolas (para administración)
router.get('/all', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            sucursal = '', 
            modelo = '',
            estado = '' // para filtrar por firmware actualizado o no
        } = req.query;
        
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));
        const offset = (pageNum - 1) * limitNum;
        
        let whereClause = '1=1';
        const params = [];
        
        if (sucursal && sucursal.trim()) {
            whereClause += ' AND (i.name LIKE ? OR i.ip LIKE ?)';
            params.push(`%${sucursal}%`, `%${sucursal}%`);
        }
        
        if (modelo && modelo.trim()) {
            whereClause += ' AND l.modelo LIKE ?';
            params.push(`%${modelo}%`);
        }
        
        if (estado && estado.trim()) {
            if (estado === 'actualizado') {
                whereClause += ' AND (l.firmware = l.firmware_last OR l.firmware = l.firmware_default)';
            } else if (estado === 'desactualizado') {
                whereClause += ' AND (l.firmware != l.firmware_last AND l.firmware != l.firmware_default)';
            }
        }
        
        // Subconsulta para obtener solo la entrada más reciente por ip_id
        const query = `
            SELECT 
                l.id,
                l.ip_id,
                l.sucursal,
                l.expiracion,
                l.mac,
                l.url,
                l.firmware,
                l.firmware_last,
                l.firmware_default,
                l.serie,
                l.modelo,
                l.version,
                l.fecha,
                i.name as sucursal_nombre,
                i.ip as ip_address,
                CASE 
                    WHEN l.firmware = l.firmware_last OR l.firmware = l.firmware_default THEN 'Actualizado'
                    ELSE 'Desactualizado'
                END as estado_firmware
            FROM licencia l
            INNER JOIN (
                SELECT ip_id, MAX(fecha) as max_fecha
                FROM licencia
                GROUP BY ip_id
            ) latest ON l.ip_id = latest.ip_id AND l.fecha = latest.max_fecha
            LEFT JOIN ips i ON l.ip_id = i.id
            WHERE ${whereClause}
            ORDER BY i.name ASC, l.fecha DESC
            LIMIT ${limitNum} OFFSET ${offset}
        `;
        
        const countQuery = `
            SELECT COUNT(DISTINCT l.ip_id) as total
            FROM licencia l
            LEFT JOIN ips i ON l.ip_id = i.id
            WHERE ${whereClause}
        `;
        
        const [data] = await pool.execute(query, params);
        const [countResult] = await pool.execute(countQuery, params);
        
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limitNum);
        
        res.json({
            success: true,
            data,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages
            }
        });
        
    } catch (error) {
        console.error('Error getting all console info:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al obtener información de consolas', 
            details: error.message 
        });
    }
});

// GET /api/console/models - Obtener lista de modelos únicos
router.get('/models', async (req, res) => {
    try {
        const [models] = await pool.execute(`
            SELECT DISTINCT 
                modelo,
                COUNT(*) as cantidad
            FROM licencia 
            WHERE modelo IS NOT NULL AND modelo != ''
            GROUP BY modelo
            ORDER BY modelo ASC
        `);
        
        res.json({
            success: true,
            data: models
        });
        
    } catch (error) {
        console.error('Error getting console models:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al obtener modelos de consola', 
            details: error.message 
        });
    }
});

// GET /api/console/stats - Obtener estadísticas generales de consolas
router.get('/stats', async (req, res) => {
    try {
        const [stats] = await pool.execute(`
            SELECT 
                COUNT(DISTINCT l.ip_id) as total_consolas,
                COUNT(DISTINCT CASE WHEN l.firmware = l.firmware_last OR l.firmware = l.firmware_default THEN l.ip_id END) as consolas_actualizadas,
                COUNT(DISTINCT CASE WHEN l.firmware != l.firmware_last AND l.firmware != l.firmware_default THEN l.ip_id END) as consolas_desactualizadas,
                COUNT(DISTINCT l.modelo) as modelos_diferentes,
                COUNT(DISTINCT CASE WHEN l.expiracion < NOW() THEN l.ip_id END) as licencias_expiradas,
                COUNT(DISTINCT CASE WHEN l.expiracion >= NOW() THEN l.ip_id END) as licencias_vigentes
            FROM licencia l
            INNER JOIN (
                SELECT ip_id, MAX(fecha) as max_fecha
                FROM licencia
                GROUP BY ip_id
            ) latest ON l.ip_id = latest.ip_id AND l.fecha = latest.max_fecha
        `);
        
        const statsData = stats[0] || {};
        
        res.json({
            success: true,
            data: {
                total_consolas: parseInt(statsData.total_consolas || 0),
                consolas_actualizadas: parseInt(statsData.consolas_actualizadas || 0),
                consolas_desactualizadas: parseInt(statsData.consolas_desactualizadas || 0),
                modelos_diferentes: parseInt(statsData.modelos_diferentes || 0),
                licencias_expiradas: parseInt(statsData.licencias_expiradas || 0),
                licencias_vigentes: parseInt(statsData.licencias_vigentes || 0),
                porcentaje_actualizadas: statsData.total_consolas > 0 ? 
                    ((statsData.consolas_actualizadas / statsData.total_consolas) * 100).toFixed(1) : 0
            }
        });
        
    } catch (error) {
        console.error('Error getting console stats:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al obtener estadísticas de consolas', 
            details: error.message 
        });
    }
});

module.exports = router;
