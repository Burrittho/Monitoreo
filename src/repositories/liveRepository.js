const pool = require('../../config/db');

async function getPaginatedLogs({ ipId, from, to, limit, offset }) {
  const conn = await pool.getConnection();
  try {
    const params = [from, to];
    let whereIp = '';
    if (ipId) {
      whereIp = ' AND pl.ip_id = ?';
      params.push(ipId);
    }

    const [rows] = await conn.query(
      `SELECT pl.id, pl.ip_id, i.name, i.ip, pl.latency, pl.success, pl.fecha
       FROM ping_logs pl
       INNER JOIN ips i ON i.id = pl.ip_id
       WHERE pl.fecha BETWEEN ? AND ? ${whereIp}
       ORDER BY pl.fecha DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const [countRows] = await conn.query(
      `SELECT COUNT(*) AS total
       FROM ping_logs pl
       WHERE pl.fecha BETWEEN ? AND ? ${whereIp}`,
      params,
    );

    return {
      items: rows,
      total: Number(countRows[0]?.total || 0),
      limit,
      offset,
    };
  } finally {
    conn.release();
  }
}

async function getDowntimeAggregates({ ipId, from, to }) {
  const conn = await pool.getConnection();
  try {
    const params = [from, to];
    let whereIp = '';
    if (ipId) {
      whereIp = ' AND pl.ip_id = ?';
      params.push(ipId);
    }

    const [rows] = await conn.query(
      `SELECT pl.ip_id, i.name, i.ip,
         SUM(CASE WHEN pl.success = 0 THEN 1 ELSE 0 END) AS failed_samples,
         COUNT(*) AS total_samples,
         ROUND((SUM(CASE WHEN pl.success = 0 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) AS failure_rate_pct
       FROM ping_logs pl
       INNER JOIN ips i ON i.id = pl.ip_id
       WHERE pl.fecha BETWEEN ? AND ? ${whereIp}
       GROUP BY pl.ip_id, i.name, i.ip
       ORDER BY failure_rate_pct DESC`,
      params,
    );

    return rows;
  } finally {
    conn.release();
  }
}

async function getSummary({ from, to }) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT pl.ip_id, i.name, i.ip,
          COUNT(*) AS total_samples,
          SUM(CASE WHEN pl.success = 1 THEN 1 ELSE 0 END) AS success_samples,
          SUM(CASE WHEN pl.success = 0 THEN 1 ELSE 0 END) AS failed_samples,
          ROUND(AVG(CASE WHEN pl.success = 1 THEN pl.latency END), 2) AS avg_latency,
          ROUND((SUM(CASE WHEN pl.success = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) AS uptime_pct
       FROM ping_logs pl
       INNER JOIN ips i ON i.id = pl.ip_id
       WHERE pl.fecha BETWEEN ? AND ?
       GROUP BY pl.ip_id, i.name, i.ip
       ORDER BY i.name ASC`,
      [from, to],
    );

    return rows;
  } finally {
    conn.release();
  }
}

module.exports = {
  getPaginatedLogs,
  getDowntimeAggregates,
  getSummary,
};
