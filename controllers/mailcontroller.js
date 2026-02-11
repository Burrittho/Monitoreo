/**
 * Mail Controller - Sistema de monitoreo de hosts
 * Detecta cambios de estado (ONLINE/OFFLINE) y envía alertas por correo
 * 
 * Responsabilidades:
 * - Analizar logs de ping para detectar cambios de estado
 * - Coordinar el envío de alertas de caída y recuperación
 * - Gestionar el ciclo de monitoreo continuo
 */

const ConnectionManager = require('../services/connectionManager');
const { sendMonitoringEmail } = require('../services/emailService');
const { buildIncidentEmail, formatDate, formatDuration } = require('../services/emailTemplateBuilder');
const { initializeHostStates, getHostState, persistHostState, logStateTransition } = require('../models/hostRepository');
const { getSucursalInfo, getConsolaInfo, getInternetInfo } = require('../models/dataRepository');
const config = require('../config/monitoreo');

// Variables globales del servicio
let connectionManager = null;
let pool = null;
let hostsStatus = {};
let checkInterval = config.CHECK_INTERVAL;

/**
 * Analiza los últimos 360 logs de ping para determinar el estado del host
 * Requiere 300 logs consecutivos del mismo tipo (éxito o fallo) para cambiar estado
 * Retorna el timestamp exacto del primer log que inició la secuencia consecutiva
 */
async function analyzeHost(ipId) {
  try {
    const [logs] = await connectionManager.executeQuery(
      'SELECT success, fecha, UNIX_TIMESTAMP(fecha) * 1000 as timestamp FROM ping_logs WHERE ip_id = ? ORDER BY fecha DESC LIMIT ?',
      [ipId, config.LOGS_TO_ANALYZE],
      'queries'
    );
    
    if (logs.length === 0) {
      return { 
        shouldBeOnline: false, 
        shouldBeOffline: false, 
        consecutiveSuccess: 0, 
        consecutiveFails: 0,
        totalLogs: 0,
        firstSuccessTimestamp: null,
        firstFailTimestamp: null
      };
    }
    
    // Invertir para analizar en orden cronológico (más antiguo a más reciente)
    logs.reverse();
    
    // Buscar la secuencia más larga de éxitos y fallos consecutivos
    let consecutiveSuccess = 0;
    let consecutiveFails = 0;
    let maxConsecutiveSuccess = 0;
    let maxConsecutiveFails = 0;
    let firstSuccessTimestamp = null;
    let firstFailTimestamp = null;
    let tempSuccessStart = null;
    let tempFailStart = null;
    
    for (const log of logs) {
      if (log.success === 1) {
        if (consecutiveSuccess === 0) {
          tempSuccessStart = log.timestamp;
        }
        consecutiveSuccess++;
        consecutiveFails = 0;
        tempFailStart = null;
        
        if (consecutiveSuccess > maxConsecutiveSuccess) {
          maxConsecutiveSuccess = consecutiveSuccess;
          firstSuccessTimestamp = tempSuccessStart;
        }
      } else {
        if (consecutiveFails === 0) {
          tempFailStart = log.timestamp;
        }
        consecutiveFails++;
        consecutiveSuccess = 0;
        tempSuccessStart = null;
        
        if (consecutiveFails > maxConsecutiveFails) {
          maxConsecutiveFails = consecutiveFails;
          firstFailTimestamp = tempFailStart;
        }
      }
    }
    
    return {
      shouldBeOnline: maxConsecutiveSuccess >= config.CONSECUTIVE_REQUIRED,
      shouldBeOffline: maxConsecutiveFails >= config.CONSECUTIVE_REQUIRED,
      consecutiveSuccess: maxConsecutiveSuccess,
      consecutiveFails: maxConsecutiveFails,
      totalLogs: logs.length,
      firstSuccessTimestamp: maxConsecutiveSuccess >= config.CONSECUTIVE_REQUIRED ? firstSuccessTimestamp : null,
      firstFailTimestamp: maxConsecutiveFails >= config.CONSECUTIVE_REQUIRED ? firstFailTimestamp : null
    };
  } catch (error) {
    console.error(`Error analizando logs de IP ${ipId}:`, error.message);
    return { 
      shouldBeOnline: false, 
      shouldBeOffline: false, 
      consecutiveSuccess: 0, 
      consecutiveFails: 0,
      totalLogs: 0,
      firstSuccessTimestamp: null,
      firstFailTimestamp: null
    };
  }
}

/**
 * Verifica el estado de un host y envía alertas si hay cambios
 */
