import { Link } from 'react-router-dom'
import useServers from '../hooks/useServers'

export default function MonitorServers() {
  const { servers, loading, error, refresh } = useServers()

  function getStatusColor(status) {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'warning': return 'bg-yellow-500'
      case 'offline': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  function getStatusText(status, minutes) {
    if (status === 'never') return 'Sin datos'
    if (status === 'online') return 'Activo'
    if (status === 'warning') return `Inactivo ${minutes}m`
    return `Caído ${minutes}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando servidores...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Error: {error}</p>
          <button 
            onClick={refresh}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Servidores Monitoreados
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              {servers.length} servidor{servers.length !== 1 ? 'es' : ''} registrado{servers.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <i className="fas fa-sync-alt"></i>
            Actualizar
          </button>
        </div>

        {servers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <i className="fas fa-server text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No hay servidores registrados
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Los servidores aparecerán aquí cuando NSClient++ envíe la primera métrica
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {servers.map(server => (
              <Link
                key={server.id}
                to={`/servers/${server.hostname}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <i className="fas fa-server text-blue-600"></i>
                      {server.hostname}
                    </h3>
                    {server.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {server.description}
                      </p>
                    )}
                  </div>
                  <span 
                    className={`w-3 h-3 rounded-full ${getStatusColor(server.status)} flex-shrink-0`}
                    title={server.status}
                  ></span>
                </div>

                <div className="space-y-2 text-sm">
                  {server.ip_address && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <i className="fas fa-network-wired w-4"></i>
                      <span>{server.ip_address}</span>
                    </div>
                  )}
                  
                  {server.os && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <i className="fas fa-desktop w-4"></i>
                      <span>{server.os}</span>
                    </div>
                  )}
                  
                  {server.location && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <i className="fas fa-map-marker-alt w-4"></i>
                      <span>{server.location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <i className="fas fa-clock w-4"></i>
                    <span>
                      {getStatusText(server.status, server.minutes_since_last_seen)}
                    </span>
                  </div>
                  
                  {server.last_seen && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      Última vez: {new Date(server.last_seen).toLocaleString('es-MX')}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-end text-blue-600 dark:text-blue-400 text-sm font-medium">
                    Ver métricas
                    <i className="fas fa-arrow-right ml-2"></i>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
