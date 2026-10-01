# Product Requirements Document — Prochar Studio (AI Political Poster Maker)

| | |
|---|---|
| **Product name** | **Prochar Studio** (প্রচার স্টুডিও) |
| **Document type** | PRD + technical design (single source of truth for the MVP) |
| **Author** | Akib (Full Stack Developer candidate) |
| **Version** | 1.2 (name locked: Prochar Studio; UI/UX & visual identity added in §12) |
| **Deadline** | **Sun, Oct 04, 2026 — 11:59 PM** (target submission: Oct 04, ≤ 6:00 PM, leaving buffer) |
| **Status** | Ready for implementation |

---

## 1. Summary

**Prochar Studio** (প্রচার স্টুডিও) is a web platform where local political workers, committee members and publicity agents create **print-ready Bangladeshi political posters** (victory day, condolence/tribute, campaign, greetings, Eid/festival) by filling in a short form: name, designation, party/organization, union/thana/district, occasion, Bangla headline, and up to 3 photos.

### 1.1 Naming & branding
| Item | Value |
|---|---|
| Product name | **Prochar Studio** |
| Bangla name | প্রচার স্টুডিও |
| Suggested tagline | *আপনার প্রচার, আপনার পোস্টার* — "Your campaign, your poster" |
| Repo / folder slug | `prochar-studio` |
| Shared package scope | `@prochar/shared` |
| Deploy names | Vercel project `prochar-studio`, Render service `prochar-studio-api` |
| Download filenames | `prochar-{slug}-{date}.png` |

The name comes from *প্রচার* ("publicity"), the same word as the "প্রচারে" credit line printed on every poster. Availability of domains, repo names and app-store names must be verified before launch (see §17). The name is for the assessment build; it is not a trademark clearance.

**Core design decision:** Gemini is used for the *creative/visual intelligence* (photo placement, crop focus, colour and decoration scheme). The **final poster is rendered deterministically by an HTML/CSS template via Puppeteer**, so the user's Bangla text is always spelled and shaped exactly as typed. This is **Option B** from the brief, which the brief itself recommends for the MVP.

> Why not Option A (pure AI image generation)? AI image models frequently corrupt Bangla conjuncts (যুক্তাক্ষর) and vowel signs. For a poster whose main content is a name and a headline, a single wrong character makes it unusable and embarrassing. Option B removes that failure mode entirely.

---

## 2. Goals, Non-Goals, Success Criteria

### 2.1 Goals
1. A user can go from sign-up to a downloaded, print-ready poster in **under 3 minutes**.
2. Bangla text renders **pixel-correct** (no broken conjuncts, no tofu boxes, no clipping).
3. Output is **≥ 1200×1600 px** (delivered at **1800×2400 px**, 3:4).
4. The system is **resilient**: if Gemini fails, times out, or is blocked, the poster is still produced using the template's default layout.
5. AI cost and abuse are controlled (caching, rate limits, retry caps).
6. Code is clean, typed end-to-end, tested where it matters, deployed, and documented — this is a hiring assessment.

### 2.2 Non-Goals (MVP)
Admin UI, moderation queue UI, analytics, bulk CSV generation, payments (bKash/Nagad), watermark tiers, OTP login, automatic background removal of photos, multi-language UI beyond Bangla/English labels. See §14.

### 2.3 Success Criteria (definition of done)
| # | Criterion | How it is verified |
|---|---|---|
| S1 | All **P0** requirements in §5 implemented | Checklist in §16 |
| S2 | Live frontend + backend + Atlas DB reachable by reviewers | Public URLs in README |
| S3 | A reviewer can log in with a seeded demo account and generate a poster for each of the 3 seeded templates | Manual test script (§13.4) |
| S4 | Generated PNG is ≥ 1200×1600 and Bangla text matches input exactly | Automated render test + visual check |
| S5 | Generation p95 latency ≤ 20 s (with Gemini), ≤ 8 s (fallback path) | GenerationLog `latencyMs` |
| S6 | No secrets in repo; `.env.example` provided; README lets a stranger run it in < 10 minutes | Fresh-clone test |

---

## 3. Users & Scenarios

**Primary persona — "Rafiq", ward-level publicity secretary.** Uses a mid-range Android phone, comfortable with Facebook and Canva-style tools, writes in Bangla, needs a poster for tomorrow's rally. Mobile-first UI is mandatory.

**Secondary persona — Committee member** producing tribute posters on short notice.

**Tertiary — Reviewer/Admin (internal).** Seeds templates via script in MVP; admin UI is post-MVP.

### Key user stories
| ID | Story | Priority |
|---|---|---|
| U1 | As a visitor, I can register and log in with email **or** phone + password. | P0 |
| U2 | As a user, I can browse templates filtered by occasion. | P0 |
| U3 | As a user, I can fill a form (Bangla text supported) and upload up to 3 photos. | P0 |
| U4 | As a user, I see live progress while my poster generates and then a preview. | P0 |
| U5 | As a user, I can edit text and regenerate a limited number of times. | P0 |
| U6 | As a user, I can download a print-ready PNG. | P0 |
| U7 | As a user, I can see all my past posters and re-download them. | P0 |
| U8 | As a user, I can delete a poster (and its stored files). | P0 |
| U9 | As a user, I can download a PDF. | P1 |
| U10 | As a user, I can choose a Bangla headline font and a photo layout (2-up/3-up). | P2 |
| U11 | As an admin, I can manage templates and moderate posters via UI. | P2 |

---

## 4. Product Scope Overview

```
Visitor ──► Register/Login ──► Template Gallery ──► Poster Form (+photos)
                                                        │
                                          POST /api/posters (202 Accepted)
                                                        │
                           ┌────────────────────────────▼──────────────────────────┐
                           │ Generation pipeline (async, in-process job)            │
                           │ 1 validate+moderate → 2 normalise photos → 3 Gemini     │
                           │ layout plan (fallback-safe) → 4 HTML render (Puppeteer) │
                           │ 5 PNG export → 6 upload → 7 persist + log               │
                           └────────────────────────────┬──────────────────────────┘
                                                        │ client polls GET /api/posters/:id
                                             Preview ──► Edit text / Regenerate (≤3)
                                                        │
                                              Download PNG (and PDF) ──► History
```

---

## 5. Functional Requirements

Priority key: **P0** = must ship in MVP · **P1** = ship if ahead of schedule · **P2** = post-MVP, documented only.

### 5.1 Authentication (P0)
- **FR-A1** Register with `name`, one identifier (`email` **or** Bangladeshi `phone`), `password`.
- **FR-A2** Login with identifier + password. Response sets an **httpOnly cookie**; `Authorization: Bearer` is also accepted for API tooling (Postman/curl).
- **FR-A3** `GET /api/auth/me` returns the current user.
- **FR-A4** `POST /api/auth/logout` clears the cookie.
- **FR-A5** Validation rules:
  - Email: RFC-valid, lower-cased, trimmed.
  - Phone: normalise to `+8801XXXXXXXXX` (accept `01XXXXXXXXX`, `8801…`, `+8801…`); reject others.
  - Password: min 8 chars, at least 1 letter and 1 number, max 72 bytes (bcrypt limit).
- **FR-A6** Passwords hashed with **bcrypt, cost 12**. Never logged, never returned.
- **FR-A7** JWT: HS256, 7-day expiry, payload `{ sub, role }`. Secret ≥ 32 chars from env.
- **FR-A8** Login/register responses are generic on failure ("Invalid credentials") to avoid account enumeration; duplicate identifier on register returns `409`.

### 5.2 Template Library (P0)
- **FR-T1** Occasion categories (enum, bilingual labels):

  | `occasionType` | Bangla label |
  |---|---|
  | `victory_day` | বিজয় দিবস |
  | `condolence` | শোক/স্মরণ |
  | `campaign` | নির্বাচনী প্রচার |
  | `greetings` | শুভেচ্ছা |
  | `eid_festival` | ঈদ/উৎসব |

- **FR-T2** Seed **3 templates** via script (`npm run seed`): Victory Day, Condolence/Tribute, Campaign. The other two occasions exist in the enum and filter UI; empty categories show a friendly "coming soon" state.
- **FR-T3** `GET /api/templates?occasion=` lists active templates; `GET /api/templates/:id` returns one including `layoutConfig`.
- **FR-T4** Each template ships static assets (decorations, flag motifs, floral borders, paddy/dove illustrations) stored in the repo under `apps/api/assets/templates/<slug>/` as SVG/PNG and referenced by key in `layoutConfig`. Seed script is **idempotent** (upsert by `slug`).
- **FR-T5** Assets must be **original or openly licensed**. Do not copy the sample posters or any party's trademarked symbol. Credits listed in `ASSETS.md`.

