class DbHealthService {
  constructor(pool, options = {}) {
    this.pool = pool;
    this.isHealthy = true;
    this.lastCheckAt = null;
    this.lastHealthyAt = null;
    this.lastError = null;
    this.timer = null;

    const defaultSchedule = [10000, 30000, 60000];
    this.retryScheduleMs = options.retryScheduleMs || (process.env.DB_HEALTH_RETRY_SCHEDULE_MS
      ? process.env.DB_HEALTH_RETRY_SCHEDULE_MS.split(',').map(v => parseInt(v.trim(), 10)).filter(Boolean)
      : defaultSchedule);
    this.maxRetryMs = parseInt(process.env.DB_HEALTH_RETRY_MAX_MS, 10) || Math.max(...this.retryScheduleMs);
    this.nextRetryMs = this.retryScheduleMs[0] || 10000;
  }

  async probe() {
    let conn;
    try {
      conn = await this.pool.getConnection();
      await conn.query('SELECT 1');
      this.isHealthy = true;
      this.lastCheckAt = Date.now();
      this.lastHealthyAt = this.lastCheckAt;
      this.lastError = null;
      this.nextRetryMs = this.retryScheduleMs[0] || 10000;
    } catch (error) {
      this.isHealthy = false;
      this.lastCheckAt = Date.now();
      this.lastError = error.message;
      this.nextRetryMs = this.computeNextRetry(this.nextRetryMs);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  }

  computeNextRetry(current) {
    const currentIndex = this.retryScheduleMs.findIndex(v => v === current);
    if (currentIndex >= 0 && currentIndex < this.retryScheduleMs.length - 1) {
      return Math.min(this.retryScheduleMs[currentIndex + 1], this.maxRetryMs);
    }
    return this.maxRetryMs;
  }

  start() {
    const loop = async () => {
      try {
        await this.probe();
      } catch (error) {
        // silence: handled in state
      }

      const delay = this.isHealthy ? (this.retryScheduleMs[0] || 10000) : this.nextRetryMs;
      this.timer = setTimeout(loop, delay);
    };

    if (!this.timer) {
      loop();
    }
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  status() {
    return {
      healthy: this.isHealthy,
      degraded: !this.isHealthy,
      lastCheckAt: this.lastCheckAt,
      lastHealthyAt: this.lastHealthyAt,
      lastError: this.lastError,
      nextRetryMs: this.isHealthy ? (this.retryScheduleMs[0] || 10000) : this.nextRetryMs
    };
  }
}

module.exports = DbHealthService;
