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

// Crear una instancia de Express
const app = express();
const port = process.env.PORT || 3000;

// Middleware para parsear JSON y URL-encoded (necesario para NRDP)
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// CORS para permitir requests desde el frontend (React/Vite en puerto 5173)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});


// API Routes - Solo endpoints para el frontend
app.use('/api/ips', ipsRoutes);  // Rutas para manejar IPs
app.use('/api/ips_report', ipsReportRoutes);  // Rutas para manejar reportes de IPs
app.use('/api/ping_history', pingHistoryRoutes);  // Rutas para manejar el historial de pings
app.use('/api/internet', internetRoutes);  // Rutas para manejar información de internet
app.use('/api/reports', reportsRoutes);  // Rutas para manejar reportes de incidencias
app.use('/api/console', consoleRoutes);  // Rutas para manejar información de consola
app.use('/api/config/', config);  // Rutas para manejar configuración
app.use('/api', chartsRoutes);  // Rutas para gráficas y análisis
app.use('/api', nrdpRoutes);  // Rutas NRDP para NSClient++ (monitoreo de servidores)

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: err.message 
    });
});

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
