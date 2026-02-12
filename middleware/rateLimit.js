function createRateLimiter({ windowMs, max, message }) {
    const hits = new Map();

    return (req, res, next) => {
        const now = Date.now();
        const key = req.ip || req.socket.remoteAddress || 'unknown';
        const entry = hits.get(key);

        if (!entry || now > entry.resetAt) {
            hits.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        if (entry.count >= max) {
            return res.status(429).json(message);
        }

        entry.count += 1;
        return next();
    };
}

module.exports = { createRateLimiter };
