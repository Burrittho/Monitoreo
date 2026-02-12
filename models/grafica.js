const pingRepository = require('../repositories/pingRepository');

/**
 * Obtiene datos de ping para representación gráfica
 * @param {number} ipId - ID de la IP a consultar
 * @param {Date|string} startDate - Fecha de inicio del rango
 * @param {Date|string} endDate - Fecha de fin del rango
 * @param {number} limit - Límite de registros (opcional, por defecto 1000)
 * @returns {Promise<Array>} - Array de objetos con fecha, latency y success
 */
async function getPingHistoryForChart(ipId, startDate, endDate, limit = 86400, offset = 0) {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);

  const rows = await pingRepository.getPingHistory({
    ipId,
    startDate: start,
    endDate: end,
    limit,
    offset,
  });

  return rows.map(row => ({
    fecha: row.fecha,
    timestamp: row.timestamp,
    latency: row.success ? row.latency : null,
    success: row.success ? 1 : 0,
    status: row.success ? 'success' : 'failure'
  }));
}

/**
 * Obtiene información estadística adicional sobre los datos de ping
 * @param {Array} pingData - Datos de ping obtenidos con getPingHistoryForChart
 * @returns {Object} - Objeto con estadísticas
 */
function getChartStatistics(pingData) {
  if (!pingData || pingData.length === 0) {
    return {
      totalPings: 0,
      successCount: 0,
      failureCount: 0,
      successRate: 0,
      avgLatency: 0,
      minLatency: 0,
      maxLatency: 0,
      p95Latency: 0,
      downtime: 0
    };
  }
  
  // Filtrar pings exitosos para cálculos de latencia
  const successPings = pingData.filter(ping => ping.success);
  const latencies = successPings.map(ping => ping.latency).filter(Boolean);
  
  // Ordenar latencias para percentiles
  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  
  // Calcular tiempo de caída (en segundos)
  let downtime = 0;
  let currentDownStart = null;
  
  for (let i = 0; i < pingData.length; i++) {
    if (pingData[i].success === 0 && currentDownStart === null) {
      currentDownStart = pingData[i].timestamp;
    } else if (pingData[i].success === 1 && currentDownStart !== null) {
      downtime += (pingData[i].timestamp - currentDownStart) / 1000; // convertir a segundos
      currentDownStart = null;
    }
  }
  
  // Si termina en estado de fallo, considerar hasta el último timestamp
  if (currentDownStart !== null && pingData.length > 0) {
    downtime += (pingData[pingData.length - 1].timestamp - currentDownStart) / 1000;
  }
  
  return {
    totalPings: pingData.length,
    successCount: successPings.length,
    failureCount: pingData.length - successPings.length,
    successRate: pingData.length ? (successPings.length / pingData.length) * 100 : 0,
    avgLatency: latencies.length ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length : 0,
    minLatency: latencies.length ? Math.min(...latencies) : 0,
    maxLatency: latencies.length ? Math.max(...latencies) : 0,
    p95Latency: latencies.length ? sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] : 0,
    downtime: downtime
  };
}

/**
 * Obtiene datos formatados para Chart.js
 * @param {number} ipId - ID de la IP a consultar
 * @param {Date|string} startDate - Fecha de inicio del rango
 * @param {Date|string} endDate - Fecha de fin del rango
 * @param {number} limit - Límite de registros (opcional)
 * @returns {Promise<Object>} - Datos formateados para Chart.js y estadísticas
 */
async function getChartData(ipId, startDate, endDate, limit = 1000) {
  const pingData = await getPingHistoryForChart(ipId, startDate, endDate, limit);
  const stats = getChartStatistics(pingData);
  
  // Preparar datos para Chart.js - Usar timestamp en lugar de objeto Date para mayor compatibilidad
  const labels = pingData.map(ping => ping.timestamp);
  
  // Dataset para latencia
  const latencyData = pingData.map(ping => ping.latency);
  
  // Dataset para fallos (puntos rojos)
  const failureData = pingData.map(ping => ping.success ? null : 0); // Punto en 0 para fallos
  
  // Thresholds de latencia fijos para colores de fondo
  const stableThreshold = 10;     // Verde - Conexión estable
  const warningThreshold = 80;    // Naranja - Advertencia
  const criticalThreshold = 100;  // Rojo - Crítico
  
  return {
    chartData: {
      labels: labels,
      datasets: [
        {
          label: 'Latencia (ms)',
          data: latencyData,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderWidth: 1,
          tension: 0.1,
          pointRadius: 2,
          pointHoverRadius: 5,
          yAxisID: 'y'
        },
        {
          label: 'Fallos',
          data: failureData,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 0,
          pointRadius: 5,
          pointStyle: 'rectRot',
          pointHoverRadius: 8,
          yAxisID: 'y1'
        }
      ]
    },
    thresholds: {
      stable: stableThreshold,
      warning: warningThreshold,
      critical: criticalThreshold
    },
    statistics: stats
  };
}

/**
 * Obtiene la lista de IPs monitoreadas para mostrar en el selector
 * @returns {Promise<Array>} - Lista de IPs con id, name e ip
 */
async function getMonitoredIps() {
  return pingRepository.getMonitoredIps();
}

module.exports = {
  getPingHistoryForChart,
  getChartStatistics,
  getChartData,
  getMonitoredIps
};
