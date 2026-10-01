# RENDERER_SPEC.md — Deterministic Poster HTML/CSS Renderer Specification

> **Authority & Context:** This document specifies the deterministic HTML/CSS renderer for Prochar Studio (PRD §8.5, SEED_TEMPLATES §1–8).  
> All coordinates are logical canvas units (**600 × 800**). The Puppeteer renderer captures at `deviceScaleFactor: 3`, yielding print-ready **1800 × 2400 px** PNG output.

---

## 1. Painter's Order & HTML Skeleton Architecture

The canvas is rendered as a single root container of exactly `600px` width by `800px` height with `position: relative; overflow: hidden;`. All child elements are positioned absolutely using standard canvas coordinates `(x, y, w, h)`.

### 1.1 Z-Index Bands (Painter's Order)
As defined in `SEED_TEMPLATES.md` §1, every element must strictly occupy its designated z-index band:

| Order | Layer Category | Z-Index Value | Description |
|---|---|---|---|
| **1** | `layers[]` | `0` to `9` | Base backgrounds, color blocks, diagonal SVG asset bands (index order) |
| **2** | Background Decorations | `10` | Template decorations with `layer: "bg"` |
| **3** | Photo Slots | `20 + slot.z` | User photos within shape masks (slot `z` is 0..9, giving `20..29`) |
| **4** | Midground Decorations | `40` | Template decorations with `layer: "mid"` (e.g. doves, flag waves) |
| **5** | Footer Band + Top Rule | `50` | Full-width rectangle (`y=700, h=100`) and accent top border |
| **6** | Text Slots | `60` | Headlines, subtext, names, designations, footer text |
| **7** | Foreground Decorations | `80` | Framing borders, corner ornaments (`layer: "fg"`) |

The renderer selects active photo slots as `template.photoAssignment[String(photoCount)]`; any other photoSlots defined in the template are not rendered.

---

### 1.2 Layout Family 1: `triple-top`
- **Reference Template:** `victory-day-classic` (SEED_TEMPLATES §4)
- **Sample Fixture:** SEED_TEMPLATES §8 (`common` + `victory-day-classic`, 3 photos)
- **Palette (CSS Variables):**
  - `--c-background: #FFF8E7;`
  - `--c-primary: #006A4E;`
  - `--c-secondary: #D61F31;`
  - `--c-accent: #F7C948;`
  - `--c-on-primary: #FFFFFF;`
  - `--c-on-light: #1A1A1A;`

