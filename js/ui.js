/* =====================================================================
 * LANTERNBOUND — ui.js  (owner: ui)
 * G.ui overlay: message window (say/narrate), choices, hints, title cards,
 * toasts, portraits. Scenes: title, nameentry, menu (Items, Skills, Equip,
 * Status, Formation, Save, Options, Title; Bonds hands off to 'bonds'),
 * shop, saveload, options, gameover, credits.
 * Script commands: say narrate choice nameInput titleCard toast hint shop
 * saveMenu credits.  All other modules are used lazily and guarded.
 * ===================================================================== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const W = 640, H = 480;
  const UI = (G.ui = G.ui || {});

  // ------------------------------------------------------------------ helpers
  const FONT = '"Trebuchet MS","Segoe UI",Arial,sans-serif';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const gfxFn = (name) => (G.gfx && typeof G.gfx[name] === 'function') ? G.gfx[name] : null;
  const sfx = (n) => { try { if (G.audio && typeof G.audio.sfx === 'function') G.audio.sfx(n); } catch (e) { /* audio optional */ } };
  const bgm = (n, o) => { try { if (G.audio && typeof G.audio.playBgm === 'function') G.audio.playBgm(n, o); } catch (e) { /* audio optional */ } };
  const store = (() => { try { return window.localStorage; } catch (e) { return null; } })();
  const subst = (s) => String(s).replace(/\{name\}/g, G.name ? G.name() : 'Rowan');
  const pointIn = (px, py, r) => px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h;
  const rowAt = (px, py, x, y, w, rowH, n) => {
    if (px < x || px >= x + w || py < y) return -1;
    const i = Math.floor((py - y) / rowH); return (i >= 0 && i < n) ? i : -1;
  };
  function fitTop(st, visible) {
    if (st.cur < st.top) st.top = st.cur;
    if (st.cur >= st.top + visible) st.top = st.cur - visible + 1;
    if (st.top < 0) st.top = 0;
  }

  // ------------------------------------------------------------------ data access (lazy, guarded)
  const it = (id) => (G.data && G.data.items && G.data.items[id]) || { id, name: String(id), type: 'consumable', desc: '', price: 0 };
  const sk = (id) => (G.data && G.data.skills && G.data.skills[id]) || { id, name: String(id), desc: '', kind: 'phys', cost: 0, power: 100, hits: 1, target: 'one_enemy' };
  const ad = (id) => (G.data && G.data.actors && G.data.actors[id]) || null;
  const rt = (id) => (G.state && G.state.roster && G.state.roster[id]) || null;
  const inv = () => (G.state && G.state.inventory) || {};
  const partyIds = () => ((G.state && G.state.party) || ['rowan']).slice(0, 4);
  function nameOf(id) {
    if (id === 'rowan') return G.name();
    try { if (G.party && G.party.nameOf) return G.party.nameOf(id); } catch (e) { /* fall through */ }
    const a = ad(id); return a ? a.name : String(id);
  }
  function statsOf(id) {
    try { if (G.party && G.party.stats) { const s = G.party.stats(id); if (s) return s; } } catch (e) { /* fall through */ }
    const a = ad(id), r = rt(id), lv = r ? r.level : 1, out = {};
    const keys = ['patk', 'pdef', 'eatk', 'edef', 'spd', 'crit', 'eva'];
    const b = (a && a.base) || {}, g = (a && a.growth) || {}, L = lv - 1;
    out.mhp = Math.floor((b.hp || 30) + Math.floor((g.hp || 0) * L));
    out.msp = Math.floor((b.sp || 10) + Math.floor((g.sp || 0) * L));
    for (const k of keys) out[k] = Math.floor((b[k] || 0) + Math.floor((g[k] || 0) * L));
    if (r && r.equip) for (const slot in r.equip) {
      const iid = r.equip[slot]; if (!iid) continue;
      const st = it(iid).stats || {};
      for (const k in st) {
        if (k === 'hp' || k === 'mhp') out.mhp += st[k];
        else if (k === 'sp' || k === 'msp') out.msp += st[k];
        else out[k] = (out[k] || 0) + st[k];
      }
    }
    return out;
  }
  function canEquip(actorId, itemId) {
    try { if (G.party && G.party.canEquip) return !!G.party.canEquip(actorId, itemId); } catch (e) { /* fall through */ }
    const a = ad(actorId), d = it(itemId); if (!a) return false;
    if (d.usable) return d.usable.indexOf(actorId) >= 0;
    if (d.weaponType) return (a.weapons || []).indexOf(d.weaponType) >= 0;
    return true;
  }
  function doEquip(actorId, slot, itemId) {
    try { if (G.party && G.party.equip) return !!G.party.equip(actorId, slot, itemId); } catch (e) { return false; }
    const r = rt(actorId); if (!r) return false;
    r.equip = r.equip || {};
    const old = r.equip[slot];
    if (old) addItem(old, 1);
    if (itemId) removeItem(itemId, 1);
    r.equip[slot] = itemId || null;
    return true;
  }
  function addItem(id, n) {
    try { if (G.party && G.party.addItem) return G.party.addItem(id, n); } catch (e) { /* fall through */ }
    G.state.inventory[id] = (G.state.inventory[id] || 0) + n;
  }
  function removeItem(id, n) {
    try { if (G.party && G.party.removeItem) return G.party.removeItem(id, n); } catch (e) { /* fall through */ }
    G.state.inventory[id] = Math.max(0, (G.state.inventory[id] || 0) - n);
    if (!G.state.inventory[id]) delete G.state.inventory[id];
  }
  const count = (id) => inv()[id] || 0;
  function setPartyIds(ids) {
    ids = ids.filter((v, i, a) => v && a.indexOf(v) === i).slice(0, 4);
    if (ids.indexOf('rowan') < 0) ids.unshift('rowan');
    ids = ['rowan'].concat(ids.filter((x) => x !== 'rowan')).slice(0, 4);
    try {
      if (G.party && G.party.setParty) G.party.setParty(ids);
      else if (G.script.cmds.setParty) G.script.cmds.setParty(ids);
      else G.state.party = ids;
    } catch (e) { G.state.party = ids; }
    if (!G.state.party) G.state.party = ids;
  }
  function skillsUsable(id) {
    try { if (G.party && G.party.skills) return G.party.skills(id) || []; } catch (e) { /* fall through */ }
    return null;
  }
  function chapterInfo(n) {
    const ch = G.story && G.story.chapters && G.story.chapters[n];
    if (ch) return ch;
    return n === 0 ? { title: 'Cold Ember', subtitle: 'Prologue' } : { title: 'Chapter ' + n, subtitle: '' };
  }
  function locationName(id) {
    const m = G.maps && G.maps.get && G.maps.get(id);
    return m ? m.name : String(id || '');
  }
  function fmtTime(frames) {
    const s = Math.floor((frames || 0) / 60), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const p = (v) => (v < 10 ? '0' : '') + v;
    return p(h) + ':' + p(m) + ':' + p(sec);
  }
  function itemIcon(d) {
    if (d.type === 'weapon') return d.weaponType || 'sword';
    if (d.type === 'armor') return 'shield';
    if (d.type === 'accessory') return 'star';
    if (d.type === 'gift') return 'gift';
    if (d.type === 'key') return 'key';
    if (/ether/.test(d.id || '')) return 'ether';
    return 'potion';
  }
  function itemsOwned(filter) {
    return Object.keys(inv()).filter((id) => inv()[id] > 0 && filter(it(id)))
      .sort((a, b) => it(a).name.localeCompare(it(b).name));
  }

  // ------------------------------------------------------------------ text / drawing (gfx with fallbacks)
  let mctx = null;
  function measure(s, size, bold) {
    const f = gfxFn('textWidth');
    if (f) { try { return f(String(s), size || 16, !!bold); } catch (e) { /* fall through */ } }
    if (!mctx) mctx = G.util.canvas(4, 4).getContext('2d');
    mctx.font = (bold ? 'bold ' : '') + (size || 16) + 'px ' + FONT;
    return mctx.measureText(String(s)).width;
  }
  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }
  const WIN_PAL = {
    blue: ['#2d4fb0', '#111d4f', '#d4e6ff'],
    dark: ['#2b2b44', '#0d0d1d', '#a9aed8'],
    parchment: ['#f2e7cb', '#cdb27e', '#6b4f22'],
    gold: ['#8f6d26', '#3a2a08', '#ffe49a'],
  };
  function fbWindow(c, x, y, w, h, o) {
    o = o || {};
    const p = WIN_PAL[o.style || 'blue'] || WIN_PAL.blue;
    c.save();
    c.globalAlpha = o.alpha == null ? 0.93 : o.alpha;
    const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, p[0]); g.addColorStop(1, p[1]);
    c.fillStyle = g; rr(c, x, y, w, h, 7); c.fill();
    c.globalAlpha = 1; c.strokeStyle = p[2]; c.lineWidth = 2; rr(c, x + 1, y + 1, w - 2, h - 2, 6); c.stroke();
    c.globalAlpha = 0.3; c.lineWidth = 1; rr(c, x + 4, y + 4, w - 8, h - 8, 4); c.stroke();
    c.restore();
  }
  function fbText(c, s, x, y, o) {
    const size = o.size || 16;
    c.save();
    c.font = (o.bold ? 'bold ' : '') + size + 'px ' + FONT; c.textBaseline = 'top';
    const w = c.measureText(s).width;
    let dx = x;
    if (o.align === 'center') dx = x - w / 2; else if (o.align === 'right') dx = x - w;
    if (o.outline !== false) { c.lineWidth = 3; c.lineJoin = 'round'; c.strokeStyle = o.outlineColor || '#000'; c.strokeText(s, dx, y); }
    c.fillStyle = o.color || '#fff'; c.fillText(s, dx, y);
    c.restore();
  }
  function fbWrap(str, maxW, size) {
    const out = [];
    for (const para of String(str).split('\n')) {
      const words = para.split(' '); let line = '';
      for (const w of words) {
        const t = line ? line + ' ' + w : w;
        if (!line || measure(t, size) <= maxW) line = t; else { out.push(line); line = w; }
      }
      out.push(line);
    }
    return out;
  }
  const ICON_COL = { heart: '#ff6b8a', gold: '#ffd65a', potion: '#ff7a86', ether: '#8ab8ff', key: '#ffd65a', gift: '#ff9ad6', shield: '#b8c4da', star: '#ffe08a', check: '#8ef08e', bp: '#ffd65a' };
  function fbIcon(c, name, x, y, s) {
    c.save(); c.fillStyle = ICON_COL[name] || '#c8d0e8';
    c.beginPath(); c.arc(x + s / 2, y + s / 2, s / 2 - 1, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#111'; c.font = 'bold ' + Math.max(8, Math.floor(s * 0.6)) + 'px ' + FONT; c.textBaseline = 'middle'; c.textAlign = 'center';
    c.fillText(String(name).charAt(0).toUpperCase(), x + s / 2, y + s / 2 + 1);
    c.restore();
  }
  function fbGauge(c, x, y, w, h, r, c1, c2) {
    c.save(); c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(x, y, w, h);
    const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, c1 || '#7be07b'); g.addColorStop(1, c2 || '#2b8a3e');
    c.fillStyle = g; c.fillRect(x, y, Math.round(w * clamp(r, 0, 1)), h); c.restore();
  }
  function fbCursor(c, x, y) {
    c.save(); c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + 10, y + 5); c.lineTo(x, y + 10); c.closePath(); c.fill(); c.stroke(); c.restore();
  }
  function fbFace(c, id, x, y, s) {
    c.save(); c.fillStyle = hashCol(id); c.beginPath(); c.arc(x + s / 2, y + s / 2, s / 2 - 2, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#fff'; c.font = 'bold ' + Math.floor(s * 0.45) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(String(id).charAt(0).toUpperCase(), x + s / 2, y + s / 2 + 1); c.restore();
  }
  function fbPortrait(c, id, x, y, o) {
    c.save(); c.globalAlpha = o.alpha == null ? 1 : o.alpha;
    c.fillStyle = hashCol(id); rr(c, x + 16, y + 40, 112, 152, 14); c.fill();
    c.fillStyle = '#e8c9a8'; c.beginPath(); c.arc(x + 72, y + 52, 26, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.font = 'bold 14px ' + FONT; c.textAlign = 'center'; c.fillText(String(id), x + 72, y + 150);
    c.restore();
  }
  function hashCol(s) { const h = G.util.hash(String(s)); return 'hsl(' + (h % 360) + ' 42% 40%)'; }
  function fbTitle(c, t) {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b0a22'); g.addColorStop(1, '#2a1b3c');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const r = G.util.rng(7); c.fillStyle = '#fff';
    for (let i = 0; i < 90; i++) { const x = r() * W, y = r() * H * 0.7; c.globalAlpha = 0.3 + 0.7 * ((Math.sin(t / 30 + i) + 1) / 2); c.fillRect(x, y, 1, 1); }
    c.globalAlpha = 1;
  }
  function fbMenuBg(c) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0d1230'); g.addColorStop(1, '#1b1040'); c.fillStyle = g; c.fillRect(0, 0, W, H); }
  function fbLogo(c) {
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 44px ' + FONT;
    c.lineWidth = 6; c.strokeStyle = '#000'; c.strokeText('LANTERNBOUND', 320, 90);
    c.fillStyle = '#ffd98a'; c.fillText('LANTERNBOUND', 320, 90); c.restore();
  }
  const D = {
    win(c, x, y, w, h, o) { const f = gfxFn('window'); if (f) f(c, x, y, w, h, o || {}); else fbWindow(c, x, y, w, h, o); },
    text(c, s, x, y, o) { const f = gfxFn('text'); o = o || {}; if (f) f(c, String(s), x, y, o); else fbText(c, String(s), x, y, o); },
    wrap(s, w, size) {
      const f = gfxFn('wrap');
      if (f) { try { const r = f(String(s), w, size || 16); if (r && r.length) return r; } catch (e) { /* fall through */ } }
      return fbWrap(String(s), w, size || 16);
    },
    icon(c, n, x, y, s) { const f = gfxFn('icon'); if (f) f(c, n, x, y, s || 16); else fbIcon(c, n, x, y, s || 16); },
    gauge(c, x, y, w, h, r, c1, c2) { const f = gfxFn('gauge'); if (f) f(c, x, y, w, h, clamp(r, 0, 1), c1, c2, {}); else fbGauge(c, x, y, w, h, r, c1, c2); },
    cursor(c, x, y) { const f = gfxFn('cursor'); if (f) f(c, x, y, G.frame); else fbCursor(c, x, y); },
    face(c, id, x, y, s, e) { const f = gfxFn('drawFace'); if (f) f(c, id, x, y, s || 48, e || 'normal'); else fbFace(c, id, x, y, s || 48); },
    portrait(c, id, e, x, y, o) { const f = gfxFn('drawPortrait'); if (f) f(c, id, e || 'normal', x, y, o || {}); else fbPortrait(c, id, x, y, o || {}); },
    titleBg(c, t) { const f = gfxFn('drawTitleScreen'); if (f) f(c, t); else fbTitle(c, t); },
    menuBg(c, t) { const f = gfxFn('drawMenuBg'); if (f) f(c, t); else fbMenuBg(c, t); },
    // NOTE: drawLogo(ctx,x,y) is called with the logo CENTER x (320) and top y.
    logo(c) { const f = gfxFn('drawLogo'); if (f) f(c, 320, 84); else fbLogo(c); },
    hearts(c, x, y, pts, tier, w) {
      const f = gfxFn('drawHeartMeter');
      if (f) { try { f(c, x, y, pts, tier, w); return; } catch (e) { /* fall through */ } }
      const n = 5, cw = (w || 120) / n;
      for (let i = 0; i < n; i++) { D.text(c, i < (tier || 0) ? '♥' : '♡', x + i * cw, y, { color: i < (tier || 0) ? '#ff7a9a' : '#6a6f90', size: 14 }); }
    },
  };
  function cursorTo(c, an, tx, ty) {
    if (an.x == null) { an.x = tx; an.y = ty; }
    an.x += (tx - an.x) * 0.45; an.y += (ty - an.y) * 0.45;
    D.cursor(c, Math.round(an.x), Math.round(an.y));
  }
  const ANIM = {};
  const an = (k) => ANIM[k] || (ANIM[k] = {});   // shared smoothed-cursor state per list
  function dimBg(c, a) { c.save(); c.globalAlpha = a == null ? 0.42 : a; c.fillStyle = '#080a1c'; c.fillRect(0, 0, W, H); c.restore(); }

  // ------------------------------------------------------------------ pointer (game-space coords)
  const PTR = { x: -999, y: -999, inside: false, moved: false, click: false, clickPending: false, cx: 0, cy: 0 };
  function ptrPos(e) {
    const r = G.canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height];
  }
  if (G.canvas) {
    G.canvas.addEventListener('pointermove', (e) => { const p = ptrPos(e); PTR.x = p[0]; PTR.y = p[1]; PTR.inside = true; PTR.moved = true; });
    G.canvas.addEventListener('pointerleave', () => { PTR.inside = false; PTR.x = PTR.y = -999; });
    G.canvas.addEventListener('pointerdown', (e) => { const p = ptrPos(e); PTR.x = PTR.cx = p[0]; PTR.y = PTR.cy = p[1]; PTR.clickPending = true; });
  }
  /** Scenes: { x, y, inside, moved, clicked } — reading consumes the move flag and the click. */
  UI.pointer = function () {
    const r = { x: PTR.x, y: PTR.y, inside: PTR.inside, moved: PTR.moved, clicked: PTR.click, cx: PTR.cx, cy: PTR.cy };
    PTR.moved = false; PTR.click = false; return r;
  };

  // ------------------------------------------------------------------ settings
  const SETTINGS = { bgm: 7, sfx: 8, speed: 1, autoRun: false };
  const SKEY = 'lanternbound_settings';
  const SPEEDS = [0.5, 1, 2, 99];
  const SPEED_NAMES = ['Slow', 'Normal', 'Fast', 'Instant'];
  function loadSettings() {
    try { const j = store && store.getItem(SKEY); if (j) { const o = JSON.parse(j); for (const k in SETTINGS) if (o[k] !== undefined) SETTINGS[k] = o[k]; } } catch (e) { /* optional */ }
  }
  function saveSettings() { try { if (store) store.setItem(SKEY, JSON.stringify(SETTINGS)); } catch (e) { /* optional */ } }
  function applyVolume() { try { if (G.audio && G.audio.setVolume) G.audio.setVolume({ bgm: SETTINGS.bgm / 10, sfx: SETTINGS.sfx / 10 }); } catch (e) { /* optional */ } }
  loadSettings(); applyVolume();
  UI.settings = SETTINGS;
  /** True when the player should run: Shift held (or inverted by the Auto-run option). */
  UI.running = () => !!(G.input.down('dash') !== !!SETTINGS.autoRun);

  // ============================================================== OVERLAY (message window, choices, hints, cards, toasts)
  const BOX_Y = 344, BOX_H = 128, LINES = 3, LINE_H = 26, TSIZE = 16, PORT_Y = 288;
  const ST = { queue: [], cur: null, msg: null, pts: [], toasts: [] };
  const TICK = false;   // typewriter tick sfx (off: quieter default)

  function newMsg() {
    return { narrate: true, name: null, side: 'left', faceId: null, expr: 'normal', pages: [['']], page: 0, chars: 0, acc: 0, total: 0,
      done: false, doneT: 0, linger: 0, keep: false, t: 0, out: false, ct: 0 };
  }
  function boxGeom(m) {
    if (!m || m.narrate) return { x: 8, y: BOX_Y, w: 624, h: BOX_H, tx: 28, tw: 584, cx: 320 };
    if (m.side === 'right') return { x: 8, y: BOX_Y, w: 504, h: BOX_H, tx: 28, tw: 444, cx: 0 };
    return { x: 128, y: BOX_Y, w: 504, h: BOX_H, tx: 168, tw: 444, cx: 0 };
  }
  function paginate(text, tw) {
    const lines = D.wrap(text, tw, TSIZE);
    const pages = [];
    for (let i = 0; i < lines.length; i += LINES) pages.push(lines.slice(i, i + LINES));
    if (!pages.length) pages.push(['']);
    return pages;
  }
  const pageTotal = (lines) => lines.reduce((n, l) => n + l.length, 0);
  function setMsgContent(m, speaker, text, opts) {
    opts = opts || {};
    m.narrate = speaker == null || speaker === '';
    m.name = m.narrate ? null : subst(speaker);
    m.side = opts.side === 'right' ? 'right' : 'left';
    m.faceId = m.narrate ? null : (opts.face || UI.faceFor(m.name));
    m.expr = opts.expr || 'normal';
    m.pages = paginate(subst(text == null ? '' : text), boxGeom(m).tw);
    m.page = 0; m.chars = 0; m.acc = 0; m.done = false; m.doneT = 0; m.total = pageTotal(m.pages[0]);
    syncPortraits(m);
  }
  function newSprite(side, id, expr) {
    return { id, expr, side, x: side === 'left' ? -160 : W + 20, tx: 0, alpha: 0, active: true, out: false };
  }
  function syncPortraits(m) {
    for (const side of ['left', 'right']) {
      const want = (!m.narrate && m.side === side && m.faceId) ? { id: m.faceId, expr: m.expr } : null;
      const cur = ST.pts.find((p) => p.side === side && !p.out);
      if (want) {
        if (cur && cur.id === want.id) cur.expr = want.expr;
        else { if (cur) cur.out = true; ST.pts.push(newSprite(side, want.id, want.expr)); }
      } else if (m.narrate && cur) cur.out = true;
    }
    for (const p of ST.pts) p.active = !m.narrate && p.side === m.side && !p.out;
  }
  function closeMsg() {
    const m = ST.msg; if (!m || m.out) return;
    m.out = true; m.ct = 0; m.keep = false;
    for (const p of ST.pts) { if (!p.out) { p.out = true; } p.active = false; }
  }

  function enqueue(req) { ST.queue.push(req); pump(); refresh(); }
  function pump() {
    while (!ST.cur && ST.queue.length) {
      const r = ST.queue.shift();
      ST.cur = r;
      if (r.kind === 'say') startSay(r);
      else if (r.kind === 'choice') startChoice(r);
      else if (r.kind === 'card') { r.t = 0; r.total = r.frames || 150; sfx('ok'); }
      else if (r.kind === 'hint') { r.t = 0; }
      if (ST.cur !== r) break;
    }
  }
  function startSay(r) {
    let m = ST.msg;
    if (!m || m.out) m = ST.msg = newMsg();
    m.linger = 0; m.keep = false;
    setMsgContent(m, r.speaker, r.text, r.opts);
  }
  function startChoice(r) {
    r.cursor = clamp(r.def | 0, 0, Math.max(0, r.opts.length - 1));
    r.cs = {};
    if (r.prompt) {
      let m = ST.msg; if (!m || m.out) m = ST.msg = newMsg();
      m.linger = 0; m.keep = false;
      setMsgContent(m, null, r.prompt, {});
      r.stage = 'prompt';
    } else {
      r.stage = 'choose';
      if (ST.msg && !ST.msg.out) { ST.msg.keep = true; ST.msg.linger = 0; }
    }
  }
  function tickCur() {
    const r = ST.cur; if (!r) return;
    if (r.kind === 'say' || (r.kind === 'choice' && r.stage === 'prompt')) return tickMsg(r);
    if (r.kind === 'choice') return tickChoice(r);
    if (r.kind === 'hint') {
      if (G.input.pressed('ok') || G.input.pressed('cancel')) { ST.cur = null; r.res(); }
    } else if (r.kind === 'card') {
      r.t++;
      if (r.t > 24 && (G.input.pressed('ok') || G.input.pressed('cancel'))) r.t = r.total;
      if (r.t >= r.total) { ST.cur = null; r.res(); }
    }
  }
  function advancePage(r) {
    const m = ST.msg;
    if (m.page < m.pages.length - 1) {
      m.page++; m.chars = 0; m.acc = 0; m.done = false; m.doneT = 0; m.total = pageTotal(m.pages[m.page]);
      return;
    }
    if (r.kind === 'choice') { r.stage = 'choose'; m.keep = true; return; }
    ST.cur = null; m.linger = 6; r.res();
  }
  function tickMsg(r) {
    const m = ST.msg; if (!m || m.out) return;
    const inBox = PTR.click && pointIn(PTR.cx, PTR.cy, boxGeom(m));
    if (inBox) PTR.click = false;
    const press = G.input.pressed('ok') || G.input.pressed('cancel') || !!inBox;
    const dash = G.input.down('dash');
    if (!m.done) {
      if (press) { m.chars = m.total; m.done = true; m.doneT = 0; m.acc = 0; return; }
      let rate = SPEEDS[SETTINGS.speed] || 1;
      if (G.input.down('ok') || G.input.down('cancel')) rate *= 2;
      if (dash) rate *= 3;
      if (rate >= 99) m.chars = m.total;
      else {
        m.acc += rate; const n = Math.floor(m.acc); m.acc -= n;
        const prev = m.chars; m.chars = Math.min(m.total, m.chars + n);
        if (TICK && !m.narrate && m.chars > prev && m.chars % 3 === 0) sfx('cursor');
      }
      if (m.chars >= m.total) { m.done = true; m.doneT = 0; m.acc = 0; }
      return;
    }
    m.doneT++;
    if (press || (dash && m.doneT > 8)) advancePage(r);
  }
  function choiceRect(r) {
    let w = 0; for (const o of r.opts) w = Math.max(w, measure(o, TSIZE));
    w = Math.max(190, Math.ceil(w) + 58);
    const h = r.opts.length * 26 + 18;
    const above = ST.msg && !ST.msg.out;
    return { x: W - w - 14, y: Math.max(8, above ? BOX_Y - h - 10 : H - h - 14), w, h };
  }
  function rowIndexAt(px, py, rect, n) {
    return rowAt(px, py, rect.x + 4, rect.y + 9, rect.w - 8, 26, n);
  }
  function finishChoice(r, i, cancelled) {
    sfx(cancelled ? 'cancel' : 'ok');
    ST.cur = null;
    if (ST.msg && !ST.msg.out) { ST.msg.keep = false; ST.msg.linger = 0; }
    r.res(i);
  }
  function tickChoice(r) {
    if (r.stage === 'prompt') return tickMsg(r);
    const n = r.opts.length; if (!n) { ST.cur = null; r.res(0); return; }
    const rect = choiceRect(r);
    const moved = PTR.moved; PTR.moved = false;
    if (moved) { const i = rowIndexAt(PTR.x, PTR.y, rect, n); if (i >= 0) r.cursor = i; }
    if (PTR.click) {
      const i = rowIndexAt(PTR.cx, PTR.cy, rect, n); PTR.click = false;
      if (i >= 0) { r.cursor = i; return finishChoice(r, i, false); }
    }
    if (G.input.repeat('up')) { r.cursor = (r.cursor + n - 1) % n; sfx('cursor'); }
    if (G.input.repeat('down')) { r.cursor = (r.cursor + 1) % n; sfx('cursor'); }
    if (G.input.pressed('ok')) return finishChoice(r, r.cursor, false);
    if (G.input.pressed('cancel')) {
      if (r.cancel >= 0 && r.cancel < n) return finishChoice(r, r.cancel, true);
      sfx('buzzer');
    }
  }

  function refresh() {
    UI.modal = !!(ST.cur || ST.queue.length || (ST.msg && !ST.msg.out));
  }

  /** Called by core every step before the top scene updates. */
  UI.update = function () {
    PTR.click = PTR.clickPending; PTR.clickPending = false;
    for (const t of ST.toasts) t.t++;
    ST.toasts = ST.toasts.filter((t) => t.t < t.life);
    tickCur();
    pump();
    const m = ST.msg;
    if (m && !m.out) {
      m.t++;
      if (!ST.cur && !ST.queue.length && !m.keep && --m.linger <= 0) closeMsg();
    }
    if (ST.msg && ST.msg.out) { ST.msg.ct++; if (ST.msg.ct >= 10) ST.msg = null; }
    // portraits
    for (const p of ST.pts) {
      const tx = p.out ? (p.side === 'left' ? -160 : W + 20) : (p.side === 'left' ? 6 : W - 150);
      p.tx = tx;
      p.x += (tx - p.x) * 0.25;
      const ta = p.out ? 0 : (p.active ? 1 : 0.55);
      p.alpha += (ta - p.alpha) * 0.2;
    }
    ST.pts = ST.pts.filter((p) => !(p.out && Math.abs(p.x - p.tx) < 2));
    refresh();
  };

  function drawBox(c, m) {
    const g = boxGeom(m);
    let a = 1, oy = 0;
    if (m.out) { a = 1 - m.ct / 10; oy = (m.ct / 10) * 20; }
    else { const e = Math.min(1, m.t / 10); const k = 1 - Math.pow(1 - e, 3); a = k; oy = (1 - k) * 20; }
    if (a <= 0) return;
    c.save(); c.globalAlpha = Math.max(0, a);
    D.win(c, g.x, g.y + oy, g.w, g.h, { style: 'blue', alpha: 0.94 });
    const lines = m.pages[m.page] || [];
    let remain = m.chars;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const take = Math.max(0, Math.min(line.length, remain)); remain -= take;
      const s = line.slice(0, take);
      const ly = g.y + 18 + oy + i * LINE_H;
      if (m.narrate) D.text(c, s, g.cx - measure(line, TSIZE) / 2, ly, { size: TSIZE });
      else D.text(c, s, g.tx, ly, { size: TSIZE });
    }
    if (m.done && !m.out) {
      const bob = Math.floor(G.frame / 8) % 2 ? 2 : 0;
      const ax = g.x + g.w - 22, ay = g.y + g.h - 18 + bob + oy;
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(ax - 6, ay); c.lineTo(ax + 6, ay); c.lineTo(ax, ay + 7); c.closePath(); c.fill();
    }
    c.restore();
  }
  function drawTag(c, m) {
    if (m.narrate || !m.name || m.out) return;
    const g = boxGeom(m);
    const tw = Math.max(96, Math.ceil(measure(m.name, TSIZE, true)) + 30);
    const x = m.side === 'right' ? g.x + g.w - 20 - tw : g.x + 20;
    const y = g.y - 27;
    D.win(c, x, y, tw, 27, { style: 'blue', alpha: 0.97 });
    D.text(c, m.name, x + tw / 2, y + 5, { align: 'center', bold: true, color: '#fff6d8' });
  }
  function drawSprites(c) {
    for (const p of ST.pts) {
      if (p.alpha <= 0.01) continue;
      D.portrait(c, p.id, p.expr, Math.round(p.x), PORT_Y, { alpha: p.alpha, flip: p.side === 'right' });
    }
  }
  function drawChoice(c, r) {
    const rect = choiceRect(r);
    D.win(c, rect.x, rect.y, rect.w, rect.h, { style: 'blue', alpha: 0.95 });
    const n = r.opts.length;
    for (let i = 0; i < n; i++) {
      const ry = rect.y + 9 + i * 26;
      if (i === r.cursor) { c.save(); c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(rect.x + 6, ry - 1, rect.w - 12, 24); c.restore(); }
      D.text(c, r.opts[i], rect.x + 34, ry + 2, { color: i === r.cursor ? '#fff' : '#c9d6fb' });
    }
    const cur = r.cs; const ty = rect.y + 9 + r.cursor * 26 + 3;
    cursorTo(c, cur, rect.x + 10, ty);
  }
  function drawHint(c, r) {
    const lines = D.wrap(r.text, 440, TSIZE);
    const w = 500, h = lines.length * 22 + 46;
    const above = ST.msg && !ST.msg.out;
    const x = (W - w) / 2, y = above ? BOX_Y - h - 12 : H - h - 26;
    D.win(c, x, y, w, h, { style: 'blue', alpha: 0.95 });
    D.icon(c, 'star', x + 16, y + 14, 16);
    lines.forEach((l, i) => D.text(c, l, x + 42, y + 14 + i * 22, { color: '#fff' }));
    D.text(c, 'OK', x + w - 14, y + h - 22, { align: 'right', size: 14, color: '#ffd66a' });
  }
  function drawCard(c, r) {
    const t = r.t, T = r.total || 150;
    let a = 1; if (t < 20) a = t / 20; else if (t > T - 20) a = Math.max(0, (T - t) / 20);
    c.save(); c.globalAlpha = a;
    const g = c.createLinearGradient(0, 160, 0, 320);
    g.addColorStop(0, 'rgba(8,10,30,0)'); g.addColorStop(0.2, 'rgba(8,10,30,0.86)');
    g.addColorStop(0.8, 'rgba(8,10,30,0.86)'); g.addColorStop(1, 'rgba(8,10,30,0)');
    c.fillStyle = g; c.fillRect(0, 160, W, 160);
    c.fillStyle = 'rgba(255,214,120,0.85)'; c.fillRect(150, 206, 340, 1); c.fillRect(150, 298, 340, 1);
    D.text(c, r.title, W / 2, 218, { size: 34, bold: true, align: 'center', color: '#fff6d8' });
    if (r.sub) D.text(c, r.sub, W / 2, 262, { size: 16, align: 'center', color: '#ffd66a' });
    c.restore();
  }
  function drawToasts(c) {
    let y = 10;
    for (const t of ST.toasts) {
      const slide = Math.min(1, t.t / 10), fade = t.t > t.life - 20 ? (t.life - t.t) / 20 : 1;
      const icon = (t.kind === 'heart' || t.kind === 'item' || t.kind === 'good') ? 22 : 0;
      const tw = Math.ceil(measure(t.text, 16)) + icon + 34;
      const tx = Math.round(W - tw - 10 + (1 - slide) * (tw + 20));
      c.save(); c.globalAlpha = Math.max(0, fade);
      D.win(c, tx, y, tw, 30, { style: t.kind === 'heart' ? 'dark' : (t.kind === 'item' ? 'gold' : 'blue'), alpha: 0.94 });
      let x = tx + 12;
      if (icon) { D.icon(c, t.kind === 'heart' ? 'heart' : (t.kind === 'item' ? 'gold' : 'check'), x, y + 7, 16); x += 22; }
      D.text(c, t.text, x, y + 7, { color: t.kind === 'heart' ? '#ffd6e0' : '#fff' });
      c.restore();
      y += 36;
    }
  }

  /** Overlay draw — core calls this every frame after the scene. */
  UI.draw = function (c) {
    const m = ST.msg;
    if (m) drawBox(c, m);
    drawSprites(c);                                  // portraits stand in front of the box edge
    if (m) drawTag(c, m);
    if (ST.cur && ST.cur.kind === 'choice' && ST.cur.stage === 'choose') drawChoice(c, ST.cur);
    if (ST.cur && ST.cur.kind === 'hint') drawHint(c, ST.cur);
    if (ST.cur && ST.cur.kind === 'card') drawCard(c, ST.cur);
    drawToasts(c);
  };

  /** Non-blocking notification (top-right). kind: info | heart | item | good */
  UI.toast = function (text, kind) {
    kind = kind || 'info';
    ST.toasts.push({ text: String(text), kind, t: 0, life: 150 });
    if (ST.toasts.length > 4) ST.toasts.shift();
    if (kind === 'heart') sfx('heart'); else if (kind === 'item') sfx('coin'); else if (kind === 'good') sfx('ok');
  };
  UI.say = function (speaker, text, opts) {
    return new Promise((res) => enqueue({ kind: 'say', speaker, text, opts: opts || {}, res }));
  };
  UI.narrate = (text) => UI.say(null, text, {});
  UI.choice = function (opts, o) {
    o = o || {};
    const list = (opts || []).slice(0, 6).map(String);
    if (!list.length) return Promise.resolve(0);
    return new Promise((res) => enqueue({ kind: 'choice', opts: list, prompt: o.prompt ? subst(o.prompt) : null,
      cancel: o.cancel == null ? -1 : o.cancel, def: o.def || 0, res }));
  };
  UI.hint = (text) => new Promise((res) => enqueue({ kind: 'hint', text: subst(text), res }));
  UI.card = (title, sub, frames) => new Promise((res) => enqueue({ kind: 'card', title: subst(title), sub: sub ? subst(sub) : '', frames: frames || 150, res }));
  UI.nameInput = (def) => new Promise((res) => {
    const d = def || 'Rowan';
    G.scenes.push('nameentry', { default: d, title: 'What is your name?', done: (n) => res(n), onCancel: () => res(d) });
  });
  UI.busy = () => UI.modal || ST.queue.length > 0 || !!ST.cur;
  UI.modal = false;

  const FACE_MAP = {
    rowan: 'rowan', claret: 'claret', 'claret vane': 'claret', caspian: 'caspian', 'caspian thorne': 'caspian',
    rook: 'rook', 'rook calloway': 'rook', seraphine: 'seraphine', sera: 'seraphine', 'sera whitlock': 'seraphine',
    'seraphine whitlock': 'seraphine', wren: 'wren', maren: 'maren', bram: 'bram', 'bram vane': 'bram',
    torvald: 'torvald', abbess: 'abbess', orla: 'abbess', 'abbess orla': 'abbess', hale: 'hale',
    'inquisitor hale': 'hale', elowen: 'elowen', 'hollow elowen': 'elowen', vael: 'vael', 'warden vael': 'vael',
    'ignatius vael': 'vael', pip: 'pip',
  };
  /** Speaker display name -> portrait id. */
  UI.faceFor = function (speaker) {
    if (speaker == null) return null;
    const s = String(speaker).trim().toLowerCase();
    if (!s) return null;
    if (s === G.name().toLowerCase()) return 'rowan';
    if (FACE_MAP[s]) return FACE_MAP[s];
    if (G.data && G.data.actors && G.data.actors[s]) return s;
    const first = s.split(/\s+/)[0];
    if (FACE_MAP[first]) return FACE_MAP[first];
    return 'unknown';
  };

  // ============================================================== SCRIPT COMMANDS
  const SC = G.script;
  SC.define('say', (speaker, text, opts) => UI.say(speaker, text, opts));
  SC.define('narrate', (text) => UI.say(null, text, {}));
  SC.define('choice', (opts, o) => UI.choice(opts, o));
  SC.define('nameInput', (def) => UI.nameInput(def));
  SC.define('titleCard', (title, sub, frames) => UI.card(title, sub, frames));
  SC.define('toast', (text, kind) => { UI.toast(subst(text), kind); return Promise.resolve(); });
  SC.define('hint', (text) => UI.hint(text));
  SC.define('shop', (shopId) => new Promise((res) => G.scenes.push('shop', { shopId, done: res })));
  SC.define('saveMenu', () => new Promise((res) => G.scenes.push('saveload', { mode: 'save', done: res })));
  SC.define('credits', (ending) => new Promise((res) => G.scenes.replace('credits', { ending: ending || 'common', done: res })));

  // ============================================================== SCENE HELPERS
  const K = {
    up: () => G.input.repeat('up'), down: () => G.input.repeat('down'),
    left: () => G.input.repeat('left'), right: () => G.input.repeat('right'),
    ok: () => G.input.pressed('ok'), cancel: () => G.input.pressed('cancel'),
    pgUp: () => G.input.pressed('pageup'), pgDn: () => G.input.pressed('pagedown'),
  };
  const CURSOR_SFX = () => sfx('cursor');
  function drawPlayTime(c, x, y) { D.text(c, fmtTime(G.state.playtime), x, y, { color: '#cfd6ff' }); }

  // ============================================================== SCENE: TITLE
  G.scenes.register('title', () => {
    const S = { cur: 0, t: 0, anim: {} };
    const ROW0 = 312, ROWH = 34, BX = 226, BW = 188;
    const items = () => [
      { label: 'New Game', ok: true, act: 'new' },
      { label: 'Continue', ok: G.save && G.save.anySave && G.save.anySave(), act: 'continue' },
      { label: 'Options', ok: true, act: 'options' },
    ];
    const startNew = (name) => {
      G.newGame(name);
      bgm('wickholm');
      G.fx.fade = 1; G.fx.doFade('in', 40);
      G.resumeGame();
    };
    const act = (i) => {
      const it1 = items()[i];
      if (!it1.ok) { sfx('buzzer'); return; }
      sfx('ok');
      if (it1.act === 'new') G.scenes.push('nameentry', { default: 'Rowan', title: 'Name your Lamplighter', done: startNew });
      else if (it1.act === 'continue') G.scenes.push('saveload', { mode: 'load' });
      else if (it1.act === 'options') G.scenes.push('options', {});
    };
    return {
      opaque: true,
      enter() { S.t = 0; S.cur = 0; bgm('title'); G.fx.doFade('in', 40); },
      update() {
        S.t++;
        const p = UI.pointer(); const n = items().length;
        const hi = rowAt(p.x, p.y, BX + 8, ROW0 - 4, BW - 16, ROWH, n);
        if (p.moved && hi >= 0) S.cur = hi;
        if (p.clicked && hi >= 0) { S.cur = hi; act(hi); return; }
        if (K.up()) { S.cur = (S.cur + n - 1) % n; CURSOR_SFX(); }
        if (K.down()) { S.cur = (S.cur + 1) % n; CURSOR_SFX(); }
        if (K.ok()) act(S.cur);
      },
      draw(c) {
        D.titleBg(c, S.t);
        D.logo(c);
        const list = items();
        D.win(c, BX, ROW0 - 16, BW, list.length * ROWH + 14, { style: 'blue', alpha: 0.92 });
        list.forEach((it1, i) => {
          const y = ROW0 + i * ROWH;
          D.text(c, it1.label, BX + BW / 2, y + 2, { align: 'center', color: !it1.ok ? '#5d6283' : (i === S.cur ? '#fff' : '#c4d2f6') });
        });
        cursorTo(c, S.anim.cur || (S.anim.cur = {}), BX + 14, ROW0 + S.cur * ROWH - 2);
        D.text(c, 'Lanternbound v' + (G.VERSION || '0.1') + ' · every pixel and note generated in your browser', 320, 462, { align: 'center', size: 12, color: '#8e90ad' });
      },
      exit() {},
    };
  });

  // ============================================================== SCENE: NAME ENTRY
  const NE_ROWS = ['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', 'abcdefghijklm', 'nopqrstuvwxyz', "0123456789'-."];
  const NE_BTNS = ['Space', 'Back', 'OK'];
  let NE_ACTIVE = false;
  const NE_KEYS = [];
  window.addEventListener('keydown', (e) => {
    if (!NE_ACTIVE) return;
    if (e.key === 'Backspace') NE_KEYS.push('\b');
    else if (e.key === 'Enter') NE_KEYS.push('\n');
    else if (e.key && e.key.length === 1 && /[A-Za-z0-9 '\-.]/.test(e.key)) NE_KEYS.push(e.key);
  });
  G.scenes.register('nameentry', (params) => {
    const S = { buf: '', fresh: true, row: 0, col: 0, t: 0, anim: {} };
    const GX = 86, GY = 150, CW = 36, CH = 34;
    const cellRect = (r, c2) => ({ x: GX + c2 * CW, y: GY + r * CH, w: CW, h: CH });
    const btnRect = (i) => {
      const bw = [130, 110, 110][i], gap = 14;
      const total = 130 + 110 + 110 + gap * 2;
      const x0 = (W - total) / 2 + [0, 130 + gap, 130 + gap + 110 + gap][i];
      return { x: x0, y: GY + 5 * CH + 14, w: bw, h: 34 };
    };
    const beginEdit = () => { if (S.fresh) { S.buf = ''; S.fresh = false; } };
    const addChar = (ch) => { beginEdit(); if (S.buf.length < 10) S.buf += ch; };
    const back = () => { beginEdit(); S.buf = S.buf.slice(0, -1); };
    const confirm = () => {
      const n = S.buf.trim().slice(0, 10);
      if (!n) { sfx('buzzer'); return; }
      sfx('ok');
      G.scenes.pop();
      if (params.done) params.done(n);
    };
    const cancelOut = () => {
      sfx('cancel');
      G.scenes.pop();
      if (params.onCancel) params.onCancel();
    };
    const activate = (r, c2) => {
      if (r < 5) { addChar(NE_ROWS[r].charAt(c2)); sfx('cursor'); return; }
      if (c2 === 0) addChar(' ');
      else if (c2 === 1) back();
      else confirm();
    };
    return {
      opaque: true,
      enter() { S.buf = params.default || 'Rowan'; S.fresh = true; NE_ACTIVE = true; NE_KEYS.length = 0; bgm('title'); },
      exit() { NE_ACTIVE = false; NE_KEYS.length = 0; },
      update() {
        S.t++;
        const keys = NE_KEYS.splice(0);
        if (keys.length) {
          G.input.clear();                          // drop Z/X/Enter/WASD presses caused by typing
          for (const k of keys) {
            if (k === '\n') confirm();
            else if (k === '\b') { beginEdit(); back(); }
            else addChar(k);
          }
          return;
        }
        const p = UI.pointer();
        // mouse hover/click on the grid
        for (let r = 0; r < 5; r++) for (let c2 = 0; c2 < NE_ROWS[r].length; c2++) {
          const rc = cellRect(r, c2);
          if (pointIn(p.x, p.y, rc)) { if (p.moved) { S.row = r; S.col = c2; } if (p.clicked) { S.row = r; S.col = c2; activate(r, c2); return; } }
        }
        for (let i = 0; i < 3; i++) if (pointIn(p.x, p.y, btnRect(i))) {
          if (p.moved) { S.row = 5; S.col = i; }
          if (p.clicked) { S.row = 5; S.col = i; activate(5, i); return; }
        }
        const rowLen = (r) => (r < 5 ? NE_ROWS[r].length : 3);
        if (K.up()) { S.row = (S.row + 5) % 6; S.col = Math.min(S.col, rowLen(S.row) - 1); sfx('cursor'); }
        if (K.down()) { S.row = (S.row + 1) % 6; S.col = Math.min(S.col, rowLen(S.row) - 1); sfx('cursor'); }
        if (K.left()) { S.col = (S.col + rowLen(S.row) - 1) % rowLen(S.row); sfx('cursor'); }
        if (K.right()) { S.col = (S.col + 1) % rowLen(S.row); sfx('cursor'); }
        if (K.ok()) activate(S.row, S.col);
        if (K.cancel()) cancelOut();
      },
      draw(c) {
        D.menuBg(c, S.t);
        dimBg(c, 0.2);
        D.win(c, 120, 50, 400, 40, { style: 'blue' });
        D.text(c, params.title || 'Name', 320, 56, { align: 'center', color: '#ffe6b0', size: 16 });
        D.win(c, 170, 96, 300, 44, { style: 'dark' });
        const caret = Math.floor(S.t / 20) % 2 ? '_' : ' ';
        D.text(c, S.buf + caret, 320, 106, { align: 'center', size: 20, color: '#fff' });
        D.win(c, GX - 14, GY - 12, 13 * CW + 28, 5 * CH + 66 + 2, { style: 'blue', alpha: 0.9 });
        for (let r = 0; r < 5; r++) for (let c2 = 0; c2 < NE_ROWS[r].length; c2++) {
          const rc = cellRect(r, c2), sel = S.row === r && S.col === c2;
          if (sel) { c.save(); c.fillStyle = 'rgba(255,220,130,0.28)'; c.fillRect(rc.x + 2, rc.y + 1, rc.w - 4, rc.h - 2); c.restore(); }
          const ch = NE_ROWS[r].charAt(c2);
          D.text(c, ch === ' ' ? '␣' : ch, rc.x + rc.w / 2, rc.y + 8, { align: 'center', size: 18, color: sel ? '#ffe6b0' : '#fff' });
        }
        for (let i = 0; i < 3; i++) {
          const b = btnRect(i), sel = S.row === 5 && S.col === i;
          D.win(c, b.x, b.y, b.w, b.h, { style: sel ? 'gold' : 'dark', alpha: 0.95 });
          D.text(c, NE_BTNS[i], b.x + b.w / 2, b.y + 8, { align: 'center', color: sel ? '#fff' : '#c9cfee' });
        }
        D.text(c, 'Type your name or pick letters  ·  Enter / OK confirms  ·  Backspace / Back erases  ·  10 characters max', 320, 440, { align: 'center', size: 12, color: '#b8bedb' });
      },
    };
  });

  // ============================================================== SCENE: MENU
  const CMDS = ['Items', 'Skills', 'Equip', 'Status', 'Bonds', 'Formation', 'Save', 'Options', 'Title'];
  const ITEM_TABS = ['Items', 'Gear', 'Gifts', 'Key'];
  const TAB_FILTER = [
    (d) => d.type === 'consumable',
    (d) => d.type === 'weapon' || d.type === 'armor' || d.type === 'accessory',
    (d) => d.type === 'gift',
    (d) => d.type === 'key',
  ];
  const STAT_ROWS = [['mhp', 'Max HP'], ['msp', 'Max SP'], ['patk', 'Phys Atk'], ['pdef', 'Phys Def'], ['eatk', 'Elem Atk'], ['edef', 'Elem Def'], ['spd', 'Speed'], ['crit', 'Crit %'], ['eva', 'Evade %']];
  const EQUIP_SLOTS = [['weapon', 'Weapon'], ['weapon2', 'Off-hand'], ['armor', 'Armor'], ['accessory', 'Accessory']];
  const SLOT_OF = (slot) => (slot === 'weapon2' ? 'weapon' : slot);

  const ANIM_ICON = { slash: 'sword', pierce: 'spear', blunt: 'axe', arrow: 'bow', heal: 'heart', buff: 'up', debuff: 'down', bond: 'heart', steal: 'gift', revive: 'heart', poison: 'potion', shield: 'shield' };
  function skillIcon(d) {
    if (d.element) return d.element;
    if (ANIM_ICON[d.anim]) return ANIM_ICON[d.anim];
    if (d.kind === 'heal') return 'heart';
    if (d.kind === 'buff') return 'up';
    if (d.kind === 'debuff') return 'down';
    if (d.kind === 'bond') return 'heart';
    return 'sword';
  }
  function usesOk(d) { return !d.use || d.use === 'menu' || d.use === 'both'; }
  function fallbackUse(itemId, actorId) {
    const d = it(itemId), r = rt(actorId), e = d.effect || {};
    if (!r || !d.effect) return false;
    const st = statsOf(actorId);
    let did = false;
    if (e.hp && r.hp < st.mhp) { r.hp = Math.min(st.mhp, r.hp + e.hp); did = true; }
    if (e.sp && r.sp < st.msp) { r.sp = Math.min(st.msp, r.sp + e.sp); did = true; }
    if (did) removeItem(itemId, 1);
    return did;
  }
  function useOn(itemId, actorId) {
    let ok = false;
    try { ok = (G.party && G.party.useItem) ? !!G.party.useItem(itemId, actorId) : fallbackUse(itemId, actorId); } catch (e) { ok = false; }
    if (ok) { sfx('heal'); UI.toast(nameOf(actorId) + ' used ' + it(itemId).name, 'good'); }
    else sfx('buzzer');
    return ok;
  }

  G.scenes.register('menu', () => {
    const S = {
      view: 'main', t: 0,
      main: { cur: 0 },
      items: { tab: 0, cur: 0, top: 0, pick: null, pc: 0 },
      skills: { actor: 0, cur: 0, top: 0 },
      equip: { actor: 0, slot: 0, focus: 'slot', cand: 0, top: 0 },
      status: { actor: 0 },
      form: { cur: 0, top: 0 },
      confirm: { cur: 1 },
      anim: {},
    };
    const selectedActor = (v) => partyIds()[v.actor] || 'rowan';

    // ---- item / gear data
    const itemList = (tab) => itemsOwned(TAB_FILTER[tab]);
    const skillRows = (id) => {
      const a = ad(id), r = rt(id), lv = r ? r.level : 1, out = [], seen = {};
      for (const L of ((a && a.learn) || [])) if (L.level <= lv && !seen[L.skill]) { seen[L.skill] = 1; out.push(L.skill); }
      const usable = skillsUsable(id) || [];
      for (const sid of usable) if (!seen[sid]) { seen[sid] = 1; out.push(sid); }
      return out;
    };
    const candidates = (slot) => {
      const want = SLOT_OF(slot);
      const list = itemsOwned((d) => (d.slot || (d.type === 'weapon' ? 'weapon' : d.type)) === want);
      return [null].concat(list);
    };
    const formIds = () => {
      const act = partyIds().slice(), r = G.state.roster || {};
      const rest = Object.keys(r).filter((id) => act.indexOf(id) < 0)
        .sort((a, b) => (rt(b).level - rt(a).level) || nameOf(a).localeCompare(nameOf(b)));
      return act.concat(rest);
    };

    function act(i) {
      const name = CMDS[i];
      sfx('ok');
      if (name === 'Items') { S.view = 'items'; S.items.cur = 0; S.items.top = 0; S.items.pick = null; }
      else if (name === 'Skills') { S.view = 'skills'; S.skills.cur = 0; S.skills.top = 0; }
      else if (name === 'Equip') { S.view = 'equip'; S.equip.focus = 'slot'; S.equip.slot = 0; }
      else if (name === 'Status') { S.view = 'status'; }
      else if (name === 'Bonds') {
        if (G.scenes.has('bonds')) G.scenes.push('bonds');
        else { UI.toast('Coming soon', 'info'); }
      }
      else if (name === 'Formation') { S.view = 'form'; S.form.cur = 0; S.form.top = 0; }
      else if (name === 'Save') { G.scenes.push('saveload', { mode: 'save' }); }
      else if (name === 'Options') { G.scenes.push('options', {}); }
      else if (name === 'Title') { S.view = 'confirm'; S.confirm.cur = 1; }
    }
    function back() { sfx('cancel'); S.view = 'main'; }

    // ---- update per view
    function updMain() {
      const m = S.main, p = UI.pointer(), n = CMDS.length;
      const hi = rowAt(p.x, p.y, 8, 16, 172, 26, n);
      if (p.moved && hi >= 0) m.cur = hi;
      if (p.clicked && hi >= 0) { m.cur = hi; act(hi); return; }
      if (K.up()) { m.cur = (m.cur + n - 1) % n; CURSOR_SFX(); }
      if (K.down()) { m.cur = (m.cur + 1) % n; CURSOR_SFX(); }
      if (K.ok()) { act(m.cur); return; }
      if (K.cancel()) { sfx('cancel'); G.scenes.pop(); }
    }
    function updItems() {
      const I = S.items;
      const list = itemList(I.tab);
      if (I.pick) {                                     // choosing who uses the item
        const pids = partyIds();
        if (K.up()) { I.pc = (I.pc + pids.length - 1) % pids.length; CURSOR_SFX(); }
        if (K.down()) { I.pc = (I.pc + 1) % pids.length; CURSOR_SFX(); }
        if (K.ok()) {
          const id = I.pick; useOn(id, pids[I.pc]);
          if (!count(id)) I.pick = null;
          I.cur = clamp(I.cur, 0, Math.max(0, itemList(I.tab).length - 1));
          return;
        }
        if (K.cancel()) { I.pick = null; back(); }
        return;
      }
      if (K.left() || K.pgUp()) { I.tab = (I.tab + 3) % 4; I.cur = 0; I.top = 0; sfx('cursor'); }
      if (K.right() || K.pgDn()) { I.tab = (I.tab + 1) % 4; I.cur = 0; I.top = 0; sfx('cursor'); }
      const p = UI.pointer();
      if (p.clicked && p.y >= 8 && p.y < 48 && p.x >= 8 && p.x < 632) { const ti = Math.floor((p.x - 8) / (624 / 4)); if (ti >= 0 && ti < 4) { I.tab = ti; I.cur = 0; I.top = 0; } }
      const lhit = rowAt(p.x, p.y, 8, 62, 400, 26, list.length);
      if (p.moved && lhit >= 0 && lhit < list.length) I.cur = lhit;
      if (p.clicked && lhit >= 0 && lhit < list.length) { I.cur = lhit; }
      if (K.up() && list.length) { I.cur = (I.cur + list.length - 1) % list.length; CURSOR_SFX(); }
      if (K.down() && list.length) { I.cur = (I.cur + 1) % list.length; CURSOR_SFX(); }
      if (K.ok() || (p.clicked && lhit >= 0)) {
        const id = list[I.cur];
        if (!id) { sfx('buzzer'); return; }
        const d = it(id);
        if (I.tab === 0 && usesOk(d) && d.effect) { I.pick = id; I.pc = 0; sfx('ok'); }
        else if (I.tab === 1) { UI.toast('Equip gear from the Equip screen', 'info'); sfx('ok'); }
        else if (I.tab === 2) { UI.toast('Give gifts to companions on the Marigold deck', 'info'); sfx('ok'); }
        else sfx('buzzer');
      }
      if (K.cancel()) back();
    }
    function updSkills() {
      const V = S.skills, pids = partyIds();
      const p = UI.pointer();
      if (p.clicked && p.y >= 8 && p.y < 72 && p.x >= 8 && p.x < 632) { const ai = Math.floor((p.x - 8) / (624 / 4)); if (ai >= 0 && ai < pids.length) { V.actor = ai; V.cur = 0; V.top = 0; } }
      const rows = skillRows(selectedActor(S.skills));
      if (K.left() && pids.length) { V.actor = (V.actor + pids.length - 1) % pids.length; V.cur = 0; V.top = 0; CURSOR_SFX(); }
      if (K.right() && pids.length) { V.actor = (V.actor + 1) % pids.length; V.cur = 0; V.top = 0; CURSOR_SFX(); }
      if (K.up() && rows.length) { V.cur = (V.cur + rows.length - 1) % rows.length; CURSOR_SFX(); }
      if (K.down() && rows.length) { V.cur = (V.cur + 1) % rows.length; CURSOR_SFX(); }
      if (K.cancel()) back();
    }
    function updEquip() {
      const E = S.equip, pids = partyIds();
      if (K.left() && pids.length && E.focus === 'slot') { E.actor = (E.actor + pids.length - 1) % pids.length; CURSOR_SFX(); }
      if (K.right() && pids.length && E.focus === 'slot') { E.actor = (E.actor + 1) % pids.length; CURSOR_SFX(); }
      const aid = selectedActor(E);
      if (E.focus === 'slot') {
        if (K.up()) { E.slot = (E.slot + 3) % 4; CURSOR_SFX(); }
        if (K.down()) { E.slot = (E.slot + 1) % 4; CURSOR_SFX(); }
        if (K.ok()) { E.focus = 'cand'; E.cand = 0; E.top = 0; sfx('ok'); }
        if (K.cancel()) back();
        return;
      }
      const cands = candidates(EQUIP_SLOTS[E.slot][0]);
      if (K.up()) { E.cand = (E.cand + cands.length - 1) % cands.length; CURSOR_SFX(); }
      if (K.down()) { E.cand = (E.cand + 1) % cands.length; CURSOR_SFX(); }
      if (K.cancel()) { E.focus = 'slot'; sfx('cancel'); return; }
      if (K.ok()) {
        const id = cands[E.cand];
        const slot = EQUIP_SLOTS[E.slot][0];
        if (id && !canEquip(aid, id)) { sfx('buzzer'); UI.toast(nameOf(aid) + ' cannot equip ' + it(id).name, 'info'); return; }
        if (doEquip(aid, slot, id)) { sfx('ok'); E.focus = 'slot'; }
        else sfx('buzzer');
      }
    }
    function updStatus() {
      const V = S.status, pids = partyIds();
      if (K.left() && pids.length) { V.actor = (V.actor + pids.length - 1) % pids.length; CURSOR_SFX(); }
      if (K.right() && pids.length) { V.actor = (V.actor + 1) % pids.length; CURSOR_SFX(); }
      if (K.cancel()) back();
    }
    function updForm() {
      const F = S.form, ids = formIds();
      const p = UI.pointer();
      const hi = rowAt(p.x, p.y, 8, 12, 300, 40, Math.min(ids.length, 11));
      if (p.moved && hi >= 0) F.cur = hi + F.top;
      if (p.clicked && hi >= 0) { F.cur = hi + F.top; toggleMember(); return; }
      if (K.up() && ids.length) { F.cur = (F.cur + ids.length - 1) % ids.length; CURSOR_SFX(); }
      if (K.down() && ids.length) { F.cur = (F.cur + 1) % ids.length; CURSOR_SFX(); }
      if (K.ok()) toggleMember();
      if (K.cancel()) back();
      fitTop({ get cur() { return F.cur; }, get top() { return F.top; }, set top(v) { F.top = v; } }, 11);
    }
    function toggleMember() {
      const F = S.form, ids = formIds(), id = ids[F.cur];
      if (!id) return;
      const act2 = partyIds().slice();
      if (act2.indexOf(id) >= 0) {
        if (id === 'rowan') { sfx('buzzer'); UI.toast('Rowan always leads the party', 'info'); return; }
        if (act2.length <= 1) { sfx('buzzer'); return; }
        setPartyIds(act2.filter((x) => x !== id)); sfx('cancel');
      } else {
        if (act2.length >= 4) { sfx('buzzer'); UI.toast('The party is full (4 max). Remove someone first.', 'info'); return; }
        setPartyIds(act2.concat([id])); sfx('ok');
      }
    }
    function updConfirm() {
      const C = S.confirm;
      if (K.left() || K.right() || K.up() || K.down()) { C.cur = 1 - C.cur; CURSOR_SFX(); }
      if (K.cancel()) { back(); return; }
      if (K.ok()) {
        if (C.cur === 0) { sfx('ok'); G.scenes.replace('title', {}); }
        else back();
      }
    }

    // ---- draw helpers
    function drawMain(c) {
      const cw = 172, ch = CMDS.length * 26 + 16;
      D.win(c, 8, 8, cw, ch);
      CMDS.forEach((n, i) => D.text(c, n, 32, 16 + i * 26 + 3, { color: i === S.main.cur ? '#fff' : '#c4d0f4' }));
      cursorTo(c, an('cmd'), 14, 16 + S.main.cur * 26 + 5);
      // info window
      const iy = 8 + ch + 8, ih = 472 - iy;
      D.win(c, 8, iy, cw, ih);
      const ch0 = chapterInfo(G.state.chapter || 0);
      let y = iy + 12;
      D.text(c, 'Chapter ' + (G.state.chapter || 0), 22, y, { size: 13, color: '#ffd66a' }); y += 18;
      for (const l of D.wrap(ch0.title || '', cw - 28, 16)) { D.text(c, l, 22, y, { color: '#fff' }); y += 20; }
      y += 6;
      D.text(c, locationName(G.state.map && G.state.map.id), 22, y, { size: 14, color: '#cfe0ff' }); y += 24;
      D.icon(c, 'gold', 20, y, 16); D.text(c, (G.state.gold || 0) + ' G', 42, y + 1, { color: '#ffe08a' }); y += 22;
      D.text(c, 'Time  ' + fmtTime(G.state.playtime), 22, y, { size: 14, color: '#cfd6ff' });
      // party window
      const px = 188, py = 8, pw = 444, ph = 464;
      D.win(c, px, py, pw, ph);
      for (let i = 0; i < 4; i++) {
        const id = partyIds()[i], y0 = py + 14 + i * 112;
        if (!id) { D.text(c, '— open slot —', px + pw / 2, y0 + 36, { align: 'center', color: '#5d6490' }); continue; }
        const r = rt(id) || { level: 1, hp: 1, sp: 0 }, st = statsOf(id);
        D.face(c, id, px + 14, y0 + 2, 48, 'normal');
        D.text(c, nameOf(id), px + 74, y0 + 2, { bold: true, color: '#fff' });
        D.text(c, 'Lv ' + r.level, px + pw - 16, y0 + 2, { align: 'right', color: '#ffe08a' });
        D.text(c, 'HP', px + 74, y0 + 26, { size: 13, color: '#9fe8a6' });
        D.gauge(c, px + 100, y0 + 28, 176, 9, (r.hp || 0) / Math.max(1, st.mhp), '#7be07b', '#2b8a3e');
        D.text(c, (r.hp || 0) + '/' + st.mhp, px + pw - 16, y0 + 26, { align: 'right', size: 14 });
        D.text(c, 'SP', px + 74, y0 + 46, { size: 13, color: '#9dc4ff' });
        D.gauge(c, px + 100, y0 + 48, 176, 9, (r.sp || 0) / Math.max(1, st.msp), '#7fb6ff', '#2456b0');
        D.text(c, (r.sp || 0) + '/' + st.msp, px + pw - 16, y0 + 46, { align: 'right', size: 14 });
        const wid = r.equip && r.equip.weapon ? it(r.equip.weapon) : null;
        if (wid) { D.icon(c, itemIcon(wid), px + 74, y0 + 68, 16); D.text(c, wid.name, px + 96, y0 + 68, { size: 14, color: '#c8d4f2' }); }
        else D.text(c, 'Unarmed', px + 74, y0 + 68, { size: 14, color: '#7d85ad' });
        const tierTxt = (G.romance && G.romance.tierName && G.romance.CANDIDATES && G.romance.CANDIDATES.indexOf(id) >= 0) ? G.romance.tierName(id) : '';
        if (tierTxt) D.text(c, '♥ ' + tierTxt, px + pw - 16, y0 + 68, { align: 'right', size: 14, color: '#ff9ab0' });
        if (i < 3) { c.save(); c.fillStyle = 'rgba(180,200,255,0.12)'; c.fillRect(px + 14, y0 + 100, pw - 28, 1); c.restore(); }
      }
    }
    function drawTabs(c, labels, active, y, h) {
      D.win(c, 8, y, 624, h);
      const tw = 624 / labels.length;
      labels.forEach((l, i) => {
        const x = 8 + i * tw;
        if (i === active) { c.save(); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(x + 6, y + 6, tw - 12, h - 12); c.restore(); }
        D.text(c, l, x + tw / 2, y + (h - 16) / 2 - 1, { align: 'center', color: i === active ? '#ffe08a' : '#c4d0f4' });
      });
    }
    function drawActorTabs(c, active, y, h) {
      const pids = partyIds();
      D.win(c, 8, y, 624, h);
      const tw = 624 / 4;
      for (let i = 0; i < 4; i++) {
        const id = pids[i], x = 8 + i * tw;
        if (i === active) { c.save(); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(x + 6, y + 6, tw - 12, h - 12); c.restore(); }
        if (!id) { D.text(c, '—', x + tw / 2, y + h / 2 - 8, { align: 'center', color: '#5d6490' }); continue; }
        D.face(c, id, x + 12, y + 8, 40, 'normal');
        D.text(c, nameOf(id), x + 60, y + 10, { size: 15, color: i === active ? '#ffe08a' : '#fff' });
        D.text(c, 'Lv ' + ((rt(id) || {}).level || 1), x + 60, y + 30, { size: 13, color: '#a9b4dc' });
      }
    }
    function drawItems(c) {
      const I = S.items, list = itemList(I.tab);
      drawTabs(c, ITEM_TABS, I.tab, 8, 40);
      const L = { x: 8, y: 56, w: 400, h: 416 };
      D.win(c, L.x, L.y, L.w, L.h);
      if (!list.length) D.text(c, 'Nothing here yet.', L.x + L.w / 2, L.y + 40, { align: 'center', color: '#8d96c2' });
      const vis = Math.floor((L.h - 20) / 26);
      fitTop(I, vis);
      list.forEach((id, i) => {
        if (i < I.top || i >= I.top + vis) return;
        const d = it(id), ry = L.y + 10 + (i - I.top) * 26;
        if (i === I.cur) { c.save(); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(L.x + 8, ry - 2, L.w - 16, 24); c.restore(); }
        D.icon(c, itemIcon(d), L.x + 16, ry + 2, 16);
        D.text(c, d.name, L.x + 40, ry + 2, { color: i === I.cur ? '#fff' : '#d4dcf6' });
        D.text(c, '×' + count(id), L.x + L.w - 16, ry + 2, { align: 'right', color: '#ffe08a' });
      });
      if (list.length) cursorTo(c, an('items'), L.x + 4, L.y + 10 + (I.cur - I.top) * 26 + 3);
      // description
      const cur = list[I.cur];
      D.win(c, 416, 56, 216, 200);
      if (cur) {
        const d = it(cur);
        D.icon(c, itemIcon(d), 430, 68, 32);
        D.text(c, d.name, 472, 70, { bold: true, color: '#fff' });
        D.text(c, d.type + (d.price ? '  ·  ' + d.price + 'G' : ''), 472, 92, { size: 12, color: '#a9b4dc' });
        let y = 124;
        for (const l of D.wrap(d.desc || '', 186, 14)) { D.text(c, l, 430, y, { size: 14, color: '#e3e9ff' }); y += 18; }
        if (I.tab === 0 && usesOk(d) && d.effect && !I.pick) D.text(c, 'Z: use on a companion', 430, 232, { size: 12, color: '#ffd66a' });
      }
      // use-target chooser
      if (I.pick) {
        const pids = partyIds();
        D.win(c, 416, 264, 216, 208, { style: 'gold' });
        D.text(c, 'Use ' + it(I.pick).name + ' on:', 430, 276, { size: 14, color: '#fff' });
        pids.forEach((id, i) => {
          const y0 = 302 + i * 40;
          if (i === I.pc) { c.save(); c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(422, y0 - 2, 204, 36); c.restore(); }
          D.face(c, id, 428, y0, 32, 'normal');
          const r = rt(id) || { hp: 0, sp: 0 }, st = statsOf(id);
          D.text(c, nameOf(id), 468, y0, { size: 14, color: '#fff' });
          D.text(c, 'HP ' + (r.hp || 0) + '/' + st.mhp, 468, y0 + 16, { size: 12, color: '#9fe8a6' });
        });
      }
    }
    function drawSkills(c) {
      const V = S.skills, id = selectedActor(V);
      drawActorTabs(c, V.actor, 8, 64);
      const rows = skillRows(id);
      const L = { x: 8, y: 80, w: 400, h: 392 };
      D.win(c, L.x, L.y, L.w, L.h);
      const vis = Math.floor((L.h - 20) / 28);
      fitTop(V, vis);
      const usable = skillsUsable(id);
      rows.forEach((sid, i) => {
        if (i < V.top || i >= V.top + vis) return;
        const d = sk(sid), ry = L.y + 10 + (i - V.top) * 28;
        const can = !usable || usable.indexOf(sid) >= 0;
        if (i === V.cur) { c.save(); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(L.x + 8, ry - 2, L.w - 16, 26); c.restore(); }
        D.icon(c, skillIcon(d), L.x + 14, ry + 3, 16);
        D.text(c, d.name, L.x + 40, ry + 3, { color: can ? (i === V.cur ? '#fff' : '#d4dcf6') : '#6d7291' });
        if (d.cost) D.text(c, d.cost + ' SP', L.x + L.w - 16, ry + 3, { align: 'right', color: can ? '#9dc4ff' : '#6d7291' });
        else if (d.kind === 'bond') D.text(c, 'BOND', L.x + L.w - 16, ry + 3, { align: 'right', color: '#ff9ab0' });
      });
      if (!rows.length) D.text(c, 'No skills yet.', L.x + L.w / 2, L.y + 40, { align: 'center', color: '#8d96c2' });
      if (rows.length) cursorTo(c, an('skills'), L.x + 4, L.y + 10 + (V.cur - V.top) * 28 + 4);
      D.win(c, 416, 80, 216, 150);
      const sid = rows[V.cur];
      if (sid) {
        const d = sk(sid);
        D.text(c, d.name, 430, 92, { bold: true, color: '#fff' });
        let y = 116;
        for (const l of D.wrap(d.desc || '', 190, 14)) { D.text(c, l, 430, y, { size: 14, color: '#e3e9ff' }); y += 18; }
      }
      D.win(c, 416, 240, 216, 232);
      if (sid) {
        const d = sk(sid);
        const lines = [['Kind', d.kind || '-'], ['Element', d.element || '-'], ['Power', String(d.power || 100)],
          ['Hits', String(d.hits || 1)], ['Target', String(d.target || '-').replace(/_/g, ' ')], ['SP cost', String(d.cost || 0)]];
        lines.forEach((l, i) => {
          D.text(c, l[0], 430, 254 + i * 22, { size: 14, color: '#a9b4dc' });
          D.text(c, l[1], 622, 254 + i * 22, { size: 14, align: 'right', color: '#fff' });
        });
        if (usable && usable.indexOf(sid) < 0) D.text(c, 'Not available right now', 430, 404, { size: 13, color: '#ff9ab0' });
      }
    }
    function drawEquip(c) {
      const E = S.equip, id = selectedActor(E), r = rt(id) || { equip: {} };
      drawActorTabs(c, E.actor, 8, 64);
      const slotCur = E.slot;
      D.win(c, 8, 80, 300, 176);
      EQUIP_SLOTS.forEach(([key, label], i) => {
        const y = 88 + i * 42;
        const iid = (r.equip || {})[key];
        const focus = E.focus === 'slot' && i === slotCur;
        if (focus) { c.save(); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(14, y - 2, 288, 38); c.restore(); }
        D.text(c, label, 30, y, { size: 13, color: '#a9b4dc' });
        if (iid) { D.icon(c, itemIcon(it(iid)), 30, y + 16, 16); D.text(c, it(iid).name, 52, y + 16, { color: '#fff' }); }
        else D.text(c, '— empty —', 52, y + 16, { color: '#6d7291' });
      });
      if (E.focus === 'slot') cursorTo(c, an('eslot'), 14, 88 + slotCur * 42 + 4);
      // candidates
      const slotKey = EQUIP_SLOTS[slotCur][0];
      const cands = candidates(slotKey);
      const L = { x: 8, y: 262, w: 300, h: 210 };
      D.win(c, L.x, L.y, L.w, L.h);
      const vis = Math.floor((L.h - 20) / 24);
      const cst = { cur: E.cand, top: E.top };
      fitTop(cst, vis); E.top = cst.top;
      cands.forEach((cid, i) => {
        if (i < cst.top || i >= cst.top + vis) return;
        const ry = L.y + 10 + (i - cst.top) * 24;
        const ok = cid ? canEquip(id, cid) : true;
        const eq = cid && (r.equip || {})[slotKey] === cid;
        if (E.focus === 'cand' && i === E.cand) { c.save(); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(L.x + 8, ry - 2, L.w - 16, 22); c.restore(); }
        if (cid) D.icon(c, itemIcon(it(cid)), L.x + 14, ry + 2, 16);
        D.text(c, cid ? it(cid).name : '(remove)', L.x + 36, ry + 2, { color: !ok ? '#6d7291' : (E.focus === 'cand' && i === E.cand ? '#fff' : '#d4dcf6') });
        if (eq) D.text(c, 'E', L.x + L.w - 16, ry + 2, { align: 'right', color: '#8ef08e', bold: true });
      });
      if (E.focus === 'cand') cursorTo(c, an('ecand'), L.x + 4, L.y + 10 + (E.cand - cst.top) * 24 + 3);
      // stat panel with deltas for the highlighted candidate
      const st = statsOf(id);
      const cid = E.focus === 'cand' ? cands[E.cand] : null;
      const curItem = (r.equip || {})[slotKey];
      const newStats = cid ? (it(cid).stats || {}) : null;
      const oldStats = curItem ? (it(curItem).stats || {}) : {};
      D.win(c, 316, 80, 316, 392);
      D.text(c, 'Stats', 332, 92, { bold: true, color: '#ffe08a' });
      if (cid) D.text(c, 'Preview: ' + it(cid).name, 332, 112, { size: 13, color: '#a9b4dc' });
      else D.text(c, 'Choose gear to preview changes', 332, 112, { size: 13, color: '#a9b4dc' });
      STAT_ROWS.forEach(([k, label], i) => {
        const y = 140 + i * 30;
        const base = st[k] || 0;
        D.text(c, label, 332, y, { color: '#d4dcf6' });
        D.text(c, String(base), 560, y, { align: 'right', color: '#fff' });
        if (newStats) {
          const key = k === 'mhp' ? 'hp' : (k === 'msp' ? 'sp' : k);
          const dNew = (newStats[key] || 0) - (oldStats[key] || 0);
          if (dNew) {
            D.text(c, dNew > 0 ? '▲' + dNew : '▼' + Math.abs(dNew), 610, y, { align: 'right', color: dNew > 0 ? '#8ef08e' : '#ff8a8a' });
          }
        }
      });
    }
    function drawStatus(c) {
      const V = S.status, id = selectedActor(V);
      drawActorTabs(c, V.actor, 8, 64);
      const r = rt(id) || { level: 1, exp: 0, hp: 0, sp: 0, equip: {} }, st = statsOf(id), a = ad(id) || {};
      D.win(c, 8, 80, 200, 392);
      D.portrait(c, id, 'normal', 36, 84, { scale: 1 });
      let y = 284;
      D.text(c, nameOf(id), 20, y, { bold: true, size: 18, color: '#fff' }); y += 24;
      D.text(c, (a.title || a.cls || ''), 20, y, { size: 13, color: '#a9b4dc' }); y += 20;
      D.text(c, 'Lv ' + r.level + '  ' + (a.cls || ''), 20, y, { color: '#ffe08a' }); y += 24;
      let next = 0;
      try { next = G.data && G.data.expFor ? G.data.expFor(r.level + 1) : 0; } catch (e) { next = 0; }
      const base = (G.data && G.data.expFor && r.level > 1) ? G.data.expFor(r.level) : 0;
      const span = Math.max(1, next - base);
      D.text(c, 'EXP', 20, y, { size: 13, color: '#9dc4ff' });
      D.gauge(c, 58, y + 3, 128, 8, next ? (r.exp - base) / span : 0, '#ffd65a', '#b07a1a');
      y += 22;
      D.text(c, 'Next ' + (next ? Math.max(0, next - r.exp) : '-'), 20, y, { size: 12, color: '#a9b4dc' }); y += 22;
      if (G.romance && G.romance.CANDIDATES && G.romance.CANDIDATES.indexOf(id) >= 0) {
        let pts = 0, tier = 0; try { pts = G.romance.get(id); tier = G.romance.tier(id); } catch (e) { /* optional */ }
        D.text(c, G.romance.tierName ? G.romance.tierName(id) : '', 20, y, { color: '#ff9ab0' });
        D.hearts(c, 20, y + 20, pts, tier, 150);
      }
      // stats grid
      D.win(c, 216, 80, 416, 200);
      D.text(c, 'Status', 232, 92, { bold: true, color: '#ffe08a' });
      STAT_ROWS.forEach(([k, label], i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const x = 232 + col * 200, yy = 116 + row * 30;
        D.text(c, label, x, yy, { color: '#d4dcf6' });
        D.text(c, String(st[k] || 0), x + 170, yy, { align: 'right', color: '#fff' });
      });
      // equipment & tokens
      D.win(c, 216, 288, 416, 96);
      D.text(c, 'Equipped', 232, 298, { bold: true, color: '#ffe08a' });
      const eq = r.equip || {};
      let ex = 232;
      ['weapon', 'weapon2'].forEach((slot) => {
        const iid = eq[slot]; if (!iid) return;
        const d = it(iid);
        D.icon(c, itemIcon(d), ex, 320, 16);
        D.text(c, d.name, ex + 20, 321, { size: 13, color: '#fff' });
        ex += 150;
      });
      if (!eq.weapon && !eq.weapon2) D.text(c, 'No weapons equipped.', 232, 320, { size: 13, color: '#7d85ad' });
      const types = []; ['weapon', 'weapon2'].forEach((s) => { const iid = eq[s]; if (iid) { const d = it(iid); if (d.weaponType && types.indexOf(d.weaponType) < 0) types.push(d.weaponType); } });
      D.text(c, 'Weapon types', 232, 340, { size: 12, color: '#a9b4dc' });
      types.forEach((t, i) => D.icon(c, t, 232 + i * 22, 356, 16));
      const els = [];
      for (const L of (a.learn || [])) { const d = sk(L.skill); if (d.element && els.indexOf(d.element) < 0) els.push(d.element); }
      D.text(c, 'Elements', 360, 340, { size: 12, color: '#a9b4dc' });
      els.forEach((e, i) => D.icon(c, e, 360 + i * 22, 356, 16));
      // bio
      D.win(c, 216, 392, 416, 80);
      let by = 402;
      for (const l of D.wrap(a.bio || '', 392, 14).slice(0, 4)) { D.text(c, l, 228, by, { size: 14, color: '#e3e9ff' }); by += 17; }
    }
    function drawForm(c) {
      const F = S.form, ids = formIds(), act2 = partyIds();
      D.win(c, 8, 8, 300, 464);
      const vis = 11;
      fitTop(F, vis);
      ids.forEach((id, i) => {
        if (i < F.top || i >= F.top + vis) return;
        const ry = 12 + (i - F.top) * 40;
        const inP = act2.indexOf(id) >= 0;
        if (i === F.cur) { c.save(); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(12, ry, 292, 38); c.restore(); }
        D.face(c, id, 16, ry + 3, 32, 'normal');
        D.text(c, nameOf(id), 58, ry + 3, { color: '#fff' });
        D.text(c, 'Lv ' + ((rt(id) || {}).level || 1), 58, ry + 21, { size: 13, color: '#a9b4dc' });
        D.text(c, inP ? (id === 'rowan' ? 'Leader' : 'Active ' + (act2.indexOf(id) + 1)) : 'Reserve', 296, ry + 12, { align: 'right', size: 13, color: inP ? '#8ef08e' : '#8d96c2' });
      });
      if (ids.length) cursorTo(c, an('form'), 12, 12 + (F.cur - F.top) * 40 + 8);
      D.win(c, 316, 8, 316, 250);
      D.text(c, 'Active party  ' + act2.length + '/4', 332, 20, { bold: true, color: '#ffe08a' });
      for (let i = 0; i < 4; i++) {
        const id = act2[i], y = 50 + i * 46;
        if (!id) { D.text(c, '— open —', 340, y + 12, { color: '#5d6490' }); continue; }
        D.face(c, id, 330, y, 40, 'normal');
        D.text(c, nameOf(id), 382, y + 2, { color: '#fff' });
        D.text(c, i === 0 ? 'Leader' : 'Slot ' + (i + 1), 382, y + 22, { size: 12, color: '#a9b4dc' });
      }
      D.win(c, 316, 266, 316, 206);
      const sel = ids[F.cur];
      if (sel) {
        const a = ad(sel) || {};
        D.text(c, nameOf(sel), 332, 278, { bold: true, color: '#fff' });
        let y = 300;
        for (const l of D.wrap(a.bio || '', 284, 14).slice(0, 6)) { D.text(c, l, 332, y, { size: 14, color: '#e3e9ff' }); y += 18; }
        D.text(c, act2.indexOf(sel) >= 0 ? 'Z: send to reserve' : 'Z: add to active party', 332, 444, { size: 13, color: '#ffd66a' });
      }
    }
    function drawConfirm(c) {
      dimBg(c, 0.25);
      D.win(c, 190, 176, 260, 120, { style: 'dark' });
      D.text(c, 'Return to the title screen?', 320, 192, { align: 'center', color: '#fff' });
      D.text(c, 'Unsaved progress will be lost.', 320, 214, { align: 'center', size: 13, color: '#ffb0b0' });
      ['Yes', 'No'].forEach((l, i) => D.text(c, l, 260 + i * 120, 252, { align: 'center', color: S.confirm.cur === i ? '#ffe08a' : '#c4d0f4' }));
      cursorTo(c, an('conf'), 260 + S.confirm.cur * 120 - 40, 254);
    }

    return {
      opaque: false,
      enter() { S.view = 'main'; S.t = 0; },
      update() {
        S.t++;
        switch (S.view) {
          case 'main': return updMain();
          case 'items': return updItems();
          case 'skills': return updSkills();
          case 'equip': return updEquip();
          case 'status': return updStatus();
          case 'form': return updForm();
          case 'confirm': return updConfirm();
        }
      },
      draw(c) {
        if (S.view === 'main' || S.view === 'confirm') {
          dimBg(c, 0.42);
          if (S.view === 'main') drawMain(c);
          else { drawMain(c); drawConfirm(c); }
          return;
        }
        dimBg(c, 0.55);
        if (S.view === 'items') drawItems(c);
        else if (S.view === 'skills') drawSkills(c);
        else if (S.view === 'equip') drawEquip(c);
        else if (S.view === 'status') drawStatus(c);
        else if (S.view === 'form') drawForm(c);
      },
    };
  });

  // ============================================================== SCENE: SHOP
  G.scenes.register('shop', (params) => {
    const S = { focus: 'cmd', cmd: 0, cur: 0, top: 0, qty: 1, qmax: 1, actor: 0, t: 0, anim: {} };
    const shop = () => (G.data && G.data.shops && G.data.shops[params.shopId]) || { name: 'Shop', stock: [] };
    const mode = () => (S.cmd === 0 ? 'buy' : 'sell');
    const rowsFor = () => {
      if (mode() === 'buy') return (shop().stock || []).map((id) => ({ id, price: it(id).price || 0, owned: count(id) }));
      return itemsOwned((d) => (d.price || 0) > 0).map((id) => ({ id, price: Math.floor((it(id).price || 0) / 2), owned: count(id) }));
    };
    const doTrade = () => {
      const row = rowsFor()[S.cur]; if (!row) return;
      const total = row.price * S.qty;
      if (mode() === 'buy') {
        if (G.state.gold < total) { sfx('buzzer'); UI.toast('Not enough gold', 'info'); return; }
        G.state.gold -= total; addItem(row.id, S.qty);
        sfx('coin'); UI.toast('Bought ' + S.qty + ' ' + it(row.id).name, 'item');
      } else {
        removeItem(row.id, S.qty); G.state.gold += total;
        sfx('coin'); UI.toast('Sold ' + S.qty + ' ' + it(row.id).name, 'item');
      }
      S.focus = 'list';
      S.cur = clamp(S.cur, 0, Math.max(0, rowsFor().length - 1));
    };
    const openQty = () => {
      const row = rowsFor()[S.cur]; if (!row) return;
      if (mode() === 'buy') {
        const max = Math.min(99, Math.floor(G.state.gold / Math.max(1, row.price)));
        if (max <= 0) { sfx('buzzer'); UI.toast('Not enough gold', 'info'); return; }
        S.qmax = max;
      } else S.qmax = Math.max(1, Math.min(99, row.owned));
      S.qty = 1; S.focus = 'qty'; sfx('ok');
    };
    const pids = () => partyIds();
    return {
      opaque: true,
      enter() { S.t = 0; bgm('wickholm'); },
      exit() { if (params.done) params.done(); },
      update() {
        S.t++;
        if (S.focus === 'cmd') {
          if (K.up()) { S.cmd = (S.cmd + 2) % 3; CURSOR_SFX(); }
          if (K.down()) { S.cmd = (S.cmd + 1) % 3; CURSOR_SFX(); }
          if (K.ok()) {
            if (S.cmd === 2) { sfx('cancel'); G.scenes.pop(); return; }
            S.focus = 'list'; S.cur = 0; S.top = 0; sfx('ok');
          }
          if (K.cancel()) { sfx('cancel'); G.scenes.pop(); }
          return;
        }
        if (S.focus === 'list') {
          const rows = rowsFor();
          if (K.up() && rows.length) { S.cur = (S.cur + rows.length - 1) % rows.length; CURSOR_SFX(); }
          if (K.down() && rows.length) { S.cur = (S.cur + 1) % rows.length; CURSOR_SFX(); }
          if (K.pgUp() && pids().length) { S.actor = (S.actor + pids().length - 1) % pids().length; CURSOR_SFX(); }
          if (K.pgDn() && pids().length) { S.actor = (S.actor + 1) % pids().length; CURSOR_SFX(); }
          if (K.ok() && rows.length) openQty();
          if (K.cancel()) { S.focus = 'cmd'; sfx('cancel'); }
          return;
        }
        // quantity picker
        if (K.up() || K.right()) { S.qty = Math.min(S.qmax, S.qty + 1); CURSOR_SFX(); }
        if (K.down() || K.left()) { S.qty = Math.max(1, S.qty - 1); CURSOR_SFX(); }
        if (K.pgUp()) { S.qty = Math.min(S.qmax, S.qty + 10); CURSOR_SFX(); }
        if (K.pgDn()) { S.qty = Math.max(1, S.qty - 10); CURSOR_SFX(); }
        if (K.ok()) doTrade();
        if (K.cancel()) { S.focus = 'list'; sfx('cancel'); }
      },
      draw(c) {
        D.menuBg(c, S.t);
        dimBg(c, 0.2);
        const sh = shop();
        D.win(c, 8, 8, 200, 44);
        D.icon(c, 'gold', 20, 20, 16);
        D.text(c, (G.state.gold || 0) + ' G', 42, 19, { color: '#ffe08a', size: 17 });
        D.win(c, 216, 8, 416, 44);
        D.text(c, sh.name || 'Shop', 232, 19, { bold: true, color: '#fff', size: 17 });
        D.win(c, 8, 60, 200, 118);
        ['Buy', 'Sell', 'Exit'].forEach((l, i) => D.text(c, l, 32, 74 + i * 30, { color: S.cmd === i ? '#fff' : '#c4d0f4' }));
        if (S.focus === 'cmd') cursorTo(c, an('shop_cmd'), 14, 72 + S.cmd * 30);
        // list
        const rows = rowsFor();
        const L = { x: 216, y: 60, w: 416, h: 330 };
        D.win(c, L.x, L.y, L.w, L.h);
        if (!rows.length) D.text(c, mode() === 'buy' ? 'Nothing for sale.' : 'Nothing to sell.', L.x + L.w / 2, L.y + 40, { align: 'center', color: '#8d96c2' });
        const vis = Math.floor((L.h - 20) / 26);
        const st = { cur: S.cur, top: S.top }; fitTop(st, vis); S.top = st.top;
        rows.forEach((row, i) => {
          if (i < S.top || i >= S.top + vis) return;
          const d = it(row.id), ry = L.y + 10 + (i - S.top) * 26;
          const afford = mode() === 'sell' || G.state.gold >= row.price;
          if (S.focus === 'list' && i === S.cur) { c.save(); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(L.x + 8, ry - 2, L.w - 16, 24); c.restore(); }
          D.icon(c, itemIcon(d), L.x + 16, ry + 2, 16);
          D.text(c, d.name, L.x + 40, ry + 2, { color: afford ? '#fff' : '#7d85ad' });
          D.text(c, row.price + ' G', L.x + 300, ry + 2, { align: 'right', color: afford ? '#ffe08a' : '#7d85ad' });
          D.text(c, 'x' + row.owned, L.x + L.w - 16, ry + 2, { align: 'right', size: 14, color: '#a9b4dc' });
        });
        if (S.focus === 'list' && rows.length) cursorTo(c, an('shop_list'), L.x + 4, L.y + 10 + (S.cur - S.top) * 26 + 3);
        // equipment preview / description
        const row = rows[S.cur];
        const d = row ? it(row.id) : null;
        D.win(c, 8, 186, 200, 280);
        if (d) {
          D.text(c, 'Preview', 20, 196, { size: 13, color: '#ffd66a' });
          const aid = pids()[S.actor] || 'rowan';
          if (['weapon', 'armor', 'accessory'].indexOf(d.type) >= 0) {
            D.text(c, nameOf(aid), 20, 216, { bold: true, color: '#fff' });
            const can = canEquip(aid, d.id);
            D.text(c, can ? 'Can equip' : "Can't equip", 20, 236, { size: 13, color: can ? '#8ef08e' : '#ff8a8a' });
            const slot = d.slot || d.type;
            const r = rt(aid) || { equip: {} };
            const cur = (r.equip || {})[slot === 'weapon' ? 'weapon' : slot];
            const oldS = cur ? (it(cur).stats || {}) : {};
            const newS = d.stats || {};
            let y = 260;
            ['patk', 'pdef', 'eatk', 'edef', 'spd', 'crit', 'eva'].forEach((k) => {
              const dv = (newS[k] || 0) - (oldS[k] || 0);
              if (!newS[k] && !oldS[k]) return;
              D.text(c, k, 20, y, { size: 13, color: '#d4dcf6' });
              D.text(c, (dv > 0 ? '▲' : (dv < 0 ? '▼' : '=')) + (dv ? Math.abs(dv) : ''), 178, y, { size: 13, align: 'right', color: dv > 0 ? '#8ef08e' : (dv < 0 ? '#ff8a8a' : '#a9b4dc') });
              y += 20;
            });
            D.text(c, 'Z: buy/sell   Q/C: actor', 20, 440, { size: 11, color: '#7d85ad' });
          } else {
            D.text(c, 'Owned: ' + count(d.id), 20, 216, { color: '#fff' });
            D.text(c, 'Sell price: ' + Math.floor((d.price || 0) / 2) + ' G', 20, 240, { size: 13, color: '#a9b4dc' });
          }
        }
        D.win(c, 216, 398, 416, 68);
        if (d) D.wrap(d.desc || '', 390, 14).slice(0, 3).forEach((l, i) => D.text(c, l, 230, 404 + i * 18, { size: 14, color: '#e3e9ff' }));
        if (S.focus === 'qty' && d) {
          D.win(c, 190, 190, 260, 110, { style: 'gold' });
          D.text(c, (mode() === 'buy' ? 'Buy ' : 'Sell ') + d.name, 320, 204, { align: 'center', color: '#fff' });
          D.text(c, '◀  ' + S.qty + '  ▶', 320, 232, { align: 'center', size: 20, color: '#ffe08a' });
          D.text(c, 'Total ' + (S.qty * (row ? row.price : 0)) + ' G', 320, 266, { align: 'center', size: 13, color: '#cfe0ff' });
        }
      },
    };
  });

  // ============================================================== SCENE: SAVE / LOAD
  G.scenes.register('saveload', (params) => {
    const mode = params.mode === 'save' ? 'save' : 'load';
    const S = { cur: 0, confirm: null, cc: 1, t: 0, anim: {} };
    const syncMap = () => {
      try {
        const inStack = G.scenes.stack().some((s) => s.name === 'map');
        if (inStack && G.map && G.map.player && G.map.id) {
          G.state.map = { id: G.map.id, x: G.map.player.x, y: G.map.player.y, dir: G.map.player.dir || 'down' };
        }
      } catch (e) { /* optional */ }
    };
    const doSave = (slot) => {
      syncMap();
      if (G.save.write(slot)) { sfx('save'); UI.toast('Game saved', 'good'); G.scenes.pop(); }
      else { sfx('buzzer'); UI.toast('Save failed', 'info'); }
    };
    const doLoad = (slot) => {
      if (!G.save.exists(slot)) { sfx('buzzer'); return; }
      if (G.save.read(slot)) { sfx('ok'); G.resumeGame(); }
      else { sfx('buzzer'); UI.toast('That save could not be read', 'info'); }
    };
    const pick = (slot) => {
      if (mode === 'save') {
        if (G.save.exists(slot)) { S.confirm = slot; S.cc = 1; sfx('ok'); }
        else doSave(slot);
      } else doLoad(slot);
    };
    const cardRect = (i) => ({ x: 60, y: 60 + i * 124, w: 520, h: 112 });
    return {
      opaque: true,
      enter() { S.t = 0; S.cur = 0; },
      exit() { if (params.done) params.done(mode === 'save'); },
      update() {
        S.t++;
        if (S.confirm != null) {
          if (K.left() || K.right()) { S.cc = 1 - S.cc; CURSOR_SFX(); }
          if (K.ok()) { if (S.cc === 0) doSave(S.confirm); else { S.confirm = null; sfx('cancel'); } }
          if (K.cancel()) { S.confirm = null; sfx('cancel'); }
          return;
        }
        const p = UI.pointer();
        for (let i = 0; i < 3; i++) if (pointIn(p.x, p.y, cardRect(i))) { if (p.moved) S.cur = i; if (p.clicked) { S.cur = i; pick(i + 1); return; } }
        if (K.up()) { S.cur = (S.cur + 2) % 3; CURSOR_SFX(); }
        if (K.down()) { S.cur = (S.cur + 1) % 3; CURSOR_SFX(); }
        if (K.ok()) pick(S.cur + 1);
        if (K.cancel()) { sfx('cancel'); G.scenes.pop(); }
      },
      draw(c) {
        D.menuBg(c, S.t);
        dimBg(c, 0.2);
        D.win(c, 60, 12, 520, 40, { style: 'blue' });
        D.text(c, mode === 'save' ? 'Save Game' : 'Load Game', 320, 22, { align: 'center', color: '#ffe6b0', size: 18 });
        for (let i = 0; i < 3; i++) {
          const slot = i + 1, r = cardRect(i), meta = G.save.info(slot), sel = S.cur === i;
          D.win(c, r.x, r.y, r.w, r.h, { style: sel ? 'gold' : 'blue', alpha: 0.94 });
          D.text(c, 'Slot ' + slot, r.x + 14, r.y + 10, { size: 14, color: '#ffd66a' });
          if (!meta) {
            D.text(c, '— No data —', r.x + r.w / 2, r.y + 44, { align: 'center', color: '#8d96c2', size: 18 });
            continue;
          }
          const ch = chapterInfo(meta.chapter || 0);
          D.text(c, ch.title || '', r.x + 14, r.y + 32, { bold: true, color: '#fff', size: 17 });
          D.text(c, locationName(meta.map) || meta.mapName || '', r.x + 14, r.y + 56, { size: 14, color: '#cfe0ff' });
          D.text(c, 'Time ' + fmtTime(meta.playtime) + '   Gold ' + (meta.gold || 0), r.x + 14, r.y + 80, { size: 13, color: '#a9b4dc' });
          if (meta.time) D.text(c, new Date(meta.time).toLocaleDateString(), r.x + r.w - 14, r.y + 10, { align: 'right', size: 12, color: '#8d96c2' });
          (meta.party || []).slice(0, 4).forEach((m2, j) => {
            const px = r.x + r.w - 150 + j * 36;
            D.face(c, m2.id, px, r.y + 40, 32, 'normal');
            D.text(c, String(m2.level), px + 16, r.y + 76, { align: 'center', size: 12, color: '#ffe08a' });
          });
        }
        if (S.confirm != null) {
          D.win(c, 190, 176, 260, 120, { style: 'dark' });
          D.text(c, 'Overwrite Slot ' + S.confirm + '?', 320, 196, { align: 'center', color: '#fff' });
          ['Yes', 'No'].forEach((l, i) => D.text(c, l, 260 + i * 120, 240, { align: 'center', color: S.cc === i ? '#ffe08a' : '#c4d0f4' }));
          cursorTo(c, an('ow'), 260 + S.cc * 120 - 40, 242);
        }
      },
    };
  });

  // ============================================================== SCENE: OPTIONS
  G.scenes.register('options', (params) => {
    const S = { cur: 0, t: 0, anim: {} };
    const ROWS = [
      { label: 'BGM Volume', key: 'bgm', min: 0, max: 10 },
      { label: 'SFX Volume', key: 'sfx', min: 0, max: 10 },
      { label: 'Text Speed', key: 'speed', min: 0, max: 3 },
      { label: 'Auto-run (Shift walks)', key: 'autoRun', bool: true },
      { label: 'Back' },
    ];
    const adjust = (dir) => {
      const r = ROWS[S.cur]; if (!r || !r.key) return;
      if (r.bool) SETTINGS[r.key] = !SETTINGS[r.key];
      else SETTINGS[r.key] = clamp(SETTINGS[r.key] + dir, r.min, r.max);
      applyVolume(); saveSettings(); sfx('cursor');
    };
    const valueText = (r) => {
      if (r.bool) return SETTINGS[r.key] ? 'On' : 'Off';
      if (r.key === 'speed') return SPEED_NAMES[SETTINGS.speed];
      return String(SETTINGS[r.key]);
    };
    return {
      opaque: true,
      enter() { S.t = 0; S.cur = 0; },
      update() {
        S.t++;
        if (K.up()) { S.cur = (S.cur + ROWS.length - 1) % ROWS.length; CURSOR_SFX(); }
        if (K.down()) { S.cur = (S.cur + 1) % ROWS.length; CURSOR_SFX(); }
        if (K.left()) adjust(-1);
        if (K.right()) adjust(1);
        if (K.ok()) {
          if (ROWS[S.cur].bool) adjust(1);
          else if (!ROWS[S.cur].key) { sfx('cancel'); G.scenes.pop(); }
          else adjust(1);
        }
        if (K.cancel()) { sfx('cancel'); G.scenes.pop(); }
      },
      draw(c) {
        D.menuBg(c, S.t);
        dimBg(c, 0.25);
        D.win(c, 100, 60, 440, 340);
        D.text(c, 'Options', 320, 76, { align: 'center', color: '#ffe6b0', size: 20 });
        ROWS.forEach((r, i) => {
          const y = 124 + i * 46, sel = i === S.cur;
          if (sel) { c.save(); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(116, y - 6, 408, 36); c.restore(); }
          D.text(c, r.label, 136, y, { color: sel ? '#fff' : '#c4d0f4' });
          if (!r.label || r.key === undefined) return;
          if (r.key === 'bgm' || r.key === 'sfx') {
            D.gauge(c, 330, y + 6, 150, 10, SETTINGS[r.key] / 10, '#9fd0ff', '#2d5ea8');
            D.text(c, String(SETTINGS[r.key]), 500, y, { align: 'right', color: '#ffe08a' });
          } else D.text(c, '◀ ' + valueText(r) + ' ▶', 500, y, { align: 'right', color: '#ffe08a' });
        });
        cursorTo(c, an('opt'), 118, 124 + S.cur * 46 - 3);
        D.text(c, 'Left/Right adjust  ·  Z select  ·  X back', 320, 420, { align: 'center', size: 13, color: '#a9b4dc' });
      },
    };
  });

  // ============================================================== SCENE: GAME OVER
  G.scenes.register('gameover', () => {
    const S = { cur: 0, t: 0, anim: {} };
    const embers = (() => { const r = G.util.rng(99); const a = []; for (let i = 0; i < 40; i++) a.push([r() * W, r() * H, 0.2 + r() * 0.6]); return a; })();
    const items = () => [
      { label: 'Load last save', ok: G.save && G.save.anySave && G.save.anySave() },
      { label: 'Return to title', ok: true },
    ];
    return {
      opaque: true,
      enter() { S.t = 0; S.cur = 0; bgm('gameover'); G.fx.doFade('in', 60); },
      update() {
        S.t++;
        const list = items();
        if (K.up() || K.down()) { S.cur = 1 - S.cur; CURSOR_SFX(); }
        if (K.ok()) {
          if (S.cur === 0) {
            if (!list[0].ok) { sfx('buzzer'); return; }
            const slot = G.save.latest();
            if (slot && G.save.read(slot)) { sfx('ok'); G.resumeGame(); }
            else sfx('buzzer');
          } else { sfx('ok'); G.scenes.replace('title', {}); }
        }
      },
      draw(c) {
        c.fillStyle = '#05050c'; c.fillRect(0, 0, W, H);
        for (const [x, y, s] of embers) {
          const yy = (y - S.t * s * 0.4 + H * 10) % H;
          c.globalAlpha = 0.25 + 0.25 * Math.sin((S.t + x) / 20);
          c.fillStyle = '#ffb35c'; c.fillRect(Math.round(x), Math.round(yy), 2, 2);
        }
        c.globalAlpha = 1;
        D.text(c, 'The lamps go dark…', 320, 150, { align: 'center', size: 34, bold: true, color: '#e8e4ff' });
        D.text(c, 'Rowan has fallen. The Hollow hasn’t won yet.', 320, 200, { align: 'center', size: 16, color: '#a9a2c8' });
        const list = items();
        D.win(c, 220, 268, 200, 92, { style: 'dark' });
        list.forEach((it1, i) => D.text(c, it1.label, 320, 282 + i * 30, { align: 'center', color: !it1.ok ? '#5d5a78' : (S.cur === i ? '#fff' : '#b8b4d4') }));
        cursorTo(c, an('go'), 232, 282 + S.cur * 30 + 2);
      },
    };
  });

  // ============================================================== SCENE: CREDITS
  const ENDING = {
    twin: { bgm: 'ending_love', text: 'Two hearts kindled one star. The Tithe ended the day the Hearthstar learned to share its light instead of drinking it. Rowan and their Beloved never again had to choose between being warm and being whole.' },
    common: { bgm: 'ending_common', text: 'No single flame carried the Hearthstar. Every friend lent a little of their warmth, and the lantern on the hill became a shared hearth. Auren still has dark nights. It has far more people to sit beside on them.' },
    lone: { bgm: 'ending_lone', text: 'Rowan became the new star, alone above the dusk. But somewhere in Auren a lantern stays lit at every window, kept burning by friends who never stopped looking up.' },
  };
  const CAST = [['Rowan', 'Apprentice Lamplighter of Wickholm'], ['Claret Vane', 'Captain of the Marigold'], ['Caspian Thorne', 'The Grey Lion'],
    ['Rook Calloway', 'Thief with a lucky coin'], ['Seraphine Whitlock', 'Cantor of the Pale Choir'], ['Wren Alder', 'Hedge-witch of Whisperwood'],
    ['Maren', 'Lampkeeper of Wickholm'], ['Pip', 'Lamplighter, and trouble'], ['Inquisitor Hale', 'Hearth Order'], ['Warden Vael', 'Archlampwright']];
  G.scenes.register('credits', (params) => {
    const ending = ENDING[params.ending] ? params.ending : 'common';
    const S = { y: H + 20, t: 0, hold: 0, done: false };
    let lines = null;
    const build = () => {
      const out = [];
      out.push({ t: 'LANTERNBOUND', s: 'title' });
      out.push({ t: 'Hearts of the Hollow Dusk', s: 'sub' });
      out.push({ t: ' ', s: 'gap' });
      for (const l of D.wrap(ENDING[ending].text, 470, 16)) out.push({ t: l, s: 'body' });
      out.push({ t: ' ', s: 'gap' }); out.push({ t: ' ', s: 'gap' });
      out.push({ t: 'Cast', s: 'head' });
      for (const [n, r] of CAST) { out.push({ t: n, s: 'name' }); out.push({ t: r, s: 'role' }); }
      out.push({ t: ' ', s: 'gap' }); out.push({ t: ' ', s: 'gap' });
      out.push({ t: 'Design, code and music', s: 'head' });
      out.push({ t: 'Built in vanilla JavaScript on one canvas.', s: 'role' });
      out.push({ t: 'Every sprite, tile, portrait and note is generated procedurally.', s: 'role' });
      out.push({ t: ' ', s: 'gap' }); out.push({ t: ' ', s: 'gap' });
      out.push({ t: 'Thank you for playing.', s: 'sub' });
      out.push({ t: 'Keep a lantern lit.', s: 'sub' });
      return out;
    };
    const LH = { title: 46, sub: 22, gap: 26, body: 22, head: 26, name: 24, role: 20 };
    const SZ = { title: 40, sub: 17, gap: 16, body: 16, head: 20, name: 17, role: 14 };
    const COL = { title: '#ffe6b0', sub: '#ffd66a', gap: '#fff', body: '#e6e0ff', head: '#ffe08a', name: '#ffffff', role: '#b8c4ea' };
    const total = () => { let y = 0; for (const l of lines) y += LH[l.s]; return y; };
    const finish = () => {
      if (S.done) return;
      S.done = true;
      G.scenes.replace('title', {});
    };
    return {
      opaque: true,
      enter() {
        lines = build(); S.y = H + 20; S.t = 0; S.hold = 0; S.done = false;
        bgm(ENDING[ending].bgm); G.fx.doFade('in', 40);
      },
      exit() { if (params.done) params.done(); },
      update() {
        S.t++;
        const fast = G.input.down('ok') || G.input.down('dash');
        S.y -= fast ? 2 : 0.6;
        if (S.y < -total() - 30) { S.hold++; }
        if ((S.hold > 90 && S.y < -total() - 30) || (K.ok() && S.y < -total() - 30) || K.cancel()) { sfx('ok'); finish(); return; }
        if (K.ok() && S.y >= -total() - 30) S.y -= 60;   // ok jumps ahead
      },
      draw(c) {
        D.titleBg(c, S.t);
        c.save(); c.globalAlpha = 0.45; c.fillStyle = '#060818'; c.fillRect(0, 0, W, H); c.restore();
        let y = S.y;
        for (const l of lines) {
          const h = LH[l.s];
          if (y > -h && y < H + 4 && l.s !== 'gap') {
            D.text(c, l.t, 320, Math.round(y), { align: 'center', size: SZ[l.s], bold: l.s === 'title' || l.s === 'head', color: COL[l.s] });
          }
          y += h;
        }
      },
    };
  });

  // ============================================================== boot-time setup
  G.provide('ui');
})();
