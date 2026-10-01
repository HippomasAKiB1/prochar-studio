# -------------------------------------------------------------
# Stage 1: Build stage
# -------------------------------------------------------------
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source trees
COPY tsconfig*.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared package and API
RUN npm run build --workspace=@prochar/shared
RUN npm run build --workspace=apps/api

# -------------------------------------------------------------
# Stage 2: Production dependencies stage
# -------------------------------------------------------------
FROM node:20-bookworm-slim AS prod-deps

WORKDIR /app

# Copy package manifests
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/

# Install production dependencies only (preserves workspace layout)
ARG CACHEBUST
RUN npm ci --omit=dev

# -------------------------------------------------------------
# Stage 3: Production runtime stage
# -------------------------------------------------------------
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Install Chromium, Bengali fonts, Noto core fonts, and CA certs
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-beng \
    fonts-noto-core \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Configure Puppeteer and Node module resolution environment variables
ENV NODE_ENV=production \
    NODE_PATH=/app/node_modules:/app/apps/api/node_modules \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PORT=8080

# Puppeteer runtime launch flags in API code:
# [
#   "--no-sandbox",
#   "--disable-setuid-sandbox",
#   "--disable-dev-shm-usage",
#   "--disable-gpu",
#   "--no-first-run",
#   "--font-render-hinting=none"
# ]

# Invalidate cache for application code & node_modules while preserving Chromium
ARG CACHEBUST

# Create non-root user
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads /app/apps/api/.local-storage \
    && chown -R pptruser:pptruser /home/pptruser /app

# Copy production node_modules and built code
COPY --from=prod-deps --chown=pptruser:pptruser /app/node_modules ./node_modules
COPY --from=prod-deps --chown=pptruser:pptruser /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=pptruser:pptruser /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=pptruser:pptruser /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder --chown=pptruser:pptruser /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=pptruser:pptruser /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=pptruser:pptruser /app/apps/api/assets ./apps/api/assets

USER pptruser

EXPOSE 8080

CMD ["node", "apps/api/dist/server.js"]
