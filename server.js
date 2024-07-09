require('dotenv').config();
const express = require('express');
const pool = require('./config/db'); // Importamos el pool de conexiones desde db.js
const routes = require('./routes/routes');
const path = require('path');
const { monitorIPs } = require('./controllers/mailcontroller');
const {iniciarPingsContinuos,  hacerPing,  loadIps,    createPingSession,  clearAllPingIntervals} =require('./models/ping');

const app = express();
const port = 3000;

// Middleware para servir archivos estáticos y parsear JSON
app.use(express.static('public'));
app.use(express.json());

// Middleware de manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Error general -Puede ser cualquier cosa- Usa chatgpt');
});

// Middleware para servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Usamos las rutas definidas en routes.js
app.use('/', routes);

// API para obtener las IPs
app.get('/ips', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const query = 'SELECT * FROM ips';
        const rows = await connection.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).send(err.toString());
    } finally {
        if (connection) connection.end();
    }
});

// API para obtener los logs de ping y calcular la latencia media
app.get('/latency', async (req, res) => {
    const ipId = req.query.ipId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    if (!ipId || !startDate || !endDate) {
        res.status(400).send('ipId, startDate, and endDate query parameters are required.');
        return;
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const query = `
            SELECT AVG(latency) AS average_latency
            FROM ping_logs
            WHERE ip_id = ? AND fecha BETWEEN ? AND ?
        `;
        const rows = await connection.query(query, [ipId, startDate, endDate]);
        res.json(rows[0]);
    } catch (err) {
        res.status(500).send(err.toString());
    } finally {
        if (connection) connection.end();
    }
});

// API para contar los paquetes perdidos
app.get('/packetloss', async (req, res) => {
    const ipId = req.query.ipId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    if (!ipId || !startDate || !endDate) {
        res.status(400).send('ipId, startDate, and endDate query parameters are required.');
        return;
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const query = `
            SELECT COUNT(*) AS packet_loss
            FROM ping_logs
            WHERE ip_id = ? AND success = 0 AND fecha BETWEEN ? AND ?
        `;
        const rows = await connection.query(query, [ipId, startDate, endDate]);
        res.json({ packet_loss: Number(rows[0].packet_loss) });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.toString());
    } finally {
        if (connection) connection.end();
    }
});

