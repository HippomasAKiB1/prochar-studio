# SEED_TEMPLATES.md — Exact Template Specs for Prochar Studio

> **Authority:** For anything about template geometry, fonts, slot sizes, palettes and assets, **this file wins** over `PRD.md`. **Do not invent or adjust coordinates.** If a lint in §7 fails, fix by changing a number here (and in the seed JSON) — not by guessing elsewhere.

All coordinates are in **canvas units**: the canvas is **600 × 800**. The renderer screenshots at `deviceScaleFactor: 3` → **1800 × 2400 px**.

---

## 1. `layoutConfig` schema (v1)

```ts
type Token = "$background" | "$primary" | "$secondary" | "$accent" | "$textOnPrimary" | "$textOnLight";
type Hex = `#${string}`;                        // #RRGGBB only
type Tier = "low" | "medium" | "high";

interface TemplateLayoutConfig {
  schemaVersion: 1;
  canvas: { width: 600; height: 800 };
  layoutFamily: "triple-top" | "memorial-arch" | "banner-diagonal";
  colorScheme: { background: Hex; primary: Hex; secondary: Hex; accent: Hex; textOnPrimary: Hex; textOnLight: Hex };
  /** AI palette is rejected (template palette used) if ANY pair is below `min` (WCAG contrast). */
  contrastPairs: { fg: keyof ColorScheme; bg: keyof ColorScheme; min: number }[];
  /** Painted first, in array order (z-index 0..9). */
  layers: Layer[];
  photoSlots: PhotoSlot[];
  /** photo i (upload order) -> slot id, per photo count. */
  photoAssignment: { "1": string[]; "2": string[]; "3": string[] };
  textSlots: TextSlot[];                         // template-specific slots; footer slots are added from the preset
  footer: { preset: "standard-v1"; fill: Token; topRule: { height: number; color: Token } };
  decorations: Decoration[];
  aiAllowedDecorations: string[];                // == decorations[].key
  maxPhotos: 3;
}

type Layer =
  | { id: string; type: "rect";  x: number; y: number; w: number; h: number; fill: Token }
  | { id: string; type: "frame"; x: number; y: number; w: number; h: number; stroke: { width: number; color: Token } }
  | { id: string; type: "asset"; asset: string; x: number; y: number; w: number; h: number };

interface PhotoSlot {
  id: string; shape: "arch" | "circle" | "rounded" | "rect";
  x: number; y: number; w: number; h: number; z: number;       // z: 0..9 within photos
  radius?: number;                                              // for "rounded"
  border: { width: number; color: Token };
  filter?: "grayscale(0.85)";                                   // allow-listed values only
}

interface TextSlot {
  id: string;
  source: "headline" | "subtext" | "name" | "designationOrg" | "location" | "credit";
  x: number; y: number; w: number; h: number;
  fontFamily: "Hind Siliguri" | "Noto Sans Bengali" | "Noto Serif Bengali" | "Tiro Bangla";
  fontWeight: 400 | 500 | 600 | 700;
  minFont: number; maxFont: number; maxLines: number; lineHeight: number;
  align: "left" | "center" | "right"; valign: "top" | "middle";
  color: Token;
  truncate?: boolean;                                           // true only for subtext
}

