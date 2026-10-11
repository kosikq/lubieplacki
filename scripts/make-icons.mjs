// Generuje ikony PWA i ekrany startowe iOS z SVG (render przez Playwright/Chromium).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const out = (p) => resolve(here, '../public', p);
mkdirSync(out('icons'), { recursive: true });
mkdirSync(out('splash'), { recursive: true });

// scale: wielkość tarczy względem płótna (maskable potrzebuje marginesu)
const iconSvg = (scale = 1) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="100%" height="100%">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1E90FF"/>
      <stop offset="1" stop-color="#4B3BD8"/>
    </linearGradient>
    <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#E4ECFF"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  <circle cx="820" cy="190" r="260" fill="#ffffff" opacity="0.07"/>
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    <path d="M512 170 L790 270 V500 C790 680 670 800 512 860 C354 800 234 680 234 500 V270 Z" fill="url(#s)"/>
    <path d="M395 520 L480 605 L640 430" fill="none" stroke="#2F6BFF" stroke-width="70" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

const page = await (await chromium.launch()).newPage();

async function shot(html, w, h, file) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0;width:${w}px;height:${h}px;overflow:hidden">${html}</body></html>`);
  await page.screenshot({ path: out(file), omitBackground: false });
  console.log('✓', file);
}

const box = (svg, size) => `<div style="width:${size}px;height:${size}px">${svg}</div>`;
await shot(box(iconSvg(1), 512), 512, 512, 'icons/icon-512.png');
await shot(box(iconSvg(1), 192), 192, 192, 'icons/icon-192.png');
await shot(box(iconSvg(1), 180), 180, 180, 'icons/apple-touch-icon.png');
await shot(box(iconSvg(0.78), 512), 512, 512, 'icons/icon-maskable-512.png');

const splashes = [
  [1206, 2622],
  [1320, 2868],
  [1179, 2556],
  [1290, 2796],
];
for (const [w, h] of splashes) {
  for (const theme of ['light', 'dark']) {
    const bg = theme === 'light' ? '#F2F2F7' : '#000000';
    const fg = theme === 'light' ? '#000000' : '#FFFFFF';
    const s = Math.round(w * 0.26);
    const html = `<div style="width:${w}px;height:${h}px;background:${bg};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(s * 0.22)}px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif">
      <div style="width:${s}px;height:${s}px;border-radius:${Math.round(s * 0.225)}px;overflow:hidden">${iconSvg(1)}</div>
      <div style="color:${fg};font-size:${Math.round(w * 0.06)}px;font-weight:700;letter-spacing:-1px">CBZC Trener</div>
    </div>`;
    await shot(html, w, h, `splash/splash-${w}x${h}-${theme}.png`);
  }
}
process.exit(0);
