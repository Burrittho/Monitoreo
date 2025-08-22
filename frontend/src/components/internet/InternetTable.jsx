import React from 'react'
import { formatDateTime } from '../../utils/date'
import { NetworkStatusBadge } from '../../utils/simpleBadges'

export default function InternetTable({ data, loading, error, onRefresh, total, limit, page, setPage, header, statusBadge }){
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs md:text-sm">
        <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-700">
          <tr className="text-[11px] md:text-xs uppercase tracking-wide text-gray-700 dark:text-gray-300">
            <th className="px-4 py-4 text-left font-bold border-r border-gray-300 dark:border-gray-600">{header('Sucursal','sucursal')}</th>
            <th className="px-4 py-4 text-left font-bold border-r border-gray-300 dark:border-gray-600">{header('Proveedor','proveedorPrim')}</th>
            <th className="px-4 py-4 text-left font-bold border-r border-gray-300 dark:border-gray-600">{header('Puerto','puertoPrim')}</th>
            <th className="px-4 py-4 text-left font-bold border-r border-gray-300 dark:border-gray-600">{header('Configuración','configPrim')}</th>
            <th className="px-4 py-4 text-left font-bold border-r border-gray-300 dark:border-gray-600">{header('IP','ipPrim')}</th>
            <th className="px-4 py-4 text-left font-bold border-r border-gray-300 dark:border-gray-600">{header('Estado','estadoPrim')}</th>
            <th className="px-4 py-4 text-left font-bold border-r border-gray-300 dark:border-gray-600">{header('Proveedor','proveedorSec')}</th>
            <th className="px-4 py-4 text-left font-bold border-r border-gray-300 dark:border-gray-600">{header('Puerto','puertoSec')}</th>
            <th className="px-4 py-4 text-left font-bold border-r border-gray-300 dark:border-gray-600">{header('Configuración','configSec')}</th>
            <th className="px-4 py-4 text-left font-bold border-r border-gray-300 dark:border-gray-600">{header('IP','ipSec')}</th>
            <th className="px-4 py-4 text-left font-bold border-r border-gray-300 dark:border-gray-600">{header('Estado','estadoSec')}</th>
            <th className="px-4 py-4 text-left font-bold">{header('Última Revisión','fecha')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {loading && (
            <tr><td colSpan={12} className="py-12 text-center">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gray-600"/>
                <span className="ml-4 text-lg font-medium text-gray-600 dark:text-gray-300">Cargando datos...</span>
              </div>
            </td></tr>
          )}
          {!loading && error && (
            <tr><td colSpan={12} className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                <i className="fas fa-exclamation-triangle text-gray-600 dark:text-gray-400 text-2xl"/>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">{error}</p>
            </td></tr>
          )}
          {!loading && !error && data.length===0 && (
            <tr><td colSpan={12} className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                <i className="fas fa-database text-gray-600 dark:text-gray-400 text-2xl"/>
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Sin resultados</p>
            </td></tr>
          )}
          {!loading && !error && data.map((row, index) => {
            const fecha = formatDateTime(row.fecha)
            const tipoPrim = row.tipo_primario || row.tipo1 || '—'
            const tipoSec = row.tipo_secundario || row.tipo2 || '—'
            return (
              <tr key={row.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${index % 2 === 0 ? 'bg-gray-50/50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'}`}>
                <td className="px-4 py-3 align-top border-r border-gray-100 dark:border-gray-700">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mr-3">
                      <i className="fas fa-building text-gray-600 dark:text-gray-400 text-xs"/>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 dark:text-gray-200">{row.sucursal_nombre || 'Sucursal'}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">{row.sucursal_ip || '—'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 border-r border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100">{row.proveedor_primario || 'No se detectó'}</td>
                <td className="px-4 py-3 border-r border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100">{row.interfaz_primario || '—'}</td>
                <td className="px-4 py-3 border-r border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100">{tipoPrim}</td>
                <td className="px-4 py-3 border-r border-gray-100 dark:border-gray-700"><code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-[10px] text-gray-800 dark:text-gray-200">{row.ip_primario || '—'}</code></td>
                <td className="px-4 py-3 border-r border-gray-100 dark:border-gray-700"><NetworkStatusBadge status={row.estado_primario || 'Desconocido'} /></td>
                <td className="px-4 py-3 border-r border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100">{row.proveedor_secundario || 'No se detectó'}</td>
                <td className="px-4 py-3 border-r border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100">{row.interfaz_secundario || '—'}</td>
                <td className="px-4 py-3 border-r border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100">{tipoSec}</td>
                <td className="px-4 py-3 border-r border-gray-100 dark:border-gray-700"><code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-[10px] text-gray-800 dark:text-gray-200">{row.ip_secundario || '—'}</code></td>
                <td className="px-4 py-3 border-r border-gray-100 dark:border-gray-700"><NetworkStatusBadge status={row.estado_secundario || 'Desconocido'} /></td>
                <td className="px-4 py-3 text-[10px] md:text-xs text-gray-600 dark:text-gray-300">{fecha}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
