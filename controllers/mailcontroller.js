const { sendMailWithRetry } = require('../models/mailretry');

// Variable para el pool de conexiones
let pool = null;

// Configuración de intervalos
let CHECK_INTERVAL = 30000; // valor por defecto, se sobrescribe por config

// Número de minutos consecutivos requeridos para cambio de estado
let CONSECUTIVE_MINUTES_REQUIRED = 4;
let SEQUENCE_WINDOW_MINUTES = 5;

const STATE_UP = 'UP';
const STATE_DOWN = 'DOWN';
const STATE_UNSTABLE = 'UNSTABLE';

// Cache de configuración y estados
let config = {
  tiempo_minimo_entre_correos: 5 * 60 * 1000,
  habilitar_estado_unstable: true,
  enviar_correos_unstable: false,
  debug_logging: true,
  latencia_maxima_aceptable: 1500
};
let hostsStatus = {};

// --- HELPERS PARA ENCONTRAR MOMENTOS EXACTOS DE TRANSICIÓN ---
// Obtener el último ping exitoso antes de una fecha específica
async function getLastSuccessfulPing(ipId, beforeTime) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT fecha, UNIX_TIMESTAMP(fecha) * 1000 as timestamp, 
       CASE WHEN latency IS NOT NULL THEN latency ELSE 0 END as latency
       FROM ping_logs WHERE ip_id = ? AND success = 1 AND fecha < ? ORDER BY fecha DESC LIMIT 1`,
      [ipId, new Date(beforeTime)]
    );
    if (rows.length > 0) {
      return rows[0];
    }
    return { fecha: new Date(beforeTime), timestamp: beforeTime, latency: 0 };
  } finally {
    conn.release();
  }
}

// Obtener el último ping fallido antes de una fecha específica  
async function getLastFailedPing(ipId, beforeTime) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT fecha, UNIX_TIMESTAMP(fecha) * 1000 as timestamp, 
       CASE WHEN latency IS NOT NULL THEN latency ELSE 'timeout' END as latency
       FROM ping_logs WHERE ip_id = ? AND success = 0 AND fecha < ? ORDER BY fecha DESC LIMIT 1`,
      [ipId, new Date(beforeTime)]
    );
    if (rows.length > 0) {
      return rows[0];
    }
    return { fecha: new Date(beforeTime), timestamp: beforeTime, latency: 'timeout' };
  } finally {
    conn.release();
  }
}

// Función para formatear una fecha en formato corto
function formatDate(dateValue) {
  if (!dateValue) return 'No disponible';
  try {
    if (typeof dateValue === 'string') {
      return new Date(dateValue).toLocaleString();
    }
    return dateValue.toLocaleString();
  } catch (error) {
    return 'Fecha inválida';
  }
}

// Inicializa desde la DB
async function initializeHostStates() {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT * FROM host_state');
    for (const row of rows) {
      hostsStatus[row.ip_id] = {
        state: row.state,
        unstableSince: row.unstable_since ? new Date(row.unstable_since).getTime() : null,
        downSince: row.down_since ? new Date(row.down_since).getTime() : null,
        upSince: row.up_since ? new Date(row.up_since).getTime() : null,
        notifySent: row.notify_sent,
        notifyTime: row.notify_sent ? Date.now() : null, // Cuando se envió la última notificación
        lastCheckTime: Date.now(),
        lastStateChange: Date.now() // Cuándo fue el último cambio de estado
      };
    }
    console.log(`Estados inicializados para ${rows.length} hosts`);
  } catch (error) {
    console.error('Error al inicializar estados de host:', error);
  } finally {
    connection.release();
  }
}

// Guardar transición de estado en log
async function logStateTransition(ipId, fromState, toState, details) {
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `INSERT INTO state_transitions (ip_id, from_state, to_state, transition_time, details)
       VALUES (?, ?, ?, NOW(), ?)`,
      [ipId, fromState, toState, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('Error al guardar transición de estado:', error);
  } finally {
    conn.release();
  }
}

