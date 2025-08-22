import React from 'react'
import { formatDateTime } from '../../utils/date'

export default function ServicesTable({ data, loading, error, total, onRefresh, onOpen, pageComponent }){
  if(loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gray-600"/>
      <span className="ml-4 text-lg font-medium text-gray-600 dark:text-gray-300">Cargando servicios...</span>
    </div>
  )
  if(error) return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
        <i className="fas fa-exclamation-triangle text-gray-600 dark:text-gray-400 text-2xl"/>
      </div>
      <p className="text-gray-600 dark:text-gray-400 font-medium">{error}</p>
    </div>
  )
  if(data.length===0) return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
        <i className="fas fa-server text-gray-600 dark:text-gray-400 text-2xl"/>
      </div>
      <p className="text-gray-500 dark:text-gray-400 font-medium">No hay servicios configurados</p>
    </div>
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-gray-100 dark:border-gray-700">
            <th className="text-left py-4 px-6 font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50">Sucursal</th>
            <th className="text-left py-4 px-6 font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50">Proveedor Principal</th>
            <th className="text-left py-4 px-6 font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50">Cuenta Principal</th>
            <th className="text-left py-4 px-6 font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50">Proveedor Secundario</th>
            <th className="text-left py-4 px-6 font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50">Cuenta Secundario</th>
            <th className="text-center py-4 px-6 font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {data.map((item, index) => (
            <tr key={`${item.sucursal_id}-${index}`} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${index % 2 === 0 ? 'bg-gray-50/30 dark:bg-gray-800/30' : ''}`}>
              <td className="py-4 px-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mr-3">
                    <i className="fas fa-building text-gray-600 dark:text-gray-400 text-sm"/>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 dark:text-gray-200">{item.sucursal_nombre || 'N/A'}</div>
                  </div>
                </div>
              </td>
              <td className="py-4 px-6">
                <span className="inline-flex items-center px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-semibold rounded-full">
                  <i className="fas fa-network-wired mr-2 text-xs text-gray-600 dark:text-gray-400"/>
                  {item.proveedor_primario || 'No configurado'}
                </span>
              </td>
              <td className="py-4 px-6">
                <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-lg">
                  {item.cuenta_primario || 'N/A'}
                </span>
              </td>
              <td className="py-4 px-6">
                <span className="inline-flex items-center px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-semibold rounded-full">
                  <i className="fas fa-network-wired mr-2 text-xs text-gray-600 dark:text-gray-400"/>
                  {item.proveedor_secundario || 'No configurado'}
                </span>
              </td>
              <td className="py-4 px-6">
                <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-lg">
                  {item.cuenta_secundario || 'N/A'}
                </span>
              </td>
              <td className="py-4 px-6 text-center">
                <button 
                  onClick={() => onOpen(item)}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  <i className="fas fa-eye mr-2"/>
                  Ver Detalles
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pageComponent}
    </div>
  )
}
