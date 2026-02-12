function errorHandler(err, req, res, next) {
    const status = err.status || 500;
    const isProd = process.env.NODE_ENV === 'production';

    console.error('[ERROR]', err);

    const response = {
        error: status >= 500 ? 'Error interno del servidor' : err.message,
    };

    if (!isProd) {
        response.message = err.message;
        if (err.stack) response.stack = err.stack;
    }

    return res.status(status).json(response);
}

module.exports = { errorHandler };