interface Decoration {
  key: string;                                                  // the id the AI may choose
  asset: string;                                                // path under apps/api/assets/templates/
  layer: "bg" | "mid" | "fg";
  opacity: number;                                              // 0..1
  minIntensity: Tier;                                           // shown when plan.decorationIntensity >= this
  placements: { x: number; y: number; w: number; h: number; flipX?: boolean; flipY?: boolean }[];
}
```

### Painter's order (z-index bands — renderer must use these exact values)
| Order | What | z-index |
|---|---|---|
| 1 | `layers[]` | index (0–9) |
| 2 | decorations with `layer:"bg"` | 10 |
| 3 | photo slots | 20 + `slot.z` |
| 4 | decorations with `layer:"mid"` | 40 |
| 5 | footer rect + top rule | 50 |
| 6 | text slots | 60 |
| 7 | decorations with `layer:"fg"` | 80 |

### Intensity ordering
`low < medium < high`. A decoration is drawn if `plan.decorationIntensity >= decoration.minIntensity` **and** its `key` is in `plan.decorations`.

### Headline tier
`headlineTier: "xlarge"` → headline cap = `maxFont`; `"large"` → cap = `maxFont × 0.85`.

---

## 2. Derived text fields (what each `source` renders)

All values are computed server-side from `formData`, then NFC-normalised and sanitised (RENDERER_SPEC §5).

| `source` | Value |
|---|---|
| `headline` | `formData.headline` |
| `subtext` | `formData.subtext` (slot omitted if empty) |
| `name` | `formData.name` |
| `designationOrg` | `${designation} · ${partyOrOrganization}` |
| `location` | `[union, thana, district].filter(Boolean).join(", ")` |
| `credit` | `creditLine` if non-empty, else `"প্রচারে: " + name`. **If the result does not already start with `প্রচারে`, prepend `"প্রচারে: "`.** (Guarantees the mandatory credit line, FR-M5.) |

**Input limits that the layouts below are sized for** (codepoint counts; a conjunct such as ক্ষ counts as 3): `headline ≤ 60`, `subtext ≤ 140`, `name ≤ 60`, `designation ≤ 60`, `partyOrOrganization ≤ 80`, `union/thana/district ≤ 30 each`, `creditLine ≤ 60`.

---

## 3. Standard footer preset `standard-v1`

The seed script **appends these three slots** to every template's `textSlots` (and draws the footer rect `y=700, h=100` across the full width using `footer.fill`, plus a `topRule` at `y=700`). Footer text colour is always `$textOnPrimary`.

```json
[
  { "id": "credit", "source": "credit", "x": 24, "y": 706, "w": 552, "h": 32,
    "fontFamily": "Hind Siliguri", "fontWeight": 700, "minFont": 12, "maxFont": 24, "maxLines": 1,
    "lineHeight": 1.3, "align": "left", "valign": "middle", "color": "$textOnPrimary" },
  { "id": "designationOrg", "source": "designationOrg", "x": 24, "y": 740, "w": 552, "h": 34,
    "fontFamily": "Hind Siliguri", "fontWeight": 500, "minFont": 11, "maxFont": 17, "maxLines": 2,
    "lineHeight": 1.3, "align": "left", "valign": "middle", "color": "$textOnPrimary" },
  { "id": "location", "source": "location", "x": 24, "y": 776, "w": 552, "h": 18,
    "fontFamily": "Hind Siliguri", "fontWeight": 400, "minFont": 10, "maxFont": 13, "maxLines": 1,
    "lineHeight": 1.3, "align": "left", "valign": "middle", "color": "$textOnPrimary" }
]
```

---

## 4. Template 1 — Victory Day (বিজয় দিবস)

- **slug:** `victory-day-classic` · **title:** `বিজয় দিবস — ক্লাসিক` · **titleEn:** `Victory Day — Classic` · **occasionType:** `victory_day` · **isActive:** `true`
- **Mood:** proud, celebratory. Green top band with up to three photos, red headline block, paper body with paddy field, doves and a waving-flag motif, floral frame.

```json
{
  "schemaVersion": 1,
  "canvas": { "width": 600, "height": 800 },
  "layoutFamily": "triple-top",
  "colorScheme": {
    "background": "#FFF8E7", "primary": "#006A4E", "secondary": "#D61F31",
    "accent": "#F7C948", "textOnPrimary": "#FFFFFF", "textOnLight": "#1A1A1A"
  },
  "contrastPairs": [
    { "fg": "textOnPrimary", "bg": "primary",   "min": 4.5 },
    { "fg": "textOnPrimary", "bg": "secondary", "min": 4.5 },
    { "fg": "textOnLight",   "bg": "background","min": 4.5 }
  ],
  "layers": [
    { "id": "base",           "type": "rect", "x": 0, "y": 0,   "w": 600, "h": 800, "fill": "$background" },
    { "id": "top-band",       "type": "rect", "x": 0, "y": 0,   "w": 600, "h": 280, "fill": "$primary" },
    { "id": "headline-block", "type": "rect", "x": 0, "y": 280, "w": 600, "h": 170, "fill": "$secondary" }
  ],
  "photoSlots": [
    { "id": "center",    "shape": "arch",    "x": 215, "y": 36, "w": 170, "h": 214, "z": 4, "border": { "width": 4, "color": "$accent" } },
    { "id": "left",      "shape": "rounded", "x": 36,  "y": 76, "w": 150, "h": 174, "z": 3, "radius": 6, "border": { "width": 4, "color": "$accent" } },
    { "id": "right",     "shape": "rounded", "x": 414, "y": 76, "w": 150, "h": 174, "z": 3, "radius": 6, "border": { "width": 4, "color": "$accent" } },
    { "id": "pairLeft",  "shape": "rounded", "x": 95,  "y": 50, "w": 190, "h": 200, "z": 3, "radius": 6, "border": { "width": 4, "color": "$accent" } },
    { "id": "pairRight", "shape": "rounded", "x": 315, "y": 50, "w": 190, "h": 200, "z": 3, "radius": 6, "border": { "width": 4, "color": "$accent" } }
  ],
  "photoAssignment": {
    "1": ["center"],
    "2": ["pairLeft", "pairRight"],
    "3": ["center", "left", "right"]
  },
  "textSlots": [
    { "id": "headline", "source": "headline", "x": 30, "y": 290, "w": 540, "h": 150,
      "fontFamily": "Hind Siliguri", "fontWeight": 700, "minFont": 30, "maxFont": 88, "maxLines": 3,
      "lineHeight": 1.3, "align": "center", "valign": "middle", "color": "$textOnPrimary" },
    { "id": "subtext", "source": "subtext", "x": 60, "y": 462, "w": 480, "h": 64,
      "fontFamily": "Noto Sans Bengali", "fontWeight": 500, "minFont": 14, "maxFont": 24, "maxLines": 2,
      "lineHeight": 1.5, "align": "center", "valign": "middle", "color": "$textOnLight", "truncate": true }
  ],
  "footer": { "preset": "standard-v1", "fill": "$primary", "topRule": { "height": 4, "color": "$accent" } },
  "decorations": [
    { "key": "sunburst_rays",   "asset": "victory-day-classic/sunburst_rays.svg",   "layer": "bg",  "opacity": 0.18, "minIntensity": "high",
      "placements": [ { "x": 0, "y": 0, "w": 600, "h": 280 } ] },
    { "key": "paddy",           "asset": "victory-day-classic/paddy.svg",           "layer": "bg",  "opacity": 1,    "minIntensity": "low",
      "placements": [ { "x": 0, "y": 600, "w": 600, "h": 100 } ] },
    { "key": "doves",           "asset": "victory-day-classic/doves.svg",           "layer": "mid", "opacity": 1,    "minIntensity": "medium",
      "placements": [ { "x": 360, "y": 540, "w": 200, "h": 80 } ] },
    { "key": "flag_wave",       "asset": "victory-day-classic/flag_wave.svg",       "layer": "mid", "opacity": 1,    "minIntensity": "medium",
      "placements": [ { "x": 40, "y": 536, "w": 150, "h": 96 } ] },
    { "key": "floral_border_a", "asset": "victory-day-classic/floral_border_a.svg", "layer": "fg",  "opacity": 1,    "minIntensity": "low",
      "placements": [ { "x": 0, "y": 0, "w": 600, "h": 700 } ] }
  ],
  "aiAllowedDecorations": ["sunburst_rays", "paddy", "doves", "flag_wave", "floral_border_a"],
  "maxPhotos": 3
}
```

---

## 5. Templates 2 & 3

### 5.1 Template 2 — Condolence / Tribute (শোক ও স্মরণ)

- **slug:** `condolence-tribute` · **title:** `শোক ও স্মরণ — শ্রদ্ধাঞ্জলি` · **titleEn:** `Condolence — Tribute` · **occasionType:** `condolence` · **isActive:** `true`
- **Mood:** solemn, quiet. Warm paper, ink frame, desaturated photos in arch/circle frames, a single dove, generous space.

```json
{
  "schemaVersion": 1,
  "canvas": { "width": 600, "height": 800 },
  "layoutFamily": "memorial-arch",
  "colorScheme": {
    "background": "#F2EFE8", "primary": "#1C1C1C", "secondary": "#6B6B6B",
    "accent": "#9A8B5A", "textOnPrimary": "#F7F5F0", "textOnLight": "#1C1C1C"
  },
  "contrastPairs": [
    { "fg": "textOnPrimary", "bg": "primary",    "min": 4.5 },
    { "fg": "textOnLight",   "bg": "background", "min": 4.5 }
  ],
  "layers": [
    { "id": "base",        "type": "rect",  "x": 0,  "y": 0,  "w": 600, "h": 800, "fill": "$background" },
    { "id": "frame-outer", "type": "frame", "x": 14, "y": 14, "w": 572, "h": 672, "stroke": { "width": 10, "color": "$primary" } },
    { "id": "frame-inner", "type": "frame", "x": 34, "y": 34, "w": 532, "h": 632, "stroke": { "width": 1.5, "color": "$secondary" } }
  ],
  "photoSlots": [
    { "id": "center",    "shape": "arch",   "x": 185, "y": 70,  "w": 230, "h": 290, "z": 4, "border": { "width": 5, "color": "$accent" }, "filter": "grayscale(0.85)" },
    { "id": "left",      "shape": "circle", "x": 40,  "y": 190, "w": 120, "h": 120, "z": 3, "border": { "width": 4, "color": "$accent" }, "filter": "grayscale(0.85)" },
    { "id": "right",     "shape": "circle", "x": 440, "y": 190, "w": 120, "h": 120, "z": 3, "border": { "width": 4, "color": "$accent" }, "filter": "grayscale(0.85)" },
    { "id": "pairLeft",  "shape": "arch",   "x": 70,  "y": 90,  "w": 210, "h": 270, "z": 3, "border": { "width": 5, "color": "$accent" }, "filter": "grayscale(0.85)" },
    { "id": "pairRight", "shape": "arch",   "x": 320, "y": 90,  "w": 210, "h": 270, "z": 3, "border": { "width": 5, "color": "$accent" }, "filter": "grayscale(0.85)" }
  ],
  "photoAssignment": {
    "1": ["center"],
    "2": ["pairLeft", "pairRight"],
    "3": ["center", "left", "right"]
  },
  "textSlots": [
    { "id": "headline", "source": "headline", "x": 50, "y": 464, "w": 500, "h": 116,
      "fontFamily": "Tiro Bangla", "fontWeight": 400, "minFont": 28, "maxFont": 64, "maxLines": 3,
      "lineHeight": 1.3, "align": "center", "valign": "middle", "color": "$textOnLight" },
    { "id": "subtext", "source": "subtext", "x": 90, "y": 586, "w": 420, "h": 68,
      "fontFamily": "Noto Serif Bengali", "fontWeight": 400, "minFont": 14, "maxFont": 22, "maxLines": 3,
      "lineHeight": 1.5, "align": "center", "valign": "top", "color": "$textOnLight", "truncate": true }
  ],
  "footer": { "preset": "standard-v1", "fill": "$primary", "topRule": { "height": 3, "color": "$accent" } },
  "decorations": [
    { "key": "corner_ornament", "asset": "condolence-tribute/corner_ornament.svg", "layer": "fg",  "opacity": 1, "minIntensity": "low",
      "placements": [
        { "x": 22,  "y": 22,  "w": 56, "h": 56 },
        { "x": 522, "y": 22,  "w": 56, "h": 56, "flipX": true },
        { "x": 22,  "y": 630, "w": 56, "h": 56, "flipY": true },
        { "x": 522, "y": 630, "w": 56, "h": 56, "flipX": true, "flipY": true }
      ] },
    { "key": "dove_single",     "asset": "condolence-tribute/dove_single.svg",     "layer": "mid", "opacity": 1, "minIntensity": "low",
      "placements": [ { "x": 254, "y": 372, "w": 92, "h": 74 } ] },
    { "key": "divider_line",    "asset": "condolence-tribute/divider_line.svg",    "layer": "mid", "opacity": 1, "minIntensity": "medium",
      "placements": [ { "x": 200, "y": 452, "w": 200, "h": 8 } ] }
  ],
  "aiAllowedDecorations": ["corner_ornament", "dove_single", "divider_line"],
  "maxPhotos": 3
}
```

### 5.2 Template 3 — Campaign (নির্বাচনী প্রচার)

- **slug:** `campaign-bold` · **title:** `নির্বাচনী প্রচার — বোল্ড` · **titleEn:** `Campaign — Bold` · **occasionType:** `campaign` · **isActive:** `true`
- **Mood:** bold, energetic. Navy diagonal band with photos, large name, red slanted headline block, mustard accent stripe.

```json
{
  "schemaVersion": 1,
  "canvas": { "width": 600, "height": 800 },
  "layoutFamily": "banner-diagonal",
  "colorScheme": {
    "background": "#FAF6EC", "primary": "#14213D", "secondary": "#D61F31",
    "accent": "#F2B705", "textOnPrimary": "#FFFFFF", "textOnLight": "#14213D"
  },
  "contrastPairs": [
    { "fg": "textOnPrimary", "bg": "primary",    "min": 4.5 },
    { "fg": "textOnPrimary", "bg": "secondary",  "min": 4.5 },
    { "fg": "textOnLight",   "bg": "background", "min": 4.5 },
    { "fg": "secondary",     "bg": "background", "min": 4.5 }
  ],
  "layers": [
    { "id": "base",       "type": "rect",  "x": 0, "y": 0,   "w": 600, "h": 800, "fill": "$background" },
    { "id": "band",       "type": "asset", "asset": "campaign-bold/diagonal_band.svg",        "x": 0, "y": 0,   "w": 600, "h": 330 },
    { "id": "head-block", "type": "asset", "asset": "campaign-bold/headline_block_slant.svg", "x": 0, "y": 488, "w": 600, "h": 212 }
  ],
  "photoSlots": [
    { "id": "center",    "shape": "rounded", "x": 205, "y": 30, "w": 190, "h": 250, "z": 4, "radius": 8, "border": { "width": 5, "color": "$background" } },
    { "id": "left",      "shape": "rounded", "x": 30,  "y": 60, "w": 160, "h": 200, "z": 3, "radius": 8, "border": { "width": 5, "color": "$background" } },
    { "id": "right",     "shape": "rounded", "x": 410, "y": 60, "w": 160, "h": 200, "z": 3, "radius": 8, "border": { "width": 5, "color": "$background" } },
    { "id": "pairLeft",  "shape": "rounded", "x": 80,  "y": 40, "w": 200, "h": 240, "z": 3, "radius": 8, "border": { "width": 5, "color": "$background" } },
    { "id": "pairRight", "shape": "rounded", "x": 320, "y": 40, "w": 200, "h": 240, "z": 3, "radius": 8, "border": { "width": 5, "color": "$background" } }
  ],
  "photoAssignment": {
    "1": ["center"],
    "2": ["pairLeft", "pairRight"],
    "3": ["center", "left", "right"]
  },
  "textSlots": [
    { "id": "name", "source": "name", "x": 30, "y": 348, "w": 540, "h": 64,
      "fontFamily": "Hind Siliguri", "fontWeight": 700, "minFont": 22, "maxFont": 48, "maxLines": 1,
      "lineHeight": 1.3, "align": "center", "valign": "middle", "color": "$textOnLight" },
    { "id": "designationOrgBody", "source": "designationOrg", "x": 30, "y": 414, "w": 540, "h": 44,
      "fontFamily": "Hind Siliguri", "fontWeight": 600, "minFont": 13, "maxFont": 22, "maxLines": 2,
      "lineHeight": 1.3, "align": "center", "valign": "middle", "color": "$secondary" },
    { "id": "headline", "source": "headline", "x": 36, "y": 520, "w": 528, "h": 124,
      "fontFamily": "Hind Siliguri", "fontWeight": 700, "minFont": 30, "maxFont": 80, "maxLines": 3,
      "lineHeight": 1.3, "align": "center", "valign": "middle", "color": "$textOnPrimary" },
    { "id": "subtext", "source": "subtext", "x": 48, "y": 648, "w": 504, "h": 46,
      "fontFamily": "Noto Sans Bengali", "fontWeight": 500, "minFont": 13, "maxFont": 20, "maxLines": 2,
      "lineHeight": 1.5, "align": "center", "valign": "middle", "color": "$textOnPrimary", "truncate": true }
  ],
  "footer": { "preset": "standard-v1", "fill": "$primary", "topRule": { "height": 4, "color": "$accent" } },
  "decorations": [
    { "key": "rays_burst",     "asset": "campaign-bold/rays_burst.svg",     "layer": "bg", "opacity": 0.15, "minIntensity": "high",
      "placements": [ { "x": 0, "y": 0, "w": 600, "h": 330 } ] },
    { "key": "halftone_dots",  "asset": "campaign-bold/halftone_dots.svg",  "layer": "bg", "opacity": 0.25, "minIntensity": "medium",
      "placements": [ { "x": 0, "y": 0, "w": 600, "h": 330 } ] },
    { "key": "chevron_stripe", "asset": "campaign-bold/chevron_stripe.svg", "layer": "mid", "opacity": 1,   "minIntensity": "low",
      "placements": [ { "x": 0, "y": 470, "w": 600, "h": 12 } ] }
  ],
  "aiAllowedDecorations": ["rays_burst", "halftone_dots", "chevron_stripe"],
  "maxPhotos": 3
}
```

> Campaign has **two** `designationOrg` renderings (body: `designationOrgBody`, footer: `designationOrg`). That is intentional; slot `id`s are unique, `source`s may repeat.

---

## 6. Required asset files (`apps/api/assets/templates/`)

**Authoring rules (apply to every SVG):**
- Exact `viewBox` = width × height below; no `width`/`height` attributes needed (renderer sets 100%).
- Colours **only** via CSS variables: `var(--c-background)`, `var(--c-primary)`, `var(--c-secondary)`, `var(--c-accent)`, `var(--c-on-primary)`, `var(--c-on-light)` (or `currentColor`). **No hard-coded hex.** No gradients.
- Allowed elements: `svg, g, path, rect, circle, ellipse, line, polyline, polygon, defs, pattern, clipPath`. **Forbidden:** `script, foreignObject, image, style, use` with external `href`, any `on*` attribute, external URLs. Any `id` must start with the file's base name + `-`.
- Keep each file < 40 KB.
- **If artwork isn't ready, create an original geometric placeholder matching the description, and list it as `PLACEHOLDER` in `ASSETS.md`.**

| File | viewBox (w×h) | Description |
|---|---|---|
| `shared/placeholder_person.svg` | 400×500 | Neutral grey head-and-shoulders silhouette on flat background (used for fixtures/thumbnails) |
| **victory-day-classic/** | | |
| `paddy.svg` | 600×100 | Rows of simple stylised paddy stalks along the bottom; two greens + accent for grain |
| `doves.svg` | 200×80 | Flock of 3–5 simple geometric doves in flight, `--c-on-primary`/paper tone |
| `flag_wave.svg` | 150×96 | Waving rectangular flag on a thin pole; green field, red circle (generic, **not** any specific official flag artwork) |
| `floral_border_a.svg` | 600×700 | Frame ≤ 16 px thick around the edge, transparent centre; repeating geometric petal motif in `--c-accent`/`--c-secondary` |
| `sunburst_rays.svg` | 600×280 | Radial rays from bottom centre, single colour (`--c-accent`) |
| **condolence-tribute/** | | |
| `dove_single.svg` | 92×74 | One simple dove, monochrome (`--c-primary`) |
| `divider_line.svg` | 200×8 | Thin ornamental line with a small centre diamond |
| `corner_ornament.svg` | 56×56 | Quarter-circle line ornament for the **top-left** corner (flipped by placements) |
| **campaign-bold/** | | |
| `diagonal_band.svg` | 600×330 | `--c-primary` shape filling the box, bottom edge slanting from y≈300 (left) to y=330 (right) |
| `headline_block_slant.svg` | 600×212 | `--c-secondary` shape filling the box, top edge slanting from y=24 (left) to y=0 (right) |
| `halftone_dots.svg` | 600×330 | Halftone dot grid, `--c-on-primary`, dot size growing toward the right |
| `chevron_stripe.svg` | 600×12 | Repeating chevrons in `--c-accent` |
| `rays_burst.svg` | 600×330 | Radial rays from top centre, `--c-on-primary` |

---

## 7. Seed script behaviour (`npm run seed`)

1. Connect to MongoDB; **upsert by `slug`** (idempotent).
2. For each template: validate `layoutConfig` with the Zod schema derived from §1; expand `standard-v1` into `textSlots`; run the **lints below**; abort the seed on any failure.
3. Create the demo user (DEV_AND_DEPLOY §6).
4. `npm run seed:thumbnails` renders each template with the **sample fixtures (§8)** and the `placeholder_person.svg` photos, saves `thumbnailUrl` (storage provider), and writes the template's `thumbnailUrl`.

### Lints (all must pass)
| Lint | Rule |
|---|---|
| **Bounds** | Every photo slot, text slot, layer, decoration placement lies within 0..600 × 0..800 |
| **No overlap** | For each photo count (1/2/3), the assigned photo slots do not overlap each other |
| **Assignment valid** | Every id in `photoAssignment` exists in `photoSlots`; arrays have length 1/2/3 |
| **Circle squares** | `shape:"circle"` ⇒ `w === h` |
| **Contrast** | Default palette passes every `contrastPairs` entry |
| **Assets exist & safe** | Every `asset` file exists and passes the SVG allow-list (§6) |
| **Decoration keys** | `aiAllowedDecorations` equals the set of `decorations[].key` |
| **Footer clear** | No text slot other than footer slots intersects `y ≥ 700` |
| **Fit lint (stress)** | For each text slot, render the **worst-case string** at the field's max length (below) and assert the fit script reports `ok: true` (for `truncate` slots, `ok` after clamping is allowed) |

**Worst-case strings:** build from whole words of the stress phrase `স্বাধীনতা সংগ্রামী শ্রদ্ধাঞ্জলি দ্ধ ক্ষ ক্ষুদ্র ` repeated, appending whole words while the total codepoint count stays ≤ the field's max; for `name`/`designation`/`partyOrOrganization`/`location` build each part at its own max and join as in §2.

> The coordinates and `minFont` values above are **initial estimates**. **The fit lint is the authority.** If a slot fails it, lower `minFont` (never below 10 for footer, 11 for `designationOrg`, 24 for `headline`) or raise `h` — then update this file and the seed JSON together.

---

## 8. Sample fixtures (fictional) for thumbnails and tests

```json
{
  "photosPerTemplate": {
    "victory-day-classic": 3,
    "condolence-tribute": 1,
    "campaign-bold": 2
  },
  "common": {
    "name": "নমুনা নাম",
    "designation": "সাধারণ সম্পাদক",
    "partyOrOrganization": "নমুনা সংগঠন",
    "union": "নমুনা ইউনিয়ন", "thana": "নমুনা থানা", "district": "নমুনা জেলা",
    "creditLine": ""
  },
  "victory-day-classic": { "headline": "মহান বিজয় দিবস", "subtext": "সকলকে বিজয় দিবসের শুভেচ্ছা" },
  "condolence-tribute":  { "headline": "বিনম্র শ্রদ্ধাঞ্জলি", "subtext": "আল্লাহ তাঁকে জান্নাতবাসী করুন" },
  "campaign-bold":       { "headline": "আপনার পাশে, আপনার সাথে", "subtext": "সবার জন্য একটি ভালো আগামী" }
}
```
Photos for fixtures: `shared/placeholder_person.svg` rasterised by `sharp`, used for 1, 2 and 3 photo variants.
