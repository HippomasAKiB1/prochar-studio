const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const screenshotsDir = path.resolve(__dirname, "../apps/web/.screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const fixturePath = path.resolve(__dirname, "../apps/web/test-fixture.jpg");

  console.log("=== STARTING PHASE 6B LIVE E2E VERIFICATION ===");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Helper to assert horizontal overflow at 360px
  async function assertNoHorizontalScroll(page, screenName) {
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    console.log(`[360px Scroll Check] ${screenName}: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);
    if (scrollWidth > clientWidth) {
      throw new Error(`Horizontal scroll detected on ${screenName}: scrollWidth (${scrollWidth}) > clientWidth (${clientWidth})`);
    }
  }

  // Helper to ensure accordion is open
  async function ensureAccordionOpen(page) {
    const isInputVisible = await page.$("#edit-headline");
    if (!isInputVisible) {
      const accBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        return btns.find((b) => b.textContent && b.textContent.includes("লেখা বদলান"));
      });
      if (accBtn.asElement()) {
        await accBtn.asElement().click();
        await page.waitForSelector("#edit-headline", { timeout: 5000 });
      }
    }
  }

  try {
    // 1. Login as demo
    console.log("\n[Step 1] Logging in as demo user...");
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });

    await page.type('#login-identifier', "demo@prochar.studio");
    await page.type('#login-password', "ProcharDemo2026!");
    await page.click('button[type="submit"]');

    // Wait for client navigation to /templates
    await page.waitForFunction(() => window.location.pathname.startsWith("/templates"), { timeout: 15000 });
    console.log("Redirected after login to:", page.url());

    // 2. Navigate /templates -> see 3 templates
    console.log("\n[Step 2] Verifying /templates at 1280px...");
    await page.waitForSelector('a[href^="/create/"]', { timeout: 10000 });
    let cards = await page.$$('a[href^="/create/"]');
    console.log(`Found ${cards.length} template cards.`);
    if (cards.length !== 3) {
      throw new Error(`Expected 3 templates, found ${cards.length}`);
    }

    // Capture 1280px screenshot of /templates
    const tpl1280Path = path.join(screenshotsDir, "templates-1280.png");
    await page.screenshot({ path: tpl1280Path, fullPage: true });
    console.log(`Saved screenshot: ${tpl1280Path}`);

    // Capture 360px screenshot of /templates & check overflow
    await page.setViewport({ width: 360, height: 800 });
    await sleep(500);
    await assertNoHorizontalScroll(page, "/templates");
    const tpl360Path = path.join(screenshotsDir, "templates-360.png");
    await page.screenshot({ path: tpl360Path, fullPage: true });
    console.log(`Saved screenshot: ${tpl360Path}`);

    // 3. Filter chips: Click chip "শোক/স্মরণ" -> 1 template shows
    console.log("\n[Step 3] Clicking chip 'শোক/স্মরণ'...");
    const chipCondolence = await page.evaluateHandle(() => {
      const chips = Array.from(document.querySelectorAll("button"));
      return chips.find((c) => c.textContent && c.textContent.includes("শোক/স্মরণ"));
    });
    if (!chipCondolence.asElement()) {
      throw new Error("Could not find chip 'শোক/স্মরণ'");
    }
    await chipCondolence.asElement().click();
    await sleep(1000);

    console.log("URL after clicking শোক/স্মরণ:", page.url());
    cards = await page.$$('a[href^="/create/"]');
    console.log(`Found ${cards.length} template card(s) under condolence.`);
    if (cards.length !== 1) {
      throw new Error(`Expected 1 condolence template, found ${cards.length}`);
    }

    // 4. Click "সব" -> 3 templates show
    console.log("\n[Step 4] Clicking chip 'সব'...");
    const chipAll = await page.evaluateHandle(() => {
      const chips = Array.from(document.querySelectorAll("button"));
      return chips.find((c) => c.textContent && c.textContent.trim() === "সব");
    });
    await chipAll.asElement().click();
    await sleep(1000);
    console.log("URL after clicking সব:", page.url());
    cards = await page.$$('a[href^="/create/"]');
    console.log(`Found ${cards.length} template card(s) under all.`);
    if (cards.length !== 3) {
      throw new Error(`Expected 3 templates after reset, found ${cards.length}`);
    }

    // 5. Click a template -> /create/[id]
    console.log("\n[Step 5] Clicking first template...");
    await cards[0].click();
    await page.waitForFunction(() => window.location.pathname.startsWith("/create/"), { timeout: 15000 });
    console.log("Navigated to:", page.url());

    // Check 360px on /create/*
    await assertNoHorizontalScroll(page, "/create/[templateId]");
    const create360Path = path.join(screenshotsDir, "create-360.png");
    await page.screenshot({ path: create360Path, fullPage: true });
    console.log(`Saved screenshot: ${create360Path}`);

    // Switch to 1280px and capture screenshot
    await page.setViewport({ width: 1280, height: 900 });
    await sleep(500);
    const create1280Path = path.join(screenshotsDir, "create-1280.png");
    await page.screenshot({ path: create1280Path, fullPage: true });
    console.log(`Saved screenshot: ${create1280Path}`);

    // 6. Fill form, upload 1 photo, consent, submit
    console.log("\n[Step 6] Filling poster form...");
    await page.type("#create-name", "মোহাম্মদ রফিকুল ইসলাম");
    await page.type("#create-designation", "সদস্য সচিব");
    await page.type("#create-org", "সম্মিলিত সামাজিক আন্দোলন");
    await page.type("#create-district", "ঢাকা");
    await page.type("#create-headline", "মহান বিজয় দিবসের রক্তিম শুভেচ্ছা");
    await page.type("#create-subtext", "সকল শহীদদের প্রতি বিনম্র শ্রদ্ধা");
    await page.type("#create-credit", "প্রচারে: এলাকাবাসী");

    console.log("Uploading photo fixture...");
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(fixturePath);

    // Wait for upload success thumbnail
    console.log("Waiting for photo thumbnail to appear...");
    await page.waitForSelector('img[alt^="পোস্টারের ছবি"]', { timeout: 15000 });
    console.log("Photo uploaded successfully!");

    // Consent checkbox
    console.log("Checking consent checkbox...");
    await page.click('input[type="checkbox"]');
    await sleep(500);

    // Submit form
    console.log("Submitting form...");
    const submitBtnHandle = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button[type="submit"]'));
      return btns.find((b) => b.offsetParent !== null && !b.disabled);
    });
    if (!submitBtnHandle.asElement()) {
      throw new Error("Could not find enabled visible submit button");
    }
    await submitBtnHandle.asElement().click();

    // 7. Wait for client redirect to /posters/[id]
    console.log("\n[Step 7] Waiting for redirect to /posters/[id]...");
    await page.waitForFunction(() => window.location.pathname.startsWith("/posters/"), { timeout: 15000 });
    const posterUrl = page.url();
    console.log("Navigated to poster page:", posterUrl);

    // Generating state verification
    console.log("Verifying generating state (stepper + roller animation)...");
    await page.waitForSelector('.animate-roller, a[href*="/download?format=png"]', { timeout: 15000 });
    const hasRoller = await page.$(".animate-roller");
    console.log("Found roller bar element during generation:", !!hasRoller);

    // Capture generating screenshot at 1280px
    const gen1280Path = path.join(screenshotsDir, "poster-generating-1280.png");
    await page.screenshot({ path: gen1280Path, fullPage: true });
    console.log(`Saved screenshot: ${gen1280Path}`);

    // Capture generating screenshot at 360px & check scroll
    await page.setViewport({ width: 360, height: 800 });
    await sleep(500);
    await assertNoHorizontalScroll(page, "/posters/[id] generating");
    const gen360Path = path.join(screenshotsDir, "poster-generating-360.png");
    await page.screenshot({ path: gen360Path, fullPage: true });
    console.log(`Saved screenshot: ${gen360Path}`);

    // Switch back to 1280px to observe completion
    await page.setViewport({ width: 1280, height: 900 });

    // 8. Wait for completed state (poll up to 60s)
    console.log("\n[Step 8] Waiting for generation completion...");
    await page.waitForSelector('a[href*="/download?format=png"]', { timeout: 60000 });
    console.log("Generation completed! Download link visible.");

    // Verify "প্রস্তুত" stamp is rendered
    const readyStamp = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("*")).some(
        (el) => el.textContent && el.textContent.trim() === "প্রস্তুত"
      );
    });
    console.log("Found 'প্রস্তুত' stamp:", readyStamp);

    // Capture completed screenshot at 1280px
    const comp1280Path = path.join(screenshotsDir, "poster-completed-1280.png");
    await page.screenshot({ path: comp1280Path, fullPage: true });
    console.log(`Saved screenshot: ${comp1280Path}`);

    // Capture completed screenshot at 360px & check scroll
    await page.setViewport({ width: 360, height: 800 });
    await sleep(500);
    await assertNoHorizontalScroll(page, "/posters/[id] completed");
    const comp360Path = path.join(screenshotsDir, "poster-completed-360.png");
    await page.screenshot({ path: comp360Path, fullPage: true });
    console.log(`Saved screenshot: ${comp360Path}`);

    // 9. Click "PNG ডাউনলোড" -> verify download endpoint
    console.log("\n[Step 9] Verifying PNG download link...");
    await page.setViewport({ width: 1280, height: 900 });
    const downloadHref = await page.$eval('a[href*="/download?format=png"]', (a) => a.href);
    console.log("Download URL:", downloadHref);

    // Fetch the download URL using cookies from page session
    const cookies = await page.cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const dlRes = await fetch(downloadHref, {
      headers: { cookie: cookieHeader },
    });
    console.log("Download response HTTP status:", dlRes.status);
    console.log("Content-Type:", dlRes.headers.get("content-type"));
    console.log("Content-Disposition:", dlRes.headers.get("content-disposition"));
    if (dlRes.status !== 200 || !dlRes.headers.get("content-type")?.includes("image/png")) {
      throw new Error(`Download endpoint failed with status ${dlRes.status} or invalid content-type`);
    }

    // 10. Regenerate iterations until retries are exhausted (max 3 retries)
    for (let iteration = 1; iteration <= 3; iteration++) {
      console.log(`\n[Step 10.${iteration}] Testing regeneration #${iteration}...`);
      await ensureAccordionOpen(page);
      await sleep(500);

      // Edit headline
      await page.evaluate((iter) => {
        const el = document.getElementById("edit-headline");
        if (el) el.value = `বিজয় দিবসের পরিমার্জিত সংস্করণ নং ${iter}`;
      }, iteration);

      // Trigger change event
      await page.type("#edit-headline", " ");

      // Click submit "আবার ছাপুন"
      const regenBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        return btns.find((b) => b.textContent && b.textContent.includes("আবার ছাপুন") && !b.disabled);
      });
      if (!regenBtn.asElement()) {
        throw new Error(`Could not find enabled 'আবার ছাপুন' button for iteration ${iteration}`);
      }
      await regenBtn.asElement().click();
      console.log(`Submitted regeneration #${iteration}. Waiting for roller animation...`);

      // Wait for generating state (.animate-roller) to appear
      await page.waitForSelector(".animate-roller", { timeout: 15000 });
      console.log(`Generation #${iteration} in progress (roller active)...`);

      // Wait for generating state to finish (roller disappears)
      await page.waitForFunction(() => !document.querySelector(".animate-roller"), { timeout: 60000 });
      await page.waitForSelector('a[href*="/download?format=png"]', { timeout: 10000 });
      await sleep(1000);
      console.log(`Regeneration #${iteration} completed successfully!`);
    }

    // 11. Verify retries exhausted UI state
    console.log("\n[Step 11] Verifying exhausted retries UI state...");
    await ensureAccordionOpen(page);
    await sleep(500);

    const exhaustedMsg = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("*")).some(
        (el) => el.textContent && el.textContent.includes("আবার ছাপার সুযোগ শেষ")
      );
    });
    const regenDisabled = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.textContent && b.textContent.includes("আবার ছাপুন"));
      return btn ? btn.disabled : false;
    });

    console.log("Found 'আবার ছাপার সুযোগ শেষ' message:", exhaustedMsg);
    console.log("Regenerate button is disabled:", regenDisabled);

    if (!exhaustedMsg || !regenDisabled) {
      throw new Error("Failed to verify exhausted retries UI state");
    }

    console.log("\n=== ALL PHASE 6B EXIT GATE STEPS PASSED SUCCESSFULLY! ===");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("FATAL ERROR in E2E script:", err);
  process.exit(1);
});
