const express = require('express');
const router = express.Router();
const internetRepository = require('../repositories/internetRepository');
const { parsePagination } = require('../utils/pagination');

const HISTORY_LIMIT_DEFAULT = 20;
const HISTORY_LIMIT_MAX = 200;

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

    try {
        const data = await internetRepository.getLatestInternetByIp(ipId);
        
        if (!data) {
            return res.json({
                proveedor: 'N/A',
                puerto: 'N/A',
                configuracion: 'N/A',
                ip: 'N/A',
                estado: 'N/A',
                ultima_revision: null
            });
        }
        
        res.json({
            proveedor: data.proveedor_primario,
            puerto: data.puerto_primario,
            configuracion: data.configuracion_primario,
            ip: data.ip_primario,
            estado: data.estado_primario,
            ultima_revision: data.ultima_revision,
        });
    } catch (err) {
        console.error('Error al obtener información de internet primario:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
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

    try {
        const data = await internetRepository.getLatestInternetByIp(ipId);
        
        if (!data) {
            return res.json({
                proveedor: 'N/A',
                puerto: 'N/A',
                configuracion: 'N/A',
                ip: 'N/A',
                estado: 'N/A',
                ultima_revision: null
            });
        }
        
        res.json({
            proveedor: data.proveedor_secundario,
            puerto: data.puerto_secundario,
            configuracion: data.configuracion_secundario,
            ip: data.ip_secundario,
            estado: data.estado_secundario,
            ultima_revision: data.ultima_revision,
        });
    } catch (err) {
        console.error('Error al obtener información de internet secundario:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
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

    try {
        const data = await internetRepository.getLatestInternetByIp(ipId);
        
        if (!data) {
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
    const { limit, offset } = parsePagination(req.query, {
        defaultLimit: HISTORY_LIMIT_DEFAULT,
        maxLimit: HISTORY_LIMIT_MAX,
    });

    if (!ipId) {
        return res.status(400).json({ error: 'Se requiere ipId' });
    }

    try {
        const [items, total] = await Promise.all([
            internetRepository.getInternetHistory({ ipId, limit, offset }),
            internetRepository.countInternetHistory(ipId),
        ]);

        res.json({ items, total, limit, offset });
    } catch (err) {
        console.error('Error al obtener historial de internet:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