#### Worked HTML Skeleton
```html
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'nonce-FIT_SCRIPT_NONCE';">
  <style>
    /* Injected @font-face rules for Hind Siliguri and Noto Sans Bengali */
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: 600px; height: 800px; margin: 0; background: #FFF8E7; overflow: hidden; }
    #canvas {
      position: relative; width: 600px; height: 800px; overflow: hidden;
      --c-background: #FFF8E7; --c-primary: #006A4E; --c-secondary: #D61F31;
      --c-accent: #F7C948; --c-on-primary: #FFFFFF; --c-on-light: #1A1A1A;
      background-color: var(--c-background);
    }
    .layer-rect { position: absolute; }
    .slot-photo { position: absolute; overflow: hidden; }
    .slot-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .decoration { position: absolute; pointer-events: none; }
    .slot-text { position: absolute; display: flex; flex-direction: column; overflow: hidden; }
    .slot-footer-bg { position: absolute; left: 0; top: 700px; width: 600px; height: 100px; z-index: 50; background: var(--c-primary); }
    .slot-footer-rule { position: absolute; left: 0; top: 700px; width: 600px; height: 4px; z-index: 51; background: var(--c-accent); }
  </style>
</head>
<body>
  <div id="canvas">
    <!-- BAND 1: layers[] (z: 0..9) -->
    <div id="layer-base" class="layer-rect" style="left:0px; top:0px; width:600px; height:800px; background:var(--c-background); z-index:0;"></div>
    <div id="layer-top-band" class="layer-rect" style="left:0px; top:0px; width:600px; height:280px; background:var(--c-primary); z-index:1;"></div>
    <div id="layer-headline-block" class="layer-rect" style="left:0px; top:280px; width:600px; height:170px; background:var(--c-secondary); z-index:2;"></div>

    <!-- BAND 2: decorations layer:bg (z: 10) -->
    <!-- sunburst_rays (minIntensity: high) -> omitted if intensity < high -->
    <div class="decoration" style="left:0px; top:600px; width:600px; height:100px; z-index:10; opacity:1.0;">
      <!-- Inline SVG: victory-day-classic/paddy.svg -->
      <svg viewBox="0 0 600 100" style="width:100%; height:100%; display:block;"><!-- SVG content with var(--c-*) --></svg>
    </div>

    <!-- BAND 3: photo slots (z: 20 + slot.z) (3 photos: center, left, right) -->
    <!-- left photo (z: 20 + 3 = 23) -->
    <div id="photo-left" class="slot-photo" style="left:36px; top:76px; width:150px; height:174px; border-radius:6px; border:4px solid var(--c-accent); z-index:23;">
      <img src="data:image/jpeg;base64,..." style="object-position: 50% 30%; transform: scale(1.05);" alt="ছবি বাম">
    </div>
    <!-- right photo (z: 20 + 3 = 23) -->
    <div id="photo-right" class="slot-photo" style="left:414px; top:76px; width:150px; height:174px; border-radius:6px; border:4px solid var(--c-accent); z-index:23;">
      <img src="data:image/jpeg;base64,..." style="object-position: 50% 30%; transform: scale(1.05);" alt="ছবি ডান">
    </div>
    <!-- center photo (shape: arch, z: 20 + 4 = 24) -->
    <div id="photo-center" class="slot-photo" style="left:215px; top:36px; width:170px; height:214px; border-top-left-radius:85px; border-top-right-radius:85px; border:4px solid var(--c-accent); z-index:24;">
      <img src="data:image/jpeg;base64,..." style="object-position: 50% 25%; transform: scale(1.1);" alt="ছবি কেন্দ্র">
    </div>

    <!-- BAND 4: decorations layer:mid (z: 40) -->
    <div class="decoration" style="left:40px; top:536px; width:150px; height:96px; z-index:40; opacity:1.0;">
      <!-- Inline SVG: victory-day-classic/flag_wave.svg -->
      <svg viewBox="0 0 150 96" style="width:100%; height:100%; display:block;"><!-- SVG content --></svg>
    </div>
    <div class="decoration" style="left:360px; top:540px; width:200px; height:80px; z-index:40; opacity:1.0;">
      <!-- Inline SVG: victory-day-classic/doves.svg -->
      <svg viewBox="0 0 200 80" style="width:100%; height:100%; display:block;"><!-- SVG content --></svg>
    </div>

    <!-- BAND 5: footer rect + top rule (z: 50..51) -->
    <div class="slot-footer-bg"></div>
    <div class="slot-footer-rule"></div>

    <!-- BAND 6: text slots (z: 60) -->
    <!-- Template text slots -->
    <div id="text-headline" class="slot-text" style="left:30px; top:290px; width:540px; height:150px; z-index:60; justify-content:center; text-align:center; color:var(--c-on-primary); font-family:'Hind Siliguri', sans-serif; font-weight:700;">
      <span class="text-content">মহান বিজয় দিবস</span>
    </div>
    <div id="text-subtext" class="slot-text" style="left:60px; top:462px; width:480px; height:64px; z-index:60; justify-content:center; text-align:center; color:var(--c-on-light); font-family:'Noto Sans Bengali', sans-serif; font-weight:500;">
      <span class="text-content">সকলকে বিজয় দিবসের শুভেচ্ছা</span>
    </div>

    <!-- Footer standard-v1 text slots -->
    <div id="text-credit" class="slot-text" style="left:24px; top:706px; width:552px; height:32px; z-index:60; justify-content:center; text-align:left; color:var(--c-on-primary); font-family:'Hind Siliguri', sans-serif; font-weight:700;">
      <span class="text-content">প্রচারে: নমুনা নাম</span>
    </div>
    <div id="text-designationOrg" class="slot-text" style="left:24px; top:740px; width:552px; height:34px; z-index:60; justify-content:center; text-align:left; color:var(--c-on-primary); font-family:'Hind Siliguri', sans-serif; font-weight:500;">
      <span class="text-content">সাধারণ সম্পাদক · নমুনা সংগঠন</span>
    </div>
    <div id="text-location" class="slot-text" style="left:24px; top:776px; width:552px; height:18px; z-index:60; justify-content:center; text-align:left; color:var(--c-on-primary); font-family:'Hind Siliguri', sans-serif; font-weight:400;">
      <span class="text-content">নমুনা ইউনিয়ন, নমুনা থানা, নমুনা জেলা</span>
    </div>

    <!-- BAND 7: decorations layer:fg (z: 80) -->
    <div class="decoration" style="left:0px; top:0px; width:600px; height:700px; z-index:80; opacity:1.0;">
      <!-- Inline SVG: victory-day-classic/floral_border_a.svg -->
      <svg viewBox="0 0 600 700" style="width:100%; height:100%; display:block;"><!-- SVG content --></svg>
    </div>
  </div>
</body>
</html>
```

