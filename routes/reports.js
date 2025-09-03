const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// =================== ENDPOINTS PARA DATOS DE INTERNET ===================

// GET /api/reports/internet-data - Obtener datos de internet con paginación y filtros
router.get('/internet-data', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            sucursal = '',
            proveedor = '',
            estado = '',
            fechaInicio = '',
            fechaFin = ''
        } = req.query;

        // Validar y convertir parámetros de paginación
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 50)); // limitado a 100
        const offset = (pageNum - 1) * limitNum;
        
        // Construir consulta base
        let whereClause = '1=1';
        const params = [];
        
        if (sucursal && sucursal.trim()) {
            whereClause += ' AND (i.name LIKE ? OR i.ip LIKE ?)';

            params.push(`%${sucursal}%`, `%${sucursal}%`);
        }
        
        if (proveedor && proveedor.trim()) {
            whereClause += ' AND (ci.proveedor1 LIKE ? OR ci.proveedor2 LIKE ?)';
            params.push(`%${proveedor}%`, `%${proveedor}%`);
        }
        
        if (estado && estado.trim()) {
            whereClause += ' AND (ci.trazado1 LIKE ? OR ci.trazado2 LIKE ?)';
            params.push(`%${estado}%`, `%${estado}%`);
        }
        
        if (fechaInicio && fechaInicio.trim()) {
            whereClause += ' AND ci.fecha >= ?';
            params.push(fechaInicio);
        }
        
        if (fechaFin && fechaFin.trim()) {
            whereClause += ' AND ci.fecha <= ?';
            params.push(fechaFin);
        }

        // Usar query simple en lugar de prepared statement
        const query = `
            SELECT 
                ci.id,
                i.id as sucursal_id,
                i.name as sucursal_nombre,
                i.ip as sucursal_ip,
                ci.proveedor1 as proveedor_primario,
                ci.interfaz1 as interfaz_primario,
                ci.tipo1   as tipo_primario,
                ci.ip1 as ip_primario,
                ci.trazado1 as estado_primario,
                ci.proveedor2 as proveedor_secundario,
                ci.interfaz2 as interfaz_secundario,
                ci.tipo2   as tipo_secundario,
                ci.ip2 as ip_secundario,
                ci.trazado2 as estado_secundario,
                ci.fecha
            FROM check_internet ci
            LEFT JOIN ips i ON ci.ip_id = i.id
            WHERE ${whereClause}
            ORDER BY ci.fecha DESC
            LIMIT ${limitNum} OFFSET ${offset}
        `;
        
        // Consulta para contar total
        const countQuery = `
            SELECT COUNT(*) as total
            FROM check_internet ci
            LEFT JOIN ips i ON ci.ip_id = i.id
            WHERE ${whereClause}
        `;
        
        const [data] = await pool.execute(query, params);
        const [countResult] = await pool.execute(countQuery, params);
        
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limitNum);
        
        res.json({
            data,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages
            }
        });
        
    } catch (error) {
        console.error('Error getting internet data:', error);
        res.status(500).json({ error: 'Error al obtener datos de internet', details: error.message });
    }
});

// GET /api/reports/sucursales - Obtener lista de sucursales
router.get('/sucursales', async (req, res) => {
    try {
        const [sucursales] = await pool.execute(`
            SELECT DISTINCT id, name, ip 
            FROM ips 
            WHERE name IS NOT NULL AND name != ''
            ORDER BY name
        `);
        
        res.json(sucursales);
    } catch (error) {
        console.error('Error getting sucursales:', error);
        res.status(500).json({ error: 'Error al obtener sucursales' });
    }
});

