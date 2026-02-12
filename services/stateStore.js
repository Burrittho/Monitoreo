class StateStore {
  constructor(options = {}) {
    this.hosts = new Map();
    this.events = [];
    this.maxEvents = options.maxEvents || parseInt(process.env.STATESTORE_EVENTS_CAPACITY, 10) || 2000;
    this.eventTtlMs = options.eventTtlMs || (parseInt(process.env.STATESTORE_EVENTS_TTL_SECONDS, 10) || 3600) * 1000;
  }

  ensureHost(ipId, seed = {}) {
    if (!this.hosts.has(ipId)) {
      this.hosts.set(ipId, {
        ipId,
        ip: seed.ip || null,
        name: seed.name || null,
        state: seed.state || 'ONLINE',
        lastResult: null,
        lastResultAt: null,
        downSince: null,
        upSince: Date.now(),
        lastTransition: null,
        transitionAt: null,
        updatedAt: Date.now(),
        originalDownTime: null,
        recentChecks: []
      });
    }

    const current = this.hosts.get(ipId);
    if (seed.ip) current.ip = seed.ip;
    if (seed.name) current.name = seed.name;
    return current;
  }

  updateCheck({ ipId, ip, name, alive, latency, timestamp = Date.now() }) {
    const host = this.ensureHost(ipId, { ip, name });

    host.lastResult = {
      alive: Boolean(alive),
      latency: Number.isFinite(latency) ? latency : null
    };
    host.lastResultAt = timestamp;
    host.updatedAt = timestamp;

    host.recentChecks.push({ success: alive ? 1 : 0, timestamp });
    const maxChecks = parseInt(process.env.STATESTORE_RECENT_CHECKS_CAPACITY, 10) || 400;
    if (host.recentChecks.length > maxChecks) {
      host.recentChecks.splice(0, host.recentChecks.length - maxChecks);
    }

    this.pushEvent({
      type: 'check_result',
      ipId,
      ip: host.ip,
      name: host.name,
      alive: Boolean(alive),
      latency: Number.isFinite(latency) ? latency : null,
      timestamp
    });

    return host;
  }

  applyTransition(ipId, toState, timestamp = Date.now()) {
    const host = this.ensureHost(ipId);
    const fromState = host.state;

    host.state = toState;
    host.transitionAt = timestamp;
    host.lastTransition = { from: fromState, to: toState, timestamp };
    host.updatedAt = Date.now();

    if (toState === 'OFFLINE') {
      host.downSince = timestamp;
      host.originalDownTime = host.originalDownTime || timestamp;
      host.upSince = null;
    } else {
      host.upSince = timestamp;
      host.downSince = null;
    }

    this.pushEvent({
      type: 'state_transition',
      ipId,
      ip: host.ip,
      name: host.name,
      fromState,
      toState,
      timestamp
    });

    return { fromState, toState, host };
  }

  getHost(ipId) {
    return this.hosts.get(ipId) || null;
  }

  getHostsArray() {
    return Array.from(this.hosts.values());
  }

  getRecentEvents(limit = 100) {
    this.pruneEvents();
    return this.events.slice(-limit);
  }

  pushEvent(event) {
    this.events.push(event);
    this.pruneEvents();

    if (this.events.length > this.maxEvents) {
      this.events.splice(0, this.events.length - this.maxEvents);
    }
  }

  pruneEvents() {
    const minTimestamp = Date.now() - this.eventTtlMs;
    let start = 0;
    while (start < this.events.length && this.events[start].timestamp < minTimestamp) {
      start++;
    }
    if (start > 0) {
      this.events.splice(0, start);
    }
  }
}

module.exports = new StateStore();
module.exports.StateStore = StateStore;
