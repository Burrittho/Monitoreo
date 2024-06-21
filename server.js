const raw = require('raw-socket');
const express = require('express');  // Importa el módulo Express para crear el servidor web.
const mariadb = require('mariadb');  // Importa el módulo MariaDB para conectar y operar con la base de datos MariaDB.


const app = express();               // Crea una instancia de la aplicación Express.
const port = 3000;                   // Define el puerto en el cual el servidor escuchará.

// Configuración del pool de conexiones a la base de datos
const pool = mariadb.createPool({
    host: 'localhost',               // Dirección del servidor de la base de datos.
    user: 'ping_user',               // Usuario para la conexión a la base de datos.
    password: 'password',            // Contraseña del usuario de la base de datos.
    database: 'ping_monitor',        // Nombre de la base de datos.
    connectionLimit: 100             // Límite de conexiones simultáneas.
});
        
let ipList = [];            // Arreglo para almacenar las IPs cargadas de la base de datos.
let pingIntervals = [];     // Arreglo para almacenar los intervalos de ping para cada IP.

// Función para cargar las IPs desde la base de datos
async function loadIps() {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT * FROM ips');
    ipList = rows;
    conn.release();
}

// Middleware para servir archivos estáticos y parsear JSON
app.use(express.static('public'));   // Sirve archivos estáticos desde la carpeta 'public'.
app.use(express.json());             // Middleware para parsear cuerpos de solicitudes JSON.

// Middleware de manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');  // Responde con un mensaje de error 500 en caso de error.
});


// Endpoint para obtener el reporte de latencia
app.get('/api/reporte', async (req, res, next) => {
    const { ip, periodo } = req.query;

    try {
        let fromDate;
        switch (periodo) {
            case '1dia':
                fromDate = obtenerFecha(-1); // Obtener fecha de hace 1 día
                break;
            case '3dias':
                fromDate = obtenerFecha(-3); // Obtener fecha de hace 3 días
                break;
            case '1semana':
                fromDate = obtenerFecha(-7); // Obtener fecha de hace 1 semana
                break;
            case '1mes':
                fromDate = obtenerFecha(-30); // Obtener fecha de hace 1 mes
                break;
            default:
                throw new Error('Periodo no válido');
        }

        const conn = await pool.getConnection();
        const query = `
            SELECT ips.name, ips.ip, 
                   AVG(ping_logs.latency) AS mediaLatencia, 
                   SUM(IF(ping_logs.success = 0, 1, 0)) AS vecesSinRespuesta, 
                   SUM(IF(ping_logs.success = 0, TIMESTAMPDIFF(MINUTE, ping_logs.fecha, NOW()), 0)) AS tiempoSinRespuesta
            FROM ips
            LEFT JOIN ping_logs ON ips.id = ping_logs.ip_id
            WHERE ips.ip = ? AND ping_logs.fecha >= ?
            GROUP BY ips.name, ips.ip
        `;
        const [rows] = await conn.query(query, [ip, fromDate]);
        conn.release();

        if (!Array.isArray(rows)) {
            throw new Error('No se encontraron datos para la IP especificada en el período seleccionado.');
        }

        res.json(rows); // Devuelve los datos como JSON al cliente
    } catch (error) {
        console.error('Error al obtener reporte de latencia:', error.message);
        next(error); // Pasar el error al siguiente middleware de manejo de errores
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
        res.json(rows);  // Devuelve los resultados del ping en formato JSON.
    } catch (err) {
        next(err);
    }
});

// Endpoint para obtener ips para tab monitor
app.get('/api/tablaips', async (req, res, next) => {
    try {
        const conn = await pool.getConnection();
        const rows = await conn.query(`
            SELECT ips.name, ips.ip, ips.url, ips.internet1, internet2
            FROM ips
            ORDER BY ips.name
        `);
        conn.release();
        res.json(rows);  // Devuelve las IPs en formato JSON.
    } catch (err) {
        next(err);
    }
});


// Endpoint para obtener detalles de una IP específica pruebaaa
app.get('/api/tablaips', async (req, res, next) => {
    const ipAddress = req.query.ip; // Obtener la IP del parámetro de consulta
    
    try {
        const conn = await pool.getConnection();
        const rows = await conn.query(`
            SELECT ips.name, ips.url, ips.internet1, ips.internet2
            FROM ips
            WHERE ips.ip = ?
        `, [ipAddress]);
        conn.release();
        
        if (rows.length > 0) {
            res.json(rows[0]); // Devolver el primer resultado encontrado en formato JSON
        } else {
            res.status(404).json({ error: 'IP not found' });
        }
    } catch (err) {
        next(err);
    }
});


