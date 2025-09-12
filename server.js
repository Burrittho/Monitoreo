const express = require('express');
const routes = require('./routes/redirec'); // Importa las rutas pagina temporal
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
const path = require('path'); // path para manejar rutas de archivos
const fs = require('fs'); // fs para verificar la existencia de archivos
const pool = require('./config/db'); // Importa la configuración de la base de datos

// Crear una instancia de Express
const app = express();
const port = process.env.PORT || 3000;

// Middleware para servir archivos estáticos y parsear JSON
app.use(express.json()); 

// CORS simple para permitir front en otro puerto (React/Vite)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

app.use(express.static(path.join(__dirname, 'public'))); // Usar path.join para mejor compatibilidad
app.use('/utils', express.static(path.join(__dirname, 'utils'))); // Usar path.join para mejor compatibilidad


// Usamos las rutas definidas en para las API routes.js
app.use('/redirec', routes);  // Rutas para la página de inicio y reporte
app.use('/api/ips', ipsRoutes);  // Rutas para manejar IPs
app.use('/api/ips_report', ipsReportRoutes);  // Rutas para manejar reportes de IPs
app.use('/api/ping_history', pingHistoryRoutes);  // Rutas para manejar el historial de pings
app.use('/api/internet', internetRoutes);  // Rutas para manejar información de internet
app.use('/api/reports', reportsRoutes);  // Rutas para manejar reportes de incidencias
app.use('/api/console', consoleRoutes);  // Rutas para manejar información de consola
app.use('/api/config/', config);  // Rutas para manejar configuración
app.use('/api', chartsRoutes);  // Rutas para gráficas y análisis

// Ruta principal 
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'views', 'monitor.html'));
});

// Ruta para manejar archivos HTML en la carpeta views
app.get('/:page', (req, res, next) => {
    const requestedPage = req.params.page;
    
    // Asegurarse de que estamos tratando con un archivo HTML
    if (requestedPage.endsWith('.html')) {
        const filePath = path.join(__dirname, 'public', 'views', requestedPage);
        
        // Comprobar si el archivo existe
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                // Si el archivo no existe, continuamos con el siguiente middleware
                return next();
            }
            
            // Si el archivo existe, lo enviamos
            res.sendFile(filePath);
        });
    } else {
        // Si no es un archivo HTML, continuamos con el siguiente middleware
        next();
    }
});

// Middleware de manejo de errores general (debe ir después de las rutas)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Error interno del servidor o', 
        404: 'Recurso no encontrado',
        message: err.message 
    });
});

// Middleware para manejar rutas no encontradas
app.use((req, res) => {
    // Verificar si la solicitud es para un archivo HTML
    if (req.path.endsWith('.html')) {
        res.status(404).sendFile(path.join(__dirname, 'public', 'views', '404.html'));
    } else {
        res.status(404).json({ error: 'Recurso no encontrado' });
    }
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
