const pool = require('../../config/db');
const env = require('../config/env');
const liveStateStore = require('./liveStateStore');
const logger = require('../config/logger');

class DbHealthService {
  constructor() {
    this.connected = true;
    this.timer = null;
    this.currentRetryMs = env.dbHealthInitialRetryMs;
  }

  async checkOnce() {
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.query('SELECT 1 as ok');
      if (!this.connected) {
        logger.info('DB recovered');
      }
      this.connected = true;
      this.currentRetryMs = env.dbHealthInitialRetryMs;
      liveStateStore.setDbStatus({ degradedMode: false, message: 'DB online' });
      return true;
    } catch (error) {
      if (this.connected) {
        logger.warn('DB connection lost, entering degraded mode', { error: error.message });
      }
      this.connected = false;
      liveStateStore.setDbStatus({ degradedMode: true, message: `DB offline: ${error.message}` });
      return false;
    } finally {
      if (conn) conn.release();
    }
  }

  start() {
    const loop = async () => {
      const ok = await this.checkOnce();
      const delay = ok ? env.dbHealthInitialRetryMs : this.currentRetryMs;
      if (!ok) {
        this.currentRetryMs = Math.min(this.currentRetryMs * 2, env.dbHealthMaxRetryMs);
      }
      this.timer = setTimeout(loop, delay);
    };
    loop();
  }
}

module.exports = new DbHealthService();
