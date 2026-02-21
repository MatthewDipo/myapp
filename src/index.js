'use strict';

const express    = require('express');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const logger     = require('./logger');
const { register, httpRequests, httpDuration } = require('./metrics');

const app  = express();
const PORT = parseInt(process.env.PORT || '8080', 10);

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

// Rate limiting — prevents abuse (HIPAA § 164.308(a)(5))
const limiter = rateLimit({
  windowMs: 60_000,
  max:      100,
  standardHeaders: true,
  legacyHeaders:   false,
});
app.use('/api/', limiter);

// ── Request instrumentation ───────────────────────────────────────────────────
app.use((req, res, next) => {
  const end = httpDuration.startTimer({ method: req.method, route: req.path });
  res.on('finish', () => {
    end();
    httpRequests.inc({ method: req.method, route: req.path, status: res.statusCode });
    logger.info('http_request', {
      method:    req.method,
      path:      req.path,
      status:    res.statusCode,
      // Expose region for multi-region traffic analysis in Grafana
      region:    process.env.AWS_REGION || 'unknown',
    });
  });
  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'healthy', region: process.env.AWS_REGION, ts: new Date().toISOString() })
);
app.get('/ready', (_req, res) =>
  res.json({ status: 'ready', region: process.env.AWS_REGION, ts: new Date().toISOString() })
);
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
app.get('/api/v1/ping', (_req, res) =>
  res.json({ message: 'pong', env: process.env.NODE_ENV, region: process.env.AWS_REGION })
);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  logger.error('unhandled_error', { error: err.message });
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () =>
  logger.info('server_started', { port: PORT, region: process.env.AWS_REGION })
);

// Graceful shutdown (SIGTERM from Kubernetes)
process.on('SIGTERM', () => {
  logger.info('graceful_shutdown_started');
  server.close(() => {
    logger.info('graceful_shutdown_complete');
    process.exit(0);
  });
  // Force exit after 10s if connections don't close
  setTimeout(() => process.exit(1), 10_000);
});

module.exports = { app, server };
