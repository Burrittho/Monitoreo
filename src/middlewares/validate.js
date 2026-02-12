function parseDate(value, fallback) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseIntInRange(value, { min, max, fallback }) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < min || parsed > max) return null;
  return parsed;
}

function validateQuery(req, res, next) {
  const ipId = parseIntInRange(req.query.ipId, { min: 1, max: 1_000_000, fallback: null });
  if (req.query.ipId && ipId === null) {
    return res.status(400).json({ error: 'ipId inválido' });
  }

  const from = parseDate(req.query.from, new Date(Date.now() - 24 * 60 * 60 * 1000));
  const to = parseDate(req.query.to, new Date());
  if (!from || !to || from > to) {
    return res.status(400).json({ error: 'Rango de fechas inválido' });
  }

  const limit = parseIntInRange(req.query.limit, { min: 1, max: 500, fallback: 100 });
  const offset = parseIntInRange(req.query.offset, { min: 0, max: 1_000_000, fallback: 0 });
  if (limit === null || offset === null) {
    return res.status(400).json({ error: 'limit/offset inválidos' });
  }

  req.validated = { ipId, from, to, limit, offset };
  return next();
}

module.exports = validateQuery;
