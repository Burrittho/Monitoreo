import { useEffect } from 'react'

export default function Header() {
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const initial = saved || (prefersDark ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', initial === 'dark')
  }, [])

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-white/70 dark:bg-gray-900/70 backdrop-blur border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center space-x-3">
          <button className="hidden lg:block p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => document.dispatchEvent(new CustomEvent('toggleSidebar'))}>
            <i className="fas fa-align-left"></i>
          </button>
          <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => document.dispatchEvent(new CustomEvent('toggleSidebarMobile'))}>
            <i className="fas fa-bars"></i>
          </button>
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <i className="fas fa-network-wired text-white text-sm"></i>
          </div>
          <h1 className="text-xl font-semibold">Monitor de Sucursales</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 dark:bg-green-900/30 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Sistema Activo</span>
          </div>
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" onClick={toggleTheme}>
            <i className="fas fa-moon"></i>
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <i className="fas fa-cog"></i>
          </button>
        </div>
      </div>
    </header>
  )
}
