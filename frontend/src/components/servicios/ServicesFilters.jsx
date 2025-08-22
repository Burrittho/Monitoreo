import React from 'react'

export default function ServicesFilters({ filters, setFilters, limit, setLimit, onSearch, onClear }){
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <div>
        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Sucursal</label>
        <input 
          className="input-base" 
          value={filters.sucursal} 
          onChange={e=>setFilters(v=>({...v, sucursal:e.target.value}))} 
          placeholder="Nombre de sucursal"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Proveedor Principal</label>
        <input 
          className="input-base" 
          value={filters.proveedor_primario} 
          onChange={e=>setFilters(v=>({...v, proveedor_primario:e.target.value}))} 
          placeholder="Ej: Telnor"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Proveedor Secundario</label>
        <input 
          className="input-base" 
          value={filters.proveedor_secundario} 
          onChange={e=>setFilters(v=>({...v, proveedor_secundario:e.target.value}))} 
          placeholder="Ej: TotalPlay"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Registros por página</label>
        <select 
          className="input-base" 
          value={String(limit)} 
          onChange={e=>{const v=e.target.value==='all'?999999:Number(e.target.value); setLimit(v)}}
        >
          <option value="10">10 registros</option>
          <option value="20">20 registros</option>
          <option value="50">50 registros</option>
          <option value="all">Todos</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Acciones</label>
        <div className="flex space-x-2">
          <button 
            className="btn-primary flex-1 text-sm" 
            onClick={onSearch}
          >
            <i className="fas fa-search mr-2"/>
            Buscar
          </button>
          <button 
            className="btn-secondary px-3" 
            onClick={onClear}
            title="Limpiar filtros"
          >
            <i className="fas fa-broom"/>
          </button>
        </div>
      </div>
    </div>
  )
}
