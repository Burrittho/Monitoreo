/**
 * Monitoring controller desacoplado de persistencia.
 */

const ConnectionManager = require('../services/connectionManager');
const DbHealthService = require('../services/dbHealthService');
const InventoryService = require('../services/inventoryService');
const PersistenceService = require('../services/persistenceService');
const stateStore = require('../services/stateStore');
const { sendMonitoringEmail } = require('../services/emailService');
const { buildIncidentEmail, formatDate, formatDuration } = require('../services/emailTemplateBuilder');
const { initializeHostStates, logStateTransition } = require('../models/hostRepository');
const { getSucursalInfo, getConsolaInfo, getInternetInfo } = require('../models/dataRepository');
const config = require('../config/monitoreo');

let connectionManager = null;
let dbHealthService = null;
let inventoryService = null;
let persistenceService = null;
let checkInterval = config.CHECK_INTERVAL;

function analyzeRecentChecks(ipId) {
  const host = stateStore.getHost(ipId);
  const checks = host?.recentChecks || [];

  if (!checks.length) {
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

  const recent = checks.slice(-config.LOGS_TO_ANALYZE);
  let maxConsecutiveSuccess = 0;
  let maxConsecutiveFails = 0;
  let consecutiveSuccess = 0;
  let consecutiveFails = 0;
  let firstSuccessTimestamp = null;
  let firstFailTimestamp = null;
  let tempSuccessStart = null;
  let tempFailStart = null;

  for (const item of recent) {
    if (item.success === 1) {
      if (consecutiveSuccess === 0) tempSuccessStart = item.timestamp;
      consecutiveSuccess++;
      consecutiveFails = 0;
      tempFailStart = null;
      if (consecutiveSuccess > maxConsecutiveSuccess) {
        maxConsecutiveSuccess = consecutiveSuccess;
        firstSuccessTimestamp = tempSuccessStart;
      }
    } else {
      if (consecutiveFails === 0) tempFailStart = item.timestamp;
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
    totalLogs: recent.length,
    firstSuccessTimestamp: maxConsecutiveSuccess >= config.CONSECUTIVE_REQUIRED ? firstSuccessTimestamp : null,
    firstFailTimestamp: maxConsecutiveFails >= config.CONSECUTIVE_REQUIRED ? firstFailTimestamp : null
  };
}

async function checkHost({ id: ipId, ip, name }) {
  stateStore.ensureHost(ipId, { ip, name });
  const currentState = stateStore.getHost(ipId);
  if (!currentState) return;

  const analysis = analyzeRecentChecks(ipId);
  const now = Date.now();

  let shouldChange = false;
  let newStateValue = currentState.state;
  let exactTimestamp = now;

  if (currentState.state === config.STATE_UP && analysis.shouldBeOffline) {
    shouldChange = true;
    newStateValue = config.STATE_DOWN;
    exactTimestamp = analysis.firstFailTimestamp || now;
    console.log(`⚠️ ${name} (${ip}) → OFFLINE [${analysis.consecutiveFails}/${analysis.totalLogs}]`);
  } else if (currentState.state === config.STATE_DOWN && analysis.shouldBeOnline) {
    shouldChange = true;
    newStateValue = config.STATE_UP;
    exactTimestamp = analysis.firstSuccessTimestamp || now;
    console.log(`✅ ${name} (${ip}) → ONLINE [${analysis.consecutiveSuccess}/${analysis.totalLogs}]`);
  }

  if (!shouldChange) return;

  logStateTransition(ipId, currentState.state, newStateValue, analysis);
  const { fromState, host } = stateStore.applyTransition(ipId, newStateValue, exactTimestamp);

  persistenceService.enqueueTransition({
    ipId,
    newState: newStateValue,
    downSince: host.downSince,
    upSince: host.upSince,
    eventTimestamp: exactTimestamp
  });

  try {
    const sucursalInfo = await getSucursalInfo(ipId, connectionManager);
    const consolaInfo = await getConsolaInfo(ipId, connectionManager);
    const internetInfo = await getInternetInfo(ipId, connectionManager);

    if (newStateValue === config.STATE_DOWN) {
      const incidentInfo = {
        confirmacionCaida: formatDate(new Date(exactTimestamp)),
        confirmacionRecuperacion: null,
        tiempoSinSistema: null
      };
      const emailData = await buildIncidentEmail('caida', sucursalInfo, consolaInfo, internetInfo, incidentInfo);
      await sendMonitoringEmail(emailData.subject, emailData.html);
    } else if (newStateValue === config.STATE_UP && host.originalDownTime) {
      const tiempoSinSistema = formatDuration(host.originalDownTime, exactTimestamp);
      const incidentInfo = {
        confirmacionCaida: formatDate(new Date(host.originalDownTime)),
        confirmacionRecuperacion: formatDate(new Date(exactTimestamp)),
        tiempoSinSistema
      };
      const emailData = await buildIncidentEmail('recuperacion', sucursalInfo, consolaInfo, internetInfo, incidentInfo);
      await sendMonitoringEmail(emailData.subject, emailData.html);
      host.originalDownTime = null;
    }

    console.log(`Transición notificada: IP ${ipId} ${fromState} -> ${newStateValue}`);
  } catch (emailError) {
    console.error(`Error enviando correo para ${name}:`, emailError.message);
  }
}

async function startWorker(poolConnection) {
  console.log('Iniciando servicio de monitoreo...');

  connectionManager = new ConnectionManager(poolConnection);
  dbHealthService = new DbHealthService(poolConnection);
  inventoryService = new InventoryService(poolConnection);
  persistenceService = new PersistenceService(connectionManager, dbHealthService);

  process.on('SIGINT', async () => {
    console.log('Cerrando conexiones...');
    dbHealthService.stop();
    inventoryService.stopAutoRefresh();
    await connectionManager.closeAll();
    process.exit(0);
  });

  dbHealthService.start();
  await inventoryService.loadInitial();
  inventoryService.startAutoRefresh();

  try {
    const [rows] = await connectionManager.executeQuery(
      "SELECT clave, valor FROM config WHERE clave = 'intervalo_revision_minutos'",
      [],
      'config'
    );

    if (rows.length > 0 && rows[0].valor) {
      checkInterval = parseInt(rows[0].valor, 10) * 60 * 1000;
      console.log(`Intervalo de revisión configurado: ${rows[0].valor} minutos`);
    }
  } catch (err) {
    console.error('Error leyendo configuración, usando valores por defecto:', err.message);
  }

  try {
    const hostsStatus = await initializeHostStates(connectionManager);
    Object.entries(hostsStatus).forEach(([ipId, state]) => {
      const host = stateStore.ensureHost(Number(ipId));
      host.state = state.state;
      host.downSince = state.downSince;
      host.upSince = state.upSince;
      host.originalDownTime = state.originalDownTime;
    });
  } catch (error) {
    console.error('No se pudo cargar estado inicial desde DB:', error.message);
  }

  setInterval(async () => {
    try {
      const hosts = inventoryService.getInventory();
      for (let i = 0; i < hosts.length; i += config.BATCH_SIZE) {
        const batch = hosts.slice(i, i + config.BATCH_SIZE);
        await Promise.all(batch.map((host) => checkHost(host)));

        if (i + config.BATCH_SIZE < hosts.length) {
          await new Promise((resolve) => setTimeout(resolve, config.BATCH_DELAY));
        }
      }
    } catch (error) {
      console.error('Error en ciclo de monitoreo:', error.message);
    }
  }, checkInterval);
}

function getMonitoringRuntimeStatus() {
  return {
    db: dbHealthService ? dbHealthService.status() : { healthy: false, degraded: true },
    inventory: inventoryService ? inventoryService.getMeta() : { count: 0, lastRefreshAt: null, refreshError: 'not_initialized' },
    persistence: persistenceService ? persistenceService.status() : { queueSize: 0, backfillOnRecovery: false },
    stateStore: {
      hostsTracked: stateStore.getHostsArray().length,
      recentEvents: stateStore.getRecentEvents(20)
    }
  };
}

module.exports = {
  startWorker,
  getMonitoringRuntimeStatus
};