// GET /api/reports/proveedores-internet - Obtener tabla completa de proveedores de internet
router.get('/proveedores-internet', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            sucursal = '',
            proveedor_primario = '',
            proveedor_secundario = ''
        } = req.query;
        
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) === 0 ? 999999 : (parseInt(limit) || 20);
        const offset = (pageNum - 1) * limitNum;
        
        let whereClause = '1=1';
        const params = [];
        
        // Filtros de búsqueda
        if (sucursal) {
            whereClause += ' AND (i.name LIKE ? OR pi.sucursal_id = ?)';
            params.push(`%${sucursal}%`, sucursal);
        }
        
        if (proveedor_primario) {
            whereClause += ' AND pi.proveedor_primario LIKE ?';
            params.push(`%${proveedor_primario}%`);
        }
        
        if (proveedor_secundario) {
            whereClause += ' AND pi.proveedor_secundario LIKE ?';
            params.push(`%${proveedor_secundario}%`);
        }
        
        // Consulta principal con JOIN a la tabla ips para obtener nombre de sucursal
        const [proveedores] = await pool.execute(`
            SELECT 
                pi.id,
                pi.sucursal_id,
                i.name as sucursal_nombre,
                pi.proveedor_primario,
                pi.cuenta_primario,
                pi.Instalacion_primario,
                pi.Correo_primario,
                pi.proveedor_secundario,
                pi.cuenta_secundario,
                pi.Instalacion_secundario,
                pi.Correo_secundario,
                pi.Estado,
                pi.Ciudad,
                pi.Direccion,
                pi.maps
            FROM proveedores_internet pi
            LEFT JOIN ips i ON pi.sucursal_id = i.id
            WHERE ${whereClause}
            ORDER BY i.name ASC
            ${limitNum < 999999 ? `LIMIT ${limitNum} OFFSET ${offset}` : ''}
        `, params);
        
        // Consulta para contar total de registros
        const [countResult] = await pool.execute(`
            SELECT COUNT(*) as total
            FROM proveedores_internet pi
            LEFT JOIN ips i ON pi.sucursal_id = i.id
            WHERE ${whereClause}
        `, params);
        
        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / limitNum);
        
        res.json({
            success: true,
            data: proveedores,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalItems,
                totalPages: totalPages
            }
        });
        
    } catch (error) {
        console.error('Error getting proveedores internet:', error);
        res.status(500).json({ error: 'Error al obtener proveedores de internet', details: error.message });
    }
});

// GET /api/reports/proveedores - Obtener lista de proveedores
router.get('/proveedores', async (req, res) => {
    try {
        const [proveedores] = await pool.execute(`
            SELECT DISTINCT proveedor_primario as nombre FROM proveedores_internet
            WHERE proveedor_primario IS NOT NULL
            UNION
            SELECT DISTINCT proveedor_secundario as nombre FROM proveedores_internet
            WHERE proveedor_secundario IS NOT NULL
            ORDER BY nombre
        `);
        
        res.json(proveedores);
    } catch (error) {
        console.error('Error getting proveedores:', error);
        res.status(500).json({ error: 'Error al obtener proveedores' });
    }
});

// GET /api/reports/proveedor-info/:sucursalId - Obtener información del proveedor para una sucursal
router.get('/proveedor-info/:sucursalId', async (req, res) => {
    try {
        const { sucursalId } = req.params;
        
        const [info] = await pool.execute(`
            SELECT * FROM proveedores_internet WHERE sucursal_id = ?
        `, [sucursalId]);
        
        if (info.length === 0) {
            return res.status(404).json({ error: 'Información de proveedor no encontrada' });
        }
        
        res.json(info[0]);
    } catch (error) {
        console.error('Error getting provider info:', error);
        res.status(500).json({ error: 'Error al obtener información del proveedor' });
    }
});

// NUEVO: Endpoint para proveedor-info/:sucursalId - Proveer nombres y cuentas de proveedores para formulario dinámico
router.get('/proveedor-info/:sucursalId', async (req,res)=>{
  const { sucursalId } = req.params;
  try {
    const [rows] = await pool.query(`SELECT proveedor_primario, cuenta_primario, proveedor_secundario, cuenta_secundario FROM proveedores_internet WHERE sucursal_id = ? LIMIT 1`, [sucursalId]);
    if(rows.length===0) return res.json({});
    res.json(rows[0]);
  } catch (e){
    console.error(e);
    res.status(500).json({error:'Error obteniendo proveedores'});
  }
});

