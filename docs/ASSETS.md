# ASSETS.md — Fonts, Artwork, Icons & Licences

> **Rule for AI coding agents:** Do **not** download fonts or artwork from anywhere else. Use **exactly** the families, packages and files listed here. If an `npm install` of a listed package fails, **stop and report it** — do not substitute a different font.

## 1. Fonts

All fonts are licensed under the **SIL Open Font License 1.1 (OFL)** and may be bundled and self-hosted.

| Family | Used for | Where | Install / import | Weights |
|---|---|---|---|---|
| **Anek Bangla** | UI display (Bangla headlines, wordmark) | Web app | `next/font/google` → `Anek_Bangla` (subsets `bengali`, `latin`; variable, axes `wdth`, `wght`) | 700–800 |
| **Hind Siliguri** | UI body **and** poster text | Web app + renderer | Web: `Hind_Siliguri`. Renderer: `npm i @fontsource/hind-siliguri` | 400, 500, 600, 700 |
| **Archivo** | UI Latin display / "STUDIO" in wordmark | Web app | `next/font/google` → `Archivo` (axes `wdth`) | 700–800 |
| **IBM Plex Mono** | UI labels (Latin digits/codes only) | Web app | `next/font/google` → `IBM_Plex_Mono` | 500 |
| **Noto Sans Bengali** | Poster subtext, UI fallback | Renderer (+ web fallback) | `npm i @fontsource/noto-sans-bengali` | 400, 500, 600, 700 |
| **Noto Serif Bengali** | Poster subtext (condolence) | Renderer | `npm i @fontsource/noto-serif-bengali` | 400, 700 |
| **Tiro Bangla** | Poster headline (condolence) | Renderer | `npm i @fontsource/tiro-bangla` | 400 |

### How each side loads fonts
- **Web app:** `next/font/google` (self-hosted at build time, `display: "swap"`, subsets `["bengali","latin"]`). Fallback stack: `"Hind Siliguri","Noto Sans Bengali",system-ui,sans-serif`.
- **Poster renderer (API):** a `fonts.service.ts` reads each Fontsource package's CSS (`node_modules/@fontsource/<id>/<weight>.css`), keeps only the `bengali` and `latin` `@font-face` blocks **with their own `unicode-range` values (do not retype them)**, rewrites each `url(...)` to a base64 `data:font/woff2` URI, and caches the result in memory. Only faces actually used by the chosen template are injected into the page.
- **Docker fallback fonts:** `fonts-beng` and `fonts-noto-core` are installed in the image purely as an emergency system fallback; the renderer must still pass the "custom font used" check (RENDERER_SPEC §8).

## 2. Icons
- **Phosphor Icons (Bold weight)** — MIT licence — `@phosphor-icons/react`. Limit to ≈ 12 icons (upload, trash, download, refresh, eye, check, warning, plus, user, sign-out, image, arrow-right).

## 3. Artwork (poster decorations, UI ornaments)
- All artwork is **original, authored for this project** (simple geometric SVG). No third-party illustration, no party logos, no real people.
- If final artwork is not ready, the agent **must create simple original geometric placeholders** matching the filenames, sizes and descriptions in `docs/SEED_TEMPLATES.md` §6, and record every one below as `PLACEHOLDER`.

| Asset path (under `apps/api/assets/`) | Status | Author | Licence |
|---|---|---|---|
| `templates/shared/placeholder_person.svg` | PLACEHOLDER | Project | Project (all rights reserved / replace later) |
| `templates/victory-day-classic/*` (5 files) | PLACEHOLDER | Project | Project |
| `templates/condolence-tribute/*` (3 files) | PLACEHOLDER | Project | Project |
| `templates/campaign-bold/*` (5 files) | PLACEHOLDER | Project | Project |

Update the Status column to `FINAL` when a placeholder is replaced by finished artwork.

## 4. Sample content policy
Sample posters, thumbnails and marketing screenshots use **fictional names** ("নমুনা নাম") and the neutral `placeholder_person.svg` silhouette — never real politicians or real party symbols.

## 5. Third-party code
Listed in `package.json`; licences are checked with `npx license-checker --summary` before submission (all must be permissive: MIT/Apache-2.0/BSD/ISC/OFL).
