/**
 * NRDP Routes - Endpoints compatibles con NSClient++ NRDP
 * Implementa el protocolo NRDP para recibir métricas pasivas
 */

const express = require('express');
const router = express.Router();
const { processCheckResults, getServerStatus, getServerStats } = require('../services/nrdpProcessor');
const { getGroupedMetrics } = require('../services/metricsAggregator');
const pool = require('../config/db');
const { requireApiKey } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

/**
 * Endpoint NRDP principal - Compatible con NSClient++
 * POST /api/nrdp
 */
router.post('/nrdp', validate([(req) => (!req.body.token ? { field: 'token', message: 'token requerido' } : null), (req) => (req.body.cmd && typeof req.body.cmd !== 'string' ? { field: 'cmd', message: 'cmd inválido' } : null)]), async (req, res, next) => {
  try {
    // Log detallado de la petición recibida
    console.log('=== NRDP Request Received ===');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Body keys:', Object.keys(req.body));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('============================');
    
    const { token, cmd, xml, json, XMLDATA } = req.body;
    
    // Validar token
    if (!token) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Token required' 
      });
    }
    
    // Verificar token en BD
    const conn = await pool.getConnection();
    const [[tokenRow]] = await conn.query(
      'SELECT id, is_active FROM nrdp_tokens WHERE token = ?',
      [token]
    );
    conn.release();
    
    if (!tokenRow || !tokenRow.is_active) {
      console.warn(`Invalid NRDP token attempt: ${token.substring(0, 10)}...`);
      return res.status(403).json({ 
        status: 'error', 
        message: 'Invalid or inactive token' 
      });
    }
    
    // Actualizar last_used del token
    pool.query(
      'UPDATE nrdp_tokens SET last_used = NOW() WHERE id = ?',
      [tokenRow.id]
    ).catch(err => console.error('Error updating token last_used:', err));
    
    // Procesar comando
    if (cmd === 'submitcheck') {
      let checkResults;
      
      // NSClient++ puede enviar en diferentes formatos
      if (XMLDATA) {
        // Formato XML (NSClient++ por defecto)
        const xml2js = require('xml2js');
        const parser = new xml2js.Parser({ explicitArray: false });
        
        try {
          const parsed = await parser.parseStringPromise(XMLDATA);
          
          // Convertir XML a formato JSON esperado
          checkResults = { checkresults: [] };
          
          if (parsed && parsed.checkresults && parsed.checkresults.checkresult) {
            const results = Array.isArray(parsed.checkresults.checkresult) 
              ? parsed.checkresults.checkresult 
              : [parsed.checkresults.checkresult];
            
            checkResults.checkresults = results.map(cr => ({
              checkresult: { type: cr.$.type || 'service' },
              hostname: cr.hostname,
              servicename: cr.servicename,
              state: cr.state,
              output: cr.output
            }));
          }
        } catch (e) {
          console.error('XML parse error:', e);
          return res.status(400).json({ 
            status: 'error', 
            message: 'Invalid XML format',
          });
        }
      } else if (json) {
        // Formato JSON
        try {
          checkResults = typeof json === 'string' ? JSON.parse(json) : json;
        } catch (e) {
          console.error('JSON parse error:', e);
          return res.status(400).json({ 
            status: 'error', 
            message: 'Invalid JSON format',
          });
        }
      } else if (xml) {
        // Parámetro xml (alternativo a XMLDATA)
        const xml2js = require('xml2js');
        const parser = new xml2js.Parser({ explicitArray: false });
        
        try {
          const parsed = await parser.parseStringPromise(xml);
          
          checkResults = { checkresults: [] };
          
          if (parsed && parsed.checkresults && parsed.checkresults.checkresult) {
            const results = Array.isArray(parsed.checkresults.checkresult) 
              ? parsed.checkresults.checkresult 
              : [parsed.checkresults.checkresult];
            
            checkResults.checkresults = results.map(cr => ({
              checkresult: { type: cr.$.type || 'service' },
              hostname: cr.hostname,
              servicename: cr.servicename,
              state: cr.state,
              output: cr.output
            }));
          }
        } catch (e) {
          console.error('XML parse error:', e);
          return res.status(400).json({ 
            status: 'error', 
            message: 'Invalid XML format',
          });
        }
      } else {
        return res.status(400).json({ 
          status: 'error', 
          message: 'Missing XMLDATA or json parameter' 
        });
      }
      
      // Validar estructura básica
      if (!checkResults || !checkResults.checkresults) {
        console.error('Invalid checkresults structure:', checkResults);
        return res.status(400).json({
          status: 'error',
          message: 'Invalid checkresults structure. Expected: {"checkresults": [...]}'
        });
      }
      
      // Procesar resultados
      const result = await processCheckResults(checkResults);
      
      console.log(`NRDP: Processed ${result.count}/${result.total} checks from ${result.servers_updated} server(s)`);
      
      return res.json({
        status: 'OK',
        message: `Processed ${result.count} check result(s)`,
        data: {
          processed: result.count,
          total: result.total,
          servers_updated: result.servers_updated,
          errors: result.errors
        }
      });
    }
    
    // Comando no reconocido
    res.status(400).json({ 
      status: 'error', 
      message: `Unknown command: ${cmd}. Supported: submitcheck` 
    });
    
  } catch (err) {
    return next(err);
  }
});

