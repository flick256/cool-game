#!/usr/bin/env node
/* Static map validation:  NODE_PATH=$(npm root -g) node tools/check.js js/ch1.js [more files...] */
const { open } = require('./page_harness');
(async () => {
  const files = process.argv.slice(2);
  const h = await open(files);
  const out = await h.page.evaluate(() => {
    const res = []; const ids = G.maps.list();
    for (const id of ids) { const w = G.maps.check(id); const d = G.maps.get(id); res.push({ id, size: d.w + 'x' + d.h, events: d.events.length, enc: !!d.encounters, warnings: w });
      // cross-reference known ids
      for (const e of d.events) { if (e.sprite && KNOWN.sprites.indexOf(e.sprite) < 0) w.push('event ' + e.id + ' uses unknown sprite ' + e.sprite); }
      if (d.bgm && KNOWN.bgm.indexOf(d.bgm) < 0) w.push('unknown bgm ' + d.bgm);
      if (d.encounters) for (const t of d.encounters.troops) if (KNOWN.troops.indexOf(t.id) < 0) w.push('unknown troop ' + t.id);
      if (d.spawn && !G.maps.isPassable(d, d.spawn.x, d.spawn.y)) w.push('spawn blocked');
    }
    return res;
  });
  let bad = 0;
  for (const m of out) { console.log((m.warnings.length ? '✗ ' : '✓ ') + m.id + ' ' + m.size + ' events=' + m.events + (m.enc ? ' enc' : '')); m.warnings.forEach((w) => { console.log('    - ' + w); bad++; }); }
  h.errors.forEach((e) => { console.log('[page] ' + e); bad++; });
  if (!out.length) console.log('(no maps registered by these files)');
  await h.browser.close(); h.cleanup(); process.exit(bad ? 1 : 0);
})();
