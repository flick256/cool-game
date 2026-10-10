#!/usr/bin/env node
/* NODE_PATH=$(npm root -g) node tests/ch5_branches_run.js  — drives each ending through the mock c. */
const { open } = require('../tools/page_harness');
(async () => {
  const h = await open(['js/ch5.js', 'tests/ch5_branches.js'], []);
  let bad = 0;
  for (const mode of ['twin', 'common', 'lone']) {
    const r = await h.page.evaluate((m) => window.ch5Branch(m), mode);
    const want = { twin: 'twin', common: 'common', lone: 'lone' }[mode];
    const credits = r.log.filter((s) => s.startsWith('credits:'));
    const scenes = r.log.filter((s) => s.startsWith('scene:'));
    const ok = r.ending === want && credits.length === 1 && credits[0] === 'credits:' + want && (mode !== 'twin' || scenes.length === 1);
    console.log((ok ? '✓ ' : '✗ ') + mode + ' → ending=' + r.ending + ' ' + credits.join(',') + ' ' + scenes.join(',') + ' calls=' + r.log.length);
    if (!ok) bad++;
  }
  h.errors.filter((e) => !/Failed to load resource/.test(e)).forEach((e) => console.log('[page] ' + e));
  await h.browser.close(); h.cleanup(); process.exit(bad ? 1 : 0);
})();
