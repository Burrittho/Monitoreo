/**
 * Cuenta períodos de downtime a partir de una secuencia de éxitos (1) y fallos (0).
 * Un downtime se registra al alcanzar el umbral de fallos consecutivos.
 *
 * @param {Array<number>} successSeries
 * @param {number} threshold
 * @returns {number}
 */
function countDowntimesFromSuccessSeries(successSeries, threshold = 10) {
  if (!Array.isArray(successSeries) || threshold <= 0) {
    return 0;
  }

  let downtimeCount = 0;
  let consecutiveFailures = 0;

  for (const value of successSeries) {
    if (value === 0) {
      consecutiveFailures += 1;
      if (consecutiveFailures === threshold) {
        downtimeCount += 1;
      }
    } else {
      consecutiveFailures = 0;
    }
  }

  return downtimeCount;
}

/**
 * Obtiene la racha máxima de fallos consecutivos.
 *
 * @param {Array<number>} successSeries
 * @returns {number}
 */
function getMaxConsecutiveFailures(successSeries) {
  if (!Array.isArray(successSeries)) {
    return 0;
  }

  let maxStreak = 0;
  let currentStreak = 0;

  for (const value of successSeries) {
    if (value === 0) {
      currentStreak += 1;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
}

/**
 * Calcula downtime a partir del formato de chartData de Chart.js.
 * dataset[1].data usa null para éxito y valor numérico para fallo.
 *
 * @param {object} chartData
 * @param {number} threshold
 * @returns {number}
 */
function calculateDowntimeCountFromChartData(chartData, threshold = 10) {
  if (!chartData || !Array.isArray(chartData.datasets) || chartData.datasets.length < 2) {
    return 0;
  }

  const failureData = chartData.datasets[1] && chartData.datasets[1].data;
  if (!Array.isArray(failureData)) {
    return 0;
  }

  const successSeries = failureData.map((point) => (point === null ? 1 : 0));
  return countDowntimesFromSuccessSeries(successSeries, threshold);
}

module.exports = {
  countDowntimesFromSuccessSeries,
  getMaxConsecutiveFailures,
  calculateDowntimeCountFromChartData,
};
