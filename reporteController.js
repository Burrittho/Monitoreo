const mariadb = require('mariadb');

const pool = mariadb.createPool({
    host: 'localhost',
    user: 'ping_user',
    password: 'password',
    database: 'ping_monitor',
    connectionLimit: 100
});

async function obtenerReporte(periodo) {
    try {
        const conn = await pool.getConnection();

        // Ejemplo de consulta para obtener datos de latencia según el período
        const query = `
            SELECT fecha, latency
            FROM ping_logs
            WHERE fecha >= DATE_SUB(NOW(), INTERVAL ? DAY)
            ORDER BY fecha
        `;

        // Ejecutar la consulta con el período como parámetro
        const rows = await conn.query(query, [periodo]);
        conn.release();

        // Mapear resultados para enviar como respuesta
        const reporte = rows.map(row => ({
            timestamp: row.fecha,
            latency: row.latency
        }));

        return reporte;
    } catch (error) {
        console.error('Error al obtener reporte de latencia:', error);
        throw error; // Propagar el error para manejarlo en el servidor Express
    }
}

module.exports = {
    obtenerReporte
};