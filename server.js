const express = require('express');
const mariadb = require('mariadb');
const ping = require('ping');

const app = express();
const port = 3000;

// Configuración del pool de conexiones a la base de datos
const pool = mariadb.createPool({
    host: 'localhost',
    user: 'ping_user',
    password: 'password',
    database: 'ping_monitor',
    connectionLimit: 15
});

//Arreglos para nuevas IP
let ipList = [];
let pingIntervals = [];

async function loadIps() {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT * FROM ips');
    ipList = rows;
    conn.release();
}

// Middleware para servir archivos estáticos y parsear JSON
app.use(express.static('public'));
app.use(express.json());

// Middleware de manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Endpoint para obtener los resultados del ping
app.get('/api/ping-results', async (req, res, next) => {
    try {
        const conn = await pool.getConnection();
        const rows = await conn.query(`
            SELECT ips.name, ips.ip, ips.url, ping_logs.latency, ping_logs.success
            FROM ips
            LEFT JOIN (
                SELECT ip_id, MAX(id) AS max_id
                FROM ping_logs
                GROUP BY ip_id
            ) AS latest_logs ON ips.id = latest_logs.ip_id
            LEFT JOIN ping_logs ON latest_logs.max_id = ping_logs.id
            ORDER BY ips.name
        `);
        conn.release();
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

// Endpoint para agregar ips a la base de datos
app.post('/ips', async (req, res, next) => {
    try {
        const conn = await pool.getConnection();
        const { name, ip, url } = req.body;

        // Inserta los datos en la base de datos
        const result = await conn.query("INSERT INTO ips (name, ip, url) VALUES (?, ?, ?)", [name, ip, url]);
        await loadIps();
        conn.release();


        res.json({ message: 'IP added successfully' });

        // Añadir la nueva IP al proceso de pings continuos
        const newIP = ip;
        const intervalId = setInterval(() => {
            hacerPing(newIP);
        }, 1000);
        pingIntervals.push({ ip: newIP, intervalId });

        console.log(`Ping continuo iniciado para la nueva IP: ${newIP}`);

    } catch (err) {
        next(err);
    }
});

loadIps(); 

// Inicia el servidor en el puerto especificado
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

// Función para realizar ping a una IP
async function hacerPing(ip) {
    try {
        const result = await ping.promise.probe(ip);
        const conn = await pool.getConnection();
        const rows = await conn.query("SELECT id FROM ips WHERE ip = ?", [ip]);
        const ipId = rows[0] ? rows[0].id : null;
        const latency = Number.isFinite(result.time) ? result.time : 0;

        await conn.query("INSERT INTO ping_logs (ip_id, latency, success) VALUES (?, ?, ?)", [
            ipId,
            latency,
            result.alive ? 1 : 0
        ]);
        conn.release();

        console.log(`Ping realizado a ${ip}, Alive: ${result.alive}, Latency: ${latency}`);
    } catch (error) {
        console.error(`Error al hacer ping a ${ip}:`, error.message);
    }
}

// Función para iniciar los pings continuos
async function iniciarPingsContinuos() {
    try {
        const conn = await pool.getConnection();
        const rows = await conn.query("SELECT ip FROM ips");
        conn.release();

        // Configura un intervalo de ping para cada IP registrada
        rows.forEach(row => {
            setInterval(() => {
                hacerPing(row.ip);
            }, 1000);
        });

        console.log('Pings continuos iniciados para todas las IPs registradas.');
    } catch (err) {
        console.error("Error al iniciar pings continuos:", err.message);
    }
}

// Inicia los pings continuos al arrancar el servidor
iniciarPingsContinuos();
