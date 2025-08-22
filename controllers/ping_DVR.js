const { exec } = require('child_process');
const pool = require('../config/db'); // Tu pool de conexiones MySQL

// Función para obtener la lista de IPs desde la base de datos
async function obtenerIPs() {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT ip FROM ips_dvr');
    conn.release();
    return rows.map(row => row.ip);
}

// Función para hacer ping a todas las IPs usando fping en WSL
async function hacerPingWSL(ips) {
    return new Promise((resolve, reject) => {
        if (!ips.length) return resolve([]);

        // Preparamos el comando WSL con fping (¡la magia está aquí!)
        const comando = `wsl fping -c1 -t1500 ${ips.join(' ')}`;

        exec(comando, (error, stdout, stderr) => {
            const output = stderr || stdout;
            const resultados = [];
            const lineas = output.trim().split('\n');
            lineas.forEach(linea => {
                // Parseo compatible con la salida de fping -c1
                const match = linea.match(/^([\d\.]+)\s+:\s+xmt\/rcv\/%loss = (\d+)\/(\d+)\/(\d+)%.*min\/avg\/max = ([\d\.]+)\/([\d\.]+)\/([\d\.]+)/);
                if (match) {
                    const ip = match[1];
                    const enviados = parseInt(match[2]);
                    const recibidos = parseInt(match[3]);
                    const perdida = parseInt(match[4]);
                    const avg = parseFloat(match[6]);
                    resultados.push({
                        ip,
                        alive: recibidos > 0,
                        latency: avg
                    });
                } else {
                    // Si la IP no responde, también puede haber una línea tipo: "192.168.1.123 : xmt/rcv/%loss = 1/0/100%"
                    const noRespMatch = linea.match(/^([\d\.]+)\s+:\s+xmt\/rcv\/%loss = (\d+)\/(\d+)\/(\d+)%/);
                    if (noRespMatch) {
                        const ip = noRespMatch[1];
                        resultados.push({
                            ip,
                            alive: false,
                            latency: 0
                        });
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
        const [ipIdRow] = await conn.query("SELECT id FROM ips_dvr WHERE ip = ?", [ip]);
        if (!ipIdRow || ipIdRow.length === 0) {
            console.error(`No se encontró el id de la IP ${ip}`);
            return;
        }
        const ipId = ipIdRow[0].id;
        await conn.query(
            "INSERT INTO ping_logs_dvr (ip_id, latency, success) VALUES (?, ?, ?)",
            [ipId, latency, alive ? 1 : 0]
        );
    } catch (err) {
        console.error(`Error al guardar ping de ${ip}:`, err.message);
    } finally {
        if (conn) conn.release();
    }
}

// Función principal de monitoreo continuo
async function iniciarPings_dvrContinuos() {
    console.log('Servicio de monitoreo_DVR iniciado.');
    
    // Iniciamos el intervalo de ping
    setInterval(async () => {
        try {
            // Obtenemos la lista actualizada de IPs en cada ciclo
            const ips = await obtenerIPs();
            
            if (ips.length > 0) {
                const resultados = await hacerPingWSL(ips);
                await Promise.all(resultados.map(r =>
                    guardarPingEnBD(r.ip, r.latency, r.alive)
                ));
            }
        } catch (err) {
            console.error("Error durante el ciclo de ping:", err.message);
        }
    }, 1000);
}

// Exporta la función principal
module.exports = {
    iniciarPings_dvrContinuos
};
