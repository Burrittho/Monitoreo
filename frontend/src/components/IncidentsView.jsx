import React, { useState, useEffect } from 'react'
import { apiGet } from '../lib/api'

export default function IncidentsView({ branchResults, dvrResults, serverResults }) {
  const [activeReports, setActiveReports] = useState(0)
  const [activeReportsData, setActiveReportsData] = useState([])
  const [isFullscreen, setIsFullscreen] = useState(false)

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

  // Manejar pantalla completa
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Manejar Escape para salir del fullscreen
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    if (isFullscreen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isFullscreen])

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
        descripcion: report.descripcion || '',
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
      <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-gray-100 dark:bg-gray-900 overflow-y-auto p-6' : ''}`}>
        {/* Header con botón de fullscreen */}
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <i className="fas fa-check-circle text-green-500 text-xl"/>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Dashboard de Incidencias
            </h1>
          </div>
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
            title={isFullscreen ? 'Salir de pantalla completa (ESC)' : 'Pantalla completa'}
          >
            <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}/>
            <span className="text-sm font-medium">
              {isFullscreen ? 'Salir' : 'Pantalla completa'}
            </span>
          </button>
        </div>
        
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
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-gray-100 dark:bg-gray-900 overflow-y-auto p-6' : ''}`}>
      {/* Header con botón de fullscreen */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center gap-3">
          <i className="fas fa-exclamation-triangle text-orange-500 text-xl"/>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Dashboard de Incidencias
          </h1>
        </div>
        <button
          onClick={toggleFullscreen}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
          title={isFullscreen ? 'Salir de pantalla completa (ESC)' : 'Pantalla completa'}
        >
          <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}/>
          <span className="text-sm font-medium">
            {isFullscreen ? 'Salir' : 'Pantalla completa'}
          </span>
        </button>
      </div>

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

      {/* Lista de incidencias y reportes categorizadas */}
      <div className="space-y-6">
        {/* Incidencias Críticas */}
        {allItems.filter(item => item.severity === 'critical').length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800">
            <div className="p-6 border-b border-red-200 dark:border-red-600 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">
                  <i className="fas fa-times-circle mr-2 text-red-600 dark:text-red-400"/>
                  Incidencias Críticas
                </h2>
                <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                  <span>{allItems.filter(item => item.severity === 'critical').length} críticas</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4 p-6">
              {allItems.filter(item => item.severity === 'critical').map((item, index) => {
                const severityConfig = getSeverityConfig(item.severity)
                const latencyDisplay = item.category === 'incident' 
                  ? (item.latency ? `${item.latency} ms` : 'Host no alcanzable')
                  : 'Sin conexión'
                
                return (
                  <div key={`critical-${item.ip || item.reportId}-${index}`} 
                       className="min-w-[140px] sm:min-w-[160px] rounded-xl p-4 shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 border-2 bg-red-500 border-red-400 cursor-pointer">
                    <div className="flex flex-col items-center p-2 rounded-lg">
                      <div className="flex items-center gap-1 mb-2 w-full justify-center">
                        <i className={`${getTypeIcon(item.type)} text-white text-xs`}/>
                        <span className="px-2 py-1 bg-red-400 text-white rounded-full text-[10px] font-medium">
                          {getTypeLabel(item.type)}
                        </span>
                      </div>
                      
                      <h5 className="text-xs sm:text-sm font-bold text-white tracking-tight overflow-hidden text-ellipsis whitespace-nowrap w-full text-center mb-2" title={item.name}>
                        {item.name}
                      </h5>
                    </div>
                      <p className="font-bold text-[10px] sm:text-xs text-white text-center break-words max-w-full">
                        {latencyDisplay}
                      </p>
                    </div>

                )
              })}
            </div>
          </div>
        )}

        {/* Advertencias */}
        {allItems.filter(item => item.severity === 'warning').length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-yellow-200 dark:border-yellow-800">
            <div className="p-6 border-b border-yellow-200 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
                  <i className="fas fa-exclamation-triangle mr-2 text-yellow-600 dark:text-yellow-400"/>
                  Advertencias
                </h2>
                <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>{allItems.filter(item => item.severity === 'warning').length} advertencias</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4 p-6">
              {allItems.filter(item => item.severity === 'warning').map((item, index) => {
                const severityConfig = getSeverityConfig(item.severity)
                const latencyDisplay = item.category === 'incident' 
                  ? (item.latency ? `${item.latency} ms` : 'Host no alcanzable')
                  : 'Latencia alta'
                
                return (
                  <div key={`warning-${item.ip || item.reportId}-${index}`} 
                       className="min-w-[140px] sm:min-w-[160px] rounded-xl p-4 shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 border-2 bg-yellow-500 border-yellow-400 cursor-pointer">
                    <div className="flex flex-col items-center p-2 rounded-lg">
                      <div className="flex items-center gap-1 mb-2 w-full justify-center">
                        <i className={`${getTypeIcon(item.type)} text-white text-xs`}/>
                        <span className="px-2 py-1 bg-yellow-400 text-white rounded-full text-[10px] font-medium">
                          {getTypeLabel(item.type)}
                        </span>
                      </div>
                      
                      <h5 className="text-xs sm:text-sm font-bold text-white tracking-tight overflow-hidden text-ellipsis whitespace-nowrap w-full text-center mb-2" title={item.name}>
                        {item.name}
                      </h5>
                      
                      <div className="flex items-center my-2 justify-center w-full">
                        <div className="relative mr-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-600" style={{ boxShadow: '0 0 8px 2px #d4ad38ff' }} />
                        </div>
                        <span className="text-[10px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full bg-yellow-600 text-white border border-white/70">
                          Lento
                        </span>
                      </div>
                      
                      <p className="font-bold text-[10px] sm:text-xs text-white text-center break-words max-w-full">
                        {latencyDisplay}
                      </p>
                      
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Reportes Informativos */}
        {allItems.filter(item => item.severity === 'info').length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="p-6 border-b border-blue-200 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  <i className="fas fa-info-circle mr-2 text-blue-600 dark:text-blue-400"/>
                  Reportes Informativos
                </h2>
                <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>{allItems.filter(item => item.severity === 'info').length} reportes activos</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
              {allItems.filter(item => item.severity === 'info').map((item, index) => {
                const priorityColor = {
                  'alta': 'bg-red-500 text-white',
                  'media': 'bg-yellow-500 text-white',
                  'baja': 'bg-green-500 text-white'
                }[item.prioridad] || 'bg-gray-500 text-white'
                
                return (
                  <div key={`info-${item.reportId || index}`} 
                       className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-700/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden">
                    
                    {/* Header con icono y estado */}
                    <div className="blue-600 to-indigo-600 p-4 text-white relative overflow-hidden">
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-end">
                            <h3 className="font-semibold text-lg text-white truncate max-w-[200px]" title={item.name}>{item.name}
                              </h3>
                          </div>
                          <div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${priorityColor}`}>
                              {item.prioridad}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contenido principal */}
                    <div className="p-2 space-y-3">

                      {/* Información del reporte */}
                      {item.numeroTicket !== 'No asignado' && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                Número de reporte:
                              </span>
                            </div>
                            <span className=" text-white px-3 py-1 rounded-full text-s font-mono">
                              #{item.numeroTicket}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                      {/* Información del proveedor */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-gray-800/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-center text-gray-500 dark:text-gray-400 uppercase tracking-wide">Proveedor:</span>
                          </div>
                          <p className="text-gray-900 dark:text-white font-medium text-sm text-center">
                            {item.proveedor}
                          </p>
                        </div>

                        {item.cuenta && (
                          <div className="bg-gray-50 dark:bg-gray-800/30 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium text-center text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cuenta</span>
                            </div>
                            <p className="text-gray-900 dark:text-white font-medium text-sm text-center">
                              {item.cuenta}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Descripción del problema */}
                      <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-blue-100 dark:border-blue-800/30">
                        <div className="flex items-start gap-3">
                          <div className="flex flex-shrink-0 items-center justify-center w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full mt-1">
                            <i className="fas fa-exclamation text-orange-600 dark:text-orange-400 text-sm"/>
                          </div>
                          <div className="flex-1">
                            {item.descripcion && (
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                                  Descripción del reporte:
                                </h3>
                              </div>
                            )}
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-3">{item.descripcion}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                    {/* Footer con información adicional */}
                    <div className="bg-gray-50 dark:bg-gray-800/30 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <i className="fas fa-user text-gray-500 dark:text-gray-400 text-xs"/>
                            <span className="text-xs text-left text-gray-600 dark:text-gray-400">
                              {item.usuario}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <i className="fas fa-clock text-gray-500 dark:text-gray-400 text-xs"/>
                            <span className="text-xs text-right text-gray-600 dark:text-gray-400">
                              {formatTimestamp(item.fechaReporte)}
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
