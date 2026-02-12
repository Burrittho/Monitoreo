const EventEmitter = require('events');

const VALID_TYPES = ['branches', 'dvr', 'servers'];

class LiveStateStore extends EventEmitter {
  constructor() {
    super();
    this.stateByType = {
      branches: new Map(),
      dvr: new Map(),
      servers: new Map(),
    };
    this.sequence = 0;
  }

  updateCycle(type, results = [], cycleAt = new Date()) {
    if (!VALID_TYPES.includes(type) || !Array.isArray(results)) return;

    const nextAt = cycleAt instanceof Date ? cycleAt : new Date(cycleAt);
    const map = this.stateByType[type];
    const changed = [];

    for (const result of results) {
      const ip = result?.ip;
      if (!ip) continue;

      const up = Boolean(result.alive);
      const latency = Number(result.latency) || 0;
      const prev = map.get(ip);
      const changedStatus = !prev || prev.up !== up;

      const record = {
        ip,
        up,
        latency,
        lastUpdate: nextAt.toISOString(),
        lastChange: changedStatus ? nextAt.toISOString() : prev.lastChange,
      };

      map.set(ip, record);
      if (changedStatus) changed.push(ip);
    }

    this.sequence += 1;
    const payload = {
      sequence: this.sequence,
      cycleAt: nextAt.toISOString(),
      type,
      changed,
      state: this.serializeType(type),
    };

    this.emit('update', payload);
  }

  serializeType(type) {
    return Array.from(this.stateByType[type].values())
      .map(({ ip, up, latency, lastChange }) => ({ ip, up, latency, lastChange }))
      .sort((a, b) => a.ip.localeCompare(b.ip));
  }

  snapshot() {
    return {
      sequence: this.sequence,
      updatedAt: new Date().toISOString(),
      branches: this.serializeType('branches'),
      dvr: this.serializeType('dvr'),
      servers: this.serializeType('servers'),
    };
  }
}

module.exports = new LiveStateStore();
