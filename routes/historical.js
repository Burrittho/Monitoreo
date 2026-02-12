const express = require('express');
const router = express.Router();
const pool = require('../config/db');

function parsePagination(req, defaultLimit = 100, maxLimit = 500) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const requestedLimit = parseInt(req.query.limit, 10) || defaultLimit;
  const limit = Math.max(1, Math.min(maxLimit, requestedLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

router.get('/logs', async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req, 100, 500);

  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(
      `SELECT pl.id, ips.ip, ips.name, pl.success, pl.latency, pl.fecha
       FROM ping_logs pl
       INNER JOIN ips ON ips.id = pl.ip_id
       ORDER BY pl.fecha DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    conn.release();

    res.json({ page, limit, data: rows });
  } catch (error) {
    next(error);
  }
});

router.get('/downtime', async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req, 50, 200);

  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(
      `SELECT hsl.id, ips.ip, ips.name, hsl.state, hsl.changed_at,
              TIMESTAMPDIFF(SECOND, hsl.changed_at, NOW()) AS down_seconds
       FROM host_state_log hsl
       INNER JOIN ips ON ips.id = hsl.ip_id
       WHERE hsl.state IN ('OFFLINE','DOWN')
       ORDER BY hsl.changed_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    conn.release();

    res.json({ page, limit, data: rows });
  } catch (error) {
    next(error);
  }
});

router.get('/summary', async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req, 20, 100);

  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(
      `SELECT ips.id, ips.ip, ips.name,
              COALESCE(latest.success, 0) AS success,
              COALESCE(latest.latency, 0) AS latency,
              latest.fecha AS last_ping
       FROM ips
       LEFT JOIN (
          SELECT p1.ip_id, p1.success, p1.latency, p1.fecha
          FROM ping_logs p1
          INNER JOIN (
              SELECT ip_id, MAX(id) max_id
              FROM ping_logs
              GROUP BY ip_id
          ) p2 ON p1.id = p2.max_id
       ) latest ON latest.ip_id = ips.id
       ORDER BY ips.name ASC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    conn.release();

    res.json({ page, limit, data: rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
