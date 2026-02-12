const { validateIpId, validateDateRange, validatePagination } = require('../../utils/queryValidators');

describe('queryValidators', () => {
  describe('validateIpId', () => {
    test('acepta enteros positivos', () => {
      expect(validateIpId('12')).toEqual({ valid: true, value: 12 });
    });

    test('rechaza vacío, cero y no numérico', () => {
      expect(validateIpId('')).toEqual({ valid: false, error: 'Se requiere ipId' });
      expect(validateIpId('0')).toEqual({ valid: false, error: 'ipId debe ser un entero positivo' });
      expect(validateIpId('abc')).toEqual({ valid: false, error: 'ipId debe ser un entero positivo' });
    });
  });

  describe('validateDateRange', () => {
    test('requiere ambas fechas cuando requireBoth=true', () => {
      expect(validateDateRange('2025-01-01', null, { requireBoth: true })).toEqual({
        valid: false,
        error: 'Se requieren startDate y endDate',
      });
    });

    test('rechaza fechas inválidas y rango invertido', () => {
      expect(validateDateRange('no-date', '2025-01-01')).toEqual({
        valid: false,
        error: 'startDate y endDate deben ser fechas válidas',
      });

      expect(validateDateRange('2025-01-02', '2025-01-01')).toEqual({
        valid: false,
        error: 'startDate no puede ser mayor que endDate',
      });
    });
  });

  describe('validatePagination', () => {
    test('aplica defaults', () => {
      expect(validatePagination(undefined, undefined, { defaultLimit: 100, defaultOffset: 0 })).toEqual({
        valid: true,
        value: { limit: 100, offset: 0 },
      });
    });

    test('valida límites de limit y offset', () => {
      expect(validatePagination('0', '0')).toEqual({ valid: false, error: 'limit debe ser un entero positivo' });
      expect(validatePagination('10001', '0', { maxLimit: 10000 })).toEqual({ valid: false, error: 'limit no puede ser mayor a 10000' });
      expect(validatePagination('10', '-1')).toEqual({ valid: false, error: 'offset debe ser un entero mayor o igual a 0' });
    });

    test('permite limit=0 cuando allowZeroLimit=true', () => {
      expect(validatePagination('0', '0', { allowZeroLimit: true })).toEqual({
        valid: true,
        value: { limit: 0, offset: 0 },
      });
    });
  });
});
