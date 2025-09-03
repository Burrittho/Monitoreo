const { exec } = require('child_process');
const pool = require('../config/db'); // Tu pool de conexiones MySQL

// Función para obtener la lista de IPs desde la base de datos
async function obtenerIPs() {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT ip FROM ips_server');
    conn.release();
    return rows.map(row => row.ip);
}

// Función para hacer ping a todas las IPs usando fping nativo de Ubuntu
async function hacerPingUbuntu(ips) {
    return new Promise((resolve, reject) => {
        if (!ips.length) return resolve([]);

        // Comando para Ubuntu nativo (SIN wsl)
        const comando = `wsl fping -c1 -t1500 ${ips.join(' ')} 2>&1`;

        exec(comando, (error, stdout, stderr) => {
            const output = stdout || stderr;
            const resultados = [];
            const lineas = output.trim().split('\n');
            
            lineas.forEach(linea => {
                // Parseo para Ubuntu - formato: "192.168.1.1 : [0], 84 bytes, 1.23 ms (1.23 avg, 0% loss)"
                const matchVivo = linea.match(/^([\d\.]+)\s+:\s+\[(\d+)\],.*?([\d\.]+)\s+ms\s+\(([\d\.]+)\s+avg/);
                if (matchVivo) {
                    const ip = matchVivo[1];
                    const avg = parseFloat(matchVivo[4]);
                    resultados.push({
                        ip,
                        alive: true,
                        latency: avg
                    });
                } else {
                    // Para IPs que no responden - formato: "192.168.1.123 : xmt/rcv/%loss = 1/0/100%"
                    const matchMuerto = linea.match(/^([\d\.]+)\s+:\s+.*?xmt\/rcv\/%loss\s+=\s+\d+\/\d+\/(\d+)%/);
                    if (matchMuerto) {
                        const ip = matchMuerto[1];
                        const loss = parseInt(matchMuerto[2]);
                        resultados.push({
                            ip,
                            alive: loss < 100,
                            latency: 0
                        });
                    } else {
                        // Formato alternativo para IPs muertas: "192.168.1.123 is unreachable"
                        const matchUnreachable = linea.match(/^([\d\.]+)\s+is\s+unreachable/);
                        if (matchUnreachable) {
                            const ip = matchUnreachable[1];
                            resultados.push({
                                ip,
                                alive: false,
                                latency: 0
                            });
                        }
                    }
                }
            });
            
            resolve(resultados);
        });
    });
}

// Función para insertar el resultado del ping en la base de datos
async function guardarPingEnBD(ip, latency, alive) {
    let conn;
    try {
        conn = await pool.getConnection();
        const [ipIdRow] = await conn.query("SELECT id FROM ips_server WHERE ip = ?", [ip]);
        if (!ipIdRow || ipIdRow.length === 0) {
        console.error(`[SERVER] No se encontró el id de la IP ${ip}`);
            return;
        }
        const ipId = ipIdRow[0].id;
        await conn.query(
            "INSERT INTO ping_logs_server (ip_id, latency, success) VALUES (?, ?, ?)",
            [ipId, latency, alive ? 1 : 0]
        );
    } catch (err) {
        console.error(`[SERVER] Error al guardar ping de ${ip}:`, err.message);
    } finally {
        if (conn) conn.release();
    }
}

// Función principal de monitoreo continuo
async function iniciarPings_serverContinuos() {
    console.log('Servicio de monitoreo_Server iniciado.');
    
    // Iniciamos el intervalo de ping
    setInterval(async () => {
        try {
            // Obtenemos la lista actualizada de IPs en cada ciclo
            const ips = await obtenerIPs();
            
            if (ips.length > 0) {
                const resultados = await hacerPingUbuntu(ips); // Cambiado de hacerPingWSL a hacerPingUbuntu
                await Promise.all(resultados.map(r =>
                    guardarPingEnBD(r.ip, r.latency, r.alive)
                ));
            }
        } catch (err) {
            console.error("[SERVER] Error durante el ciclo de ping:", err.message);
        }
    }, 1000);
}

// Exporta la función principal
module.exports = {
    iniciarPings_serverContinuos
};
