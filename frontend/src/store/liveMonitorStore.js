import { API_BASE, apiGet } from '../lib/api'

const state = {
  snapshot: {
    branches: [],
    dvr: [],
    servers: [],
    updatedAt: null,
  },
  metadata: {
    branches: [],
    dvr: [],
    servers: [],
  },
  connected: false,
}

const listeners = new Set()
let eventSource = null
let pollTimer = null
let retryMs = 1000
let bootstrapped = false

function norm(data) {
  if (Array.isArray(data)) return Array.isArray(data[0]) ? data[0] : data
  return []
}

function notify() {
  listeners.forEach((l) => l())
}

function mergeType(type) {
  const meta = state.metadata[type] || []
  const liveMap = new Map((state.snapshot[type] || []).map((it) => [it.ip, it]))
  return meta.map((item) => {
    const live = liveMap.get(item.ip)
    if (!live) return item
    return {
      ...item,
      success: live.up ? 1 : 0,
      latency: live.latency,
      lastChange: live.lastChange,
    }
  })
}

function setSnapshot(snapshot) {
  state.snapshot = {
    branches: snapshot?.branches || [],
    dvr: snapshot?.dvr || [],
    servers: snapshot?.servers || [],
    updatedAt: snapshot?.updatedAt || new Date().toISOString(),
  }
  notify()
}

async function bootstrapMetadata() {
  if (bootstrapped) return
  bootstrapped = true
  try {
    const [branches, dvr, servers] = await Promise.all([
      apiGet('/api/ips_report/ping-results').catch(() => []),
      apiGet('/api/ips_report/ping-results-dvr').catch(() => []),
      apiGet('/api/ips_report/ping-results-server').catch(() => []),
    ])
    state.metadata = {
      branches: norm(branches),
      dvr: norm(dvr),
      servers: norm(servers),
    }
    notify()
  } catch {
    // noop
  }
}

function schedulePolling() {
  clearTimeout(pollTimer)
  pollTimer = setTimeout(async () => {
    try {
      const data = await apiGet('/api/live')
      state.connected = false
      setSnapshot(data)
      retryMs = 1000
    } catch {
      retryMs = Math.min(retryMs * 2, 30000)
    }
    schedulePolling()
  }, retryMs)
}

function connectSse() {
  if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
    schedulePolling()
    return
  }

  try {
    eventSource = new EventSource(`${API_BASE}/api/live/stream`)
    eventSource.addEventListener('snapshot', (event) => {
      state.connected = true
      retryMs = 1000
      setSnapshot(JSON.parse(event.data))
    })
    eventSource.addEventListener('update', (event) => {
      state.connected = true
      const payload = JSON.parse(event.data)
      const next = {
        ...state.snapshot,
        [payload.type]: payload.state,
        updatedAt: payload.cycleAt,
      }
      setSnapshot(next)
    })
    eventSource.onerror = () => {
      state.connected = false
      if (eventSource) {
        eventSource.close()
        eventSource = null
      }
      schedulePolling()
      notify()
    }
  } catch {
    schedulePolling()
  }
}

function ensureRunning() {
  bootstrapMetadata()
  if (eventSource || pollTimer) return
  connectSse()
}

function stop() {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
  clearTimeout(pollTimer)
  pollTimer = null
}

export function subscribeLiveMonitor(listener) {
  listeners.add(listener)
  ensureRunning()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) stop()
  }
}

export function getLiveMonitorSnapshot() {
  return {
    connected: state.connected,
    updatedAt: state.snapshot.updatedAt,
    branches: mergeType('branches'),
    dvr: mergeType('dvr'),
    servers: mergeType('servers'),
  }
}
