require('dotenv').config();
const mysql = require('mysql2/promise');

// Configuración del pool de conexiones a la base de datos
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306, // Valor por defecto si no se proporciona
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 200 // Valor por defecto si no se proporciona
});

module.exports = pool;
