import React from 'react'

export default function IncidentsView({ branchResults, dvrResults, serverResults }) {
  // Obtener todas las incidencias (dispositivos fuera de línea o con alta latencia)
  const getAllIncidents = () => {
    const incidents = []
    
    // Sucursales con problemas
    branchResults.forEach(result => {
      if (!result.success) {
        incidents.push({
          type: 'branch',
          severity: 'critical',
          name: result.name || 'Sucursal desconocida',
          ip: result.ip,
          issue: 'Sin conexión',
          latency: result.latency,
          timestamp: result.timestamp || new Date().toISOString()
        })
      } else if (result.latency > 70) {
        incidents.push({
          type: 'branch',
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
        incidents.push({
          type: 'dvr',
          severity: 'critical',
          name: result.name || 'DVR desconocido',
          ip: result.ip,
          issue: 'Sin conexión',
          latency: result.latency,
          timestamp: result.timestamp || new Date().toISOString()
        })
      } else if (result.latency > 70) {
        incidents.push({
          type: 'dvr',
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
        incidents.push({
          type: 'server',
          severity: 'critical',
          name: result.name || 'Servidor desconocido',
          ip: result.ip,
          issue: 'Sin conexión',
          latency: result.latency,
          timestamp: result.timestamp || new Date().toISOString()
        })
      } else if (result.latency > 70) {
        incidents.push({
          type: 'server',
          severity: 'warning',
          name: result.name || 'Servidor desconocido',
          ip: result.ip,
          issue: 'Alta latencia',
          latency: result.latency,
          timestamp: result.timestamp || new Date().toISOString()
        })
      }
    })

    // Ordenar por severidad (críticos primero) y luego por timestamp
    return incidents.sort((a, b) => {
      if (a.severity === 'critical' && b.severity === 'warning') return -1
      if (a.severity === 'warning' && b.severity === 'critical') return 1
      return new Date(b.timestamp) - new Date(a.timestamp)
    })
  }

  const incidents = getAllIncidents()
  const criticalIncidents = incidents.filter(i => i.severity === 'critical')
  const warningIncidents = incidents.filter(i => i.severity === 'warning')

  const getTypeIcon = (type) => {
    switch (type) {
      case 'branch': return 'fas fa-building'
      case 'dvr': return 'fas fa-video'
      case 'server': return 'fas fa-server'
      default: return 'fas fa-question-circle'
    }
  }

  const getTypeLabel = (type) => {
    switch (type) {
      case 'branch': return 'Sucursal'
      case 'dvr': return 'DVR'
      case 'server': return 'Servidor'
      default: return 'Desconocido'
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

  if (incidents.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-check-circle text-2xl text-gray-400 dark:text-gray-500"/>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Sin Incidencias Activas
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Todos los sistemas están funcionando correctamente
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumen de incidencias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Incidencias</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{incidents.length}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <i className="fas fa-exclamation-triangle text-gray-600 dark:text-gray-400"/>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Críticas</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{criticalIncidents.length}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <i className="fas fa-times-circle text-gray-600 dark:text-gray-400"/>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Advertencias</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{warningIncidents.length}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <i className="fas fa-exclamation-circle text-gray-600 dark:text-gray-400"/>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de incidencias */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Incidencias Activas
          </h2>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-600">
          {incidents.map((incident, index) => (
            <div key={`${incident.ip}-${index}`} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    incident.severity === 'critical' 
                      ? 'bg-gray-100 dark:bg-gray-700' 
                      : 'bg-gray-50 dark:bg-gray-800'
                  }`}>
                    <i className={`${getTypeIcon(incident.type)} text-gray-600 dark:text-gray-400`}/>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {incident.name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        incident.severity === 'critical'
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}>
                        {incident.severity === 'critical' ? 'Crítico' : 'Advertencia'}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs">
                        {getTypeLabel(incident.type)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {incident.issue}
                      {incident.latency && ` (${incident.latency}ms)`}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>IP: {incident.ip}</span>
                      <span>Detectado: {formatTimestamp(incident.timestamp)}</span>
                    </div>
                  </div>
                </div>
                
                <div className={`w-3 h-3 rounded-full ${
                  incident.severity === 'critical' ? 'bg-gray-600 animate-pulse' : 'bg-gray-400'
                }`}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
