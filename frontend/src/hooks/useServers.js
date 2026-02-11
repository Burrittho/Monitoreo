import { useState, useEffect, useCallback } from 'react'

export default function useServers() {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchServers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/nrdp/servers')
      if (!response.ok) throw new Error('Error fetching servers')
      const data = await response.json()
      setServers(data)
      setError(null)
    } catch (err) {
      console.error('Error loading servers:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServers()
    // Refresh cada 60 segundos
    const interval = setInterval(fetchServers, 60000)
    return () => clearInterval(interval)
  }, [fetchServers])

  return { servers, loading, error, refresh: fetchServers }
}
