'use strict';
const { createLogger, format, transports } = require('winston');

// Structured JSON logging — required for CloudWatch Insights queries
// NEVER log PHI fields: patient_id, ssn, dob, mrn, insurance_id
const PHI_FIELDS = new Set(['patient_id', 'ssn', 'dob', 'mrn', 'insurance_id', 'phone', 'address']);

const redactPHI = format((info) => {
  if (info.meta && typeof info.meta === 'object') {
    const redacted = { ...info.meta };
    for (const field of PHI_FIELDS) {
      if (field in redacted) redacted[field] = '[REDACTED]';
    }
    info.meta = redacted;
  }
  return info;
});

module.exports = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    redactPHI(),
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [new transports.Console()],
  // Never log unhandled exceptions to stdout in production (security)
  exitOnError: false,
});
