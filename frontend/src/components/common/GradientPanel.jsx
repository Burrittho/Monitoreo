import React from 'react'

export default function GradientPanel({ color='blue', title, icon, actions, children, className='' }){
  const colorMap = {
    blue: 'from-blue-600 to-purple-600',
    green: 'from-green-600 to-teal-600',
    orange: 'from-orange-600 to-red-600',
    purple: 'from-purple-600 to-pink-600'
  }
  const gradient = colorMap[color] || colorMap.blue
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden ${className}`}> 
      <div className={`px-6 py-4 bg-gradient-to-r ${gradient} flex flex-col md:flex-row md:items-center md:justify-between gap-4`}>
        <div className="flex items-center gap-3">
          {icon && <div className="p-2 bg-white/20 rounded-lg"><i className={`fas ${icon} text-white text-xl`}/></div>}
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>
        {actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
