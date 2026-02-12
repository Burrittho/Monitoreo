const express = require('express');
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
const {startWorker} = require('./controllers/mailcontroller'); // Sistema de monitoreo N+1
const chartsRoutes = require('./routes/api_charts'); // Importa las rutas para gráficas
const nrdpRoutes = require('./routes/nrdp'); // Importa las rutas NRDP para NSClient++
const pool = require('./config/db'); // Importa la configuración de la base de datos
const { requireApiKey } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const { createRateLimiter } = require('./middleware/rateLimit');

// Crear una instancia de Express
const app = express();
const port = process.env.PORT || 3000;

// Middleware para parsear JSON y URL-encoded (necesario para NRDP)
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

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
    if (req.path.startsWith('/api/nrdp') && req.method === 'POST') {
        return ingestLimiter(req, res, next);
    }
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return writeLimiter(req, res, next);
    }
    return readLimiter(req, res, next);
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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Middleware unificado de manejo de errores
app.use(errorHandler);

// Middleware para rutas no encontradas - Solo respuestas JSON
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
});

//  Iniciar el sistema de monitoreo N+1 (reemplaza al sistema antiguo)
startWorker(pool);

// Iniciar los pings continuos al arrancar el servidor
iniciarPingsContinuos();

// Iniciar los pings continuos para DVR
iniciarPings_dvrContinuos();

// Iniciar los pings continuos para server
iniciarPings_serverContinuos();

// Iniciar el servidor en el puerto especificado
app.listen(port, () => {
    console.log(`Servidor iniciado en Puerto:${port}`);
});
