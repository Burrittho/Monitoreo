import React from 'react'

export default function ConfirmDialog({ open, title='Confirmar', message='¿Continuar?', confirmText='Aceptar', cancelText='Cancelar', onConfirm, onCancel, loading=false }){
  if(!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-between">
          <h4 className="font-semibold text-sm">{title}</h4>
          <button onClick={()=>!loading&&onCancel?.()} className="p-1 rounded bg-white/20 hover:bg-white/30"><i className="fas fa-times"/></button>
        </div>
        <div className="p-5 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{message}</div>
        <div className="px-5 pb-5 flex justify-end gap-3">
          <button disabled={loading} onClick={()=>!loading&&onCancel?.()} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50">{cancelText}</button>
          <button disabled={loading} onClick={()=>onConfirm?.()} className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50">
            {loading ? <><i className="fas fa-spinner fa-spin mr-1"/>Procesando...</> : <><i className="fas fa-check mr-1"/>{confirmText}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