---

### 1.3 Layout Family 2: `memorial-arch`
- **Reference Template:** `condolence-tribute` (SEED_TEMPLATES §5.1)
- **Sample Fixture:** SEED_TEMPLATES §8 (`common` + `condolence-tribute`, 1 photo in `center`)
- **Palette (CSS Variables):**
  - `--c-background: #F2EFE8;`
  - `--c-primary: #1C1C1C;`
  - `--c-secondary: #6B6B6B;`
  - `--c-accent: #9A8B5A;`
  - `--c-on-primary: #F7F5F0;`
  - `--c-on-light: #1C1C1C;`

#### Worked HTML Skeleton Structure
```html
<div id="canvas">
  <!-- BAND 1: layers[] -->
  <div id="layer-base" class="layer-rect" style="left:0px; top:0px; width:600px; height:800px; background:var(--c-background); z-index:0;"></div>
  <!-- frame-outer (stroke: 10px var(--c-primary)) -->
  <div id="layer-frame-outer" style="position:absolute; left:14px; top:14px; width:572px; height:672px; border:10px solid var(--c-primary); z-index:1; pointer-events:none;"></div>
  <!-- frame-inner (stroke: 1.5px var(--c-secondary)) -->
  <div id="layer-frame-inner" style="position:absolute; left:34px; top:34px; width:532px; height:632px; border:1.5px solid var(--c-secondary); z-index:2; pointer-events:none;"></div>

  <!-- BAND 2: decorations layer:bg -> none in condolence -->

  <!-- BAND 3: photo slots (1 photo: center, shape: arch, filter: grayscale(0.85)) -->
  <div id="photo-center" class="slot-photo" style="left:185px; top:70px; width:230px; height:290px; border-top-left-radius:115px; border-top-right-radius:115px; border:5px solid var(--c-accent); z-index:24;">
    <img src="data:image/jpeg;base64,..." style="object-position: 50% 20%; transform: scale(1.0); filter: grayscale(0.85);" alt="প্রয়াত ব্যক্তিত্ব">
  </div>

  <!-- BAND 4: decorations layer:mid -->
  <!-- dove_single -->
  <div class="decoration" style="left:254px; top:372px; width:92px; height:74px; z-index:40; opacity:1.0;">
    <svg viewBox="0 0 92 74" style="width:100%; height:100%;"><path fill="var(--c-primary)" .../></svg>
  </div>
  <!-- divider_line -->
  <div class="decoration" style="left:200px; top:452px; width:200px; height:8px; z-index:40; opacity:1.0;">
    <svg viewBox="0 0 200 8" style="width:100%; height:100%;"><path fill="var(--c-accent)" .../></svg>
  </div>

  <!-- BAND 5: footer rect (fill: var(--c-primary), topRule: 3px var(--c-accent)) -->
  <div style="position:absolute; left:0; top:700px; width:600px; height:100px; background:var(--c-primary); z-index:50;"></div>
  <div style="position:absolute; left:0; top:700px; width:600px; height:3px; background:var(--c-accent); z-index:51;"></div>

  <!-- BAND 6: text slots -->
  <div id="text-headline" class="slot-text" style="left:50px; top:464px; width:500px; height:116px; z-index:60; justify-content:center; text-align:center; color:var(--c-on-light); font-family:'Tiro Bangla', serif; font-weight:400;">
    <span class="text-content">বিনম্র শ্রদ্ধাঞ্জলি</span>
  </div>
  <div id="text-subtext" class="slot-text" style="left:90px; top:586px; width:420px; height:68px; z-index:60; justify-content:flex-start; text-align:center; color:var(--c-on-light); font-family:'Noto Serif Bengali', serif; font-weight:400;">
    <span class="text-content">আল্লাহ তাঁকে জান্নাতবাসী করুন</span>
  </div>
  <!-- Footer slots: credit, designationOrg, location -->
  <div id="text-credit" class="slot-text" style="left:24px; top:706px; width:552px; height:32px; z-index:60; justify-content:center; text-align:left; color:var(--c-on-primary); font-family:'Hind Siliguri', sans-serif; font-weight:700;">
    <span class="text-content">প্রচারে: নমুনা নাম</span>
  </div>
  <div id="text-designationOrg" class="slot-text" style="left:24px; top:740px; width:552px; height:34px; z-index:60; justify-content:center; text-align:left; color:var(--c-on-primary); font-family:'Hind Siliguri', sans-serif; font-weight:500;">
    <span class="text-content">সাধারণ সম্পাদক · নমুনা সংগঠন</span>
  </div>
  <div id="text-location" class="slot-text" style="left:24px; top:776px; width:552px; height:18px; z-index:60; justify-content:center; text-align:left; color:var(--c-on-primary); font-family:'Hind Siliguri', sans-serif; font-weight:400;">
    <span class="text-content">নমুনা ইউনিয়ন, নমুনা থানা, নমুনা জেলা</span>
  </div>

  <!-- BAND 7: decorations layer:fg (corner ornaments with flipX/flipY) -->
  <div class="decoration" style="left:22px; top:22px; width:56px; height:56px; z-index:80;"><!-- top-left --></div>
  <div class="decoration" style="left:522px; top:22px; width:56px; height:56px; transform: scaleX(-1); z-index:80;"><!-- top-right --></div>
  <div class="decoration" style="left:22px; top:630px; width:56px; height:56px; transform: scaleY(-1); z-index:80;"><!-- bottom-left --></div>
  <div class="decoration" style="left:522px; top:630px; width:56px; height:56px; transform: scale(-1, -1); z-index:80;"><!-- bottom-right --></div>
</div>
```

