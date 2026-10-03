# Render Deployment Guide (API Web Service)

This guide documents deploying the Prochar Studio backend container (`@prochar/api`) to [Render](https://render.com/).

---

## 1. Create Web Service

1. Log into your Render dashboard.
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository: `HippomasAKiB1/prochar-studio`.
4. Name the service: `prochar-api` (or preferred name).
5. Region: Select the region nearest to your MongoDB Atlas cluster (e.g. `Singapore` or `Frankfurt`).
6. Branch: `main`.

---

## 2. Docker Build Configuration

- **Runtime**: `Docker`
- **Dockerfile Path**: `apps/api/Dockerfile`
- **Docker Context**: `.` (the root repository directory — **not** `apps/api`, because the Dockerfile builds using workspace-level npm layout and shared package references).

---

## 3. Health Check

- **Health Check Path**: `/api/health`
- Render will ping `/api/health` and verify HTTP 200 before shifting traffic to new deploys.

---

## 4. Environment Variables

Configure the following environment variables in the Render dashboard (**Environment** tab):

| Variable | Description | Recommended / Example Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `production` |
| `PORT` | HTTP port for incoming traffic | `8080` (or leave default, Render sets `$PORT`) |
| `LOG_LEVEL` | Pino logger level | `info` |
| `MONGODB_URI` | MongoDB Atlas SRV URI | `mongodb+srv://prochar_api_user:<pwd>@cluster0.xxxxx.mongodb.net/prochar-studio?retryWrites=true&w=majority` |
| `JWT_SECRET` | Secret key for auth tokens (≥ 32 chars) | Random 64-char hex string |
| `JWT_EXPIRES_IN` | Token duration | `7d` |
| `COOKIE_DOMAIN` | Optional cookie domain | Leave blank (matches host) |
| `CLIENT_ORIGIN` | Web front-end origin | `https://prochar-studio.vercel.app` (your Vercel app domain) |
| `DEMO_PASSWORD` | Default demo account password | `ProcharDemo2026!` |
| `AI_PROVIDER` | AI Layout orchestrator | `gemini` |
| `GEMINI_API_KEY` | Google Gemini API Key | `AIzaSy...` |
| `GEMINI_MODEL` | Gemini model name | `gemini-2.5-flash` |
| `GEMINI_TIMEOUT_MS` | API timeout for Gemini calls | `20000` |
| `STORAGE_PROVIDER` | Storage backend for photos & exports | `cloudinary` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud name | `<your_cloud_name>` |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | `<your_api_key>` |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | `<your_api_secret>` |
| `RATE_LIMIT_DISABLED` | Global rate limiter switch | `false` |
| `MAX_REGENERATIONS` | Max re-render attempts per poster | `3` |
| `GEN_RATE_PER_MIN` | Per-user generations per minute | `5` |
| `GEN_RATE_PER_DAY` | Per-user generations per 24 hours | `30` |

---

## 5. Port Matching Note

The `apps/api/Dockerfile` exposes `8080`. Render injects the `PORT` environment variable and routes incoming web traffic to the listening port. The API listens on `process.env.PORT || 8080`, ensuring compatibility out-of-the-box.

---

## 6. Cold Start & Puppeteer Advisory

> [!NOTE]
> On Render's Free tier, services spin down after 15 minutes of inactivity. When awoken, container initialization and font-cache warm-up takes approximately 30–50 seconds.
> The API container is packaged with Chromium (`/usr/bin/chromium`), Bengali fonts (`fonts-beng`, Hind Siliguri, Anek Bangla), and non-root execution (`pptruser`), with launch flags `--no-sandbox --disable-dev-shm-usage` pre-configured.
