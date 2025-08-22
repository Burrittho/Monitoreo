import React, { useMemo } from 'react'

export default function InternetFilters({ filter1, setFilter1, filter2, setFilter2, onClear, data = [] }){
  // Obtener valores únicos para cada campo de los datos actuales
  const uniqueValues = useMemo(() => {
    const values = {
      sucursal: new Set(),
      proveedorPrim: new Set(),
      estadoPrim: new Set(),
      puertoPrim: new Set(),
      configPrim: new Set(),
      ipPrim: new Set(),
      proveedorSec: new Set(),
      estadoSec: new Set(),
      puertoSec: new Set(),
      configSec: new Set(),
      ipSec: new Set()
    };

    // Si hay un filtro activo, filtrar datos primero
    let filteredData = data;
    if (filter1.field && filter1.value) {
      filteredData = filteredData.filter(item => {
        const value = getFieldValue(item, filter1.field);
        return value.toLowerCase().includes(filter1.value.toLowerCase());
      });
    }
    if (filter2.field && filter2.value) {
      filteredData = filteredData.filter(item => {
        const value = getFieldValue(item, filter2.field);
        return value.toLowerCase().includes(filter2.value.toLowerCase());
      });
    }

    // Extraer valores únicos de los datos filtrados
    filteredData.forEach(item => {
      values.sucursal.add(item.sucursal_nombre || `Sucursal #${item.sucursal_id || ''}`);
      values.proveedorPrim.add(item.proveedor_primario || '');
      values.estadoPrim.add(item.estado_primario || '');
      values.puertoPrim.add(item.interfaz_primario || '');
      values.configPrim.add(item.tipo_primario || '');
      values.ipPrim.add(item.ip_primario || '');
      values.proveedorSec.add(item.proveedor_secundario || '');
      values.estadoSec.add(item.estado_secundario || '');
      values.puertoSec.add(item.interfaz_secundario || '');
      values.configSec.add(item.tipo_secundario || '');
      values.ipSec.add(item.ip_secundario || '');
    });

    // Convertir a arrays y ordenar
    Object.keys(values).forEach(key => {
      values[key] = Array.from(values[key]).filter(v => v).sort();
    });

    return values;
  }, [data, filter1, filter2]);

  function getFieldValue(item, field) {
    switch(field) {
      case 'sucursal': return item.sucursal_nombre || `Sucursal #${item.sucursal_id || ''}`;
      case 'proveedorPrim': return item.proveedor_primario || '';
      case 'estadoPrim': return item.estado_primario || '';
      case 'puertoPrim': return item.interfaz_primario || '';
      case 'configPrim': return item.tipo_primario || '';
      case 'ipPrim': return item.ip_primario || '';
      case 'proveedorSec': return item.proveedor_secundario || '';
      case 'estadoSec': return item.estado_secundario || '';
      case 'puertoSec': return item.interfaz_secundario || '';
      case 'configSec': return item.tipo_secundario || '';
      case 'ipSec': return item.ip_secundario || '';
      default: return '';
    }
  }

  function renderFilter(filter, setFilter, colorClass, label) {
    const isText = filter.field && ['ipPrim', 'ipSec'].includes(filter.field);
    const availableValues = filter.field ? uniqueValues[filter.field] || [] : [];

    return (
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <i className="fas fa-filter w-4 h-4" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{label}:</label>
          <div className="flex gap-2">
            <select 
              value={filter.field} 
              onChange={e => setFilter(f => ({...f, field: e.target.value, value: ''}))} 
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar columna</option>
              <option value="sucursal">Sucursal</option>
              <option value="proveedorPrim">Proveedor (Primario)</option>
              <option value="estadoPrim">Estado (Primario)</option>
              <option value="puertoPrim">Puerto (Primario)</option>
              <option value="configPrim">Configuración (Primario)</option>
              <option value="ipPrim">IP (Primario)</option>
              <option value="proveedorSec">Proveedor (Secundario)</option>
              <option value="estadoSec">Estado (Secundario)</option>
              <option value="puertoSec">Puerto (Secundario)</option>
              <option value="configSec">Configuración (Secundario)</option>
              <option value="ipSec">IP (Secundario)</option>
            </select>
            
            {isText ? (
              <input 
                value={filter.value} 
                onChange={e => setFilter(f => ({...f, value: e.target.value}))} 
                placeholder="Buscar IP..." 
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-40" 
                disabled={!filter.field} 
              />
            ) : (
              <select
                value={filter.value}
                onChange={e => setFilter(f => ({...f, value: e.target.value}))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-40"
                disabled={!filter.field}
              >
                <option value="">Todos</option>
                {availableValues.map(value => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-4 items-end">
      {renderFilter(filter1, setFilter1, 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300', 'Filtro 1')}
      {renderFilter(filter2, setFilter2, 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300', 'Filtro 2')}
      <button 
        onClick={onClear} 
        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors"
      >
        <i className="fas fa-broom mr-2 w-4 h-4" />
        Limpiar
      </button>
    </div>
  )
}
