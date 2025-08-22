export default function StatsCards({ stats }) {
  const s = stats || {}
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700">
        <div className="text-sm text-gray-500 dark:text-gray-400">Latencia promedio</div>
        <div className="text-xl font-semibold mt-1">
          {s.average_latency > 0 ? `${s.average_latency.toFixed(1)} ms` : (s.total_records === 0 ? 'Sin datos' : '0.0 ms')}
        </div>
      </div>
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700">
        <div className="text-sm text-gray-500 dark:text-gray-400">Latencia mínima</div>
        <div className="text-xl font-semibold mt-1">{s.min_latency > 0 ? `${s.min_latency.toFixed(1)} ms` : 'Sin datos'}</div>
      </div>
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700">
        <div className="text-sm text-gray-500 dark:text-gray-400">Latencia máxima</div>
        <div className="text-xl font-semibold mt-1">{s.max_latency > 0 ? `${s.max_latency.toFixed(1)} ms` : 'Sin datos'}</div>
      </div>
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700">
        <div className="text-sm text-gray-500 dark:text-gray-400">Caídas</div>
        <div className="text-xl font-semibold mt-1">{Number.isFinite(s.downtime_count) ? `${s.downtime_count}` : 'Sin datos'}</div>
      </div>
    </div>
  )
}
