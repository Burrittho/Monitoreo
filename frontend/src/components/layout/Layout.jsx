import Header from './Header'
import Sidebar from './Sidebar'
import { useEffect, useState } from 'react'

export default function Layout({ children }) {
  const [sideWidth, setSideWidth] = useState('18rem')

  useEffect(() => {
    const update = () => {
      const w = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width') || '18rem'
      setSideWidth(w.trim())
    }
    update()
    const obs = new MutationObserver(update)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
    window.addEventListener('resize', update)
    return () => { obs.disconnect(); window.removeEventListener('resize', update) }
  }, [])

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100">
      <Header />
      <div className="pt-16 flex">
        <Sidebar />
        <main className="flex-1 p-6 transition-all" style={{ marginLeft: `var(--sidebar-width, ${sideWidth})` }}>
          {children}
        </main>
      </div>
    </div>
  )
}
