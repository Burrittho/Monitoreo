import React from 'react';

export const Pagination = ({ 
  currentPage, 
  totalPages, 
  totalItems, 
  itemsPerPage, 
  onPageChange, 
  className = '' 
}) => {
  const getPageNumbers = () => {
    const delta = 2; // Número de páginas a mostrar a cada lado de la página actual
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1) return null;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Información de elementos */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Mostrando {startItem} a {endItem} de {totalItems} resultados
      </div>

      {/* Controles de paginación */}
      <div className="flex items-center gap-2">
        {/* Botón anterior */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 
                   bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                   hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors duration-200"
        >
          <i className="fas fa-chevron-left mr-1 text-gray-600 dark:text-gray-400" />
          Anterior
        </button>

        {/* Números de página */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((pageNumber, index) => (
            <React.Fragment key={index}>
              {pageNumber === '...' ? (
                <span className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  onClick={() => onPageChange(pageNumber)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${
                    currentPage === pageNumber
                      ? 'bg-gray-800 dark:bg-gray-600 text-white border border-gray-800 dark:border-gray-600'
                      : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {pageNumber}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Botón siguiente */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 
                   bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                   hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors duration-200"
        >
          Siguiente
          <i className="fas fa-chevron-right ml-1 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </div>
  );
};
