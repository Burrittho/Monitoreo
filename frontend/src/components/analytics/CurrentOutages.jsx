export default function CurrentOutages({ outages }) {
  if (!outages) return null
  return (
    <div>
      {outages.length === 0 ? (
        <div className="flex items-center justify-center p-4 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
          <i className="fas fa-check-circle mr-2 text-gray-600 dark:text-gray-400"/>
          Todas las sucursales están operativas
        </div>
      ) : (
        <div className="space-y-3">
          {outages.map((o) => (
            <div key={o.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-gray-500 dark:bg-gray-400 rounded-full animate-pulse" />
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{o.name || 'Sucursal'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">IP: {o.ip}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sin sistema desde: {o.down_since ? new Date(o.down_since).toLocaleString('es-MX') : '—'}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                  Sin Sistema
                </span>
                {typeof o.minutes_down !== 'undefined' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{o.minutes_down} min</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
