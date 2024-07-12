const pool = require('../config/db'); // Importa el pool de conexiones desde db.js
const { sendMailWithRetry } = require('../models/mailretry');
const { calculateDuration } = require('../models/calculartiempo');

// Objeto para almacenar el estado previo de cada IP
let previousState = {};

// Objeto para almacenar las IPs que están caídas
let downIPs = {};

// Variable para el intervalo de monitoreo
let monitorInterval;

// Función para iniciar el monitoreo de IPs
async function startMonitoring() {
    while (true) {
        await monitorIPs();
        await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)); // Executes monitorIPs every 5 minutes
    }
}

// Función para detener el monitoreo de IPs
function stopMonitoring() {
    clearInterval(monitorInterval);
    console.log('Detiene el monitoreo de caidas');
}

// Función para reiniciar el monitoreo de IPs
function restartMonitoring() {
    stopMonitoring();
    startMonitoring();
    console.log('Reinicia el monitoreo de caidas');
}

// Función para monitorear las IPs y enviar correos en caso de inactividad
async function monitorIPs() {
    let connection;
    let sistemaup = 0;
    let sistemadown = 0;
    let sistemares = 0;

    try {
        connection = await pool.getConnection();

        // Obtener todas las IPs registradas
        const rows = await connection.query('SELECT id, ip, name FROM ips');
        const ips = rows.map(row => ({ id: row.id, ip: row.ip, name: row.name }));

        console.log('Inicia proceso de monitoreo de caídas');

        // Ejecutar consultas en paralelo para cada IP
        await Promise.all(ips.map(ipRecord => checkLogsForIP(ipRecord, connection)));

        // Imprimir los resultados al final del proceso
        console.log(`Sucursales con sistema: ${sistemaup}`);
        console.log(`Sucursales sin sistema: ${sistemadown}`);
        console.log(`Sucursales restablecidas: ${sistemares}`);

        // Mostrar los nombres de las IPs que están en estado de caída
        if (Object.keys(downIPs).length > 0) {
            const downIPNames = Object.values(downIPs).map(ipInfo => ipInfo.name);
            console.log('IPs en estado de caída:', downIPNames);
        } else {
            console.log('No hay IPs en estado de caída.');
        }

        // Aviso de termino de proceso de monitoreo
        console.log('Proceso de monitoreo finalizado');

    } catch (error) {
        console.error('Error en el monitoreo y envío de correos:', error);
    } finally {
        if (connection) connection.end();
    }

    // Función para verificar períodos de inactividad y restablecimientos para una IP
    async function checkLogsForIP(ipRecord, connection) {
        const { id: ipId, ip, name } = ipRecord;

        // Consulta para obtener los últimos 300 registros de logs para la IP actual
        const query = `
            SELECT success, fecha
            FROM ping_logs
            WHERE ip_id = ?
            ORDER BY fecha DESC
            LIMIT 300;
        `;
        const logs = await connection.query(query, [ipId]);
        const logsArray = logs.map(log => ({ success: !!log.success, fecha: log.fecha }));

        // Verificar si la consulta devolvió resultados
        if (!logs || logs.length === 0) {
            console.log(`No se encontraron logs para la IP ${ip}`);
            return;
        }

        let downtimeStart = null;

        // Recorrer los registros de logs para detectar 10 "success = 0" seguidos (caída)
        for (let i = 0; i <= logsArray.length - 10; i++) {
            const successLogs = logsArray.slice(i, i + 10).map(log => log.success);

            // Detectar inicio de caída
            if (successLogs.every(success => success === false)) {
                downtimeStart = logsArray[i + 9].fecha;
                if (!previousState[ipId] || !previousState[ipId].inDowntime) {
                    previousState[ipId] = { inDowntime: true, downtimeStart };
                    downIPs[ip] = { name, downtimeStart };
                    await sendMailWithRetry(`Notificacion: ${name} (${ip}) - Sin sistema`, `Inicio de caída de sistema: ${downtimeStart}`);
                    sistemadown++;
                    break;
                }
            }

            // Detectar restablecimiento
            if (previousState[ipId] && previousState[ipId].inDowntime && successLogs.every(success => success === true)) {
                const downtimeEnd = logsArray[i + 9].fecha;
                const downtimeDuration = calculateDuration(previousState[ipId].downtimeStart, downtimeEnd);
                await sendMailWithRetry(
                    `Notificacion: ${name} - Sistema Restablecido`,
                    `Inicio de caída de sistema: ${previousState[ipId].downtimeStart}\nTérmino de caída de sistema: ${downtimeEnd}\nTiempo sin sistema: ${downtimeDuration}`
                );
                previousState[ipId] = { inDowntime: false, downtimeStart: null };
                delete downIPs[ip];
                sistemares++;
                break;
            }
        }

        // Si no se detectó caída, se cuenta como "con sistema"
        if (!previousState[ipId] || !previousState[ipId].inDowntime) {
            sistemaup++;
        }
    }
}
module.exports = {
    startMonitoring,
    restartMonitoring
};