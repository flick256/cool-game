/* =====================================================================
 * LANTERNBOUND — romance.js  (owner: romance)
 * G.romance API (CONTRACT §9), romance script commands (affection, runScene,
 * afterRest), the 'bonds' scene (candidate list + journal) and the gift menu.
 * Soft dependencies (gfx / ui / audio / data / party / map) are used lazily.
 * ===================================================================== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});

  // ------------------------------------------------------------------ constants
  const CANDIDATES = ['claret', 'caspian', 'rook', 'seraphine', 'wren'];
  const TIERS = ['Companion', 'Friend', 'Close', 'Devoted', 'Beloved'];
  const TIER_MIN = [0, 15, 40, 65];            // points needed for tiers 0..3 (tier 4 = lover only)
  const GIFT_DELTA = { love: 8, like: 4, neutral: 1, dislike: -3 };
  const TRICKLE_CAP = 3;                       // bondTrickle per partner per chapter
  const JOURNAL_MAX = 300;
  const GIFT_IDS = ['wild_honey', 'brass_cog', 'silver_locket', 'old_book', 'lavender_sachet', 'ember_wine', 'star_chart',
    'ribbon', 'whetstone', 'moonpetal', 'sweet_bun', 'music_box', 'pressed_flower', 'lucky_coin', 'rare_tea', 'feather_quill'];

  // fixed preference table (CONTRACT §9)
  const PREFS = {
    claret: { loves: ['brass_cog', 'wild_honey'], likes: ['whetstone', 'ember_wine', 'music_box'], dislikes: ['lavender_sachet'] },
    caspian: { loves: ['old_book', 'rare_tea'], likes: ['whetstone', 'star_chart', 'pressed_flower'], dislikes: ['ember_wine'] },
    rook: { loves: ['lucky_coin', 'ember_wine'], likes: ['silver_locket', 'sweet_bun', 'brass_cog'], dislikes: ['old_book'] },
    seraphine: { loves: ['lavender_sachet', 'sweet_bun'], likes: ['feather_quill', 'music_box', 'rare_tea', 'pressed_flower'], dislikes: ['whetstone'] },
    wren: { loves: ['moonpetal', 'rare_tea'], likes: ['pressed_flower', 'wild_honey', 'ribbon', 'feather_quill'], dislikes: ['sweet_bun'] },
  };

  // three reaction lines per character per kind. {item} is replaced with the gift name.
  const REACT = {
    claret: {
      love: [
        "Honey *and* brass. Somebody's been paying attention. Fine. Thank you, {name}. Don't make it weird.",
        "Oh, that's... this goes on the shelf above the bench. Don't look at me. My eyes are just oily today.",
        "I'm not going to say I love it. I'll say the ship has been unbearable and you've fixed it. Thanks.",
      ],
      like: [
        "A {item}. Decent. Better than decent. I'll find a use for it, which is how I say thank you.",
        "Ooh, good pick. Now I have something to fidget with during the boring bits of the sky.",
        "You've got taste. The ship doesn't, so it's on me to pass it on. Thanks.",
      ],
      neutral: [
        "A {item}. Thanks. It'll go on the bench. Mind the grease on the lid.",
        "Hm. Not my first thought, not my last. But it's the thought that counts, apparently.",
        "You didn't have to do that. I'm not going to make a fuss. ...Thanks.",
      ],
      dislike: [
        "A {item}. Right. I'm sure it's wonderful. I'm just not a... sachet person. Put it over there.",
        "Ugh, that smell. It's in my cabin now. Thanks anyway. I'll bin it when you're not looking.",
        "I won't throw it in front of you. Give me a second to decide where it goes. The bilge, probably.",
      ],
    },
    caspian: {
      love: [
        "You remembered. I have carried my old books through many years, and no one has ever returned the favour. Thank you.",
        "This is very thoughtful. I shall read it slowly, so that the pleasure lasts. Thank you, {name}.",
        "I am seldom at a loss for words. You have found one of the rare occasions. Thank you.",
      ],
      like: [
        "A thoughtful choice. I shall enjoy it in the quiet hours, once the engines are finally silent.",
        "I have always wanted one of these. I did not know anyone had noticed. Thank you.",
        "It is well chosen. You have a fine eye for what might please a tired former knight. Thank you.",
      ],
      neutral: [
        "That is a kind gesture. I am not certain what to do with it yet, but I will find it a place. Thank you.",
        "A {item}. Gifts are rarely wasted, I find. Thank you, sincerely.",
        "I appreciate the thought. I shall endeavour to look more appreciative in future.",
      ],
      dislike: [
        "I have a complicated history with {item}. Please do not be offended. I simply cannot bear it. Thank you for the thought.",
        "Ah. I shall put it somewhere very far from my bedroll. The thought was lovely, truly.",
        "Forgive me. This reminds me of a bad night in the Order's hall. It is a foolish reaction, and I am still sorry.",
      ],
    },
    rook: {
      love: [
        "Oh, you SHOULD NOT have. ...I'm keeping it. Don't ask me to pretend I'm not sentimental. I'm extremely sentimental.",
        "Nobody has ever picked something out for me on purpose. Don't you dare make me blush. I'm a professional.",
        "Thanks, {name}. Seriously. That's going in the good pocket, the one nobody else gets to touch.",
      ],
      like: [
        "{item}? Scandalous. You know exactly what you're doing to me. Keep doing it.",
        "Ooh, very nice. I'll trade you a favour for it. Not a big favour. A medium one.",
        "Good taste, that. Slightly stolen-looking. My favourite kind of gift.",
      ],
      neutral: [
        "A {item}. I'll pretend I'm not a tiny bit disappointed it isn't something sparklier.",
        "Hm. Sweet of you. Not a bad judge of character, you know, for someone who isn't a thief.",
        "Thanks. I'll find a use for it. Probably. Don't ask me what kind of use.",
      ],
      dislike: [
        "Ooh, bold. Did you pick that out to test me? I'll have you know I'm far more resilient than a sorry {item}.",
        "I'm going to pretend I didn't see that. Then I'll quietly re-gift it to someone I can't stand.",
        "Let's agree it was a bad gift and you're forgiven. Don't do it again, or I'll tell everybody.",
      ],
    },
    seraphine: {
      love: [
        "Oh... a gift with nothing asked in return. I will keep it by the window, where the evening can find it.",
        "You thought of the small sweet things I like. I will sing a verse over it tonight. Thank you.",
        "Forgive me, my eyes are a little wet. It is only the lantern light, I promise. Thank you, {name}.",
      ],
      like: [
        "How lovely. I will hum something over it tonight. The tune is not very good, but it is sincere.",
        "I did not know I wanted this until now. That is a strange and wonderful feeling. Thank you.",
        "A small thing, and a gentle one. Those are the best kind. Thank you.",
      ],
      neutral: [
        "Thank you. Gifts are such small kindnesses that a hymn can barely hold them. I'll find a corner.",
        "Oh, a {item}. I will remember that you chose it for me. Thank you, truly.",
        "I appreciate it. I am not sure yet what I'll do with it, but I can think about it at evensong.",
      ],
      dislike: [
        "I see. Not every sweetness is kind to the tongue. I will be honest with you, as I try to be: this is not for me.",
        "Please don't look so sorry. The thought was good; the {item} simply isn't. I will keep it, for your sake.",
        "It is not to my taste, I'm afraid. Give me a little time to like it, and perhaps a better one next time.",
      ],
    },
    wren: {
      love: [
        "You brought me this. Nobody brings me things. The foxes don't count, they leave dead things on the step. This is better.",
        "This is the best thing. I'll put it where the sun gets in and visit it every day. Thank you.",
        "I don't know what to do with my face. I'm told this is 'smiling'. Thank you, {name}.",
      ],
      like: [
        "This is good. Like a thing from a good season. I'll plant the feeling somewhere and wait to see what comes up.",
        "Ah, yes. The right sort of thing. I'll keep it in the window, where the light is. Thanks.",
        "Good. Odd, but good. Thanks, {name}.",
      ],
      neutral: [
        "It's a thing, and you brought it, so it's a good thing. Thank you. Now I have to decide where it goes. Hm.",
        "A {item}. Right. I'll put it with the other things I haven't decided about yet. Thanks.",
        "That's a kind thing to do. I'm bad at kind things, so I'll just say thank you again. Thank you.",
      ],
      dislike: [
        "I don't like this one. Not because it's bad. It reminds me of a dry winter. I'll keep it anyway. Thanks for trying.",
        "Sweet things make my teeth ache, and then my feelings do. Thank you for the thought, though.",
        "This one is a bit sad, like a leaf that fell too early. I'll put it under a stone. You're forgiven.",
      ],
    },
  };
  const GIFT_FULL = {
    claret: "You've already given me something this chapter. Don't spoil me, I'll get used to it. Ask again later.",
    caspian: "You have been most generous already this chapter. Let me hold what I have, and you may return later.",
    rook: "Ha. Greedy, are we? You already spoiled me this chapter. Come back when the next chapter starts, sweetheart.",
    seraphine: "Your kindness is already in my hands this chapter, dear one. Let me hold it a little longer.",
    wren: "You gave me one already. One gift a season is enough; the garden needs time. Come back next chapter.",
  };
  const EXPR = { love: 'blush', like: 'happy', neutral: 'normal', dislike: 'worried' };

  // ------------------------------------------------------------------ small helpers
  const isCand = (id) => CANDIDATES.indexOf(id) >= 0;
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sfx = (n) => { try { if (G.audio && G.audio.sfx) G.audio.sfx(n); } catch (e) { /* audio optional */ } };
  const toast = (text, kind) => { try { if (G.ui && G.ui.toast) G.ui.toast(text, kind || 'info'); } catch (e) { /* ui optional */ } };
  const say = (who, text, o) => G.script.run((c) => c.say(who, text, o));

  function actorData(id) { return (G.data && G.data.actors && G.data.actors[id]) || null; }
  function actorName(id) { const a = actorData(id); return (a && a.name) || cap(id); }
  function actorTitle(id) { const a = actorData(id); return (a && (a.title || a.cls)) || ''; }
  function actorColor(id) { const a = actorData(id); return (a && a.color) || '#ffcc66'; }
  function itemData(id) { return (G.data && G.data.items && G.data.items[id]) || null; }
  function itemName(id) { const d = itemData(id); return (d && d.name) || id.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()); }
  function itemDesc(id) { const d = itemData(id); return (d && d.desc) || ''; }
  function isGift(id) {
    const d = itemData(id);
    if (d) return d.type === 'gift';
    return GIFT_IDS.indexOf(id) >= 0;
  }

  // romance state, always normalised (old saves may lack newer fields)
  const EMPTY = () => ({ points: {}, lover: null, seen: {}, gifts: {}, journal: [], trickle: { ch: -1, n: {} } });
  let scratch = EMPTY();
  function st() {
    const S = G.state; if (!S) return (scratch = EMPTY());
    const r = S.romance || (S.romance = EMPTY());
    if (!r.points) r.points = {};
    if (r.lover === undefined) r.lover = null;
    if (!r.seen) r.seen = {};
    if (!r.gifts) r.gifts = {};
    if (!r.journal) r.journal = [];
    if (!r.trickle) r.trickle = { ch: -1, n: {} };
    return r;
  }
  const chapter = () => (G.state && G.state.chapter) | 0;

  // ------------------------------------------------------------------ points & tiers
  function get(id) { if (!isCand(id)) return 0; return clamp(Math.round(+st().points[id] || 0), 0, 100); }
  function tier(id) {
    if (!isCand(id)) return 0;
    if (st().lover === id) return 4;
    const p = get(id);
    if (p >= TIER_MIN[3]) return 3;
    if (p >= TIER_MIN[2]) return 2;
    if (p >= TIER_MIN[1]) return 1;
    return 0;
  }
  function tierName(id) { return TIERS[tier(id)]; }
  function lover() { return st().lover || null; }
  function setLover(id) { st().lover = isCand(id) ? id : null; }
  function eligible() { return CANDIDATES.filter((id) => tier(id) >= 3); }

  function addJournal(text) {
    const r = st();
    const ch = chapter();
    const s = String(text || '').trim(); if (!s) return;
    const prefix = /^(Ch\d|Prologue)/.test(s) ? '' : (ch > 0 ? 'Ch' + ch + ' — ' : 'Prologue — ');
    r.journal.push(prefix + s);
    if (r.journal.length > JOURNAL_MAX) r.journal.splice(0, r.journal.length - JOURNAL_MAX);
  }

  // silent point change; records a journal line when `reason` is given and on tier-up
  function add(id, n, reason) {
    if (!isCand(id)) return 0;
    const r = st();
    const before = get(id), tBefore = tier(id);
    const after = clamp(before + Math.round(+n || 0), 0, 100);
    r.points[id] = after;
    if (reason) addJournal(reason);
    const tAfter = tier(id);
    if (tAfter > tBefore) addJournal(actorName(id) + ' reached ' + TIERS[tAfter] + '.');
    return after;
  }

  function canGift(id) { return isCand(id) && !st().gifts[id]; }
  function giftPrefs(id) {
    const p = PREFS[id] || { loves: [], likes: [], dislikes: [] };
    return { loves: p.loves.slice(), likes: p.likes.slice(), dislikes: p.dislikes.slice() };
  }
  function prefOf(id, itemId) {
    const p = PREFS[id]; if (!p) return 'neutral';
    if (p.loves.indexOf(itemId) >= 0) return 'love';
    if (p.likes.indexOf(itemId) >= 0) return 'like';
    if (p.dislikes.indexOf(itemId) >= 0) return 'dislike';
    return 'neutral';
  }
  // returns 'love'|'like'|'neutral'|'dislike', 'full' (already gave one this chapter), or 'none' (not owned / not a candidate)
  function giveGift(actorId, itemId) {
    if (!isCand(actorId)) return 'none';
    const r = st();
    if (r.gifts[actorId]) return 'full';
    const inv = G.state.inventory || (G.state.inventory = {});
    if (!(inv[itemId] > 0)) return 'none';
    if (G.party && G.party.removeItem) G.party.removeItem(itemId, 1);
    else { inv[itemId] -= 1; if (inv[itemId] <= 0) delete inv[itemId]; }
    const kind = prefOf(actorId, itemId);
    r.gifts[actorId] = chapter() || 1;
    add(actorId, GIFT_DELTA[kind]);
    return kind;
  }
  function giftItems() {
    const inv = (G.state && G.state.inventory) || {};
    return Object.keys(inv).filter((id) => inv[id] > 0 && isGift(id)).sort().map((id) => ({ id, count: inv[id] }));
  }

  // ------------------------------------------------------------------ scene registry
  const registry = {}; let regSeq = 0;
  function registerScene(def) {
    if (!def || !def.id || typeof def.run !== 'function') { console.warn('[romance] registerScene needs {id, run}', def && def.id); return null; }
    const s = Object.assign({ kind: 'bond', once: true, minTier: 0, minChapter: 0, actor: null, title: null, journal: null, bgm: null }, def);
    s._seq = regSeq++;
    registry[s.id] = s;
    return s;
  }
  function scenes() { return Object.keys(registry).map((k) => registry[k]).sort((a, b) => a._seq - b._seq); }
  function scene(id) { return registry[id] || null; }
  function seen(id) { return !!st().seen[id]; }
  const isTalkKind = (s) => s.kind === 'bond' || s.kind === 'inn';
  const isOpen = (s) => s.once === false || !seen(s.id);
  const reqsMet = (s) => tier(s.actor) >= (s.minTier | 0) && chapter() >= (s.minChapter | 0);
  const byReqs = (a, b) => (a.minTier | 0) - (b.minTier | 0) || (a.minChapter | 0) - (b.minChapter | 0) || a._seq - b._seq;
  function available(actorId) {
    return scenes().filter((s) => s.actor === actorId && isTalkKind(s) && isOpen(s) && reqsMet(s)).sort(byReqs);
  }
  // the next unseen talk that is not open yet (for the "opens in Chapter N / needs Close" hint)
  function nextLocked(actorId) {
    return scenes().filter((s) => s.actor === actorId && s.kind === 'bond' && isOpen(s) && !reqsMet(s)).sort(byReqs)[0] || null;
  }

  // bond trickle: small affection from bond skills; at most TRICKLE_CAP per partner per chapter
  function bondTrickle(partnerId) {
    if (!isCand(partnerId)) return false;
    const r = st(); const ch = chapter();
    if (!r.trickle || r.trickle.ch !== ch) r.trickle = { ch, n: {} };
    const n = r.trickle.n[partnerId] || 0;
    if (n >= TRICKLE_CAP) return false;
    r.trickle.n[partnerId] = n + 1;
    add(partnerId, 1);
    return true;
  }

  // ------------------------------------------------------------------ music helpers
  function currentBgm() {
    const a = G.audio;
    if (a) {
      let v = a.currentBgm !== undefined ? a.currentBgm : (a.getBgm ? a.getBgm : null);
      if (typeof v === 'function') { try { v = v.call(a); } catch (e) { v = null; } }
      if (v) return v;
    }
    return (G.map && G.map.def && G.map.def.bgm) || null;
  }
  function playBgm(name) { try { if (name && G.audio && G.audio.playBgm) G.audio.playBgm(name); } catch (e) { /* audio optional */ } }

  // ------------------------------------------------------------------ running scenes
  async function runScene(id) {
    const s = registry[id];
    if (!s) { console.warn('[romance] unknown scene', id); return; }
    st().seen[id] = true;
    const musical = isTalkKind(s);
    const prev = musical ? currentBgm() : null;
    if (musical) playBgm(s.bgm || 'romance');
    try { await s.run(G.script.ctx); }
    catch (e) { console.error('[romance] scene failed', id, e); }
    if (s.journal) addJournal(s.journal);
    if (musical) playBgm(prev);
  }

  // inns: 30% chance of a visit from a party member with something new to say
  async function afterRest() {
    const party = ((G.state && G.state.party) || []).filter((id) => id !== 'rowan' && isCand(id));
    const ready = [];
    for (const id of party) { const av = available(id); if (av.length) ready.push(av[0]); }
    if (!ready.length) return;
    if (Math.random() >= 0.3) return;
    const pick = ready[Math.floor(Math.random() * ready.length)];
    const c = G.script.ctx;
    await c.narrate('…you hear soft footsteps outside the room.');
    await runScene(pick.id);
  }

  // ------------------------------------------------------------------ UI helpers (shared with hub.js via G.romance._ui)
  const gx = () => G.gfx || {};
  const FONT = '"Trebuchet MS","Segoe UI",Arial,sans-serif';
  let mctx = null;
  function measure(s, size, bold) {
    const g = gx(); if (g.textWidth) return g.textWidth(s, size, bold);
    if (!mctx) mctx = G.util.canvas(4, 4).getContext('2d');
    mctx.font = (bold ? 'bold ' : '') + size + 'px ' + FONT;
    return mctx.measureText(s).width;
  }
  function wrap(s, maxW, size) {
    const g = gx(); if (g.wrap) return g.wrap(String(s), maxW, size);
    const out = [];
    String(s).split('\n').forEach((para) => {
      let line = '';
      para.split(' ').forEach((w) => {
        const test = line ? line + ' ' + w : w;
        if (line && measure(test, size) > maxW) { out.push(line); line = w; } else line = test;
      });
      out.push(line);
    });
    return out;
  }
  function txt(ctx, s, x, y, o) {
    o = o || {};
    if (gx().text) { gx().text(ctx, String(s), x, y, o); return; }
    const size = o.size || 16;
    ctx.save();
    ctx.font = (o.bold ? 'bold ' : '') + size + 'px ' + FONT;
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'top';
    if (o.outline !== false) { ctx.lineWidth = 3; ctx.strokeStyle = o.outlineColor || '#000'; ctx.strokeText(String(s), x, y); }
    ctx.fillStyle = o.color || '#fff';
    ctx.fillText(String(s), x, y);
    ctx.restore();
  }
  function panel(ctx, x, y, w, h, o) {
    o = o || {};
    if (gx().window) { gx().window(ctx, x, y, w, h, { style: o.style || 'blue', alpha: o.alpha }); return; }
    ctx.save();
    const parch = o.style === 'parchment' || o.style === 'gold';
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    if (parch) { g.addColorStop(0, '#f3e3b8'); g.addColorStop(1, '#d9bf86'); }
    else { g.addColorStop(0, '#2c4fa6'); g.addColorStop(1, '#101f4e'); }
    ctx.globalAlpha = o.alpha == null ? 0.93 : o.alpha;
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = parch ? '#6b4b1f' : '#e4ecff'; ctx.lineWidth = 2;
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    ctx.strokeStyle = parch ? '#b08a4a' : '#5b7bd0'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 4.5, y + 4.5, w - 9, h - 9);
    ctx.restore();
  }
  // heart silhouette centred on (x,y), size s (~ width)
  function heartPath(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.42);
    ctx.bezierCurveTo(x - s * 0.62, y + s * 0.06, x - s * 0.52, y - s * 0.46, x, y - s * 0.14);
    ctx.bezierCurveTo(x + s * 0.52, y - s * 0.46, x + s * 0.62, y + s * 0.06, x, y + s * 0.42);
    ctx.closePath();
  }
  function heart(ctx, x, y, s, color, outline) {
    ctx.save();
    heartPath(ctx, x, y, s);
    ctx.fillStyle = color || '#e8557a'; ctx.fill();
    if (outline !== false) { ctx.lineWidth = 1; ctx.strokeStyle = '#2a0a16'; ctx.stroke(); }
    ctx.restore();
  }
  // the Beloved's golden heart (shimmers with t)
  function goldHeart(ctx, x, y, s, t) {
    ctx.save();
    heartPath(ctx, x, y, s);
    const g = ctx.createLinearGradient(x - s / 2, y - s / 2, x + s / 2, y + s / 2);
    g.addColorStop(0, '#fff3b0'); g.addColorStop(0.5, '#f5c542'); g.addColorStop(1, '#b97a16');
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = '#5a3a06'; ctx.stroke();
    const k = (Math.sin((t || 0) / 14) + 1) / 2;
    ctx.globalAlpha = 0.35 + 0.45 * k; ctx.fillStyle = '#fffbe0';
    ctx.fillRect(x - s * 0.22, y - s * 0.2, s * 0.14, s * 0.14);
    ctx.restore();
  }
  function face(ctx, id, x, y, size, expr, alpha) {
    ctx.save(); if (alpha != null) ctx.globalAlpha = alpha;
    if (gx().drawFace) gx().drawFace(ctx, id, x, y, size, expr || 'normal');
    else {
      ctx.fillStyle = actorColor(id); ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = '#000'; ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
      txt(ctx, actorName(id).charAt(0), x + size / 2, y + size / 4, { size: Math.round(size / 2), align: 'center', bold: true });
    }
    ctx.restore();
  }
  function portrait(ctx, id, expr, x, y, alpha) {
    ctx.save(); if (alpha != null) ctx.globalAlpha = alpha;
    if (gx().drawPortrait) gx().drawPortrait(ctx, id, expr || 'normal', x, y, { alpha: alpha == null ? 1 : alpha });
    else {
      ctx.fillStyle = actorColor(id); ctx.globalAlpha *= 0.35; ctx.fillRect(x, y, 144, 192);
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      txt(ctx, actorName(id), x + 72, y + 90, { size: 16, align: 'center', bold: true });
    }
    ctx.restore();
  }
  // romance meter: 5 hearts, filled by tier and progress inside the tier
  function meter(ctx, x, y, id, w) {
    if (gx().drawHeartMeter) { gx().drawHeartMeter(ctx, x, y, get(id), tier(id), w); return; }
    const tr = tier(id), p = get(id);
    let fill;
    if (tr >= 4) fill = 5;
    else {
      const lo = TIER_MIN[tr] || 0, hi = TIER_MIN[tr + 1] || 100;
      fill = tr + clamp((p - lo) / (hi - lo), 0, 1);
    }
    const s = Math.min(16, Math.floor(w / 5));
    for (let i = 0; i < 5; i++) {
      const hx = x + i * s + s / 2, hy = y + s / 2;
      const f = clamp(fill - i, 0, 1);
      heart(ctx, hx, hy, s - 2, '#3a2a48', false);
      if (f > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(hx - s / 2, hy - s / 2, s * f, s); ctx.clip();
        heart(ctx, hx, hy, s - 2, tr >= 4 ? '#f5c542' : '#e8557a', true);
        ctx.restore();
      }
    }
  }
  function sparkleBg(ctx, t) {
    if (gx().drawMenuBg) { gx().drawMenuBg(ctx, t); return; }
    const g = ctx.createLinearGradient(0, 0, 0, 480);
    g.addColorStop(0, '#0d1538'); g.addColorStop(1, '#241a3e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 640, 480);
    const r = G.util.rng(77);
    ctx.fillStyle = '#c9d6ff';
    for (let i = 0; i < 70; i++) { const x = Math.floor(r() * 640), y = Math.floor(r() * 480); ctx.globalAlpha = 0.25 + 0.5 * ((Math.sin(t / 30 + i) + 1) / 2); ctx.fillRect(x, y, 1, 1); }
    ctx.globalAlpha = 1;
  }
  function cursor(ctx, x, y, t) {
    if (gx().cursor) { gx().cursor(ctx, x, y, t); return; }
    const bob = Math.floor(Math.sin(t / 6) * 2);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + bob, y - 5); ctx.lineTo(x + bob + 7, y); ctx.lineTo(x + bob, y + 5); ctx.closePath(); ctx.fill();
  }
  function badge(ctx, x, y, t) {
    const pulse = 1 + 0.08 * Math.sin(t / 8);
    ctx.save(); ctx.translate(x, y); ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ffd34d'; ctx.strokeStyle = '#4a2a00'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    txt(ctx, '!', 0, -8, { size: 14, bold: true, align: 'center', color: '#3a1d00', outline: false });
    ctx.restore();
  }
  const TIER_COLORS = ['#c9d6ff', '#9fe3b0', '#8fd0ff', '#ffb8d8', '#ffd34d'];

  // ------------------------------------------------------------------ gift menu (scene 'giftmenu')
  function giftMenuScene(p) {
    const items = p.items || [];
    let sel = 0, top = 0, done = false, t = 0;
    const VIS = 7;
    function finish(id) { if (done) return; done = true; G.scenes.pop(); if (p.onDone) p.onDone(id); }
    function move(d) { if (!items.length) return; sel = clamp(sel + d, 0, items.length - 1); if (sel < top) top = sel; if (sel >= top + VIS) top = sel - VIS + 1; sfx('cursor'); }
    return {
      opaque: false,
      update() {
        t++; if (done) return;
        if (G.input.repeat('up')) move(-1);
        if (G.input.repeat('down')) move(1);
        if (G.input.pressed('cancel')) { sfx('cancel'); G.input.clear(); finish(null); return; }
        if (items.length && G.input.pressed('ok')) { sfx('ok'); G.input.clear(); finish(items[sel].id); }
      },
      draw(ctx) {
        ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#05040c'; ctx.fillRect(0, 0, 640, 480); ctx.restore();
        const x = 110, y = 58, w = 420, h = 364;
        panel(ctx, x, y, w, h, {});
        const who = actorName(p.actorId);
        face(ctx, p.actorId, x + 14, y + 14, 48, 'happy');
        txt(ctx, 'Give a gift to ' + who, x + 74, y + 16, { size: 17, bold: true, color: '#ffe9a8' });
        txt(ctx, 'Pick something you think they would enjoy.', x + 74, y + 40, { size: 12, color: '#d6e2ff' });
        // list
        const lx = x + 14, ly = y + 74, lw = w - 28, rowH = 30;
        panel(ctx, lx, ly, lw, VIS * rowH + 10, { alpha: 0.6 });
        if (!items.length) txt(ctx, 'You have nothing to give.', lx + lw / 2, ly + 40, { size: 14, align: 'center', color: '#c9d6ff' });
        for (let i = top; i < Math.min(items.length, top + VIS); i++) {
          const it = items[i], ry = ly + 6 + (i - top) * rowH;
          if (i === sel) { ctx.save(); ctx.fillStyle = 'rgba(255,230,140,0.18)'; ctx.fillRect(lx + 4, ry - 2, lw - 8, rowH - 2); ctx.restore(); cursor(ctx, lx + 8, ry + 9, t); }
          if (gx().icon) gx().icon(ctx, 'gift', lx + 24, ry + 2, 16);
          txt(ctx, itemName(it.id), lx + 44, ry + 6, { size: 14, color: i === sel ? '#ffe9a8' : '#fff' });
          const pref = prefOf(p.actorId, it.id);
          const revealed = pref === 'love' ? tier(p.actorId) >= 1 : pref === 'dislike' ? tier(p.actorId) >= 1 : pref === 'like' ? tier(p.actorId) >= 2 : false;
          if (revealed) {
            const tag = pref === 'love' ? 'Loved!' : pref === 'like' ? 'Liked' : 'Disliked';
            const col = pref === 'love' ? '#ffd34d' : pref === 'like' ? '#9fe3b0' : '#ff9a9a';
            txt(ctx, tag, lx + lw - 80, ry + 6, { size: 12, color: col, align: 'right' });
          }
          txt(ctx, '×' + it.count, lx + lw - 10, ry + 6, { size: 12, color: '#c9d6ff', align: 'right' });
        }
        // description of the selected gift
        const dy = ly + VIS * rowH + 22;
        if (items.length) {
          const lines = wrap(itemDesc(items[sel].id) || 'A small gift.', w - 36, 13);
          lines.slice(0, 3).forEach((ln, i) => txt(ctx, ln, x + 18, dy + i * 16, { size: 13, color: '#d6e2ff' }));
        }
        txt(ctx, 'Z give    X back    Up/Down choose', x + w / 2, y + h - 22, { size: 11, align: 'center', color: '#8fa3d6' });
      },
    };
  }
  G.scenes.register('giftmenu', (params) => giftMenuScene(params || {}));

  // Opens the gift picker for a candidate; resolves with 'love'|'like'|'neutral'|'dislike'|'full'|null (cancelled / nothing to give).
  async function openGiftMenu(actorId) {
    if (!isCand(actorId)) return null;
    const who = actorName(actorId);
    if (!canGift(actorId)) {
      await say(actorName(actorId), GIFT_FULL[actorId], { face: actorId, expr: 'normal' });
      return 'full';
    }
    const items = giftItems();
    if (!items.length) { await G.script.run((c) => c.narrate('You have nothing to give ' + who + ' right now.')); return null; }
    const pickId = await new Promise((resolve) => { G.scenes.push('giftmenu', { actorId, items, onDone: resolve }); });
    if (!pickId) return null;
    const kind = giveGift(actorId, pickId);
    if (kind === 'full' || kind === 'none') return kind === 'none' ? null : 'full';
    const delta = GIFT_DELTA[kind];
    toast('♥ ' + who + ' ' + (delta >= 0 ? '+' + delta : '−' + Math.abs(delta)), 'heart');
    sfx(delta >= 0 ? 'heart' : 'cursor');
    const pool = (REACT[actorId] && REACT[actorId][kind]) || ['Thank you.'];
    const line = pool[Math.floor(Math.random() * pool.length)].replace(/\{item\}/g, itemName(pickId));
    await say(who, line, { face: actorId, expr: EXPR[kind] });
    return kind;
  }

  // ------------------------------------------------------------------ the 'bonds' scene
  function nextHint(id) {
    if (available(id).length) return { badge: true, text: 'New talk available!', color: '#ffd34d' };
    const nl = nextLocked(id);
    if (nl) {
      const parts = [];
      if (chapter() < (nl.minChapter | 0)) parts.push('Opens in Chapter ' + nl.minChapter);
      if (tier(id) < (nl.minTier | 0)) parts.push('Needs ' + TIERS[nl.minTier] + ' rank');
      return { badge: false, text: 'Next talk: ' + (parts.join(', ') || 'soon'), color: '#b8c8ff' };
    }
    const talks = scenes().filter((s) => s.actor === id && s.kind === 'bond');
    if (talks.length && talks.every((s) => !isOpen(s))) return { badge: false, text: 'You have shared every talk so far.', color: '#9fe3b0' };
    return { badge: false, text: 'No talks yet.', color: '#8fa3d6' };
  }
  function likesLine(id, kind) {
    const p = PREFS[id]; if (!p) return '';
    return (p[kind] || []).map(itemName).join(', ');
  }

  G.scenes.register('bonds', (params) => {
    let sel = 0, tab = 0, t = 0, jLine = 0, msg = '', msgT = 0;
    const roster = () => (G.state && G.state.roster) || {};
    const joined = (id) => !!roster()[id];
    function firstBadge() { const i = CANDIDATES.findIndex((id) => joined(id) && available(id).length); return i >= 0 ? i : 0; }
    return {
      opaque: true,
      enter(p) { sel = firstBadge(); tab = p && p.tab ? p.tab : 0; },
      update() {
        t++; if (msgT > 0) msgT--;
        if (G.script.busy) return;
        if (G.input.pressed('pageup') || G.input.pressed('pagedown') || G.input.pressed('left') || G.input.pressed('right')) { tab = 1 - tab; sfx('cursor'); }
        if (G.input.pressed('cancel')) { sfx('cancel'); G.input.clear(); G.scenes.pop(); return; }
        if (tab === 0) {
          if (G.input.repeat('up')) { sel = (sel + 4) % 5; sfx('cursor'); }
          if (G.input.repeat('down')) { sel = (sel + 1) % 5; sfx('cursor'); }
          if (G.input.pressed('ok')) {
            const id = CANDIDATES[sel];
            if (!joined(id)) { sfx('buzzer'); msg = actorName(id) + ' is not travelling with you yet.'; msgT = 150; return; }
            const av = available(id);
            if (!av.length) { sfx('buzzer'); msg = 'Nothing new with ' + actorName(id) + ' yet. Spend time together on the deck.'; msgT = 150; return; }
            sfx('ok');
            G.script.run((c) => runScene(av[0].id));
          }
        } else {
          const journal = st().journal;
          if (G.input.repeat('up')) jLine = Math.max(0, jLine - 1);
          if (G.input.repeat('down')) jLine = Math.min(Math.max(0, journal.length - 1), jLine + 1);
        }
      },
      draw(ctx) {
        sparkleBg(ctx, t);
        // header
        panel(ctx, 8, 8, 624, 40, {});
        txt(ctx, 'Bonds', 22, 16, { size: 20, bold: true, color: '#ffe9a8' });
        const tabNames = ['Bonds', 'Journal'];
        tabNames.forEach((n, i) => { txt(ctx, n, 170 + i * 120, 18, { size: 16, bold: i === tab, color: i === tab ? '#ffe9a8' : '#8fa3d6' }); });
        ctx.save(); ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(170 + tab * 120, 38); ctx.lineTo(170 + tab * 120 + measure(tabNames[tab], 16, true), 38); ctx.stroke(); ctx.restore();
        const lov = lover();
        if (lov) {
          goldHeart(ctx, 468, 28, 16, t);
          txt(ctx, 'Beloved: ' + actorName(lov), 480, 18, { size: 14, color: '#ffe9a8' });
        } else txt(ctx, 'No Beloved yet', 470, 18, { size: 14, color: '#8fa3d6' });

        if (tab === 0) drawBonds(ctx); else drawJournal(ctx);

        // footer
        panel(ctx, 8, 440, 624, 32, { alpha: 0.9 });
        const footer = msgT > 0 ? msg : 'Up/Down choose    Z talk (when marked !)    Q/C pages    X close';
        txt(ctx, footer, 320, 452, { size: 13, align: 'center', color: msgT > 0 ? '#ffe9a8' : '#c9d6ff' });
      },
    };

    function drawBonds(ctx) {
      // candidate list
      panel(ctx, 8, 56, 262, 376, {});
      CANDIDATES.forEach((id, i) => {
        const x = 8, ry = 62 + i * 72, on = joined(id);
        if (i === sel) {
          ctx.save(); ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 2; ctx.strokeRect(13, ry - 3, 252, 70);
          ctx.fillStyle = 'rgba(255,230,140,0.10)'; ctx.fillRect(14, ry - 2, 250, 68); ctx.restore();
          cursor(ctx, 15, ry + 30, t);
        }
        face(ctx, id, x + 26, ry + 8, 48, 'normal', on ? 1 : 0.35);
        txt(ctx, actorName(id), x + 84, ry + 6, { size: 15, bold: true, color: on ? '#fff' : '#7a7d96' });
        if (on) {
          txt(ctx, tierName(id), x + 84, ry + 26, { size: 12, color: TIER_COLORS[tier(id)] });
          meter(ctx, x + 84, ry + 42, id, 110);
          txt(ctx, get(id) + '/100', x + 254, ry + 8, { size: 12, align: 'right', color: '#c9d6ff' });
          if (lover() === id) goldHeart(ctx, x + 236, ry + 30, 14, t);
          if (available(id).length) badge(ctx, x + 240, ry + 46, t);
        } else {
          txt(ctx, 'Not travelling with you', x + 84, ry + 28, { size: 12, color: '#7a7d96' });
        }
      });
      // detail
      const id = CANDIDATES[sel], on = joined(id);
      panel(ctx, 278, 56, 354, 376, {});
      txt(ctx, actorName(id), 292, 66, { size: 22, bold: true, color: '#ffe9a8' });
      txt(ctx, actorTitle(id), 292, 94, { size: 13, color: '#b8c8ff' });
      portrait(ctx, id, on && tier(id) >= 3 ? 'happy' : 'normal', 290, 116, on ? 1 : 0.4);
      if (on) {
        const tx = 446;
        txt(ctx, tierName(id), tx, 122, { size: 18, bold: true, color: TIER_COLORS[tier(id)] });
        meter(ctx, tx, 152, id, 150);
        txt(ctx, get(id) + ' / 100 points', tx, 176, { size: 12, color: '#c9d6ff' });
        if (lover() === id) { goldHeart(ctx, tx + 10, 204, 18, t); txt(ctx, 'Your Beloved', tx + 26, 196, { size: 15, bold: true, color: '#ffd34d' }); }
        else if (tier(id) >= 3) txt(ctx, 'Could share a lantern with you.', tx, 198, { size: 12, color: '#ffb8d8' });
        const h = nextHint(id);
        if (h.badge) badge(ctx, tx + 8, 244, t);
        const lines = wrap(h.text, 160, 12);
        lines.slice(0, 3).forEach((ln, i) => txt(ctx, ln, h.badge ? tx + 22 : tx, 238 + i * 15, { size: 12, color: h.color }));
      } else {
        txt(ctx, 'You have not met them yet.', 446, 130, { size: 13, color: '#8fa3d6' });
        txt(ctx, 'Keep your eyes open on the road.', 446, 150, { size: 12, color: '#7a7d96' });
      }
      // likes / dislikes, revealed progressively
      const ly = 318;
      txt(ctx, 'Gifts', 292, ly, { size: 14, bold: true, color: '#ffe9a8' });
      const rows = [
        ['Loves', 'loves', 1, '#ffd34d'],
        ['Likes', 'likes', 2, '#9fe3b0'],
        ['Dislikes', 'dislikes', 1, '#ff9a9a'],
      ];
      rows.forEach((r, i) => {
        const y = ly + 22 + i * 36;
        txt(ctx, r[0], 292, y, { size: 13, bold: true, color: r[3] });
        const known = on && tier(id) >= r[2];
        const v = known ? (likesLine(id, r[1]) || 'Nothing in particular') : '???';
        wrap(v, 262, 13).slice(0, 2).forEach((ln, k) => txt(ctx, ln, 364, y + k * 15, { size: 13, color: known ? '#fff' : '#7a7d96' }));
      });
    }

    function drawJournal(ctx) {
      panel(ctx, 8, 56, 624, 376, {});
      txt(ctx, 'Journal', 24, 66, { size: 18, bold: true, color: '#ffe9a8' });
      const journal = st().journal;
      if (!journal.length) {
        txt(ctx, 'Nothing written yet. Spend time with your companions and it will be remembered here.', 320, 200, { size: 14, align: 'center', color: '#c9d6ff' });
        return;
      }
      const lines = [];
      journal.forEach((entry) => { wrap(entry, 580, 13).forEach((ln) => lines.push(ln)); lines.push(''); });
      const per = 19;
      const start = clamp(jLine, 0, Math.max(0, journal.length - 1));
      // map journal entry index to line index
      let lineStart = 0;
      for (let i = 0; i < start; i++) lineStart += wrap(journal[i], 580, 13).length + 1;
      lines.slice(lineStart, lineStart + per).forEach((ln, i) => txt(ctx, ln, 24, 94 + i * 16, { size: 13, color: '#e8eeff' }));
      txt(ctx, (start + 1) + ' / ' + journal.length, 616, 66, { size: 12, align: 'right', color: '#8fa3d6' });
    }
  });

  // ------------------------------------------------------------------ script commands
  const S = G.script;
  S.define('affection', (id, delta, reason) => {
    if (!isCand(id)) { console.warn('[romance] affection on non-candidate', id); return Promise.resolve(); }
    const before = get(id), tBefore = tier(id);
    add(id, +delta || 0, reason || null);
    const d = get(id) - before;
    if (d !== 0) {
      toast((d > 0 ? '♥ ' : '') + actorName(id) + ' ' + (d > 0 ? '+' + d : '−' + Math.abs(d)), 'heart');
      sfx(d > 0 ? 'heart' : 'buzzer');
    }
    const tAfter = tier(id);
    if (tAfter > tBefore) toast(actorName(id) + ' is now ' + TIERS[tAfter] + '.', 'good');
    return Promise.resolve();
  });
  S.define('runScene', (id) => runScene(id));
  S.define('afterRest', () => afterRest());

  // ------------------------------------------------------------------ public API
  G.romance = {
    CANDIDATES, TIERS, TIER_MIN, PREFS: PREFS,
    get, add, tier, tierName, lover, setLover, eligible,
    canGift, giftPrefs, giveGift, openGiftMenu,
    registerScene, scenes, scene, available, seen, bondTrickle,
    addJournal, journal: () => st().journal.slice(),
    runScene, afterRest,
    // shared UI helpers for hub.js (fallbacks used when gfx_ui is absent)
    _ui: { txt, panel, wrap, measure, heart, goldHeart, face, portrait, meter, sparkleBg, cursor, badge, sfx, toast, say, actorName, actorTitle, actorColor, itemName, TIER_COLORS, clamp },
  };
  G.provide('romance');
})();
