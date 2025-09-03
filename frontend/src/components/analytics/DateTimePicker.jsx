import { useState, useEffect } from 'react'

export default function DateTimePicker({ startDate, endDate, onDateChange, disabled }) {
  const [startDateTime, setStartDateTime] = useState('')
  const [endDateTime, setEndDateTime] = useState('')
  const [error, setError] = useState('')

  // Convertir dates a strings para inputs datetime-local
  useEffect(() => {
    if (startDate) {
      const start = new Date(startDate)
      setStartDateTime(formatDateTimeLocal(start))
    }
    if (endDate) {
      const end = new Date(endDate)
      setEndDateTime(formatDateTimeLocal(end))
    }
  }, [startDate, endDate])

  // Formatear fecha para input datetime-local (YYYY-MM-DDTHH:MM)
  const formatDateTimeLocal = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Validar rango máximo de 24 horas
  const validateRange = (start, end) => {
    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()
    const diffHours = (endTime - startTime) / (1000 * 60 * 60)
    
    if (diffHours < 0) {
      return 'La fecha de fin debe ser posterior a la fecha de inicio'
    }
    if (diffHours > 24) {
      return 'El rango máximo de búsqueda es de 24 horas'
    }
    if (diffHours === 0) {
      return 'El rango mínimo es de 1 minuto'
    }
    return null
  }

  const handleStartChange = (e) => {
    const newStart = e.target.value
    setStartDateTime(newStart)
    
    if (newStart) {
      // Auto-llenar fecha fin (+1 hora)
      const startDate = new Date(newStart)
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000) // +1 hora
      const newEnd = formatDateTimeLocal(endDate)
      setEndDateTime(newEnd)
      
      // Validar y actualizar
      const validationError = validateRange(newStart, newEnd)
      setError(validationError)
      
      if (!validationError) {
        onDateChange({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
      }
    }
  }

  const handleEndChange = (e) => {
    const newEnd = e.target.value
    setEndDateTime(newEnd)
    
    if (startDateTime && newEnd) {
      const validationError = validateRange(startDateTime, newEnd)
      setError(validationError)
      
      if (!validationError) {
        onDateChange({
          startDate: new Date(startDateTime).toISOString(),
          endDate: new Date(newEnd).toISOString()
        })
      }
    }
  }

  // Botones de rango rápido
  const handleQuickRange = (hours) => {
    const now = new Date()
    const start = new Date(now.getTime() - hours * 60 * 60 * 1000)
    
    const startStr = formatDateTimeLocal(start)
    const endStr = formatDateTimeLocal(now)
    
    setStartDateTime(startStr)
    setEndDateTime(endStr)
    setError('')
    
    onDateChange({
      startDate: start.toISOString(),
      endDate: now.toISOString()
    })
  }

  return (
    <div className="space-y-4">
      {/* Inputs de fecha y hora */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <i className="fas fa-calendar-alt mr-2"></i>
            Fecha y hora de inicio
          </label>
          <input
            type="datetime-local"
            value={startDateTime}
            onChange={handleStartChange}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <i className="fas fa-calendar-check mr-2"></i>
            Fecha y hora de fin
          </label>
          <input
            type="datetime-local"
            value={endDateTime}
            onChange={handleEndChange}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-center">
            <i className="fas fa-exclamation-triangle text-red-500 mr-2"></i>
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          </div>
        </div>
      )}

      {/* Botones de rango rápido */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400 self-center mr-2">
          Rangos rápidos:
        </span>
        {[
          { label: '15m', hours: 0.25 },
          { label: '30m', hours: 0.5 },
          { label: '1h', hours: 1 },
          { label: '2h', hours: 2 },
          { label: '6h', hours: 6 },
          { label: '12h', hours: 12 },
          { label: '24h', hours: 24 }
        ].map(({ label, hours }) => (
          <button
            key={label}
            onClick={() => handleQuickRange(hours)}
            disabled={disabled}
            className="px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 
                     text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 
                     rounded-md hover:bg-gray-200 dark:hover:bg-gray-600
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Información del rango seleccionado */}
      {startDateTime && endDateTime && !error && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center text-sm text-blue-700 dark:text-blue-300">
            <i className="fas fa-info-circle mr-2"></i>
            <span>
              Rango seleccionado: {' '}
              {(() => {
                const start = new Date(startDateTime)
                const end = new Date(endDateTime)
                const diffMs = end.getTime() - start.getTime()
                const diffHours = diffMs / (1000 * 60 * 60)
                const diffMinutes = (diffMs % (1000 * 60 * 60)) / (1000 * 60)
                
                if (diffHours >= 1) {
                  return diffMinutes > 0 
                    ? `${Math.floor(diffHours)}h ${Math.floor(diffMinutes)}m`
                    : `${Math.floor(diffHours)}h`
                } else {
                  return `${Math.floor(diffMinutes)}m`
                }
              })()}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
