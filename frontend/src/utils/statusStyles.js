export const STATUS_STYLES = {
  verificar: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300',
  'sin conexion': 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400',
  'sin conexión': 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400',
  'sin trazado': 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400',
  exitoso: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400',
}
export function statusClass(value){
  const v = (value||'').toString().trim().toLowerCase()
  return STATUS_STYLES[v] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}
