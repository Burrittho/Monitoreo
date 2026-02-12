import { useMemo, useState } from 'react'
import BranchCard from '../components/BranchCard'
import DvrCard from '../components/DvrCard'
import IncidentsView from '../components/IncidentsView'
import useLiveStatus from '../hooks/useLiveStatus'

export default function Monitor() {
  const [view, setView] = useState('both')
  const { snapshot, degradedMode, connected } = useLiveStatus()

  const branchResults = snapshot?.groups?.branches?.hosts || []
  const dvrResults = snapshot?.groups?.dvr?.hosts || []
  const serverResults = snapshot?.groups?.servers?.hosts || []

  const sortedByHealth = useMemo(() => (items) => {
    const sorted = [...items].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    const red = []
    const yellow = []
    const green = []
    sorted.forEach((r) => {
      if (!r.success) red.push(r)
      else if (r.latency > 70) yellow.push(r)
      else green.push(r)
    })
    return [...red, ...yellow, ...green]
  }, [])

  const filteredBranchResults = sortedByHealth(branchResults)
  const filteredDvrResults = sortedByHealth(dvrResults)
  const filteredServerResults = sortedByHealth(serverResults)

  return (
    <div className="p-6 space-y-6">
      {degradedMode && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-800">
          DB offline: mostrando solo estado en vivo; no se guarda histórico.
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Monitor de Red</h1>
          <div className="text-xs text-gray-500">Live: {connected ? 'SSE' : 'fallback polling'}</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setView('both')} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700">Todos</button>
            <button onClick={() => setView('branches')} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700">Sucursales</button>
            <button onClick={() => setView('dvr')} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700">DVR</button>
            <button onClick={() => setView('servers')} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700">Servidores</button>
            <button onClick={() => setView('incidents')} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700">Incidencias</button>
          </div>
        </div>
      </div>

      {(view === 'both' || view === 'branches') && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBranchResults.map((r) => <BranchCard key={`b-${r.id}`} result={r} />)}
        </div>
      )}

      {(view === 'both' || view === 'dvr') && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDvrResults.map((r) => <DvrCard key={`d-${r.id}`} result={r} />)}
        </div>
      )}

      {(view === 'both' || view === 'servers') && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredServerResults.map((r) => <BranchCard key={`s-${r.id}`} result={r} />)}
        </div>
      )}

      {view === 'incidents' && <IncidentsView />}
    </div>
  )
}
