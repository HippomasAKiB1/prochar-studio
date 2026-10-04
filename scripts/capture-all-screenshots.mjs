import puppeteer from 'puppeteer';
import path from 'node:path';
import fs from 'node:fs';
import jwt from 'jsonwebtoken';

async function main() {
  const secret = 'production_ready_jwt_secret_min_32_characters_long';
  const token = jwt.sign(
    { sub: '6abf3d343f8fce41d9d28270', role: 'user' },
    secret,
    { expiresIn: '7d' }
  );
  console.log('Generated valid JWT token for demo user.');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });

  // 1. Landing page (unauthenticated / public view)
  console.log('Capturing landing-1280.png...');
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  const landingPath = path.resolve('docs/screenshots/landing-1280.png');
  await page.screenshot({ path: landingPath, fullPage: true });
  console.log(`Saved ${landingPath} (${fs.statSync(landingPath).size} bytes)`);

  // Set auth cookie
  await page.setCookie({
    name: 'prochar_token',
    value: token,
    url: 'http://localhost:3001',
    httpOnly: true,
  });

  // 2. Templates Gallery page
  console.log('Capturing templates-1280.png...');
  await page.goto('http://localhost:3001/templates', { waitUntil: 'networkidle0' });
  await page.waitForSelector('img[src*="/api/storage/thumb-"]', { timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
  const templatesPath = path.resolve('docs/screenshots/templates-1280.png');
  await page.screenshot({ path: templatesPath, fullPage: false });
  console.log(`Saved ${templatesPath} (${fs.statSync(templatesPath).size} bytes)`);

  // 3. Posters History page
  console.log('Capturing posters-1280.png...');
  await page.goto('http://localhost:3001/posters', { waitUntil: 'networkidle0' });
  await page.waitForSelector('img[src*="/api/storage/posters/generated/"]', { timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2500));
  const postersPath = path.resolve('docs/screenshots/posters-1280.png');
  await page.screenshot({ path: postersPath, fullPage: true });
  console.log(`Saved ${postersPath} (${fs.statSync(postersPath).size} bytes)`);

  // 4. Poster Detail page (Completed poster)
  console.log('Capturing poster-completed-1280.png...');
  const posterId = '6ac20a32ebbbce336f48e5da';
  await page.goto(`http://localhost:3001/posters/${posterId}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('img', { timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2500));
  const posterDetailPath = path.resolve('docs/screenshots/poster-completed-1280.png');
  await page.screenshot({ path: posterDetailPath, fullPage: false });
  console.log(`Saved ${posterDetailPath} (${fs.statSync(posterDetailPath).size} bytes)`);

  await browser.close();
  console.log('All 4 screenshots captured successfully!');
}

main().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
