export const API_BASE = import.meta.env.VITE_API_URL || ''
export const BACKEND_BASE = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:3000'

const DEFAULT_TIMEOUT_MS = 12000
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])

function withTimeout(ms, externalSignal) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(new Error('timeout')), ms)

  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort(externalSignal.reason), { once: true })
  }

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  }
}

async function request(path, { method = 'GET', body, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS, retries = 1, signal } = {}) {
  let lastError

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const timeout = withTimeout(timeoutMs, signal)
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: timeout.signal,
      })

      if (!res.ok) {
        if (attempt < retries && RETRYABLE_STATUS.has(res.status)) {
          await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)))
          continue
        }
        throw new Error(`HTTP ${res.status}`)
      }

      if (res.status === 204) return null
      return res.json()
    } catch (error) {
      lastError = error
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)))
      }
    } finally {
      timeout.clear()
    }
  }

  throw lastError || new Error('request_failed')
}

export function apiGet(path, opts = {}) {
  return request(path, { ...opts, method: 'GET' })
}

export function apiPost(path, body, opts = {}) {
  return request(path, { ...opts, method: 'POST', body })
}

export function apiPut(path, body, opts = {}) {
  return request(path, { ...opts, method: 'PUT', body })
}

export function apiDelete(path, opts = {}) {
  return request(path, { ...opts, method: 'DELETE' })
}
