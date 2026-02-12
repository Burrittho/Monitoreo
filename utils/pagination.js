function parsePagination(query = {}, options = {}) {
  const defaultLimit = options.defaultLimit ?? 50;
  const maxLimit = options.maxLimit ?? 500;
  const defaultOffset = options.defaultOffset ?? 0;

  const parsedLimit = Number.parseInt(query.limit, 10);
  const parsedOffset = Number.parseInt(query.offset, 10);

  const limit = Number.isFinite(parsedLimit)
    ? Math.max(1, Math.min(maxLimit, parsedLimit))
    : defaultLimit;

  const offset = Number.isFinite(parsedOffset)
    ? Math.max(0, parsedOffset)
    : defaultOffset;

  return { limit, offset };
}

module.exports = {
  parsePagination,
};
