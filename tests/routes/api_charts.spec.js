const express = require('express');
const request = require('supertest');

jest.mock('../../models/grafica', () => ({
  getChartData: jest.fn(),
  getMonitoredIps: jest.fn(),
}));

const { getChartData } = require('../../models/grafica');
const chartRoutes = require('../../routes/api_charts');

describe('api_charts route validations (sin DB real)', () => {
  const app = express();
  app.use('/api', chartRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rechaza cuando falta ipId', async () => {
    const res = await request(app).get('/api/chart-data?startDate=2025-01-01&endDate=2025-01-02');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Se requiere ipId');
    expect(getChartData).not.toHaveBeenCalled();
  });

  test('rechaza rango de fechas inválido', async () => {
    const res = await request(app).get('/api/chart-data?ipId=1&startDate=2025-01-03&endDate=2025-01-01');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('startDate no puede ser mayor que endDate');
    expect(getChartData).not.toHaveBeenCalled();
  });

  test('acepta parámetros válidos y usa stub de getChartData', async () => {
    getChartData.mockResolvedValue({ chartData: {}, statistics: {} });

    const res = await request(app).get('/api/chart-data?ipId=7&startDate=2025-01-01&endDate=2025-01-02&limit=10&offset=0');

    expect(res.status).toBe(200);
    expect(getChartData).toHaveBeenCalledWith(7, new Date('2025-01-01'), new Date('2025-01-02'), 10);
  });
});