### 5.3 Poster Request Form (P0)
Fields and validation (shared Zod schema in `packages/shared`, used by both client and server):

| Field | Required | Rules |
|---|---|---|
| `templateId` | Yes | Valid ObjectId of an active template |
| `name` | Yes | 2–60 chars |
| `designation` (পদবি) | Yes | 2–60 chars |
| `partyOrOrganization` | Yes | 2–80 chars |
| `union` / `thana` / `district` | `district` required | each ≤ 40 chars |
| `occasionType` | Yes | Enum; must match the template's occasion |
| `headline` (Bangla) | Yes | 2–60 chars; Unicode NFC normalised; control chars stripped |
| `subtext` | No | ≤ 140 chars (e.g. tribute message) |
| `creditLine` | No | Defaults to `প্রচারে: {name}, {designation}, {partyOrOrganization}` |
| `photos` | Yes, 1–3 | JPEG/PNG/WebP, ≤ 5 MB each |
| `consent` | Yes | Checkbox: "I have the right/permission to use these photos and symbols." |

- **FR-F1** Client shows inline validation errors in real time; server re-validates everything (never trust the client).
- **FR-F2** Bangla input works on mobile and desktop; textareas use `lang="bn"`.
- **FR-F3** Photo upload shows thumbnails with remove/reorder; order = slot order.

### 5.4 File Upload (P0)
- **FR-U1** `POST /api/upload` (auth required) accepts `multipart/form-data`, field `photos`, **max 3 files** per request.
- **FR-U2** Server validation (defence in depth):
  1. Size limit (5 MB each) enforced by multer.
  2. **Magic-byte sniffing** via `file-type` (do not trust `Content-Type` or extension).
  3. Allowed: `image/jpeg`, `image/png`, `image/webp`.
  4. Re-encode with **sharp**: auto-rotate by EXIF, **strip all metadata (incl. GPS)**, cap longest side at 2400 px, convert to WebP/JPEG.
- **FR-U3** Upload to Cloudinary (default) through a `StorageProvider` interface so S3 can be swapped in. Returns `{ url, publicId, width, height }[]`.
- **FR-U4** Uploaded photos live in `posters/uploads/{userId}/…`, generated posters in `posters/generated/{userId}/…`.

### 5.5 AI Generation (P0)
See §8 for the full pipeline. Requirements:
- **FR-G1** `POST /api/posters` validates input, creates a `Poster` with `status: "generating"`, enqueues the job, and returns **`202 Accepted`** with `{ id, status }` immediately.
- **FR-G2** Client polls `GET /api/posters/:id` (2 s interval, backing off to 4 s after 20 s, hard client timeout 120 s).
- **FR-G3** Poll response includes a coarse `stage`: `queued → analyzing → rendering → uploading → done`.
- **FR-G4** Gemini output must be **strict JSON validated by Zod**. Any invalid, blocked, or timed-out response triggers the **deterministic fallback** (template defaults); the poster still completes with `aiAssisted: false`.
- **FR-G5** User text is rendered **verbatim** from `formData`; AI never rewrites or generates user-visible text.
- **FR-G6** Template-level AI outputs (colour/decoration scheme) are **cached** (§8.6).

### 5.6 Preview & Regenerate (P0)
- **FR-R1** Preview screen shows the generated poster, the editable form fields, and "Regenerate" with remaining-attempts counter.
- **FR-R2** `POST /api/posters/:id/regenerate` accepts optional `formData` overrides (text fields only; photos can be re-ordered). Creates a new render and overwrites `generatedImageUrl` (old asset deleted after the new one succeeds).
- **FR-R3** Max **3 regenerations** per poster (`MAX_REGENERATIONS`, configurable). The initial generation is free; failed generations **do not** consume a retry.
- **FR-R4** Regeneration from `status: generating` is rejected with `409`.
- **FR-R5** Regeneration passes a `variationSeed` so Gemini may suggest a different decoration/placement variant; text-only edits may skip Gemini and reuse the stored `layoutPlan` (faster, cheaper).

### 5.7 Export (P0 PNG, P1 PDF)
- **FR-E1** PNG at **1800×2400 px** (logical 600×800 @ deviceScaleFactor 3), sRGB.
- **FR-E2** `GET /api/posters/:id/download?format=png|pdf` streams the file with `Content-Disposition: attachment; filename="prochar-{slug}-{date}.png"`.
- **FR-E3 (P1)** PDF created by embedding the PNG on a single 3:4 page using `pdf-lib` (deterministic, no extra browser pass).
- **FR-E4** Ownership enforced on download.

### 5.8 Poster History (P0)
- **FR-H1** `GET /api/posters/user/:userId` returns the user's posters, newest first, **paginated** (`?page=1&limit=12`). Only the owner (or admin) may request it; otherwise `403`.
- **FR-H2** History page shows thumbnail, headline, occasion, date, status; actions: view, download, regenerate, delete.
- **FR-H3** `DELETE /api/posters/:id` removes the DB record and best-effort deletes the Cloudinary assets (uploaded + generated). Returns `204`.

### 5.9 Rate Limiting & Abuse Control (P0)
| Scope | Limit | Notes |
|---|---|---|
| Global API | 300 req / 15 min / IP | `express-rate-limit` |
| `POST /api/auth/*` | 10 req / 15 min / IP | Brute-force protection |
| `POST /api/upload` | 20 req / 15 min / user | |
| `POST /api/posters` and `/regenerate` | **5 / min** and **30 / day** per user | Protects Gemini quota |
| Concurrent Gemini calls | 2 (process-wide semaphore) | `p-limit` |
| Concurrent renders | 2 pages (process-wide) | Prevents OOM on small instances |

Limit responses: `429` with `Retry-After`.

