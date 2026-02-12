const { EventEmitter } = require('events');
const env = require('../config/env');

class LiveStateStore extends EventEmitter {
  constructor() {
    super();
    this.groups = {
      branches: this.createGroupState(),
      dvr: this.createGroupState(),
      servers: this.createGroupState(),
    };
    this.degradedMode = false;
    this.dbMessage = 'ok';
  }

  createGroupState() {
    return {
      hosts: new Map(),
      recentEvents: [],
      totalTransitions: 0,
    };
  }

  setDbStatus({ degradedMode, message }) {
    this.degradedMode = degradedMode;
    this.dbMessage = message;
    this.emit('db-status', { degradedMode, message });
  }

  updateHost(group, host) {
    const bucket = this.groups[group];
    if (!bucket) return;

    const nowIso = new Date().toISOString();
    const previous = bucket.hosts.get(host.id);
    const current = {
      id: host.id,
      ip: host.ip,
      name: host.name,
      success: Boolean(host.success),
      latency: Number(host.latency || 0),
      timestamp: host.timestamp || nowIso,
      lastTransitionAt: previous?.lastTransitionAt || null,
    };

    if (previous && previous.success !== current.success) {
      current.lastTransitionAt = current.timestamp;
      bucket.totalTransitions += 1;
      bucket.recentEvents.unshift({
        id: current.id,
        ip: current.ip,
        name: current.name,
        from: previous.success ? 'UP' : 'DOWN',
        to: current.success ? 'UP' : 'DOWN',
        at: current.timestamp,
        group,
      });
      bucket.recentEvents = bucket.recentEvents.slice(0, env.liveEventBufferPerGroup);
    }

    bucket.hosts.set(current.id, current);
    this.emit('live-update', { group, host: current });
  }

  setHostInventory(group, hosts) {
    const bucket = this.groups[group];
    if (!bucket) return;
    for (const host of hosts) {
      const existing = bucket.hosts.get(host.id);
      bucket.hosts.set(host.id, {
        id: host.id,
        ip: host.ip,
        name: host.name,
        success: existing?.success ?? false,
        latency: existing?.latency ?? 0,
        timestamp: existing?.timestamp ?? null,
        lastTransitionAt: existing?.lastTransitionAt ?? null,
      });
    }
  }

  getSnapshot() {
    const groups = {};
    Object.entries(this.groups).forEach(([group, value]) => {
      const hosts = Array.from(value.hosts.values());
      const active = hosts.filter((h) => h.success).length;
      const inactive = hosts.length - active;
      const avgLatency = hosts.filter((h) => h.success).reduce((acc, h) => acc + h.latency, 0) / (active || 1);
      groups[group] = {
        hosts,
        summary: {
          total: hosts.length,
          active,
          inactive,
          avgLatency: Number(avgLatency.toFixed(2)),
          transitions: value.totalTransitions,
        },
        recentEvents: value.recentEvents,
      };
    });

    return {
      degradedMode: this.degradedMode,
      dbMessage: this.dbMessage,
      groups,
      serverTime: new Date().toISOString(),
    };
  }
}

module.exports = new LiveStateStore();