---

### 1.4 Layout Family 3: `banner-diagonal`
- **Reference Template:** `campaign-bold` (SEED_TEMPLATES §5.2)
- **Sample Fixture:** SEED_TEMPLATES §8 (`common` + `campaign-bold`, 1 photo in `center`)
- **Palette (CSS Variables):**
  - `--c-background: #FAF6EC;`
  - `--c-primary: #14213D;`
  - `--c-secondary: #D61F31;`
  - `--c-accent: #F2B705;`
  - `--c-on-primary: #FFFFFF;`
  - `--c-on-light: #14213D;`

#### Worked HTML Skeleton Structure
```html
<div id="canvas">
  <!-- BAND 1: layers[] -->
  <div id="layer-base" class="layer-rect" style="left:0px; top:0px; width:600px; height:800px; background:var(--c-background); z-index:0;"></div>
  <!-- diagonal_band.svg asset layer -->
  <div id="layer-band" style="position:absolute; left:0px; top:0px; width:600px; height:330px; z-index:1;">
    <svg viewBox="0 0 600 330" style="width:100%; height:100%; display:block;"><!-- diagonal band in var(--c-primary) --></svg>
  </div>
  <!-- headline_block_slant.svg asset layer -->
  <div id="layer-head-block" style="position:absolute; left:0px; top:488px; width:600px; height:212px; z-index:2;">
    <svg viewBox="0 0 600 212" style="width:100%; height:100%; display:block;"><!-- slant block in var(--c-secondary) --></svg>
  </div>

  <!-- BAND 2: decorations layer:bg -->
  <!-- halftone_dots (minIntensity: medium) or rays_burst (high) -->

  <!-- BAND 3: photo slots (rounded shape, radius 8px, border 5px var(--c-background)) -->
  <div id="photo-center" class="slot-photo" style="left:205px; top:30px; width:190px; height:250px; border-radius:8px; border:5px solid var(--c-background); z-index:24;">
    <img src="data:image/jpeg;base64,..." style="object-position: 50% 25%; transform: scale(1.15);" alt="প্রার্থী">
  </div>

  <!-- BAND 4: decorations layer:mid -->
  <!-- chevron_stripe (y=470, w=600, h=12) -->
  <div class="decoration" style="left:0px; top:470px; width:600px; height:12px; z-index:40; opacity:1.0;">
    <svg viewBox="0 0 600 12" style="width:100%; height:100%; display:block;"><!-- chevron stripe in var(--c-accent) --></svg>
  </div>

  <!-- BAND 5: footer rect (fill: var(--c-primary), topRule: 4px var(--c-accent)) -->
  <div style="position:absolute; left:0; top:700px; width:600px; height:100px; background:var(--c-primary); z-index:50;"></div>
  <div style="position:absolute; left:0; top:700px; width:600px; height:4px; background:var(--c-accent); z-index:51;"></div>

  <!-- BAND 6: text slots -->
  <!-- Candidate Name (above slant) -->
  <div id="text-name" class="slot-text" style="left:30px; top:348px; width:540px; height:64px; z-index:60; justify-content:center; text-align:center; color:var(--c-on-light); font-family:'Hind Siliguri', sans-serif; font-weight:700;">
    <span class="text-content">নমুনা নাম</span>
  </div>
  <!-- Body Designation / Org -->
  <div id="text-designationOrgBody" class="slot-text" style="left:30px; top:414px; width:540px; height:44px; z-index:60; justify-content:center; text-align:center; color:var(--c-secondary); font-family:'Hind Siliguri', sans-serif; font-weight:600;">
    <span class="text-content">সাধারণ সম্পাদক · নমুনা সংগঠন</span>
  </div>
  <!-- Headline (inside red slant) -->
  <div id="text-headline" class="slot-text" style="left:36px; top:520px; width:528px; height:124px; z-index:60; justify-content:center; text-align:center; color:var(--c-on-primary); font-family:'Hind Siliguri', sans-serif; font-weight:700;">
    <span class="text-content">আপনার পাশে, আপনার সাথে</span>
  </div>
  <!-- Subtext (inside red slant bottom) -->
  <div id="text-subtext" class="slot-text" style="left:48px; top:648px; width:504px; height:46px; z-index:60; justify-content:center; text-align:center; color:var(--c-on-primary); font-family:'Noto Sans Bengali', sans-serif; font-weight:500;">
    <span class="text-content">সবার জন্য একটি ভালো আগামী</span>
  </div>

  <!-- Footer slots: credit, designationOrg, location -->
  <div id="text-credit" class="slot-text" style="left:24px; top:706px; width:552px; height:32px; z-index:60; justify-content:center; text-align:left; color:var(--c-on-primary); font-family:'Hind Siliguri', sans-serif; font-weight:700;">
    <span class="text-content">প্রচারে: নমুনা নাম</span>
  </div>
  <div id="text-designationOrg" class="slot-text" style="left:24px; top:740px; width:552px; height:34px; z-index:60; justify-content:center; text-align:left; color:var(--c-on-primary); font-family:'Hind Siliguri', sans-serif; font-weight:500;">
    <span class="text-content">সাধারণ সম্পাদক · নমুনা সংগঠন</span>
  </div>
  <div id="text-location" class="slot-text" style="left:24px; top:776px; width:552px; height:18px; z-index:60; justify-content:center; text-align:left; color:var(--c-on-primary); font-family:'Hind Siliguri', sans-serif; font-weight:400;">
    <span class="text-content">নমুনা ইউনিয়ন, নমুনা থানা, নমুনা জেলা</span>
  </div>

  <!-- BAND 7: decorations layer:fg -> none in campaign -->
</div>
```

