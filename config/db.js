require('dotenv').config();
const mariadb = require('mariadb');

// Configuración del pool de conexiones a la base de datos
const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306, // Valor por defecto si no se proporciona
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10 // Valor por defecto si no se proporciona
});

module.exports = pool;
