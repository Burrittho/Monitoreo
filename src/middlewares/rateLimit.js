function createRateLimit({ windowMs = 60000, max = 120 } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || 'unknown';
    const bucket = hits.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }
    bucket.count += 1;
    hits.set(key, bucket);

    if (bucket.count > max) {
      return res.status(429).json({ error: 'Rate limit excedido' });
    }
    return next();
  };
}

module.exports = createRateLimit;
