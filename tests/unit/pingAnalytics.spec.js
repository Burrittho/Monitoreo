const {
  countDowntimesFromSuccessSeries,
  getMaxConsecutiveFailures,
  calculateDowntimeCountFromChartData,
} = require('../../utils/pingAnalytics');

describe('pingAnalytics', () => {
  test('cuenta downtime cuando alcanza exactamente 10 fallos consecutivos', () => {
    const series = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
    expect(countDowntimesFromSuccessSeries(series)).toBe(1);
  });

  test('cuenta múltiples downtime separados por éxitos', () => {
    const series = [
      ...Array(10).fill(0), 1,
      ...Array(12).fill(0), 1,
      ...Array(9).fill(0),
    ];
    expect(countDowntimesFromSuccessSeries(series)).toBe(2);
  });

  test('no cuenta downtime con menos del umbral', () => {
    expect(countDowntimesFromSuccessSeries(Array(9).fill(0))).toBe(0);
  });

  test('devuelve 0 para entradas inválidas', () => {
    expect(countDowntimesFromSuccessSeries(null)).toBe(0);
    expect(calculateDowntimeCountFromChartData({})).toBe(0);
  });

  test('obtiene racha máxima de fallos consecutivos', () => {
    const series = [1, 0, 0, 1, 0, 0, 0, 0, 1, 0];
    expect(getMaxConsecutiveFailures(series)).toBe(4);
  });

  test('calcula downtime desde chartData (null=éxito, valor=fallo)', () => {
    const chartData = {
      datasets: [
        { data: [] },
        { data: [...Array(10).fill(150), null, ...Array(9).fill(120)] },
      ],
    };

    expect(calculateDowntimeCountFromChartData(chartData)).toBe(1);
  });
});
