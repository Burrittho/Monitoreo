import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { apiGet } from '../../lib/api'

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const refreshMsRef = useRef(60000)

  const [summary, setSummary] = useState({
    branchesActive: 0,
    branchesInactive: 0,
    dvrActive: 0,
    dvrInactive: 0,
    serversActive: 0,
    serversInactive: 0,
  })

  useEffect(() => {
    const onToggle = () => setCollapsed(c => !c)
    const onToggleMobile = () => setMobileOpen(o => !o)
    document.addEventListener('toggleSidebar', onToggle)
    document.addEventListener('toggleSidebarMobile', onToggleMobile)
    return () => {
      document.removeEventListener('toggleSidebar', onToggle)
      document.removeEventListener('toggleSidebarMobile', onToggleMobile)
    }
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    // actualizar variable CSS para el layout
    const width = collapsed ? '4rem' : '18rem'
    document.documentElement.style.setProperty('--sidebar-width', width)
  }, [collapsed])

  useEffect(() => {
    let timer

    function norm(data) {
      if (Array.isArray(data)) return Array.isArray(data[0]) ? data[0] : data
      return []
    }
    function count(items) {
      let active = 0, inactive = 0
      for (const it of items) { if (it && it.success) active++; else inactive++ }
      return { active, inactive }
    }
    async function loadSummary() {
      try {
        // leer intervalo de backend
        try {
          const cfg = await apiGet('/api/config/refresh-interval')
          if (cfg?.intervalo) refreshMsRef.current = cfg.intervalo
        } catch {}

        const [branches, dvrs, servers] = await Promise.all([
          apiGet('/api/ips_report/ping-results').catch(() => []),
          apiGet('/api/ips_report/ping-results-dvr').catch(() => []),
          apiGet('/api/ips_report/ping-results-server').catch(() => []),
        ])
        const b = count(norm(branches))
        const d = count(norm(dvrs))
        const s = count(norm(servers))
        setSummary({
          branchesActive: b.active,
          branchesInactive: b.inactive,
          dvrActive: d.active,
          dvrInactive: d.inactive,
          serversActive: s.active,
          serversInactive: s.inactive,
        })
      } catch {}
    }

    async function loop() {
      await loadSummary()
      timer = setTimeout(loop, refreshMsRef.current)
    }
    loop()
    return () => clearTimeout(timer)
  }, [])

  const itemBase = 'w-full flex items-center px-3 py-3 rounded-lg text-left transition-all'
  const iconWrap = collapsed ? 'w-full flex items-center justify-center' : 'flex items-center space-x-3'
  const iconClass = 'min-w-[1.25rem] text-base'

  return (
    <>
      <div className={`fixed left-0 top-16 h-[calc(100vh-4rem)] z-30 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all ${collapsed ? 'w-16' : 'w-72'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-4">
          <div className={`mb-6 ${collapsed ? 'px-0' : 'px-2'}`}>
            <h2 className={`text-lg font-bold ${collapsed ? 'hidden' : ''}`}>Sistema de Monitoreo</h2>
          </div>

          <nav className="space-y-2">
            {!collapsed && (
              <div className="mb-2 px-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Monitoreo</p>
              </div>
            )}

            <Link to="/monitor" className={`${itemBase} ${location.pathname.startsWith('/monitor') && !location.pathname.startsWith('/monitor/analytics') ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-blue-50 dark:hover:bg-blue-900/10'}`}>
              <div className={iconWrap}>
                <i className={`fas fa-tachometer-alt ${iconClass}`}></i>
                {!collapsed && (
                  <div>
                    <span className="font-medium block">Vista General</span>
                    <span className="text-xs text-gray-400 block">Dashboard principal</span>
                  </div>
                )}
              </div>
            </Link>

            {!collapsed && (
              <div className="mb-2 mt-4 px-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Análisis</p>
              </div>
            )}

            <Link to="/monitor/analytics" className={`${itemBase} ${location.pathname.startsWith('/monitor/analytics') ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-blue-50 dark:hover:bg-blue-900/10'}`}>
              <div className={iconWrap}>
                <i className={`fas fa-chart-line ${iconClass}`}></i>
                {!collapsed && (
                  <div>
                    <span className="font-medium block">Análisis</span>
                    <span className="text-xs text-gray-400 block">Latencias y caídas</span>
                  </div>
                )}
              </div>
            </Link>

            <Link to="/reportes" className={`${itemBase} ${location.pathname.startsWith('/reportes') ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-blue-50 dark:hover:bg-blue-900/10'}`}>
              <div className={iconWrap}>
                <i className={`fas fa-file-alt ${iconClass}`}></i>
                {!collapsed && (
                  <div>
                    <span className="font-medium block">Reportes</span>
                    <span className="text-xs text-gray-400 block">Gestión de incidencias</span>
                  </div>
                )}
              </div>
            </Link>

            <Link to="/servers" className={`${itemBase} ${location.pathname.startsWith('/servers') ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-blue-50 dark:hover:bg-blue-900/10'}`}>
              <div className={iconWrap}>
                <i className={`fas fa-server ${iconClass}`}></i>
                {!collapsed && (
                  <div>
                    <span className="font-medium block">Servidores</span>
                    <span className="text-xs text-gray-400 block">Monitoreo NSClient++</span>
                  </div>
                )}
              </div>
            </Link>
          </nav>

          {!collapsed && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">Resumen Rápido</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Sucursales Activas</span>
                  <span className="font-semibold text-green-600">{summary.branchesActive}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sucursales Inactivas</span>
                  <span className="font-semibold text-red-600">{summary.branchesInactive}</span>
                </div>
                <div className="flex justify-between">
                  <span>DVR Activos</span>
                  <span className="font-semibold text-green-600">{summary.dvrActive}</span>
                </div>
                <div className="flex justify-between">
                  <span>DVR Inactivos</span>
                  <span className="font-semibold text-red-600">{summary.dvrInactive}</span>
                </div>
                <div className="flex justify-between">
                  <span>Servidores Activos</span>
                  <span className="font-semibold text-green-600">{summary.serversActive}</span>
                </div>
                <div className="flex justify-between">
                  <span>Servidores Inactivos</span>
                  <span className="font-semibold text-red-600">{summary.serversInactive}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {mobileOpen && <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />}
    </>
  )
}
