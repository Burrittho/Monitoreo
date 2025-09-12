import { useState, useEffect } from 'react'
import { apiGet } from '../../lib/api'

export default function ReportsStatus({ ipId }) {
  const [reportsData, setReportsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchActiveReports = async () => {
      if (!ipId) {
        setReportsData([])
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        // Obtener reportes activos (estado != cerrado/concluido) para la sucursal específica
        const response = await apiGet(`/api/reports/reportes?estado=abiertos&sucursal=${ipId}&limit=100`)
        
        if (response && response.data) {
          // Filtrar solo los reportes de la sucursal específica
          const activeReports = response.data.filter(report => 
            report.sucursal_id == ipId && 
            report.estado && 
            !['cerrado', 'concluido'].includes(report.estado.toLowerCase())
          )
          setReportsData(activeReports)
        } else {
          setReportsData([])
        }
      } catch (err) {
        console.error('Error fetching active reports:', err)
        setError('Error al obtener reportes activos')
        setReportsData([])
      } finally {
        setLoading(false)
      }
    }

    fetchActiveReports()
  }, [ipId])

  const getStatusColor = (estado) => {
    const s = (estado || '').toLowerCase()
    if (s === 'abierto') return 'text-red-600 dark:text-red-400'
    if (s === 'en_proceso' || s === 'en proceso') return 'text-yellow-600 dark:text-yellow-400'
    if (s === 'pendiente') return 'text-orange-600 dark:text-orange-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  const getStatusText = (estado) => {
    const s = (estado || '').toLowerCase()
    if (s === 'abierto') return 'Abierto'
    if (s === 'en_proceso' || s === 'en proceso') return 'En Proceso'
    if (s === 'pendiente') return 'Pendiente'
    if (s === 'resuelto') return 'Resuelto'
    return estado || 'Desconocido'
  }

  const getPriorityColor = (prioridad) => {
    const p = (prioridad || '').toLowerCase()
    if (p === 'alta' || p === 'high') return 'text-red-600 dark:text-red-400'
    if (p === 'media' || p === 'medium') return 'text-yellow-600 dark:text-yellow-400'
    if (p === 'baja' || p === 'low') return 'text-green-600 dark:text-green-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
            <i className="fas fa-file-alt text-orange-600 dark:text-orange-400 text-sm"/>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white text-sm">Reportes</h3>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <dt className="text-gray-500 dark:text-gray-400">Cargando...</dt>
            <dd className="font-medium text-gray-500 dark:text-gray-400">
              <div className="animate-pulse h-3 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
            </dd>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
            <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-sm"/>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white text-sm">Reportes</h3>
        </div>
        
        <div className="text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      </div>
    )
  }

  // Si no hay reportes activos
  if (reportsData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
            <i className="fas fa-check-circle text-green-600 dark:text-green-400 text-sm"/>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white text-sm">Reportes</h3>
        </div>
        
        <dl className="space-y-2">
          <div className="flex justify-between text-xs">
            <dt className="text-gray-500 dark:text-gray-400">Estado</dt>
            <dd className="font-medium text-green-600 dark:text-green-400">Sin reportes activos</dd>
          </div>
        </dl>
      </div>
    )
  }

  // Si hay reportes activos
  const totalReports = reportsData.length
  const highPriorityReports = reportsData.filter(r => 
    (r.prioridad || '').toLowerCase() === 'alta' || 
    (r.prioridad || '').toLowerCase() === 'high'
  ).length

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
          <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-sm"/>
        </div>
        <h3 className="font-medium text-gray-900 dark:text-white text-sm">Reportes</h3>
        <span className="ml-auto text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
          {totalReports}
        </span>
      </div>
      
      <dl className="space-y-2">
        <div className="flex justify-between text-xs">
          <dt className="text-gray-500 dark:text-gray-400">Activos</dt>
          <dd className="font-medium text-red-600 dark:text-red-400">
            {totalReports} reporte{totalReports !== 1 ? 's' : ''}
          </dd>
        </div>
        
        {highPriorityReports > 0 && (
          <div className="flex justify-between text-xs">
            <dt className="text-gray-500 dark:text-gray-400">Alta prioridad</dt>
            <dd className="font-medium text-red-700 dark:text-red-300">
              {highPriorityReports}
            </dd>
          </div>
        )}
        
        <div className="flex justify-between text-xs">
          <dt className="text-gray-500 dark:text-gray-400">Proveedor</dt>
          <dd className="font-medium text-gray-900 dark:text-gray-100">
            {reportsData[0].proveedor || 'No especificado'}
          </dd>
        </div>
        
        {reportsData[0].cuenta && (
          <div className="flex justify-between text-xs">
            <dt className="text-gray-500 dark:text-gray-400">Cuenta</dt>
            <dd className="font-medium text-gray-900 dark:text-gray-100">
              {reportsData[0].cuenta}
            </dd>
          </div>
        )}
        
        {reportsData.length === 1 && reportsData[0].numero_ticket && (
          <div className="flex justify-between text-xs">
            <dt className="text-gray-500 dark:text-gray-400">Reporte #</dt>
            <dd className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-900 dark:text-gray-100">
              {reportsData[0].numero_ticket}
            </dd>
          </div>
        )}
        
        {/* Mostrar detalles adicionales si hay múltiples reportes */}
        {reportsData.length > 1 && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Proveedores afectados:
            </div>
            <div className="flex flex-wrap gap-1">
              {[...new Set(reportsData.map(r => r.proveedor))].slice(0, 2).map(proveedor => (
                <span 
                  key={proveedor}
                  className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded"
                >
                  {proveedor}
                </span>
              ))}
              {[...new Set(reportsData.map(r => r.proveedor))].length > 2 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{[...new Set(reportsData.map(r => r.proveedor))].length - 2} más
                </span>
              )}
            </div>
          </div>
        )}
      </dl>
    </div>
  )
}
