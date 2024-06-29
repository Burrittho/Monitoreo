require('dotenv').config();
const express = require('express');
const mariadb = require('mariadb');
const ping = require('net-ping');

const app = express();
const port = 3000;

// Configuración del pool de conexiones a la base de datos
const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306, // Valor por defecto si no se proporciona
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10 // Valor por defecto si no se proporciona
});

let ipList = [];
let pingIntervals = [];// Definir una lista para almacenar los intervalos de ping
let session; // Variable para almacenar la sesión de ping

// Función para limpiar todos los intervalos de ping
function clearAllPingIntervals() {
    pingIntervals.forEach(({ intervalId }) => clearInterval(intervalId));
    pingIntervals = [];
}

// Función para cargar las IPs desde la base de datos
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
    res.status(500).send('Error general -Puede ser cualquier cosa- Usa chatgpt');
});

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

// Endpoint para agregar IPs a la base de datos
app.post('/ips', async (req, res, next) => {
    try {
        const conn = await pool.getConnection();
        const { name, ip, url, internet1, internet2 } = req.body;

        // Insertar los datos en la base de datos
        const result = await conn.query("INSERT INTO ips (name, ip, url, internet1, internet2) VALUES (?, ?, ?, ?, ?)", [name, ip, url || '', internet1 || '', internet2 || '']);
        await loadIps();  // Cargar nuevamente las IPs para incluir la nueva.
        conn.release();

        res.json({ message: 'IP added successfully' });

       // Reiniciar los pings continuos
       clearAllPingIntervals(); // Limpiar todos los intervalos existentes
       iniciarPingsContinuos(); // Iniciar pings continuos con la lista actualizada de IPs

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

// Iniciar la carga de IPs al arrancar el servidor
loadIps();

// Iniciar sesión de ping con opciones personalizadas
const pingOptions = {
    networkProtocol: ping.NetworkProtocol.IPv4,
    packetSize: 64,
    retries: 3,
    timeout: 3000,
    ttl: 64
};

// Función para crear y mantener la sesión de ping
function createPingSession() {
    try {
        session = ping.createSession(pingOptions);

        session.on('error', (error) => {
            if (error && error.message) {
                console.error('Error en la sesión de ping:', error.message);
            } else {
                console.error('Error en la sesión de ping:', error || 'Error desconocido');
            }
            
            // Lógica adicional para reiniciar la sesión
            console.log('Reiniciando la sesión de ping...');
            session.close(); // Cerrar la sesión existente
            createPingSession(); // Crear una nueva sesión de ping
        });

        console.log('Sesión de ping creada exitosamente.');
    } catch (error) {
        console.error('Error al crear la sesión de ping:', error.message || error); 
        
    }
}

// Función para hacer ping a una IP utilizando la sesión de ping
async function hacerPing(ip) {
    try {
    if (!session) {
        createPingSession(); // Aseguramos que haya una sesión de ping creada
    }

    let start = Date.now();

    return new Promise((resolve, reject) => {
        session.pingHost(ip, (error, target, sent, rcvd) => {
            let latency = rcvd - sent;
            if (error) {
                if (error instanceof ping.RequestTimedOutError) {
                    resolve({ alive: false, time: 0 });
                } else {
                    reject(error);
                }
            } else {
                resolve({ alive: true, time: latency });
            }
        });
    });
} catch (error) {
    console.error(`Error al hacer ping a ${ip}:`, error.message || error);
    throw error; // Propaga el error para que pueda ser capturado y manejado fuera de esta función si es necesario.
}
}

// Función para iniciar pings continuos para todas las IPs registradas
async function iniciarPingsContinuos() {
    try {
        const conn = await pool.getConnection();
        const rows = await conn.query("SELECT ip FROM ips");
        conn.release();

        rows.forEach(row => {
            const intervalId = setInterval(async () => {
                try {
                    const result = await hacerPing(row.ip);
                    const latency = Number.isFinite(result.time) ? result.time : 0;

                    const conn = await pool.getConnection();
                    await conn.query("INSERT INTO ping_logs (ip_id, latency, success) VALUES ((SELECT id FROM ips WHERE ip = ?), ?, ?)", [
                        row.ip,
                        latency,
                        result.alive ? 1 : 0
                    ]);
                    conn.release();

                    console.log(`Ping realizado a ${row.ip}, Alive: ${result.alive}, Latency: ${latency}`);
                } catch (err) {
                    console.error(`Error al hacer ping a ${row.ip}: ${err.message}`);
                }
            }, 1000);
            pingIntervals.push({ ip: row.ip, intervalId });
        });

        console.log('Pings continuos iniciados para todas las IPs registradas.');
    } catch (err) {
        console.error("Error al iniciar pings continuos:", err.message);
    }
}

// Iniciar los pings continuos al arrancar el servidor
iniciarPingsContinuos();

// Iniciar sesión de ping al arrancar el servidor
createPingSession();

// Iniciar el servidor en el puerto especificado
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

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
        res.redirect(`/prueba.html?data=${encodeURIComponent(JSON.stringify(data))}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error.');
    }
});
