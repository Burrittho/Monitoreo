export function formatDateTime(value, locale='es-MX', opts){
  if(!value) return '—'
  try{ const d = value instanceof Date ? value : new Date(value); if(isNaN(d)) return '—'; return d.toLocaleString(locale, opts) } catch{ return '—' }
}
export function formatDate(value, locale='es-MX', opts){
  if(!value) return '—'
  try{ const d = value instanceof Date ? value : new Date(value); if(isNaN(d)) return '—'; return d.toLocaleDateString(locale, opts) } catch{ return '—' }
}
