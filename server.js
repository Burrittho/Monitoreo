const express = require('express');
const compression = require('compression');
const ipsRoutes = require('./routes/ips'); // Importa las rutas para manejar IPs
const ipsReportRoutes = require('./routes/ips_report'); // Importa las rutas para manejar IPs
const pingHistoryRoutes = require('./routes/ping_history'); // Importa las rutas para manejar el historial de pings
const internetRoutes = require('./routes/internet'); // Importa las rutas para manejar internet
const reportsRoutes = require('./routes/reports'); // Importa las rutas para manejar reportes
const consoleRoutes = require('./routes/console'); // Importa las rutas para manejar información de consola
const config = require('./routes/config'); // Importa la configuración
const {iniciarPingsContinuos} = require('./models/ping'); // Importa la función para iniciar pings
const { iniciarPings_dvrContinuos } = require('./controllers/ping_DVR'); // Importa la función para iniciar pings para DVR
const { iniciarPings_serverContinuos } = require('./controllers/ping_Server'); // Importa la función para iniciar pings para servidores
const { startWorker, getMonitoringRuntimeStatus } = require('./controllers/mailcontroller'); // Sistema de monitoreo N+1
const chartsRoutes = require('./routes/api_charts'); // Importa las rutas para gráficas
const nrdpRoutes = require('./routes/nrdp'); // Importa las rutas NRDP para NSClient++
const liveRoutes = require('./routes/live');
const historicalRoutes = require('./routes/historical');
const pool = require('./config/db'); // Importa la configuración de la base de datos
const { withConditionalJson } = require('./utils/httpCache');

const app = express();
const port = process.env.PORT || 3000;

app.set('etag', 'strong');
app.use(compression({
    filter: (req, res) => {
        if (req.path.startsWith('/api/live')) return false;
        return compression.filter(req, res);
    }
}));

// Middleware para parsear JSON y URL-encoded (necesario para NRDP)
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(requestContext);
app.use(requestLogger);

// CORS con lista blanca configurable
const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedMethods = 'GET,POST,PUT,DELETE,OPTIONS,PATCH';
const allowedHeaders = 'Content-Type, Authorization, X-API-Key';

app.use((req, res, next) => {
    const requestOrigin = req.headers.origin;
    if (!requestOrigin || allowedOrigins.length === 0 || allowedOrigins.includes(requestOrigin)) {
        if (requestOrigin) {
            res.header('Access-Control-Allow-Origin', requestOrigin);
            res.header('Vary', 'Origin');
        }
    }

    res.header('Access-Control-Allow-Methods', allowedMethods);
    res.header('Access-Control-Allow-Headers', allowedHeaders);

    if (req.method === 'OPTIONS') {
        if (requestOrigin && allowedOrigins.length > 0 && !allowedOrigins.includes(requestOrigin)) {
            return res.sendStatus(403);
        }
        return res.sendStatus(204);
    }
    return next();
});

const readLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: Number(process.env.RATE_LIMIT_READ_MAX || 300),
    message: { error: 'Demasiadas solicitudes de lectura. Intente nuevamente.' },
});

const writeLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: Number(process.env.RATE_LIMIT_WRITE_MAX || 80),
    message: { error: 'Demasiadas solicitudes de escritura. Intente nuevamente.' },
});

const ingestLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: Number(process.env.RATE_LIMIT_INGEST_MAX || 600),
    message: { error: 'Demasiadas solicitudes de ingestión NRDP. Intente nuevamente.' },
});

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, If-None-Match');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

app.use('/api/live', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
});

app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/live')) return next();
    return withConditionalJson({ maxAge: 15 })(req, res, next);
});

// API Routes - Solo endpoints para el frontend
app.use('/api/ips', ipsRoutes);  // Rutas para manejar IPs
app.use('/api/ips_report', ipsReportRoutes);  // Rutas para manejar reportes de IPs
app.use('/api/ping_history', pingHistoryRoutes);  // Rutas para manejar el historial de pings
app.use('/api/internet', internetRoutes);  // Rutas para manejar información de internet
app.use('/api/reports', reportsRoutes);  // Rutas para manejar reportes de incidencias
app.use('/api/console', consoleRoutes);  // Rutas para manejar información de consola
app.use('/api/config/', requireApiKey, config);  // Rutas para manejar configuración
app.use('/api', chartsRoutes);  // Rutas para gráficas y análisis
app.use('/api', nrdpRoutes);  // Rutas NRDP para NSClient++ (monitoreo de servidores)
app.use('/api', liveRoutes); // Estado live y stream SSE
app.use('/api', historicalRoutes); // Endpoints históricos paginados

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'alive',
        service: 'monitoreo-backend',
        timestamp: new Date().toISOString()
    });
});

app.get('/ready', async (req, res) => {
    const startedAt = process.hrtime.bigint();

    try {
        await pool.query('SELECT 1 AS ok');
        const latencyMs = Number((Number(process.hrtime.bigint() - startedAt) / 1e6).toFixed(2));

        recordDbStatus({ status: 'ready', latencyMs });
        const readiness = getReadiness();
        return res.json(readiness);
    } catch (error) {
        const latencyMs = Number((Number(process.hrtime.bigint() - startedAt) / 1e6).toFixed(2));

        recordDbStatus({ status: 'unavailable', latencyMs, error });
        const readiness = getReadiness();

        return res.status(503).json({
            ...readiness,
            details: 'Base de datos no disponible. Servicio en modo degradado.'
        });
    }
});


app.get('/ready', (req, res) => {
    const runtime = getMonitoringRuntimeStatus();
    const degraded = Boolean(runtime.db?.degraded);

    res.status(degraded ? 503 : 200).json({
        status: degraded ? 'degraded' : 'ready',
        degraded,
        db: runtime.db,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/meta/runtime', (req, res) => {
    const runtime = getMonitoringRuntimeStatus();
    res.json({
        degraded: Boolean(runtime.db?.degraded),
        dbOffline: Boolean(runtime.db?.degraded),
        runtime,
        timestamp: new Date().toISOString()
    });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
    const requestLoggerInstance = req.log || logger;
    requestLoggerInstance.error(
        {
            requestId: req.requestId,
            route: req.originalUrl,
            error: {
                message: err.message,
                stack: err.stack
            }
        },
        'Unhandled server error'
    );

    res.status(500).json({
        error: 'Error interno del servidor',
        message: err.message,
        requestId: req.requestId
    });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado', requestId: req.requestId });
});

startWorker(pool);
iniciarPingsContinuos();
iniciarPings_dvrContinuos();
iniciarPings_serverContinuos();

app.listen(port, () => {
    logger.info({ port }, 'Servidor iniciado');
});
