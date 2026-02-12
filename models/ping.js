const { exec } = require('child_process');
const pool = require('../config/db'); // Tu pool de conexiones MySQL
const liveStateStore = require('../services/liveStateStore');

async function obtenerIPs() {
    let conn;
    try {
        conn = await pool.getConnection();
        const [rows] = await conn.query('SELECT id, ip, name FROM ips');
        inventoryCache = rows;
        lastInventoryAt = Date.now();

        rows.forEach((host) => stateStore.ensureHost(host.id, host));
        return rows;
    } catch (err) {
        console.error('Error obteniendo IPs desde DB, usando último inventario válido:', err.message);
        return inventoryCache;
    } finally {
        if (conn) conn.release();
    }
}

async function hacerPing(hosts) {
    return new Promise((resolve) => {
        if (!hosts.length) return resolve([]);

        const ips = hosts.map((h) => h.ip);
        const command = `fping -c1 -t1500 ${ips.join(' ')}`;

        exec(command, (error, stdout, stderr) => {
            const output = stderr || stdout;
            const resultados = [];
            const lines = output.trim().split('\n');
            const hostByIp = new Map(hosts.map((h) => [h.ip, h]));

            lines.forEach((line) => {
                const match = line.match(/^([\d\.]+)\s+:\s+xmt\/rcv\/%loss = (\d+)\/(\d+)\/(\d+)%.*min\/avg\/max = ([\d\.]+)\/([\d\.]+)\/([\d\.]+)/);
                if (match) {
                    const ip = match[1];
                    const received = parseInt(match[3], 10);
                    const avg = parseFloat(match[6]);
                    const host = hostByIp.get(ip);
                    resultados.push({ ip, ipId: host ? host.id : null, name: host ? host.name : null, alive: received > 0, latency: avg });
                } else {
                    const noRespMatch = line.match(/^([\d\.]+)\s+:\s+xmt\/rcv\/%loss = (\d+)\/(\d+)\/(\d+)%/);
                    if (noRespMatch) {
                        const ip = noRespMatch[1];
                        const host = hostByIp.get(ip);
                        resultados.push({ ip, ipId: host ? host.id : null, name: host ? host.name : null, alive: false, latency: 0 });
                    }
                }
            });

            resolve(resultados);
        });
    });
}

async function guardarPingsEnLote(resultados) {
    if (!resultados.length) return;

    const timestamp = Date.now();
    resultados.forEach((resultado) => {
        if (resultado.ipId) {
            stateStore.updateCheck({
                ipId: resultado.ipId,
                ip: resultado.ip,
                name: resultado.name,
                alive: resultado.alive,
                latency: resultado.latency,
                timestamp
            });
        }
    });

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const values = [];
        const params = [];

        resultados.forEach((resultado) => {
            if (resultado.ipId) {
                values.push('(?, ?, ?)');
                params.push(resultado.ipId, resultado.latency, resultado.alive ? 1 : 0);
            }
        });

        if (values.length > 0) {
            const query = `INSERT INTO ping_logs (ip_id, latency, success) VALUES ${values.join(', ')}`;
            await conn.query(query, params);
        }

        await conn.commit();
    } catch (err) {
        if (conn) {
            try {
                await conn.rollback();
            } catch (rollbackErr) {
                console.error('Error en rollback:', rollbackErr.message);
            }
        }
        console.error('Error al guardar pings en lote:', err.message);
    } finally {
        if (conn) {
            try {
                conn.release();
            } catch (releaseErr) {
                console.error('Error al liberar conexión:', releaseErr.message);
            }
        }
    }
}

async function iniciarPingsContinuos() {
    console.log('Servicio de monitoreo iniciado.');

    setInterval(async () => {
        try {
            // Obtenemos la lista actualizada de IPs en cada ciclo
            const ips = await obtenerIPs();
            
            if (ips.length > 0) {
                const resultados = await hacerPing(ips);
                liveStateStore.updateCycle('branches', resultados, new Date());
                // Usar función de lote en lugar de Promise.all individual
                await guardarPingsEnLote(resultados);
            }
        } catch (err) {
            console.error('Error durante el ciclo de ping:', err.message);
        }
    }, 1000);
}

function getInventoryCacheMeta() {
    return {
        count: inventoryCache.length,
        lastInventoryAt
    };
}

module.exports = {
    iniciarPingsContinuos,
    getInventoryCacheMeta
};
