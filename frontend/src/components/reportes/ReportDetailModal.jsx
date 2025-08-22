import React from 'react'
import { formatDateTime } from '../../utils/date'
import { StatusBadge, PriorityBadge } from '../../utils/simpleBadges'

export default function ReportDetailModal({ reporte, onClose, onConcluir, isOpen, canConclude }){
  if(!isOpen || !reporte) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <h4 className="text-lg font-semibold text-white">Detalle del Reporte</h4>
          <button onClick={onClose} className="p-2 rounded bg-white/20 text-white hover:bg-white/30"><i className="fas fa-times"/></button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Sucursal" value={reporte.sucursal_nombre} />
            <Field label="Proveedor" value={reporte.proveedor} />
            <Field label="Tipo Internet" value={reporte.tipo_internet} />
            <div>
              <span className="block text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase">Prioridad</span>
              <PriorityBadge priority={reporte.prioridad} />
            </div>
            <div>
              <span className="block text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase">Estado</span>
              <StatusBadge status={reporte.estado} />
            </div>
            <Field label="Fecha Incidencia" value={formatDateTime(reporte.fecha_incidencia)} />
            <Field label="Fecha Creación" value={formatDateTime(reporte.fecha_reporte)} />
            {reporte.fecha_resolucion && <Field label="Fecha Resolución" value={formatDateTime(reporte.fecha_resolucion)} />}
          </div>
          {reporte.notas_tecnicas && (
            <div>
              <span className="block text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase">Notas Técnicas</span>
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line">{reporte.notas_tecnicas}</p>
            </div>
          )}
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gradient-to-r from-gray-500 to-gray-600 text-white text-sm font-medium hover:from-gray-600 hover:to-gray-700 transition-all"><i className="fas fa-times mr-2"/>Cerrar</button>
          {canConclude && (
            <button onClick={()=>{onConcluir(reporte.id); onClose();}} className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium hover:from-green-700 hover:to-emerald-700"><i className="fas fa-check mr-2"/>Concluir</button>
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
