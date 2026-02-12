const pool = require('../config/db');

const pingRepository = {
  async getPingHistory({ ipId, startDate, endDate, limit, offset = 0 }) {
    const [rows] = await pool.execute(
      `SELECT 
        fecha,
        latency,
        success,
        UNIX_TIMESTAMP(fecha) * 1000 AS timestamp
      FROM ping_logs
      WHERE ip_id = ?
        AND fecha BETWEEN ? AND ?
      ORDER BY fecha ASC
      LIMIT ? OFFSET ?`,
      [ipId, startDate, endDate, limit, offset]
    );

    return rows;
  },

  async countPingHistory({ ipId, startDate, endDate }) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM ping_logs
       WHERE ip_id = ?
         AND fecha BETWEEN ? AND ?`,
      [ipId, startDate, endDate]
    );

    return rows[0]?.total || 0;
  },

  async getMonitoredIps() {
    const [rows] = await pool.execute('SELECT id, name, ip FROM ips');
    return rows;
  },
};

module.exports = pingRepository;
