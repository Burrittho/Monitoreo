import { useEffect, useState, useCallback } from 'react'
import { apiGet, apiPost } from '../lib/api'

export function useFetch(url, { auto=true, deps=[], transform, initial=[] } = {}) {
  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [revalidateFlag, setRevalidateFlag] = useState(0)

  const load = useCallback(async () => {
    try {
      setLoading(true); setError('')
      const res = await apiGet(url)
      const d = transform ? transform(res) : res
      setData(d)
    } catch(e){ setError(e.message) } finally { setLoading(false) }
  }, [url, transform])

  useEffect(()=>{ if(auto) load() }, [load, auto, revalidateFlag, ...deps])

  return { data, loading, error, reload: load, revalidate: ()=>setRevalidateFlag(f=>f+1) }
}

export function usePost(){
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const post = useCallback(async (url, body) => {
    try { setLoading(true); setError(''); setSuccess(false); const r= await apiPost(url, body); setSuccess(true); return r } catch(e){ setError(e.message); throw e } finally { setLoading(false) }
  }, [])
  return { post, loading, error, success }
}
