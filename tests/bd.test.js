const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/db'); // Tu pool de conexiones MySQL

async function testDatabaseConnection() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Conectado a la base de datos MySQL');

        // Opcionalmente puedes hacer una consulta simple para probar
        //const [rows] = await connection.query('SELECT 1 as test');
        //console.log('Consulta de prueba exitosa:', rows[0]);
        
    } catch (err) {
        console.error('Error al conectar a la base de datos MySQL:');
        console.error('Mensaje:', err.message);
        console.error('Código:', err.code);
        console.error('Error completo:', err);
    } finally {
        if (connection) {
            connection.release(); // Liberar la conexión al pool
            console.log('Conexión liberada correctamente');
            
        }
    }
}
// Ejecutar la función de prueba
testDatabaseConnection();