/**
 * Listar todos los servidores
 * GET /api/nrdp/servers
 */
router.get('/nrdp/servers', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [servers] = await conn.query(`
      SELECT 
        id, hostname, ip_address, description, 
        os, location, is_active, last_seen,
        created_at, updated_at,
        TIMESTAMPDIFF(MINUTE, last_seen, NOW()) as minutes_since_last_seen,
        CASE 
          WHEN last_seen IS NULL THEN 'never'
          WHEN TIMESTAMPDIFF(MINUTE, last_seen, NOW()) < 10 THEN 'online'
          WHEN TIMESTAMPDIFF(MINUTE, last_seen, NOW()) < 30 THEN 'warning'
          ELSE 'offline'
        END as status
      FROM servers 
      WHERE is_active = 1
      ORDER BY last_seen DESC
    `);
    conn.release();
    
    res.json(servers);
  } catch (err) {
    console.error('Error fetching servers:', err);
    res.status(500).json({ 
      error: 'Internal server error',
    });
  }
});

/**
 * Obtener detalles de un servidor por hostname
 * GET /api/nrdp/servers/:hostname
 */
router.get('/nrdp/servers/:hostname', async (req, res) => {
  try {
    const { hostname } = req.params;
    const status = await getServerStatus(hostname);
    
    if (!status) {
      return res.status(404).json({ 
        error: 'Server not found',
        hostname: hostname
      });
    }
    
    res.json(status);
  } catch (err) {
    console.error('Error fetching server status:', err);
    res.status(500).json({ 
      error: 'Internal server error',
    });
  }
});

/**
 * Obtener métricas de un servidor
 * GET /api/nrdp/servers/:hostname/metrics
 */
router.get('/nrdp/servers/:hostname/metrics', validate([(req) => (!req.params.hostname ? { field: 'hostname', message: 'hostname requerido' } : null), (req) => { if (req.query.limit === undefined) return null; const limit = Number.parseInt(req.query.limit, 10); if (!Number.isInteger(limit) || limit < 1 || limit > 1000) return { field: 'limit', message: 'limit inválido' }; req.query.limit = limit; return null; }]), async (req, res, next) => {
  try {
    const { hostname } = req.params;
    const { limit = 100, service } = req.query;
    
    const conn = await pool.getConnection();
    
    // Obtener server_id
    const [[server]] = await conn.query(
      'SELECT id FROM servers WHERE hostname = ?',
      [hostname]
    );
    
    if (!server) {
      conn.release();
      return res.status(404).json({ 
        error: 'Server not found',
        hostname: hostname
      });
    }
    
    // Construir query con filtro opcional de servicio
    let query = `
      SELECT 
        sm.id, sm.service_name, sm.state, 
        sm.output, sm.perfdata, sm.received_at,
        s.hostname, s.ip_address
      FROM server_metrics sm
      INNER JOIN servers s ON sm.server_id = s.id
      WHERE sm.server_id = ?
    `;
    
    const params = [server.id];
    
    if (service) {
      query += ' AND sm.service_name = ?';
      params.push(service);
    }
    
    query += ' ORDER BY sm.received_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const [metrics] = await conn.query(query, params);
    conn.release();
    
    res.json(metrics);
  } catch (err) {
    console.error('Error fetching metrics:', err);
    res.status(500).json({ 
      error: 'Internal server error',
    });
  }
});

/**
 * Obtener perfdata parseado de un servidor
 * GET /api/nrdp/servers/:hostname/perfdata
 */
