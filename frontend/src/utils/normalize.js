export function normalizeReporte(r){
  if(!r) return null
  return {
    id: r.id,
    sucursal_id: r.sucursal_id,
    sucursal_nombre: r.sucursal_nombre || r.sucursal || 'N/A',
    proveedor: r.proveedor || 'N/A',
    cuenta: r.cuenta || r.cuenta_proveedor || '',
    prioridad: r.prioridad || 'media',
    numero_ticket: r.numero_ticket || '',
    notas_tecnicas: r.notas_tecnicas || '',
    tipo_internet: r.tipo_internet || r.tipo || '',
    estado: r.estado || 'abierto',
    fecha_incidencia: r.fecha_incidencia || r.fecha || null,
    fecha_reporte: r.fecha_reporte || r.created_at || null,
    fecha_resolucion: r.fecha_resolucion || null,
  }
}

export function normalizeInternetRow(row){
  if(!row) return null
  return {
    id: row.id,
    sucursal_id: row.sucursal_id,
    sucursal_nombre: row.sucursal_nombre,
    sucursal_ip: row.sucursal_ip,
    proveedor_primario: row.proveedor_primario,
    proveedor_secundario: row.proveedor_secundario,
    estado_primario: row.estado_primario,
    estado_secundario: row.estado_secundario,
    ip_primario: row.ip_primario,
    ip_secundario: row.ip_secundario,
    interfaz_primario: row.interfaz_primario,
    interfaz_secundario: row.interfaz_secundario,
    tipo_primario: row.tipo_primario || row.tipo1,
    tipo_secundario: row.tipo_secundario || row.tipo2,
    fecha: row.fecha
  }
}
