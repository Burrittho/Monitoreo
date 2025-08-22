import { useState, useMemo, useCallback } from 'react'

export function useSortable(data, accessors, { defaultField, defaultDir='asc', filters=[] } = {}){
  const [sortField, setSortField] = useState(defaultField)
  const [sortDir, setSortDir] = useState(defaultDir)

  const toggleSort = useCallback(field => {
    setSortField(field)
    setSortDir(d => field===sortField ? (d==='asc'?'desc':'asc') : 'asc')
  }, [sortField])

  const filtered = useMemo(()=>{
    return data.filter(row => {
      for(const f of filters){
        if(!f.field || !f.value) continue
        const acc = accessors[f.field]
        if(!acc) continue
        const val = (acc(row)||'').toString().toLowerCase()
        if(!val.includes(f.value.toLowerCase())) return false
      }
      return true
    })
  }, [data, filters, accessors])

  const sorted = useMemo(()=>{
    const acc = accessors[sortField] || (()=>0)
    return [...filtered].sort((a,b)=>{
      const av = acc(a); const bv = acc(b)
      if(av < bv) return sortDir==='asc'? -1:1
      if(av > bv) return sortDir==='asc'? 1:-1
      return 0
    })
  }, [filtered, sortField, sortDir, accessors])

  return { data: sorted, sortField, sortDir, toggleSort }
}