---

## 2. CSS Specifications for Photo Shapes and Positioning

Each photo slot uses CSS properties applied to the container `.slot-photo` and the inner `<img>` element:

### 2.1 Shapes
1. **`arch`**:
   - The top half is semicircular; the bottom is flat:
     ```css
     border-top-left-radius: calc(W / 2 * 1px);
     border-top-right-radius: calc(W / 2 * 1px);
     border-bottom-left-radius: 0;
     border-bottom-right-radius: 0;
     overflow: hidden;
     ```
   - Border is set using `border: ${border.width}px solid ${border.colorToken};`.
2. **`circle`**:
   - Requires `w === h` (enforced by template lint):
     ```css
     border-radius: 50%;
     overflow: hidden;
     border: ${border.width}px solid ${border.colorToken};
     ```
3. **`rounded`**:
   - Uses the template's specified `radius` (default: 8px):
     ```css
     border-radius: ${radius}px;
     overflow: hidden;
     border: ${border.width}px solid ${border.colorToken};
     ```
4. **`rect`**:
   - Sharp rectangular boundary:
     ```css
     border-radius: 0;
     overflow: hidden;
     border: ${border.width}px solid ${border.colorToken};
     ```

### 2.2 Object-Fit, Focal Alignment & Zoom
The inner `<img>` is sized to fill the slot, positioned according to AI or fallback focal point, and zoomed:
```css
.slot-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: calc(var(--focal-x) * 100%) calc(var(--focal-y) * 100%);
  transform: scale(var(--zoom));
  transform-origin: calc(var(--focal-x) * 100%) calc(var(--focal-y) * 100%);
  display: block;
}
```
- `--focal-x`: clamp between `0.0` and `1.0` (default: `0.5`).
- `--focal-y`: clamp between `0.0` and `1.0` (default: `0.3` for portraits).
- `--zoom`: clamp between `1.0` and `1.6` (default: `1.0`).

