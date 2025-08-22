import { useEffect, useMemo, useRef, useState } from 'react'
import { apiGet } from '../lib/api'
import BranchCard from '../components/BranchCard'
import DvrCard from '../components/DvrCard'
import IncidentsView from '../components/IncidentsView'

export default function Monitor() {
  const [branchResults, setBranchResults] = useState([])
  const [dvrResults, setDvrResults] = useState([])
  const [serverResults, setServerResults] = useState([])
  const [view, setView] = useState('both') // both | branches | dvr | servers | incidents
  const refreshMsRef = useRef(30000)
  const timerRef = useRef(null)

  const filteredBranchResults = useMemo(() => {
    const data = Array.isArray(branchResults) ? branchResults : []
    // ordenar por nombre y agrupar: rojos, amarillos, verdes
    const sorted = [...data].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    const red = [], yellow = [], green = []
    sorted.forEach(r => {
      if (!r.success) red.push(r)
      else if (r.latency > 70) yellow.push(r)
      else green.push(r)
    })
    return [...red, ...yellow, ...green]
  }, [branchResults])

  const filteredDvrResults = useMemo(() => {
    const data = Array.isArray(dvrResults) ? dvrResults : []
    const sorted = [...data].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    const red = [], yellow = [], green = []
    sorted.forEach(r => {
      if (!r.success) red.push(r)
      else if (r.latency > 70) yellow.push(r)
      else green.push(r)
    })
    return [...red, ...yellow, ...green]
  }, [dvrResults])

  const filteredServerResults = useMemo(() => {
    const data = Array.isArray(serverResults) ? serverResults : []
    const sorted = [...data].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    const red = [], yellow = [], green = []
    sorted.forEach(r => {
      if (!r.success) red.push(r)
      else if (r.latency > 70) yellow.push(r)
      else green.push(r)
    })
    return [...red, ...yellow, ...green]
  }, [serverResults])

  async function loadOnce() {
    // intervalo desde backend
    try {
      const cfg = await apiGet('/api/config/refresh-interval')
      if (cfg?.intervalo) refreshMsRef.current = cfg.intervalo
    } catch {}

    try {
      const branches = await apiGet('/api/ips_report/ping-results')
      setBranchResults(Array.isArray(branches) ? branches[0] : branches)
    } catch (e) {
      console.error('Error branches', e)
    }

    try {
      const dvr = await apiGet('/api/ips_report/ping-results-dvr')
      setDvrResults(Array.isArray(dvr) ? dvr[0] : dvr)
    } catch (e) {
      console.error('Error dvr', e)
    }

    try {
      const servers = await apiGet('/api/ips_report/ping-results-server')
      setServerResults(Array.isArray(servers) ? servers[0] : servers)
    } catch (e) {
      console.error('Error servers', e)
    }
  }

  function schedule() {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      await loadOnce()
      schedule()
    }, refreshMsRef.current || 30000)
  }

  useEffect(() => {
    loadOnce().then(schedule)
    return () => clearTimeout(timerRef.current)
  }, [])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Monitor de Red</h1>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setView('both')} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'both' 
                  ? 'bg-gray-800 dark:bg-gray-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <i className="fas fa-th-large mr-2 text-gray-600 dark:text-gray-400" />
              Todos
            </button>
            <button 
              onClick={() => setView('branches')} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'branches' 
                  ? 'bg-gray-800 dark:bg-gray-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <i className="fas fa-building mr-2 text-gray-600 dark:text-gray-400" />
              Sucursales
            </button>
            <button 
              onClick={() => setView('dvr')} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'dvr' 
                  ? 'bg-gray-800 dark:bg-gray-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <i className="fas fa-video mr-2 text-gray-600 dark:text-gray-400" />
              DVR
            </button>
            <button 
              onClick={() => setView('servers')} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'servers' 
                  ? 'bg-gray-800 dark:bg-gray-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <i className="fas fa-server mr-2 text-gray-600 dark:text-gray-400" />
              Servidores
            </button>
            <button 
              onClick={() => setView('incidents')} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'incidents' 
                  ? 'bg-gray-800 dark:bg-gray-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <i className="fas fa-exclamation-triangle mr-2 text-gray-600 dark:text-gray-400" />
              Incidencias
            </button>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className={view === 'both' ? 'grid grid-cols-1 xl:grid-cols-2 gap-6' : 'grid grid-cols-1 gap-6'}>
        {view === 'incidents' && (
          <IncidentsView 
            branchResults={filteredBranchResults}
            dvrResults={filteredDvrResults}
            serverResults={filteredServerResults}
          />
        )}

        {(view === 'both' || view === 'branches') && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sucursales</h2>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">En línea</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Lento</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Fuera de línea</span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4 min-w-[280px]">
                {filteredBranchResults.map((r, idx) => (
                  <div key={`${r.ip}-${idx}`} className={r && r.success ? '' : 'animate-bounce'}>
                    <BranchCard result={r} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {(view === 'both' || view === 'dvr') && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">DVR</h2>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">En línea</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Lento</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Fuera de línea</span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4 min-w-[280px]">
                {filteredDvrResults.map((r, idx) => (
                  <div key={`${r.ip}-${idx}`} className={r && r.success ? '' : 'animate-bounce'}>
                    <DvrCard result={r} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {(view === 'both' || view === 'servers') && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Servidores</h2>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">En línea</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Lento</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Fuera de línea</span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4 min-w-[280px]">
                {filteredServerResults.map((r, idx) => (
                  <div key={`${r.ip}-${idx}`} className={r && r.success ? '' : 'animate-bounce'}>
                    <DvrCard result={r} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
