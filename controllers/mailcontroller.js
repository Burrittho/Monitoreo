const { sendMailWithRetry } = require('../models/mailretry');

// Variable para el pool de conexiones
let pool = null;

// Configuración de intervalos
const CHECK_INTERVAL = 30000; // 30 segundos

// Estados del sistema N+1 (diferentes del sistema original)
const STATE_UP = 'UP';
const STATE_DOWN = 'DOWN';
const STATE_UNSTABLE = 'UNSTABLE';

// Cache de configuración y estados
let config = {};
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
async function getExactDownTime(ipId, unstableSince) {
  const conn = await pool.getConnection();
  try {
    // Construir LAG y condiciones dinámicamente
    let lagSelect = [];
    let lagConditions = [];

    for (let i = 1; i < CONSECUTIVE_FAILURES_REQUIRED; i++) {
      lagSelect.push(`LAG(success, ${i}) OVER (ORDER BY fecha) AS prev${i}`);
      lagConditions.push(`prev${i} = 0`);
    }

    const innerSelect = `
      SELECT fecha, success,
        ${lagSelect.join(',\n        ')}
      FROM ping_logs
      WHERE ip_id = ?
        AND fecha BETWEEN TIMESTAMPADD(MINUTE, -${SEQUENCE_WINDOW_MINUTES}, ?) AND ?
    `;

    const fullQuery = `
      SELECT fecha FROM (
        ${innerSelect}
      ) t
      WHERE success = 0 AND ${lagConditions.join(' AND ')}
      ORDER BY fecha ASC
      LIMIT 1
    `;

    const [rows] = await conn.query(fullQuery, [ipId, new Date(unstableSince), new Date(unstableSince)]);
    if (rows.length > 0) {
      return { timestamp: rows[0].fecha.getTime(), fecha: rows[0].fecha };
    }
    return { timestamp: unstableSince, fecha: new Date(unstableSince) };
  } finally {
    conn.release();
  }
}

// Buscar log exacto para RECOVERING (primer ping exitoso después de DOWN)
async function getExactRecoveryTime(ipId, downSince) {
  const conn = await pool.getConnection();
  try {
    // Para DOWN → RECOVERING, buscamos simplemente el primer ping exitoso después de la caída
    const [rows] = await conn.query(
      `SELECT fecha FROM ping_logs WHERE ip_id = ? AND success = 1 AND fecha >= ? ORDER BY fecha ASC LIMIT 1`,
      [ipId, new Date(downSince)]
    );
    if (rows.length > 0) {
      return { timestamp: rows[0].fecha.getTime(), fecha: rows[0].fecha };
    }
    return { timestamp: downSince, fecha: new Date(downSince) };
  } finally {
    conn.release();
  }
}

