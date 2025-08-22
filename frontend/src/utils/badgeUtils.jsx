import React from 'react';

/**
 * Badge simple temporal para pruebas
 */
const TempBadge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${className}`}>
    {children}
  </span>
);

// Configuración de estilos para estados
const statusConfig = {
  abierto: {
    className: 'bg-red-100 text-red-800 border-red-200',
    label: 'Abierto'
  },
  concluido: {
    className: 'bg-green-100 text-green-800 border-green-200',
    label: 'Concluido'
  },
  cerrado: {
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    label: 'Cerrado'
  }
};

// Configuración de estilos para prioridades
const priorityConfig = {
  baja: {
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    label: 'Baja'
  },
  media: {
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    label: 'Media'
  },
  alta: {
    className: 'bg-orange-100 text-orange-800 border-orange-200',
    label: 'Alta'
  },
  critica: {
    className: 'bg-red-100 text-red-800 border-red-200 font-bold',
    label: 'Crítica'
  }
};

/**
 * Componente Badge para mostrar estados de reportes
 */
export const StatusBadge = ({ status, className = '' }) => {
  const config = statusConfig[status] || statusConfig.abierto;
  
  return (
    <TempBadge className={`${config.className} ${className}`}>
      {config.label}
    </TempBadge>
  );
};

/**
 * Componente Badge para mostrar prioridades
 */
export const PriorityBadge = ({ priority, className = '' }) => {
  const config = priorityConfig[priority?.toLowerCase()] || priorityConfig.baja;
  
  return (
    <TempBadge className={`${config.className} ${className}`}>
      {config.label}
    </TempBadge>
  );
};

/**
 * Componente Badge para mostrar estados de red
 */
export const NetworkStatusBadge = ({ status, className = '' }) => {
  const networkStatusConfig = {
    'Online': { className: 'bg-green-100 text-green-800', label: 'Online' },
    'Offline': { className: 'bg-red-100 text-red-800', label: 'Offline' },
    'Conectado': { className: 'bg-green-100 text-green-800', label: 'Conectado' },
    'Desconectado': { className: 'bg-red-100 text-red-800', label: 'Desconectado' },
    'Desconocido': { className: 'bg-gray-100 text-gray-800', label: 'Desconocido' }
  };
  
  const config = networkStatusConfig[status] || networkStatusConfig['Desconocido'];
  
  return (
    <TempBadge className={`text-xs ${config.className} ${className}`}>
      {config.label}
    </TempBadge>
  );
};

/**
 * Función helper para obtener configuración de estado
 */
export const getStatusConfig = (status) => {
  return statusConfig[status] || statusConfig.abierto;
};

/**
 * Función helper para obtener configuración de prioridad
 */
export const getPriorityConfig = (priority) => {
  return priorityConfig[priority?.toLowerCase()] || priorityConfig.baja;
};

/**
 * Función para obtener clase CSS de estado
 */
export const getStatusClass = (status) => {
  return getStatusConfig(status).className;
};

/**
 * Función para obtener clase CSS de prioridad
 */
export const getPriorityClass = (priority) => {
  return getPriorityConfig(priority).className;
};
