# Vercel Deployment Guide (Web Front-End)

This guide documents deploying the Prochar Studio Next.js 14 front-end (`@prochar/web`) to [Vercel](https://vercel.com/).

---

## 1. Create New Project on Vercel

1. Log into your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository: `HippomasAKiB1/prochar-studio`.

---

## 2. Project & Root Directory Configuration

In the project setup screen:
1. **Framework Preset**: `Next.js`
2. **Root Directory**: Click **Edit** and choose `apps/web`.
3. Build and Output Settings:
   - Build Command: (Leave default / `npm run build` or `next build`)
   - Output Directory: (Leave default / `.next`)
   - Install Command: (Leave default / `npm install`)

---

## 3. Environment Variables

Under **Environment Variables**, add the single required environment variable:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `API_URL` | `https://<your-render-service>.onrender.com` | URL of the live Render API (omit trailing slash) |

---

## 4. API Proxy & SameSite=Lax Cookie Mechanics

In [`apps/web/next.config.js`](file:///e:/AKiB's%20Project%20Book/prochar-studio/apps/web/next.config.js), Next.js rewrites route all `/api/*` requests directly to `${API_URL}/api/*`:

```javascript
async rewrites() {
  return [
    {
      source: "/api/:path*",
      destination: `${API_URL}/api/:path*`,
    },
  ];
}
```

### Why this avoids CORS and Cookie issues:
1. Browser requests to `/api/auth/login`, `/api/posters`, etc. are sent directly to the Vercel app's own domain (`https://prochar-studio.vercel.app/api/...`).
2. Vercel acts as a reverse proxy to the backend on Render.
3. The auth cookie (`prochar_token`) is set on the Vercel first-party domain.
4. Because the browser communicates only with the first-party origin, cookies configured with `SameSite=Lax` and `HttpOnly` function seamlessly without third-party cookie restrictions or complex CORS headers.

---

## 5. Deployment Verification

After deployment:
1. Visit `https://<your-app>.vercel.app/`.
2. Verify font loading, halftone textures, and paper grain.
3. Navigate to `/login` and test authentication with demo credentials:
   - **Identifier**: `demo@prochar.studio`
   - **Password**: `ProcharDemo2026!`
4. Verify navigation to `/templates` and poster creation workflow.
