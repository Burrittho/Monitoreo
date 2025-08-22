export default function IpSelector({ ips, value, onChange, loading }) {
  return (
    <div className="relative">
      <select
        className="px-3 py-2 border rounded-lg text-sm pr-8 bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
        value={value || ''}
        onChange={e=>onChange(e.target.value)}
        disabled={loading}
      >
        <option value="" disabled>{loading ? 'Cargando...' : 'Selecciona una sucursal'}</option>
        {ips.map(ip => (
          <option key={ip.id} value={ip.id}>{ip.name ? `${ip.name} (${ip.ip})` : ip.ip}</option>
        ))}
      </select>
      {loading && <i className="fas fa-spinner fa-spin absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>}
    </div>
  )
}
