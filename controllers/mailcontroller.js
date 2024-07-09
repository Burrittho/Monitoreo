const { sendMail } = require('../utils/mailer');
const pool = require('../config/db'); // Importa el pool de conexiones desde db.js

// Función para monitorear las IPs y enviar correos en caso de inactividad
async function monitorIPs() {
    let connection;
    try {
        connection = await pool.getConnection();

        // Consulta para detectar períodos de inactividad
        const query = `
            WITH RECURSIVE downtime_periods AS (
                SELECT
                    id,
                    ip_id,
                    fecha AS start_time,
                    'SIN SISTEMA' AS downtime_type,
                    @downtime_id := IF(success = b'0' AND @prev_success = b'0', @downtime_id, @downtime_id + 1) AS downtime_id,
                    @prev_success := success AS success_state
                FROM
                    ping_logs,
                    (SELECT @prev_success := NULL, @downtime_id := 0) AS vars
                WHERE
                    fecha >= NOW() - INTERVAL 1 HOUR
                UNION ALL
                SELECT
                    p.id,
                    p.ip_id,
                    p.fecha AS start_time,
                    'CON SISTEMA' AS downtime_type,
                    @downtime_id := IF(success = b'1' AND @prev_success = b'1', @downtime_id, @downtime_id + 1) AS downtime_id,
                    @prev_success := success AS success_state
                FROM
                    ping_logs p
                JOIN
                    downtime_periods d ON p.id = d.id + 1 AND p.ip_id = d.ip_id
                WHERE
                    d.downtime_type = 'SIN SISTEMA'
                    AND p.success = b'1'
                    AND d.success_state = b'0'
                    AND p.fecha >= NOW() - INTERVAL 1 HOUR
            )
            SELECT
                ip_id,
                MIN(start_time) AS downtime_start,
                MAX(start_time) AS downtime_end,
                TIMEDIFF(MAX(start_time), MIN(start_time)) AS downtime_duration
            FROM
                downtime_periods
            WHERE
                downtime_type = 'SIN SISTEMA'
            GROUP BY
                downtime_id
            HAVING
                COUNT(*) >= 10;
        `;

        const rows = await connection.query(query);

        // Objeto para almacenar el estado previo de cada IP
        let previousState = {};

        // Procesar los resultados para detectar cambios y enviar correos
        rows.forEach(row => {
            const ipId = row.ip_id;
            const downtimeStart = row.downtime_start;
            const downtimeEnd = row.downtime_end;

            if (!previousState[ipId]) {
                previousState[ipId] = { inDowntime: false, downtimeStart: null };
            }

            if (downtimeStart && !previousState[ipId].inDowntime) {
                // Detectado nuevo período de inactividad
                sendMail(`Downtime detected for IP ${ipId}`, `Downtime started at ${downtimeStart}`);
                previousState[ipId].inDowntime = true;
                previousState[ipId].downtimeStart = downtimeStart;
            } else if (downtimeEnd && previousState[ipId].inDowntime) {
                // Detectado fin del período de inactividad
                sendMail(`Downtime ended for IP ${ipId}`, `Downtime ended at ${downtimeEnd}. Duration: ${row.downtime_duration}`);
                previousState[ipId].inDowntime = false;
                previousState[ipId].downtimeStart = null;
            }
        });

    } catch (error) {
        console.error('Error en el monitoreo y envío de correos:', error);
    } finally {
        if (connection) connection.end();
    }
}

module.exports = {
    monitorIPs
};
