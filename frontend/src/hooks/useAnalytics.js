import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiGet } from '../lib/api'

// Función para obtener rango de fecha inicial (última hora)
function getInitialDateRange() {
  const now = new Date()
  const start = new Date(now.getTime() - 60 * 60 * 1000) // -1 hora
  
  return { 
    startDate: start.toISOString(), 
    endDate: now.toISOString() 
  }
}

// Validar que el rango no exceda 24 horas
function validateDateRange(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  
  if (diffHours < 0) {
    throw new Error('La fecha de fin debe ser posterior a la fecha de inicio')
  }
  if (diffHours > 24) {
    throw new Error('El rango máximo de búsqueda es de 24 horas')
  }
  if (diffHours === 0) {
    throw new Error('El rango mínimo es de 1 minuto')
  }
  
  return true
}

export default function useAnalytics() {
  const [ips, setIps] = useState([])
  const [ipId, setIpId] = useState('')
  const [dateRange, setDateRange] = useState(() => getInitialDateRange())
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
      // Validar rango de fechas
      validateDateRange(dateRange.startDate, dateRange.endDate)
      
      const { startDate, endDate } = dateRange
      const params = new URLSearchParams({ ipId, startDate, endDate })
      
      // Siempre intentar obtener gráficos, sin limitación de tiempo
      const [chartResp, downtimeResp, internetResp, currentOutagesResp, internetHistoryResp] = await Promise.all([
        apiGet(`/api/ping_history/chart?${params}`),
        apiGet(`/api/ips_report/downtime?${params}`),
        apiGet(`/api/internet/both/${ipId}`),
        apiGet(`/api/ips_report/current-outages`),
        apiGet(`/api/internet/history/${ipId}?limit=10`),
      ])

      // Siempre configurar stats y chart si hay datos
      setStats(chartResp?.statistics || null)
      setChart(chartResp || null)

      const outagesArr = Array.isArray(downtimeResp) ? downtimeResp : []
      setOutages(outagesArr)
      setInternet(internetResp || null)
      setCurrentOutages(Array.isArray(currentOutagesResp) ? (Array.isArray(currentOutagesResp[0]) ? currentOutagesResp[0] : currentOutagesResp) : [])
      const historyItems = Array.isArray(internetHistoryResp?.items)
        ? internetHistoryResp.items
        : (Array.isArray(internetHistoryResp) ? internetHistoryResp : [])
      setInternetHistory(historyItems)
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
  }, [ipId, dateRange])

  useEffect(() => { fetchIps() }, [fetchIps])
  useEffect(() => { if (ipId) load() }, [ipId, dateRange, load])

  // Función para actualizar el rango de fechas
  const setDateRangeHandler = useCallback((newDateRange) => {
    try {
      validateDateRange(newDateRange.startDate, newDateRange.endDate)
      setDateRange(newDateRange)
      setError('') // Limpiar error si la validación pasa
    } catch (e) {
      setError(e.message)
    }
  }, [])

  const value = useMemo(() => ({
    ips, ipId, setIpId, 
    dateRange, setDateRange: setDateRangeHandler,
    stats, chart, outages, currentOutages, internet, internetHistory, 
    loading, loadingIps, error,
    refresh: load
  }), [ips, ipId, dateRange, setDateRangeHandler, stats, chart, outages, currentOutages, internet, internetHistory, loading, loadingIps, error, load])

  return value
}
