const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const pool = require('../../config/db');
const dbHealthService = require('./dbHealthService');
const liveStateStore = require('./liveStateStore');
const logger = require('../config/logger');
const env = require('../config/env');

function parseFpingOutput(output) {
  const resultados = [];
  const lineas = output.trim().split('\n').filter(Boolean);
  lineas.forEach((linea) => {
    const ok = linea.match(/^([\d\.]+)\s+:\s+xmt\/rcv\/%loss = (\d+)\/(\d+)\/(\d+)%.*min\/avg\/max = ([\d\.]+)\/([\d\.]+)\/([\d\.]+)/);
    if (ok) {
      const ip = ok[1];
      const recibidos = Number.parseInt(ok[3], 10);
      resultados.push({ ip, alive: recibidos > 0, latency: Number.parseFloat(ok[6] || '0') || 0 });
      return;
    }
    const fail = linea.match(/^([\d\.]+)\s+:\s+xmt\/rcv\/%loss = (\d+)\/(\d+)\/(\d+)%/);
    if (fail) {
      resultados.push({ ip: fail[1], alive: false, latency: 0 });
    }
  });
  return resultados;
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function createPingMonitor({ group, inventoryTable, logsTable, intervalMs = 1000 }) {
  const inventoryCacheFile = path.join(env.inventoryCacheDir, `${group}-inventory.json`);
  let cachedInventory = [];
  let lastNoInventoryWarnAt = 0;

  function loadCachedInventoryFromDisk() {
    try {
      if (!fs.existsSync(inventoryCacheFile)) return;
      const raw = fs.readFileSync(inventoryCacheFile, 'utf8');
      const rows = JSON.parse(raw);
      if (!Array.isArray(rows) || !rows.length) return;
      cachedInventory = rows;
      liveStateStore.setHostInventory(group, rows);
      logger.info('Loaded inventory from disk cache', { group, count: rows.length });
    } catch (error) {
      logger.warn('Failed to load inventory cache from disk', { group, error: error.message });
    }
  }

  function persistInventoryToDisk(rows) {
    try {
      ensureDir(inventoryCacheFile);
      fs.writeFileSync(inventoryCacheFile, JSON.stringify(rows), 'utf8');
    } catch (error) {
      logger.warn('Failed to persist inventory cache to disk', { group, error: error.message });
    }
  }

  async function getInventory() {
    let conn;
    try {
      conn = await pool.getConnection();
      const [rows] = await conn.query(`SELECT id, ip, name FROM ${inventoryTable}`);
      cachedInventory = rows;
      persistInventoryToDisk(rows);
      liveStateStore.setHostInventory(group, rows);
      return rows;
    } catch (error) {
      if (!cachedInventory.length) {
        loadCachedInventoryFromDisk();
      }

      if (!cachedInventory.length) {
        const now = Date.now();
        if (now - lastNoInventoryWarnAt >= env.noInventoryWarnIntervalMs) {
          lastNoInventoryWarnAt = now;
          logger.warn('No inventory available while DB offline', { group, error: error.message });
        }
      }
      return cachedInventory;
    } finally {
      if (conn) conn.release();
    }
  }

  async function pingHosts(hosts) {
    if (!hosts.length) return [];
    const ips = hosts.map((h) => h.ip);
    return new Promise((resolve) => {
      const comando = `fping -c1 -t1500 ${ips.join(' ')}`;
      exec(comando, (error, stdout, stderr) => {
        const output = stderr || stdout || '';
        resolve(parseFpingOutput(output));
      });
    });
  }

  async function saveResults(hosts, results) {
    if (!results.length || !dbHealthService.connected) return;
    const byIp = new Map(hosts.map((h) => [h.ip, h.id]));
    const values = [];
    const params = [];
    results.forEach((r) => {
      const id = byIp.get(r.ip);
      if (!id) return;
      values.push('(?, ?, ?)');
      params.push(id, r.latency, r.alive ? 1 : 0);
    });
    if (!values.length) return;

    let conn;
    try {
      conn = await pool.getConnection();
      await conn.query(`INSERT INTO ${logsTable} (ip_id, latency, success) VALUES ${values.join(', ')}`, params);
    } catch (error) {
      logger.warn('Failed to persist ping results, keeping live-only mode', { group, error: error.message });
    } finally {
      if (conn) conn.release();
    }
  }

  async function runCycle() {
    const inventory = await getInventory();
    const results = await pingHosts(inventory);
    const byIp = new Map(results.map((r) => [r.ip, r]));
    const now = new Date().toISOString();

    for (const host of inventory) {
      const metric = byIp.get(host.ip) || { ip: host.ip, alive: false, latency: 0 };
      liveStateStore.updateHost(group, {
        id: host.id,
        ip: host.ip,
        name: host.name,
        success: metric.alive,
        latency: metric.latency,
        timestamp: now,
      });
    }

    await saveResults(inventory, results);
  }

  function start() {
    logger.info('Starting ping monitor', { group, intervalMs });
    setInterval(() => {
      runCycle().catch((error) => logger.error('Ping monitor cycle failed', { group, error: error.message }));
    }, intervalMs);
  }

  return { start, runCycle };
}

module.exports = { createPingMonitor };
