import { useState, useEffect } from 'react'
import { apiGet } from '../../lib/api'

export default function ConsoleInfo({ ipId }) {
  const [consoleData, setConsoleData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchConsoleInfo = async () => {
      if (!ipId) {
        setConsoleData(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const response = await apiGet(`/api/console/info/${ipId}`)
        
        if (response.success) {
          setConsoleData(response.data)
        } else {
          setError('Error al obtener información de consola')
          setConsoleData(null)
        }
      } catch (err) {
        console.error('Error fetching console info:', err)
        setError('Error de conexión al obtener información de consola')
        setConsoleData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchConsoleInfo()
  }, [ipId])

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
            <i className="fas fa-desktop text-purple-600 dark:text-purple-400 text-sm"/>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white text-sm">Consola</h3>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <dt className="text-gray-500 dark:text-gray-400">Cargando...</dt>
            <dd className="font-medium text-gray-500 dark:text-gray-400">
              <div className="animate-pulse h-3 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
            </dd>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
            <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-sm"/>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white text-sm">Consola</h3>
        </div>
        
        <div className="text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      </div>
    )
  }

  // Si no hay datos de consola disponibles
  if (!consoleData || !consoleData.exists) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <i className="fas fa-desktop text-gray-500 dark:text-gray-400 text-sm"/>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white text-sm">Consola</h3>
        </div>
        
        <dl className="space-y-2">
          <div className="flex justify-between text-xs">
            <dt className="text-gray-500 dark:text-gray-400">Modelo</dt>
            <dd className="font-medium text-gray-500 dark:text-gray-400">Sin información</dd>
          </div>
          <div className="flex justify-between text-xs">
            <dt className="text-gray-500 dark:text-gray-400">MAC</dt>
            <dd className="font-medium text-gray-500 dark:text-gray-400">Sin información</dd>
          </div>
          <div className="flex justify-between text-xs">
            <dt className="text-gray-500 dark:text-gray-400">Serie</dt>
            <dd className="font-medium text-gray-500 dark:text-gray-400">Sin información</dd>
          </div>
          <div className="flex justify-between text-xs">
            <dt className="text-gray-500 dark:text-gray-400">Firmware</dt>
            <dd className="font-medium text-gray-500 dark:text-gray-400">Sin información</dd>
          </div>
        </dl>
      </div>
    )
  }

  // Construir el texto del modelo/versión
  const modeloVersion = [consoleData.modelo, consoleData.version]
    .filter(item => item && item.trim())
    .join(' / ') || 'No disponible'

  return (
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
          <dd className="font-medium text-gray-900 dark:text-gray-100">{modeloVersion}</dd>
        </div>
        <div className="flex justify-between text-xs">
          <dt className="text-gray-500 dark:text-gray-400">MAC</dt>
          <dd className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-900 dark:text-gray-100">
            {consoleData.mac || 'N/A'}
          </dd>
        </div>
        <div className="flex justify-between text-xs">
          <dt className="text-gray-500 dark:text-gray-400">Serie</dt>
          <dd className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-900 dark:text-gray-100">
            {consoleData.serie || 'N/A'}
          </dd>
        </div>
        <div className="flex justify-between text-xs">
          <dt className="text-gray-500 dark:text-gray-400">Firmware</dt>
          <dd className="font-medium text-gray-900 dark:text-gray-100">
            {consoleData.firmware || 'N/A'}
          </dd>
        </div>
      </dl>
    </div>
  )
}