// Endpoint para agregar ips a la base de datos utiliza formaddips
app.post('/ips', async (req, res, next) => {
    try {
        const conn = await pool.getConnection();
        const { name, ip, url, internet1, internet2 } = req.body;

        // Inserta los datos en la base de datos
        const result = await conn.query("INSERT INTO ips (name, ip, url, internet1, internet2) VALUES (?, ?, ?, ?, ?)", [name, ip, url, internet1, internet2]);
        await loadIps();  // Carga nuevamente las IPs para incluir la nueva.
        conn.release();

        res.json({ message: 'IP added successfully' });  // Responde con un mensaje de éxito.

        // Añadir la nueva IP al proceso de pings continuos
        const newIP = ip;
        const intervalId = setInterval(() => {
            hacerPing(newIP);  // Inicia un ping continuo cada segundo.
        }, 1000);
        pingIntervals.push({ ip: newIP, intervalId });

        console.log(`Ping continuo iniciado para la nueva IP: ${newIP}`);

    } catch (err) {
        next(err);
    }
});

// Endpoint para obtener datos de latencia por IP y rango de fechas y horas para grafico
app.get('/api/latency-data', async (req, res, next) => {
    let { ip, fromDate, fromTime, toDate, toTime } = req.query;

    try {
        const conn = await pool.getConnection();

        // Construir consulta SQL base
        let query = `
            SELECT fecha, latency
            FROM ping_logs
            WHERE 1=1
        `;
        const params = [];

        // Filtrar por IP si se proporciona
        if (ip) {
            query += ` AND ip_id IN (SELECT id FROM ips WHERE ip = ?)`;
            params.push(ip);
        }

        // Filtrar por rango de fecha y hora si se proporciona
        if (fromDate && fromTime && toDate && toTime) {
            const fromDateTime = `${fromDate} ${fromTime}`;
            const toDateTime = `${toDate} ${toTime}`;
            query += ` AND fecha BETWEEN ? AND ?`;
            params.push(fromDateTime, toDateTime);
        }

        query += ` ORDER BY fecha`;

        // Ejecutar consulta SQL
        const rows = await conn.query(query, params);
        conn.release();

        // Mapear resultados para enviar como respuesta
        const latencyData = rows.map(row => ({
            timestamp: row.fecha, // Utilizamos fecha como timestamp
            latency: row.latency
        }));

        res.json(latencyData);  // Devuelve los datos de latencia en formato JSON.
    } catch (err) {
        next(err);
    }
});

// Iniciar la carga de IPs al arrancar el servidor
loadIps(); 

// Inicia el servidor en el puerto especificado
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

// Función para crear un paquete ICMP de prueba
function createICMPPacket() {
    const buffer = Buffer.alloc(8);
    buffer.writeUInt8(8, 0); // Type
    buffer.writeUInt8(0, 1); // Code
    buffer.writeUInt16BE(0, 2); // Checksum
    buffer.writeUInt16BE(1, 4); // Identifier
    buffer.writeUInt16BE(1, 6); // Sequence number

    let sum = 0;
    for (let i = 0; i < buffer.length; i += 2) {
        sum += buffer.readUInt16BE(i);
    }
    sum = (sum >> 16) + (sum & 0xFFFF);
    sum += (sum >> 16);
    const checksum = ~sum & 0xFFFF;

    buffer.writeUInt16BE(checksum, 2);

    return buffer;
}

// Función para hacer ping a una IP
async function hacerPing(ip) {
    let socket;
    let pingSuccessful = false;
    let start;

    return new Promise((resolve, reject) => {
        socket = raw.createSocket({ protocol: raw.Protocol.ICMP });

        socket.on('message', (buffer, source) => {
            if (source === ip) {
                pingSuccessful = true;
                resolve(buffer);
            }
        });

        socket.on('error', (error) => {
            reject(error);
        });

        const packet = createICMPPacket();
        start = Date.now();

        socket.send(packet, 0, packet.length, ip, (error) => {
            if (error) {
                reject(error);
            }
        });

        setTimeout(() => {
            if (!pingSuccessful) {
                reject(new Error('Ping timeout'));
            }
        }, 5000);
    }).then((response) => {
        const end = Date.now();
        const latency = end - start;

        return { alive: pingSuccessful, time: latency };
    }).catch((error) => {
        return { alive: false, time: 0 };
    }).finally(() => {
        socket.close();
    });
}

// Función para iniciar pings continuos
async function iniciarPingsContinuos() {
    try {
        const conn = await pool.getConnection();
        try {
            const rows = await conn.query("SELECT ip FROM ips");
            rows.forEach(row => {
                setInterval(async () => {
                    try {
                        const result = await hacerPing(row.ip);
                        const latency = Number.isFinite(result.time) ? result.time : 0;

                        const conn = await pool.getConnection();
                        try {
                            await conn.query("INSERT INTO ping_logs (ip_id, latency, success) VALUES ((SELECT id FROM ips WHERE ip = ?), ?, ?)", [
                                row.ip,
                                latency,
                                result.alive ? 1 : 0
                            ]);
                        } finally {
                            conn.release();
                        }

                        console.log(`Ping realizado a ${row.ip}, Alive: ${result.alive}, Latency: ${latency}`);
                    } catch (err) {
                        console.error(`Error al hacer ping a ${row.ip}: ${err.message}`);
                    }
                }, 1000);
            });

            console.log('Pings continuos iniciados para todas las IPs registradas.');
        } finally {
            conn.release();
        }
    } catch (err) {
        console.error("Error al iniciar pings continuos:", err.message);
    }
}


// Iniciar los pings continuos al arrancar el servidor
iniciarPingsContinuos();