import { Link } from 'react-router-dom'
import useServerMetrics from '../hooks/useServerMetrics'

export default function ServerDetail() {
  const { server, metrics, services, stats, loading, error } = useServerMetrics()

  function getStateColor(state) {
    switch (state) {
      case 0: return 'bg-green-500'
      case 1: return 'bg-yellow-500'
      case 2: return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  function getStateText(state) {
    switch (state) {
      case 0: return 'OK'
      case 1: return 'WARNING'
      case 2: return 'CRITICAL'
      case 3: return 'UNKNOWN'
      default: return 'N/A'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando métricas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Error: {error}</p>
          <Link 
            to="/servers"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Volver a servidores
          </Link>
        </div>
      </div>
    )
  }

  if (!server) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            to="/servers"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-4"
          >
            <i className="fas fa-arrow-left"></i>
            Volver a servidores
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <i className="fas fa-server text-blue-600"></i>
                {server.hostname}
              </h1>
              {server.description && (
                <p className="mt-2 text-gray-600 dark:text-gray-400">{server.description}</p>
              )}
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">IP Address</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {server.ip_address || 'N/A'}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Sistema Operativo</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {server.os || 'N/A'}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Ubicación</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {server.location || 'N/A'}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Última actividad</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {server.last_seen 
                  ? `Hace ${server.minutes_since_last_seen}m`
                  : 'Nunca'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        {stats && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Estadísticas (últimas 24 horas)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.stats.total_checks}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Checks totales</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {stats.stats.ok_count}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">OK</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {stats.stats.warning_count}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Warning</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {stats.stats.critical_count}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Critical</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-600">
                  {stats.stats.unknown_count}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Unknown</div>
              </div>
            </div>
          </div>
        )}

        {/* Services Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Servicios Monitoreados
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {services.map((service, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${getStateColor(service.last_state)}`}></span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {service.service_name}
                  </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  service.last_state === 0 ? 'bg-green-100 text-green-800' :
                  service.last_state === 1 ? 'bg-yellow-100 text-yellow-800' :
                  service.last_state === 2 ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {getStateText(service.last_state)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Últimas Métricas
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Servicio
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Salida
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {metrics.map((metric) => (
                  <tr key={metric.id}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {metric.service_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        metric.state === 0 ? 'bg-green-100 text-green-800' :
                        metric.state === 1 ? 'bg-yellow-100 text-yellow-800' :
                        metric.state === 2 ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {getStateText(metric.state)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-md truncate">
                      {metric.output}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(metric.received_at).toLocaleString('es-MX')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
