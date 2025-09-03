const { sendMailWithRetry } = require('../models/mailretry');

// Variable para el pool de conexiones
let pool = null;

// Configuración de intervalos
let CHECK_INTERVAL = 30000; // valor por defecto, se sobrescribe por config

// Umbral de tiempo mínimo en recuperación para considerar el sistema como UP (en ms)
const THRESHOLD_UP = 60000; // 60 segundos

// Número de éxitos consecutivos requeridos para considerar el sistema como UP
let CONSECUTIVE_SUCCESSES_REQUIRED = 3;
let CONSECUTIVE_FAILURES_REQUIRED = 3;
let SEQUENCE_WINDOW_MINUTES = 10;
let THRESHOLD_DOWN = 60000; // 60 segundos

// Estados del sistema N+1 (solo 3 estados)
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

// --- FUNCIONES AUXILIARES ---
function formatDuration(ms) {
  // Asegurarse que la duración nunca sea negativa
  ms = Math.max(0, ms);
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
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

// Función para validar timestamps y asegurar que son fechas válidas
function validateTimestamp(timestamp, fallbackTimestamp) {
  if (!timestamp || isNaN(timestamp)) {
    console.warn(`⚠️ Timestamp inválido detectado: ${timestamp}, usando fallback: ${new Date(fallbackTimestamp).toISOString()}`);
    return fallbackTimestamp;
  }
  return timestamp;
}

// Función para determinar si se debe enviar una notificación
function shouldSendNotification(currentState, prevState, prevNotifySent, notificationType) {
  // Si el estado no ha cambiado, no enviar notificación
  if (currentState === prevState) return false;
  
  // Si nunca se ha enviado notificación o es de un tipo diferente, enviar
  if (!prevNotifySent || prevNotifySent !== notificationType) return true;
  
  // Control de frecuencia de notificaciones del mismo tipo
  return false;
}

// --- HELPERS PARA ENCONTRAR MOMENTOS EXACTOS DE TRANSICIÓN ---
// Buscar LOG exacto de UNSTABLE (primer ping fallido)
async function getExactUnstableTime(ipId, currentFecha) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT fecha FROM ping_logs WHERE ip_id = ? AND success = 0 AND fecha <= ? ORDER BY fecha DESC LIMIT 1`,
      [ipId, new Date(currentFecha)]
    );
    if (rows.length > 0) {
      return { timestamp: rows[0].fecha.getTime(), fecha: rows[0].fecha };
    }
    return { timestamp: currentFecha, fecha: new Date(currentFecha) };
  } finally {
    conn.release();
  }
}

// Buscar log exacto de DOWN (debe encontrar una secuencia de fallos consecutivos)
async function getExactDownTime(ipId, referenceTime) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT fecha FROM ping_logs WHERE ip_id = ? AND success = 0 AND fecha >= ? ORDER BY fecha ASC LIMIT 1`,
      [ipId, new Date(referenceTime)]
    );
    if (rows.length > 0) {
      return { timestamp: rows[0].fecha.getTime(), fecha: rows[0].fecha };
    }
    return { timestamp: referenceTime, fecha: new Date(referenceTime) };
  } finally {
    conn.release();
  }
}