// =================== ENDPOINTS PARA GESTIÓN DE REPORTES ===================

// POST /api/reports/crear-reporte - Crear nuevo reporte
// Remove duplicate proveedor-info if present (ensure only one)
// Ajuste: POST crear-reporte sin titulo/descripcion/fecha_incidencia manual
router.post('/crear-reporte', async (req, res) => {
  try {
    if(process.env.NODE_ENV !== 'production'){
      console.log('[REPORTES] Crear reporte payload recibido:', req.body);
    }
    const { sucursal_id, proveedor, prioridad, numero_ticket } = req.body;
    if(!sucursal_id || !proveedor){
      return res.status(400).json({ success:false, error:'Faltan campos obligatorios sucursal_id o proveedor' })
    }
    const proveedorNorm = proveedor.trim().toLowerCase();
    const [provRows] = await pool.execute(`SELECT proveedor_primario, proveedor_secundario FROM proveedores_internet WHERE sucursal_id = ? LIMIT 1`, [sucursal_id]);
    if(!provRows.length){
        return res.status(400).json({ error: 'No hay configuración de proveedores para la sucursal' });
    }
    const pr = provRows[0];
    let tipo_internet = '';
    if(pr.proveedor_primario && pr.proveedor_primario.toLowerCase() === proveedorNorm) tipo_internet = 'primario';
    else if(pr.proveedor_secundario && pr.proveedor_secundario.toLowerCase() === proveedorNorm) tipo_internet = 'secundario';
    else tipo_internet = 'otro';
    // titulo y descripcion deprecados: insertar vacío solo si columnas NOT NULL existen
    const [result] = await pool.execute(`
        INSERT INTO reportes_internet (
            sucursal_id, tipo_internet, proveedor, titulo, descripcion, prioridad, numero_ticket, estado, fecha_reporte, fecha_incidencia
        ) VALUES (?,?,?,?,?,?,?, 'abierto', NOW(), NOW())
    `, [sucursal_id, tipo_internet, proveedor.trim(), '', '', prioridad, numero_ticket]);
    res.json({ id: result.insertId, message: 'Reporte creado', tipo_internet });
  } catch (error) {
      console.error('Error creando reporte:', error.code, error.sqlMessage, error.sql);
      res.status(500).json({ error: 'Error al crear reporte', code: error.code, detalle: error.sqlMessage });
  }
});

// GET /api/reports/reportes - Obtener lista de reportes
// Interpretar estado=abiertos para filtrar != concluido
router.get('/reportes', async (req, res) => {
    try {
        const { page = 1, limit = 20, estado = '', sucursal = '', proveedor = '' } = req.query;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 20;
        const offset = (pageNum - 1) * limitNum;
        let whereClause = '1=1';
        const params = [];
        if (estado) {
            if(estado === 'abiertos') { 
                // abiertos: cualquier estado diferente de cerrado/concluido (legacy)
                whereClause += ' AND (ri.estado IS NULL OR ri.estado NOT IN ("cerrado","concluido"))'; 
            }
            else if(estado === 'cerrado' || estado === 'concluido') { 
                // mostrar ambos por compatibilidad
                whereClause += ' AND ri.estado IN ("cerrado","concluido")';
            }
            else { 
                whereClause += ' AND ri.estado = ?'; params.push(estado); 
            }
        }
        if (sucursal) { whereClause += ' AND (i.name LIKE ? OR i.ip LIKE ?)'; params.push(`%${sucursal}%`,`%${sucursal}%`); }
        if (proveedor) { whereClause += ' AND ri.proveedor LIKE ?'; params.push(`%${proveedor}%`); }
                const [reportes] = await pool.execute(`
                        SELECT 
                            ri.id, ri.sucursal_id, ri.tipo_internet, ri.proveedor, ri.prioridad, ri.numero_ticket,
                            ri.estado,
                            ri.fecha_reporte, ri.fecha_incidencia, ri.fecha_resolucion,
                            i.name as sucursal_nombre,
                            CASE WHEN ri.tipo_internet='primario' THEN pi.cuenta_primario WHEN ri.tipo_internet='secundario' THEN pi.cuenta_secundario ELSE NULL END AS cuenta
                        FROM reportes_internet ri
                        LEFT JOIN ips i ON ri.sucursal_id = i.id
                        LEFT JOIN proveedores_internet pi ON pi.sucursal_id = ri.sucursal_id
                        WHERE ${whereClause}
                        ORDER BY ri.fecha_reporte DESC
                        LIMIT ${limitNum} OFFSET ${offset}
                `, params);
        const [countResult] = await pool.execute(`
            SELECT COUNT(*) as total FROM reportes_internet ri LEFT JOIN ips i ON ri.sucursal_id=i.id WHERE ${whereClause}
        `, params);
        const total = countResult[0].total;
        res.json({ data: reportes, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total/limitNum) } });
    } catch (error) {
        console.error('Error obteniendo reportes:', error.code, error.sqlMessage);
        res.status(500).json({ error: 'Error al obtener reportes', code: error.code, detalle: error.sqlMessage });
    }
});

