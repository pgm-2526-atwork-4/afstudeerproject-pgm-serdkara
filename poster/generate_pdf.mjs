import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  console.log('Starting puppeteer...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const htmlPath = path.resolve(__dirname, 'poster.html');
  console.log('Loading HTML: file://' + htmlPath);
  
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
  
  const outPath = path.resolve(__dirname, 'LLM_Policy_Validator_Poster.pdf');
  console.log('Generating PDF: ' + outPath);
  
  await page.pdf({
    path: outPath,
    format: 'A0',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });
  
  await browser.close();
  console.log('PDF generated successfully!');
})();