// Buscar log que confirma UP (debe encontrar una secuencia de éxitos)
async function getExactUpTime(ipId, recoveryStartTime) {
  const conn = await pool.getConnection();
  try {
    const lagSelect = [];
    const lagConditions = [];

    for (let i = 1; i < CONSECUTIVE_SUCCESSES_REQUIRED; i++) {
      lagSelect.push(`LAG(success, ${i}) OVER (ORDER BY fecha) AS prev${i}`);
      lagConditions.push(`prev${i} = 1`);
    }

    const innerQuery = `
      SELECT fecha, success,
        ${lagSelect.join(',\n        ')}
      FROM ping_logs
      WHERE ip_id = ?
        AND fecha >= TIMESTAMPADD(MINUTE, -${SEQUENCE_WINDOW_MINUTES}, ?)
        AND fecha >= ?
    `;

    const finalQuery = `
      SELECT fecha FROM (
        ${innerQuery}
      ) t
      WHERE success = 1 AND ${lagConditions.join(' AND ')}
      ORDER BY fecha ASC
      LIMIT 1
    `;

    const [rows] = await conn.query(finalQuery, [ipId, new Date(), new Date(recoveryStartTime)]);
    if (rows.length > 0) {
      return { timestamp: rows[0].fecha.getTime(), fecha: rows[0].fecha };
    }
    return { timestamp: recoveryStartTime, fecha: new Date(recoveryStartTime) };
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
        lastStateChange: Date.now(), // Cuándo fue el último cambio de estado
        recoveryStartTime: null
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
async function persistHostState(ipId, state, unstableSince, downSince, upSince, notifySent, recoveryStartTime) {
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
            lastStateChange: Date.now(),
            recoveryStartTime: null
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
            lastStateChange: Date.now(),
            recoveryStartTime: null
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
    const minStateChangeInterval = 10 * 1000; // 10 segundos mínimo entre cambios de estado
    
    // Verificar si este ping es más reciente que el último cambio de estado
    if (lastLog.timestamp <= prev.lastCheckTime) {
      console.log(`⏭️ Ignorando ping más antiguo para ${name} (${ip}): ${formatDate(lastLog.fecha)}`);
      return;
    }

    switch (prev.state) {
      case STATE_UP:
        if (!isAlive) {
          const { timestamp: exactUnstableTime, fecha: exactUnstableDate } = await getExactUnstableTime(ipId, now);
          
          // Validar que el timestamp de inestabilidad es válido
          const validatedUnstableTime = validateTimestamp(exactUnstableTime, now);
          
          newState = {
            ...newState,
            state: STATE_UNSTABLE,
            unstableSince: validatedUnstableTime,
            notifySent: null,
            lastStateChange: now
          };
          changed = true;
          
          console.log(`🟡 ${name} (${ip}): UP → UNSTABLE - Inicio inestabilidad: ${formatDate(exactUnstableDate)}`);
          
          // Registrar transición
          await logStateTransition(ipId, STATE_UP, STATE_UNSTABLE, {
            unstableSince: validatedUnstableTime,
            pingTime: lastLog.fecha
          });
        }
        break;
      case STATE_UNSTABLE:
        if (isAlive) {
          // Solo procesar si este ping es realmente posterior al cambio de estado
          if (lastLog.timestamp > prev.lastStateChange) {
            const { timestamp: exactUpTime, fecha: exactUpDate } = await getExactUPTimeFromUnstable(ipId, prev.unstableSince);
            
            // Validar timestamp
            const validatedUpTime = validateTimestamp(exactUpTime, now);
            
            // Asegurarse de que el timestamp de UP es posterior al inicio de inestabilidad
            let upTime = validatedUpTime;
            if (prev.unstableSince && upTime < prev.unstableSince) {
              console.warn(`⚠️ Timestamp de recuperación (${formatDate(new Date(upTime))}) anterior a inestabilidad (${formatDate(new Date(prev.unstableSince))})`);
              upTime = Math.max(prev.unstableSince, upTime);
            }
            
            newState = {
              ...newState,
              state: STATE_UP,
              upSince: upTime,
              unstableSince: null,
              downSince: null,
              notifySent: null,
              lastStateChange: now
            };
            changed = true;
            
            // Calcular duración de inestabilidad (asegurando valor positivo)
            const instabilityDuration = prev.unstableSince ? Math.max(0, upTime - prev.unstableSince) : 0;
            
            console.log(`🟢 ${name} (${ip}): UNSTABLE → UP - Recuperado sin llegar a caída: ${formatDate(exactUpDate)}`);
            console.log(`    Duración de inestabilidad: ${formatDuration(instabilityDuration)}`);
            
            // Registrar transición
            await logStateTransition(ipId, STATE_UNSTABLE, STATE_UP, {
              unstableSince: prev.unstableSince,
              upSince: upTime,
              duration: instabilityDuration
            });
          }
        } else {
          // Solo verificar DOWN si ha pasado suficiente tiempo desde la inestabilidad
          const downDuration = prev.unstableSince ? now - prev.unstableSince : 0;
          
          // Validar que la duración es positiva
          if (downDuration >= THRESHOLD_DOWN) {
            const { timestamp: exactDownTime, fecha: exactDownDate } = await getExactDownTime(ipId, prev.unstableSince);
            
            // Validar timestamp
            const validatedDownTime = validateTimestamp(exactDownTime, prev.unstableSince || now);
            
            // Asegurar que el tiempo de caída es posterior al inicio de inestabilidad
            if (validatedDownTime >= (prev.unstableSince || 0)) {
              // Verificar si ya enviamos una notificación de este tipo recientemente
              const shouldNotify = shouldSendNotification(STATE_DOWN, prev.state, prev.notifySent, 'DOWN');
              
              newState = {
                ...newState,
                state: STATE_DOWN,
                downSince: validatedDownTime,
                notifySent: shouldNotify ? 'DOWN' : prev.notifySent,
                notifyTime: shouldNotify ? now : prev.notifyTime,
                lastStateChange: now
              };
              changed = true;
              
              console.log(`🔴 ${name} (${ip}): UNSTABLE → DOWN - Caída detectada: ${formatDate(exactDownDate)}`);
              console.log(`    Tiempo hasta confirmación de caída: ${formatDuration(validatedDownTime - (prev.unstableSince || validatedDownTime))}`);
              
              // Registrar transición
              await logStateTransition(ipId, STATE_UNSTABLE, STATE_DOWN, {
                unstableSince: prev.unstableSince,
                downSince: validatedDownTime
              });
              
              if (shouldNotify) {
                await sendMailWithRetry(
                  `Notificación: ${name} (${ip}) - SIN SISTEMA`,
                  `Inicio de inestabilidad: ${prev.unstableSince ? formatDate(new Date(prev.unstableSince)) : '-'}\n` +
                  `Caída detectada: ${formatDate(exactDownDate)}\n` +
                  `Tiempo hasta confirmación: ${formatDuration(validatedDownTime - (prev.unstableSince || validatedDownTime))}`
                );
              }
            } else {
              console.warn(`⚠️ ${name} (${ip}): Advertencia - Se detectó tiempo de caída (${formatDate(exactDownDate)}) anterior al inicio de inestabilidad (${prev.unstableSince ? formatDate(new Date(prev.unstableSince)) : 'N/A'})`);
              // Usar el tiempo de inestabilidad como tiempo de caída en este caso
              const shouldNotify = shouldSendNotification(STATE_DOWN, prev.state, prev.notifySent, 'DOWN');
              
              newState = {
                ...newState,
                state: STATE_DOWN,
                downSince: prev.unstableSince,
                notifySent: shouldNotify ? 'DOWN' : prev.notifySent,
                notifyTime: shouldNotify ? now : prev.notifyTime,
                lastStateChange: now
              };
              changed = true;
              
              console.log(`🔴 ${name} (${ip}): UNSTABLE → DOWN - Caída detectada (ajustada): ${prev.unstableSince ? formatDate(new Date(prev.unstableSince)) : 'N/A'}`);
              
              // Registrar transición
              await logStateTransition(ipId, STATE_UNSTABLE, STATE_DOWN, {
                unstableSince: prev.unstableSince,
                downSince: prev.unstableSince,
                adjusted: true
              });
              
              if (shouldNotify) {
                await sendMailWithRetry(
                  `Notificación: ${name} (${ip}) - SIN SISTEMA`,
                  `Inicio de inestabilidad: ${prev.unstableSince ? formatDate(new Date(prev.unstableSince)) : '-'}\n` +
                  `Caída detectada: ${prev.unstableSince ? formatDate(new Date(prev.unstableSince)) : '-'}`
                );
              }
            }
          }
        }
        break;
      case STATE_DOWN:
        if (isAlive) {
          // Para DOWN → RECOVERING, necesitamos el primer ping exitoso (no una secuencia)
          const { timestamp: exactRecoveryTime, fecha: exactRecoveryDate } = await getExactRecoveryTime(ipId, prev.downSince);
          
          // Validar timestamp
          const validatedRecoveryTime = validateTimestamp(exactRecoveryTime, now);
          
          // Verificar que no estemos procesando un evento ya registrado
          // y que el tiempo de recuperación es posterior a la caída
          if ((!prev.recoveryStartTime || validatedRecoveryTime > prev.recoveryStartTime) &&
              (validatedRecoveryTime >= (prev.downSince || 0))) {
            
            newState = {
              ...newState,
              state: STATE_RECOVERING,
              recoveryStartTime: validatedRecoveryTime,
              notifySent: prev.notifySent,
              lastStateChange: now
            };
            changed = true;
            
            // Calcular tiempo en caída (asegurándose que es un valor positivo)
            const downtimeMs = prev.downSince ? Math.max(0, validatedRecoveryTime - prev.downSince) : 0;
            
            console.log(`🟠 ${name} (${ip}): DOWN → RECOVERING - Inicio de recuperación: ${formatDate(exactRecoveryDate)}`);
            console.log(`    Primer ping exitoso detectado, iniciando periodo de observación`);
            console.log(`    Tiempo en caída: ${formatDuration(downtimeMs)}`);
            
            // Registrar transición
            await logStateTransition(ipId, STATE_DOWN, STATE_RECOVERING, {
              downSince: prev.downSince,
              recoveryStartTime: validatedRecoveryTime,
              downtimeMs: downtimeMs
            });
          }
        }
        break;
      case STATE_RECOVERING:
        if (!isAlive) {
          // Solo procesar si este evento es más reciente que el último cambio de estado
          if (lastLog.timestamp > prev.lastStateChange) {
            const { timestamp: exactNewDownTime, fecha: exactNewDownDate } = await getExactUnstableTime(ipId, lastLog.fecha);
            
            // Validar timestamp
            const validatedNewDownTime = validateTimestamp(exactNewDownTime, lastLog.timestamp);
            
            // Verificar que tenemos una fecha de recoveryStartTime válida para calcular el tiempo en recuperación
            let recoveryTime = "tiempo desconocido";
            if (prev.recoveryStartTime && validatedNewDownTime > prev.recoveryStartTime) {
              recoveryTime = formatDuration(validatedNewDownTime - prev.recoveryStartTime);
            }
            
            const shouldNotify = shouldSendNotification(STATE_DOWN, prev.state, prev.notifySent, 'DOWN');
            
            newState = {
              ...newState,
              state: STATE_DOWN,
              downSince: validatedNewDownTime,
              recoveryStartTime: null,
              notifySent: shouldNotify ? 'DOWN' : prev.notifySent,
              notifyTime: shouldNotify ? now : prev.notifyTime,
              lastStateChange: now
            };
            changed = true;
            
            console.log(`🔴 ${name} (${ip}): RECOVERING → DOWN - Falló durante recuperación: ${formatDate(exactNewDownDate)}`);
            console.log(`    Tiempo en recuperación: ${recoveryTime}`);
            
            // Registrar transición
            await logStateTransition(ipId, STATE_RECOVERING, STATE_DOWN, {
              recoveryStartTime: prev.recoveryStartTime,
              downSince: validatedNewDownTime,
              recoveryTime: recoveryTime
            });
            
            // Solo enviar notificación si no hemos enviado una recientemente
            if (shouldNotify) {
              await sendMailWithRetry(
                `Notificación: ${name} (${ip}) - FALLO DURANTE RECUPERACIÓN`,
                `Inicio de recuperación: ${prev.recoveryStartTime ? formatDate(new Date(prev.recoveryStartTime)) : '-'}\n` +
                `Fallo detectado: ${formatDate(exactNewDownDate)}\n` +
                `Tiempo en recuperación: ${recoveryTime}`
              );
            }
          }
        } else {
          // Verificar que ha pasado suficiente tiempo en recuperación
          const upDuration = prev.recoveryStartTime ? now - prev.recoveryStartTime : 0;
          
          // Solo verificar transición a UP si ha pasado el tiempo mínimo en recuperación
          if (upDuration >= THRESHOLD_UP) {
            const { timestamp: exactUpTime, fecha: exactUpDate } = await getExactUpTime(ipId, prev.recoveryStartTime);
            
            // Validar timestamp
            const validatedUpTime = validateTimestamp(exactUpTime, now);
            
            // Solo cambiar estado si la fecha de recuperación completa es más reciente que el inicio de recuperación
            if (validatedUpTime > (prev.recoveryStartTime || 0)) {
              // Calcular el tiempo total del incidente de manera segura
              let totalIncidentTime = "tiempo desconocido";
              if (prev.unstableSince && validatedUpTime > prev.unstableSince) {
                totalIncidentTime = formatDuration(validatedUpTime - prev.unstableSince);
              }
              
              const shouldNotify = shouldSendNotification(STATE_UP, prev.state, prev.notifySent, 'UP');
              
              newState = {
                ...newState,
                state: STATE_UP,
                upSince: validatedUpTime,
                unstableSince: null,  // Limpiar estado de inestabilidad
                downSince: null,      // Limpiar estado de caída
                recoveryStartTime: null,
                notifySent: shouldNotify ? 'UP' : prev.notifySent,
                notifyTime: shouldNotify ? now : prev.notifyTime,
                lastStateChange: now
              };
              changed = true;
              
              console.log(`🟢 ${name} (${ip}): RECOVERING → UP - Completamente recuperado: ${formatDate(exactUpDate)}`);
              console.log(`    Se confirmó secuencia de ${CONSECUTIVE_SUCCESSES_REQUIRED} respuestas exitosas consecutivas`);
              console.log(`    Tiempo total del incidente: ${totalIncidentTime}`);
              
              // Registrar transición
              await logStateTransition(ipId, STATE_RECOVERING, STATE_UP, {
                unstableSince: prev.unstableSince,
                downSince: prev.downSince,
                recoveryStartTime: prev.recoveryStartTime,
                upSince: validatedUpTime,
                totalIncidentTime: totalIncidentTime
              });
              
              // Solo enviar correo si realmente cambiamos de estado y no hemos enviado notificación recientemente
              if (shouldNotify) {
                await sendMailWithRetry(
                  `Notificación: ${name} (${ip}) - SISTEMA RESTABLECIDO`,
                  `Inicio de inestabilidad: ${prev.unstableSince ? formatDate(new Date(prev.unstableSince)) : '-'}\n` +
                  `Caída detectada: ${prev.downSince ? formatDate(new Date(prev.downSince)) : '-'}\n` +
                  `Recuperación iniciada: ${prev.recoveryStartTime ? formatDate(new Date(prev.recoveryStartTime)) : '-'}\n` +
                  `Completamente restablecido: ${formatDate(exactUpDate)}\n` +
                  `Duración total: ${totalIncidentTime}`
                );
              }
            }
          }
        }
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
        newState.notifySent,
        newState.recoveryStartTime
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
