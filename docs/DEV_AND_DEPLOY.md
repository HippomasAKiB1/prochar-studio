# DEV_AND_DEPLOY.md — Development, Docker & Deployment Guide

> **Context:** This document provides setup instructions, container specifications, deployment parameters, and reviewer smoke test procedures for Prochar Studio.

---

## 1. Monorepo & Package Scripts

The project is structured as an npm workspaces monorepo:
- Root: Orchestration, linting, testing
- `apps/web`: Next.js 14 App Router frontend
- `apps/api`: Express.js + Puppeteer backend
- `packages/shared`: Shared Zod schemas, types, and constants

### NPM Scripts Reference Table

| Package / Workspace | Script | Command | Purpose |
|---|---|---|---|
| **Root** | `dev` | `npm run dev --workspaces` | Runs both Web and API concurrently in development mode |
| **Root** | `build` | `npm run build --workspaces` | Builds all packages in topological order |
| **Root** | `start` | `npm run start --workspace=apps/api` | Starts the production API server |
| **Root** | `lint` | `npm run lint --workspaces` | Runs ESLint across all workspaces |
| **Root** | `typecheck` | `npm run typecheck --workspaces` | Runs TypeScript compiler checks (`tsc --noEmit`) |
| **Root** | `test` | `npm run test --workspaces` | Runs Vitest unit & integration tests |
| **Root** | `seed` | `npm run seed --workspace=apps/api` | Seeds active templates and creates demo user |
| **Root** | `seed:thumbnails` | `npm run seed:thumbnails --workspace=apps/api` | Renders and uploads preview thumbnails for all templates |
| **`apps/web`** | `dev` | `next dev -p 3000` | Starts Next.js development server on port 3000 |
| **`apps/web`** | `build` | `next build` | Compiles Next.js production build |
| **`apps/web`** | `start` | `next start -p 3000` | Starts Next.js production server |
| **`apps/web`** | `lint` | `next lint` | Lints web app source |
| **`apps/web`** | `typecheck` | `tsc --noEmit` | Validates TypeScript in `apps/web` |
| **`apps/api`** | `dev` | `tsx watch src/server.ts` | Runs Express API with hot-reloading |
| **`apps/api`** | `build` | `tsc -p tsconfig.build.json` | Builds API TypeScript to JavaScript in `dist/` |
| **`apps/api`** | `start` | `node dist/server.js` | Runs production API server |
| **`apps/api`** | `lint` | `eslint src/` | Lints API code |
| **`apps/api`** | `typecheck` | `tsc --noEmit` | Validates TypeScript in `apps/api` |
| **`apps/api`** | `test` | `vitest run` | Runs API test suites |
| **`apps/api`** | `seed` | `tsx src/scripts/seed.ts` | Executes MongoDB seed script |
| **`apps/api`** | `seed:thumbnails` | `tsx src/scripts/seed-thumbnails.ts` | Renders fixture thumbnails via Puppeteer |
| **`packages/shared`** | `build` | `tsc` | Emits shared types and schemas |
| **`packages/shared`** | `typecheck` | `tsc --noEmit` | Validates TypeScript in `@prochar/shared` |

---

## 2. Dockerfile Specification (`apps/api/Dockerfile`)

The API requires Chromium and native system fonts for Puppeteer rendering. Below is the multi-stage, non-root Dockerfile:

```dockerfile
# -------------------------------------------------------------
# Stage 1: Build stage
# -------------------------------------------------------------
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

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

# Configure Puppeteer environment variables
ENV NODE_ENV=production \
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

# Create non-root user
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads /app/apps/api/.local-storage \
    && chown -R pptruser:pptruser /home/pptruser /app

# Copy production node_modules and built code
COPY --from=prod-deps --chown=pptruser:pptruser /app/node_modules ./node_modules
COPY --from=builder --chown=pptruser:pptruser /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=pptruser:pptruser /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder --chown=pptruser:pptruser /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=pptruser:pptruser /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=pptruser:pptruser /app/apps/api/assets ./apps/api/assets

USER pptruser

EXPOSE 8080

CMD ["node", "apps/api/dist/server.js"]
```

---

## 3. Local Development Without External Services

To develop and test completely offline without live Cloudinary or Gemini API credentials, set the following environment variables:

```env
STORAGE_PROVIDER=local
AI_PROVIDER=mock
```

- **`STORAGE_PROVIDER=local`**:  
  Uploaded photos and generated posters are written to `apps/api/.local-storage/` and served via static route `GET /api/storage/:filename`.
