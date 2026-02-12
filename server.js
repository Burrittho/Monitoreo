const express = require('express');
const ipsRoutes = require('./routes/ips');
const ipsReportRoutes = require('./routes/ips_report');
const pingHistoryRoutes = require('./routes/ping_history');
const internetRoutes = require('./routes/internet');
const reportsRoutes = require('./routes/reports');
const consoleRoutes = require('./routes/console');
const config = require('./routes/config');
const { iniciarPingsContinuos } = require('./models/ping');
const { iniciarPings_dvrContinuos } = require('./controllers/ping_DVR');
const { iniciarPings_serverContinuos } = require('./controllers/ping_Server');
const { startWorker } = require('./controllers/mailcontroller');
const chartsRoutes = require('./routes/api_charts');
const nrdpRoutes = require('./routes/nrdp');
const pool = require('./config/db');
const logger = require('./utils/logger').child({ component: 'api' });
const { requestContext, requestLogger } = require('./middleware/requestContext');
const { recordDbStatus, getReadiness } = require('./services/monitorMetrics');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestContext);
app.use(requestLogger);

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

app.use('/api/ips', ipsRoutes);
app.use('/api/ips_report', ipsReportRoutes);
app.use('/api/ping_history', pingHistoryRoutes);
app.use('/api/internet', internetRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/console', consoleRoutes);
app.use('/api/config/', config);
app.use('/api', chartsRoutes);
app.use('/api', nrdpRoutes);

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
