const { persistHostState } = require('../models/hostRepository');
const config = require('../config/monitoreo');

class PersistenceService {
  constructor(connectionManager, dbHealthService) {
    this.connectionManager = connectionManager;
    this.dbHealthService = dbHealthService;
    this.queue = [];
    this.processing = false;
    this.dbBackfillOnRecovery = config.DB_BACKFILL_ON_RECOVERY;
    this.timer = null;
  }

  enqueueTransition(transition) {
    this.queue.push(transition);
    this.schedule();
  }

  schedule() {
    if (this.timer || this.processing) return;
    this.timer = setTimeout(async () => {
      this.timer = null;
      await this.flush();
    }, 1000);
  }

  async flush() {
    if (this.processing) return;
    if (!this.dbHealthService.status().healthy) {
      if (!this.dbBackfillOnRecovery) {
        this.queue = [];
      }
      this.schedule();
      return;
    }

    this.processing = true;
    try {
      while (this.queue.length > 0) {
        const item = this.queue.shift();
        await persistHostState(
          item.ipId,
          item.newState,
          item.downSince,
          item.upSince,
          this.connectionManager
        );
      }
    } catch (error) {
      console.error('Error persistiendo transiciones, se reintentará:', error.message);
    } finally {
      this.processing = false;
      if (this.queue.length > 0) {
        this.schedule();
      }
    }
  }

  status() {
    return {
      queueSize: this.queue.length,
      backfillOnRecovery: this.dbBackfillOnRecovery
    };
  }
}

module.exports = PersistenceService;
