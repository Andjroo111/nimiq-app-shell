// Renders every card of this board: `before` is origin/main as shipped
// (dist/app-shell.js, playground/index.html), `after` is the same page with the
// proposed change injected. No app code is edited.
//   node boards/2026-10-30-align-shell-looks/render.mjs   (from the repo root)
// Playwright resolves from nimiq-branding-cli (override with PLAYWRIGHT_FROM).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const ART = join(HERE, 'art');
const req = createRequire(process.env.PLAYWRIGHT_FROM
  ?? join(os.homedir(), 'Projects/nimiq/nimiq-branding-cli/package.json'));
const { chromium } = req('playwright');

// Headless Chromium has no `ui-monospace` generic; Safari and iOS map it to SF
// Mono. The address-font card stands that mapping in, so its `before` is what
// an Apple device draws rather than what Chromium happens to fall through to.
const SF_MONO = '/System/Applications/Utilities/Terminal.app/Contents/Resources/Fonts/SF-Mono-Regular.otf';
const APPLE_UI_MONO = "@font-face { font-family: ui-monospace; src: url(/__sfmono.otf); }";
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = createServer(async (rq, rs) => {
  const p = decodeURIComponent(new URL(rq.url, 'http://x').pathname);
  try {
    const body = await readFile(p === '/__sfmono.otf' ? SF_MONO : join(ROOT, p));
    rs.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }); rs.end(body);
  } catch { rs.writeHead(404); rs.end(); }
}).listen(0);
const BASE = `http://127.0.0.1:${server.address().port}`;
const HOST = `${BASE}/boards/2026-10-30-align-shell-looks/host.html`;

const MULISH = 'https://fonts.googleapis.com/css2?family=Mulish:wght@400;600;700;800&display=swap';
const FIRA = 'https://fonts.googleapis.com/css2?family=Fira+Mono:wght@400;500&display=swap';

