#!/usr/bin/env node
/* Real-time playtest: node tools/play.js "<url>" step1 step2 ...   steps: key:ms (hold), wait:ms, shot:path, eval:expr, type:text
 * e.g. node tools/play.js "index.html" wait:1500 Enter:100 wait:500 shot:/tmp/a.png */
const path = require('path'); const { chromium } = require('playwright');
(async () => {
  const [url, ...steps] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
  const errs = []; page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load/.test(m.text())) errs.push(m.text()); }); page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', url));
  for (const s of steps) {
    const i = s.indexOf(':'); const k = s.slice(0, i), v = s.slice(i + 1);
    if (k === 'wait') await page.waitForTimeout(+v);
    else if (k === 'shot') await page.locator('canvas#game').screenshot({ path: v });
    else if (k === 'eval') console.log('eval:', await page.evaluate((e) => { try { return JSON.stringify(eval(e)); } catch (x) { return 'ERR ' + x.message; } }, v));
    else if (k === 'type') await page.keyboard.type(v);
    else if (k === 'rep') { const [key, n] = v.split('x'); for (let j = 0; j < +n; j++) { await page.keyboard.press(key); await page.waitForTimeout(120); } }
    else { await page.keyboard.down(k); await page.waitForTimeout(+v || 80); await page.keyboard.up(k); await page.waitForTimeout(60); }
  }
  errs.slice(0, 20).forEach((e) => console.log('[ERROR]', e));
  await browser.close();
})();
