# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:24-slim AS builder

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

# API_INTERNAL_URL is set at runtime via env; use placeholder for build
ENV API_INTERNAL_URL=http://api:8000
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:24-slim AS runtime

WORKDIR /app

RUN useradd --create-home --shell /bin/bash blurt

COPY --from=builder --chown=blurt:blurt /app/.next/standalone /app
COPY --from=builder --chown=blurt:blurt /app/.next/static /app/.next/static
COPY --from=builder --chown=blurt:blurt /app/public /app/public

USER blurt

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
