/* =====================================================================
 * LANTERNBOUND — touch.js  (OVERSEER-OWNED) on-screen controls for phones/tablets.
 * Shown automatically on touch devices (pointer: coarse) or with ?touch=1; hide with ?touch=0.
 * Feeds the same logical buttons as the keyboard through G.input.press/release.
 * ===================================================================== */
(function () {
  'use strict';
  const G = window.G; if (!G || !G.input) return;
  const q = new URLSearchParams(location.search);
  const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  const show = q.has('touch') ? q.get('touch') !== '0' : coarse;
  if (!show) return;

  const css = document.createElement('style');
  css.textContent = `
  #touch{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;max-width:640px;padding:6px 14px calc(8px + env(safe-area-inset-bottom,0px));box-sizing:border-box;height:var(--ctl,170px);touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
  #touch *{touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
  #touch .dpad{position:relative;width:132px;height:132px;flex:none}
  #touch .b{position:absolute;display:flex;align-items:center;justify-content:center;color:#cfd8ff;font:700 15px/1 "Trebuchet MS",Arial,sans-serif;background:rgba(40,52,110,.78);border:2px solid rgba(190,205,255,.55);box-shadow:0 2px 0 rgba(0,0,0,.5);box-sizing:border-box}
  #touch .b.on{background:rgba(120,150,255,.9);color:#fff}
  #touch .dpad .b{width:44px;height:44px;border-radius:10px}
  #touch .dpad .u{left:44px;top:0}#touch .dpad .d{left:44px;top:88px}#touch .dpad .l{left:0;top:44px}#touch .dpad .r{left:88px;top:44px}
  #touch .tri{width:0;height:0;border:9px solid transparent}
  #touch .u .tri{border-bottom:14px solid #cfd8ff;border-top:0}#touch .d .tri{border-top:14px solid #cfd8ff;border-bottom:0}
  #touch .l .tri{border-right:14px solid #cfd8ff;border-left:0}#touch .r .tri{border-left:14px solid #cfd8ff;border-right:0}
  #touch .act{position:relative;width:200px;height:150px;flex:none}
  #touch .act .b{border-radius:50%;width:56px;height:56px;font-size:18px}
  #touch .act .a{right:0;top:56px;background:rgba(60,110,70,.82)}#touch .act .bb{right:60px;top:92px;background:rgba(120,60,60,.82)}
  #touch .act .bo{right:66px;top:24px;width:50px;height:50px;font-size:11px;background:rgba(120,95,30,.85)}
  #touch .act .da{right:132px;top:60px;width:44px;height:44px;font-size:10px;border-radius:12px}
  #touch .pg{position:absolute;left:0;top:0;display:flex;gap:4px}
  #touch .pg .b{position:static;width:38px;height:30px;border-radius:8px;font-size:11px}
  `;
  document.head.appendChild(css);

  const wrap = document.createElement('div'); wrap.id = 'touch';
  wrap.innerHTML = '<div class="dpad"><div class="b u" data-k="up"><i class="tri"></i></div><div class="b l" data-k="left"><i class="tri"></i></div><div class="b r" data-k="right"><i class="tri"></i></div><div class="b d" data-k="down"><i class="tri"></i></div></div>' +
    '<div class="act"><div class="pg"><div class="b" data-k="pageup">PG-</div><div class="b" data-k="pagedown">PG+</div></div>' +
    '<div class="b bo" data-k="boost">BOOST</div><div class="b da" data-k="dash">DASH</div><div class="b bb" data-k="cancel+menu">B</div><div class="b a" data-k="ok">A</div></div>';
  (document.getElementById('wrap') || document.body).insertAdjacentElement('afterend', wrap);
  document.documentElement.style.setProperty('--ctl', '170px');
  const hp = document.getElementById('help'); if (hp) hp.remove();

  const active = new Map();   // pointerId -> {el, keys}
  const press = (el) => { const keys = el.dataset.k.split('+'); keys.forEach((k) => G.input.press(k)); el.classList.add('on'); if (G.audio && G.audio.unlock) G.audio.unlock(); return keys; };
  const release = (a) => { a.keys.forEach((k) => G.input.release(k)); a.el.classList.remove('on'); };
  const elAt = (x, y) => { const e = document.elementFromPoint(x, y); return e && e.closest && e.closest('#touch .b'); };
  wrap.addEventListener('pointerdown', (e) => { e.preventDefault(); const el = e.target.closest('.b'); if (!el) return; try { wrap.setPointerCapture(e.pointerId); } catch (x) {} active.set(e.pointerId, { el, keys: press(el) }); });
  wrap.addEventListener('pointermove', (e) => {         // sliding the thumb across the D-pad changes direction
    const a = active.get(e.pointerId); if (!a) return; const el = elAt(e.clientX, e.clientY);
    if (el && el !== a.el && el.parentElement === a.el.parentElement && el.dataset.k !== undefined && a.el.closest('.dpad')) { release(a); a.el = el; a.keys = press(el); }
  });
  const up = (e) => { const a = active.get(e.pointerId); if (!a) return; release(a); active.delete(e.pointerId); };
  wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up); wrap.addEventListener('lostpointercapture', up);
  document.addEventListener('contextmenu', (e) => { if (e.target.closest && e.target.closest('#touch')) e.preventDefault(); });
  // tapping the game screen itself acts as OK so the title / dialogue can be advanced by touch
  const cv = document.getElementById('game');
  if (cv) cv.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') { G.input.press('ok'); setTimeout(() => G.input.release('ok'), 60); } });
  G.provide && G.provide('touch');
})();
