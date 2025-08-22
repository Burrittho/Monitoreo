import React from 'react';

export const StatusBadge = ({ status = 'abierto', className = '' }) => {
  const styles = {
    abierto: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full text-xs',
    concluido: 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full text-xs',
    cerrado: 'bg-gray-300 dark:bg-gray-500 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full text-xs'
  };
  
  return (
    <span className={`${styles[status] || styles.abierto} ${className}`}>
      {status || 'Abierto'}
    </span>
  );
};

export const PriorityBadge = ({ priority = 'baja', className = '' }) => {
  const styles = {
    baja: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs',
    media: 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full text-xs',
    alta: 'bg-gray-300 dark:bg-gray-500 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full text-xs',
    critica: 'bg-gray-800 dark:bg-gray-900 text-white dark:text-gray-100 px-2 py-1 rounded-full text-xs font-bold'
  };
  
  return (
    <span className={`${styles[priority?.toLowerCase()] || styles.baja} ${className}`}>
      {priority || 'Baja'}
    </span>
  );
};

export const NetworkStatusBadge = ({ status = 'Desconocido', className = '' }) => {
  const styles = {
    'Online': 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full text-xs',
    'Offline': 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs',
    'Conectado': 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full text-xs',
    'Desconectado': 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs',
    'Desconocido': 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs'
  };
  
  return (
    <span className={`${styles[status] || styles['Desconocido']} ${className}`}>
      {status}
    </span>
  );
};
