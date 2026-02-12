const pool = require('../config/db');

const internetRepository = {
  async getLatestInternetByIp(ipId) {
    const [rows] = await pool.execute(
      `SELECT 
        ci.proveedor1 as proveedor_primario,
        ci.interfaz1 as puerto_primario,
        ci.tipo1 as configuracion_primario,
        ci.ip1 as ip_primario,
        ci.trazado1 as estado_primario,
        ci.proveedor2 as proveedor_secundario,
        ci.interfaz2 as puerto_secundario,
        ci.tipo2 as configuracion_secundario,
        ci.ip2 as ip_secundario,
        ci.trazado2 as estado_secundario,
        ci.fecha as ultima_revision
      FROM check_internet ci
      WHERE ci.ip_id = ?
      ORDER BY ci.fecha DESC
      LIMIT 1`,
      [ipId]
    );

    return rows[0] || null;
  },

  async getInternetHistory({ ipId, limit, offset }) {
    const [rows] = await pool.execute(
      `SELECT 
        ci.proveedor1 as proveedor_primario,
        ci.interfaz1 as puerto_primario,
        ci.tipo1 as configuracion_primario,
        ci.ip1 as ip_primario,
        ci.trazado1 as estado_primario,
        ci.proveedor2 as proveedor_secundario,
        ci.interfaz2 as puerto_secundario,
        ci.tipo2 as configuracion_secundario,
        ci.ip2 as ip_secundario,
        ci.trazado2 as estado_secundario,
        ci.fecha as fecha_revision
      FROM check_internet ci
      WHERE ci.ip_id = ?
      ORDER BY ci.fecha DESC
      LIMIT ? OFFSET ?`,
      [ipId, limit, offset]
    );

    return rows;
  },

  async countInternetHistory(ipId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM check_internet WHERE ip_id = ?',
      [ipId]
    );

    return rows[0]?.total || 0;
  },
};

module.exports = internetRepository;
