import { useState, useMemo } from 'react';

/**
 * Hook personalizado para manejar paginación
 * @param {Array} data - Array de datos a paginar
 * @param {number} initialItemsPerPage - Número inicial de elementos por página
 * @returns {Object} Objeto con datos paginados y funciones de control
 */
export const usePagination = (data = [], initialItemsPerPage = 10) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  // Calcular valores derivados
  const paginationData = useMemo(() => {
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = data.slice(startIndex, endIndex);

    return {
      currentItems,
      totalItems,
      totalPages,
      startIndex,
      endIndex,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1
    };
  }, [data, currentPage, itemsPerPage]);

  // Funciones de control
  const goToPage = (page) => {
    if (page >= 1 && page <= paginationData.totalPages) {
      setCurrentPage(page);
    }
  };

  const goToNextPage = () => {
    goToPage(currentPage + 1);
  };

  const goToPreviousPage = () => {
    goToPage(currentPage - 1);
  };

  const goToFirstPage = () => {
    goToPage(1);
  };

  const goToLastPage = () => {
    goToPage(paginationData.totalPages);
  };

  const changeItemsPerPage = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Resetear a la primera página
  };

  // Reset pagination when data changes
  const resetPagination = () => {
    setCurrentPage(1);
  };

  return {
    ...paginationData,
    currentPage,
    itemsPerPage,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    changeItemsPerPage,
    resetPagination
  };
};
