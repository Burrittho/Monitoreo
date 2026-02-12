function sanitizePagination(query = {}) {
  const limitRaw = Number.parseInt(query.limit, 10);
  const offsetRaw = Number.parseInt(query.offset, 10);

  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

  return { limit, offset };
}

module.exports = { sanitizePagination };
