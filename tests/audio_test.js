#!/usr/bin/env node
/* Headless audio test for js/audio.js.
 *   NODE_PATH=$(npm root -g) node tests/audio_test.js [--only name,name] [--sec 12]
 * Renders every BGM track and SFX through OfflineAudioContext (G.audio._renderOffline)
 * and reports peak / RMS / non-silent share / NaN / clipping. Then checks the
 * no-AudioContext path never throws. Exits 1 on problems.
 */
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), opt = {};
for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) opt[args[i].slice(2)] = (args[i + 1] && !args[i + 1].startsWith('--')) ? args[++i] : true;
const only = opt.only ? String(opt.only).split(',') : null;
const trackSec = +(opt.sec || 12);

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const url = 'file://' + path.resolve(__dirname, 'audio.html');
  let problems = 0;

  // ---- 1) offline render analysis
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto(url);
  const names = await page.evaluate(() => ({ tracks: G.audio._tracks(), sfx: G.audio._sfxNames() }));
  const want = ['title','wickholm','forest','brasshaven','workshop','undercroft','gladius','arena','tavern','abbey','crypt','whisperwood','festival','ashen_road','spire','chamber','battle','boss','finalboss','victory','gameover','marigold','sky','romance','tender','sad','tense','mystery','comic','ending_love','ending_common','ending_lone','credits'];
  const missing = want.filter((n) => !names.tracks.includes(n));
  if (missing.length) { console.log('MISSING TRACKS:', missing.join(',')); problems++; }
  const sfxWant = 'cursor ok cancel buzzer step door chest heal hit crit break slash pierce blunt arrow fire ice lightning wind light dark levelup coin save encounter escape boost heart buff debuff lantern portal jingle_item footstep_grass shatter'.split(' ');
  const sfxMissing = sfxWant.filter((n) => !names.sfx.includes(n));
  if (sfxMissing.length) { console.log('MISSING SFX:', sfxMissing.join(',')); problems++; }

  const items = (only || names.tracks.concat(names.sfx)).filter((n) => names.tracks.includes(n) || names.sfx.includes(n));
  console.log('name'.padEnd(16), 'kind', 'secs', '  peak  rms    nonsil  nan  clip  notes');
  for (const name of items) {
    const isTrack = names.tracks.includes(name);
    const sec = isTrack ? Math.min(trackSec, (await page.evaluate((n) => G.audio._trackInfo(n).seconds, name)) + 0.5) : 1.5;
    const r = await page.evaluate(async ([n, s]) => {
      let buf;
      try { buf = await G.audio._renderOffline(n, s); } catch (e) { return { err: 'THREW ' + e.message }; }
      if (!buf) return { err: 'no buffer' };
      const info = G.audio._trackInfo(n);
      let peak = 0, sum = 0, nz = 0, nan = 0, clip = 0, cnt = 0;
      for (let c = 0; c < buf.numberOfChannels; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < d.length; i++) {
          const v = d[i];
          if (!isFinite(v)) { nan++; continue; }
          const a = Math.abs(v);
          if (a > peak) peak = a;
          if (a > 0.00005) nz++;
          if (a >= 0.999) clip++;
          sum += v * v; cnt++;
        }
      }
      return { peak, rms: Math.sqrt(sum / Math.max(1, cnt)), nonsil: nz / Math.max(1, cnt), nan, clip, warn: info ? info.warn : [] };
    }, [name, sec]);
    if (r.err) { console.log(name.padEnd(16), r.err); problems++; continue; }
    const notes = [];
    if (r.nan) notes.push('NaN!');
    if (r.peak < 0.05) notes.push('TOO QUIET/SILENT');
    if (r.peak > 1.0 || r.clip > 200) notes.push('CLIPPING');
    if (r.nonsil < 0.02) notes.push('MOSTLY SILENT');
    if (isTrack) (r.warn || []).forEach((w) => notes.push(w));
    if (notes.some((x) => /NaN|SILENT|CLIPPING|QUIET|len/.test(x))) problems++;
    console.log(name.padEnd(16), (isTrack ? 'bgm' : 'sfx').padEnd(4), String(sec.toFixed(1)).padStart(4),
      r.peak.toFixed(3).padStart(6), r.rms.toFixed(3).padStart(6), (r.nonsil * 100).toFixed(1).padStart(6) + '%',
      String(r.nan).padStart(4), String(r.clip).padStart(5), notes.join('; '));
  }
  if (pageErrors.length) { console.log('PAGE ERRORS:', pageErrors); problems += pageErrors.length; }

  // ---- 2) no AudioContext available: every API must be a silent no-op
  const bare = await browser.newPage();
  const bareErrs = [];
  bare.on('pageerror', (e) => bareErrs.push(e.message));
  await bare.addInitScript(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; window.OfflineAudioContext = undefined; window.webkitOfflineAudioContext = undefined; });
  await bare.goto(url);
  const bareRes = await bare.evaluate(() => {
    const out = [];
    const run = (label, fn) => { try { fn(); out.push(label + ': ok'); } catch (e) { out.push(label + ': THREW ' + e.message); } };
    run('unlock', () => { if (G.audio.unlock() !== false) throw new Error('unlock should return false'); });
    run('playBgm', () => G.audio.playBgm('title', { fade: 30 }));
    run('playBgm unknown', () => G.audio.playBgm('nope'));
    run('sfx', () => G.audio.sfx('ok'));
    run('sfx unknown', () => G.audio.sfx('nope'));
    run('jingle', () => G.audio.jingle('victory'));
    run('stopBgm', () => G.audio.stopBgm(30));
    run('update x60', () => { for (let i = 0; i < 60; i++) G.audio.update(); });
    run('setVolume', () => G.audio.setVolume({ bgm: 0.4, sfx: 0.5 }));
    run('setMuted', () => G.audio.setMuted(true));
    run('voice', () => G.audio.voice('claret', 'x'));
    run('renderOffline', () => G.audio._renderOffline('ok', 1).then(() => {}));
    out.push('volume=' + JSON.stringify(G.audio.getVolume()));
    return out;
  });
  bareRes.forEach((l) => { console.log('[no-ctx]', l); if (/THREW/.test(l)) problems++; });
  if (bareErrs.length) { console.log('[no-ctx] PAGE ERRORS:', bareErrs); problems += bareErrs.length; }

  // ---- 3) real AudioContext path (headless Chromium): unlock, play, let the scheduler run
  const live = await browser.newPage();
  const liveErrs = [];
  live.on('pageerror', (e) => liveErrs.push(e.message));
  live.on('console', (m) => { if (m.type() === 'error') liveErrs.push(m.text()); });
  await live.goto(url);
  const liveRes = await live.evaluate(async () => {
    const r = {};
    r.unlock = G.audio.unlock();
    G.audio.playBgm('battle', { fade: 10 });
    G.audio.sfx('hit'); G.audio.sfx('crit');
    for (let i = 0; i < 40; i++) { G.audio.update(); await new Promise((res) => setTimeout(res, 25)); }
    G.audio.playBgm('romance', { fade: 30 });
    G.audio.jingle('victory');
    G.audio.setVolume({ bgm: 0.5, sfx: 0.7 });
    for (let i = 0; i < 20; i++) { G.audio.update(); await new Promise((res) => setTimeout(res, 25)); }
    G.audio.stopBgm(20);
    G.audio.setMuted(false);
    r.vol = G.audio.getVolume();
    try { r.stored = localStorage.getItem('lanternbound.audio'); } catch (e) { r.stored = 'blocked'; }
    return r;
  });
  console.log('[live]', JSON.stringify(liveRes));
  if (liveErrs.length) { console.log('[live] ERRORS:', liveErrs); problems += liveErrs.length; }

  await browser.close();
  console.log(problems ? 'FAIL: ' + problems + ' problem(s)' : 'PASS');
  process.exit(problems ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
