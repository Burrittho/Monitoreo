const logger = require('../config/logger');

function errorHandler(err, req, res, next) {
  logger.error('unhandled_error', { requestId: req.requestId, error: err.message, stack: err.stack });
  res.status(500).json({
    error: 'Error interno del servidor',
    requestId: req.requestId,
  });
}

module.exports = errorHandler;
