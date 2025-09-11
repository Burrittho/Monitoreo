const { exec } = require('child_process');
const pool = require('../config/db'); // Tu pool de conexiones MySQL

// Función para obtener la lista de IPs desde la base de datos
async function obtenerIPs() {
    let conn;
    try {
        conn = await pool.getConnection();
        const [rows] = await conn.query('SELECT ip FROM ips_dvr');
        return rows.map(row => row.ip);
    } catch (err) {
        console.error("[DVR] Error al obtener IPs:", err.message);
        return [];
    } finally {
        if (conn) conn.release();
    }
}

// Función para hacer ping a todas las IPs usando fping nativo de Ubuntu
async function hacerPingUbuntu(ips) {
    return new Promise((resolve, reject) => {
        if (!ips.length) return resolve([]);

        // Comando para Ubuntu nativo (SIN wsl)
        const comando = `fping -c1 -t1500 ${ips.join(' ')} 2>&1`;

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
                `SELECT id, ip FROM ips_dvr WHERE ip IN (${placeholders})`, 
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
                console.warn(`[DVR] IP ${resultado.ip} no encontrada en base de datos`);
            }
        });
        
        if (valores.length > 0) {
            const query = `INSERT INTO ping_logs_dvr (ip_id, latency, success) VALUES ${valores.join(', ')}`;
            await conn.query(query, parametros);
        }
        
        await conn.commit();
        
    } catch (err) {
        if (conn) {
            try {
                await conn.rollback();
            } catch (rollbackErr) {
                console.error("[DVR] Error en rollback:", rollbackErr.message);
            }
        }
        console.error("[DVR] Error al guardar pings en lote:", err.message);
        throw err;
    } finally {
        if (conn) {
            try {
                conn.release();
            } catch (releaseErr) {
                console.error("[DVR] Error al liberar conexión:", releaseErr.message);
            }
        }
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
                const resultados = await hacerPingUbuntu(ips);
                // Usar función de lote en lugar de Promise.all individual
                await guardarPingsEnLote(resultados);
            }
        } catch (err) {
            console.error("[DVR] Error durante el ciclo de ping:", err.message);
        }
    }, 1000);
}

// Exporta la función principal
module.exports = {
    iniciarPings_dvrContinuos
};