async function checkHost({ id: ipId, ip, name }) {
  try {
    // Inicializar estado si no existe
    if (!hostsStatus[ipId]) {
      const state = await getHostState(ipId, connectionManager);
      
      if (state) {
        hostsStatus[ipId] = state;
      } else {
        // Host nuevo - inicializar como ONLINE
        hostsStatus[ipId] = {
          state: config.STATE_UP,
          downSince: null,
          upSince: Date.now(),
          originalDownTime: null
        };
        await connectionManager.executeQuery(
          'INSERT INTO host_state_log (ip_id, state, changed_at, is_active) VALUES (?, ?, NOW(), 1)',
          [ipId, config.STATE_UP],
          'state_management'
        );
      }
    }

    // Analizar logs para determinar si debe cambiar de estado
    const analysis = await analyzeHost(ipId);
    const currentState = hostsStatus[ipId];
    const now = Date.now();
    
    // Determinar si hay cambio de estado
    let shouldChange = false;
    let newStateValue = currentState.state;
    let exactTimestamp = now;
    
    // ONLINE → OFFLINE
    if (currentState.state === config.STATE_UP && analysis.shouldBeOffline) {
      shouldChange = true;
      newStateValue = config.STATE_DOWN;
      exactTimestamp = analysis.firstFailTimestamp || now;
      console.log(`⚠️  ${name} (${ip}) → OFFLINE [${analysis.consecutiveFails}/${analysis.totalLogs} fallos consecutivos] - Primer fallo: ${formatDate(new Date(exactTimestamp))}`);
    }
    // OFFLINE → ONLINE
    else if (currentState.state === config.STATE_DOWN && analysis.shouldBeOnline) {
      shouldChange = true;
      newStateValue = config.STATE_UP;
      exactTimestamp = analysis.firstSuccessTimestamp || now;
      console.log(`✅ ${name} (${ip}) → ONLINE [${analysis.consecutiveSuccess}/${analysis.totalLogs} éxitos consecutivos] - Primer éxito: ${formatDate(new Date(exactTimestamp))}`);
    }
    
    // Aplicar cambio de estado
    if (shouldChange) {
      logStateTransition(ipId, currentState.state, newStateValue, analysis);
      
      // Actualizar estado en memoria
      const updatedState = {
        state: newStateValue,
        downSince: newStateValue === config.STATE_DOWN ? exactTimestamp : null,
        upSince: newStateValue === config.STATE_UP ? exactTimestamp : null,
        originalDownTime: newStateValue === config.STATE_DOWN ? exactTimestamp : (newStateValue === config.STATE_UP ? currentState.originalDownTime : null)
      };
      hostsStatus[ipId] = updatedState;
      
      // Persistir en BD
      await persistHostState(ipId, newStateValue, updatedState.downSince, updatedState.upSince, connectionManager);
      
      // Enviar correo de alerta
      try {
        const sucursalInfo = await getSucursalInfo(ipId, connectionManager);
        const consolaInfo = await getConsolaInfo(ipId, connectionManager);
        const internetInfo = await getInternetInfo(ipId, connectionManager);
        
        if (newStateValue === config.STATE_DOWN) {
          // Correo de CAÍDA
          const incidentInfo = {
            confirmacionCaida: formatDate(new Date(exactTimestamp)),
            confirmacionRecuperacion: null,
            tiempoSinSistema: null
          };
          
          const emailData = await buildIncidentEmail('caida', sucursalInfo, consolaInfo, internetInfo, incidentInfo);
          await sendMonitoringEmail(emailData.subject, emailData.html);
          console.log(`📧 Correo de CAÍDA enviado para ${name}`);
          
        } else if (newStateValue === config.STATE_UP && currentState.originalDownTime) {
          // Correo de RECUPERACIÓN
          const tiempoSinSistema = formatDuration(currentState.originalDownTime, exactTimestamp);
          const incidentInfo = {
            confirmacionCaida: formatDate(new Date(currentState.originalDownTime)),
            confirmacionRecuperacion: formatDate(new Date(exactTimestamp)),
            tiempoSinSistema: tiempoSinSistema
          };
          
          const emailData = await buildIncidentEmail('recuperacion', sucursalInfo, consolaInfo, internetInfo, incidentInfo);
          await sendMonitoringEmail(emailData.subject, emailData.html);
          console.log(`📧 Correo de RECUPERACIÓN enviado para ${name} (Downtime: ${tiempoSinSistema})`);
        }
      } catch (emailError) {
        console.error(`Error enviando correo para ${name}:`, emailError.message);
      }
    }
    
  } catch (error) {
    console.error(`Error procesando el host ${name} (${ip}):`, error);
  }
}

/**
 * Inicia el worker de monitoreo
 */
async function startWorker(poolConnection) {
  console.log('Iniciando servicio de monitoreo...');
  
  pool = poolConnection;
  connectionManager = new ConnectionManager(pool);

  // Configurar shutdown graceful
  process.on('SIGINT', async () => {
    console.log('Cerrando conexiones...');
    await connectionManager.closeAll();
    process.exit(0);
  });

  // Cargar configuración desde BD (solo intervalo de revisión)
  try {
    const [rows] = await connectionManager.executeQuery(
      "SELECT clave, valor FROM config WHERE clave = 'intervalo_revision_minutos'",
      [],
      'config'
    );
    
    if (rows.length > 0 && rows[0].valor) {
      checkInterval = parseInt(rows[0].valor) * 60 * 1000;
      console.log(`Intervalo de revisión configurado: ${rows[0].valor} minutos`);
    }
  } catch (err) {
    console.error('Error leyendo configuración, usando valores por defecto:', err);
  }

  // Inicializar estados desde BD
  hostsStatus = await initializeHostStates(connectionManager);
  console.log('Estado inicial cargado');

  // Loop principal de monitoreo
  setInterval(async () => {
    try {
      const [ips] = await connectionManager.executeQuery(
        'SELECT id, ip, name FROM ips',
        [],
        'main_loop'
      );
      
      // Procesar en lotes pequeños para no saturar
      for (let i = 0; i < ips.length; i += config.BATCH_SIZE) {
        const batch = ips.slice(i, i + config.BATCH_SIZE);
        await Promise.all(batch.map(host => checkHost(host)));
        
        if (i + config.BATCH_SIZE < ips.length) {
          await new Promise(resolve => setTimeout(resolve, config.BATCH_DELAY));
        }
      }
    } catch (error) {
      console.error('Error en ciclo de monitoreo:', error);
    }
  }, checkInterval);
}

module.exports = { startWorker };