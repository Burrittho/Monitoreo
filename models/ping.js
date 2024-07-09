const ping = require('net-ping');
const pool = require('../config/db');

let ipList = [];
let pingIntervals = [];// Definir una lista para almacenar los intervalos de ping
let session; // Variable para almacenar la sesión de ping

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

                   // console.log(`Ping realizado a ${row.ip}, Alive: ${result.alive}, Latency: ${latency}`);
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

module.exports = {
    iniciarPingsContinuos, hacerPing, loadIps, createPingSession, clearAllPingIntervals
};