// Every stylesheet the shell injected, rewritten in place: raw hex becomes the
// @nimiq/style token with the same hex as its fallback.
const CHAIN_HEX = () => {
  for (const s of document.querySelectorAll('style')) {
    s.textContent = s.textContent
      .replace(/#1f2348\b/gi, 'var(--nimiq-blue, #1f2348)')
      .replace(/#0582ca\b/gi, 'var(--nimiq-light-blue, #0582ca)');
  }
};

async function settle(page) {
  await page.waitForFunction(() => window.__ready === true);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200); // identicon fetch + paint
}
const openMenu = (page) => page.click('.nq-cc-face');
const openReceive = async (page) => { await openMenu(page); await page.click('.nq-cc-receive'); };

const CARDS = {
  // 1. Mulish: the host loads only Fira Mono; after = the shell brings its own Mulish.
  mulish: {
    clip: { x: 0, y: 0, width: 390, height: 360 },
    before: async (p) => { await p.goto(HOST); await p.addStyleTag({ url: FIRA }); await settle(p); await openMenu(p); },
    after: async (p) => { await p.goto(HOST); await p.addStyleTag({ url: FIRA }); await p.addStyleTag({ url: MULISH }); await settle(p); await openMenu(p); },
  },
  // 2. Address font: host loads Fira Mono (as the README asks); after = Fira Mono
  //    first in every address stack (face label, profile address).
  addrfont: {
    clip: { x: 0, y: 0, width: 390, height: 220 },
    before: async (p) => { await p.goto(HOST); await p.addStyleTag({ content: APPLE_UI_MONO }); await p.addStyleTag({ url: MULISH }); await p.addStyleTag({ url: FIRA }); await settle(p); },
    after: async (p) => {
      await p.goto(HOST); await p.addStyleTag({ content: APPLE_UI_MONO }); await p.addStyleTag({ url: MULISH }); await p.addStyleTag({ url: FIRA });
      await p.addStyleTag({ content: `
        .nq-cc[data-connected] .nq-cc-face-label, .nq-wallet__label { font-family:'Fira Mono',ui-monospace,monospace !important; }
        .nq-profile__addr { font-family:'Fira Mono',ui-monospace,monospace !important; }` });
      await settle(p);
    },
  },
  // 3. Raw hex chained through --nimiq-*: a host whose tokens differ from the
  //    shell's literals (light-blue on-dark #0CA6FE, deep navy #171D2E).
  hextokens: {
    clip: { x: 0, y: 0, width: 390, height: 360 },
    before: async (p) => { await p.goto(HOST); await hostTokens(p); await settle(p); await openMenu(p); },
    after: async (p) => { await p.goto(HOST); await hostTokens(p); await settle(p); await p.evaluate(CHAIN_HEX); await openMenu(p); },
  },
  // 4. Receive view: hand-built 3x3 grid on a tinted plate vs registry
  //    address-display (its 8px-root rem written out in px).
  addrdisplay: {
    clip: { x: 0, y: 0, width: 390, height: 520 },
    before: async (p) => { await p.goto(HOST + '?profile=0'); await fonts(p); await settle(p); await openReceive(p); },
    after: async (p) => {
      await p.goto(HOST + '?profile=0'); await fonts(p); await settle(p); await openReceive(p);
      await p.evaluate(() => {
        const btn = document.querySelector('.nq-cc-address');
        const addr = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000';
        btn.innerHTML = addr.split(' ').map((c) => `<span class="rg-chunk">${c}<span style="font-size:0">&nbsp;</span></span>`).join('');
        btn.setAttribute('style', 'display:grid;grid-template-columns:repeat(3,33%);justify-content:space-between;justify-items:center;' +
          'max-width:226px;width:100%;margin:0 auto;padding:0;background:none;border:none;' +
          "font-family:'Fira Mono',monospace;font-size:24px;color:rgba(31,35,72,.5)");
        for (const c of btn.querySelectorAll('.rg-chunk')) c.style.cssText = 'margin:7px 0;line-height:1.11;white-space:nowrap';
      });
    },
  },
  // 5. QR sheet: shipped navy modules vs registry qr-code light-blue fill.
  qrcode: {
    clip: { x: 0, y: 0, width: 390, height: 420 },
    before: async (p) => { await p.goto(HOST + '?profile=0'); await fonts(p); await settle(p); await openReceive(p); await showQr(p); },
    after: async (p) => {
      await p.goto(HOST + '?profile=0'); await fonts(p); await settle(p); await openReceive(p);
      await p.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/qr-creator@1.0.0/dist/qr-creator.min.js' });
      await showQr(p, true);
    },
  },
  // 6. Playground at 390px: before as shipped, after with the three lint fixes.
  playground: {
    before: async (p) => { await p.goto(`${BASE}/playground/index.html`); await p.waitForTimeout(1500); },
    after: async (p) => {
      await p.goto(`${BASE}/playground/index.html`);
      await p.addStyleTag({ content: `
        .cols { grid-template-columns: minmax(0,1fr) !important; }
        .cols > * { min-width: 0; }
        .sub { max-width: 65ch; }
        label input { width: 24px !important; height: 24px !important; }
        .strip { flex-wrap: wrap; }
        fieldset { min-width: 0; }
        .ab-add > * { min-width: 0; }` });
      await p.waitForTimeout(1500);
    },
  },
};
async function fonts(p) { await p.addStyleTag({ url: MULISH }); await p.addStyleTag({ url: FIRA }); }
async function hostTokens(p) {
  await p.addStyleTag({ url: MULISH }); await p.addStyleTag({ url: FIRA });
  await p.addStyleTag({ content: ':root { --nimiq-blue: #171D2E; --nimiq-light-blue: #0CA6FE; }' });
}
// The receive sheet with its QR: the registry swap re-renders the canvas in the
// registry's light-blue fill, the shipped one keeps the wallet navy.
async function showQr(p, registry = false) {
  await p.click('.nq-cc-qr-open');
  await p.waitForTimeout(400);
  if (registry) await p.evaluate(() => {
    for (const c of document.querySelectorAll('.nq-cc-view-qr canvas')) {
      const size = c.width;
      const fresh = document.createElement('canvas');
      fresh.style.cssText = c.getAttribute('style') ?? '';
      fresh.className = c.className;
      QrCreator.render({ text: 'nimiq:NQ07000000000000000000000000000000000000', radius: 0.5, ecLevel: 'M',
        fill: { type: 'radial-gradient', position: [1, 1, 0, 1, 1, Math.SQRT2], colorStops: [[0, '#265DD7'], [1, '#0582CA']] },
        background: null, size }, fresh);
      c.replaceWith(fresh);
    }
  });
}

const only = process.argv.slice(2);
const browser = await chromium.launch();
try {
  for (const [id, card] of Object.entries(CARDS)) {
    if (only.length && !only.includes(id)) continue;
    for (const side of ['before', 'after']) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      await card[side](page);
      await page.waitForTimeout(500);
      const out = join(ART, `${id}-${side}.png`);
      await page.screenshot({ path: out, clip: card.clip ?? { x: 0, y: 0, width: 390, height: 844 } });
      // 390 CSS px at DPR 2 is 780 px; the board wants 720 px wide stills.
      execFileSync('sips', ['--resampleWidth', '720', out], { stdio: 'ignore' });
      console.log('wrote', out);
      await ctx.close();
    }
  }
} finally { await browser.close(); server.close(); }
