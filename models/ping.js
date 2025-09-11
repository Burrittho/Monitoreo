const { exec } = require('child_process');
const pool = require('../config/db'); // Tu pool de conexiones MySQL

// Función para obtener la lista de IPs desde la base de datos
async function obtenerIPs() {
    let conn;
    try {
        conn = await pool.getConnection();
        const [rows] = await conn.query('SELECT ip FROM ips');
        return rows.map(row => row.ip);
    } catch (err) {
        console.error("Error al obtener IPs:", err.message);
        return [];
    } finally {
        if (conn) conn.release();
    }
}

// Función para hacer ping a todas las IPs usando fping en WSL
async function hacerPingWSL(ips) {
    return new Promise((resolve, reject) => {
        if (!ips.length) return resolve([]);

        // Preparamos el comando WSL con fping (¡la magia está aquí!)
        const comando = `fping -c1 -t1500 ${ips.join(' ')}`;

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

// Función para insertar múltiples resultados de ping en una sola transacción
async function guardarPingsEnLote(resultados) {
    if (!resultados.length) return;
    
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();
        
        // Preparar mapeo de IPs a IDs para evitar múltiples SELECT
        const ips = [...new Set(resultados.map(r => r.ip))]; // IPs únicas
        const ipIds = {};
        
        if (ips.length > 0) {
            const placeholders = ips.map(() => '?').join(',');
            const [ipRows] = await conn.query(
                `SELECT id, ip FROM ips WHERE ip IN (${placeholders})`, 
                ips
            );
            
            ipRows.forEach(row => {
                ipIds[row.ip] = row.id;
            });
        }
        
        // Preparar batch insert
        const valores = [];
        const parametros = [];
        
        resultados.forEach(resultado => {
            const ipId = ipIds[resultado.ip];
            if (ipId) {
                valores.push('(?, ?, ?)');
                parametros.push(ipId, resultado.latency, resultado.alive ? 1 : 0);
            } else {
                console.warn(`IP ${resultado.ip} no encontrada en base de datos`);
            }
        });
        
        if (valores.length > 0) {
            const query = `INSERT INTO ping_logs (ip_id, latency, success) VALUES ${valores.join(', ')}`;
            await conn.query(query, parametros);
        }
        
        await conn.commit();
        
    } catch (err) {
        if (conn) {
            try {
                await conn.rollback();
            } catch (rollbackErr) {
                console.error("Error en rollback:", rollbackErr.message);
            }
        }
        console.error("Error al guardar pings en lote:", err.message);
        throw err;
    } finally {
        if (conn) {
            try {
                conn.release();
            } catch (releaseErr) {
                console.error("Error al liberar conexión:", releaseErr.message);
            }
        }
    }
}

// Función principal de monitoreo continuo
async function iniciarPingsContinuos() {
    console.log('Servicio de monitoreo iniciado.');
    
    // Iniciamos el intervalo de ping
    setInterval(async () => {
        try {
            // Obtenemos la lista actualizada de IPs en cada ciclo
            const ips = await obtenerIPs();
            
            if (ips.length > 0) {
                const resultados = await hacerPingWSL(ips);
                // Usar función de lote en lugar de Promise.all individual
                await guardarPingsEnLote(resultados);
            }
        } catch (err) {
            console.error("Error durante el ciclo de ping:", err.message);
        }
    }, 1000);
}

// Exporta la función principal
module.exports = {
    iniciarPingsContinuos
};
