const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const VIEWPORTS = [
  { name: "360", width: 360, height: 800 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 900 },
];

async function run() {
  const screenshotsDir = path.resolve(__dirname, "../apps/web/.screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log("=== STARTING PHASE 6C RESPONSIVE SWEEP ===");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // 1. Login first to establish cookie session
  console.log("Logging in as demo user...");
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
  await page.type('#login-identifier', "demo@prochar.studio");
  await page.type('#login-password', "ProcharDemo2026!");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.pathname.startsWith("/templates"), { timeout: 15000 });
  console.log("Logged in successfully!");

  // Find a template ID and a completed poster ID for testing
  await page.waitForSelector('a[href^="/create/"]', { timeout: 10000 });
  const templateHref = await page.$eval('a[href^="/create/"]', (a) => a.getAttribute("href"));
  console.log("Found template link:", templateHref);

  // Navigate to /posters to find a completed poster ID
  await page.goto("http://localhost:3000/posters", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2000));
  const posterHref = await page.$eval('a[href^="/posters/"]', (a) => a.getAttribute("href")).catch(() => null);
  console.log("Found poster link:", posterHref);

  const testRoutes = [
    { name: "landing", path: "/" },
    { name: "login", path: "/login" },
    { name: "register", path: "/register" },
    { name: "templates", path: "/templates" },
    { name: "create", path: templateHref },
    { name: "posters", path: "/posters" },
  ];

  if (posterHref) {
    testRoutes.push({ name: "poster-detail", path: posterHref });
  }

  let totalChecks = 0;
  let passedChecks = 0;

  for (const route of testRoutes) {
    console.log(`\n--- Testing Route: ${route.name} (${route.path}) ---`);
    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`http://localhost:3000${route.path}`, { waitUntil: "networkidle2" });
      await new Promise((r) => setTimeout(r, 800));

      totalChecks++;
      // Check horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      const h1Count = await page.evaluate(() => document.querySelectorAll("h1").length);

      console.log(
        `[${vp.name}px] ${route.name}: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}, h1Count=${h1Count}`
      );

      if (scrollWidth > clientWidth) {
        throw new Error(
          `HORIZONTAL OVERFLOW on ${route.name} at ${vp.name}px: scrollWidth (${scrollWidth}) > clientWidth (${clientWidth})`
        );
      }

      if (h1Count !== 1) {
        throw new Error(
          `EXPECTED EXACTLY 1 <h1> on ${route.name} at ${vp.name}px, found ${h1Count}`
        );
      }

      // Save screenshot
      const shotPath = path.join(screenshotsDir, `${route.name}-${vp.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: true });
      passedChecks++;
    }
  }

  console.log(`\n=== RESPONSIVE SWEEP COMPLETE: ${passedChecks}/${totalChecks} checks passed! ===`);
  await browser.close();
}

run().catch((err) => {
  console.error("FATAL ERROR in responsive sweep:", err);
  process.exit(1);
});