### 2.3 Filter Handling
If `slot.filter === "grayscale(0.85)"` (as in `condolence-tribute`), apply directly to the image:
```css
filter: grayscale(0.85);
```

---

## 3. Text-Fit Algorithm (Binary Search)

Text fitting is executed inside the Chromium page prior to capturing the screenshot. It deterministically calculates the largest font size that satisfies all line count and container boundaries.

### 3.1 Pseudocode
```ts
interface FitResult {
  fontSize: number;
  lines: number;
  ok: boolean;
  usedTruncate: boolean;
}

function fitTextSlot(
  container: HTMLElement,
  textEl: HTMLElement,
  slotConfig: {
    source: string;
    w: number;
    h: number;
    minFont: number;
    maxFont: number;
    maxLines: number;
    lineHeight: number;
    truncate?: boolean;
    headlineTier?: "large" | "xlarge";
  }
): FitResult {
  const originalText = textEl.textContent || "";
  
  // 1. Calculate effective maxFont according to headlineTier
  let effectiveMax = slotConfig.maxFont;
  if (slotConfig.source === "headline" && slotConfig.headlineTier === "large") {
    effectiveMax = Math.floor(slotConfig.maxFont * 0.85);
  }
  
  const minFont = slotConfig.minFont;
  const maxLines = slotConfig.maxLines;
  const maxHeight = slotConfig.h;
  const maxWidth = slotConfig.w;
  const lineHeightRatio = slotConfig.lineHeight;

  // Helper: count rendered lines using the DOM Range API.
  // Note: Bangla matras (vowel signs and ascenders/descenders) break the scrollHeight / lineHeight
  // approximation, so Range API client rect measurement is mandatory.
  function countLines(el: HTMLElement): number {
    const range = document.createRange();
    range.selectNodeContents(el);
    return range.getClientRects().length;
  }

  // Helper: test if candidate font size fits
  function testFit(fontSize: number): { fits: boolean; lineCount: number } {
    textEl.style.fontSize = `${fontSize}px`;
    textEl.style.lineHeight = `${lineHeightRatio}`;
    
    const clientHeight = textEl.clientHeight;
    const scrollHeight = textEl.scrollHeight;
    const clientWidth = textEl.clientWidth;
    const scrollWidth = textEl.scrollWidth;
    
    const computedLines = countLines(textEl);

    const fitsHeight = scrollHeight <= maxHeight;
    const fitsLines = computedLines <= maxLines;
    const fitsWidth = scrollWidth <= maxWidth + 1; // 1px float tolerance

    return {
      fits: fitsHeight && fitsLines && fitsWidth,
      lineCount: computedLines
    };
  }

  // 2. Binary search for optimal integer font size in [minFont, effectiveMax]
  let low = minFont;
  let high = effectiveMax;
  let bestFit = -1;
  let bestLines = 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const result = testFit(mid);
    if (result.fits) {
      bestFit = mid;
      bestLines = result.lineCount;
      low = mid + 1; // Try larger
    } else {
      high = mid - 1; // Try smaller
    }
  }

  // 3. Evaluation
  if (bestFit >= minFont) {
    testFit(bestFit);
    return {
      fontSize: bestFit,
      lines: bestLines,
      ok: true,
      usedTruncate: false
    };
  }

  // 4. Overflows at minFont
  if (slotConfig.truncate === true && slotConfig.source === "subtext") {
    // Truncation allowed: set font to minFont, clamp lines, and append ellipsis
    textEl.style.fontSize = `${minFont}px`;
    textEl.style.lineHeight = `${lineHeightRatio}`;
    
    // Apply CSS line-clamp with ellipsis
    textEl.style.display = "-webkit-box";
    textEl.style.webkitLineClamp = `${maxLines}`;
    textEl.style.webkitBoxOrient = "vertical";
    textEl.style.overflow = "hidden";
    textEl.style.textOverflow = "ellipsis";
    
    return {
      fontSize: minFont,
      lines: maxLines,
      ok: true,
      usedTruncate: true
    };
  }

  // For headline, name, and non-truncating slots: NEVER truncate
  throw new Error(`TEXT_OVERFLOW_AT_MIN: Slot '${slotConfig.source}' overflows container at minFont (${minFont}px)`);
}
```

