import type { Browser } from "puppeteer" with { "resolution-mode": "import" };
import { logger } from "../../config/logger.js";

let browserInstance: Browser | null = null;
let launchPromise: Promise<Browser> | null = null;

export interface TextSlotFitConfig {
  id: string;
  options: {
    minFont: number;
    maxFont: number;
    maxLines: number;
    lineHeight: number;
    source: string;
    headlineTier: "large" | "xlarge";
    truncate?: boolean;
  };
}

/**
 * Returns singleton Puppeteer Browser instance. Launches with required flags and reconnects if disconnected.
 */
export async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  if (launchPromise) {
    return launchPromise;
  }

  launchPromise = (async () => {
    try {
      const puppeteerModule = await import("puppeteer");
      const puppeteer = puppeteerModule.default || puppeteerModule;

      const browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-first-run",
          "--font-render-hinting=none",
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      });

      browser.on("disconnected", () => {
        logger.warn("Puppeteer browser disconnected. Clearing singleton instance.");
        browserInstance = null;
        launchPromise = null;
      });

      browserInstance = browser;
      return browser;
    } finally {
      launchPromise = null;
    }
  })();

  return launchPromise;
}

/**
 * Closes the singleton browser instance if running.
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch (err) {
      logger.error({ err }, "Error closing Puppeteer browser");
    } finally {
      browserInstance = null;
      launchPromise = null;
    }
  }
}

export interface FontRequirement {
  family: string;
  weight: number | string;
}

/**
 * Renders an HTML string into an 1800x2400 PNG buffer using Puppeteer (deviceScaleFactor: 3).
 */
export async function renderHtmlToPng(
  html: string,
  nonce: string,
  textSlotsWithOptions?: TextSlotFitConfig[],
  fontsToCheck?: FontRequirement[]
): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 600, height: 800, deviceScaleFactor: 3 });

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      if (
        url === "about:blank" ||
        url.startsWith("data:") ||
        url.startsWith("blob:")
      ) {
        req.continue();
      } else {
        req.abort("blockedbyclient");
      }
    });

    await page.setContent(html, {
      waitUntil: "networkidle0" as unknown as "load",
      timeout: 15000,
    });

    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const fontsToVerify =
      fontsToCheck && fontsToCheck.length > 0
        ? fontsToCheck
        : [{ family: "Hind Siliguri", weight: 700 }];

    for (const f of fontsToVerify) {
      const fontSpec = `${f.weight} 36px '${f.family}'`;
      const ok = await page.evaluate((spec) => document.fonts.check(spec), fontSpec);
      if (!ok) {
        throw new Error(`FONT_LOAD_FAILED: ${f.family} ${f.weight}`);
      }
    }

    // 7a. Execute fit script from nonce'd tag
    await page.evaluate((scriptNonce) => {
      const s = document.querySelector(`script[nonce="${scriptNonce}"]`);
      if (!s) throw new Error("FIT_SCRIPT_MISSING");
      if (s.textContent && s.textContent.trim()) {
        (0, eval)(s.textContent);
      }
    }, nonce);

    // 7b. Execute text fitting on each slot
    if (textSlotsWithOptions && textSlotsWithOptions.length > 0) {
      await page.evaluate((slots) => {
        for (const slot of slots) {
          // @ts-expect-error window.__fitText injected by script
          if (typeof window.__fitText === "function") {
            // @ts-expect-error window.__fitText injected by script
            window.__fitText(slot.id, slot.options);
          }
        }
      }, textSlotsWithOptions);
    }

    const screenshotResult = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: 600, height: 800 },
      omitBackground: false,
    });

    return Buffer.from(screenshotResult);
  } finally {
    await page.close();
  }
}
