const zlib = require('zlib');

function compressJson(req, res, next) {
  const acceptEncoding = String(req.headers['accept-encoding'] || '');
  if (!acceptEncoding.includes('gzip')) return next();

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    try {
      const raw = Buffer.from(JSON.stringify(body));
      if (raw.length < 1024) {
        return originalJson(body);
      }
      const gz = zlib.gzipSync(raw);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      res.setHeader('Content-Length', gz.length);
      return res.send(gz);
    } catch (error) {
      return originalJson(body);
    }
  };

  return next();
}

module.exports = compressJson;
