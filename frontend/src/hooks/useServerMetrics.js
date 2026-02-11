import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

export default function useServerMetrics() {
  const { hostname } = useParams()
  const [server, setServer] = useState(null)
  const [metrics, setMetrics] = useState([])
  const [services, setServices] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!hostname) return

    async function loadData() {
      try {
        setLoading(true)
        
        const [serverRes, metricsRes, servicesRes, statsRes] = await Promise.all([
          fetch(`/api/nrdp/servers/${hostname}`),
          fetch(`/api/nrdp/servers/${hostname}/metrics?limit=50`),
          fetch(`/api/nrdp/servers/${hostname}/services`),
          fetch(`/api/nrdp/servers/${hostname}/stats?hours=24`)
        ])

        if (!serverRes.ok) throw new Error('Server not found')

        const [serverData, metricsData, servicesData, statsData] = await Promise.all([
          serverRes.json(),
          metricsRes.json(),
          servicesRes.json(),
          statsRes.json()
        ])

        setServer(serverData)
        setMetrics(metricsData)
        setServices(servicesData)
        setStats(statsData)
        setError(null)
      } catch (err) {
        console.error('Error loading server data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
    const interval = setInterval(loadData, 30000) // Refresh cada 30 segundos
    return () => clearInterval(interval)
  }, [hostname])

  return { server, metrics, services, stats, loading, error }
}