// Buscar log que confirma UP (debe encontrar una secuencia de éxitos)
async function getExactUpTime(ipId, referenceTime) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT fecha FROM ping_logs WHERE ip_id = ? AND success = 1 AND fecha >= ? ORDER BY fecha ASC LIMIT 1`,
      [ipId, new Date(referenceTime)]
    );
    if (rows.length > 0) {
      return { timestamp: rows[0].fecha.getTime(), fecha: rows[0].fecha };
    }
    return { timestamp: referenceTime, fecha: new Date(referenceTime) };
  } finally {
    conn.release();
  }
}

// Buscar el log exacto de recuperación desde UNSTABLE si nunca hubo caída
// Buscar el primer ping exitoso después de inestabilidad (para UNSTABLE → UP)
async function getExactUPTimeFromUnstable(ipId, unstableSince) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT fecha FROM ping_logs WHERE ip_id = ? AND success = 1 AND fecha >= ? ORDER BY fecha ASC LIMIT 1`,
      [ipId, new Date(unstableSince)]
    );
    if (rows.length > 0) {
      return { timestamp: rows[0].fecha.getTime(), fecha: rows[0].fecha };
    }
    return { timestamp: unstableSince, fecha: new Date(unstableSince) };
  } finally {
    conn.release();
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
      "SELECT clave, valor FROM config WHERE clave IN ('minutos_consecutivos_requeridos', 'tiempo_ventana_minutos', 'fallos_consecutivos_requeridos', 'umbral_caida_minutos', 'intervalo_revision_minutos', 'tiempo_minimo_entre_correos', 'habilitar_estado_unstable', 'enviar_correos_unstable', 'debug_logging', 'latencia_maxima_aceptable')"
    );
    conn.release();
    rows.forEach(row => {
      switch(row.clave) {
        case 'minutos_consecutivos_requeridos':
          CONSECUTIVE_SUCCESSES_REQUIRED = parseInt(row.valor) || CONSECUTIVE_SUCCESSES_REQUIRED;
          break;
        case 'fallos_consecutivos_requeridos':
          CONSECUTIVE_FAILURES_REQUIRED = parseInt(row.valor) || CONSECUTIVE_FAILURES_REQUIRED;
          break;
        case 'tiempo_ventana_minutos':
          SEQUENCE_WINDOW_MINUTES = parseInt(row.valor) || SEQUENCE_WINDOW_MINUTES;
          break;
        case 'umbral_caida_minutos':
          THRESHOLD_DOWN = (parseInt(row.valor) || (THRESHOLD_DOWN/60000)) * 60 * 1000;
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
      console.log('[N+1] Configuración dinámica aplicada:', {
        CONSECUTIVE_SUCCESSES_REQUIRED,
        CONSECUTIVE_FAILURES_REQUIRED,
        SEQUENCE_WINDOW_MINUTES,
        THRESHOLD_DOWN,
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
            notifyTime: row.notify_sent ? Date.now() : null,
            lastCheckTime: now - CHECK_INTERVAL,
            lastStateChange: Date.now()
          };
        } else {
          // Si no hay estado en la BD, iniciar como UP
          hostsStatus[ipId] = {
            state: STATE_UP,
            unstableSince: null,
            downSince: null,
            upSince: now,
            notifySent: null,
            notifyTime: null,
            lastCheckTime: now - CHECK_INTERVAL,
            lastStateChange: Date.now()
          };
        }
      } finally {
        connection.release();
      }
    }
    
    const prev = hostsStatus[ipId];

    const isAlive = lastLog.success.readUInt8 ? lastLog.success.readUInt8(0) === 1 : lastLog.success === 1;
    let changed = false;
    let newState = { ...prev, lastCheckTime: now };

  // Prevenir cambios de estado demasiado frecuentes (debouncing)
  const timeSinceLastStateChange = now - (prev.lastStateChange || 0);
  const minStateChangeInterval = config.intervalo_cambio_estado_segundos || 10 * 1000;
    
    // Verificar si este ping es más reciente que el último cambio de estado
    if (lastLog.timestamp <= prev.lastCheckTime) {
      console.log(`⏭️ Ignorando ping más antiguo para ${name} (${ip}): ${formatDate(lastLog.fecha)}`);
      return;
    }

    switch (prev.state) {
      case STATE_UP:
        // Si hay N fallos consecutivos en la ventana, cambiar a DOWN
        if (!isAlive) {
          const { timestamp: exactDownTime, fecha: exactDownDate } = await getExactDownTime(ipId, now);
          newState = {
            ...newState,
            state: STATE_DOWN,
            downSince: exactDownTime,
            unstableSince: null,
            upSince: prev.upSince,
            notifySent: 'DOWN',
            notifyTime: now,
            lastStateChange: now
          };
          changed = true;
          await logStateTransition(ipId, STATE_UP, STATE_DOWN, {
            upSince: prev.upSince,
            downSince: exactDownTime
          });
          await sendMailWithRetry(
            `Host DOWN. Último UP: ${formatDate(prev.upSince)}`,
            `El host ${name} (${ip}) ha caído. Último ping exitoso: ${formatDate(prev.upSince)}`
          );
        }
        break;
      case STATE_DOWN:
        // Si hay N éxitos consecutivos en la ventana, cambiar a UP
        if (isAlive) {
          const { timestamp: exactUpTime, fecha: exactUpDate } = await getExactUpTime(ipId, prev.downSince);
          newState = {
            ...newState,
            state: STATE_UP,
            upSince: exactUpTime,
            downSince: null,
            unstableSince: null,
            notifySent: 'UP',
            notifyTime: now,
            lastStateChange: now
          };
          changed = true;
          await logStateTransition(ipId, STATE_DOWN, STATE_UP, {
            downSince: prev.downSince,
            upSince: exactUpTime
          });
          await sendMailWithRetry(
            `Host UP. Último DOWN: ${formatDate(prev.downSince)}`,
            `El host ${name} (${ip}) está arriba. Último ping fallido: ${formatDate(prev.downSince)}`
          );
        }
        break;
      case STATE_UNSTABLE:
        // Si aparece bloque de N consecutivos, cambiar a UP o DOWN
        if (isAlive) {
          const { timestamp: exactUpTime } = await getExactUPTimeFromUnstable(ipId, prev.unstableSince);
          newState = {
            ...newState,
            state: STATE_UP,
            upSince: exactUpTime,
            unstableSince: null,
            downSince: null,
            notifySent: null,
            notifyTime: null,
            lastStateChange: now
          };
          changed = true;
          await logStateTransition(ipId, STATE_UNSTABLE, STATE_UP, {
            unstableSince: prev.unstableSince,
            upSince: exactUpTime
          });
        } else {
          const { timestamp: exactDownTime } = await getExactDownTime(ipId, prev.unstableSince);
          newState = {
            ...newState,
            state: STATE_DOWN,
            downSince: exactDownTime,
            unstableSince: null,
            upSince: prev.upSince,
            notifySent: null,
            notifyTime: null,
            lastStateChange: now
          };
          changed = true;
          await logStateTransition(ipId, STATE_UNSTABLE, STATE_DOWN, {
            unstableSince: prev.unstableSince,
            downSince: exactDownTime
          });
        }
        break;
      default:
        // Si no hay bloque de N consecutivos, marcar como UNSTABLE
        newState = {
          ...newState,
          state: STATE_UNSTABLE,
          unstableSince: now,
          lastStateChange: now
        };
        changed = true;
        await logStateTransition(ipId, prev.state, STATE_UNSTABLE, {
          unstableSince: now
        });
        break;
    }

    if (changed) {
      hostsStatus[ipId] = newState;
      console.log(`Estado actual de ${name} (${ip}):`);
      console.log(`  - Estado: ${newState.state}`);
      console.log(`  - Inestabilidad: ${newState.unstableSince ? formatDate(new Date(newState.unstableSince)) : 'NULL'}`);
      console.log(`  - Caída: ${newState.downSince ? formatDate(new Date(newState.downSince)) : 'NULL'}`);
      console.log(`  - Recuperación: ${newState.upSince ? formatDate(new Date(newState.upSince)) : 'NULL'}`);
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
  } catch (err) {
    if (conn) conn.release();
    console.error('Error en checkHost:', err);
  }
}

module.exports = {
  startWorker
};
