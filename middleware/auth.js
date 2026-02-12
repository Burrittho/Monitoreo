const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

function requireApiKey(req, res, next) {
    if (!ADMIN_API_KEY) {
        return res.status(503).json({ error: 'Autenticación administrativa no configurada' });
    }

    const headerKey = req.get('x-api-key');
    const authHeader = req.get('authorization');
    const bearerKey = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const providedKey = headerKey || bearerKey;

    if (!providedKey || providedKey !== ADMIN_API_KEY) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    return next();
}

module.exports = {
    requireApiKey,
};
