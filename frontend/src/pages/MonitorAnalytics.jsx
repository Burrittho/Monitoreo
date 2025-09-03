import useAnalytics from '../hooks/useAnalytics'
import DateTimePicker from '../components/analytics/DateTimePicker'
import IpSelector from '../components/analytics/IpSelector'
import StatsCards from '../components/analytics/StatsCards'
import LatencyChart from '../components/analytics/LatencyChart'
import OutagesList from '../components/analytics/OutagesList'
import CurrentOutages from '../components/analytics/CurrentOutages'

export default function MonitorAnalytics() {
  const analytics = useAnalytics()

  const internet = analytics.internet || {}
  const primario = internet.primario || {}
  const secundario = internet.secundario || {}

  const internetStatusText = (estado) => {
    const s = (estado || '').toString().toLowerCase()
    if (!s || s === 'n/a') return 'Desconocido'
    if (s.includes('exitoso') || s.includes('ok') || s.includes('activo') || s.includes('conectado') || s.includes('up')) return 'Activo'
    if (s.includes('error') || s.includes('fallo') || s.includes('desconectado') || s.includes('down')) return 'Inactivo'
    if (s.includes('warning') || s.includes('advertencia') || s.includes('backup')) return 'Advertencia'
    return 'Desconocido'
  }
  const statusColor = (estado) => {
    const s = (estado || '').toString().toLowerCase()
    if (s.includes('exitoso') || s.includes('ok') || s.includes('activo') || s.includes('conectado') || s.includes('up')) return 'text-gray-600 dark:text-gray-400'
    if (s.includes('error') || s.includes('fallo') || s.includes('desconectado') || s.includes('down')) return 'text-gray-700 dark:text-gray-300'
    if (s.includes('warning') || s.includes('advertencia') || s.includes('backup')) return 'text-gray-600 dark:text-gray-400'
    return 'text-gray-500 dark:text-gray-400'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <i className="fas fa-chart-line text-2xl text-gray-600 dark:text-gray-400"/>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Monitor Analytics</h1>
            <IpSelector ips={analytics.ips} value={analytics.ipId} onChange={analytics.setIpId} loading={analytics.loadingIps || analytics.loading} />
          </div>
          
          {/* DateTime Picker */}
          <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
            <DateTimePicker 
              startDate={analytics.dateRange.startDate}
              endDate={analytics.dateRange.endDate}
              onDateChange={analytics.setDateRange}
              disabled={analytics.loading}
            />
          </div>
        </div>
      </div>

      {analytics.error && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 p-4 rounded-lg">
          {analytics.error}
        </div>
      )}

      {/* Latency Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tendencia de Latencia</h2>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Latencia (ms)</span>
          </div>
        </div>
        <LatencyChart chartData={analytics.chart} dateRange={analytics.dateRange} />
      </div>

      {/* Stats and Incidents - New Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Stats and Service Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Estadísticas Generales - Más compacta */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Estadísticas Generales</h2>
            <StatsCards stats={analytics.stats || {}} />
          </div>
          
          {/* Service Information Cards - 2x2 Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <i className="fas fa-network-wired text-blue-600 dark:text-blue-400 text-sm"/>
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white text-sm">Internet Primario</h3>
              </div>
              
              <dl className="space-y-2">
                <div className="flex justify-between text-xs">
                  <dt className="text-gray-500 dark:text-gray-400">Proveedor</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{primario.proveedor || '--'}</dd>
                </div>
                <div className="flex justify-between text-xs">
                  <dt className="text-gray-500 dark:text-gray-400">Estado</dt>
                  <dd className={`font-medium ${statusColor(primario.estado)}`}>{internetStatusText(primario.estado)}</dd>
                </div>
                <div className="flex justify-between text-xs">
                  <dt className="text-gray-500 dark:text-gray-400">Puerto</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{primario.puerto || '--'}</dd>
                </div>
                <div className="flex justify-between text-xs">
                  <dt className="text-gray-500 dark:text-gray-400">IP</dt>
                  <dd className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-900 dark:text-gray-100">
                    {primario.ip || '--'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <i className="fas fa-network-wired text-green-600 dark:text-green-400 text-sm"/>
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white text-sm">Internet Secundario</h3>
              </div>
              
              <dl className="space-y-2">
                <div className="flex justify-between text-xs">
                  <dt className="text-gray-500 dark:text-gray-400">Proveedor</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{secundario.proveedor || '--'}</dd>
                </div>
                <div className="flex justify-between text-xs">
                  <dt className="text-gray-500 dark:text-gray-400">Estado</dt>
                  <dd className={`font-medium ${statusColor(secundario.estado)}`}>{internetStatusText(secundario.estado)}</dd>
                </div>
                <div className="flex justify-between text-xs">
                  <dt className="text-gray-500 dark:text-gray-400">Puerto</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{secundario.puerto || '--'}</dd>
                </div>
                <div className="flex justify-between text-xs">
                  <dt className="text-gray-500 dark:text-gray-400">IP</dt>
                  <dd className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-900 dark:text-gray-100">
                    {secundario.ip || '--'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <i className="fas fa-desktop text-purple-600 dark:text-purple-400 text-sm"/>
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white text-sm">Consola</h3>
              </div>
              
              <dl className="space-y-2">
                <div className="flex justify-between text-xs">
                  <dt className="text-gray-500 dark:text-gray-400">Modelo</dt>
                  <dd className="font-medium text-gray-500 dark:text-gray-400">Pendiente</dd>
                </div>
                <div className="flex justify-between text-xs">
                  <dt className="text-gray-500 dark:text-gray-400">Estado</dt>
                  <dd className="font-medium text-gray-500 dark:text-gray-400">Desconocido</dd>
                </div>
                <div className="flex justify-between text-xs">
                  <dt className="text-gray-500 dark:text-gray-400">Tiempo activo</dt>
                  <dd className="font-medium text-gray-500 dark:text-gray-400">Pendiente</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <i className="fas fa-file-alt text-orange-600 dark:text-orange-400 text-sm"/>
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white text-sm">Reportes</h3>
              </div>
              
              <dl className="space-y-2">
                <div className="flex justify-between text-xs">
                  <dt className="text-gray-500 dark:text-gray-400">Activos</dt>
                  <dd className="font-medium text-gray-500 dark:text-gray-400">Pendiente</dd>
                </div>
                <div className="flex justify-between text-xs">
                  <dt className="text-gray-500 dark:text-gray-400">Estado</dt>
                  <dd className="font-medium text-gray-500 dark:text-gray-400">Desconocido</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
        
        {/* Right Column - Incidents and Outages */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Incidencias</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
              {analytics.outages.length}
            </span>
          </div>
          <OutagesList outages={analytics.outages} stats={analytics.stats} />
          
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-gray-900 dark:text-white">Sucursales Sin Sistema</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                {analytics.currentOutages.length}
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <CurrentOutages outages={analytics.currentOutages} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
