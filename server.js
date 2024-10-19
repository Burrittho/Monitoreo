require('dotenv').config();
const express = require('express');
const pool = require('./config/db'); // Importamos el pool de conexiones desde db.js
const routes = require('./routes/routes');
const path = require('path');
const { startMonitoring, restartMonitoring, stopMonitoring } = require('./controllers/mailcontroller');
const {iniciarPingsContinuos, createPingSession, clearAllPingIntervals} = require('./models/ping');

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

// Middleware para validar parámetros de consulta
function validateQueryParams(req, res, next) {
    const { ipId, startDate, endDate } = req.query;
    if (!ipId || !startDate || !endDate) {
        res.status(400).send('ipId, startDate, and endDate query parameters are required.');
        return;
    }
    next();
}

// Middleware para servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Usamos las rutas definidas en routes.js
app.use('/', routes);

// Endpoint para agregar IPs a la base de datos (Agregar)
app.post('/addips', async (req, res, next) => {
    let conn;
    try {
        const { name, ip, url, internet1, internet2 } = req.body;
        conn = await pool.getConnection(); // Obtener conexión

        // Verificar si el nombre ya existe en la base de datos
        const [nameResult] = await conn.query("SELECT COUNT(*) AS count FROM ips WHERE name = ?", [name]);
        const nameCount = nameResult[0].count; // Acceder correctamente al resultado

        if (nameCount > 0) {
            return res.status(400).json({ error: `El nombre '${name}' ya está registrado.` });
        }

        // Verificar si la IP ya existe en la base de datos
        const [ipResult] = await conn.query("SELECT COUNT(*) AS count FROM ips WHERE ip = ?", [ip]);
        const ipCount = ipResult[0].count; // Acceder correctamente al resultado

        if (ipCount > 0) {
            return res.status(400).json({ error: `La IP '${ip}' ya está registrada.` });
        }

        // Si el nombre y la IP no existen, insertar los datos en la base de datos
        const query = "INSERT INTO ips (name, ip, url, internet1, internet2) VALUES (?, ?, ?, ?, ?)";
        await conn.query(query, [name, ip, url || '', internet1 || '', internet2 || '']);

        res.json({ message: 'IP agregada correctamente' });

        // Reiniciar el monitoreo y los pings
        //restartMonitoring();
        clearAllPingIntervals();
        iniciarPingsContinuos();
    } catch (err) {
        console.error("Error al procesar la solicitud:", err); 
        return res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release(); // Liberar la conexión
    }
});


// Endpoint para eliminar una IP y sus registros en ping_logs (Eliminar)
app.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;

    let connection;
    try {
        // Detener monitoreo y limpiar pings
        stopMonitoring();
        clearAllPingIntervals();

        // Obtener una conexión del pool
        connection = await pool.getConnection();

        // Iniciar una transacción
        await connection.beginTransaction();

        // Verificar si la IP existe
        const [ipResult] = await connection.query('SELECT COUNT(*) AS count FROM ips WHERE id = ?', [id]);
        if (ipResult[0].count === 0) {
            await connection.rollback(); // Si la IP no existe, hacer rollback
            return res.status(404).json({ error: `La IP con ID '${id}' no existe.` });
        }

        // Eliminar los registros asociados en ping_logs
        const [deleteLogsResult] = await connection.query('DELETE FROM ping_logs WHERE ip_id = ?', [id]);

        // Eliminar la IP de la tabla principal
        const [deleteIpResult] = await connection.query('DELETE FROM ips WHERE id = ?', [id]);

        // Confirmar la transacción solo si algo fue eliminado
        if (deleteIpResult.affectedRows > 0) {
            await connection.commit();
            res.json({ success: true, message: `La IP: '${id}' y sus registros fueron eliminados correctamente.` });
        } else {
            // Si no se elimina ningún registro (esto en teoría no debería ocurrir debido a la verificación previa)
            await connection.rollback();
            return res.status(404).json({ error: 'No se encontró la IP para eliminar.' });
        }

    } catch (error) {
        // Si ocurre un error, hacer rollback
        if (connection) await connection.rollback();
        console.error('Error al eliminar la IP y registros:', error);
        res.status(500).json({ error: 'Error al eliminar la IP y sus registros.' });
    } finally {
        if (connection) connection.release(); // Liberar la conexión de vuelta al pool
        // Reiniciar el monitoreo y pings continuos después de liberar la conexión
        //restartMonitoring();
        iniciarPingsContinuos();
    }
});

