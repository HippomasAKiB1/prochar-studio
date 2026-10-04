import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const timestamp = Date.now();
const cloneDir = `E:\\prochar-smoke-${timestamp}`;
const results = [];
const startTime = Date.now();

function runStep(name, fn) {
  process.stdout.write(`>>> Running: ${name}...\n`);
  const t0 = Date.now();
  let status = 'PASS';
  let details = '';
  try {
    details = fn();
  } catch (err) {
    status = 'FAIL';
    details = err.message || String(err);
    console.error(`ERROR in ${name}: ${details}`);
    throw err;
  } finally {
    const elapsedSec = ((Date.now() - t0) / 1000).toFixed(2);
    results.push({ name, elapsedSec, status, details: (details || '').toString().trim() });
    console.log(`>>> Completed: ${name} in ${elapsedSec}s [${status}]\n`);
  }
}

let cookieVal = '';
let templateObj = null;
let uploadedPhoto = null;
let posterId = '';

try {
  // Step 1: git clone
  runStep('1. git clone', () => {
    return execSync(`git clone https://github.com/HippomasAKiB1/prochar-studio.git "${cloneDir}"`, {
      encoding: 'utf-8',
    });
  });

  // Step 2: npm install
  runStep('2. npm install', () => {
    return execSync('npm install', {
      cwd: cloneDir,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
    });
  });

  // Step 3: cp .env.example .env
  runStep('3. cp .env.example .env', () => {
    const example = fs.readFileSync(path.join(cloneDir, '.env.example'), 'utf-8');
    let env = example
      .replace(/MONGODB_URI=.*/, 'MONGODB_URI=mongodb://localhost:27017/prochar')
      .replace(/JWT_SECRET=.*/, 'JWT_SECRET=super-secret-smoke-test-jwt-token-string-at-least-32-chars!');
    fs.writeFileSync(path.join(cloneDir, '.env'), env);
    return 'Configured .env successfully';
  });

  // Step 4: npm run seed
  runStep('4. npm run seed', () => {
    return execSync('npm run seed', {
      cwd: cloneDir,
      encoding: 'utf-8',
    });
  });

  // Step 5: npm run seed:thumbnails
  runStep('5. npm run seed:thumbnails', () => {
    return execSync('npm run seed:thumbnails', {
      cwd: cloneDir,
      encoding: 'utf-8',
    });
  });

  // Step 6: curl /api/health
  runStep('6. GET /api/health', () => {
    const res = execSync('curl.exe -s http://localhost:8080/api/health', { encoding: 'utf-8' });
    const parsed = JSON.parse(res);
    if (parsed.status !== 'ok') throw new Error(`Health check failed: ${res}`);
    return res;
  });

  // Step 7: POST /api/auth/login
  runStep('7. POST /api/auth/login', () => {
    const loginPayload = JSON.stringify({
      identifier: 'demo@prochar.studio',
      password: 'ProcharDemo2026!',
    });
    const loginFile = path.join(cloneDir, 'login-req.json');
    fs.writeFileSync(loginFile, loginPayload, 'utf-8');

    const res = execSync(
      `curl.exe -s -i -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d @"${loginFile}"`,
      { encoding: 'utf-8' }
    );
    const match = res.match(/prochar_token=([^;\r\n]+)/);
    if (!match) throw new Error(`Login failed to return cookie: ${res}`);
    cookieVal = match[1];
    return 'Logged in. Cookie captured: ' + cookieVal.slice(0, 20) + '...';
  });

  // Step 8: GET /api/templates
  runStep('8. GET /api/templates', () => {
    const res = execSync(
      `curl.exe -s http://localhost:8080/api/templates -H "Cookie: prochar_token=${cookieVal}"`,
      { encoding: 'utf-8' }
    );
    const templates = JSON.parse(res);
    if (!Array.isArray(templates) || templates.length === 0) {
      throw new Error(`No templates returned: ${res}`);
    }
    templateObj = templates[0];
    return `Found ${templates.length} templates. Selected: ${templateObj.title} (${templateObj.id}, ${templateObj.occasionType})`;
  });

  // Step 9: POST /api/upload
  runStep('9. POST /api/upload', () => {
    // Generate realistic 800x1000 photo using sharp from the newly installed node_modules
    const samplePhotoPath = path.join(cloneDir, 'sample-photo.jpg');
    const sharpGenScript = `
      const sharp = require('sharp');
      sharp({
        create: {
          width: 800,
          height: 1000,
          channels: 3,
          noise: { type: 'gaussian', mean: 128, sigma: 40 }
        }
      }).jpeg().toFile('${samplePhotoPath.replace(/\\/g, '/')}');
    `;
    execSync(`node -e "${sharpGenScript.replace(/\n/g, ' ')}"`, { cwd: cloneDir });

    const res = execSync(
      `curl.exe -s -X POST http://localhost:8080/api/upload -H "Cookie: prochar_token=${cookieVal}" -F "photos=@${samplePhotoPath}"`,
      { encoding: 'utf-8' }
    );
    const parsed = JSON.parse(res);
    if (!parsed.photos || parsed.photos.length === 0) {
      throw new Error(`Photo upload failed: ${res}`);
    }
    uploadedPhoto = parsed.photos[0];
    return `Uploaded photo publicId: ${uploadedPhoto.publicId}`;
  });

  // Step 10: POST /api/posters (Create poster generation job)
  runStep('10. POST /api/posters', () => {
    const payload = JSON.stringify({
      templateId: templateObj.id,
      formData: {
        name: 'বীর মুক্তিযোদ্ধা রফিকুল ইসলাম',
        designation: 'সভাপতি',
        partyOrOrganization: 'বাংলাদেশ আওয়ামী লীগ',
        union: 'ধানমন্ডি',
        thana: 'ধানমন্ডি',
        district: 'ঢাকা',
        occasionType: templateObj.occasionType,
        headline: '১৬ই ডিসেম্বর মহান বিজয় দিবস সফল হোক',
        subtext: 'জাতীয় ঐক্য ও সংহতি বজায় রাখুন',
        creditLine: 'প্রচারে: এলাকাবাসী',
      },
      photos: [
        {
          url: uploadedPhoto.url,
          publicId: uploadedPhoto.publicId,
        },
      ],
      consent: true,
    });
    const payloadFile = path.join(cloneDir, 'create-poster-req.json');
    fs.writeFileSync(payloadFile, payload, 'utf-8');

    const res = execSync(
      `curl.exe -s -X POST http://localhost:8080/api/posters -H "Content-Type: application/json" -H "Cookie: prochar_token=${cookieVal}" -d @"${payloadFile}"`,
      { encoding: 'utf-8' }
    );
    const parsed = JSON.parse(res);
    if (!parsed.id) throw new Error(`Poster creation did not return id: ${res}`);
    posterId = parsed.id;
    return `Poster job enqueued. ID: ${posterId}, stage: ${parsed.stage}`;
  });

  // Step 11: Poll /api/posters/:id until completed
  runStep('11. GET /api/posters/:id (polling)', () => {
    let completed = false;
    let attempts = 0;
    while (!completed && attempts < 40) {
      attempts++;
      execSync('ping 127.0.0.1 -n 3 > nul'); // 2-second sleep
      const res = execSync(
        `curl.exe -s http://localhost:8080/api/posters/${posterId} -H "Cookie: prochar_token=${cookieVal}"`,
        { encoding: 'utf-8' }
      );
      const parsed = JSON.parse(res);
      if (parsed.status === 'completed') {
        completed = true;
        return `Poster generated successfully in ${attempts} polling cycles (${attempts * 2}s)`;
      } else if (parsed.status === 'failed') {
        throw new Error(`Poster generation failed: ${res}`);
      }
    }
    if (!completed) throw new Error('Polling timed out after 40 attempts');
  });

  // Step 12: GET /api/posters/:id/download
  runStep('12. GET /api/posters/:id/download', () => {
    const downloadPath = path.join(cloneDir, 'poster-download.png');
    execSync(
      `curl.exe -s "http://localhost:8080/api/posters/${posterId}/download?format=png" -H "Cookie: prochar_token=${cookieVal}" -o "${downloadPath}"`
    );
    if (!fs.existsSync(downloadPath)) throw new Error('Download file not created');
    const stats = fs.statSync(downloadPath);
    if (stats.size < 500000) throw new Error(`Downloaded PNG too small: ${stats.size} bytes`);
    return `Downloaded PNG: ${stats.size} bytes (${(stats.size / 1024 / 1024).toFixed(2)} MB, > 500KB verified)`;
  });

} finally {
  const totalSec = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalMin = (totalSec / 60).toFixed(2);
  console.log('\n================ SMOKE TEST SUMMARY ================');
  console.log(`Total Time: ${totalMin} minutes (${totalSec}s)`);
  console.log(`Target: < 10 minutes`);
  console.log(`Directory: ${cloneDir}\n`);
  console.table(results.map(r => ({ Step: r.name, Duration: `${r.elapsedSec}s`, Status: r.status, Details: r.details.slice(0, 60) })));

  if (fs.existsSync(cloneDir)) {
    console.log(`\nCleaning up temporary directory: ${cloneDir}...`);
    try {
      fs.rmSync(cloneDir, { recursive: true, force: true });
      console.log('Cleanup complete.');
    } catch (e) {
      console.log('Cleanup notice (some files locked by system, manual sweep available):', e.message);
    }
  }
}
