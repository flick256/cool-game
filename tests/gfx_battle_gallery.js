/* Scratch gallery for js/gfx_battle.js. Draws enemies, backgrounds, fx contact sheet and battlers
 * on the (resized) canvas#game through a custom scene. Select a section with ?sec=enemies|bg|fx|party|all */
(function () {
  'use strict';
  const G = window.G;
  const ENEMIES = ['moss_slime', 'forest_bat', 'thorn_boar', 'hollow_wisp', 'hollow_stag', 'cog_rat', 'steam_sprite', 'rust_bot',
    'order_guard', 'brass_sentinel', 'arena_hound', 'sand_bandit', 'gladiator_recruit', 'drake_whelp', 'catacomb_skeleton',
    'gladius_champion', 'crypt_ghoul', 'pale_moth', 'briar_treant', 'hollow_husk', 'briar_matron', 'hollow_choir', 'ash_wraith',
    'hollow_hound', 'order_inquisitor', 'cinder_golem', 'inquisitor_hale', 'spire_sentinel', 'hollow_knight', 'void_moth',
    'cold_drone', 'hollow_elowen', 'warden_vael', 'vael_cold_engine'];
  const BGS = ['forest', 'village', 'cave', 'city', 'steam', 'arena', 'abbey', 'crypt', 'witchwood', 'road', 'spire', 'chamber', 'ship', 'void'];
  const FX = ['slash', 'pierce', 'blunt', 'arrow', 'fire', 'ice', 'lightning', 'wind', 'light', 'dark', 'heal', 'buff', 'debuff',
    'break', 'hit', 'steal', 'bond', 'poison', 'revive', 'shield'];
  const sec = new URLSearchParams(location.search).get('sec') || 'all';
  const W = 1200;
  const sections = [];
  if (sec === 'all' || sec === 'enemies') sections.push('enemies');
  if (sec === 'all' || sec === 'bg') sections.push('bg');
  if (sec === 'all' || sec === 'fx') sections.push('fx');
  if (sec === 'all' || sec === 'party') sections.push('party');
  const CH = { enemies: 6 * 226, bg: 2 * 150 + 10, fx: 3 * 150 + 10, party: 220 };
  const H = sections.reduce((a, s) => a + CH[s] + 30, 0) + 10;

  // placeholder character sheet so battler poses can be inspected without gfx_world.js
  if (!G.gfx.charSheet) {
    G.gfx.charSheet = function (id) {
      const c = G.util.canvas(96, 128), x = c.getContext('2d');
      const hue = (G.util.hash(id) % 360);
      for (let r = 0; r < 4; r++) for (let f = 0; f < 3; f++) {
        const ox = f * 32, oy = r * 32;
        x.fillStyle = 'hsl(' + hue + ',55%,55%)'; x.fillRect(ox + 10, oy + 4, 12, 12);
        x.fillStyle = '#ffd9b0'; x.fillRect(ox + 11, oy + 6, 10, 8);
        x.fillStyle = 'hsl(' + ((hue + 180) % 360) + ',40%,35%)'; x.fillRect(ox + 8, oy + 16, 16, 10);
        x.fillStyle = '#222'; x.fillRect(ox + 10 + (f === 0 ? -1 : f === 2 ? 1 : 0), oy + 26, 4, 5); x.fillRect(ox + 18, oy + 26, 4, 5);
        x.fillStyle = '#fff'; x.fillRect(ox + 12, oy + 8, 2, 2);
        x.fillStyle = '#000'; x.fillRect(ox + 13, oy + 8, 1, 1);
      }
      return c;
    };
  }

  function panel(c, x, y, w, h) {
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#1d2a5c'); g.addColorStop(1, '#0b1028');
    c.fillStyle = g; c.fillRect(x, y, w, h);
    c.strokeStyle = '#9cc8ff'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
  function label(c, s, x, y) {
    c.font = 'bold 12px Arial'; c.textAlign = 'center'; c.fillStyle = '#000'; c.fillText(s, x + 1, y + 1);
    c.fillStyle = '#fff'; c.fillText(s, x, y); c.textAlign = 'left';
  }

  function drawSection(c, name, y0) {
    if (name === 'enemies') {
      ENEMIES.forEach((k, i) => {
        const x = (i % 6) * 200, y = y0 + Math.floor(i / 6) * 226;
        panel(c, x + 2, y + 2, 196, 222);
        G.gfx.drawEnemy(c, k, x + 100, y + 200, 20 + i * 3, {});
        label(c, k, x + 100, y + 212);
      });
    } else if (name === 'bg') {
      if (!G.gfx.battleBg) return;
      BGS.forEach((k, i) => {
        const x = (i % 7) * 170, y = y0 + Math.floor(i / 7) * 150;
        const bg = G.gfx.battleBg(k);
        c.drawImage(bg, x, y, 160, 120);
        c.strokeStyle = '#fff'; c.strokeRect(x + 0.5, y + 0.5, 159, 119);
        label(c, k, x + 80, y + 134);
      });
    } else if (name === 'fx') {
      if (!G.gfx.drawFx) return;
      FX.forEach((k, i) => {
        const x = (i % 7) * 170, y = y0 + Math.floor(i / 7) * 150;
        panel(c, x + 2, y + 2, 166, 124);
        c.save(); c.beginPath(); c.rect(x + 2, y + 2, 166, 124); c.clip();
        G.gfx.drawFx(c, k, x + 85, y + 66, 0.5, {});
        c.restore();
        label(c, k + ' t=0.5', x + 85, y + 134);
      });
    } else if (name === 'party') {
      if (!G.gfx.drawBattler) return;
      const poses = ['idle', 'attack', 'cast', 'hurt', 'defend', 'dead', 'win', 'weak'];
      ['rowan', 'claret'].forEach((a, r) => {
        poses.forEach((p, i) => {
          const x = i * 150 + 20, y = y0 + r * 100;
          panel(c, x, y, 140, 90);
          G.gfx.drawBattler(c, a, p, x + 70, y + 80, 20, {});
          label(c, a + ' ' + p, x + 70, y + 84);
        });
      });
    }
  }

  G.scenes.register('gfxtest', () => ({
    opaque: true,
    draw(c) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.imageSmoothingEnabled = false;
      c.fillStyle = '#0a0d18'; c.fillRect(0, 0, G.canvas.width, G.canvas.height);
      let y = 10;
      for (const s of sections) { drawSection(c, s, y); y += CH[s] + 30; }
    },
  }));

  const t0 = performance.now();
  G.canvas.width = W; G.canvas.height = H;
  G.canvas.style.width = W + 'px'; G.canvas.style.height = H + 'px';
  G.scenes.replace('gfxtest');
  // warm the caches (and report timing) before the first screenshot
  const tb = performance.now();
  G.scenes.top().draw(G.ctx);
  const t1 = performance.now();
  console.log('[gallery] first draw ms=' + Math.round(t1 - tb) + ' total ms=' + Math.round(t1 - t0));
})();