### 5.10 Content Safety (P0-lite, full admin tooling P2)
Political-poster tools can be misused. MVP includes guardrails that don't need an admin UI:
- **FR-M1** Mandatory **consent checkbox** (stored on the poster as `consentAcceptedAt`).
- **FR-M2** Server-side **blocklist** (`config/blocklist.ts`) applied to all text fields: hate/abuse terms, incitement/violence phrases, and a configurable list of prohibited symbols/terms. Matches reject the request with `422 CONTENT_REJECTED` (reason is generic to avoid blocklist probing).
- **FR-M3** Gemini safety settings enabled; a blocked response is treated as a failure → fallback render (images are still the user's own, text is still moderated by FR-M2).
- **FR-M4** Every poster has `moderation: { status: "clear" | "flagged" | "blocked", flags: string[] }`. MVP sets it automatically; a **P2** admin queue consumes it.
- **FR-M5** The footer **"প্রচারে" credit line is always rendered** (cannot be blank) — matches the reference style and ensures attribution.
- **FR-M6** Posters are **private to their owner**. There is no public gallery or sharing in MVP, so the multi-tenant sharing risk noted in the brief does not apply yet.

### 5.11 Admin (P2 — deferred, per brief)
Seed script replaces admin CRUD. `role: "admin"` exists in the schema and a reusable `requireAdmin` middleware is implemented and unit-tested, with the routes below **stubbed behind it** only if time remains:
`POST/PATCH/DELETE /api/admin/templates`, `GET /api/admin/posters`.
This keeps the API surface in the brief honest without spending MVP time on UI.

---

## 6. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Performance** | Gen p95 ≤ 20 s (AI), ≤ 8 s (fallback). History page TTFB ≤ 500 ms. Thumbnails served via Cloudinary transforms (`w_400,f_auto,q_auto`). |
| **Reliability** | Gemini failure never fails a poster. Stuck jobs recovered (§8.7). Graceful shutdown closes Mongo and Chromium. |
| **Security** | See §10. OWASP Top 10 aware. |
| **Accessibility** | Labels on every input, visible focus, colour contrast ≥ 4.5:1, keyboard operable, `alt` text on previews. |
| **Responsiveness** | Mobile-first (360 px up). Form and preview pages tested at 360, 768, 1280. |
| **Browser support** | Latest 2 versions of Chrome, Edge, Safari, Firefox; Android Chrome. |
| **Observability** | Structured JSON logs (`pino`), request IDs, `GenerationLog` per attempt, `/api/health` (checks Mongo). |
| **Maintainability** | TypeScript `strict`, ESLint + Prettier, shared Zod schemas, conventional commits. |
| **Portability** | Dockerfile for the API (includes Chromium + Bangla fonts) so local and deployed rendering are identical. |
| **i18n** | Bangla-first labels with English secondary; Unicode NFC normalisation on all Bangla input. |

---

## 7. Architecture

### 7.1 Stack
| Layer | Choice | Notes |
|---|---|---|
| Frontend | **Next.js 14+ (App Router), TypeScript**, Tailwind CSS (driven by CSS-variable design tokens, §12.5), React Hook Form + Zod, TanStack Query | Self-hosted fonts via `next/font` (§12.5.2); Phosphor icons (Bold) + custom SVG ornaments; CSS animations only (no animation library) |
| Backend | **Express.js, TypeScript** | Zod validation, pino logging, helmet, cors |
| Database | **MongoDB Atlas + Mongoose** | |
| AI | **Google Gemini API** via `@google/genai` | Model ID in `GEMINI_MODEL` env (verify current model name in Google AI docs on build day; default a fast multimodal Flash-class model) |
| Rendering | **Puppeteer** (Chromium) | Chromium's HarfBuzz shaping handles Bangla conjuncts correctly |
| Image processing | **sharp** | resize, EXIF strip, data-URI conversion |
| Storage | **Cloudinary** (behind `StorageProvider`; S3 adapter possible) | |
| Auth | JWT + bcrypt | |
| Testing | Vitest/Jest, supertest, mongodb-memory-server | Playwright smoke test optional (P1) |
| Hosting | **Vercel** (web), **Render – Docker web service** (API), **MongoDB Atlas** | See §7.3 for why not Vercel for the API |

### 7.2 Repository layout (npm workspaces monorepo)
```
prochar-studio/
├─ apps/
│  ├─ web/                    # Next.js
│  │  ├─ app/                 # routes: /, /login, /register, /templates, /create/[templateId],
│  │  │                       #         /posters, /posters/[id]
│  │  ├─ components/          # forms, PhotoUploader, TemplateCard, PosterPreview, StatusStepper
│  │  └─ lib/                 # api client, auth hooks
│  └─ api/                    # Express
│     ├─ src/
│     │  ├─ config/           # env (zod-validated), blocklist, constants
│     │  ├─ models/           # User, Template, Poster, GenerationLog, AiCache
│     │  ├─ routes/           # auth, templates, posters, upload, admin(stub), health
│     │  ├─ controllers/
│     │  ├─ services/
│     │  │  ├─ gemini.service.ts      # prompt, schema, timeout, retries
│     │  │  ├─ layout.service.ts      # merge AI plan + template defaults + clamp
│     │  │  ├─ render.service.ts      # HTML build + Puppeteer
│     │  │  ├─ storage.service.ts     # Cloudinary provider
│     │  │  ├─ moderation.service.ts
│     │  │  └─ generation.service.ts  # orchestrates the pipeline
│     │  ├─ middleware/       # auth, requireAdmin, rateLimit, validate, error handler
│     │  ├─ templates-html/   # HTML/CSS template renderers per layout family
│     │  ├─ scripts/seed.ts
│     │  └─ server.ts
│     ├─ assets/{fonts,templates}/
│     └─ Dockerfile
├─ packages/shared/           # @prochar/shared — Zod schemas, TS types, enums (single source of truth)
├─ README.md  PRD.md  ASSETS.md  .env.example
```

### 7.3 Deployment decision: Render (Docker) for the API
Puppeteer needs a full Chromium binary and ~512 MB+ RAM. Vercel serverless functions have tight size/time limits and no persistent process, which also breaks background jobs. **Deploy the API on Render as a Docker web service** (Chromium + fonts baked into the image). The brief allows "Vercel / Render", so this is compliant.
Note for reviewers: Render free tier cold-starts (~30–60 s). The README documents this, and `/api/health` can be pinged before review.

### 7.4 Same-origin API via Next.js rewrites
`apps/web/next.config.js` rewrites `/api/:path*` → `${API_URL}/api/:path*`. The browser only ever talks to the Vercel origin, so the auth cookie is first-party (`SameSite=Lax; Secure; HttpOnly`), no CORS or third-party-cookie issues, and CSRF exposure is minimal. CORS on the API is still locked to an explicit allow-list.

### 7.5 Background jobs
MVP uses an **in-process async job** (a function invoked after the `202` response, guarded by the concurrency semaphores). No Redis/BullMQ — that would be over-engineering for the scope. Trade-off documented: jobs are lost on process crash, mitigated by §8.7 recovery. A `JobRunner` interface keeps a queue swap trivial later.

---

## 8. Generation Pipeline (Option B)

### 8.1 Steps
1. **Validate & moderate** (Zod + blocklist). Reject early with a specific error code.
2. **Create/refresh Poster** → `status: "generating"`, `stage: "queued"`.
3. **Normalise photos** (`stage: "analyzing"`): fetch only from the configured Cloudinary host, resize to ≤ 1024 px, re-encode.
4. **Gemini layout plan** (timeout 20 s, 1 retry on 5xx/timeout): send downscaled photos + structured form data + a compact summary of the template's slots and allowed decoration keys; request JSON via `responseSchema`.
5. **Validate & clamp** the plan with Zod; any invalid field falls back to the template default for that field (§8.3). If the whole call fails → full fallback plan, `aiAssisted: false`.
6. **Render** (`stage: "rendering"`): build HTML, load in Puppeteer, wait for fonts and images, fit text, screenshot PNG at 1800×2400.
7. **Upload** (`stage: "uploading"`) PNG (+ thumbnail variant via Cloudinary transform).
8. **Persist**: `status: "completed"`, `generatedImageUrl`, `layoutPlan`, `exports`; write `GenerationLog`.
9. On any unrecoverable error: `status: "failed"`, `error: { code, message }` (safe message), log full details server-side.

### 8.2 What Gemini is asked to do (and only this)
- **Photo focal point**: for each photo, the face/subject centre as `{x, y}` (0–1) and a recommended `zoom` (1.0–1.6), used for `object-position` and scale inside the slot mask.
- **Slot assignment hint**: ordering by prominence (e.g., the main leader first) — advisory; user's upload order is the default.
- **Colour scheme** from a constrained set: `primary`, `secondary`, `accent`, `textOnPrimary`, `textOnLight` as hex, appropriate to the occasion (e.g., muted/black-white-grey for condolence; red-green for Victory Day).
- **Decoration selection** from the template's **closed list of decoration keys** (`paddy`, `doves`, `floral_border_a`, `flag_wave`, …) plus intensity (`low|medium|high`).
- **Headline size tier**: `large|xlarge` — final size is still computed by the text-fit step.

### 8.3 Response schema (Zod / Gemini `responseSchema`)
```ts
const LayoutPlan = z.object({
  photos: z.array(z.object({
    index: z.number().int().min(0).max(2),
    focal: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }),
    zoom: z.number().min(1).max(1.6),
  })).max(3),
  slotOrder: z.array(z.number().int().min(0).max(2)).max(3).optional(),
  colors: z.object({
    primary: hex, secondary: hex, accent: hex, textOnPrimary: hex, textOnLight: hex,
  }),
  decorations: z.array(z.enum(DECORATION_KEYS)).max(6),
  decorationIntensity: z.enum(["low", "medium", "high"]),
  headlineTier: z.enum(["large", "xlarge"]),
});
```
**Safety clamps after validation:** colours must meet **WCAG contrast ≥ 4.5** against their backgrounds (else swap to template palette); decoration keys must exist in the template; zoom and focal values are clamped. The model can never inject HTML, CSS, or URLs — only enums, numbers and hex colours.

### 8.4 Prompt design (summary)
- **System instruction:** "You are a layout assistant for Bangladeshi political posters. Return JSON only, matching the schema. Do not output text for the poster."
- **Inputs:** occasion, tone (`celebratory | solemn | energetic`), number of photos, template slot list, allowed decoration keys, palette constraints, and `variationSeed` for regenerate.
- **Rules in prompt:** respectful tone, occasion-appropriate colours, solemn palette for `condolence`, no text generation.
- Prompt text lives in `gemini.service.ts` as versioned constants (`PROMPT_VERSION`), stored in `GenerationLog.geminiPromptUsed`.

### 8.5 Deterministic rendering rules
- **Fonts are bundled**, not fetched at runtime: Hind Siliguri, Noto Sans Bengali, Noto Serif Bengali, Tiro Bangla (all OFL), as local `@font-face` using `data:`/file-served fonts. The render waits on `document.fonts.ready` and then asserts the headline glyphs loaded (avoids fallback boxes).
- **HTML is escaped**: every user string is HTML-escaped and inserted as text nodes; no user content in attributes, styles, or scripts.
- **Locked-down browser page:** request interception blocks every network request (all assets are inlined as `data:` URIs), a strict CSP meta tag is applied (`default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'nonce-…'`), and only our nonce'd text-fit script can run. This prevents SSRF/local-file reads even if a bug slips through.
- **Text fitting:** each text slot has `minFont`, `maxFont`, `maxLines`; a small script binary-searches the largest font size that fits, never below `minFont`. If the text still overflows at `minFont`, it truncates with ellipsis only for `subtext`; for the **headline and name it never truncates** — validation limits (§5.3) guarantee they fit.
- **Photo slots** use CSS masks (circle, arch, rounded-rect) with `object-fit: cover` + `object-position` from the plan. Auto background removal is out of scope; frames/masks give the "leader cutout" look without it.
- **Layout:** logical canvas 600×800; top band = up to 3 photo slots; centre = headline; party/flag graphic; decorations as layered SVG; footer bar = name, designation, organization, location, and "প্রচারে" line.
- **Browser lifecycle:** one shared Chromium instance, a new page per job, always closed in `finally`; browser relaunched on disconnect.

### 8.6 Cost control & caching
- **Template-level cache** (`AiCache` collection): key = `sha256(templateId + occasionType + promptVersion + variationBucket)` → colour/decoration scheme, TTL 30 days. A cache hit skips Gemini for colours/decorations.
- **Per-photo focal analysis** is the only per-user Gemini cost; photos are sent at ≤ 768 px.
- **Text-only regenerate** reuses the stored `layoutPlan` and skips Gemini entirely.
- Per-user daily cap + global concurrency limit (§5.9). `GenerationLog` records `tokensUsed` and `latencyMs` for cost review.

### 8.7 Failure handling & recovery
| Failure | Behaviour |
|---|---|
| Gemini timeout / 5xx / 429 | 1 retry with jitter → fallback plan |
| Gemini safety block / invalid JSON | Immediate fallback plan |
| Photo fetch/decode error | Poster `failed`, error code `PHOTO_UNREADABLE` |
| Render error | 1 automatic retry (fresh page) → `failed` |
| Cloudinary upload error | 2 retries with backoff → `failed` |
| Server restarted mid-job | On boot, posters stuck in `generating` > 5 min are set to `failed` (`JOB_INTERRUPTED`); the user can regenerate without losing a retry |

---

## 9. Data Model (Mongoose)

All collections: `timestamps: true`, `strict: true`, no sensitive fields selected by default.

### 9.1 User
| Field | Type | Notes |
|---|---|---|
| `name` | String | 2–60 |
| `email` | String? | lowercase, unique **sparse** |
| `phone` | String? | normalised `+8801…`, unique **sparse** |
| `passwordHash` | String | `select: false` |
| `role` | `"user" \| "admin"` | default `user` |
| `createdAt` | Date | |

Validation: at least one of `email`/`phone` required.

### 9.2 Template
| Field | Type | Notes |
|---|---|---|
| `slug` | String | unique, used for idempotent seed |
| `title` | String | Bangla title (+ `titleEn`) |
| `occasionType` | Enum | §5.2 |
| `thumbnailUrl` | String | |
| `layoutConfig` | Object | see below |
| `isActive` | Boolean | default `true` |

`layoutConfig` (validated by Zod on seed):
```jsonc
{
  "canvas": { "width": 600, "height": 800 },
  "layoutFamily": "triple-top",          // maps to an HTML template renderer
  "photoSlots": [
    { "id": "p1", "shape": "arch", "x": 20, "y": 24, "w": 170, "h": 210, "z": 3 }
  ],
  "textSlots": [
    { "id": "headline", "field": "headline", "x": 30, "y": 270, "w": 540, "h": 150,
      "font": "Hind Siliguri", "weight": 700, "minFont": 40, "maxFont": 96,
      "maxLines": 2, "align": "center" }
  ],
  "colorScheme": { "primary": "#006a4e", "secondary": "#f42a41", "accent": "#f7c948",
                   "textOnPrimary": "#ffffff", "textOnLight": "#1a1a1a" },
  "decorations": [ { "key": "paddy", "asset": "paddy.svg", "layer": "bg" } ],
  "footer": { "x": 0, "y": 700, "w": 600, "h": 100 },
  "maxPhotos": 3
}
```

### 9.3 Poster
| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId → User | indexed |
| `templateId` | ObjectId → Template | |
| `formData` | Object | name, designation, partyOrOrganization, union, thana, district, headline, subtext, creditLine |
| `uploadedPhotoUrls` | `[{url, publicId}]` | max 3 |
| `generatedImageUrl` | String? | |
| `status` | `"draft" \| "generating" \| "completed" \| "failed"` | |
| `stage` | String | queued/analyzing/rendering/uploading/done |
| `layoutPlan` | Object? | validated plan (reused on text-only regenerate) |
| `aiAssisted` | Boolean | false when fallback used |
| `retryCount` / `maxRetries` | Number | default 0 / 3 |
| `error` | `{code, message}?` | safe message only |
| `moderation` | `{status, flags[]}` | default `clear` |
| `consentAcceptedAt` | Date | |
| `exports` | `{png:{url,width,height,bytes}, pdf?:{url,bytes}}` | |
| `createdAt` | Date | |

### 9.4 GenerationLog
`posterId`, `userId`, `promptVersion`, `geminiPromptUsed`, `tokensUsed`, `latencyMs` (total), `geminiLatencyMs`, `renderLatencyMs`, `cacheHit`, `usedFallback`, `success`, `errorCode?`, `createdAt`.

### 9.5 AiCache
`key` (unique), `value` (scheme JSON), `expiresAt` (TTL index).

### 9.6 Indexes
- `User.email` (unique, sparse), `User.phone` (unique, sparse)
- `Template { occasionType: 1, isActive: 1 }`, `Template.slug` (unique)
- `Poster { userId: 1, createdAt: -1 }`, `Poster { status: 1, updatedAt: 1 }` (stuck-job sweep)
- `GenerationLog.posterId`, `AiCache.expiresAt` (TTL)

---

## 10. Security Requirements

| Threat | Mitigation |
|---|---|
| Credential stuffing / brute force | Auth rate limits, bcrypt cost 12, generic error messages |
| Token theft (XSS) | httpOnly cookie, strict CSP on web, no tokens in localStorage |
| CSRF | `SameSite=Lax`, JSON-only bodies, `Origin` header check on state-changing requests |
| **IDOR** (accessing others' posters) | Every poster route checks `poster.userId === req.user.id` (or admin). `/posters/user/:userId` enforces `userId === req.user.id` |
| NoSQL injection | Zod-validated inputs, `express-mongo-sanitize`, no raw query objects from clients |
| Mass assignment | Explicit field whitelisting via Zod; `role` can never be set by clients |
| Malicious uploads | Magic-byte check, re-encode with sharp, strip metadata, size/count limits |
| HTML/CSS injection into render | All user text escaped; AI output limited to enums/numbers/hex; strict CSP; request interception |
| SSRF | Browser has no network access; server-side fetches restricted to the Cloudinary host allow-list |
| Secrets exposure | Env-validated config, `.env` git-ignored, no secrets in logs/client bundle (`GEMINI_API_KEY` is server-only) |
| Privacy | EXIF/GPS stripped; photos only sent to Gemini for focal analysis (documented in README privacy note); user can delete posters and assets |
| HTTP hardening | `helmet`, HTTPS only, CORS allow-list, body-size limits, `trust proxy` configured for Render |
| Dependency risk | `npm audit` in CI, lockfile committed |

---

## 11. API Specification

Base path `/api`. All JSON unless noted. Errors use one envelope:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Human-readable", "details": [ { "path": "headline", "message": "…" } ] } }
```
Standard codes: `VALIDATION_ERROR (400)`, `UNAUTHORIZED (401)`, `FORBIDDEN (403)`, `NOT_FOUND (404)`, `CONFLICT (409)`, `CONTENT_REJECTED (422)`, `RATE_LIMITED (429)`, `INTERNAL (500)`.

### 11.1 Auth
| Method & Path | Auth | Body → Response |
|---|---|---|
| `POST /auth/register` | – | `{ name, email? \| phone?, password }` → `201 { user }` + cookie |
| `POST /auth/login` | – | `{ identifier, password }` → `200 { user }` + cookie |
| `GET /auth/me` | ✔ | → `200 { user }` |
| `POST /auth/logout` | ✔ | → `204` |

### 11.2 Templates
| Method & Path | Auth | Notes |
|---|---|---|
| `GET /templates?occasion=victory_day` | ✔ | Active templates only; returns `[{id, slug, title, occasionType, thumbnailUrl}]` |
| `GET /templates/:id` | ✔ | Full template incl. `layoutConfig` (slot counts used by the form) |

### 11.3 Upload
| Method & Path | Auth | Notes |
|---|---|---|
| `POST /upload` | ✔ | `multipart/form-data`, field `photos` (1–3 files) → `201 { photos: [{ url, publicId, width, height }] }` |

### 11.4 Posters
| Method & Path | Auth | Notes |
|---|---|---|
| `POST /posters` | ✔ | Body: `{ templateId, formData, photos: [{url, publicId}], consent: true }` → `202 { id, status: "generating", stage: "queued" }` |
| `GET /posters/:id` | ✔ owner | → `{ id, status, stage, generatedImageUrl?, formData, retriesLeft, aiAssisted, error? }` |
| `GET /posters/user/:userId` | ✔ owner/admin | `?page&limit` → `{ items, page, total }` |
| `POST /posters/:id/regenerate` | ✔ owner | Optional `{ formData?, photoOrder? }` → `202`; `409` if already generating; `429`/`403 RETRY_LIMIT_REACHED` when exhausted |
| `GET /posters/:id/download?format=png\|pdf` | ✔ owner | File stream with `Content-Disposition` |
| `DELETE /posters/:id` | ✔ owner | → `204` (also deletes stored assets) |

### 11.5 Utility
| `GET /health` | – | `{ status: "ok", db: "up", uptime }` |

### 11.6 Admin (P2 stub, `requireAdmin`)
`POST /admin/templates`, `PATCH /admin/templates/:id`, `DELETE /admin/templates/:id`, `GET /admin/posters` — implemented only if time remains; otherwise return `501 NOT_IMPLEMENTED` with a clear message.

---

## 12. Frontend, UI/UX & Visual Design Specification

### 12.1 Pages
| Route | Purpose | Key states |
|---|---|---|
| `/` | Landing: value prop, sample outputs, CTA | – |
| `/register`, `/login` | Auth forms | validation, server errors, loading |
| `/templates` | Occasion filter chips + template grid | loading skeleton, empty category, error/retry |
| `/create/[templateId]` | Poster form + photo uploader | field errors, upload progress, submit disabled while invalid |
| `/posters/[id]` | Progress → preview → edit/regenerate/download | `generating` (stepper), `completed`, `failed` (retry CTA), 404 |
| `/posters` | History grid | empty state, pagination, delete confirm |

Protected routes redirect to `/login?next=…`. Middleware checks the cookie presence; the API remains the real authority.

### 12.2 UX requirements
- **Progress stepper** mapped to `stage`: "ছবি প্রস্তুত → লেআউট → ছাপা হচ্ছে → সংরক্ষণ" (styled as a press run, §12.7.4).
- **Retries remaining** badge (e.g., "২টি রিজেনারেট বাকি").
- Download buttons: "PNG ডাউনলোড" (and "PDF" when available).
- Destructive actions (delete) require confirmation.
- Toasts for success/failure; no silent failures.
- Bangla numerals (০–৯) in UI display via one formatter utility; stored/API data stays ASCII digits.
- Skeletons for loading, friendly empty states, clear error copy with a retry action.
- Performance: `next/image` for thumbnails, lazy-load history, no layout shift on preview (3:4 aspect-ratio box reserved).

### 12.3 State & data fetching
TanStack Query for server state; polling via `refetchInterval` that stops on `completed|failed`; optimistic removal on delete with rollback.

### 12.4 Design direction — "ছাপাখানা" (the print shop)

**Concept.** Prochar Studio is not a "creative AI tool". It is a modern *chhapakhana* — the neighbourhood print shop where every wall poster in Bangladesh has always come from. The UI borrows from that world: newsprint paper, black ink, offset-print red, proof sheets with crop marks, rubber stamps, job tickets, ruled newspaper columns. Nothing in it is sparkly, glassy or gradient-based.

**Principles**
1. **Print, not screen.** The product's output is paper. The interface looks like it came off a press: flat colour, hard edges, ink borders, paper grain.
2. **Bangla first, not Bangla-translated.** Layouts are designed around Bangla text (taller line-height, larger sizes). English is secondary.
3. **Quiet political neutrality.** The UI palette is paper-and-ink first. It does not copy any party's brand colours as its dominant scheme.
4. **Honest AI.** AI is never branded with sparkles or "magic". The interface talks about layout, proofs and print — what actually happens.
5. **Speed for a rushed user.** One primary action per screen, large tap targets, no decorative friction.
6. **Real over generic.** Every visual choice should be traceable to Bangladeshi print culture or to a functional need, not to a template.

### 12.5 Visual identity & design tokens

#### 12.5.1 Colour
A deliberately small palette. Names are descriptive and religion/party-neutral.

| Token | Name | Hex | Role | Contrast note |
|---|---|---|---|---|
| `--paper` | Newsprint | `#F3EBDD` | Page background | — |
| `--paper-hi` | Fresh stock | `#FBF7EE` | Inputs, raised surfaces | — |
| `--ink` | Press ink | `#1B1A17` | Text, borders, hard shadows | 14.7:1 on paper |
| `--press-red` | Offset red | `#D9381E` | Primary buttons, stamps, key accents | White text on it 4.6:1; **not for small text on paper (3.9:1)** |
| `--press-red-deep` | Dried ink red | `#B42A14` | Links, small red text, error text | 5.4:1 on paper |
| `--paddy` | Paddy green | `#1F5A45` | Success, secondary actions, "completed" | 6.8:1 on paper |
| `--mustard` | Mustard-field yellow | `#E8A920` | Highlights, focus ring, selected states | Ink text on it 8.4:1 |
| `--lime-wash` | Wall lime-wash | `#D8D2C4` | Rules, disabled, skeletons | decorative only |

Rules: ink + paper cover ~85% of any screen; red appears once or twice per screen as the focal action; green only for success/secondary; mustard only as highlight/focus. **No gradients anywhere.** No pure white (`#FFF`) or pure black backgrounds. Single light theme in the MVP (dark mode is out of scope; tokens make it possible later).

#### 12.5.2 Typography
| Role | Font | Notes |
|---|---|---|
| Bangla display (headlines, wordmark) | **Anek Bangla** (variable; weight 700–800, width 100–125) | Expressive width axis gives a signboard/headline feel without looking decorative |
| Bangla + Latin body/UI | **Hind Siliguri** (400/500/600/700) | Highly legible on low-end Android screens; good Latin glyphs |
| Latin display (English headings, "STUDIO" in the wordmark) | **Archivo** (variable; wide widths, 700–800) | Reads like a painted signboard when set wide |
| Labels / tickets / dimensions | **IBM Plex Mono** (500) | Used *only* for Latin digits/codes: "JOB № 7F3A", "1800 × 2400 PX" |

- All fonts are OFL, **self-hosted via `next/font`** (no runtime Google request, no CLS). On build day, confirm each family and its Bangla coverage in Google Fonts and keep a fallback stack: `"Hind Siliguri", "Noto Sans Bengali", system-ui, sans-serif`.
- Poster fonts (§8.5: Hind Siliguri, Noto Sans/Serif Bengali, Tiro Bangla) are separate from UI fonts and are bundled on the server.
- **Bangla typesetting rules (non-negotiable):**
  - Body ≥ 16 px (17–18 px on mobile); line-height **1.65–1.75** for body, **1.3** for headlines (matras and ascenders collide at tighter values).
  - **No** letter-spacing, **no** `text-transform: uppercase`, **no** italics or faux-italics on Bangla (the script has none).
  - Never truncate Bangla mid-conjunct: use line clamping on whole words only, and let headline containers grow.
  - Emphasis = weight or a mustard "highlighter" underline, not italics.
- Type scale (mobile → desktop): Display 40/52 → 72/86 · H1 32 → 48 · H2 24 → 32 · H3 20 → 24 · Body 17 → 18 · Small 14 · Label (mono) 12, tracking +0.04em.

#### 12.5.3 Shape, borders, shadows, texture
| Element | Spec |
|---|---|
| Borders | **2 px solid ink** on interactive and container elements; 1 px `--lime-wash` for quiet rules |
| Radius | **2 px** everywhere (inputs, buttons, cards). Pills only for filter chips (full radius). No `rounded-xl/2xl` |
| Shadows | **Hard offset only:** `3px 3px 0 var(--ink)`. Never blurred or soft |
| Paper grain | Subtle SVG-noise overlay at ~4% opacity on `body` (inline data-URI, no image request) |
| Halftone | Dotted halftone pattern used only as a *decorative* fill on the landing hero and empty states (CSS radial-gradient dots in ink at 10–15%; this is a pattern, not a colour gradient) |
| Rules | Newspaper-style vertical column rules between desktop columns; double rule (3 px + 1 px) under page titles |
| Misregistration | Two-colour offset effect (red text offset 2 px behind ink text) used **once**, on the landing headline only |

#### 12.5.4 Brand mark
- **Glyph:** a **registration crosshair** (circle + cross) — the mark printers use to align colour plates. Used as the favicon (cream crosshair in a press-red circle) and as the separator in the wordmark.
- **Wordmark:** `প্রচার` in Anek Bangla ExtraBold + `STUDIO` in Archivo Wide, small, with the crosshair between them. Drawn as SVG; built in-house.
- **Footer colophon:** "প্রচারে: Prochar Studio" — a nod to the credit line printed on every poster.

#### 12.5.5 Iconography & ornament
- Functional icons: **Phosphor (Bold)** limited to ≈12 icons (upload, trash, download, refresh/regenerate, eye, check, warning, plus, user, logout, image, arrow). Stroke weight matched to the 2 px ink border language.
- Decorative ornaments (original SVG, drawn in-house, geometric alpana/nakshi-inspired borders, crop marks, registration marks, colour-bar strip, rubber-stamp roundels). **No emoji as icons. No sparkle/magic-wand iconography.**

#### 12.5.6 Motion
Purposeful, short, physical — things behave like ink and paper.
| Moment | Motion |
|---|---|
| Button press | Translate toward its shadow (−1,−1 → +2,+2) in 80 ms, like pressing a block |
| Generating | **Press-roller bar:** an ink-filled bar sweeps across the proof frame; stages tick like a counter. No spinners with gradients |
| Completed | Result "প্রস্তুত" **stamp** lands with a quick scale 1.15 → 1 and −3° rotation (180 ms) |
| Page/list reveal | Staggered fade-up, 120 ms, max 6 items |
| Toasts | Slide in from the bottom edge, 160 ms |

All motion is disabled/reduced under `prefers-reduced-motion`; no animation is essential to understanding.

#### 12.5.7 Token implementation
```css
:root{
  --paper:#F3EBDD; --paper-hi:#FBF7EE; --ink:#1B1A17;
  --press-red:#D9381E; --press-red-deep:#B42A14;
  --paddy:#1F5A45; --mustard:#E8A920; --lime-wash:#D8D2C4;
  --radius:2px; --bw:2px; --shadow-hard:3px 3px 0 var(--ink);
  --font-display-bn:"Anek Bangla",sans-serif;
  --font-body:"Hind Siliguri","Noto Sans Bengali",system-ui,sans-serif;
  --font-display-en:"Archivo",sans-serif; --font-mono:"IBM Plex Mono",monospace;
}
```
Tailwind `theme.extend` maps `colors`, `fontFamily`, `borderRadius` (`DEFAULT: 2px`), and `boxShadow.hard` to these variables so components never hard-code a hex value.

### 12.6 Layout & component specification

**Grid.** Mobile 4-col (16 px margins) · Tablet ≥ 640 px 8-col · Desktop ≥ 1024 px 12-col, max-width 1200 px. Breakpoints: 360 / 640 / 1024 / 1280. Layouts are intentionally **asymmetric** (e.g., 7/5 splits, oversized numerals in the margin) rather than centred-stack templates.

| Component | Spec |
|---|---|
| **Button – primary** | `--press-red` fill, white label (Hind Siliguri 700), 2 px ink border, hard shadow; hover lifts 1 px; active presses; min height 48 px |
| **Button – secondary** | `--paper-hi` fill, ink label, same border/shadow; **destructive** = ink border + `--press-red-deep` label with confirm dialog |
| **Input / Textarea** | `--paper-hi` bg, 2 px ink border, label **above** (always visible, never placeholder-only), helper text under, error = `--press-red-deep` text + warning icon + red left bar; Bangla inputs `lang="bn"`, 18 px |
| **Photo uploader** | Dashed ink border drop-zone that becomes a row of "contact-sheet" thumbnails with slot numbers (১/২/৩), remove and reorder controls |
| **Filter chip** | Pill, ink outline; selected = ink fill, paper text |
| **Template "Proof" card** | Thumbnail on paper-hi with crop marks at corners, mono caption (`TEMPLATE № 02`), Bangla title, ±1° rotation on desktop only |
| **Stamp badge** | Rotated −3° roundel/rect, 2 px border, uppercase *Latin* or Bangla bold: প্রস্তুত (paddy), ব্যর্থ (red-deep), চলছে (mustard) |
| **Stepper (press run)** | 4 stations on a ruled line; current station filled mustard; completed = ink check; ties directly to `stage` |
| **Toast** | Paper-hi strip, 2 px ink border, coloured left bar (paddy/red-deep/mustard), icon + text |
| **Dialog** | Centered (bottom sheet on mobile), hard shadow, focus-trapped, Esc to close |
| **Skeleton** | Diagonal hatch pattern on lime-wash (no shimmer gradient) |
| **Empty state** | Halftone illustration block + one-line Bangla message + one action |

### 12.7 Screen designs (mobile-first wireframes)

#### 12.7.1 Landing `/`
```
┌────────────────────────────────────────────┐
│ ⊕ প্রচার STUDIO                 [লগইন]     │  ← ink rule below
├────────────────────────────────────────────┤
│  আপনার প্রচার,                             │  Display (Anek Bangla), misregistration
│  আপনার পোস্টার                              │  offset on this line only
│  ছবি দিন, নাম লিখুন — ছাপার উপযোগী          │  Body
│  পোস্টার পান কয়েক মিনিটে।                   │
│  [ পোস্টার বানান → ]                        │  primary button
│   ┌─────┐┌─────┐┌─────┐  ← 3 sample proofs, │  FICTIONAL names & silhouette photos,
│   │proof││proof││proof│    crop marks, halftone│ never real politicians
├────────────────────────────────────────────┤
│ ১  ফর্ম পূরণ   │ ২  আমরা সাজাই │ ৩  ডাউনলোড   │  ruled 3-column table with huge
│  নাম, ছবি…    │ লেআউট ও ছাপা │ PNG, ১৮০০×২৪০০│  Bangla numerals — NOT icon cards
├────────────────────────────────────────────┤
│ উপলক্ষ  ·  বিজয় দিবস ........ ০১           │  occasion index styled like a
│         ·  শোক/স্মরণ ......... ০২           │  newspaper classified list
├────────────────────────────────────────────┤
│ প্রচারে: Prochar Studio  ·  গোপনীয়তা        │  colophon footer
└────────────────────────────────────────────┘
```

#### 12.7.2 Template gallery `/templates`
Sticky chip bar (সব · বিজয় দিবস · শোক/স্মরণ · নির্বাচনী প্রচার · শুভেচ্ছা · ঈদ/উৎসব). Grid: 2 columns on mobile, 3 on tablet, 4 on desktop, of Proof cards. Tapping a card goes to `/create/[id]`. Empty category: halftone block + "এই বিভাগের টেমপ্লেট শিগগিরই আসছে।"

#### 12.7.3 Create form `/create/[templateId]`
```
┌ ← টেমপ্লেট বদলান        TEMPLATE № 02 ┐
│ ═══ নতুন পোস্টার ═══                    │  double rule
│ ১ · আপনার পরিচয়                       │
│   নাম [__________]  পদবি [__________]   │
│   দল/সংগঠন [__________]                 │
│   ইউনিয়ন · থানা · জেলা [___][___][___] │
│ ২ · ছবি (১–৩টি)                         │
│   [ + ছবি দিন ]  [১][২][৩]  slot labels │
│ ৩ · শিরোনাম                             │
│   শিরোনাম (বাংলায়) [______________]     │
│   ছোট বার্তা (ঐচ্ছিক) [____________]     │
│   প্রচারে লাইন [স্বয়ংক্রিয়, বদলানো যাবে] │
│ ☐ ছবি ও চিহ্ন ব্যবহারের অনুমতি আমার আছে │
│ [ পোস্টার তৈরি করুন ]  (sticky on mobile)│
└────────────────────────────────────────┘
```
Desktop: form left (7 cols) + sticky right column (5 cols) with the template proof and a **slot diagram** showing which uploaded photo goes in which slot (P1). Inline character counters (০/৬০). The consent line is required before the button enables.

#### 12.7.4 Generating `/posters/[id]` (status = generating)
```
        ┌─────── proof frame with crop marks ───────┐
        │   ░░░░░░ press-roller ink bar sweeping ░░░ │
        └────────────────────────────────────────────┘
   ①ছবি প্রস্তুত ──②লেআউট ──③ছাপা হচ্ছে ──④সংরক্ষণ    ← current station mustard
   JOB № 7F3A · সাধারণত ১০–২০ সেকেন্ড লাগে
```
Failure: proof frame turns ink-dashed, "ব্যর্থ" stamp, plain-language cause + **[আবার চেষ্টা করুন]** (does not consume a retry).

#### 12.7.5 Result `/posters/[id]` (status = completed)
Mobile: stacked — proof (3:4, full width, crop marks, colour-bar strip), stamp "প্রস্তুত", primary **[PNG ডাউনলোড]**, secondary [PDF], then an accordion "লেখা বদলান" with fields + **[আবার ছাপুন · ২টি বাকি]**. Desktop: proof left (6 cols), controls right (6 cols). A small mono caption shows `1800 × 2400 PX · PNG`. If `aiAssisted=false`, show a quiet note: "টেমপ্লেটের ডিফল্ট সাজ ব্যবহার করা হয়েছে।" (no alarm).

#### 12.7.6 History `/posters`
"Contact sheet" grid of thumbnails, each with mono `JOB № XXXX`, Bangla headline (clamped at whole words), date, status stamp, and actions (খুলুন · ডাউনলোড · মুছুন). Empty state: halftone block + "এখনো কোনো পোস্টার নেই" + create button. Paginated (12 per page).

#### 12.7.7 Auth `/login`, `/register`
Single column on paper with a double-ruled title. One field group, one primary button, a text link to the other form. Identifier field accepts email **or** phone (hint shows both formats). No social-login buttons, no illustration.

### 12.8 Voice & microcopy
Plain, respectful, local Bangla; short verbs; no tech jargon, no "AI magic" language.
| Context | Copy |
|---|---|
| Primary CTA | পোস্টার তৈরি করুন |
| Generating | আপনার পোস্টার ছাপার জন্য সাজানো হচ্ছে… |
| Done | প্রস্তুত! ডাউনলোড করে ছাপিয়ে নিন। |
| Retries | আরও ২ বার আবার ছাপতে পারবেন |
| Retries exhausted | আবার ছাপার সুযোগ শেষ। নতুন পোস্টার বানাতে পারেন। |
| Validation | শিরোনাম অন্তত ২ অক্ষরের হতে হবে। |
| Content rejected | এই লেখাটি আমরা ছাপতে পারছি না। অনুগ্রহ করে বদলে আবার চেষ্টা করুন। |
| Network/server error | কিছু একটা ভুল হয়েছে। একটু পরে আবার চেষ্টা করুন। |
| Delete confirm | এই পোস্টারটি মুছে ফেলবেন? এটি আর ফিরিয়ে আনা যাবে না। |
Every string lives in a single `messages/bn.ts` (with `en.ts` secondary) so copy is reviewable in one place.

### 12.9 Accessibility & responsive behaviour (design level)
- Contrast: all text pairs meet WCAG AA (table in §12.5.1); red-on-paper is limited to large text/UI components.
- **Focus ring:** 3 px `--mustard` outline with 2 px ink offset ring — visible on every interactive element; never removed.
- Tap targets ≥ 48 × 48 px; spacing ≥ 8 px between adjacent targets.
- Colour is never the only signal: statuses use stamp text + icon + colour; errors use icon + text.
- Forms: visible labels, `aria-describedby` for hints/errors, error summary focused on submit failure, `lang="bn"` on Bangla content and `<html lang="bn">`.
- Generating state announced via `aria-live="polite"`; stepper exposes `aria-current="step"`.
- Reduced-motion and keyboard-only paths tested; preview image has meaningful `alt` (headline + occasion).
- Performance for low-end devices: system-font fallback while fonts swap, images via `next/image`, no heavy animation libraries, grain/halftone as inline CSS/SVG.

### 12.10 Originality / "anti-slop" checklist
The build must **fail review** if any of these appear:
- [ ] Purple/blue-to-pink gradients, gradient text, glow effects, or blurred blobs
- [ ] Inter / Poppins / default system look as the visible identity
- [ ] Glassmorphism, frosted cards, soft blurred drop shadows, `rounded-2xl` everywhere
- [ ] Emoji used as icons; "✨ AI", sparkles, magic-wand, robot/brain imagery
- [ ] Centered hero + three-icon-card feature grid + gradient CTA banner
- [ ] Stock photos of smiling people or real politicians in marketing content (use fictional names and silhouette placeholders)
- [ ] Default shadcn/Material look shipped without restyling to the tokens above
- [ ] Lorem ipsum, placeholder names like "John Doe", or English-only screens
- [ ] More than **5 colours** or more than **2 border-radius values** in the UI

**Passes review when:** (1) with the logo covered, a screenshot is still recognisably *this* product; (2) the squint test shows ink/paper/red hierarchy; (3) every decorative element can be explained by print culture or function.

### 12.11 Seed template art direction (poster output)
These are the *posters themselves* (rendered in §8.5), distinct from the app UI. All artwork is original/openly licensed (§5.2 FR-T5).
| Template | Mood | Palette (default, AI may adapt within limits) | Motifs |
|---|---|---|---|
| **Victory Day** (বিজয় দিবস) | Proud, celebratory | Paddy green, offset red, mustard, paper | Paddy fields, doves, flag-wave band, floral border, large headline on a colour block |
| **Condolence / Tribute** (শোক/স্মরণ) | Solemn, quiet | Ink, warm grey, paper, one muted accent | Black border, single white dove, generous empty space, small serif headline (Tiro Bangla), photo in arch frame |
| **Campaign** (নির্বাচনী প্রচার) | Bold, energetic | High-contrast ink + one saturated colour + mustard | Big slab headline, diagonal colour band, photo cut-in frames, strong footer bar |

All three keep the mandatory footer bar with name, designation, organization, location and the "প্রচারে" line.

### 12.12 Frontend implementation notes
- **Structure:** `components/ui/*` (design-system primitives built from tokens), `components/poster/*` (feature components), `messages/{bn,en}.ts`, `lib/format.ts` (Bangla numerals/dates), `styles/tokens.css`.
- No component library is shipped unstyled; if headless primitives are used (e.g. Radix for Dialog/Focus trap) they are fully restyled to §12.5–12.6.
- Fonts via `next/font/google` with `display: "swap"`, `subset: ["bengali","latin"]`, preloaded for display + body only.
- **Design QA gate** before deploy: screenshot each of the 6 screens at 360, 768 and 1280 px and compare against §12.7 and §12.10; fix before final submission.
- Time-box: tokens + primitives ≈ 2 h (Sat morning); polish pass ≈ 1.5 h (Sun morning). If behind schedule, cut texture/ornament and motion first — **never** the palette, fonts, hard-shadow system or Bangla typesetting rules, since those carry the identity at near-zero cost.


---

## 13. Testing Strategy

### 13.1 Unit
- Zod schemas (valid/invalid Bangla, phone normalisation, password rules)
- `layout.service` clamp/merge/contrast logic
- Text-fit algorithm bounds
- Blocklist matcher, rate-limit config, `requireAdmin`

### 13.2 Integration (supertest + mongodb-memory-server, Gemini/Cloudinary mocked)
- Auth flow, duplicate registration, wrong password
- **Ownership tests**: user B cannot read/delete/regenerate/download user A's poster; cannot list A's history
- `POST /posters` → 202 → poll to `completed`
- Gemini failure → `completed` with `aiAssisted: false`
- Regenerate limit enforcement; failed generation doesn't consume a retry
- Upload rejects: wrong type, fake extension, > 5 MB, > 3 files

### 13.3 Render tests
- **Golden Bangla test:** render a fixed fixture containing tricky conjuncts (e.g., "বিজয়", "স্বাধীনতা", "ক্ষ", "দ্ধ", "শ্রদ্ধাঞ্জলি") and assert (a) output dimensions = 1800×2400, (b) all fonts loaded, (c) image matches a stored baseline within a small pixel tolerance.
- Escape test: names containing `<script>`, `"` and `&` render as literal text.

### 13.4 Manual acceptance script (for reviewers, included in README)
1. Register → log in.
2. Open each of the 3 seeded templates → generate a poster with 1, 2 and 3 photos.
3. Edit headline → regenerate; confirm counter decrements; exhaust retries.
4. Download PNG; check ≥ 1200×1600 and Bangla correctness.
5. View history; re-download; delete.
6. Try another user's poster URL → expect 403/404.
7. Disable `GEMINI_API_KEY` → generation still succeeds (fallback).

---

## 14. Scope Boundaries

**In MVP (P0):** auth, upload, 3 seeded templates, form, Gemini-assisted layout with fallback, Puppeteer render, PNG export, polling, preview + limited regenerate, history, delete, rate limiting, content guardrails (consent + blocklist + credit line), responsive UI, deployment.

**P1 (if ahead):** PDF export, Playwright smoke test, GitHub Actions CI (lint + typecheck + tests), photo reorder drag-and-drop.

**P2 / post-MVP (documented, not built):** admin template CRUD UI, moderation queue UI, usage analytics dashboard, bulk CSV generation, bKash/Nagad payments, watermark tiers, OTP login, Bangla font picker, 2-up/3-up layout chooser, automatic background removal, public sharing with review step, queue (BullMQ) for jobs.

---

## 15. Delivery Plan (Oct 01 → Oct 04, 2026)

| Day | Focus | Exit criteria |
|---|---|---|
| **Thu Oct 01** | Monorepo, TS configs, env validation, Mongo connection, models, **auth (register/login/me/logout)**, shared Zod package, upload endpoint + Cloudinary provider | Auth + upload tested via supertest; models indexed |
| **Fri Oct 02** | Template schema + **seed 3 templates + assets**, **render service** (fonts, HTML templates, text-fit, PNG), Gemini service with schema + fallback, `POST /posters` + polling | One template renders correct Bangla end-to-end from a script and via API |
| **Sat Oct 03** | **Design tokens + base components first (≈2 h: fonts, palette, Button/Input/Chip/Proof/Stamp, §12.5–12.6)**, then Next.js app: auth pages, template gallery, form + uploader, progress/preview, regenerate, history, delete; rate limiting; responsive pass | Full user flow works locally on mobile viewport |
| **Sun Oct 04** | Dockerfile, deploy (Atlas → Render → Vercel), env wiring, production smoke test, README, `.env.example`, demo account, sample outputs, final checklist; **submit by ~6 PM** | All items in §16 ticked; links verified in an incognito window |

**Cut-line rule:** if behind schedule at end of Saturday, drop P1 items first, then simplify to 2 templates. Never cut: Bangla correctness, fallback path, ownership checks, deployment, README.

---

## 16. Submission Checklist

**Code & repo**
- [ ] Public/accessible GitHub repo with clean commit history (conventional commits)
- [ ] README titled "Prochar Studio": overview, architecture diagram, setup, env table, seed command, test command, deploy notes, known limitations
- [ ] `.env.example` (no real secrets) and no secrets in git history
- [ ] `ASSETS.md` listing licences for fonts and artwork
- [ ] This `PRD.md` committed at repo root

**Product**
- [ ] Register/login/logout work; protected routes enforced
- [ ] 3 templates seeded, visible, filterable
- [ ] Form validation (client + server), 1–3 photo upload
- [ ] Generation works with Gemini **and** with Gemini disabled
- [ ] Preview, text edit, regenerate with limit
- [ ] PNG ≥ 1200×1600 downloads correctly; Bangla verified
- [ ] History lists, re-downloads, deletes
- [ ] Rate limiting verified (429)
- [ ] Mobile layout verified at 360 px
- [ ] Visual identity matches §12.5 (tokens, fonts, no default-template look); anti-slop checklist §12.10 passed
- [ ] Lighthouse mobile: Accessibility ≥ 95, Best Practices ≥ 95, Performance ≥ 85; CLS < 0.1

**Deployment**
- [ ] Frontend live on Vercel; API live on Render; DB on Atlas (IP allow-list configured)
- [ ] `/api/health` green; cold-start note in README
- [ ] Demo credentials provided in submission message
- [ ] 2–3 minute screen recording (optional but recommended)

**Quality**
- [ ] `npm run lint`, `typecheck`, `test` all pass
- [ ] No `console.log` noise, no unused code, no TODOs without context

---

## 17. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Bangla text corrupted by AI image gen | High (if Option A) | Critical | **Option B** — text rendered by HTML engine with bundled fonts |
| Puppeteer fails on host (missing libs/fonts, OOM) | Medium | High | Docker image with Chromium + fonts; concurrency cap; one shared browser; test the container locally before deploy |
| Gemini quota/latency/safety blocks | Medium | Medium | Timeouts, retry, **deterministic fallback**, caching, per-user caps |
| Render free-tier cold start during review | High | Medium | Document in README; warm the service before submitting |
| Time overrun (4 days) | Medium | High | Strict P0/P1/P2 split and cut-line rule (§15) |
| Name clash with existing "Prochar" businesses/apps (email-SMS firm, ad agency, a Kolkata poster app) | Medium | Low | Use the full name "Prochar Studio", distinct branding/logo, no claim of affiliation; check domain/GitHub/app-store availability before launch |
| Misuse of political content | Medium | High | Consent, blocklist, mandatory credit line, private-by-default posters, moderation fields ready for admin queue |
| Copyright/trademark of artwork or party symbols | Medium | Medium | Original/openly licensed assets only; no party logos bundled; user-supplied symbols are the user's responsibility (consent) |
| Cookie/auth issues across Vercel and Render domains | Medium | Medium | Same-origin proxy via Next.js rewrites |
| Mongo Atlas connection blocked | Low | High | Allow `0.0.0.0/0` for the assessment (documented) or Render outbound IPs; use a restricted DB user |

---

## 18. Assumptions & Open Questions

**Assumptions**
1. Deadline time is Bangladesh Standard Time (BST, UTC+6); target submission is earlier regardless.
2. The reviewer wants a working deployed link plus the repo; a README is expected.
3. "Print-ready" means ≥ 1200×1600 px PNG at 3:4; CMYK/bleed is out of scope.
4. A single language of text per poster (Bangla headline); mixed English words are supported by the same fonts.
5. Seed templates use original artwork stylised after the *genre* of the samples, not copies of them.

**Questions to confirm with the hiring team (non-blocking)**
1. Is PDF export expected for the MVP review? (Breakdown defers it; brief lists it under core features. Plan: PDF is P1.)
2. Is email-or-phone password auth sufficient, or is OTP expected? (Plan: password only.)
3. Any preferred hosting for the API beyond "Vercel/Render"? (Plan: Render Docker.)

---

## 19. Environment Variables (`.env.example`)

**API (`apps/api`)**
```
NODE_ENV=production
PORT=8080
MONGODB_URI=
JWT_SECRET=                 # ≥ 32 chars
JWT_EXPIRES_IN=7d
COOKIE_DOMAIN=
CLIENT_ORIGIN=https://<your-vercel-app>.vercel.app
GEMINI_API_KEY=
GEMINI_MODEL=               # verify current model ID in Google AI docs
GEMINI_TIMEOUT_MS=20000
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
MAX_REGENERATIONS=3
GEN_RATE_PER_MIN=5
GEN_RATE_PER_DAY=30
PUPPETEER_EXECUTABLE_PATH=  # set in Docker image
LOG_LEVEL=info
```

**Web (`apps/web`)**
```
API_URL=https://<your-render-service>.onrender.com   # used by Next.js rewrites (server-side)
```

---

## 20. Glossary
- **প্রচারে** — "Published/promoted by": the credit line printed on political posters.
- **Layout plan** — validated JSON from Gemini describing focal points, colours and decorations.
- **Fallback plan** — the template's default plan used when AI is unavailable.
- **Slot** — a predefined rectangle in a template for a photo or a text field.
- **Prochar Studio** — the product name (প্রচার স্টুডিও).
- **Option B** — AI-assisted layout + deterministic HTML render (this project's approach).
