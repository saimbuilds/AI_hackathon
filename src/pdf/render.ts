// Headless Chromium -> PDF. On Vercel: puppeteer-core + @sparticuz/chromium-min (the browser is downloaded once
// per cold start from a release pack). Locally: your installed Chrome/Edge (set CHROME_PATH to override).
import { existsSync } from 'node:fs';
import chromium from '@sparticuz/chromium-min';
import puppeteer, { type Browser } from 'puppeteer-core';

// Must match the installed @sparticuz/chromium-min version.
const PACK_URL = process.env.CHROMIUM_PACK_URL ?? 'https://github.com/Sparticuz/chromium/releases/download/v153.0.0/chromium-v153.0.0-pack.x64.tar';

const LOCAL_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter((p): p is string => !!p);

async function launch(): Promise<Browser> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(PACK_URL), headless: true });
  }
  const local = LOCAL_CANDIDATES.find((p) => existsSync(p));
  if (!local) throw new Error('No local Chrome found: set CHROME_PATH');
  return puppeteer.launch({ executablePath: local, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
}

// The print page signals it is fully laid out (fonts loaded, images decoded) with <html data-print-ready="true">.
export async function renderPdf(url: string, opts: { timeoutMs?: number } = {}): Promise<Buffer> {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.emulateMediaType('print');
    await page.goto(url, { waitUntil: 'networkidle0', timeout: opts.timeoutMs ?? 25_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => document.documentElement.dataset.printReady === 'true', { timeout: 8_000 }).catch(() => undefined); // pages that never set it still print
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
