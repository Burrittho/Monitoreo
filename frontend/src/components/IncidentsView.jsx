import React, { useState, useEffect } from 'react'
import { apiGet } from '../lib/api'

export default function IncidentsView({ branchResults, dvrResults, serverResults }) {
  const [activeReports, setActiveReports] = useState(0)
  const [activeReportsData, setActiveReportsData] = useState([])

  // Cargar reportes activos de internet
  useEffect(() => {
    const fetchActiveReports = async () => {
      try {
        const response = await apiGet('/api/reports/reportes?estado=abierto')
        const reports = Array.isArray(response?.data) ? response.data : []
        setActiveReports(reports.length)
        setActiveReportsData(reports)
      } catch (error) {
        console.error('Error fetching active reports:', error)
        setActiveReports(0)
        setActiveReportsData([])
      }
    }

    fetchActiveReports()
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchActiveReports, 30000)
    return () => clearInterval(interval)
  }, [])
  // Obtener todas las incidencias y reportes combinados
  const getAllIncidentsAndReports = () => {
    const items = []
    
    // Sucursales con problemas
    branchResults.forEach(result => {
      if (!result.success) {
        items.push({
          type: 'branch',
          category: 'incident',
          severity: 'critical',
          name: result.name || 'Sucursal desconocida',
          ip: result.ip,
          issue: 'Sin conexión',
          latency: result.latency,
          timestamp: result.timestamp || new Date().toISOString()
        })
      } else if (result.latency > 70) {
        items.push({
          type: 'branch',
          category: 'incident',
          severity: 'warning',
          name: result.name || 'Sucursal desconocida',
          ip: result.ip,
          issue: 'Alta latencia',
          latency: result.latency,
          timestamp: result.timestamp || new Date().toISOString()
        })
      }
    })

    // DVR con problemas
    dvrResults.forEach(result => {
      if (!result.success) {
        items.push({
          type: 'dvr',
          category: 'incident',
          severity: 'critical',
          name: result.name || 'DVR desconocido',
          ip: result.ip,
          issue: 'Sin conexión',
          latency: result.latency,
          timestamp: result.timestamp || new Date().toISOString()
        })
      } else if (result.latency > 70) {
        items.push({
          type: 'dvr',
          category: 'incident',
          severity: 'warning',
          name: result.name || 'DVR desconocido',
          ip: result.ip,
          issue: 'Alta latencia',
          latency: result.latency,
          timestamp: result.timestamp || new Date().toISOString()
        })
      }
    })

    // Servidores con problemas
    serverResults.forEach(result => {
      if (!result.success) {
        items.push({
          type: 'server',
          category: 'incident',
          severity: 'critical',
          name: result.name || 'Servidor desconocido',
          ip: result.ip,
          issue: 'Sin conexión',
          latency: result.latency,
          timestamp: result.timestamp || new Date().toISOString()
        })
      } else if (result.latency > 70) {
        items.push({
          type: 'server',
          category: 'incident',
          severity: 'warning',
          name: result.name || 'Servidor desconocido',
          ip: result.ip,
          issue: 'Alta latencia',
          latency: result.latency,
          timestamp: result.timestamp || new Date().toISOString()
        })
      }
    })

    // Agregar reportes activos
    activeReportsData.forEach(report => {
      items.push({
        type: 'report',
        category: 'report',
        severity: 'info',
        name: report.sucursal_nombre || report.sucursal || 'Sucursal desconocida',
        textoInternet: report.texto_internet || 'Reporte de internet',
        proveedor: report.proveedor || 'Proveedor no especificado',
        cuenta: report.cuenta || report.cuenta_proveedor || '',
        numeroTicket: report.numero_ticket || 'No asignado',
        usuario: report.usuario || 'Usuario desconocido',
        fechaReporte: report.fecha_reporte || report.fecha_incidencia || new Date().toISOString(),
        prioridad: report.prioridad || 'media'
      })
    })

    // Ordenar por severidad y timestamp
    return items.sort((a, b) => {
      // Primero críticos, luego advertencias, luego informativos
      const severityOrder = { critical: 0, warning: 1, info: 2 }
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity]
      }
      return new Date(b.timestamp) - new Date(a.timestamp)
    })
  }

  const allItems = getAllIncidentsAndReports()
  const incidents = allItems.filter(item => item.category === 'incident')
  const criticalIncidents = incidents.filter(i => i.severity === 'critical')
  const warningIncidents = incidents.filter(i => i.severity === 'warning')

  const getTypeIcon = (type) => {
    switch (type) {
      case 'branch': return 'fas fa-building'
      case 'dvr': return 'fas fa-video'
      case 'server': return 'fas fa-server'
      case 'report': return 'fas fa-file-alt'
      default: return 'fas fa-question-circle'
    }
  }

  const getTypeLabel = (type) => {
    switch (type) {
      case 'branch': return 'Sucursal'
      case 'dvr': return 'DVR'
      case 'server': return 'Servidor'
      case 'report': return 'Reporte'
      default: return 'Desconocido'
    }
  }

  const getSeverityConfig = (severity) => {
    switch (severity) {
      case 'critical':
        return {
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
          pulse: 'bg-red-600 animate-pulse',
          label: 'Crítico',
          icon: 'fas fa-times-circle'
        }
      case 'warning':
        return {
          color: 'text-yellow-600 dark:text-yellow-400',
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
          pulse: 'bg-yellow-500',
          label: 'Advertencia',
          icon: 'fas fa-exclamation-triangle'
        }
      case 'info':
        return {
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
          pulse: 'bg-blue-500',
          label: 'Informativo',
          icon: 'fas fa-info-circle'
        }
      default:
        return {
          color: 'text-gray-600 dark:text-gray-400',
          bg: 'bg-gray-50 dark:bg-gray-800',
          border: 'border-gray-200 dark:border-gray-700',
          badge: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
          pulse: 'bg-gray-400',
          label: 'Desconocido',
          icon: 'fas fa-question-circle'
        }
    }
  }

  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString('es-MX', {
        dateStyle: 'short',
        timeStyle: 'short'
      })
    } catch {
      return 'Fecha desconocida'
    }
  }

  if (allItems.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-check-circle text-2xl text-green-600 dark:text-green-400"/>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Todo Funcionando Correctamente
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            No hay incidencias activas ni reportes pendientes
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Métricas de incidencias */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Incidencias</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{allItems.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <i className="fas fa-chart-bar text-blue-600 dark:text-blue-400"/>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-800 dark:text-red-200">Críticas</p>
              <p className="text-2xl font-semibold text-red-900 dark:text-red-100">{criticalIncidents.length}</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">Hosts sin sistema</p>
            </div>
            <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
              <i className="fas fa-times-circle text-red-600 dark:text-red-400"/>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-yellow-200 dark:border-yellow-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">Advertencias</p>
              <p className="text-2xl font-semibold text-yellow-900 dark:text-yellow-100">{warningIncidents.length}</p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Latencia alta</p>
            </div>
            <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
              <i className="fas fa-exclamation-triangle text-yellow-600 dark:text-yellow-400"/>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-200">Informativo</p>
              <p className="text-2xl font-semibold text-blue-900 dark:text-blue-100">{activeReports}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Reportes activos</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <i className="fas fa-info-circle text-blue-600 dark:text-blue-400"/>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de incidencias y reportes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Incidencias y Reportes Activos
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Crítico</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Advertencia</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Informativo</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          <div className="divide-y divide-gray-200 dark:divide-gray-600">
            {allItems.map((item, index) => {
              const severityConfig = getSeverityConfig(item.severity)
              
              return (
                <div key={`${item.ip || item.reportId}-${index}`} 
                     className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 ${
                       item.category === 'report' ? 'border-l-4 border-l-blue-400' : ''
                     }`}>
                  <div className="flex items-start gap-4">
                    {/* Icono del estado */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${severityConfig.bg}`}>
                      <i className={`${getTypeIcon(item.type)} ${severityConfig.color}`}/>
                    </div>
                    
                    {/* Contenido principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {item.name}
                        </h3>
                        
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${severityConfig.badge}`}>
                          {severityConfig.label}
                        </span>
                        
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs">
                          {getTypeLabel(item.type)}
                        </span>
                      </div>
                      
                      {/* Descripción del problema */}
                      <div className="space-y-1 mb-2">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {item.issue}
                          {item.latency && item.category === 'incident' && (
                            <span className="ml-2 font-mono text-xs text-gray-500 dark:text-gray-400">
                              Latencia: {item.latency}ms
                            </span>
                          )}
                        </p>
                        
                        {/* Información específica para reportes informativos */}
                        {item.category === 'report' && (
                          <div className="space-y-1">
                            {/* Nombre ya está arriba */}
                            <p className="text-xs text-gray-700 dark:text-gray-200 font-semibold">
                              {item.textoInternet}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Proveedor:</span> {item.proveedor}
                            </p>
                            {item.cuenta && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                <span className="font-medium">Cuenta:</span> {item.cuenta}
                              </p>
                            )}
                            {item.numeroTicket !== 'No asignado' && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                <span className="font-medium">Reporte:</span> {item.numeroTicket}
                              </p>
                            )}
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                              <span className="font-medium">Usuario:</span> {item.usuario}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <span className="text-xs text-gray-500 dark:text-gray-300">
                                <span className="font-medium">Fecha de reporte:</span> {formatTimestamp(item.fechaReporte)}
                              </span>
                              <span className="text-xs text-blue-700 dark:text-blue-300 font-medium capitalize">
                                Prioridad: {item.prioridad}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Información adicional */}
                      {item.category !== 'report' && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <i className="fas fa-network-wired w-3"></i>
                          <span>{item.ip}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Indicador de estado */}
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${severityConfig.pulse}`}></div>
                      {item.category === 'incident' && item.severity === 'critical' && (
                        <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                          OFFLINE
                        </div>
                      )}
                      {item.category === 'incident' && item.severity === 'warning' && (
                        <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                          SLOW
                        </div>
                      )}
                      {item.category === 'report' && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          ACTIVE
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Footer con resumen */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-600 dark:text-gray-400">
              Mostrando {allItems.length} elementos activos
            </div>
            <div className="text-gray-500 dark:text-gray-400">
              Última actualización: {new Date().toLocaleTimeString('es-MX')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
