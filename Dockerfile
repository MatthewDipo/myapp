# =============================================================================
# Stage 1: Install production dependencies only
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# =============================================================================
# Stage 2: Run tests — build fails if tests fail
# =============================================================================
FROM node:20-alpine AS tester
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY src/ ./src/
RUN npm test

# =============================================================================
# Stage 3: Production image — gcr.io/distroless (no shell, minimal attack surface)
# =============================================================================
FROM gcr.io/distroless/nodejs20-debian12:nonroot AS production

WORKDIR /app

# Production node_modules from stage 1 (no dev deps, no package manager)
COPY --from=deps    /app/node_modules ./node_modules
# Source verified by tests in stage 2
COPY --from=tester  /app/src          ./src
COPY package.json ./

# Non-root user (UID 65532 = nonroot in distroless)
USER 65532:65532

EXPOSE 8080

# Health check (no curl/wget in distroless — use node)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", \
    "require('http').get('http://localhost:8080/health',r=>process.exit(r.statusCode===200?0:1))"]

# exec form — signals go directly to Node, not a shell
CMD ["/app/src/index.js"]