// API para contar caidas de ping
app.get('/downtime', async (req, res) => {
    const ipId = req.query.ipId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    if (!ipId || !startDate || !endDate) {
        res.status(400).send('ipId, startDate, and endDate query parameters are required.');
        return;
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const query = `
            WITH DowntimePeriods AS (
                SELECT
                    id,
                    ip_id,
                    fecha,
                    success,
                    @rn := IF(@prev_ip_id = ip_id AND @prev_success = success, @rn, @rn + 1) AS rn,
                    @prev_ip_id := ip_id,
                    @prev_success := success
                FROM
                    ping_logs
                JOIN (SELECT @rn := 0, @prev_ip_id := NULL, @prev_success := NULL) AS vars
                WHERE
                    ip_id = ?
                    AND fecha BETWEEN ? AND ?
            ), DowntimeDetected AS (
                SELECT
                    MIN(fecha) AS downtime_start,
                    MAX(fecha) AS downtime_end,
                    TIMEDIFF(MAX(fecha), MIN(fecha)) AS downtime_duration,
                    rn
                FROM
                    DowntimePeriods
                WHERE
                    success = 0
                GROUP BY
                    rn
                HAVING
                    COUNT(*) >= 10
            ), UptimeDetected AS (
                SELECT
                    MIN(fecha) AS uptime_start,
                    MAX(fecha) AS uptime_end,
                    rn
                FROM
                    DowntimePeriods
                WHERE
                    success = 1
                GROUP BY
                    rn
                HAVING
                    COUNT(*) >= 10
            )
            SELECT
                D.downtime_start,
                D.downtime_end,
                D.downtime_duration,
                U.uptime_start
            FROM
                DowntimeDetected D
            JOIN
                UptimeDetected U ON D.rn < U.rn
            WHERE
                U.uptime_start = (
                    SELECT
                        MIN(uptime_start)
                    FROM
                        UptimeDetected
                    WHERE
                        rn > D.rn
                )
            ORDER BY
                D.downtime_start;
        `;
        const rows = await connection.query(query, [ipId, startDate, endDate]);
        res.json(rows);
    } catch (err) {
        res.status(500).send(err.toString());
    } finally {
        if (connection) connection.end();
    }
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

// Endpoint para obtener datos de latencia por IP y rango de fechas y horas
app.get('/api/latency-data', async (req, res, next) => {
    let { ip, fromDate, fromTime, toDate, toTime } = req.query;

    try {
        const conn = await pool.getConnection();

        let query = `
            SELECT fecha, latency
            FROM ping_logs
            WHERE 1=1
        `;
        const params = [];

        if (ip) {
            query += ` AND ip_id IN (SELECT id FROM ips WHERE ip = ?)`;
            params.push(ip);
        }

        if (fromDate && fromTime && toDate && toTime) {
            const fromDateTime = `${fromDate} ${fromTime}`;
            const toDateTime = `${toDate} ${toTime}`;
            query += ` AND fecha BETWEEN ? AND ?`;
            params.push(fromDateTime, toDateTime);
        }

        query += ` ORDER BY fecha`;

        const rows = await conn.query(query, params);
        conn.release();

        const latencyData = rows.map(row => ({
            timestamp: row.fecha,
            latency: row.latency
        }));

        res.json(latencyData);
    } catch (err) {
        next(err);
    }
});

// Endpoint para agregar IPs a la base de datos
app.post('/addips', async (req, res, next) => {
    try {
        const { name, ip, url, internet1, internet2 } = req.body;
        const conn = await pool.getConnection();

        // Verificar si el nombre ya existe en la base de datos
        const [nameResult] = await conn.query("SELECT COUNT(*) AS count FROM ips WHERE name = ?", [name]);
        console.log("Resultado de nameResult:", nameResult[0]);
        const nameCount = Number(nameResult.count);

        if (nameCount > 0) {
            conn.release();
            return res.status(400).json({ error: `El nombre '${name}' ya está registrado.` });
        }

        // Verificar si la IP ya existe en la base de datos
        const [ipResult] = await conn.query("SELECT COUNT(*) AS count FROM ips WHERE ip = ?", [ip]);
        console.log("Resultado de ipResult:", ipResult[0]);
        const ipCount = Number(ipResult.count);

        if (ipCount > 0) {
            conn.release();
            return res.status(400).json({ error: `La IP '${ip}' ya está registrada.` });
        }

        // Si el nombre y la IP no existen, insertar los datos en la base de datos
        const query = "INSERT INTO ips (name, ip, url, internet1, internet2) VALUES (?, ?, ?, ?, ?)";
        await conn.query(query, [name, ip, url || '', internet1 || '', internet2 || '']);
        conn.release();

        res.json({ message: 'IP agregada correctamente' });

        // Reiniciar los pings continuos
        clearAllPingIntervals(); // Limpiar todos los intervalos existentes
        iniciarPingsContinuos(); // Iniciar pings continuos con la lista actualizada de IPs
    } catch (err) {
        console.error("Error al procesar la solicitud:", err); // Registrar el error en la consola para depuración
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});

//Endpoint identificar sucursal caida y mandar a pagina Reporte.html
app.get('/process-ip', async (req, res) => {
    const ip = req.query.ip;

    if (!ip) {
        res.status(400).send('IP is required.');
        return;
    }

    try {
        const connection = await pool.getConnection();
        const query = 'SELECT * FROM ips WHERE ip = ?';
        const [rows] = await connection.query(query, [ip]);

        connection.release();

        if (rows.length === 0) {
            res.status(404).send('IP not found.');
            return;
        }

        const data = rows;

        // Redirige a prueba.html con los datos obtenidos como parámetros de consulta
        res.redirect(`/Reporte.html?data=${encodeURIComponent(JSON.stringify(data))}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error.');
    }
});

// Iniciar la carga de IPs al arrancar el servidor
loadIps();

// Iniciar los pings continuos al arrancar el servidor
iniciarPingsContinuos();

// Iniciar sesión de ping al arrancar el servidor
createPingSession();

// Ruta principal para servir monitor.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'monitor.html'));
});

// Ejecutar monitorIPs() cada 5 minutos
setInterval(() => {
    monitorIPs();
}, 1 * 60 * 1000); // 1 minutos

// Iniciar el servidor en el puerto especificado
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
