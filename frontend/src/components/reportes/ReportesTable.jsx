import React from 'react'
import { StatusBadge, PriorityBadge } from '../../utils/simpleBadges'
import { formatDateTime } from '../../utils/date'
import { Pagination } from '../ui/Pagination'
import { usePagination } from '../../hooks/usePagination'

export default function ReportesTable({ reportes, loading, error, filterEstado, cerradoValue, onDetalle, onConcluir, concluding }){
  const visible = filterEstado === 'abierto' ? reportes.filter(r=> r.estado !== cerradoValue) : reportes.filter(r=> r.estado === cerradoValue)
  
  // Usar paginación
  const {
    currentItems: paginatedReportes,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    goToPage
  } = usePagination(visible, 10);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-700 text-left text-xs uppercase tracking-wide text-gray-600 dark:text-gray-300">
            <th className="py-3 px-4 font-semibold">Sucursal</th>
            <th className="py-3 px-4 font-semibold">Proveedor</th>
            <th className="py-3 px-4 font-semibold">Cuenta</th>
            <th className="py-3 px-4 font-semibold">Prioridad</th>
            <th className="py-3 px-4 font-semibold">Estado</th>
            <th className="py-3 px-4 font-semibold">Fecha Incidencia</th>
            <th className="py-3 px-4 font-semibold text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {filterEstado==='abiertos' && loading && (
            <tr><td colSpan={7} className="py-10 text-center text-gray-600 dark:text-gray-300"><i className="fas fa-spinner fa-spin mr-2"/>Cargando...</td></tr>
          )}
          {filterEstado==='abiertos' && !loading && error && (
            <tr><td colSpan={7} className="py-10 text-center text-gray-600 dark:text-gray-400">{error}</td></tr>
          )}
          {visible.length===0 && !loading && !error && (
            <tr><td colSpan={7} className="py-10 text-center text-gray-500 dark:text-gray-400">Sin reportes</td></tr>
          )}
          {!loading && !error && paginatedReportes.map(r => (
            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{r.sucursal_nombre || 'N/A'}</td>
              <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{r.proveedor || 'N/A'}</td>
              <td className="py-3 px-4 font-mono text-xs text-gray-700 dark:text-gray-300">{r.cuenta || '—'}</td>
              <td className="py-3 px-4"><PriorityBadge priority={r.prioridad} /></td>
              <td className="py-3 px-4"><StatusBadge status={r.estado} /></td>
              <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">{formatDateTime(r.fecha_incidencia)}</td>
              <td className="py-3 px-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button 
                    onClick={()=>onDetalle(r)} 
                    className="px-3 py-1.5 text-xs rounded bg-gray-600 hover:bg-gray-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    <i className="fas fa-eye mr-1"/>Detalles
                  </button>
                  {r.estado!==cerradoValue && (
                    <button 
                      disabled={concluding} 
                      onClick={()=>onConcluir(r.id)} 
                      className="px-3 py-1.5 text-xs rounded bg-gray-800 hover:bg-gray-900 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-700"
                    >
                      <i className="fas fa-check mr-1"/>{concluding?'...':'Concluir'}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Paginación */}
      {!loading && !error && totalItems > 0 && (
        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={goToPage}
          />
        </div>
      )}
    </div>
  )
}
