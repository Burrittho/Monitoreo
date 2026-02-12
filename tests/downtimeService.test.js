const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateConsecutiveTransitions,
  buildIncidents,
  getCurrentHostState
} = require('../services/downtimeService');

function makeEvents(pattern, startIso = '2026-01-01T00:00:00.000Z') {
  const base = new Date(startIso).getTime();
  return pattern.map((success, idx) => ({
    success,
    fecha: new Date(base + (idx * 1000)).toISOString()
  }));
}

test('flapping no debe abrir incidentes si no llega al umbral', () => {
  const events = makeEvents([0,0,0,1,1,0,0,1,0,1,1,0,1,0]);
  const incidents = buildIncidents(events, {
    failThreshold: 5,
    recoveryThreshold: 5,
    startDate: events[0].fecha,
    endDate: events[events.length - 1].fecha
  });

  assert.equal(incidents.length, 0);
});

test('corte largo abre y cierra incidente con duración correcta', () => {
  const events = makeEvents([
    1,1,
    0,0,0,0,0,0,
    1,1,1,1,1,1
  ]);

  const incidents = buildIncidents(events, {
    failThreshold: 3,
    recoveryThreshold: 3,
    startDate: events[0].fecha,
    endDate: events[events.length - 1].fecha
  });

  assert.equal(incidents.length, 1);
  assert.equal(incidents[0].status, 'completed');
  assert.equal(incidents[0].downtime_start, events[2].fecha);
  assert.equal(incidents[0].downtime_end, events[7].fecha);
  assert.equal(incidents[0].downtime_duration, '5s');
});

test('recuperación parcial mantiene estado OFFLINE hasta cumplir umbral', () => {
  const events = makeEvents([0,0,0,0,1,1]);
  const state = getCurrentHostState(events, {
    currentState: 'OFFLINE',
    failThreshold: 3,
    recoveryThreshold: 3
  });

  assert.equal(state.shouldBeOnline, false);
  assert.equal(state.newState, 'OFFLINE');
  assert.equal(state.consecutiveSuccess, 2);
});

test('transiciones cuenta una sola caída por racha continua', () => {
  const events = makeEvents([1,0,0,0,0,0,0,0,0,0,0,0,1,1,1]);
  const summary = calculateConsecutiveTransitions(events, {
    failThreshold: 5,
    recoveryThreshold: 3,
    initialState: 'ONLINE'
  });

  const downs = summary.transitions.filter((t) => t.type === 'DOWN');
  const ups = summary.transitions.filter((t) => t.type === 'UP');

  assert.equal(downs.length, 1);
  assert.equal(ups.length, 1);
});
