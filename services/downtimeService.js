function normalizeTimestamp(value) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function normalizeEvents(events = []) {
  return events
    .map((event) => ({
      success: Number(event.success),
      timestamp: normalizeTimestamp(event.timestamp ?? event.fecha)
    }))
    .filter((event) => event.timestamp !== null)
    .sort((a, b) => a.timestamp - b.timestamp);
}

function resolveAssetThresholds(assetType = 'sucursal', config = {}) {
  const fallback = config.sucursal || {};
  const selected = config[assetType] || fallback;

  return {
    failThreshold: Math.max(1, Number(selected.failThreshold || fallback.failThreshold || 10)),
    recoveryThreshold: Math.max(1, Number(selected.recoveryThreshold || fallback.recoveryThreshold || selected.failThreshold || fallback.failThreshold || 10)),
    logsToAnalyze: Math.max(1, Number(selected.logsToAnalyze || fallback.logsToAnalyze || 360))
  };
}

function calculateConsecutiveTransitions(rawEvents = [], options = {}) {
  const events = normalizeEvents(rawEvents);
  const {
    failThreshold = 10,
    recoveryThreshold = 10,
    initialState = 'ONLINE'
  } = options;

  const transitions = [];
  let state = initialState;
  let failRun = 0;
  let successRun = 0;
  let failRunStart = null;
  let successRunStart = null;
  let lastFailureTimestamp = null;

  for (const event of events) {
    if (event.success === 0) {
      if (failRun === 0) {
        failRunStart = event.timestamp;
      }
      failRun += 1;
      successRun = 0;
      successRunStart = null;
      lastFailureTimestamp = event.timestamp;

      if (state === 'ONLINE' && failRun === failThreshold) {
        state = 'OFFLINE';
        transitions.push({
          type: 'DOWN',
          timestamp: failRunStart,
          triggerTimestamp: event.timestamp,
          consecutive: failRun
        });
      }
      continue;
    }

    if (successRun === 0) {
      successRunStart = event.timestamp;
    }
    successRun += 1;
    failRun = 0;
    failRunStart = null;

    if (state === 'OFFLINE' && successRun === recoveryThreshold) {
      state = 'ONLINE';
      transitions.push({
        type: 'UP',
        timestamp: event.timestamp,
        recoveryStartTimestamp: successRunStart,
        outageEndTimestamp: lastFailureTimestamp || event.timestamp,
        consecutive: successRun
      });
    }
  }

  return {
    transitions,
    currentState: state,
    failRun,
    successRun,
    lastFailureTimestamp,
    eventsCount: events.length
  };
}

function formatDurationMs(durationMs) {
  const safeMs = Math.max(0, Number(durationMs) || 0);
  const hours = Math.floor(safeMs / (1000 * 60 * 60));
  const minutes = Math.floor((safeMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((safeMs % (1000 * 60)) / 1000);

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(' ');
}

function buildIncidents(rawEvents = [], options = {}) {
  const {
    failThreshold = 10,
    recoveryThreshold = 10,
    startDate,
    endDate,
    initialState = 'ONLINE',
    minSamplesForInsufficientData = 20
  } = options;

  const events = normalizeEvents(rawEvents);
  if (events.length === 0) {
    return [];
  }

  const allFailures = events.every((event) => event.success === 0);
  if (allFailures && events.length < minSamplesForInsufficientData) {
    return [{
      downtime_start: startDate,
      downtime_end: endDate,
      downtime_duration: 'N/A',
      status: 'insufficient_data',
      message: 'No hay datos suficientes para determinar incidencias'
    }];
  }

  const analysis = calculateConsecutiveTransitions(events, {
    failThreshold,
    recoveryThreshold,
    initialState
  });

  const incidents = [];
  let openStart = initialState === 'OFFLINE' ? normalizeTimestamp(startDate) : null;
  let incidentNumber = 0;

  for (const transition of analysis.transitions) {
    if (transition.type === 'DOWN') {
      incidentNumber += 1;
      openStart = transition.timestamp;
    }

    if (transition.type === 'UP' && openStart !== null) {
      const outageEnd = transition.outageEndTimestamp || transition.timestamp;
      incidents.push({
        downtime_start: new Date(openStart).toISOString(),
        downtime_end: new Date(outageEnd).toISOString(),
        downtime_duration: formatDurationMs(outageEnd - openStart),
        status: 'completed',
        incident_number: incidentNumber || 1
      });
      openStart = null;
    }
  }

  if (openStart !== null) {
    const endTs = analysis.lastFailureTimestamp || normalizeTimestamp(endDate) || openStart;
    incidents.push({
      downtime_start: new Date(openStart).toISOString(),
      downtime_end: new Date(endTs).toISOString(),
      downtime_duration: formatDurationMs(endTs - openStart),
      status: initialState === 'OFFLINE' ? 'ongoing_throughout' : 'ongoing_started',
      incident_number: incidentNumber || 1
    });
  }

  if (incidents.length === 0 && allFailures && events.length >= minSamplesForInsufficientData) {
    incidents.push({
      downtime_start: startDate,
      downtime_end: endDate,
      downtime_duration: 'Todo el período',
      status: 'complete_outage',
      message: 'Caída durante todo el período analizado',
      incident_number: 1
    });
  }

  return incidents;
}

function getCurrentHostState(rawEvents = [], options = {}) {
  const events = normalizeEvents(rawEvents);
  const {
    failThreshold = 10,
    recoveryThreshold = 10,
    currentState = 'ONLINE'
  } = options;

  if (events.length === 0) {
    return {
      shouldChange: false,
      newState: currentState,
      firstFailTimestamp: null,
      firstSuccessTimestamp: null,
      consecutiveFails: 0,
      consecutiveSuccess: 0,
      totalLogs: 0
    };
  }

  let consecutiveFails = 0;
  let consecutiveSuccess = 0;
  let firstFailTimestamp = null;
  let firstSuccessTimestamp = null;

  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    if (event.success === 0 && consecutiveSuccess === 0) {
      consecutiveFails += 1;
      firstFailTimestamp = event.timestamp;
      continue;
    }

    if (event.success === 1 && consecutiveFails === 0) {
      consecutiveSuccess += 1;
      firstSuccessTimestamp = event.timestamp;
      continue;
    }

    break;
  }

  const shouldBeOffline = consecutiveFails >= failThreshold;
  const shouldBeOnline = consecutiveSuccess >= recoveryThreshold;

  return {
    shouldChange:
      (currentState === 'ONLINE' && shouldBeOffline) ||
      (currentState === 'OFFLINE' && shouldBeOnline),
    shouldBeOffline,
    shouldBeOnline,
    newState: currentState === 'ONLINE' && shouldBeOffline
      ? 'OFFLINE'
      : currentState === 'OFFLINE' && shouldBeOnline
        ? 'ONLINE'
        : currentState,
    firstFailTimestamp,
    firstSuccessTimestamp,
    consecutiveFails,
    consecutiveSuccess,
    totalLogs: events.length
  };
}

module.exports = {
  resolveAssetThresholds,
  calculateConsecutiveTransitions,
  buildIncidents,
  getCurrentHostState,
  formatDurationMs
};
