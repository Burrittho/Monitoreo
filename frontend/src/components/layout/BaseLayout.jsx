import React from 'react';
import { components } from '../../theme';

/**
 * Layout base unificado para todas las páginas del dashboard
 */
export const BaseLayout = ({ 
  children, 
  title, 
  subtitle, 
  actions, 
  className = '',
  maxWidth = 'max-w-7xl'
}) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Container principal */}
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-6 ${maxWidth} ${className}`}>
        {/* Header de la página */}
        {(title || subtitle || actions) && (
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0 flex-1">
                {title && (
                  <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex flex-col sm:flex-row gap-3">
                  {actions}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Contenido principal */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
};

/**
 * Panel con gradiente para secciones importantes
 */
export const GradientPanel = ({ 
  children, 
  className = '', 
  padding = 'p-6',
  title,
  description 
}) => {
  return (
    <div className={`gradient-panel ${padding} ${className}`}>
      {(title || description) && (
        <div className="mb-6">
          {title && (
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

/**
 * Card base para contenido
 */
export const Card = ({ 
  children, 
  className = '', 
  padding = 'p-6',
  hoverable = true 
}) => {
  return (
    <div className={`card-base ${padding} ${hoverable ? 'hover:shadow-md' : ''} ${className}`}>
      {children}
    </div>
  );
};

/**
 * Grid responsivo para cards
 */
export const CardGrid = ({ 
  children, 
  columns = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  gap = 'gap-6',
  className = '' 
}) => {
  return (
    <div className={`grid ${columns} ${gap} ${className}`}>
      {children}
    </div>
  );
};

/**
 * Sección con header y contenido
 */
export const Section = ({ 
  title, 
  description, 
  children, 
  className = '',
  headerActions 
}) => {
  return (
    <section className={`${className}`}>
      {(title || description || headerActions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="min-w-0 flex-1">
            {title && (
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
          {headerActions && (
            <div className="flex gap-3">
              {headerActions}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  );
};

/**
 * Container para estadísticas/métricas
 */
export const StatsContainer = ({ 
  children, 
  columns = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  className = '' 
}) => {
  return (
    <div className={`grid ${columns} gap-4 lg:gap-6 ${className}`}>
      {children}
    </div>
  );
};

/**
 * Card de estadística individual
 */
export const StatCard = ({ 
  title, 
  value, 
  change, 
  changeType = 'neutral',
  icon,
  className = '' 
}) => {
  const changeColors = {
    positive: 'text-green-600 dark:text-green-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-slate-600 dark:text-slate-400'
  };

  return (
    <Card className={`${className}`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 truncate">
            {title}
          </p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {value}
          </p>
          {change && (
            <p className={`text-sm ${changeColors[changeType]}`}>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
              {icon}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

/**
 * Loading skeleton para optimización de UX
 */
export const LoadingSkeleton = ({ 
  lines = 3, 
  className = '',
  animate = true 
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div 
          key={i}
          className={`h-4 bg-slate-200 dark:bg-slate-700 rounded ${
            animate ? 'animate-pulse' : ''
          }`}
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
};

/**
 * Empty state para cuando no hay datos
 */
export const EmptyState = ({ 
  icon, 
  title, 
  description, 
  action,
  className = '' 
}) => {
  return (
    <Card className={`text-center py-12 ${className}`}>
      {icon && (
        <div className="mx-auto w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      {title && (
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action}
    </Card>
  );
};
