#!/usr/bin/env node
/* Render a WHOLE map (tiles + event sprites + dressing) to a PNG.
 *   NODE_PATH=$(npm root -g) node tools/mapshot.js <mapId> [out.png] [--scale 0.5] [--grid]
 * Event markers: sprites are drawn; invisible triggers are drawn as small coloured squares (blue = step/transfer, green = auto). */
const path = require('path'); const fs = require('fs'); const { chromium } = require('playwright');
const args = process.argv.slice(2); const pos = args.filter((a) => !a.startsWith('--') && isNaN(+a));
const opt = { scale: 1, grid: args.includes('--grid') }; const si = args.indexOf('--scale'); if (si >= 0) opt.scale = +args[si + 1];
const mapId = pos[0]; const out = pos[1] || ('/tmp/map_' + mapId + '.png');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '../index.html?nocut=1'));
  await page.waitForFunction(() => window.G && G.step && G.maps);
  const data = await page.evaluate(({ mapId, scale, grid }) => {
    G.paused = true; const def = G.maps.get(mapId); if (!def) return null;
    const T = 32, c = G.util.canvas(def.w * T, def.h * T), x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(G.map.renderLayer(def, 'ground', 0), 0, 0);   // same chunk pipeline as the game (edges, shadows, shores)
    x.drawImage(G.map.renderLayer(def, 'objects', 0), 0, 0);
    for (const e of def.events) {
      if (e.sprite) G.gfx.drawChar(x, e.sprite, e.dir || 'down', 1, e.x * T, e.y * T);
      else { x.globalAlpha = 0.55; x.fillStyle = e.trigger === 'auto' ? '#3f3' : '#39f'; x.fillRect(e.x * T + 8, e.y * T + 8, 16, 16); x.globalAlpha = 1; }
    }
    x.drawImage(G.map.renderLayer(def, 'above', 0), 0, 0);
    x.strokeStyle = '#f0f'; x.lineWidth = 2; x.strokeRect(def.spawn.x * T + 2, def.spawn.y * T + 2, T - 4, T - 4);   // spawn = magenta box
    if (grid) { x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1; x.fillStyle = '#fff'; x.font = '9px sans-serif'; for (let i = 0; i <= def.w; i++) { x.beginPath(); x.moveTo(i * T, 0); x.lineTo(i * T, c.height); x.stroke(); if (i % 5 === 0) x.fillText(i, i * T + 2, 9); } for (let j = 0; j <= def.h; j++) { x.beginPath(); x.moveTo(0, j * T); x.lineTo(c.width, j * T); x.stroke(); if (j % 5 === 0) x.fillText(j, 2, j * T + 10); } }
    if (scale !== 1) { const s = G.util.canvas(Math.round(c.width * scale), Math.round(c.height * scale)); const sx = s.getContext('2d'); sx.imageSmoothingEnabled = scale > 1 ? false : true; sx.drawImage(c, 0, 0, s.width, s.height); return s.toDataURL('image/png'); }
    return c.toDataURL('image/png');
  }, { mapId, scale: opt.scale, grid: opt.grid });
  if (!data) { console.log('unknown map ' + mapId); process.exit(2); }
  fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64')); console.log('map ->', out); errs.forEach((e) => console.log('[pageerror]', e));
  await browser.close();
})();
