/**
 * Host Repository - Gestión de estados de hosts en la base de datos
 * Maneja la persistencia y recuperación de estados de monitoreo
 */

const { STATE_UP, STATE_DOWN } = require('../config/monitoreo');

/**
 * Inicializa los estados de todos los hosts desde la base de datos
 * @param {ConnectionManager} connectionManager - Instancia del gestor de conexiones
 * @returns {Object} Objeto con estados indexados por ip_id
 */
async function initializeHostStates(connectionManager) {
  try {
    const [rows] = await connectionManager.executeQuery(
      'SELECT ip_id, state, changed_at FROM host_state_log WHERE is_active = 1',
      [],
      'state_management'
    );
    
    const hostsStatus = {};
    
    for (const row of rows) {
      const timestamp = new Date(row.changed_at).getTime();
      // Normalizar estado: UP → ONLINE, DOWN → OFFLINE
      const normalizedState = row.state === 'UP' ? STATE_UP : row.state === 'DOWN' ? STATE_DOWN : row.state;
      hostsStatus[row.ip_id] = {
        state: normalizedState,
        downSince: normalizedState === STATE_DOWN ? timestamp : null,
        upSince: normalizedState === STATE_UP ? timestamp : null,
        originalDownTime: normalizedState === STATE_DOWN ? timestamp : null
      };
    }
    
    console.log(`Estados inicializados para ${rows.length} hosts`);
    return hostsStatus;
  } catch (error) {
    console.error('Error al inicializar estados de host:', error);
    return {};
  }
}

/**
 * Obtiene el estado actual de un host desde la base de datos
 * @param {number} ipId - ID del host
 * @param {ConnectionManager} connectionManager - Instancia del gestor de conexiones
 * @returns {Object|null} Estado del host o null si no existe
 */
async function getHostState(ipId, connectionManager) {
  try {
    const [[row]] = await connectionManager.executeQuery(
      'SELECT state, changed_at FROM host_state_log WHERE ip_id = ? AND is_active = 1',
      [ipId],
      'state_management'
    );
    
    if (row) {
      const timestamp = new Date(row.changed_at).getTime();
      const normalizedState = row.state === 'UP' ? STATE_UP : row.state === 'DOWN' ? STATE_DOWN : row.state;
      return {
        state: normalizedState,
        downSince: normalizedState === STATE_DOWN ? timestamp : null,
        upSince: normalizedState === STATE_UP ? timestamp : null,
        originalDownTime: normalizedState === STATE_DOWN ? timestamp : null
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error obteniendo estado del host ${ipId}:`, error);
    return null;
  }
}

/**
 * Persiste el estado de un host en la base de datos
 * Desactiva el estado anterior e inserta uno nuevo
 * @param {number} ipId - ID del host
 * @param {string} state - Estado (ONLINE o OFFLINE)
 * @param {number} downSince - Timestamp de cuándo cayó (si aplica)
 * @param {number} upSince - Timestamp de cuándo se recuperó (si aplica)
 * @param {ConnectionManager} connectionManager - Instancia del gestor de conexiones
 */
async function persistHostState(ipId, state, downSince, upSince, connectionManager) {
  try {
    // Desactivar estado anterior
    await connectionManager.executeQuery(
      'UPDATE host_state_log SET is_active = 0 WHERE ip_id = ? AND is_active = 1',
      [ipId],
      'state_management'
    );
    
    // Insertar nuevo estado activo
    const timestamp = downSince || upSince || Date.now();
    await connectionManager.executeQuery(
      'INSERT INTO host_state_log (ip_id, state, changed_at, is_active) VALUES (?, ?, ?, 1)',
      [ipId, state, new Date(timestamp)],
      'state_management'
    );
  } catch (error) {
    console.error(`Error al persistir estado del host ${ipId}:`, error);
    throw error;
  }
}

/**
 * Registra una transición de estado en los logs
 * @param {number} ipId - ID del host
 * @param {string} fromState - Estado anterior
 * @param {string} toState - Estado nuevo
 * @param {Object} details - Detalles adicionales del análisis
 */
function logStateTransition(ipId, fromState, toState, details) {
  try {
    console.log(`Transición de estado: IP ${ipId} - ${fromState} → ${toState}`);
    // Aquí podrías agregar lógica adicional para guardar en una tabla de auditoría si lo necesitas
  } catch (error) {
    console.error('Error al registrar transición de estado:', error);
  }
}

module.exports = {
  initializeHostStates,
  getHostState,
  persistHostState,
  logStateTransition
};
