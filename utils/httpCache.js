const crypto = require('crypto');

function withConditionalJson(options = {}) {
  const maxAge = Number.isFinite(options.maxAge) ? options.maxAge : 30;

  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (payload) => {
      try {
        const body = JSON.stringify(payload);
        const etag = `\"${crypto.createHash('sha1').update(body).digest('hex')}\"`;
        const inm = req.headers['if-none-match'];

        if (inm && inm === etag) {
          res.setHeader('ETag', etag);
          res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
          return res.status(304).end();
        }

        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      } catch (_error) {
      }

      return originalJson(payload);
    };

    next();
  };
}

module.exports = {
  withConditionalJson,
};