// Persiste el cambio de estado
async function persistHostState(ipId, state, unstableSince, downSince, upSince, notifySent) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`
      INSERT INTO host_state (ip_id, state, unstable_since, down_since, up_since, notify_sent)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        state = VALUES(state),
        unstable_since = VALUES(unstable_since),
        down_since = VALUES(down_since),
        up_since = VALUES(up_since),
        notify_sent = VALUES(notify_sent),
        updated_at = CURRENT_TIMESTAMP
    `, [
      ipId,
      state,
      unstableSince ? new Date(unstableSince) : null,
      downSince ? new Date(downSince) : null,
      upSince ? new Date(upSince) : null,
      notifySent
    ]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Error al persistir el estado:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Worker principal
async function startWorker(poolConnection) {
  console.log('Iniciando servicio de monitoreo de estado...');
  
  // Asignar el pool recibido al módulo
  pool = poolConnection;

  // Leer configuración dinámica desde la base de datos
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(
      "SELECT clave, valor FROM config WHERE clave IN ('minutos_consecutivos_requeridos', 'tiempo_ventana_minutos', 'intervalo_revision_minutos', 'tiempo_minimo_entre_correos', 'habilitar_estado_unstable', 'enviar_correos_unstable', 'debug_logging', 'latencia_maxima_aceptable')"
    );
    conn.release();
    rows.forEach(row => {
      switch(row.clave) {
        case 'minutos_consecutivos_requeridos':
          CONSECUTIVE_MINUTES_REQUIRED = parseInt(row.valor) || CONSECUTIVE_MINUTES_REQUIRED;
          break;
        case 'tiempo_ventana_minutos':
          SEQUENCE_WINDOW_MINUTES = parseInt(row.valor) || SEQUENCE_WINDOW_MINUTES;
          break;
        case 'intervalo_revision_minutos':
          CHECK_INTERVAL = (parseInt(row.valor) || (CHECK_INTERVAL/60000)) * 60 * 1000;
          break;
        case 'tiempo_minimo_entre_correos':
          config.tiempo_minimo_entre_correos = (parseInt(row.valor) || 5) * 60 * 1000;
          break;
        case 'habilitar_estado_unstable':
          config.habilitar_estado_unstable = row.valor.toLowerCase() === 'true';
          break;
        case 'enviar_correos_unstable':
          config.enviar_correos_unstable = row.valor.toLowerCase() === 'true';
          break;
        case 'debug_logging':
          config.debug_logging = row.valor.toLowerCase() === 'true';
          break;
        case 'latencia_maxima_aceptable':
          config.latencia_maxima_aceptable = parseInt(row.valor) || config.latencia_maxima_aceptable;
          break;
      }
    });
    if (config.debug_logging) {
      console.log('Configuración dinámica aplicada:', {
        CONSECUTIVE_MINUTES_REQUIRED,
        SEQUENCE_WINDOW_MINUTES,
        CHECK_INTERVAL,
        ...config
      });
    }
  } catch (err) {
    console.error('Error leyendo configuración dinámica N+1:', err);
  }

  await initializeHostStates();
  console.log('Estado inicial de hosts cargado desde DB');

  setInterval(async () => {
    try {
      const connection = await pool.getConnection();
      const [ips] = await connection.query('SELECT id, ip, name FROM ips');
      connection.release();
      await Promise.all(ips.map(host => checkHost(host)));
    } catch (error) {
      console.error('Worker error:', error);
    }
  }, CHECK_INTERVAL);
}

