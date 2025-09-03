export default function OutagesList({ outages, stats }) {
  if (!outages || outages.length === 0) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
        <i className="fas fa-check-circle mr-2 text-gray-600 dark:text-gray-400"/>
        Sin incidencias en el período seleccionado
      </div>
    )
  }
  
  const getStatusInfo = (outage) => {
    switch (outage.status) {
      case 'completed':
        return {
          icon: 'fas fa-check-circle',
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-700',
          label: 'Completado'
        }
      case 'ongoing_started':
        return {
          icon: 'fas fa-exclamation-triangle',
          color: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-100 dark:bg-amber-900/30',
          label: 'Iniciado en período'
        }
      case 'ongoing_throughout':
        return {
          icon: 'fas fa-exclamation-circle',
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          label: 'Activo todo el período'
        }
      default:
        return {
          icon: 'fas fa-info-circle',
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-700',
          label: 'Completado'
        }
    }
  }
  
  const recent = outages.slice(0, 5)
  
  return (
    <div className="space-y-3">
      {recent.map((outage, idx) => {
        const statusInfo = getStatusInfo(outage)
        
        return (
          <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-600 ${statusInfo.bgColor}`}>
            <div className="flex items-center space-x-3">
              <span className="w-6 h-6 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full flex items-center justify-center text-xs font-medium">
                {idx+1}
              </span>
              <div className="flex items-center space-x-2">
                <i className={`${statusInfo.icon} ${statusInfo.color} text-sm`} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-800 dark:text-gray-200">Caída del Sistema</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color} bg-white dark:bg-gray-800 border`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Inicio: {new Date(outage.downtime_start).toLocaleString('es-MX')}
                  </p>
                  {outage.downtime_end && outage.status === 'completed' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Fin: {new Date(outage.downtime_end).toLocaleString('es-MX')}
                    </p>
                  )}
                  {outage.status !== 'completed' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {outage.status === 'ongoing_throughout' ? 'Caída activa durante todo el período' : 'Caída aún activa'}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full font-medium border">
                {outage.downtime_duration || 'Calculando...'}
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {outage.status === 'completed' ? 'Duración total' : 'Duración parcial'}
              </p>
            </div>
          </div>
        )
      })}
      {outages.length > 5 && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
          <i className="fas fa-info-circle mr-1"/>Y {outages.length-5} incidente(s) más en este período
        </div>
      )}
      
    </div>
  )
}
