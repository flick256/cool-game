/* =====================================================================
 * LANTERNBOUND — audio.js  (owner: audio)
 * Procedural WebAudio synth + look-ahead step sequencer. NO audio files.
 * Public API: CONTRACT §7 (playBgm, stopBgm, jingle, sfx, setVolume, getVolume,
 * setMuted, unlock, update, voice). Dev helper: G.audio._renderOffline(name, sec).
 * ===================================================================== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});

  // ---------------------------------------------------------------- prefs (persisted, try/catch)
  const LS_KEY = 'lanternbound.audio';
  const prefs = { bgm: 0.55, sfx: 0.8, muted: false };
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (s && typeof s === 'object') {
      if (typeof s.bgm === 'number') prefs.bgm = Math.min(1, Math.max(0, s.bgm));
      if (typeof s.sfx === 'number') prefs.sfx = Math.min(1, Math.max(0, s.sfx));
      if (typeof s.muted === 'boolean') prefs.muted = s.muted;
    }
  } catch (e) { /* storage blocked: defaults */ }
  function savePrefs() { try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ } }
  const clamp01 = (v) => Math.min(1, Math.max(0, v));

  // ---------------------------------------------------------------- theory
  const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
    mixo: [0, 2, 4, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11], phrygian: [0, 1, 3, 5, 7, 8, 10],
    harmonic: [0, 2, 3, 5, 7, 8, 11], pent: [0, 2, 4, 7, 9], pentm: [0, 3, 5, 7, 10],
  };
  // scale degree d (may be negative / >= scale length) -> MIDI note; T.key = MIDI of degree 0
  function midiOf(T, d) {
    const sc = SCALES[T.scale || 'major'], n = sc.length;
    const oct = Math.floor(d / n), i = d - oct * n;
    return (T.key || 62) + sc[i] + 12 * oct;
  }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // The recurring 'lantern' leitmotif: rising perfect fifth then a step (8 steps). Write 'L' in melodies.
  const LANTERN = '0___4_5_';

  // melody tokens: digit/a-f = scale degree, '.' rest, '_' hold, 'L' lantern motif, spaces/'|' ignored
  function parseMel(parts, L) {
    const str = (Array.isArray(parts) ? parts.join('') : String(parts || '')).replace(/L/g, LANTERN);
    const toks = [];
    for (const ch of str) {
      if (ch === '.') toks.push(-1);
      else if (ch === '_') toks.push(-2);
      else if (ch >= '0' && ch <= '9') toks.push(ch.charCodeAt(0) - 48);
      else if (ch >= 'a' && ch <= 'f') toks.push(ch.charCodeAt(0) - 97 + 10);
    }
    const d = new Int16Array(L).fill(-1), n = new Uint8Array(L);
    for (let i = 0; i < Math.min(L, toks.length); i++) {
      if (toks[i] < 0) continue;
      d[i] = toks[i];
      let j = i + 1;
      while (j < L && j < toks.length && toks[j] === -2) j++;
      n[i] = j - i;
    }
    return { d, n, len: toks.length };
  }

  // ---------------------------------------------------------------- synth voices
  // PeriodicWaves (pulse duty cycles, saw, soft) cached per AudioContext session
  function waveOf(S, key) {
    if (S.waves[key]) return S.waves[key];
    const N = 24, re = new Float32Array(N), im = new Float32Array(N);
    if (key[0] === 'p') {                                   // pulse: duty from name
      const duty = { pulse12: 0.125, pulse25: 0.25, pulse50: 0.5 }[key] || 0.5;
      for (let n = 1; n < N; n++) re[n] = (4 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    } else if (key === 'soft') {                            // warm, flute-ish
      for (let n = 1; n <= 8; n++) im[n] = 1 / Math.pow(n, 1.6);
    } else {                                                // saw
      for (let n = 1; n < N; n++) im[n] = (2 / (n * Math.PI)) * (n % 2 ? 1 : -1);
    }
    return (S.waves[key] = S.ac.createPeriodicWave(re, im));
  }

  // generic subtractive note with ADSR + lowpass sweep. o: {type|wave, f, f1, det, g,a,d,s,r, fc,fe,q, vib, rv}
  function tone(S, out, t, dur, o) {
    const ac = S.ac;
    const osc = ac.createOscillator();
    if (o.wave) osc.setPeriodicWave(waveOf(S, o.wave)); else osc.type = o.type || 'triangle';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    if (o.det) osc.detune.setValueAtTime(o.det, t);
    const flt = ac.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = o.q || 0.7;
    flt.frequency.setValueAtTime(o.fc || 9000, t);
    if (o.fe) flt.frequency.exponentialRampToValueAtTime(o.fe, t + dur);
    const env = ac.createGain();
    const a = o.a == null ? 0.005 : o.a, d = o.d == null ? 0.15 : o.d, s = o.s == null ? 0.6 : o.s;
    const r = o.r == null ? 0.05 : o.r, g = o.g == null ? 0.3 : o.g;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(g, t + a);
    env.gain.setTargetAtTime(g * s, t + a, Math.max(0.005, d / 3));
    env.gain.setTargetAtTime(0.0001, t + dur, Math.max(0.005, r / 5));
    osc.connect(flt); flt.connect(env); env.connect(out);
    if (o.rv) { const sg = ac.createGain(); sg.gain.value = o.rv; env.connect(sg); sg.connect(S.rev); }
    const end = t + dur + r + 0.05;
    if (o.vib) {
      const lfo = ac.createOscillator(), lg = ac.createGain();
      lfo.frequency.value = 5.2; lg.gain.value = o.f * 0.008;
      lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(end);
    }
    osc.start(t); osc.stop(end);
    return end;
  }

  // FM bell (carrier sine + ratio modulator with decaying index). Used for lantern/romance motifs and chimes.
  function bell(S, out, t, dur, f, o) {
    o = o || {};
    const ac = S.ac, g = o.g == null ? 0.3 : o.g, idx = o.idx || 2.5, ratio = o.ratio || 3.5;
    const c = ac.createOscillator(), m = ac.createOscillator(), mg = ac.createGain(), env = ac.createGain();
    c.type = 'sine'; m.type = 'sine';
    c.frequency.setValueAtTime(f, t);
    m.frequency.setValueAtTime(f * ratio, t);
    mg.gain.setValueAtTime(f * idx, t);
    mg.gain.setTargetAtTime(f * idx * 0.05, t, Math.max(0.02, dur * 0.25));
    m.connect(mg); mg.connect(c.frequency);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(g, t + 0.004);
    env.gain.setTargetAtTime(0.0001, t + 0.004, Math.max(0.03, dur * 0.3));
    c.connect(env); env.connect(out);
    if (o.rv == null ? true : o.rv) { const sg = ac.createGain(); sg.gain.value = o.rv == null ? 0.35 : o.rv; env.connect(sg); sg.connect(S.rev); }
    const end = t + dur * 2.2 + 0.1;
    c.start(t); m.start(t); c.stop(end); m.stop(end);
    return end;
  }

  // soft detuned saw pad with slow attack
  function padNote(S, out, t, dur, f, g, rv) {
    const ac = S.ac;
    const flt = ac.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 1150; flt.Q.value = 0.5;
    const env = ac.createGain(), r = 0.9, a = Math.min(0.9, dur * 0.35);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(g, t + a);
    env.gain.setTargetAtTime(g * 0.85, t + a, 0.6);
    env.gain.setTargetAtTime(0.0001, t + dur, r / 5);
    flt.connect(env); env.connect(out);
    if (rv) { const sg = ac.createGain(); sg.gain.value = rv; env.connect(sg); sg.connect(S.rev); }
    const end = t + dur + r + 0.1;
    for (const det of [-9, 0, 9]) {
      const o = ac.createOscillator();
      o.setPeriodicWave(waveOf(S, 'saw')); o.frequency.value = f; o.detune.value = det;
      o.connect(flt); o.start(t); o.stop(end);
    }
    return end;
  }

  // dispatch for melodic / arp / bass layers
  function voiceNote(S, out, v, t, dur, f, g, rv) {
    switch (v) {
      case 'bell': return bell(S, out, t, dur, f, { g: g, rv: rv });
      case 'pluck': return tone(S, out, t, dur, { type: 'triangle', f: f, g: g, a: 0.002, d: 0.25, s: 0.15, r: 0.08, fc: 4200, fe: 650, rv: rv });
      case 'pulse12': case 'pulse25': case 'pulse50':
        return tone(S, out, t, dur, { wave: v, f: f, g: g, a: 0.01, d: 0.2, s: 0.7, r: 0.06, fc: 3800, rv: rv });
      case 'soft': return tone(S, out, t, dur, { wave: 'soft', f: f, g: g, a: 0.07, d: 0.3, s: 0.85, r: 0.2, fc: 2800, vib: true, rv: rv });
      case 'brass': return tone(S, out, t, dur, { wave: 'saw', f: f, g: g, a: 0.035, d: 0.5, s: 0.65, r: 0.12, fc: 500, fe: 2400, q: 1.5, rv: rv });
      case 'tri': return tone(S, out, t, dur, { type: 'triangle', f: f, g: g, a: 0.008, d: 0.2, s: 0.75, r: 0.05, fc: 1600, rv: rv });
      case 'saw': return tone(S, out, t, dur, { wave: 'saw', f: f, g: g, a: 0.01, d: 0.25, s: 0.5, r: 0.06, fc: 1400, rv: rv });
      case 'pad': return padNote(S, out, t, dur, f, g, rv);
      default: return tone(S, out, t, dur, { type: 'triangle', f: f, g: g, rv: rv });
    }
  }

  // ---------------------------------------------------------------- drums & noise
  function noiseBurst(S, out, t, dur, type, freq, q, g, rv, f1) {
    const ac = S.ac, src = ac.createBufferSource(), f = ac.createBiquadFilter(), e = ac.createGain();
    src.buffer = S.noise;
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 0.7;
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    e.gain.setValueAtTime(g == null ? 0.3 : g, t);
    e.gain.setTargetAtTime(0.0001, t, Math.max(0.005, dur / 5));
    src.connect(f); f.connect(e); e.connect(out);
    if (rv) { const sg = ac.createGain(); sg.gain.value = rv; e.connect(sg); sg.connect(S.rev); }
    src.start(t, Math.random() * 1.5); src.stop(t + dur * 2 + 0.05);
    return t + dur * 2 + 0.05;
  }
  function kick(S, out, t, g) {
    const ac = S.ac, o = ac.createOscillator(), e = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    e.gain.setValueAtTime(g, t); e.gain.setTargetAtTime(0.0001, t + 0.02, 0.07);
    o.connect(e); e.connect(out); o.start(t); o.stop(t + 0.4);
    return t + 0.4;
  }
  function snare(S, out, t, g, rv) {
    noiseBurst(S, out, t, 0.16, 'bandpass', 1900, 0.9, g, rv);
    tone(S, out, t, 0.12, { type: 'triangle', f: 190, f1: 165, g: g * 0.6, a: 0.001, d: 0.08, s: 0.2, r: 0.02, fc: 2000 });
  }
  function hat(S, out, t, g, open) {
    noiseBurst(S, out, t, open ? 0.16 : 0.03, 'highpass', 7600, 0.7, g * (open ? 0.7 : 1));
  }

  // ---------------------------------------------------------------- sessions (real or offline)
  function makeSession(ac, dest) {
    const S = { ac: ac, waves: {}, noise: null };
    S.master = ac.createGain(); S.master.gain.value = prefs.muted ? 0 : 1;
    if (ac.createDynamicsCompressor) {
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -10; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
      S.master.connect(comp); comp.connect(dest);
    } else S.master.connect(dest);
    S.bgm = ac.createGain(); S.bgm.gain.value = prefs.bgm; S.bgm.connect(S.master);
    S.sfx = ac.createGain(); S.sfx.gain.value = prefs.sfx; S.sfx.connect(S.master);
    // simple feedback-delay reverb bus: S.rev -> 3 lowpassed delay lines -> wet -> master
    S.rev = ac.createGain();
    const wet = ac.createGain(); wet.gain.value = 0.3; wet.connect(S.master);
    [[0.173, 0.44], [0.271, 0.40], [0.379, 0.36]].forEach(function (p) {
      const dl = ac.createDelay(1.0), lp = ac.createBiquadFilter(), fb = ac.createGain();
      dl.delayTime.value = p[0]; lp.type = 'lowpass'; lp.frequency.value = 2800; fb.gain.value = p[1];
      S.rev.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wet);
    });
    const nb = ac.createBuffer(1, Math.ceil(ac.sampleRate * 2), ac.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    S.noise = nb;
    return S;
  }

  // ---------------------------------------------------------------- compiled track data
  const TRACKS = {};   // ---- track data. Melody strings: digits = scale degrees ('a'-'f' = 10-15), '.' rest, '_' hold, 'L' = lantern leitmotif.
  // Each array element is a bar-ish string; total steps must equal bars*16 (compile warns otherwise).
  Object.assign(TRACKS, {
    title: { bpm: 84, key: 62, scale: 'major', prog: [0, 4, 5, 3], chordLen: 2, bars: 8, layers: [
      { t: 'mel', v: 'bell', mel: ['L2___1___', '0___2___4___....', 'L6___5___', '4___3___2___....', 'L5___4___', '3___2___1___....', 'L0___4___', '5___5___6___7___'], g: 0.42, rv: 0.45 },
      { t: 'pad', g: 0.12, rv: 0.5 },
      { t: 'bass', v: 'tri', st: 'walk', g: 0.5, rv: 0.1 },
      { t: 'drums', kick: 'x.......x.......', g: 0.45 } ] },
    wickholm: { bpm: 96, key: 67, scale: 'dorian', prog: [0, 3, 0, 4], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'pluck', mel: ['0_2_4___3___....', '2_1_0___....3_5_', '4___5___3_2_1___', 'L....2___'], g: 0.4, rv: 0.3 },
      { t: 'arp', v: 'pluck', pat: '0121', r: 2, g: 0.16, rv: 0.2 },
      { t: 'bass', v: 'tri', st: 'root8', g: 0.4 },
      { t: 'drums', hat: 'x.x.x.x.x.x.x.x.', g: 0.25 } ] },
    forest: { bpm: 70, key: 64, scale: 'pent', prog: [0, 2, 3, 0], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'soft', mel: ['0___2___4___....', '3_4_2___0___....', 'L6___5___', '4___3_2_1___....'], o: 1, g: 0.32, rv: 0.45 },
      { t: 'arp', v: 'pluck', pat: '0212', r: 2, g: 0.14, rv: 0.4 },
      { t: 'pad', g: 0.1, rv: 0.5 },
      { t: 'bass', v: 'tri', st: 'drone', g: 0.35 } ] },
    brasshaven: { bpm: 112, key: 62, scale: 'major', prog: [0, 4, 0, 3], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'brass', mel: ['0_0_0___2___....', '4___4___5_4_3___', '2___2___1___0___', 'L....2___'], g: 0.3, rv: 0.2 },
      { t: 'bass', v: 'tri', st: 'root8', g: 0.5 },
      { t: 'drums', kick: 'x.......x.......', snare: '....x.......x...', hat: 'g.g.g.g.g.g.g.g.', g: 0.5 } ] },
    workshop: { bpm: 100, key: 62, scale: 'major', prog: [0, 5, 3, 4], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'pluck', mel: ['5_3_0___2___....', '4_2_4___0___....', 'L....2___', '1___3___5___....'], g: 0.35, rv: 0.3 },
      { t: 'bass', v: 'tri', st: 'walk', g: 0.4 },
      { t: 'pad', g: 0.09, rv: 0.4 },
      { t: 'drums', kick: 'x.......x.......', hat: '..x...x...x...x.', g: 0.3 } ] },
    undercroft: { bpm: 124, key: 60, scale: 'minor', prog: [0, 5, 4, 6], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'pulse25', mel: ['0_1_2___3_2_1___', '0___5___4___6___', 'L....3___', '2_3_4___2___....'], g: 0.2, rv: 0.2 },
      { t: 'arp', v: 'pulse12', pat: '0101', r: 1, g: 0.07, rv: 0.1 },
      { t: 'bass', v: 'tri', st: 'pulse', g: 0.4 },
      { t: 'drums', kick: 'x...x...x..x....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', g: 0.45 } ] },
    gladius: { bpm: 118, key: 62, scale: 'major', prog: [0, 4, 5, 3], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'brass', mel: ['0___0___4___5___', '6___5___4___3___', 'L....5___', '4___2_0_....0___'], g: 0.32, rv: 0.25 },
      { t: 'arp', v: 'saw', pat: '0121', r: 2, o: 0, g: 0.1, rv: 0.15 },
      { t: 'bass', v: 'tri', st: 'walk', g: 0.45 },
      { t: 'drums', kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', g: 0.5 } ] },
    arena: { bpm: 128, key: 57, scale: 'minor', prog: [0, 6, 5, 4], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'pulse25', mel: ['0_0_3___4___....', '5_4_3_2_1___....', 'L5___4___', '3___2___0___0___'], g: 0.22, rv: 0.2 },
      { t: 'arp', v: 'saw', pat: '0121', r: 2, g: 0.1, rv: 0.1 },
      { t: 'bass', v: 'tri', st: 'pulse', g: 0.45 },
      { t: 'drums', kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', g: 0.5 } ] },
    tavern: { bpm: 132, key: 62, scale: 'major', prog: [0, 3, 4, 0], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'pulse50', mel: ['5_..3_..4_..2_..', '0_..0_..2_..4_..', 'L....3_..', '5_..4_..3_..1_..'], g: 0.2, rv: 0.15 },
      { t: 'arp', v: 'pluck', pat: '0202', r: 2, g: 0.14, rv: 0.1 },
      { t: 'bass', v: 'tri', st: 'walk', g: 0.4 },
      { t: 'drums', kick: 'x...x.x.x...x.x.', snare: '..x...x...x...x.', hat: 'x.x.x.x.x.x.x.x.', g: 0.4 } ] },
    abbey: { bpm: 72, key: 62, scale: 'major', prog: [0, 5, 3, 4], chordLen: 2, bars: 8, layers: [
      { t: 'mel', v: 'soft', mel: ['4___5___4___....', '2___0___2___....', '3___4___5___....', '4___3___2___0___', '0___2___4___5___', 'L2___0___', '1___2___3___....', '2___1___0___....'], g: 0.3, rv: 0.6 },
      { t: 'pad', g: 0.22, rv: 0.6 },
      { t: 'bass', v: 'tri', st: 'drone', g: 0.3, rv: 0.2 } ] },
  });
  Object.assign(TRACKS, {
    crypt: { bpm: 84, key: 60, scale: 'phrygian', prog: [0, 1, 0, 6], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'soft', mel: ['0___1___0___....', '....0_1_2___....', '5___4___1___....', '0___1___0___....'], o: -1, g: 0.3, rv: 0.5 },
      { t: 'arp', v: 'tri', pat: '0.2.', r: 4, o: 1, g: 0.14, rv: 0.5 },
      { t: 'pad', g: 0.14, rv: 0.6 },
      { t: 'bass', v: 'tri', st: 'drone', g: 0.4 },
      { t: 'drums', kick: 'x.......x.......', hat: 'o.......o.......', g: 0.35 } ] },
    whisperwood: { bpm: 96, key: 67, scale: 'dorian', prog: [0, 3, 5, 6], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'bell', mel: ['0_2_4___5___....', '6___5_4_3___....', 'L....2___', '1___0___3___....'], g: 0.3, rv: 0.5 },
      { t: 'arp', v: 'pluck', pat: '0120', r: 1, o: 1, g: 0.12, rv: 0.45 },
      { t: 'pad', g: 0.1, rv: 0.55 },
      { t: 'bass', v: 'tri', st: 'pulse', g: 0.3 },
      { t: 'drums', hat: 'g.g.g.g.g.g.g.g.', g: 0.2 } ] },
    festival: { bpm: 116, key: 62, scale: 'major', prog: [0, 3, 4, 0], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'bell', mel: ['L5___4___', '3___4___5___6___', 'L4___2___', '5_4_3_2_1___0___'], g: 0.36, rv: 0.4 },
      { t: 'arp', v: 'pluck', pat: '0212', r: 2, g: 0.15, rv: 0.3 },
      { t: 'bass', v: 'tri', st: 'lift', g: 0.45 },
      { t: 'drums', kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', g: 0.4 } ] },
    ashen_road: { bpm: 76, key: 60, scale: 'minor', prog: [0, 5, 6, 4], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'soft', mel: ['4___....2___....', '3___2___1___....', 'L....0___', '1___0___....2___'], g: 0.28, rv: 0.45 },
      { t: 'pad', g: 0.16, rv: 0.5 },
      { t: 'bass', v: 'tri', st: 'drone', g: 0.4 },
      { t: 'drums', kick: 'x.......x.......', g: 0.35 } ] },
    spire: { bpm: 100, key: 62, scale: 'major', prog: [0, 4, 5, 3], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'brass', mel: ['0___2___4___5___', '7___6___5_4_3___', 'L....4___', '2___1___0___5___'], g: 0.3, rv: 0.3 },
      { t: 'arp', v: 'saw', pat: '0121', r: 2, o: 1, g: 0.09, rv: 0.2 },
      { t: 'pad', g: 0.1, rv: 0.4 },
      { t: 'bass', v: 'tri', st: 'walk', g: 0.45 },
      { t: 'drums', kick: 'x...x...x...x...', hat: 'x.x.x.x.x.x.x.x.', g: 0.4 } ] },
    chamber: { bpm: 80, key: 62, scale: 'lydian', prog: [0, 1, 3, 0], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'soft', mel: ['0___4___7___....', '8___6___4___2___', 'L....5___', '4___2___0___....'], g: 0.28, rv: 0.6 },
      { t: 'arp', v: 'pluck', pat: '0_2_', r: 4, o: 1, g: 0.12, rv: 0.55 },
      { t: 'pad', g: 0.18, rv: 0.6 },
      { t: 'bass', v: 'tri', st: 'drone', g: 0.35 } ] },
    battle: { bpm: 156, key: 60, scale: 'minor', prog: [0, 5, 6, 4], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'brass', mel: ['0_0_3_3_4___....', '5_5_4_4_2___....', 'L....5___', '4_2_0_0_....0___'], g: 0.26, rv: 0.2 },
      { t: 'arp', v: 'pulse25', pat: '0121', r: 1, o: 1, g: 0.08, rv: 0.1 },
      { t: 'bass', v: 'saw', st: 'pulse', g: 0.35 },
      { t: 'drums', kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', g: 0.5 } ] },
    boss: { bpm: 140, key: 57, scale: 'minor', prog: [0, 5, 4, 6], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'brass', mel: ['0_0_1_2_3___....', '2_1_0___....6___', 'L....0___', '5___4_3_2___....'], g: 0.3, rv: 0.2 },
      { t: 'arp', v: 'saw', pat: '0212', r: 1, g: 0.07, rv: 0.1 },
      { t: 'bass', v: 'saw', st: 'root8', g: 0.35 },
      { t: 'drums', kick: 'x.x.x...x.x.x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', g: 0.5 } ] },
    finalboss: { bpm: 150, key: 57, scale: 'minor', prog: [0, 5, 4, 6], chordLen: 2, bars: 8, layers: [
      { t: 'mel', v: 'brass', mel: ['L....0___', '0_1_2___4___....', 'L3___2___', '1___0___4___....', '5___6___7___....', '8___7___6_5_4___', 'L....7___', '5_4_3_2_1___0___'], g: 0.3, rv: 0.3 },
      { t: 'mel', v: 'bell', mel: ['................', '................', 'L........', '................', '................', '................', 'L........', '................'], o: 1, g: 0.2, rv: 0.45 },
      { t: 'arp', v: 'saw', pat: '0121', r: 1, g: 0.07, rv: 0.1 },
      { t: 'bass', v: 'saw', st: 'walk', g: 0.35 },
      { t: 'drums', kick: 'x.x.x...x.x.x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', g: 0.5 } ] },
    victory: { bpm: 120, key: 62, scale: 'major', prog: [0, 4], chordLen: 1, bars: 2, once: true, layers: [
      { t: 'mel', v: 'brass', mel: ['0_2_4___5___7___', '7_5_4___2___0___'], g: 0.34, rv: 0.25 },
      { t: 'bass', v: 'tri', st: 'root8', g: 0.4 },
      { t: 'drums', kick: 'x...x...x...x...', snare: '....x.......x...', g: 0.4 } ] },
    gameover: { bpm: 60, key: 57, scale: 'minor', prog: [0, 5, 3, 4], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'soft', mel: ['4___3___2___....', '1___0___....0___', '2___3___4___....', '2___1___0___....'], g: 0.3, rv: 0.5 },
      { t: 'pad', g: 0.14, rv: 0.5 },
      { t: 'bass', v: 'tri', st: 'drone', g: 0.35 } ] },
  });
  Object.assign(TRACKS, {
    marigold: { bpm: 120, key: 62, scale: 'major', prog: [0, 4, 5, 3], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'bell', mel: ['0_2_4___5___7___', '6_5_4___2___0___', 'L....4___', '5___7___5_4_3_2_'], g: 0.3, rv: 0.35 },
      { t: 'arp', v: 'pulse12', pat: '0202', r: 2, g: 0.12, rv: 0.15 },
      { t: 'pad', g: 0.12, rv: 0.4 },
      { t: 'bass', v: 'tri', st: 'walk', g: 0.42 },
      { t: 'drums', kick: 'x.......x.......', hat: '..x...x...x...x.', g: 0.4 } ] },
    sky: { bpm: 96, key: 67, scale: 'major', prog: [0, 3, 4, 0], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'soft', mel: ['4___5___7___5___', '3___4___2___....', 'L....0___', '2___0___4___....'], g: 0.3, rv: 0.6 },
      { t: 'arp', v: 'pluck', pat: '0121', r: 3, g: 0.13, rv: 0.5 },
      { t: 'pad', g: 0.16, rv: 0.6 },
      { t: 'bass', v: 'tri', st: 'drone', g: 0.3 } ] },
    romance: { bpm: 66, key: 62, scale: 'major', prog: [0, 5, 3, 4], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'bell', mel: ['L....3___', '2___4___3___....', 'L5___4___', '3___2___0___....'], g: 0.34, rv: 0.4 },
      { t: 'arp', v: 'bell', pat: '0120', r: 4, g: 0.1, rv: 0.3 },
      { t: 'pad', g: 0.18, rv: 0.45 },
      { t: 'bass', v: 'tri', st: 'lift', g: 0.3 } ] },
    tender: { bpm: 76, key: 65, scale: 'major', prog: [0, 3, 0, 4], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'soft', mel: ['0_2_4___5___....', '4_3_2___1___....', 'L....2___', '1___0___3___....'], g: 0.3, rv: 0.4 },
      { t: 'arp', v: 'pluck', pat: '0212', r: 2, g: 0.13, rv: 0.3 },
      { t: 'pad', g: 0.2, rv: 0.4 },
      { t: 'bass', v: 'tri', st: 'root8', g: 0.35 },
      { t: 'drums', hat: '..g...g...g...g.', g: 0.25 } ] },
    sad: { bpm: 66, key: 60, scale: 'minor', prog: [0, 5, 6, 4], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'soft', mel: ['4___3___2___....', '2___1___0___....', '3___2___0___....', 'L....4___'], g: 0.3, rv: 0.5 },
      { t: 'pad', g: 0.22, rv: 0.55 },
      { t: 'bass', v: 'tri', st: 'drone', g: 0.35 } ] },
    tense: { bpm: 120, key: 60, scale: 'minor', prog: [0, 5, 4, 6], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'pulse25', mel: ['0_..1_..2___....', '3_..3_..4___....', 'L....5_..', '0_..1_..0___....'], g: 0.22, rv: 0.2 },
      { t: 'arp', v: 'pulse12', pat: '0010', r: 1, g: 0.08, rv: 0.15 },
      { t: 'bass', v: 'tri', st: 'pulse', g: 0.4 },
      { t: 'drums', kick: 'x...x...x..x....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', g: 0.35 } ] },
    mystery: { bpm: 92, key: 62, scale: 'dorian', prog: [0, 3, 0, 6], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'bell', mel: ['5___4_2_0___....', '1_..2_..3___4___', '....0_0_2___....', 'L....5___'], g: 0.3, rv: 0.5 },
      { t: 'arp', v: 'pluck', pat: '0.2.', r: 2, g: 0.13, rv: 0.5 },
      { t: 'pad', g: 0.14, rv: 0.6 },
      { t: 'bass', v: 'tri', st: 'drone', g: 0.35 },
      { t: 'drums', hat: 'o.......o.......', g: 0.3 } ] },
    comic: { bpm: 140, key: 62, scale: 'major', prog: [0, 3, 4, 0], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'pulse50', mel: ['0_..0_..2_..4_..', '5_..4_..3_..2_..', 'L....1_..', '2_..4_..5_..7_..'], g: 0.22, rv: 0.1 },
      { t: 'arp', v: 'pulse12', pat: '0202', r: 2, g: 0.12, rv: 0.1 },
      { t: 'bass', v: 'tri', st: 'pulse', g: 0.4 },
      { t: 'drums', kick: 'x.x.....x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', g: 0.42 } ] },
    ending_love: { bpm: 72, key: 62, scale: 'major', prog: [0, 5, 3, 4], chordLen: 2, bars: 8, layers: [
      { t: 'mel', v: 'soft', mel: ['L....4___', '5___4___3___2___', '1___2___3___....', 'L5___7___', '6___5___4___3___', '2___4___5___....', 'L....0___', '0___4___5___7___'], g: 0.26, rv: 0.45 },
      { t: 'pad', g: 0.15, rv: 0.6 },
      { t: 'bass', v: 'tri', st: 'lift', g: 0.35 },
      { t: 'drums', kick: 'x.......x.......', g: 0.35 } ] },
    ending_common: { bpm: 96, key: 62, scale: 'major', prog: [0, 4, 5, 3], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'pluck', mel: ['0_2_4___2___....', '5___4_3_2___....', 'L....3___', '4___5___0___....'], g: 0.36, rv: 0.3 },
      { t: 'arp', v: 'pluck', pat: '0121', r: 2, g: 0.13, rv: 0.25 },
      { t: 'bass', v: 'tri', st: 'walk', g: 0.4 },
      { t: 'pad', g: 0.12, rv: 0.4 },
      { t: 'drums', hat: '..x...x...x...x.', g: 0.25 } ] },
    ending_lone: { bpm: 80, key: 62, scale: 'mixo', prog: [0, 3, 6, 4], chordLen: 1, bars: 4, layers: [
      { t: 'mel', v: 'soft', mel: ['5___4___2___....', '3___2___1___....', '2___3___4___....', 'L....0___'], g: 0.3, rv: 0.55 },
      { t: 'pad', g: 0.2, rv: 0.6 },
      { t: 'bass', v: 'tri', st: 'drone', g: 0.3 } ] },
    credits: { bpm: 88, key: 62, scale: 'major', prog: [0, 5, 3, 4], chordLen: 2, bars: 8, layers: [
      { t: 'mel', v: 'bell', mel: ['L....0___', '2___4___5___....', 'L....4___', '3___2___1___....', 'L5___4___', '3___2___1___0___', 'L....5___', '4___2___0___....'], g: 0.34, rv: 0.4 },
      { t: 'pad', g: 0.14, rv: 0.5 },
      { t: 'bass', v: 'tri', st: 'walk', g: 0.4 },
      { t: 'drums', kick: 'x.......x.......', hat: '..x...x...x...x.', g: 0.25 } ] },
  });
  const SFX = {};      // @@SFX@@
  const compiled = new Map();

  function compileTrack(name) {
    if (compiled.has(name)) return compiled.get(name);
    const T = TRACKS[name];
    const L = T.bars * 16;
    const C = { L: L, layers: [], warn: [] };
    for (const ly of T.layers) {
      const o = Object.assign({ o: 0, g: 0.4, rv: 0.25 }, ly);
      if (o.t === 'mel') {
        const p = parseMel(o.mel, L);
        o.d = p.d; o.n = p.n;
        if (p.len !== L) C.warn.push('mel(' + o.v + ') has ' + p.len + ' steps, expected ' + L);
      }
      C.layers.push(o);
    }
    compiled.set(name, C);
    return C;
  }
  // chord tones (scale degrees) for a bar: triad on prog degree, optional 7th
  function chordAt(T, bar) {
    const d = T.prog[Math.floor(bar / (T.chordLen || 1)) % T.prog.length];
    return T.sev ? [d, d + 2, d + 4, d + 6] : [d, d + 2, d + 4];
  }

  function scheduleStep(inst, s, t) {
    const S = inst.S, T = inst.T, C = inst.C, sd = inst.sd;
    const i = s % C.L, bar = i >> 4, ii = i & 15;
    const n = SCALES[T.scale || 'major'].length;
    const ct = chordAt(T, bar), root = ct[0];
    for (const ly of C.layers) {
      switch (ly.t) {
        case 'mel': {
          const d = ly.d[i];
          if (d < 0) break;
          voiceNote(S, inst.gain, ly.v, t, ly.n[i] * sd * 0.96, mtof(midiOf(T, d) + 12 * ly.o), ly.g, ly.rv);
          break;
        }
        case 'arp': {
          if (i % ly.r !== 0) break;
          const ch = ly.pat[Math.floor(i / ly.r) % ly.pat.length];
          const idx = parseInt(ch, 36), len = ct.length;
          if (!(idx >= 0)) break;                                  // rest: '.', '-', '_' or junk
          const deg = ct[idx % len] + n * Math.floor(idx / len) + n * ly.o;
          voiceNote(S, inst.gain, ly.v, t, ly.r * sd * 0.9, mtof(midiOf(T, deg)), ly.g, ly.rv);
          break;
        }
        case 'bass': {
          const r = root - 2 * n;
          let deg = null, dur = 0;
          switch (ly.st) {
            case 'root8': if (ii % 2 === 0) { deg = r; dur = 2; } break;
            case 'pulse': if (ii % 2 === 0) { deg = r + (((ii >> 1) & 1) ? n : 0); dur = 2; } break;
            case 'walk': if (ii % 4 === 0) { deg = r + [0, 4, 2, 4][(ii >> 2) & 3]; dur = 4; } break;
            case 'lift': if (ii % 4 === 0) { deg = r; dur = 3; } else if (ii % 4 === 2) { deg = r + 4; dur = 2; } break;
            case 'drone': if (ii === 0) { deg = r; dur = 16; } break;
            default: if (ii % 4 === 0) { deg = r; dur = 4; }
          }
          if (deg !== null) voiceNote(S, inst.gain, ly.v || 'tri', t, dur * sd * 0.95, mtof(midiOf(T, deg) + 12 * ly.o), ly.g, ly.rv);
          break;
        }
        case 'pad': {
          if (ii === 0 && bar % (T.chordLen || 1) === 0) {
            const dur = (T.chordLen || 1) * 16 * sd;
            for (const d of ct) padNote(S, inst.gain, t, dur, mtof(midiOf(T, d) + 12 * ly.o), ly.g, ly.rv);
          }
          break;
        }
        case 'drums': {
          if (ly.kick && ly.kick[i % ly.kick.length] === 'x') kick(S, inst.gain, t, ly.g);
          if (ly.snare) { const c = ly.snare[i % ly.snare.length]; if (c === 'x' || c === 'g') snare(S, inst.gain, t, ly.g * (c === 'g' ? 0.45 : 0.9), 0.12); }
          if (ly.hat) { const c = ly.hat[i % ly.hat.length]; if (c === 'x' || c === 'g') hat(S, inst.gain, t, ly.g * (c === 'g' ? 0.4 : 0.8), false); else if (c === 'o') hat(S, inst.gain, t, ly.g * 0.8, true); }
          break;
        }
        default: break;
      }
    }
  }

  // schedule every step whose start time is < until (look-ahead pump)
  function pump(inst, until) {
    if (inst.done || inst.stopping) return;
    const ac = inst.S.ac;
    if (!inst.offline && inst.nextT < ac.currentTime) inst.nextT = ac.currentTime + 0.03;  // tab was throttled: resync
    while (inst.nextT < until) {
      if (inst.once && inst.nextS >= inst.C.L) { inst.done = true; inst.endT = inst.nextT; return; }
      const t = inst.nextT + ((inst.nextS & 1) && inst.T.swing ? inst.T.swing * inst.sd : 0);
      scheduleStep(inst, inst.nextS, t);
      inst.nextS++; inst.nextT += inst.sd;
    }
  }

  function makeInst(S, name, out, opts) {
    const T = TRACKS[name], C = compileTrack(name);
    const inst = {
      name: name, T: T, C: C, S: S, offline: !!(opts && opts.offline),
      gain: S.ac.createGain(), sd: 60 / T.bpm / 4,
      nextS: 0, nextT: 0, once: !!(T.once || (opts && opts.once)),
      done: false, endT: 0, stopping: false, endAt: 0, onEnd: null,
    };
    inst.gain.gain.value = 0;
    inst.gain.connect(out);
    return inst;
  }

  // ---------------------------------------------------------------- playback state (real AudioContext)
  let S = null, timer = null, attempts = 0;
  const active = [];          // every sounding looping/once instance (incl. fading out)
  let cur = null;             // desired bgm {name, fade, jingle?}
  let bgmInst = null;         // instance currently representing cur
  const sfxLast = {}, sfxEnds = [];

  function fadeOutInst(inst, sec) {
    if (!inst || inst.stopping || !S) return;
    const now = S.ac.currentTime, g = inst.gain.gain, dur = Math.max(0.02, sec);
    inst.stopping = true;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0, now + dur);
    inst.endAt = now + dur + 0.1;
  }
  function startInst(name, fadeSec, onEnd, once) {
    const now = S.ac.currentTime;
    const inst = makeInst(S, name, S.bgm, { once: once });
    inst.nextT = now + 0.05; inst.onEnd = onEnd || null;
    inst.gain.gain.setValueAtTime(0, now);
    inst.gain.gain.linearRampToValueAtTime(1, now + Math.max(0.02, fadeSec));
    active.push(inst);
    return inst;
  }
  function syncBgm(fadeSec) {
    if (!S) return;
    if (bgmInst && !bgmInst.stopping && !bgmInst.done && cur && bgmInst.name === cur.name) return;
    if (bgmInst) fadeOutInst(bgmInst, fadeSec);
    bgmInst = null;
    if (cur && TRACKS[cur.name]) bgmInst = startInst(cur.name, fadeSec, null, false);
  }
  function pumpAll() {
    if (!S) return;
    const now = S.ac.currentTime;
    const ahead = (typeof document !== 'undefined' && document.hidden) ? 0.6 : 0.2;   // survive throttled timers
    for (let i = active.length - 1; i >= 0; i--) {
      const inst = active[i];
      if (!inst.stopping) pump(inst, now + ahead);
      if ((inst.stopping && now >= inst.endAt) || (inst.done && now >= inst.endT + 0.25)) {
        try { inst.gain.disconnect(); } catch (e) { /* ignore */ }
        active.splice(i, 1);
        if (inst.done && inst.onEnd) { const f = inst.onEnd; inst.onEnd = null; f(); }
      }
    }
  }

  // ---------------------------------------------------------------- sound effects
  // each sfx: fn(S, out, t, vel) -> length in seconds. Polyphony/cooldown handled in G.audio.sfx.
  function arp(S, out, t, notes, step, o) {
    let end = t;
    notes.forEach(function (f, k) {
      end = Math.max(end, voiceNote(S, out, o.v, t + k * step, o.d || step * 1.6, f, o.g == null ? 0.25 : o.g, o.rv == null ? 0.3 : o.rv));
    });
    return end - t;
  }
  Object.assign(SFX, {
    cursor: function (S, o, t) { tone(S, o, t, 0.035, { wave: 'pulse25', f: 1320, g: 0.22, a: 0.002, d: 0.03, s: 0.3, r: 0.02, fc: 6000 }); return 0.06; },
    ok: function (S, o, t) {
      tone(S, o, t, 0.05, { wave: 'pulse50', f: 660, g: 0.22, a: 0.002, d: 0.05, s: 0.4, r: 0.02, fc: 5000 });
      tone(S, o, t + 0.06, 0.09, { wave: 'pulse50', f: 990, g: 0.22, a: 0.002, d: 0.08, s: 0.4, r: 0.03, fc: 5000 });
      return 0.18;
    },
    cancel: function (S, o, t) { tone(S, o, t, 0.14, { wave: 'pulse25', f: 520, f1: 300, g: 0.2, a: 0.002, d: 0.12, s: 0.4, r: 0.03, fc: 4000 }); return 0.18; },
    buzzer: function (S, o, t) {
      tone(S, o, t, 0.28, { wave: 'saw', f: 150, f1: 120, g: 0.22, a: 0.005, d: 0.2, s: 0.8, r: 0.05, fc: 900 });
      tone(S, o, t, 0.28, { wave: 'pulse50', f: 153, g: 0.1, a: 0.005, d: 0.2, s: 0.8, r: 0.05, fc: 900 });
      return 0.32;
    },
    step: function (S, o, t) { noiseBurst(S, o, t, 0.04, 'lowpass', 900, 0.7, 0.8); return 0.07; },
    footstep_grass: function (S, o, t) { noiseBurst(S, o, t, 0.07, 'bandpass', 900, 0.6, 0.8); return 0.12; },
    door: function (S, o, t) {
      noiseBurst(S, o, t, 0.22, 'lowpass', 420, 0.7, 0.25);
      tone(S, o, t, 0.25, { type: 'triangle', f: 110, f1: 78, g: 0.25, a: 0.01, d: 0.2, s: 0.4, r: 0.05, fc: 600 });
      return 0.3;
    },
    chest: function (S, o, t) { arp(S, o, t, [1319, 1760, 2093, 2637], 0.05, { v: 'bell', g: 0.22, rv: 0.4 }); return 0.4; },
    heal: function (S, o, t) { arp(S, o, t, [523, 659, 784, 1047], 0.07, { v: 'tri', g: 0.3, d: 0.3, rv: 0.4 }); return 0.4; },
    hit: function (S, o, t) {
      noiseBurst(S, o, t, 0.07, 'bandpass', 1200, 0.8, 0.35);
      tone(S, o, t, 0.12, { wave: 'saw', f: 180, f1: 60, g: 0.25, a: 0.002, d: 0.08, s: 0.3, r: 0.03, fc: 1500 });
      return 0.15;
    },
    crit: function (S, o, t) { SFX.hit(S, o, t); arp(S, o, t + 0.02, [1046, 1568], 0.05, { v: 'bell', g: 0.3 }); return 0.3; },
    break: function (S, o, t) {
      noiseBurst(S, o, t, 0.12, 'highpass', 4000, 0.7, 0.35);
      tone(S, o, t, 0.5, { type: 'sine', f: 90, f1: 30, g: 0.6, a: 0.002, d: 0.3, s: 0.2, r: 0.1 });
      noiseBurst(S, o, t + 0.05, 0.4, 'lowpass', 500, 0.6, 0.25);
      return 0.6;
    },
    shatter: function (S, o, t) {
      noiseBurst(S, o, t, 0.4, 'highpass', 3000, 0.6, 0.3, 0.2);
      bell(S, o, t + 0.05, 0.5, 2500, { g: 0.18, rv: 0.4 });
      bell(S, o, t + 0.12, 0.5, 3100, { g: 0.12, rv: 0.4 });
      return 0.6;
    },
    slash: function (S, o, t) { noiseBurst(S, o, t, 0.08, 'bandpass', 3200, 1.2, 0.35, 0, 900); return 0.14; },
    pierce: function (S, o, t) {
      tone(S, o, t, 0.12, { wave: 'saw', f: 1400, f1: 400, g: 0.18, a: 0.002, d: 0.1, s: 0.3, r: 0.03, fc: 6000 });
      noiseBurst(S, o, t, 0.04, 'highpass', 5000, 0.7, 0.25);
      return 0.14;
    },
    blunt: function (S, o, t) {
      tone(S, o, t, 0.18, { type: 'sine', f: 120, f1: 50, g: 0.45, a: 0.002, d: 0.15, s: 0.2, r: 0.04 });
      noiseBurst(S, o, t, 0.1, 'lowpass', 600, 0.7, 0.3);
      return 0.2;
    },
    arrow: function (S, o, t) {
      tone(S, o, t, 0.15, { type: 'triangle', f: 1800, f1: 300, g: 0.25, a: 0.002, d: 0.12, s: 0.2, r: 0.03 });
      noiseBurst(S, o, t, 0.05, 'highpass', 3000, 0.7, 0.2);
      return 0.18;
    },
    fire: function (S, o, t) {
      noiseBurst(S, o, t, 0.35, 'bandpass', 700, 0.8, 0.3, 0.2, 1800);
      tone(S, o, t, 0.35, { wave: 'saw', f: 260, f1: 620, g: 0.12, a: 0.05, d: 0.2, s: 0.5, r: 0.1, fc: 1800, vib: true });
      return 0.42;
    },
    ice: function (S, o, t) {
      arp(S, o, t, [1760, 2349, 2793], 0.04, { v: 'pulse12', g: 0.16, d: 0.1, rv: 0.4 });
      noiseBurst(S, o, t, 0.15, 'highpass', 6000, 0.7, 0.15, 0.2);
      return 0.3;
    },
    lightning: function (S, o, t) {
      noiseBurst(S, o, t, 0.1, 'highpass', 2000, 0.7, 0.25);
      tone(S, o, t, 0.22, { wave: 'pulse12', f: 1500, f1: 200, g: 0.2, a: 0.002, d: 0.15, s: 0.3, r: 0.05, fc: 5000 });
      return 0.25;
    },
    wind: function (S, o, t) { noiseBurst(S, o, t, 0.5, 'bandpass', 600, 0.9, 1.0, 0.25, 1600); return 0.55; },
    light: function (S, o, t) { bell(S, o, t, 0.5, 1320, { g: 0.28, rv: 0.5 }); bell(S, o, t + 0.1, 0.6, 1980, { g: 0.2, rv: 0.5 }); return 0.6; },
    dark: function (S, o, t) {
      tone(S, o, t, 0.4, { type: 'triangle', f: 220, f1: 110, g: 0.3, a: 0.02, d: 0.3, s: 0.5, r: 0.1, fc: 900 });
      noiseBurst(S, o, t, 0.35, 'lowpass', 300, 0.7, 0.2);
      return 0.45;
    },
    levelup: function (S, o, t) {
      arp(S, o, t, [523, 659, 784, 1047], 0.11, { v: 'pulse25', g: 0.22, d: 0.12, rv: 0.3 });
      bell(S, o, t + 0.5, 0.9, 2093, { g: 0.25, rv: 0.5 });
      return 1.2;
    },
    coin: function (S, o, t) { bell(S, o, t, 0.15, 1975, { g: 0.25, rv: 0.2 }); bell(S, o, t + 0.07, 0.25, 2637, { g: 0.25, rv: 0.2 }); return 0.35; },
    save: function (S, o, t) { bell(S, o, t, 0.9, 1047, { g: 0.28, rv: 0.5 }); bell(S, o, t + 0.18, 1.0, 1568, { g: 0.22, rv: 0.5 }); return 1.2; },
    encounter: function (S, o, t) {
      tone(S, o, t, 0.9, { wave: 'saw', f: 98, f1: 73, g: 0.3, a: 0.02, d: 0.5, s: 0.6, r: 0.3, fc: 300, fe: 1400 });
      tone(S, o, t, 0.9, { wave: 'pulse50', f: 104, g: 0.12, a: 0.02, d: 0.5, s: 0.5, r: 0.3, fc: 900 });
      return 1.2;
    },
    escape: function (S, o, t) { tone(S, o, t, 0.25, { wave: 'pulse12', f: 400, f1: 1200, g: 0.2, a: 0.005, d: 0.2, s: 0.5, r: 0.05, fc: 6000 }); return 0.3; },
    boost: function (S, o, t) {
      tone(S, o, t, 0.22, { type: 'triangle', f: 300, f1: 1200, g: 0.25, a: 0.005, d: 0.15, s: 0.5, r: 0.05, fc: 6000 });
      bell(S, o, t + 0.18, 0.35, 1600, { g: 0.2, rv: 0.3 });
      return 0.4;
    },
    heart: function (S, o, t) { voiceNote(S, o, 'soft', t, 0.14, 880, 0.22, 0.3); voiceNote(S, o, 'soft', t + 0.12, 0.22, 1175, 0.22, 0.35); return 0.4; },
    buff: function (S, o, t) { arp(S, o, t, [523, 659, 784], 0.06, { v: 'pulse50', g: 0.18, d: 0.08, rv: 0.2 }); return 0.3; },
    debuff: function (S, o, t) { arp(S, o, t, [784, 659, 523], 0.07, { v: 'tri', g: 0.25, d: 0.1, rv: 0.2 }); return 0.35; },
    lantern: function (S, o, t) {   // the leitmotif intervals (rising fifth + step) as bells
      bell(S, o, t, 0.6, 523, { g: 0.25, rv: 0.5 }); bell(S, o, t + 0.2, 0.6, 784, { g: 0.25, rv: 0.5 }); bell(S, o, t + 0.4, 0.8, 880, { g: 0.25, rv: 0.5 });
      return 1.0;
    },
    portal: function (S, o, t) {
      tone(S, o, t, 0.6, { type: 'triangle', f: 200, f1: 1600, g: 0.22, a: 0.05, d: 0.4, s: 0.6, r: 0.1, fc: 5000, vib: true });
      noiseBurst(S, o, t, 0.5, 'bandpass', 800, 1, 0.2, 0.2, 2400);
      return 0.7;
    },
    jingle_item: function (S, o, t) {
      tone(S, o, t, 0.08, { wave: 'pulse50', f: 784, g: 0.2, a: 0.002, d: 0.06, s: 0.4, r: 0.02, fc: 5000 });
      tone(S, o, t + 0.09, 0.1, { wave: 'pulse50', f: 1047, g: 0.2, a: 0.002, d: 0.08, s: 0.4, r: 0.03, fc: 5000 });
      bell(S, o, t + 0.09, 0.4, 1568, { g: 0.18, rv: 0.3 });
      return 0.4;
    },
    footstep: function (S, o, t) { noiseBurst(S, o, t, 0.05, 'lowpass', 700, 0.7, 1.0); return 0.08; },
    revive: function (S, o, t) { arp(S, o, t, [523, 784, 1047, 1319], 0.09, { v: 'soft', g: 0.22, d: 0.2, rv: 0.4 }); return 0.5; },
    steal: function (S, o, t) {
      tone(S, o, t, 0.1, { wave: 'pulse25', f: 900, g: 0.18, a: 0.003, d: 0.08, s: 0.2, r: 0.02, fc: 6000 });
      tone(S, o, t + 0.07, 0.12, { wave: 'pulse25', f: 1400, g: 0.18, a: 0.003, d: 0.1, s: 0.2, r: 0.03, fc: 6000 });
      return 0.2;
    },
    miss: function (S, o, t) { tone(S, o, t, 0.12, { wave: 'pulse12', f: 330, f1: 180, g: 0.15, a: 0.005, d: 0.1, s: 0.3, r: 0.03, fc: 2000 }); return 0.15; },
    poison: function (S, o, t) { tone(S, o, t, 0.3, { type: 'triangle', f: 260, f1: 150, g: 0.2, a: 0.02, d: 0.2, s: 0.4, r: 0.1, fc: 1000, vib: true }); return 0.35; },
    equip: function (S, o, t) { noiseBurst(S, o, t, 0.05, 'bandpass', 2200, 1.5, 0.25); bell(S, o, t + 0.05, 0.25, 1760, { g: 0.15, rv: 0.2 }); return 0.3; },
    menu_open: function (S, o, t) { tone(S, o, t, 0.07, { wave: 'pulse50', f: 520, f1: 780, g: 0.15, a: 0.002, d: 0.05, s: 0.3, r: 0.02, fc: 5000 }); return 0.1; },
    bond: function (S, o, t) { arp(S, o, t, [659, 880, 1175], 0.12, { v: 'soft', g: 0.22, d: 0.3, rv: 0.5 }); bell(S, o, t + 0.4, 0.8, 1319, { g: 0.18, rv: 0.5 }); return 1.1; },
  });
  SFX.select = SFX.cursor;
  SFX.confirm = SFX.ok;

  // ---------------------------------------------------------------- public API (CONTRACT §7)
  G.audio = {
    unlock() {
      try {
        if (!S) {
          if (attempts >= 3) return false;
          attempts++;
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return false;
          const ac = new AC();
          S = makeSession(ac, ac.destination);
          if (!timer) timer = setInterval(pumpAll, 25);   // fallback scheduler (update() is the primary)
        }
        if (S.ac.state === 'suspended' && S.ac.resume) S.ac.resume().catch(function () { /* ignore */ });
        if (cur) syncBgm(0.5);
        return true;
      } catch (e) { S = null; return false; }
    },
    update() { try { pumpAll(); } catch (e) { /* never break the frame loop */ } },
    playBgm(name, opts) {
      if (!TRACKS[name]) return;
      const fade = opts && opts.fade != null ? opts.fade : 30;
      const playing = !!bgmInst && !bgmInst.stopping && !bgmInst.done;
      if (cur && cur.name === name && (!S || playing)) return;   // already playing / pending
      cur = { name: name, fade: fade / 60 };
      if (S) syncBgm(cur.fade);
    },
    stopBgm(frames) {
      cur = null;
      const sec = (frames == null ? 30 : frames) / 60;
      if (S && bgmInst) { fadeOutInst(bgmInst, sec); bgmInst = null; }
    },
    // short non-looping jingle; resumes the previous bgm when it ends
    jingle(name) {
      if (!TRACKS[name] || !S) return;
      const resume = cur && !cur.jingle ? cur.name : null;
      fadeOutInst(bgmInst, 0.15); bgmInst = null;
      cur = { name: name, fade: 0.05, jingle: true };
      bgmInst = startInst(name, 0.05, function () {
        if (cur && cur.jingle && cur.name === name) {
          cur = null;
          if (resume) G.audio.playBgm(resume, { fade: 40 });
        }
      }, true);
    },
    sfx(name) {
      if (!S || prefs.muted) return;
      const fn = SFX[name];
      if (!fn) return;
      const now = S.ac.currentTime;
      if (sfxLast[name] != null && now - sfxLast[name] < 0.03) return;   // same sound stacked within 30ms
      sfxLast[name] = now;
      for (let i = sfxEnds.length - 1; i >= 0; i--) if (sfxEnds[i] < now) sfxEnds.splice(i, 1);
      if (sfxEnds.length >= 12) return;                                    // polyphony cap
      try {
        const len = fn(S, S.sfx, now + 0.005, 1) || 0.3;
        sfxEnds.push(now + len);
      } catch (e) { /* never throw into the game */ }
    },
    setVolume(v) {
      v = v || {};
      if (typeof v.bgm === 'number') prefs.bgm = clamp01(v.bgm);
      if (typeof v.sfx === 'number') prefs.sfx = clamp01(v.sfx);
      savePrefs();
      if (S) { const now = S.ac.currentTime; S.bgm.gain.setTargetAtTime(prefs.bgm, now, 0.03); S.sfx.gain.setTargetAtTime(prefs.sfx, now, 0.03); }
    },
    getVolume() { return { bgm: prefs.bgm, sfx: prefs.sfx, muted: prefs.muted }; },
    setMuted(b) {
      prefs.muted = !!b; savePrefs();
      if (S) S.master.gain.setTargetAtTime(prefs.muted ? 0 : 1, S.ac.currentTime, 0.02);
    },
    voice() { /* voice acting not in this build (CONTRACT §7 stub) */ },
    // ---- dev / test helpers
    _tracks() { return Object.keys(TRACKS); },
    _sfxNames() { return Object.keys(SFX); },
    _trackInfo(name) { const T = TRACKS[name]; if (!T) return null; const C = compileTrack(name); return { bpm: T.bpm, bars: T.bars, seconds: T.bars * 16 * (60 / T.bpm / 4), once: !!T.once, warn: C.warn }; },
    _renderOffline(name, seconds) {
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!OAC) return Promise.resolve(null);
      const sec = Math.max(0.1, +seconds || 4), sr = 44100;
      const ac = new OAC(2, Math.ceil(sr * sec), sr);
      const S2 = makeSession(ac, ac.destination);
      if (TRACKS[name]) {
        const inst = makeInst(S2, name, S2.bgm, { offline: true });
        inst.gain.gain.value = 1; inst.nextT = 0.02;
        pump(inst, sec);
      } else if (SFX[name]) {
        SFX[name](S2, S2.sfx, 0.02, 1);
      } else return Promise.resolve(null);
      return ac.startRendering();
    },
  };
  Object.defineProperty(G.audio, 'muted', { get() { return prefs.muted; } });

  G.provide('audio');
})();
