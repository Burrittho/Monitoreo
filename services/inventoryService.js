const stateStore = require('./stateStore');

class InventoryService {
  constructor(pool) {
    this.pool = pool;
    this.inventory = [];
    this.lastRefreshAt = null;
    this.refreshError = null;
    this.refreshIntervalMs = (parseInt(process.env.INVENTORY_REFRESH_SECONDS, 10) || 60) * 1000;
    this.timer = null;
  }

  async loadInitial() {
    await this.refresh();
    if (this.inventory.length === 0) {
      console.warn('Inventario inicial vacío; monitoreo seguirá en espera hasta tener inventario válido.');
    }
  }

  async refresh() {
    let conn;
    try {
      conn = await this.pool.getConnection();
      const [rows] = await conn.query('SELECT id, ip, name FROM ips');
      this.inventory = rows;
      this.lastRefreshAt = Date.now();
      this.refreshError = null;

      rows.forEach((host) => stateStore.ensureHost(host.id, host));
      return rows;
    } catch (error) {
      this.refreshError = error.message;
      console.error('Error refrescando inventario desde DB, usando último inventario válido:', error.message);
      return this.inventory;
    } finally {
      if (conn) conn.release();
    }
  }

  startAutoRefresh() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.refresh().catch((err) => {
        console.error('Error inesperado en auto-refresh de inventario:', err.message);
      });
    }, this.refreshIntervalMs);
  }

  stopAutoRefresh() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getInventory() {
    return this.inventory;
  }

  getMeta() {
    return {
      count: this.inventory.length,
      lastRefreshAt: this.lastRefreshAt,
      refreshError: this.refreshError
    };
  }
}

module.exports = InventoryService;
