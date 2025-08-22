export const API_BASE = import.meta.env.VITE_API_URL || '' // con proxy de Vite, cadena vacía
export const BACKEND_BASE = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:3000'

export async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Cache-Control': 'no-cache' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
