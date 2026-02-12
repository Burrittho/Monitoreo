const logger = require('../utils/logger');

const state = {
    db: {
        status: 'unknown',
        lastCheckedAt: null,
        latencyMs: null,
        error: null
    },
    monitor: {
        cyclesTotal: 0,
        hostsEvaluatedTotal: 0,
        pingFailuresTotal: 0,
        lastCycleAt: null,
        lastCycleDurationMs: null,
        lastCycleBySource: {}
    },
    dbQuery: {
        count: 0,
        totalLatencyMs: 0,
        maxLatencyMs: 0,
        lastLatencyMs: null,
        lastQueryAt: null
    }
};

function recordDbStatus({ status, latencyMs = null, error = null }) {
    state.db.status = status;
    state.db.lastCheckedAt = new Date().toISOString();
    state.db.latencyMs = latencyMs;
    state.db.error = error ? { message: error.message } : null;
}

function recordDbQueryLatency(latencyMs) {
    state.dbQuery.count += 1;
    state.dbQuery.totalLatencyMs += latencyMs;
    state.dbQuery.maxLatencyMs = Math.max(state.dbQuery.maxLatencyMs, latencyMs);
    state.dbQuery.lastLatencyMs = latencyMs;
    state.dbQuery.lastQueryAt = new Date().toISOString();
}

function getDbQueryStats() {
    const avgLatencyMs = state.dbQuery.count
        ? state.dbQuery.totalLatencyMs / state.dbQuery.count
        : 0;

    return {
        ...state.dbQuery,
        avgLatencyMs: Number(avgLatencyMs.toFixed(2))
    };
}

function recordMonitorCycle({ source, hostsEvaluated, pingFailures, durationMs }) {
    state.monitor.cyclesTotal += 1;
    state.monitor.hostsEvaluatedTotal += hostsEvaluated;
    state.monitor.pingFailuresTotal += pingFailures;
    state.monitor.lastCycleAt = new Date().toISOString();
    state.monitor.lastCycleDurationMs = durationMs;

    state.monitor.lastCycleBySource[source] = {
        hostsEvaluated,
        pingFailures,
        durationMs,
        at: state.monitor.lastCycleAt
    };

    logger.info(
        {
            metric: 'monitor_cycle',
            source,
            cycle: state.monitor.cyclesTotal,
            hostsEvaluated,
            pingFailures,
            durationMs,
            dbStatus: state.db.status,
            dbQueryAvgLatencyMs: getDbQueryStats().avgLatencyMs
        },
        'monitor_cycle_metric'
    );
}

function getReadiness() {
    const degraded = state.db.status !== 'ready';
    return {
        status: degraded ? 'degraded' : 'ready',
        degraded,
        db: state.db,
        dbQuery: getDbQueryStats(),
        monitor: state.monitor
    };
}

module.exports = {
    recordDbStatus,
    recordDbQueryLatency,
    recordMonitorCycle,
    getReadiness,
    getDbQueryStats
};