- **`AI_PROVIDER=mock`**:  
  Bypasses Gemini network calls and loads deterministic mock layout plans from `apps/api/fixtures/gemini-mock.json`.

---

## 4. Render Deployment (API)

- **Service Type:** Web Service (Docker runtime).
- **Environment Variables:** Set all production API environment variables from `.env.example`.
- **Health Check Path:** `/api/health` (asserts HTTP 200 `{ status: "ok", db: "up", uptime: <seconds> }`).
- **Cold-Start Advisory:** Render free-tier instances spin down after inactivity. Cold starts take **30–60 seconds**. Always ping `/api/health` before conducting reviewer demonstrations.

---

## 5. Vercel Deployment (Web)

- **Framework Preset:** Next.js.
- **Root Directory:** `apps/web` (or repo root with `--workspace=apps/web`).
- **Build Command:** `npm run build --workspace=apps/web`.
- **Environment Variables:**
  ```env
  API_URL=https://<your-render-service>.onrender.com
  ```
- **Same-Origin Proxy Rewrites:** Configured in `apps/web/next.config.js`:
  ```js
  module.exports = {
    async rewrites() {
      return [
        {
          source: "/api/:path*",
          destination: `${process.env.API_URL}/api/:path*`,
        },
      ];
    },
  };
  ```
  This routes all `/api/*` browser requests through the Next.js server to Render, ensuring first-party `SameSite=Lax` cookies and eliminating cross-domain CORS hurdles.

---

## 6. MongoDB Atlas Configuration

- **Network Access:** Allow access from `0.0.0.0/0` (Anywhere) for the duration of this hiring assessment.
  - *Rationale:* Render dynamic outbound IP addresses rotate across broad ranges. Configuring `0.0.0.0/0` with a dedicated, strong-password database user ensures reliable evaluation without connection dropouts.

### Demo User Credentials
The seed script (`npm run seed`) automatically creates a default user account for reviewers:
- **Email:** `demo@prochar.studio`
- **Password:** `ProcharDemo2026!`
- **Role:** `user`

---

## 7. Reviewer Smoke-Test Script (PRD §13.4)

Reviewers can verify the application end-to-end using this standardized procedure:

1. **Register / Log In:**
   - Navigate to `/login`.
   - Log in with `demo@prochar.studio` / `ProcharDemo2026!` (or register a fresh account using either email or Bangladeshi phone number `+8801XXXXXXXXX`).
2. **Template Gallery:**
   - Browse `/templates`. Filter by occasion chips ("বিজয় দিবস", "শোক/স্মরণ", "নির্বাচনী প্রচার").
   - Confirm active templates are rendered with their proof thumbnails.
3. **Generate Posters:**
   - For each of the 3 templates, open `/create/[templateId]` and generate a poster:
     - Test 1: Victory Day (`victory-day-classic`) with 3 photos.
     - Test 2: Condolence (`condolence-tribute`) with 1 photo.
     - Test 3: Campaign (`campaign-bold`) with 2 photos.
   - Accept the mandatory consent checkbox and submit.
4. **Live Stepper & Preview:**
   - Observe the 4-stage press run stepper: *ছবি প্রস্তুত → লেআউট → ছাপা হচ্ছে → সংরক্ষণ*.
   - Confirm completion and verify the generated 3:4 proof image preview.
5. **Edit & Regenerate:**
   - Click "লেখা বদলান" (Edit text), update the headline, and click "আবার ছাপুন" (Regenerate).
   - Confirm the attempts counter decrements (e.g., "২টি রিজেনারেট বাকি").
   - Regenerate until limit is reached; verify that further regenerations are safely disabled.
6. **Download Verification:**
   - Click "PNG ডাউনলোড".
   - Verify that the downloaded file is named `prochar-{slug}-{date}.png`, has dimensions **1800 × 2400 px**, and all Bangla conjuncts render cleanly with no clipping.
7. **History & Ownership Security:**
   - Navigate to `/posters` (History).
   - Re-download a poster.
   - Delete one poster and confirm immediate removal from the list.
   - Attempt to access another user's poster URL directly in an incognito window; verify that access returns `401/403/404`.
8. **Deterministic Fallback Test:**
   - Unset or invalidate `GEMINI_API_KEY` on the API (or set `AI_PROVIDER=mock` / simulate timeout).
   - Submit a poster generation; verify that generation still succeeds (`status: "completed"`, `aiAssisted: false`) using the template's default layout.
