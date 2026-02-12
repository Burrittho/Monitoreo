import { useCallback, useEffect, useRef, useState } from 'react'
import { apiGet } from '../lib/api'

export default function useLiveStatus() {
  const [snapshot, setSnapshot] = useState(null)
  const [degradedMode, setDegradedMode] = useState(false)
  const [connected, setConnected] = useState(false)
  const fallbackTimerRef = useRef(null)
  const backoffRef = useRef(5000)

  const loadFallback = useCallback(async () => {
    try {
      const data = await apiGet('/api/live')
      setSnapshot(data)
      setDegradedMode(Boolean(data?.degradedMode))
      backoffRef.current = 5000
    } catch {
      backoffRef.current = Math.min(backoffRef.current * 2, 60000)
    } finally {
      fallbackTimerRef.current = setTimeout(loadFallback, backoffRef.current)
    }
  }, [])

  useEffect(() => {
    const es = new EventSource('/api/live/stream')

    const handleSnapshot = (event) => {
      const data = JSON.parse(event.data)
      setSnapshot(data)
      setDegradedMode(Boolean(data?.degradedMode))
      setConnected(true)
    }

    const handleLive = (event) => {
      const data = JSON.parse(event.data)
      setDegradedMode(Boolean(data?.degradedMode))
      setSnapshot((prev) => {
        if (!prev?.groups?.[data.group]) return prev
        const groups = { ...prev.groups }
        const group = { ...groups[data.group] }
        const hosts = Array.isArray(group.hosts) ? [...group.hosts] : []
        const idx = hosts.findIndex((h) => h.id === data.host.id)
        if (idx >= 0) hosts[idx] = data.host
        else hosts.push(data.host)
        group.hosts = hosts
        groups[data.group] = group
        return { ...prev, groups, degradedMode: data.degradedMode }
      })
    }

    const handleDb = (event) => {
      const data = JSON.parse(event.data)
      setDegradedMode(Boolean(data?.degradedMode))
    }

    es.addEventListener('snapshot', handleSnapshot)
    es.addEventListener('live-update', handleLive)
    es.addEventListener('db-status', handleDb)
    es.onerror = () => {
      setConnected(false)
      es.close()
      loadFallback()
    }

    return () => {
      es.close()
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
    }
  }, [loadFallback])

  return { snapshot, degradedMode, connected }
}
