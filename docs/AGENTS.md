# AGENTS.md — Agent Rules of Engagement & Operating Principles

> **Context:** This repository contains **Prochar Studio** (প্রচার স্টুডিও) — an AI-assisted Bangladeshi political poster generator built as a rigorous hiring assessment. All AI agents working in this repository must strictly adhere to the instructions, constraints, and process rules set forth in this document.

---

## 1. Authority Order (Highest Wins on Any Conflict)

1. `docs/SEED_TEMPLATES.md` — template geometry, fonts, palettes, assets
2. `docs/ASSETS.md` — fonts, icons, artwork, licences
3. `docs/PRD.md` — everything else
4. `docs/AGENTS.md` (this file) — process rules
5. Prompt instructions — task sequencing only

*If two sources conflict and the authority order does not resolve it, **STOP and ask the human**. Do not guess.*

---

## 2. Technology Stack (Locked — Do Not Deviate)

- **Runtime:** Node 20 LTS
- **Monorepo:** npm workspaces
- **Language:** TypeScript, strict mode
- **Web:** Next.js 14 App Router, Tailwind CSS (tokens from PRD §12.5)
- **API:** Express.js
- **Database:** MongoDB Atlas + Mongoose
- **Validation:** Zod (shared package `@prochar/shared`)
- **AI:** `@google/genai` (v2.25.0), model from env `GEMINI_MODEL`
- **Render:** Puppeteer (Chromium)
- **Images:** sharp
- **Storage:** Cloudinary behind a `StorageProvider` interface
- **Auth:** JWT (HS256) + bcrypt cost 12
- **Tests:** Vitest + supertest + mongodb-memory-server
- **Logging:** pino

### Forbidden Dependencies (Do Not Add, Do Not Suggest)
- **No** Redis, BullMQ, Prisma, tRPC
- **No** shadcn (as shipped defaults), Chakra, MUI, Material UI, Tailwind UI
- **No** Framer Motion, GSAP, Lottie, or any external animation library
- **No** CSS-in-JS libraries
- **No** Inter, Poppins fonts

---

## 3. Scope Rules & Boundaries

- **Implement P0 only** (PRD §5). P1 only if P0 is complete AND verified.
- **NEVER implement P2.** Admin routes return `501 NOT_IMPLEMENTED` with a clear message, nothing more.
- **Never invent** political symbols, party logos, or real people's names. Use fictional names ("নমুনা নাম") and the silhouette placeholder (`placeholder_person.svg`).
- **Never invent** fonts, artwork, or asset filenames. Use `docs/ASSETS.md` and `docs/SEED_TEMPLATES.md` exactly.
- **Never change coordinates** in `docs/SEED_TEMPLATES.md` without editing the file and re-running the fit lint.
- **Bangla Strings:** All Bangla UI strings live in `messages/bn.ts`. **No inline Bangla in components.** English strings live in `messages/en.ts`.
- **Sanitization:** Escape every user string before HTML insertion. Never insert user text into attributes, styles, or scripts.
- **Logging:** No `console.log` anywhere in application code; use the `pino` logger exclusively.
- **TODOs:** No TODOs without a linked issue number in the comment.

---

## 4. Special Operational Guardrails

- **Pre-Commit Verification:** Run `npm run lint && npm run typecheck && npm run test` before every commit.
- **Template Geometry:** Never change `SEED_TEMPLATES.md` coordinates without editing the file and re-running the fit lint.
- **Gemini Model Resolution:** If `GEMINI_MODEL` is unset, read `docs/GEMINI_SPEC.md` §1. If still unset, stop and ask.
- **Package Installation:** If a listed npm package fails to install, stop and report — do not substitute.
- **Anti-Slop Reminders (PRD §12.10):**
  - No purple/blue-to-pink gradients, gradient text, glow effects, or blurred blobs.
  - No Inter / Poppins / default system look.
  - No glassmorphism, frosted cards, soft blurred drop shadows, or `rounded-xl/2xl` everywhere.
  - No emoji as functional icons; no sparkles, "✨ AI", magic-wands, or robot imagery.
  - No centered-hero + three-icon-card generic layouts.
  - No stock photos of smiling models or real politicians.
  - No default unstyled UI libraries.
  - Maximum of 5 colors and 2 border-radius values across the UI.

---

## 5. Working Style & Chunk Cadence

- Work in small, verifiable chunks. After each sub-task, run:
  ```bash
  npm run lint && npm run typecheck && npm run test
  ```
  Only then move on. If any command fails, fix it before proceeding.
- Commit after each passing chunk with a conventional-commit message.
- If you are unsure about anything, STOP and ask the human. Asking is always cheaper than rework. Guessing is a failure mode.

### Standard Progress Reporting Format
Report progress in this exact format after each chunk:
```text
[CHUNK N] <name>
DONE: <what was built>
FILES: <paths created/modified>
VERIFIED: <command run> → <result>
BLOCKED: <none | question>
```

### 5.1 Git Workflow (Professional — Mandatory)

**Branch discipline**
- Default branch is `main`. Never commit directly to `main` after the initial bootstrap commit.
- Work on a feature branch per chunk: `feat/1.1a-workspace-skeleton`, `feat/1.3-shared-schemas`, `fix/4.2-text-fit-lines`.
- Branch naming: `<type>/<chunk-id>-<short-slug>` where `<type>` ∈ {feat, fix, chore, docs, refactor, test}.
- Merge to `main` only after the chunk's verification command passes.

**Commit discipline**
- Never `git commit -am`. Always stage explicitly after reviewing `git status`.
- One commit per logical change. Do not bundle unrelated edits.
- Conventional Commits format is mandatory:
    `<type>(<scope>): <subject>`
  where `<type>` ∈ {feat, fix, chore, docs, refactor, test, style, perf, ci}
  and `<scope>` ∈ {web, api, shared, docs, docker, seed, render, gemini, auth, upload, poster}.
  `<subject>`: imperative, lowercase, ≤ 72 chars, no trailing period.
  Examples:
    `feat(shared): add poster form zod schema`
    `fix(render): use Range API for line count`
    `docs(agents): add git workflow rules`
    `chore(docker): split prod-deps stage`
- Never commit secrets, .env, node_modules, dist, .local-storage, or coverage. Verify .gitignore covers these before the first commit.

**Push discipline**
- After every commit that passes verification: `git push -u origin <branch>`.
- After a chunk merges to main: `git push origin main`.
- NEVER force-push to main. NEVER amend a pushed commit.
- If a push fails, STOP and report. Do not `--force` or `--no-verify`.

**Pre-commit gate (mandatory order, no exceptions)**
  1. `npm run lint && npm run typecheck && npm run test`
  2. `git status`
  3. `git add <only intended paths>`
  4. `git commit -m "<conventional message>"`
  5. `git push -u origin <branch>`
If step 1 fails, fix it. Do not commit broken code. Do not use `--no-verify`.

**Reporting**
After each push, include in the chunk report:
    `GIT: <branch> @ <short-sha> → pushed to origin`
If any step in the pre-commit gate was skipped or failed, say so explicitly.

