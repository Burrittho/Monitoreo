require('dotenv').config();
const mysql = require('mysql2/promise');
const { recordDbQueryLatency } = require('../services/monitorMetrics');

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

const originalQuery = pool.query.bind(pool);
pool.query = async (...args) => {
    const startedAt = process.hrtime.bigint();
    try {
        return await originalQuery(...args);
    } finally {
        const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        recordDbQueryLatency(Number(latencyMs.toFixed(2)));
    }
};

const originalGetConnection = pool.getConnection.bind(pool);
pool.getConnection = async (...args) => {
    const connection = await originalGetConnection(...args);

    if (!connection.__monitoreoQueryWrapped) {
        const originalConnectionQuery = connection.query.bind(connection);
        connection.query = async (...queryArgs) => {
            const startedAt = process.hrtime.bigint();
            try {
                return await originalConnectionQuery(...queryArgs);
            } finally {
                const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
                recordDbQueryLatency(Number(latencyMs.toFixed(2)));
            }
        };

        connection.__monitoreoQueryWrapped = true;
    }

    return connection;
};

module.exports = pool;