// Ruta para editar una IP (Editar)
app.put('/editar/:id', async (req, res) => {
    const ipId = req.params.id; // Obtener el ID de la IP desde los parámetros de la URL
    const { nombre, internet1, internet2, url } = req.body; // Desestructurar los datos del cuerpo de la solicitud

    // Validar que los campos no estén vacíos
    if (!nombre || !url || !internet1 || !internet2) {
        return res.status(400).json({ error: 'Todos los campos son requeridos.' });
    }

    let conn;
    try {
        conn = await pool.getConnection(); // Obtener la conexión del pool

        // Actualizar la IP en la base de datos
        const query = `
            UPDATE ips
            SET name = ?, url = ?, internet1 = ?, internet2 = ?
            WHERE id = ?
        `;

        // Ejecutar la consulta para actualizar los datos en la base de datos
        const result = await conn.query(query, [nombre, url, internet1, internet2, ipId]);

        // Verificar si realmente se actualizó alguna fila
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'No se encontró ninguna IP con el ID proporcionado.' });
        }

        // Responder con éxito si todo salió bien
        res.json({ success: true, message: 'IP actualizada correctamente.' });
    } catch (error) {
        console.error('Error al actualizar la IP:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    } finally {
        if (conn) conn.release(); // Liberar la conexión
    }
});


// API para obtener los datos de una IP específica por su ID (Lista IPS Editar, eliminar)
app.get('/consulta/:id', async (req, res) => {
    let connection;
    const ipId = req.params.id;  // Obtiene el ID de la IP desde la URL
    try {
        connection = await pool.getConnection();
        const query = 'SELECT * FROM ips WHERE id = ?';  // Consulta SQL para obtener la IP por ID
        const rows = await connection.query(query, [ipId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'IP no encontrada' });  // Si no se encuentra la IP, devuelve 404
        }

        res.json(rows[0]);  // Devuelve los datos de la IP en formato JSON
    } catch (err) {
        res.status(500).json({ error: err.toString() });  // Manejo de errores
    } finally {
        if (connection) connection.release();
    }
});

// endpoint para obtener las IPs
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
        if (connection) connection.release();
    }
});

// endpoint para obtener los logs de ping y calcular la latencia media (Reporte)
app.get('/latency', async (req, res) => {
    const { ipId, startDate, endDate } = req.query;

    if (!ipId || !startDate || !endDate) {
        return res.status(400).send('ipId, startDate, and endDate query parameters are required.');
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const query = `
            SELECT AVG(latency) AS average_latency
            FROM ping_logs
            WHERE ip_id = ? AND fecha BETWEEN ? AND ?
        `;
        const [rows] = await connection.query(query, [ipId, startDate, endDate]); // Desestructurar
        res.json(rows[0]); // Enviar solo la primera fila
    } catch (err) {
        res.status(500).send(err.toString());
    } finally {
        if (connection) connection.release(); // Corregido
    }
});

// endpoint para contar los paquetes perdidos (Reporte)
app.get('/packetloss', async (req, res) => {
    const { ipId, startDate, endDate } = req.query;

    if (!ipId || !startDate || !endDate) {
        return res.status(400).send('ipId, startDate, and endDate query parameters are required.');
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const query = `
            SELECT COUNT(*) AS packet_loss
            FROM ping_logs
            WHERE ip_id = ? AND success = 0 AND fecha BETWEEN ? AND ?
        `;
        const [rows] = await connection.query(query, [ipId, startDate, endDate]);
        res.json({ packet_loss: Number(rows[0].packet_loss) });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.toString());
    } finally {
        if (connection) connection.release(); // Corregido
    }
});

// endpoint para contar caidas de ping (Reporte)
app.get('/downtime', async (req, res) => {
    const { ipId, startDate, endDate } = req.query;

    if (!ipId || !startDate || !endDate) {
        return res.status(400).send('ipId, startDate, and endDate query parameters are required.');
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
        const [rows] = await connection.query(query, [ipId, startDate, endDate]);
        res.json(rows);
    } catch (err) {
        res.status(500).send(err.toString());
    } finally {
        if (connection) connection.release(); // Corregido
    }
});

// Endpoint para obtener los resultados del ping (Monitor)
app.get('/api/ping-results', async (req, res, next) => {
    try {
        const conn = await pool.getConnection();
        const rows = await conn.query(
            `SELECT name, ip, url, ping_logs.latency, ping_logs.success
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

//Endpoint identificar sucursal caida y mandar a pagina Reporte.html
app.get('/process-ip', async (req, res) => {
    const { ip } = req.query;

    if (!ip) {
        return res.status(400).send('IP is required.');
    }

    try {
        const connection = await pool.getConnection();
        const query = 'SELECT * FROM ips WHERE ip = ?';
        const [rows] = await connection.query(query, [ip]);
        connection.release();

        if (rows.length === 0) {
            return res.status(404).send('IP not found.');
        }

        // Redirige a Reporte.html con los datos obtenidos como parámetros de consulta
        res.redirect(`/Reporte.html?data=${encodeURIComponent(JSON.stringify(rows))}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error.');
    }
});


/**
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
*/

// Iniciar los pings continuos al arrancar el servidor
iniciarPingsContinuos();

// Ejecutar monitorIPs activar cuando se empiezan pruebas de correos
//startMonitoring();

// Ruta principal para servir monitor.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'monitor.html'));
});

// Iniciar el servidor en el puerto especificado
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
