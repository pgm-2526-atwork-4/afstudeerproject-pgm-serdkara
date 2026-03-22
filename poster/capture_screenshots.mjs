import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  console.log('Starting puppeteer to capture screenshots...');
  const browser = await puppeteer.launch({ 
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 2 },
    headless: "new"
  });
  const page = await browser.newPage();
  
  // 1. Login Flow
  console.log('Navigating to login page...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0', timeout: 60000 });
  
  console.log('Filling in credentials...');
  await page.type('input[type="email"]', 'serdar.karaman.e34@gmail.com');
  await page.type('input[type="password"]', 'bmwe34m5');
  
  console.log('Submitting login form...');
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 })
  ]).catch(e => console.log('Navigation wait after login may have timed out or failed:', e.message));

  // Helper to skip tour
  const skipTour = async () => {
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const skipBtn = btns.find(b => b.textContent && b.textContent.includes('Skip Tour'));
      if (skipBtn) {
        skipBtn.click();
      }
    });
    await new Promise(r => setTimeout(r, 1000));
  };

  // 2. Capture Dashboard
  await new Promise(r => setTimeout(r, 4000));
  console.log('Skipping tour on Dashboard...');
  await skipTour();

  console.log('Capturing Dashboard...');
  await page.screenshot({ path: path.resolve(__dirname, 'screenshot_dashboard.png') });
  
  // 3. Navigate to Checks and Capture
  console.log('Loading Configuration: http://localhost:3000/configuration/checks');
  await page.goto('http://localhost:3000/configuration/checks', { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 4000));
  
  console.log('Skipping tour on Checks...');
  await skipTour();

  console.log('Capturing Checks...');
  await page.screenshot({ path: path.resolve(__dirname, 'screenshot_checks.png') });

  await browser.close();
  console.log('Screenshots captured successfully!');
})();