---

## 4. Font Embedding Service (`fonts.service.ts`)

Font loading must be completely offline, deterministic, and self-contained using Fontsource packages.

### 4.1 Embedding Procedure
1. **Target Packages:**
   - `@fontsource/hind-siliguri` (Weights: 400, 500, 600, 700)
   - `@fontsource/noto-sans-bengali` (Weights: 400, 500, 600, 700)
   - `@fontsource/noto-serif-bengali` (Weights: 400, 700)
   - `@fontsource/tiro-bangla` (Weight: 400)
2. **File Reading & Parsing:**
   - For a given font package and weight, read `node_modules/@fontsource/<id>/<weight>.css`.
   - Parse each `@font-face` block.
   - **Filter:** Keep **ONLY** the blocks with comment header `/* bengali */` and `/* latin */`. Discard other scripts.
   - **Preserve `unicode-range`:** Keep each block's own `unicode-range` string verbatim. Do not alter or synthesize ranges.
3. **Woff2 Data URI Rewriting:**
   - Extract the local relative url from `src: url("./files/<filename>.woff2") format("woff2")`.
   - Read the binary `.woff2` file from `node_modules/@fontsource/<id>/files/<filename>.woff2`.
   - Convert binary buffer to base64: `const base64 = buffer.toString('base64');`.
   - Rewrite declaration to: `src: url("data:font/woff2;base64,${base64}") format("woff2");`.
4. **Caching & Injection:**
   - Cache formatted `@font-face` CSS strings in a process-wide `Map<string, string>` (key: `${family}-${weight}`).
   - Fonts are static per deployment; cache entries are never invalidated.
   - Inject only the `@font-face` blocks used by the active template into the HTML document `<style>` header.

---

## 5. HTML Escape & Sanitization

