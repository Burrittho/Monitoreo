import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiGet } from '../lib/api'

function getDateRange(range) {
  // Usar UTC para evitar problemas de zona horaria con la base de datos
  const now = new Date()
  const start = new Date()
  
  switch (range) {
    case '1h': start.setUTCHours(start.getUTCHours()-1); break
    case '3h': start.setUTCHours(start.getUTCHours()-3); break
    case '6h': start.setUTCHours(start.getUTCHours()-6); break
    case '12h': start.setUTCHours(start.getUTCHours()-12); break
    case '24h': start.setUTCDate(start.getUTCDate()-1); break
    case '3d': start.setUTCDate(start.getUTCDate()-3); break
    case '7d': start.setUTCDate(start.getUTCDate()-7); break
    case '30d': start.setUTCDate(start.getUTCDate()-30); break
    default: start.setUTCHours(start.getUTCHours()-1)
  }
  
  return { startDate: start.toISOString(), endDate: now.toISOString() }
}

export default function useAnalytics() {
  const [ips, setIps] = useState([])
  const [ipId, setIpId] = useState('')
  const [range, setRange] = useState('1h')
  const [loadingIps, setLoadingIps] = useState(false)

  const [stats, setStats] = useState(null)
  const [chart, setChart] = useState(null)
  const [outages, setOutages] = useState([])
  const [currentOutages, setCurrentOutages] = useState([])
  const [internet, setInternet] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [internetHistory, setInternetHistory] = useState([])

  const fetchIps = useCallback(async () => {
    setLoadingIps(true)
    try {
      // preferir /api/ips/ips como en legacy
      let data = await apiGet('/api/ips/ips')
      if (!Array.isArray(data)) {
        // fallback a ping-results o ping_history/ips
        try {
          const r = await apiGet('/api/ping_history/ips')
          data = Array.isArray(r) ? r : []
        } catch {}
      }
      const list = Array.isArray(data) ? data : []
      setIps(list)
      if (!ipId && list.length > 0) {
        setIpId(String(list[0].id))
      }
    } catch (e) {
      setIps([])
    } finally {
      setLoadingIps(false)
    }
  }, [])

  const load = useCallback(async () => {
    if (!ipId) return
    setLoading(true)
    setError('')
    try {
      const { startDate, endDate } = getDateRange(range)
      const params = new URLSearchParams({ ipId, startDate, endDate })
      const canChart = ['1h','3h','6h','12h'].includes(range)

      const [chartOrStatsResp, downtimeResp, internetResp, currentOutagesResp, internetHistoryResp] = await Promise.all([
        canChart ? apiGet(`/api/ping_history/chart?${params}`) : apiGet(`/api/ping_history/stats?${params}`),
        apiGet(`/api/ips_report/downtime?${params}`),
        apiGet(`/api/internet/both/${ipId}`),
        apiGet(`/api/ips_report/current-outages`),
        apiGet(`/api/internet/history/${ipId}?limit=10`),
      ])

      // chart/statistics
      if (canChart) {
        setStats(chartOrStatsResp?.statistics || null)
        setChart(chartOrStatsResp || null)
      } else {
        setStats(chartOrStatsResp?.statistics || null)
        setChart(null)
      }

      const outagesArr = Array.isArray(downtimeResp) ? downtimeResp : []
      setOutages(outagesArr)
      setInternet(internetResp || null)
      setCurrentOutages(Array.isArray(currentOutagesResp) ? (Array.isArray(currentOutagesResp[0]) ? currentOutagesResp[0] : currentOutagesResp) : [])
      setInternetHistory(Array.isArray(internetHistoryResp) ? internetHistoryResp : [])
    } catch (e) {
      setError(e.message)
      setStats(null)
      setChart(null)
      setOutages([])
      setInternet(null)
      setCurrentOutages([])
      setInternetHistory([])
    } finally {
      setLoading(false)
    }
  }, [ipId, range])

  useEffect(() => { fetchIps() }, [fetchIps])
  useEffect(() => { if (ipId) load() }, [ipId, range, load])

  const value = useMemo(() => ({
    ips, ipId, setIpId, range, setRange,
    stats, chart, outages, currentOutages, internet, internetHistory, loading, loadingIps, error,
    refresh: load
  }), [ips, ipId, range, stats, chart, outages, currentOutages, internet, internetHistory, loading, loadingIps, error, load])

  return value
}
