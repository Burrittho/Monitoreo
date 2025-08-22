const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // Configuración de conexión a la base de datos
const { iniciarPingsContinuos } = require('../models/ping'); // Utilidades para el monitoreo

// endpoint para obtener las IPs
router.get('/ips', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const query = 'SELECT * FROM ips ORDER BY name ASC';
        const result = await connection.query(query);
        
        // Extraer los datos correctos (MySQL devuelve [rows, metadata])
        const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
        
        res.json(rows || []);
    } catch (err) {
        console.error('Error en /ips:', err);
        res.status(500).json({ error: 'Error al obtener IPs' });
    } finally {
        if (connection) connection.release();
    }
});

// Endpoint para agregar una nueva IP
router.post('/addips', async (req, res) => {
    let conn;
    try {
        // Extraemos solo los campos necesarios del cuerpo de la solicitud
        const { name, ip, url, internet1, internet2 } = req.body;
        conn = await pool.getConnection();

        // Verificar si el nombre ya existe
        const [nameResult] = await conn.query("SELECT COUNT(*) AS count FROM ips WHERE name = ?", [name]);
        if (nameResult[0].count > 0) {
            return res.status(400).json({ error: `El nombre '${name}' ya está registrado.` });
        }

        // Verificar si la IP ya existe
        const [ipResult] = await conn.query("SELECT COUNT(*) AS count FROM ips WHERE ip = ?", [ip]);
        if (ipResult[0].count > 0) {
            return res.status(400).json({ error: `La IP '${ip}' ya está registrada.` });
        }

        // Insertar nueva IP
        const query = "INSERT INTO ips (name, ip, url, internet1, internet2) VALUES (?, ?, ?, ?, ?)";
        await conn.query(query, [name, ip, url || '', internet1 || '', internet2 || '']);

        // La IP se agregará al siguiente ciclo de ping automáticamente
        res.json({ message: 'IP agregada correctamente' });
        
        // No es necesario reiniciar el monitoreo ya que la función iniciarPingsContinuos
        // ahora consulta las IPs desde la base de datos en cada ciclo
    } catch (err) {
        console.error("Error al procesar la solicitud:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release(); // Liberar la conexión
    }
});

// Endpoint para eliminar una IP y sus registros asociados
router.delete('/deleteips/:id', async (req, res) => {
    const { id } = req.params;
    let connection;
    
    try {
        connection = await pool.getConnection();
        
        // 1. Primero verificamos si la IP existe
        const [ipResult] = await connection.query('SELECT ip FROM ips WHERE id = ?', [id]);
        if (ipResult.length === 0) {
            return res.status(404).json({ error: `La IP con ID '${id}' no existe.` });
        }

        const ipAddress = ipResult[0].ip;

        // 2. Eliminamos los registros de ping_logs en lotes pequeños
        while (true) {
            const [deleteLogsResult] = await connection.query(
                'DELETE FROM ping_logs WHERE ip_id = ? LIMIT 1000',
                [id]
            );
            
            if (deleteLogsResult.affectedRows === 0) {
                break; // No hay más registros para eliminar
            }
            
            // Pequeña pausa para permitir otras operaciones
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // 3. Finalmente eliminamos la IP
        const [deleteIpResult] = await connection.query('DELETE FROM ips WHERE id = ?', [id]);

        if (deleteIpResult.affectedRows > 0) {
            res.json({ 
                success: true, 
                message: `La IP ${ipAddress} y sus registros fueron eliminados correctamente.`
            });
        } else {
            res.status(404).json({ error: 'No se encontró la IP para eliminar.' });
        }
    } catch (error) {
        console.error('Error al eliminar la IP y registros:', error);
        res.status(500).json({ error: 'Error al eliminar la IP y sus registros.' });
    } finally {
        if (connection) connection.release();
    }
});
// Ruta para editar una IP (Editar)
router.put('/editarips/:id', async (req, res) => {
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
router.get('/consultaips/:id', async (req, res) => {
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

module.exports = router;
