'use strict';
const request = require('supertest');
const { app, server } = require('../index');

afterAll(() => server.close());

describe('Health & readiness', () => {
  test('GET /health → 200', async () => {
    const r = await request(app).get('/health');
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('healthy');
  });

  test('GET /ready → 200', async () => {
    const r = await request(app).get('/ready');
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('ready');
  });

  test('GET /api/v1/ping → pong', async () => {
    const r = await request(app).get('/api/v1/ping');
    expect(r.status).toBe(200);
    expect(r.body.message).toBe('pong');
  });

  test('GET /metrics → Prometheus format', async () => {
    const r = await request(app).get('/metrics');
    expect(r.status).toBe(200);
    expect(r.text).toContain('myapp_http_requests_total');
  });
});
