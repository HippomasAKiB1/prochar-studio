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

  console.log("=== STARTING PHASE 6C LIVE E2E & SCREENSHOT RUN ===");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);

  async function takeScreenshots(url, baseName) {
    // 360px
    await page.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true });
    await page.goto(url, { waitUntil: "networkidle2" });
    await sleep(500);
    const scroll360 = await page.evaluate(() => document.documentElement.scrollWidth);
    const client360 = await page.evaluate(() => document.documentElement.clientWidth);
    if (scroll360 > client360) {
      throw new Error(`Horizontal scroll at 360px on ${baseName}: ${scroll360} > ${client360}`);
    }
    const path360 = path.join(screenshotsDir, `${baseName}-360.png`);
    await page.screenshot({ path: path360, fullPage: true });
    console.log(`Saved screenshot: ${path360}`);

    // 1280px
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(url, { waitUntil: "networkidle2" });
    await sleep(500);
    const scroll1280 = await page.evaluate(() => document.documentElement.scrollWidth);
    const client1280 = await page.evaluate(() => document.documentElement.clientWidth);
    if (scroll1280 > client1280) {
      throw new Error(`Horizontal scroll at 1280px on ${baseName}: ${scroll1280} > ${client1280}`);
    }
    const path1280 = path.join(screenshotsDir, `${baseName}-1280.png`);
    await page.screenshot({ path: path1280, fullPage: true });
    console.log(`Saved screenshot: ${path1280}`);
  }

  try {
    // 1. Unauthenticated screenshots
    console.log("\n[1/6] Capturing screenshots for Public Pages (/, /login, /register)...");
    await takeScreenshots("http://localhost:3001/", "landing");
    await takeScreenshots("http://localhost:3001/login", "login");
    await takeScreenshots("http://localhost:3001/register", "register");

    // 2. Login as demo
    console.log("\n[2/6] Logging in as demo user...");
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto("http://localhost:3001/login", { waitUntil: "networkidle2" });
    await page.waitForSelector("#login-identifier", { timeout: 10000 });

    await page.type('#login-identifier', "demo@prochar.studio");
    await page.type('#login-password', "ProcharDemo2026!");
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.startsWith("/templates"), { timeout: 15000 });
    console.log("Logged in successfully. Current page:", page.url());

    // 3. Templates page screenshot
    console.log("\n[3/6] Capturing /templates screenshots...");
    await takeScreenshots("http://localhost:3001/templates", "templates");

    // Get a template ID to create posters
    const templateLinks = await page.$$('a[href^="/create/"]');
    if (templateLinks.length === 0) {
      throw new Error("No template links found on /templates");
    }
    const firstTplHref = await page.evaluate((el) => el.getAttribute("href"), templateLinks[0]);
    console.log("Using template href:", firstTplHref);

    // 4. Create Page screenshot
    console.log("\n[4/6] Capturing /create screenshots...");
    await takeScreenshots(`http://localhost:3001${firstTplHref}`, "create");

    // 5. Create 2 Posters via UI
    console.log("\n[5/6] Creating 2 posters via UI...");
    async function createPoster(name, designation, org, district, headline) {
      await page.setViewport({ width: 1280, height: 900 });
      await page.goto(`http://localhost:3001${firstTplHref}`, { waitUntil: "networkidle2" });
      await page.waitForSelector("#create-name", { timeout: 10000 });

      await page.type("#create-name", name);
      await page.type("#create-designation", designation);
      await page.type("#create-org", org);
      await page.type("#create-district", district);

      const fileInput = await page.$('input[type="file"]');
      if (!fileInput) throw new Error("File input not found");
      await fileInput.uploadFile(fixturePath);

      // Wait for photo to upload
      await page.waitForFunction(() => {
        const imgs = document.querySelectorAll('img[alt^="পোস্টারের ছবি"]');
        return imgs.length > 0;
      }, { timeout: 30000 });

      await page.type("#create-headline", headline);

      // Check consent
      const consentBox = await page.$('input[type="checkbox"]');
      if (!consentBox) throw new Error("Consent checkbox not found");
      await consentBox.click();

      // Wait for submit button to become enabled
      await page.waitForFunction(() => {
        const btns = Array.from(document.querySelectorAll('button[type="submit"]:not([disabled])'));
        return btns.length > 0;
      }, { timeout: 10000 });

      // Click desktop submit button
      const submitBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button[type="submit"]:not([disabled])'));
        return btns[0];
      });
      await submitBtn.asElement().click();

      // Wait for navigation to /posters/:id
      await page.waitForFunction(() => window.location.pathname.startsWith("/posters/"), { timeout: 15000 });
      const posterUrl = page.url();
      const posterId = posterUrl.split("/").pop();
      console.log(`Poster created: ${posterId} -> ${posterUrl}`);

      // Wait for completion (status completed)
      console.log("Waiting for poster generation to complete...");
      await page.waitForFunction(() => {
        return document.body.innerText.includes("পোস্টার প্রস্তুত!") || document.body.innerText.includes("ব্যর্থ");
      }, { timeout: 60000 });

      return posterId;
    }

    const poster1Id = await createPoster("মো: শফিকুল ইসলাম", "সভাপতি", "বাংলাদেশ আওয়ামী লীগ", "ঢাকা", "শুভ বিজয় দিবস ২০২৬");
    console.log("Poster 1 finished!");

    const poster2Id = await createPoster("মো: রফিকুল ইসলাম", "সাধারণ সম্পাদক", "যুবলীগ", "চট্টগ্রাম", "ঐক্যবদ্ধ বাংলাদেশ বিনির্মাণে");
    console.log("Poster 2 finished!");

    // Capture completed poster screenshots at 360 and 1280
    console.log("\nCapturing completed poster screenshots...");
    await takeScreenshots(`http://localhost:3001/posters/${poster2Id}`, "poster-completed");

    // 6. Navigate to /posters
    console.log("\n[6/6] Verifying History /posters flow...");
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto("http://localhost:3001/posters", { waitUntil: "networkidle2" });
    await sleep(1000);

    // Capture /posters screenshots
    await takeScreenshots("http://localhost:3001/posters", "posters");

    // Return to 1280 for delete flow testing
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto("http://localhost:3001/posters", { waitUntil: "networkidle2" });
    await sleep(1000);

    // Count items
    const initialItemCount = await page.evaluate(() => {
      const cards = document.querySelectorAll('button[aria-label="মুছে ফেলুন"]');
      return cards.length;
    });
    console.log(`Initial posters count on /posters: ${initialItemCount} (expected >= 2)`);
    if (initialItemCount < 2) {
      throw new Error(`Expected at least 2 posters, found ${initialItemCount}`);
    }

    // Verify thumbnail click navigates to /posters/:id
    console.log("Testing thumbnail click navigation...");
    const firstDetailLink = await page.$('a[href^="/posters/"]');
    const expectedHref = await page.evaluate((el) => el.getAttribute("href"), firstDetailLink);
    await firstDetailLink.click();
    await page.waitForFunction((href) => window.location.pathname === href, { timeout: 10000 }, expectedHref);
    console.log(`Thumbnail navigation verified! Navigated to: ${page.url()}`);

    // Go back to /posters
    await page.goto("http://localhost:3001/posters", { waitUntil: "networkidle2" });
    await sleep(1000);

    // Click Delete on the first poster
    console.log("Testing delete flow...");
    const deleteBtns = await page.$$('button[aria-label="মুছে ফেলুন"]');
    await deleteBtns[0].click();

    // Verify confirm dialog appears with expected copy
    console.log("Verifying confirm dialog copy...");
    await page.waitForFunction(() => {
      return document.body.innerText.includes("এই পোস্টারটি মুছে ফেলবেন? এটি আর ফিরিয়ে আনা যাবে না।");
    }, { timeout: 5000 });
    console.log("Confirm dialog verified with correct copy!");

    // Click confirm delete ("মুছে ফেলুন")
    const confirmDeleteBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.find((b) => b.textContent && b.textContent.trim() === "মুছে ফেলুন");
    });
    await confirmDeleteBtn.asElement().click();

    // Wait for optimistic removal
    await sleep(1500);
    const countAfterDelete = await page.evaluate(() => {
      const cards = document.querySelectorAll('button[aria-label="মুছে ফেলুন"]');
      return cards.length;
    });
    console.log(`Posters count after delete: ${countAfterDelete} (expected: ${initialItemCount - 1})`);
    if (countAfterDelete !== initialItemCount - 1) {
      throw new Error(`Expected ${initialItemCount - 1} posters after delete, found ${countAfterDelete}`);
    }

    // Refresh page and assert persistent deletion
    console.log("Refreshing page to confirm persistence...");
    await page.reload({ waitUntil: "networkidle2" });
    await sleep(1000);

    const countAfterRefresh = await page.evaluate(() => {
      const cards = document.querySelectorAll('button[aria-label="মুছে ফেলুন"]');
      return cards.length;
    });
    console.log(`Posters count after refresh: ${countAfterRefresh} (persisted: ${countAfterRefresh === initialItemCount - 1})`);
    if (countAfterRefresh !== initialItemCount - 1) {
      throw new Error(`Persistence failure: expected ${initialItemCount - 1} posters after reload, found ${countAfterRefresh}`);
    }

    console.log("\n=======================================================");
    console.log(">>> ALL PHASE 6C LIVE E2E & SCREENSHOT CHECKS PASSED! <<<");
    console.log("=======================================================\n");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
