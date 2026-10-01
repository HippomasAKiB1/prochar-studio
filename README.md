# Prochar Studio (প্রচার স্টুডিও)

> **আপনার প্রচার, আপনার পোস্টার** — AI-assisted print-ready Bangladeshi political poster generator.

Prochar Studio is a web platform for local political workers, committee members, and publicity agents to generate deterministic, high-resolution, print-ready posters (1800 × 2400 px) in standard Bangladeshi political formats (Victory Day, Condolence/Tribute, Campaign).

---

## Architecture & Technology Stack

- **Monorepo:** npm workspaces (`apps/web`, `apps/api`, `packages/shared`)
- **Frontend:** Next.js 14 App Router, TypeScript, Tailwind CSS (print-shop design tokens)
- **Backend:** Express.js, TypeScript, pino logging
- **Database:** MongoDB Atlas + Mongoose
- **AI Layout Engine:** `@google/genai` (Gemini) for photo placement and palette adaptation (never generates user Bangla text)
- **Deterministic Rendering:** Puppeteer (Chromium) + Fontsource bundled Bangla fonts (Hind Siliguri, Noto Sans/Serif Bengali, Tiro Bangla)
- **Image Processing:** sharp
- **Storage:** Cloudinary (via `StorageProvider` abstraction, local fallback supported)
- **Auth:** JWT (HS256) + bcrypt

---

## Repository Structure

```text
prochar-studio/
├── apps/
│   ├── web/            # Next.js 14 App Router client
│   └── api/            # Express.js REST API + Puppeteer renderer
├── packages/
│   └── shared/         # @prochar/shared Zod schemas, types, and constants
├── docs/               # Specifications (PRD, SEED_TEMPLATES, RENDERER_SPEC, etc.)
├── package.json        # Workspaces root
└── .env.example        # Environment template
```

---

## Quick Start

See [docs/DEV_AND_DEPLOY.md](docs/DEV_AND_DEPLOY.md) for full development, testing, and deployment instructions.
