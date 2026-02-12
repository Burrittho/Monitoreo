const { exec } = require('child_process');
const pool = require('../config/db');
const logger = require('../utils/logger').child({ component: 'monitor_ping' });
const { recordMonitorCycle } = require('../services/monitorMetrics');

async function obtenerIPs() {
    let conn;
    try {
        conn = await pool.getConnection();
        const [rows] = await conn.query('SELECT ip FROM ips');
        return rows.map((row) => row.ip);
    } catch (err) {
        logger.error({ error: err }, 'Error al obtener IPs');
        return [];
    } finally {
        if (conn) conn.release();
    }
}

async function hacerPing(ips) {
    return new Promise((resolve) => {
        if (!ips.length) return resolve([]);

        const comando = `fping -c1 -t1500 ${ips.join(' ')}`;

        exec(comando, (error, stdout, stderr) => {
            const output = stderr || stdout;
            const resultados = [];
            const lineas = output.trim().split('\n');
            lineas.forEach((linea) => {
                const match = linea.match(/^([\d\.]+)\s+:\s+xmt\/rcv\/%loss = (\d+)\/(\d+)\/(\d+)%.*min\/avg\/max = ([\d\.]+)\/([\d\.]+)\/([\d\.]+)/);
                if (match) {
                    const ip = match[1];
                    const recibidos = parseInt(match[3]);
                    const avg = parseFloat(match[6]);
                    resultados.push({ ip, alive: recibidos > 0, latency: avg });
                } else {
                    const noRespMatch = linea.match(/^([\d\.]+)\s+:\s+xmt\/rcv\/%loss = (\d+)\/(\d+)\/(\d+)%/);
                    if (noRespMatch) {
                        const ip = noRespMatch[1];
                        resultados.push({ ip, alive: false, latency: 0 });
                    }
                }
            });

            if (error) {
                logger.warn({ error: { message: error.message } }, 'fping finalizó con advertencia');
            }

            resolve(resultados);
        });
    });
}

async function guardarPingsEnLote(resultados) {
    if (!resultados.length) return;

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const ips = [...new Set(resultados.map((r) => r.ip))];
        const ipIds = {};

        if (ips.length > 0) {
            const placeholders = ips.map(() => '?').join(',');
            const [ipRows] = await conn.query(`SELECT id, ip FROM ips WHERE ip IN (${placeholders})`, ips);

            ipRows.forEach((row) => {
                ipIds[row.ip] = row.id;
            });
        }

        const valores = [];
        const parametros = [];

        resultados.forEach((resultado) => {
            const ipId = ipIds[resultado.ip];
            if (ipId) {
                valores.push('(?, ?, ?)');
                parametros.push(ipId, resultado.latency, resultado.alive ? 1 : 0);
            } else {
                logger.warn({ ip: resultado.ip }, 'IP no encontrada en base de datos');
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
                logger.error({ error: rollbackErr }, 'Error en rollback');
            }
        }
        logger.error({ error: err }, 'Error al guardar pings en lote');
        throw err;
    } finally {
        if (conn) {
            try {
                conn.release();
            } catch (releaseErr) {
                logger.error({ error: releaseErr }, 'Error al liberar conexión');
            }
        }
    }
}

async function iniciarPingsContinuos() {
    logger.info({ intervalMs: 1000 }, 'Servicio de monitoreo iniciado');

    setInterval(async () => {
        const startedAt = process.hrtime.bigint();
        try {
            const ips = await obtenerIPs();
            let resultados = [];

            if (ips.length > 0) {
                resultados = await hacerPing(ips);
                await guardarPingsEnLote(resultados);
            }

            const pingFailures = resultados.filter((resultado) => !resultado.alive).length;
            const durationMs = Number((Number(process.hrtime.bigint() - startedAt) / 1e6).toFixed(2));
            recordMonitorCycle({
                source: 'ips',
                hostsEvaluated: ips.length,
                pingFailures,
                durationMs
            });
        } catch (err) {
            logger.error({ error: err }, 'Error durante el ciclo de ping');
        }
    }, 1000);
}

module.exports = {
    iniciarPingsContinuos
};
