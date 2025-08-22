function StatusPill({ status }) {
  const map = {
    connected: 'bg-green-100 text-green-700',
    online: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    disconnected: 'bg-red-100 text-red-700',
    offline: 'bg-red-100 text-red-700',
    error: 'bg-red-100 text-red-700',
    unknown: 'bg-gray-100 text-gray-700'
  }
  const label = {
    connected: 'Activo', online: 'Activo',
    warning: 'Advertencia',
    disconnected: 'Inactivo', offline: 'Inactivo', error: 'Error',
    unknown: 'Desconocido'
  }[status || 'unknown']
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[status||'unknown']}`}>{label}</span>
}

export default function BranchServicesInfo({ internet }) {
  if (!internet) return null
  const p = internet.primario || {}
  const s = internet.secundario || {}
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-4 bg-white rounded-lg shadow border">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">Internet Primario</h4>
          <StatusPill status={p.status || p.estado} />
        </div>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-gray-500">Proveedor</dt><dd>{p.proveedor || 'N/A'}</dd>
          <dt className="text-gray-500">Puerto</dt><dd>{p.puerto || 'N/A'}</dd>
          <dt className="text-gray-500">Configuración</dt><dd>{p.configuracion || 'N/A'}</dd>
          <dt className="text-gray-500">IP</dt><dd><code className="bg-gray-100 px-2 py-0.5 rounded">{p.ip || 'N/A'}</code></dd>
        </dl>
      </div>
      <div className="p-4 bg-white rounded-lg shadow border">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">Internet Secundario</h4>
          <StatusPill status={s.status || s.estado} />
        </div>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-gray-500">Proveedor</dt><dd>{s.proveedor || 'N/A'}</dd>
          <dt className="text-gray-500">Puerto</dt><dd>{s.puerto || 'N/A'}</dd>
          <dt className="text-gray-500">Configuración</dt><dd>{s.configuracion || 'N/A'}</dd>
          <dt className="text-gray-500">IP</dt><dd><code className="bg-gray-100 px-2 py-0.5 rounded">{s.ip || 'N/A'}</code></dd>
        </dl>
      </div>
      {internet.ultima_revision && (
        <div className="md:col-span-2 text-xs text-gray-500">
          Última revisión: {new Date(internet.ultima_revision).toLocaleString('es-MX')}
        </div>
      )}
    </div>
  )
}
