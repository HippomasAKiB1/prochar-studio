# প্রচার স্টুডিও — Prochar Studio

> **একটি ক্লিকের দূরত্বে রাজনৈতিক ও প্রাতিষ্ঠানিক প্রচার পোস্টার ডিজাইন**  
> *Production-ready generative poster studio tuned for Bangladeshi print culture.*

![Tests](https://img.shields.io/badge/tests-299%20passed-success) ![Lighthouse A11y](https://img.shields.io/badge/Lighthouse%20A11y-100-success)

---

## 1. Live Deployments

- **Web Application (Vercel)**: `https://prochar-studio.vercel.app` *(Placeholder — configure upon Vercel deploy)*
- **API Service (Render)**: `https://prochar-api.onrender.com` *(Placeholder — configure upon Render deploy)*
- **Database (MongoDB Atlas)**: M0 Shared Cluster *(Provisioned per `docs/DEPLOY_ATLAS.md`)*

---

## 2. Visual Identity & Interface

Prochar Studio avoids generic SaaS aesthetic patterns. It is deliberately styled as an editorial Bengali print shop with tactile paper textures, halftone screen patterns, authentic press red ink accents, and zero artificial drop-shadows or bloated border-radii.

| ল্যান্ডিং পেজ (Landing) | পোস্টার প্রস্তুতি ও ফলাফল (Poster Detail) |
| :---: | :---: |
| ![Landing Page](docs/screenshots/landing-1280.png) | ![Poster Completed](docs/screenshots/poster-completed-1280.png) |

| টেমপ্লেট গ্যালারি (Templates) | পোস্টার সংরক্ষণাগার (History) |
| :---: | :---: |
| ![Templates Gallery](docs/screenshots/templates-1280.png) | ![Posters History](docs/screenshots/posters-1280.png) |

---

## 3. System Architecture

```text
               +-------------------------------------------------------+
               |                  Client Web Browser                   |
               +-------------------------------------------------------+
                                          |
                      (HTTP / Cookie: prochar_token / SameSite=Lax)
                                          |
                                          v
               +-------------------------------------------------------+
               |               Vercel Edge Proxy (Web)                 |
               |      Next.js 14 App Router + Rewrites (/api/*)        |
               +-------------------------------------------------------+
                                          |
                        (Reverse Proxy via API_URL rewrite)
                                          |
                                          v
               +-------------------------------------------------------+
               |             Render Web Service (API)                  |
               |        Express + TypeScript + Headless Chromium       |
               +-------------------------------------------------------+
                      |                   |                  |
           (MongoDB Driver)          (Gemini SDK)     (Puppeteer Render)
                      |                   |                  |
                      v                   v                  v
               +--------------+   +---------------+   +------------------+
               |   MongoDB    |   | Google Gemini |   | 1800x2400 300DPI |
               | Atlas / M0   |   | Flash 2.5 AI  |   | Lossless PNG     |
               +--------------+   +---------------+   +------------------+
                                          |
                                 (Cloudinary / Local)
                                          v
                                  +---------------+
                                  | Storage Bucket|
                                  | Photo Uploads |
                                  +---------------+
```

---

## 4. Prerequisites

- **Node.js**: `v20.x` or `v22.x`
- **Docker & Docker Compose**: Docker Desktop with Compose V2
- **MongoDB**: MongoDB 6.0+ (or local container via compose)

---

## 5. Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/HippomasAKiB1/prochar-studio.git
cd prochar-studio

# 2. Install monorepo dependencies
npm install

# 3. Environment configuration
cp .env.example .env
# Edit .env and supply your GEMINI_API_KEY (optional for local fallback tests)

# 4. Launch local services (MongoDB, API, Local Storage)
docker compose up -d

# 5. Populate seed templates and provision demo account
npm run seed
npm run seed:thumbnails

# 6. Launch web development server
npm run dev --workspace=@prochar/web
```

The web application will be accessible at `http://localhost:3000`.

---

## 6. Demo Account Credentials

A pre-configured demo account is automatically provisioned during `npm run seed`:

- **Identifier (Email)**: `demo@prochar.studio`
- **Identifier (Phone alternative)**: `01711000000`
- **Password**: `ProcharDemo2026!`

---

## 7. Automated Testing Suite

The repository contains an exhaustive end-to-end testing suite spanning SVG safety, template fit lints, bcrypt password security, rate limiting, SSRF guardrails, golden Bangla rendering checks, and client type alignments:

```bash
# Run lint across all workspaces
npm run lint

# Run TypeScript typechecks
npm run typecheck

# Run 299 vitest tests across 40 test suites
npm run test
```

---

## 8. Deployment Guides

Step-by-step instructions for deploying to cloud infrastructure:

- **MongoDB Atlas Setup**: [`docs/DEPLOY_ATLAS.md`](docs/DEPLOY_ATLAS.md)
- **Render Container Service (API)**: [`docs/DEPLOY_RENDER.md`](docs/DEPLOY_RENDER.md)
- **Vercel Front-End (Web)**: [`docs/DEPLOY_VERCEL.md`](docs/DEPLOY_VERCEL.md)

---

## 9. Known Limitations

1. **PDF Export Deferred (P1)**: The primary export format is an ultra-high resolution 1800 × 2400 print-ready PNG (300 DPI equivalent for standard leaflets). Direct PDF vector compilation is scheduled for Phase 8.
2. **Mobile Lighthouse Performance on `/posters` (67–78)**: Performance score on mobile is bounded by simulated 4G network throttling combined with 4x CPU slowdown rendering client-side Bengali web fonts and the authentic SVG paper grain overlay.
3. **Multi-Instance Scaling**: Rate limiting currently utilizes an in-memory token bucket; multi-instance horizontal scaling on cloud clusters will require Redis backing.
4. **Admin Panel UI Deferred (P2)**: Template administration and audit logs are managed via DB seed scripts and API endpoints.

---

## 10. Security & Hardening Architecture

- **SSRF Prevention**: User photo URLs submitted in poster requests are never fetched arbitrarily from the open web. The API strictly resolves and signs photo buffers using verified public IDs stored in the cloud storage bucket (`posters/uploads/{userId}/`).
- **Path Traversal Protection**: Storage and asset file operations are guarded by `resolveInsideRoot()` to prevent directory traversal outside sandbox bounds.
- **Strict Data Ownership**: Every poster retrieval, download, regeneration, and deletion enforces strict ownership verification (`req.user.id === poster.userId`).

---

## 11. Assets & Licenses

All font families and visual components adhere to permissive, open-source licensing:
- **Fonts**: Anek Bangla, Hind Siliguri, Archivo, IBM Plex Mono, Noto Sans Bengali (SIL Open Font License 1.1).
- **Icons**: Phosphor Icons (MIT).
- Details and license records: [`docs/ASSETS.md`](docs/ASSETS.md).

---

## 12. Colophon

**প্রচারে: Prochar Studio**  
*Crafted for authentic Bengali typography and print culture.*
