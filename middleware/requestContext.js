const crypto = require('crypto');
const logger = require('../utils/logger');

function createRequestId() {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function requestContext(req, res, next) {
    const requestId = req.headers['x-request-id'] || createRequestId();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    req.log = logger.child({ requestId });

    next();
}

function requestLogger(req, res, next) {
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

        req.log[level](
            {
                requestId: req.requestId,
                route: req.originalUrl,
                method: req.method,
                statusCode: res.statusCode,
                durationMs: Number(durationMs.toFixed(2))
            },
            'http_request'
        );
    });

    next();
}

module.exports = {
    requestContext,
    requestLogger
};
