const env = require('../config/env');

function requireApiKey(req, res, next) {
  if (!env.apiKey) return next();
  const provided = req.headers['x-api-key'];
  if (provided !== env.apiKey) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  return next();
}

module.exports = { requireApiKey };