// GET /api/reports/reporte/:id - Obtener reporte específico
router.get('/reporte/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [reporte] = await pool.execute(`
            SELECT 
                ri.*,
                i.name as sucursal_nombre
            FROM reportes_internet ri
            LEFT JOIN ips i ON ri.sucursal_id = i.id
            WHERE ri.id = ?
        `, [id]);
        
        if (reporte.length === 0) {
            return res.status(404).json({ error: 'Reporte no encontrado' });
        }
        
        res.json(reporte[0]);
    } catch (error) {
        console.error('Error getting report:', error);
        res.status(500).json({ error: 'Error al obtener el reporte' });
    }
});

// PUT /api/reports/reporte/:id - Actualizar reporte
router.put('/reporte/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateFields = req.body;
        
        // Campos permitidos para actualizar
        const allowedFields = [
            'titulo', 'descripcion', 'prioridad', 'estado', 
            'numero_ticket', 'fecha_resolucion'
        ];
        
        const fieldsToUpdate = Object.keys(updateFields).filter(field => allowedFields.includes(field));
        
        if (fieldsToUpdate.length === 0) {
            return res.status(400).json({ error: 'No hay campos válidos para actualizar' });
        }
        
        // Si se está marcando como resuelto o cerrado, agregar fecha de resolución
        if (updateFields.estado === 'resuelto' || updateFields.estado === 'cerrado') {
            updateFields.fecha_resolucion = new Date();
            fieldsToUpdate.push('fecha_resolucion');
        }
        
        const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
        const values = fieldsToUpdate.map(field => updateFields[field]);
        
        await pool.execute(`
            UPDATE reportes_internet 
            SET ${setClause}
            WHERE id = ?
        `, [...values, id]);
        
        res.json({ message: 'Reporte actualizado exitosamente' });
        
    } catch (error) {
        console.error('Error updating report:', error);
        res.status(500).json({ error: 'Error al actualizar el reporte' });
    }
});

// DELETE /api/reports/reporte/:id - Eliminar reporte
router.delete('/reporte/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await pool.execute('DELETE FROM reportes_internet WHERE id = ?', [id]);
        
        res.json({ message: 'Reporte eliminado exitosamente' });
    } catch (error) {
        console.error('Error deleting report:', error);
        res.status(500).json({ error: 'Error al eliminar el reporte' });
    }
});

// POST /api/reports/reporte/:id/concluir - mover reporte a tabla de concluidos y eliminar de activos
router.post('/reporte/:id/concluir', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.execute(`UPDATE reportes_internet SET estado='concluido', fecha_resolucion=NOW() WHERE id=?`, [id]);
        if(result.affectedRows===0) return res.status(404).json({ error: 'Reporte no encontrado' });
        res.json({ message: 'Reporte concluido' });
    } catch (err){
        console.error('Error concluyendo reporte:', err);
        res.status(500).json({ error: 'Error al concluir reporte' });
    }
});

module.exports = router;