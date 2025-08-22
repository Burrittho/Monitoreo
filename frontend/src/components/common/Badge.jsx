import React from 'react'

export default function Badge({ 
  children, 
  variant = 'default',
  size = 'md',
  className = '' 
}) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full transition-colors duration-200';
  
  const variants = {
    default: 'text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-700',
    success: 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/20',
    warning: 'text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20',
    error: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/20',
    info: 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20',
    secondary: 'text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800'
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs', 
    lg: 'px-3 py-1 text-sm'
  };
  
  return (
    <span className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}
