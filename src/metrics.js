'use strict';
const { register, collectDefaultMetrics, Counter, Histogram } = require('prom-client');

collectDefaultMetrics({ prefix: 'myapp_node_' });

const httpRequests = new Counter({
  name: 'myapp_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

const httpDuration = new Histogram({
  name: 'myapp_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

module.exports = { register, httpRequests, httpDuration };
