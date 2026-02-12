const dateRegex = /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?(?:Z)?)?$/;

const badRequest = (res, message, field) =>
    res.status(400).json({
        error: 'Parámetros inválidos',
        validationErrors: [{ field, message }],
    });

const validate = (validators) => (req, res, next) => {
    for (const validator of validators) {
        const result = validator(req);
        if (result) {
            return badRequest(res, result.message, result.field);
        }
    }
    return next();
};

const idParamValidator = (name = 'id') => (req) => {
    const value = Number.parseInt(req.params[name], 10);
    if (!Number.isInteger(value) || value < 1) {
        return { field: name, message: `${name} debe ser un entero positivo` };
    }
    req.params[name] = value;
    return null;
};

const paginationValidators = [
    (req) => {
        if (req.query.limit === undefined) return null;
        const value = Number.parseInt(req.query.limit, 10);
        if (!Number.isInteger(value) || value < 1 || value > 1000) return { field: 'limit', message: 'limit debe estar entre 1 y 1000' };
        req.query.limit = value;
        return null;
    },
    (req) => {
        if (req.query.offset === undefined) return null;
        const value = Number.parseInt(req.query.offset, 10);
        if (!Number.isInteger(value) || value < 0) return { field: 'offset', message: 'offset debe ser >= 0' };
        req.query.offset = value;
        return null;
    },
    (req) => {
        if (req.query.page === undefined) return null;
        const value = Number.parseInt(req.query.page, 10);
        if (!Number.isInteger(value) || value < 1) return { field: 'page', message: 'page debe ser >= 1' };
        req.query.page = value;
        return null;
    },
];

const chartDataValidators = [
    (req) => {
        const ipId = Number.parseInt(req.query.ipId, 10);
        if (!Number.isInteger(ipId) || ipId < 1) return { field: 'ipId', message: 'ipId debe ser un entero positivo' };
        req.query.ipId = ipId;
        return null;
    },
    (req) => (!req.query.startDate || !dateRegex.test(req.query.startDate) ? { field: 'startDate', message: 'startDate inválido' } : null),
    (req) => (!req.query.endDate || !dateRegex.test(req.query.endDate) ? { field: 'endDate', message: 'endDate inválido' } : null),
    (req) => {
        if (req.query.limit === undefined) return null;
        const value = Number.parseInt(req.query.limit, 10);
        if (!Number.isInteger(value) || value < 1 || value > 841000) return { field: 'limit', message: 'limit fuera de rango' };
        req.query.limit = value;
        return null;
    },
];

const reportsCreateValidators = [
    (req) => {
        const id = Number.parseInt(req.body.sucursal_id, 10);
        if (!Number.isInteger(id) || id < 1) return { field: 'sucursal_id', message: 'sucursal_id inválido' };
        req.body.sucursal_id = id;
        return null;
    },
    (req) => (!req.body.proveedor || typeof req.body.proveedor !== 'string' ? { field: 'proveedor', message: 'proveedor es requerido' } : null),
];

const reportsUpdateValidators = [
    idParamValidator('id'),
    (req) => {
        const allowedFields = ['descripcion', 'prioridad', 'estado', 'numero_ticket', 'fecha_resolucion'];
        const keys = Object.keys(req.body || {});
        if (!keys.length) return { field: 'body', message: 'No se enviaron campos' };
        const invalid = keys.filter((k) => !allowedFields.includes(k));
        if (invalid.length) return { field: 'body', message: `Campos no permitidos: ${invalid.join(', ')}` };
        return null;
    },
];

const ipsCreateValidators = [
    (req) => (!req.body.name || typeof req.body.name !== 'string' ? { field: 'name', message: 'name es requerido' } : null),
    (req) => {
        const ip = req.body.ip;
        const ipRegex = /^(?:\d{1,3}\.){3}\d{1,3}$/;
        if (!ip || typeof ip !== 'string' || !ipRegex.test(ip)) return { field: 'ip', message: 'ip inválida' };
        return null;
    },
];

const ipsUpdateValidators = [
    idParamValidator('id'),
    (req) => (!req.body.nombre || typeof req.body.nombre !== 'string' ? { field: 'nombre', message: 'nombre es requerido' } : null),
    (req) => (!req.body.url || typeof req.body.url !== 'string' ? { field: 'url', message: 'url es requerido' } : null),
    (req) => (!req.body.internet1 || typeof req.body.internet1 !== 'string' ? { field: 'internet1', message: 'internet1 es requerido' } : null),
    (req) => (!req.body.internet2 || typeof req.body.internet2 !== 'string' ? { field: 'internet2', message: 'internet2 es requerido' } : null),
];

const configKeyValidator = (req) => {
    const key = req.params.key;
    if (!key || typeof key !== 'string') return { field: 'key', message: 'key inválido' };
    return null;
};

const configUpdateValidators = [
    configKeyValidator,
    (req) => (req.body.value === undefined ? { field: 'value', message: 'value es requerido' } : null),
];

module.exports = {
    validate,
    idParamValidator,
    paginationValidators,
    chartDataValidators,
    reportsCreateValidators,
    reportsUpdateValidators,
    ipsCreateValidators,
    ipsUpdateValidators,
    configUpdateValidators,
};