router.get('/nrdp/servers/:hostname/perfdata', validate([(req) => (!req.params.hostname ? { field: 'hostname', message: 'hostname requerido' } : null), (req) => { if (req.query.limit === undefined) return null; const limit = Number.parseInt(req.query.limit, 10); if (!Number.isInteger(limit) || limit < 1 || limit > 1000) return { field: 'limit', message: 'limit inválido' }; req.query.limit = limit; return null; }]), async (req, res, next) => {
  try {
    const { hostname } = req.params;
    const { limit = 100, metric_name, service_name } = req.query;
    
    const conn = await pool.getConnection();
    
    // Obtener server_id
    const [[server]] = await conn.query(
      'SELECT id FROM servers WHERE hostname = ?',
      [hostname]
    );
    
    if (!server) {
      conn.release();
      return res.status(404).json({ 
        error: 'Server not found',
        hostname: hostname
      });
    }
    
    // Construir query con filtros opcionales
    let query = `
      SELECT 
        id, service_name, metric_name, value, uom,
        warning, critical, min_value, max_value, timestamp
      FROM server_perfdata_parsed
      WHERE server_id = ?
    `;
    
    const params = [server.id];
    
    if (metric_name) {
      query += ' AND metric_name = ?';
      params.push(metric_name);
    }
    
    if (service_name) {
      query += ' AND service_name = ?';
      params.push(service_name);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const [perfdata] = await conn.query(query, params);
    conn.release();
    
    res.json(perfdata);
  } catch (err) {
    console.error('Error fetching perfdata:', err);
    res.status(500).json({ 
      error: 'Internal server error',
    });
  }
});

/**
 * Obtener estadísticas de un servidor
 * GET /api/nrdp/servers/:hostname/stats
 */
router.get('/nrdp/servers/:hostname/stats', validate([(req) => (!req.params.hostname ? { field: 'hostname', message: 'hostname requerido' } : null), (req) => { if (req.query.hours === undefined) return null; const hours = Number.parseInt(req.query.hours, 10); if (!Number.isInteger(hours) || hours < 1 || hours > 720) return { field: 'hours', message: 'hours inválido' }; req.query.hours = hours; return null; }]), async (req, res, next) => {
  try {
    const { hostname } = req.params;
    const { hours = 24 } = req.query;
    
    const conn = await pool.getConnection();
    
    // Obtener server_id
    const [[server]] = await conn.query(
      'SELECT id FROM servers WHERE hostname = ?',
      [hostname]
    );
    
    if (!server) {
      conn.release();
      return res.status(404).json({ 
        error: 'Server not found',
        hostname: hostname
      });
    }
    
    conn.release();
    
    const stats = await getServerStats(server.id, parseInt(hours));
    
    res.json({
      hostname: hostname,
      period_hours: parseInt(hours),
      stats: stats
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ 
      error: 'Internal server error',
    });
  }
});

/**
 * Obtener servicios únicos de un servidor
 * GET /api/nrdp/servers/:hostname/services
 */
router.get('/nrdp/servers/:hostname/services', async (req, res) => {
  try {
    const { hostname } = req.params;
    
    const conn = await pool.getConnection();
    
    const [services] = await conn.query(`
      SELECT DISTINCT 
        sm.service_name,
        MAX(sm.received_at) as last_check,
        (SELECT state FROM server_metrics sm2 
         WHERE sm2.server_id = s.id 
           AND sm2.service_name = sm.service_name 
         ORDER BY received_at DESC LIMIT 1) as last_state
      FROM server_metrics sm
      INNER JOIN servers s ON sm.server_id = s.id
      WHERE s.hostname = ?
      GROUP BY sm.service_name
      ORDER BY sm.service_name
    `, [hostname]);
    
    conn.release();
    
    res.json(services);
  } catch (err) {
    console.error('Error fetching services:', err);
    res.status(500).json({ 
      error: 'Internal server error',
    });
  }
});

/**
 * Obtener métricas agrupadas por categoría
 * GET /api/nrdp/servers/:hostname/metrics/grouped
 */
router.get('/nrdp/servers/:hostname/metrics/grouped', async (req, res) => {
  try {
    const { hostname } = req.params;
    const grouped = await getGroupedMetrics(hostname);
    
    if (!grouped) {
      return res.status(404).json({ 
        error: 'Server not found',
        hostname: hostname
      });
    }
    
    res.json(grouped);
  } catch (err) {
    console.error('Error fetching grouped metrics:', err);
    res.status(500).json({ 
      error: 'Internal server error',
    });
  }
});

/**
 * Actualizar información de un servidor
 * PATCH /api/nrdp/servers/:hostname
 */
router.patch('/nrdp/servers/:hostname', requireApiKey, validate([(req) => (!req.params.hostname ? { field: 'hostname', message: 'hostname requerido' } : null), (req) => { if (req.body.ip_address === undefined) return null; const ipRegex = /^(?:\d{1,3}\.){3}\d{1,3}$/; return ipRegex.test(req.body.ip_address) ? null : { field: 'ip_address', message: 'ip_address inválida' }; }]), async (req, res, next) => {
  try {
    const { hostname } = req.params;
    const { ip_address, description, os, location } = req.body;
    
    const updates = [];
    const values = [];
    
    if (ip_address !== undefined) {
      updates.push('ip_address = ?');
      values.push(ip_address);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (os !== undefined) {
      updates.push('os = ?');
      values.push(os);
    }
    if (location !== undefined) {
      updates.push('location = ?');
      values.push(location);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ 
        error: 'No fields to update',
        allowed_fields: ['ip_address', 'description', 'os', 'location']
      });
    }
    
    values.push(hostname);
    
    const conn = await pool.getConnection();
    const [result] = await conn.query(
      `UPDATE servers SET ${updates.join(', ')}, updated_at = NOW() WHERE hostname = ?`,
      values
    );
    conn.release();
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        error: 'Server not found',
        hostname: hostname
      });
    }
    
    res.json({ 
      success: true,
      message: 'Server updated successfully',
      hostname: hostname
    });
  } catch (err) {
    console.error('Error updating server:', err);
    res.status(500).json({ 
      error: 'Internal server error',
    });
  }
});

module.exports = router;
