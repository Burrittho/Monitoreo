import React from 'react'
import { PRIORIDADES } from '../../constants/priorities'
import { REPORT_STATUS } from '../../constants/status'

export default function ReportForm({ sucursales, form, setForm, providersSucursal, selectedProviderAccount, createMsg, creating, onSubmit, onProviderSelect }){
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Sucursal *</label>
        <select 
          className="block w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
          value={form.sucursal_id} 
          onChange={e=>{ 
            setForm(v=>({...v, sucursal_id:e.target.value, proveedor:''})); 
          }} 
          required
        >
          <option value="" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Selecciona sucursal</option>
          {sucursales.map(s=> (
            <option key={s.id||s.sucursal_id} value={s.id||s.sucursal_id} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              {s.name || s.sucursal_nombre || s.ip}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Proveedor *</label>
        <select 
          disabled={!providersSucursal.length} 
          className="block w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" 
          value={form.proveedor} 
          onChange={e=>{ 
            const selectedProvider = e.target.value;
            setForm(v=>({...v, proveedor: selectedProvider})); 
            if(onProviderSelect) onProviderSelect(selectedProvider);
          }} 
          required
        >
          <option value="" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">{providersSucursal.length ? 'Selecciona proveedor' : 'Selecciona sucursal primero'}</option>
          {providersSucursal.map(p=> (
            <option key={`${p.proveedor}-${p.tipo}`} value={p.proveedor} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              {p.proveedor} ({p.tipo})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Cuenta</label>
        <input 
          value={selectedProviderAccount} 
          readOnly 
          className="input-base bg-slate-50 dark:bg-slate-800" 
          placeholder="Se asigna automáticamente" 
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Prioridad</label>
        <select 
          className="block w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
          value={form.prioridad} 
          onChange={e=>setForm(v=>({...v, prioridad:e.target.value}))}
        >
          <option value="alta" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Alta</option>
          <option value="media" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Media</option>
          <option value="baja" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Baja</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Número Reporte</label>
        <input 
          className="block w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
          value={form.numero_ticket} 
          onChange={e=>setForm(v=>({...v, numero_ticket:e.target.value}))} 
          placeholder="Ticket del proveedor" 
        />
      </div>
      <div className="md:col-span-2 lg:col-span-5">
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Descripción</label>
        <textarea 
          rows={3} 
          className="block w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" 
          value={form.descripcion} 
          onChange={e=>setForm(v=>({...v, descripcion:e.target.value}))} 
          placeholder="Describe el problema o incidencia (opcional)" 
        />
      </div>
      <div className="md:col-span-2 lg:col-span-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        {createMsg.text && (
          <div className={`flex items-center text-sm font-medium ${createMsg.type==='success'?'text-green-600':'text-red-600'}`}>
            <i className={`fas ${createMsg.type==='success'?'fa-check-circle':'fa-exclamation-triangle'} mr-2 w-4 h-4`}/>
            {createMsg.text}
          </div>
        )}
        <button 
          type="submit" 
          disabled={creating} 
          className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
            creating 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {creating ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2 w-4 h-4"/>
              Guardando...
            </>
          ) : (
            <>
              <i className="fas fa-plus mr-2 w-4 h-4"/>
              Crear reporte
            </>
          )}
        </button>
      </div>
    </form>
  )
}