// --- MÁQUINA DE ESTADOS CON TODAS LAS TRANSICIONES ---
// Evalúa la ventana de N+1 minutos y retorna el nuevo estado y los timestamps relevantes
async function evaluateWindowState(ipId, now) {
  const windowMinutes = SEQUENCE_WINDOW_MINUTES + 1;
  const windowStart = new Date(now - windowMinutes * 60 * 1000);
  const conn = await pool.getConnection();
  try {
    const [logs] = await conn.query(
      'SELECT success, fecha, UNIX_TIMESTAMP(fecha) * 1000 as timestamp FROM ping_logs WHERE ip_id = ? AND fecha >= ? ORDER BY fecha ASC',
      [ipId, windowStart]
    );
    // Agrupa por minuto
    const minutesMap = new Map();
    logs.forEach(log => {
      const minuteKey = Math.floor(log.timestamp / 60000);
      if (!minutesMap.has(minuteKey)) minutesMap.set(minuteKey, []);
      minutesMap.get(minuteKey).push(log.success);
    });
    // Para cada minuto, si todos los pings son éxito, es minuto OK; si todos son fallo, es minuto FAIL; si mezcla, es MIX
    const minuteStates = [];
    for (const [minute, arr] of minutesMap.entries()) {
      if (arr.every(s => s === 1)) minuteStates.push({ minute, state: 'OK' });
      else if (arr.every(s => s === 0)) minuteStates.push({ minute, state: 'FAIL' });
      else minuteStates.push({ minute, state: 'MIX' });
    }
    // Ordena por minuto ascendente
    minuteStates.sort((a, b) => a.minute - b.minute);
    // Busca bloques de N minutos consecutivos de OK o FAIL
    let blockOK = null, blockFAIL = null;
    for (let i = 0; i <= minuteStates.length - CONSECUTIVE_MINUTES_REQUIRED; i++) {
      const okBlock = minuteStates.slice(i, i + CONSECUTIVE_MINUTES_REQUIRED);
      if (okBlock.every(m => m.state === 'OK')) blockOK = okBlock;
      const failBlock = minuteStates.slice(i, i + CONSECUTIVE_MINUTES_REQUIRED);
      if (failBlock.every(m => m.state === 'FAIL')) blockFAIL = failBlock;
      if (blockOK || blockFAIL) break;
    }
    if (blockOK) {
      // Estado UP, busca el último ping fallido antes del bloque
      const firstBlockMinute = blockOK[0].minute * 60000;
      const lastFailed = await getLastFailedPing(ipId, firstBlockMinute);
      return { state: STATE_UP, lastFailed };
    } else if (blockFAIL) {
      // Estado DOWN, busca el último ping exitoso antes del bloque
      const firstBlockMinute = blockFAIL[0].minute * 60000;
      const lastSuccess = await getLastSuccessfulPing(ipId, firstBlockMinute);
      return { state: STATE_DOWN, lastSuccess };
    } else {
      // Estado UNSTABLE
      return { state: STATE_UNSTABLE };
    }
  } finally {
    conn.release();
  }
}
async function checkHost({ id: ipId, ip, name }) {
  let conn;
  try {
    conn = await pool.getConnection();
    const [[lastLog]] = await conn.query(
      'SELECT success, fecha, UNIX_TIMESTAMP(fecha) * 1000 as timestamp FROM ping_logs WHERE ip_id = ? ORDER BY fecha DESC LIMIT 1',
      [ipId]
    );
    conn.release();
    conn = null;
    if (!lastLog) return;

    const now = lastLog.timestamp;
    
    // Verificar si hay un estado existente para este host, si no, crear uno nuevo
    if (!hostsStatus[ipId]) {
      // Intentar obtener el último estado registrado en la BD
      const connection = await pool.getConnection();
      try {
        const [[row]] = await connection.query('SELECT * FROM host_state WHERE ip_id = ?', [ipId]);
        if (row) {
          hostsStatus[ipId] = {
            state: row.state,
            unstableSince: row.unstable_since ? new Date(row.unstable_since).getTime() : null,
            downSince: row.down_since ? new Date(row.down_since).getTime() : null,
            upSince: row.up_since ? new Date(row.up_since).getTime() : null,
            notifySent: row.notify_sent,
            notifyTime: row.notify_sent ? Date.now() : null, // Cuando se envió la última notificación
            lastCheckTime: Date.now(),
            lastStateChange: Date.now() // Cuándo fue el último cambio de estado
          };
        } else {
          // Si no hay estado en la BD, inicializar como UP
          hostsStatus[ipId] = {
            state: STATE_UP,
            unstableSince: null,
            downSince: null,
            upSince: now,
            notifySent: false,
            notifyTime: null,
            lastCheckTime: Date.now(),
            lastStateChange: Date.now()
          };
          await connection.query(
            `INSERT INTO host_state (ip_id, state, up_since)
             VALUES (?, ?, NOW())`,
            [ipId, STATE_UP]
          );
        }
      } catch (error) {
        console.error('Error al verificar estado en BD:', error);
      } finally {
        connection.release();
      }
    }

    const evalResult = await evaluateWindowState(ipId, now);
    let newState = { ...hostsStatus[ipId] };
    let changed = false;

    switch (evalResult.state) {
      case STATE_UP:
        if (newState.state !== STATE_UP) {
          // Transición a UP
          newState = {
            ...newState,
            state: STATE_UP,
            unstableSince: null,
            downSince: null,
            upSince: now,
            notifySent: false
          };
          changed = true;
          await logStateTransition(ipId, STATE_DOWN, STATE_UP, evalResult);
          // Enviar correo de recuperación si es necesario
          if (newState.notifySent === false && config.enviar_correos_unstable) {
            await sendMailWithRetry(
              `RECUPERADO: ${name} - Sistema Restablecido`,
              `NOTIFICACIÓN DE RECUPERACIÓN DEL SISTEMA\n\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `INFORMACIÓN DEL HOST:\n   • Nombre: ${name}\n   • Dirección IP: ${ip}\n   • Estado: OPERATIVO\n\n` +
              `DETALLES DE LA RECUPERACIÓN:\n   • Último ping fallido: ${formatDate(evalResult.lastFailed ? evalResult.lastFailed.fecha : null)}\n   • Tiempo de respuesta: ${evalResult.lastFailed ? evalResult.lastFailed.latency : 'N/A'}ms\n   • Confirmación de recuperación: ${formatDate(new Date(now))}\n\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `Este es un mensaje automático del Sistema de Monitoreo N+1.\nFecha de generación: ${formatDate(new Date())}`
            );
          }
        }
        break;
      case STATE_DOWN:
        if (newState.state !== STATE_DOWN) {
          // Transición a DOWN
          newState = {
            ...newState,
            state: STATE_DOWN,
            unstableSince: null,
            downSince: now,
            upSince: null,
            notifySent: false
          };
          changed = true;
          await logStateTransition(ipId, STATE_UP, STATE_DOWN, evalResult);
          // Enviar correo de caída si es necesario
          await sendMailWithRetry(
            `ALERTA: ${name} - Sistema Caído`,
            `NOTIFICACIÓN DE CAÍDA DEL SISTEMA\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `INFORMACIÓN DEL HOST:\n   • Nombre: ${name}\n   • Dirección IP: ${ip}\n   • Estado: CAÍDO\n\n` +
            `DETALLES DEL INCIDENTE:\n   • Último ping exitoso: ${formatDate(evalResult.lastSuccess ? evalResult.lastSuccess.fecha : null)}\n   • Tiempo de respuesta: ${evalResult.lastSuccess ? evalResult.lastSuccess.latency : 'N/A'}ms\n   • Confirmación de caída: ${formatDate(new Date(now))}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `Este es un mensaje automático del Sistema de Monitoreo N+1.\nFecha de generación: ${formatDate(new Date())}`
          );
        }
        break;
      default:
        // No acción
        break;
    }
    if (changed) {
      hostsStatus[ipId] = newState;
      console.log(`Estado actual de ${name} (${ip}):`);
      console.log(`  - Estado: ${newState.state}`);
      console.log(`  - Inestabilidad: ${newState.unstableSince ? formatDate(new Date(newState.unstableSince)) : 'NULL'}`);
      console.log(`  - Caída: ${newState.downSince ? formatDate(new Date(newState.downSince)) : 'NULL'}`);
      console.log(`  - Recuperación: ${newState.upSince ? formatDate(newState.upSince ? new Date(newState.upSince) : null) : 'NULL'}`);
      console.log(`  - Notificación: ${newState.notifySent || 'NULL'}`);
      await persistHostState(
        ipId,
        newState.state,
        newState.unstableSince,
        newState.downSince,
        newState.upSince,
        newState.notifySent
      );
    }
  } catch (error) {
    console.error(`Error procesando el host ${name} (${ip}):`, error);
  } finally {
    if (conn) conn.release();
  }
}

// Exportar la función principal para que pueda ser utilizada en server.js
module.exports = { startWorker };
