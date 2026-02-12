function validateIpId(ipId) {
  if (ipId === undefined || ipId === null || ipId === '') {
    return { valid: false, error: 'Se requiere ipId' };
  }

  const parsedIpId = Number(ipId);
  if (!Number.isInteger(parsedIpId) || parsedIpId <= 0) {
    return { valid: false, error: 'ipId debe ser un entero positivo' };
  }

  return { valid: true, value: parsedIpId };
}

function validateDateRange(startDate, endDate, options = {}) {
  const { requireBoth = false, defaultHours = 24 } = options;

  if (requireBoth && (!startDate || !endDate)) {
    return { valid: false, error: 'Se requieren startDate y endDate' };
  }

  const start = startDate ? new Date(startDate) : new Date(Date.now() - defaultHours * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { valid: false, error: 'startDate y endDate deben ser fechas válidas' };
  }

  if (start > end) {
    return { valid: false, error: 'startDate no puede ser mayor que endDate' };
  }

  return { valid: true, start, end };
}

function validatePagination(limit, offset, options = {}) {
  const {
    defaultLimit = 100,
    maxLimit = 10000,
    defaultOffset = 0,
    allowZeroLimit = false,
  } = options;

  const resolvedLimit = limit === undefined ? defaultLimit : Number(limit);
  const resolvedOffset = offset === undefined ? defaultOffset : Number(offset);

  const minLimit = allowZeroLimit ? 0 : 1;
  if (!Number.isInteger(resolvedLimit) || resolvedLimit < minLimit) {
    return { valid: false, error: allowZeroLimit ? 'limit debe ser un entero mayor o igual a 0' : 'limit debe ser un entero positivo' };
  }

  if (resolvedLimit > maxLimit) {
    return { valid: false, error: `limit no puede ser mayor a ${maxLimit}` };
  }

  if (!Number.isInteger(resolvedOffset) || resolvedOffset < 0) {
    return { valid: false, error: 'offset debe ser un entero mayor o igual a 0' };
  }

  return {
    valid: true,
    value: {
      limit: resolvedLimit,
      offset: resolvedOffset,
    },
  };
}

module.exports = {
  validateIpId,
  validateDateRange,
  validatePagination,
};
