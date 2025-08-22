export default function InternetHistory({ items }) {
  if (!items || items.length === 0) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left">Fecha</th>
            <th className="px-3 py-2 text-left">Proveedor 1</th>
            <th className="px-3 py-2 text-left">Estado 1</th>
            <th className="px-3 py-2 text-left">Proveedor 2</th>
            <th className="px-3 py-2 text-left">Estado 2</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((r, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              <td className="px-3 py-2">{new Date(r.fecha_revision).toLocaleString('es-MX')}</td>
              <td className="px-3 py-2">{r.proveedor_primario || '—'}</td>
              <td className="px-3 py-2">{r.estado_primario || '—'}</td>
              <td className="px-3 py-2">{r.proveedor_secundario || '—'}</td>
              <td className="px-3 py-2">{r.estado_secundario || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
