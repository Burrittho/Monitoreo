const levels = {
    debug: 20,
    info: 30,
    warn: 40,
    error: 50
};

const configuredLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
const threshold = levels[configuredLevel] || levels.info;

function sanitizeError(error) {
    if (!error) return undefined;

    return {
        message: error.message,
        name: error.name,
        stack: error.stack
    };
}

function log(level, payload = {}, msg) {
    if ((levels[level] || 0) < threshold) return;

    const entry = {
        timestamp: new Date().toISOString(),
        level,
        ...payload
    };

    if (msg) entry.msg = msg;

    const serialized = JSON.stringify(entry);
    if (level === 'error') {
        process.stderr.write(`${serialized}\n`);
        return;
    }
    process.stdout.write(`${serialized}\n`);
}

function child(bindings = {}) {
    return {
        debug: (payload, msg) => log('debug', { ...bindings, ...payload }, msg),
        info: (payload, msg) => log('info', { ...bindings, ...payload }, msg),
        warn: (payload, msg) => log('warn', { ...bindings, ...payload }, msg),
        error: (payload, msg) => {
            const nextPayload = { ...bindings, ...payload };
            if (nextPayload.err instanceof Error) {
                nextPayload.error = sanitizeError(nextPayload.err);
                delete nextPayload.err;
            }
            if (nextPayload.error instanceof Error) {
                nextPayload.error = sanitizeError(nextPayload.error);
            }
            log('error', nextPayload, msg);
        }
    };
}

module.exports = child();
module.exports.child = child;
module.exports.sanitizeError = sanitizeError;
