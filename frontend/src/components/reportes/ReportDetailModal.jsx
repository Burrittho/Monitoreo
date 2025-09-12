import React from 'react'
import { formatDateTime } from '../../utils/date'
import { StatusBadge, PriorityBadge } from '../../utils/simpleBadges'

export default function ReportDetailModal({ reporte, onClose, onConcluir, isOpen, canConclude }){
  if(!isOpen || !reporte) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-600">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Detalle del Reporte</h4>
          <button onClick={onClose} className="p-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
            <i className="fas fa-times"/>
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Sucursal" value={reporte.sucursal_nombre} />
            <Field label="Proveedor" value={reporte.proveedor} />
            <Field label="Cuenta" value={reporte.cuenta} />
            <Field label="Número de Reporte" value={reporte.numero_ticket} />
            <div>
              <span className="block text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase">Prioridad</span>
              <PriorityBadge priority={reporte.prioridad} />
            </div>
            <div>
              <span className="block text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase">Estado</span>
              <StatusBadge status={reporte.estado} />
            </div>
            <Field label="Fecha Creación" value={formatDateTime(reporte.fecha_reporte)} />
            {reporte.fecha_resolucion && <Field label="Fecha Resolución" value={formatDateTime(reporte.fecha_resolucion)} />}
            
            <div className="col-span-1 md:col-span-2">
              <span className="block text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase">Descripción</span>
              <p className="font-medium text-gray-800 dark:text-gray-200 whitespace-pre-line mt-1">
                {reporte.descripcion || 'Sin descripción'}
              </p>
            </div>
          </div>

        </div>
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-600">
          <button 
            onClick={onClose} 
            className="px-4 py-2 rounded-lg bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium transition-colors"
          >
            <i className="fas fa-times mr-2"/>Cerrar
          </button>
          {canConclude && (
            <button 
              onClick={()=>{onConcluir(reporte.id); onClose();}} 
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
            >
              <i className="fas fa-check mr-2"/>Concluir
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }){
  return (
    <div>
      <span className="block text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase">{label}</span>
      <p className="font-medium text-gray-800 dark:text-gray-200">{value || '—'}</p>
    </div>
  )
}