All user-supplied text strings must be NFC-normalized and HTML-escaped before insertion into the DOM. User strings are placed **strictly** inside text nodes; never into attributes, inline styles, or script blocks.

### 5.1 Exact Character Mapping
```ts
const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
};

export function escapeHtml(input: string): string {
  if (!input) return "";
  
  // 1. NFC Unicode normalization
  let normalized = input.normalize("NFC");
  
  // 2. Strip ASCII control characters (0x00-0x1F, 0x7F) and Unicode control chars
  normalized = normalized.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  
  // 3. Escape HTML delimiters
  return normalized.replace(/[&<>"'/]/g, (char) => ESCAPE_MAP[char] || char);
}
```

---

## 6. Puppeteer Page Setup & Lifecycle

### 6.1 Viewport & Page Configuration
- **Viewport:** `{ width: 600, height: 800, deviceScaleFactor: 3 }`
- Resulting raster dimensions: **1800 × 2400 pixels** (3:4 aspect ratio).
- **Format:** PNG, standard sRGB color space.

### 6.2 Browser Lifecycle
- **Shared Instance:** Maintain a single shared `Browser` instance across the API process.
- **Job Execution:** Create a new `Page` per job (`const page = await browser.newPage()`).
- **Resource Cleanup:** Always close the page in a `finally` block (`await page.close()`).
- **Crash Recovery:** Attach `browser.on('disconnected', () => { ... })` to launch a replacement instance automatically.

### 6.3 Security, Interception & CSP
1. **Network Interception:**
   Puppeteer's `setContent` navigates through `about:blank`, and all real assets (photos, SVG graphics, fonts) must already be inlined as `data:` URIs before calling `setContent`. An explicit allow-list permits `about:blank`, `data:`, and `blob:` while strictly aborting all other network or filesystem requests:
   ```ts
   await page.setRequestInterception(true);
   page.on("request", (req) => {
     const url = req.url();
     // Allow-list: about:blank, data: URIs, and blob: URIs; abort everything else
     if (url === "about:blank" || url.startsWith("data:") || url.startsWith("blob:")) {
       req.continue();
     } else {
       req.abort("blockedbyclient");
     }
   });
   ```
2. **CSP Meta Tag:**
   ```html
   <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
   ```
3. **Execution Sequence:**
   - `await page.setContent(html, { waitUntil: "networkidle0", timeout: 15000 });`
   - Evaluate font loading:
     ```ts
     const fontsReady = await page.evaluate(async (headlineFamily) => {
       await document.fonts.ready;
       return document.fonts.check(`700 36px "${headlineFamily}"`);
     }, template.headlineFont);
     if (!fontsReady) throw new Error("FONT_LOAD_FAILED");
     ```
   - Execute binary search text fitting via page evaluation.
   - Capture screenshot buffer:
     ```ts
     const buffer = await page.screenshot({
       type: "png",
       clip: { x: 0, y: 0, width: 600, height: 800 },
       omitBackground: false
     });
     ```

---

## 7. Failure Modes and Error Codes

All rendering failures map directly to PRD §8.7 behavior:

| Error Code | HTTP Status | Pipeline Reaction | User-Facing Safe Message |
|---|---|---|---|
| `FONT_LOAD_FAILED` | `500` | Log error; retry render once on fresh page; if persists, mark job `failed`. | ফন্ট লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন। |
| `RENDER_TIMEOUT` | `500` | Page load or text-fit script took > 15s. Retry once; if persists, mark job `failed`. | পোস্টার প্রস্তুত করতে অতিরিক্ত সময় লেগেছে। |
| `TEXT_OVERFLOW_AT_MIN` | `400` / `422` | Immediate failure (no retry). Do not corrupt layout. Return field error. | লেখাটি নির্দিষ্ট স্থানে এঁটে যাওয়ার চেয়ে বড়। অনুগ্রহ করে কিছুটা ছোট করুন। |
| `PHOTO_DECODE_FAILED` | `422` | User photo buffer could not be decoded or converted by sharp. Mark job `failed`. | আপলোড করা ছবিটি পড়া যায়নি। অন্য ছবি আপলোড করুন। |

