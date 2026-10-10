/* =====================================================================
 * LANTERNBOUND — battle.js  (owner: battle)
 * Octopath-style battle: scene 'battle', command c.battle(), G.battleSim().
 * Part 1: pure resolution logic (shared by the real battle and the headless sim).
 * ===================================================================== */
(function () {
  'use strict';
  const G = window.G;
  G.battle = G.battle || {};

  const STATUSES = ['poison', 'sleep', 'atkup', 'atkdown', 'defup', 'defdown', 'spdup', 'spddown', 'regen', 'taunt', 'guard'];
  const ELEMENTS = ['fire', 'ice', 'lightning', 'wind', 'light', 'dark'];
  const WTYPES = ['sword', 'spear', 'dagger', 'axe', 'bow', 'staff'];
  const MAX_BP = 5, MAX_BOOST = 3;

  // ---------------------------------------------------------------- lazy data access (never throw at load)
  function D() { return G.data || {}; }
  function P() { return G.party || null; }
  function skillDef(id) {
    const s = D().skills && D().skills[id];
    if (s) return s;
    return { id, name: id, kind: 'phys', power: 100, hits: 1, target: 'one_enemy', cost: 0, shield: 1, effects: [], special: null, anim: 'slash' };
  }
  function enemyDef(id) {
    const e = D().enemies && D().enemies[id];
    if (e) return e;
    return { id, name: id, level: 1, hp: 50, shields: 1, weak: [], resist: [], stats: { patk: 5, pdef: 3, eatk: 5, edef: 3, spd: 5, crit: 3, eva: 3 }, skills: [], exp: 5, gold: 5, drops: [], steal: [], boss: false, scale: 1 };
  }
  function itemDef(id) { return (D().items && D().items[id]) || { id, name: id, type: 'consumable', effect: {}, price: 0, use: 'battle' }; }
  function statusInfo(id) { return (D().statusInfo && D().statusInfo[id]) || { name: id, buff: false }; }

  // Party stats: prefer G.party.stats; fallback to base values
  function actorDef(id) { return (D().actors && D().actors[id]) || { id, name: id, base: { hp: 60, sp: 20, patk: 10, pdef: 6, eatk: 10, edef: 6, spd: 10, crit: 5, eva: 5 }, growth: {}, learn: [], weapons: ['sword'], equip: {} }; }
  function actorState(id) {
    const p = P();
    if (p && p.actor) { const a = p.actor(id); if (a) return a; }
    return (G.state && G.state.roster && G.state.roster[id]) || { id, level: 1, exp: 0, hp: 50, sp: 20, equip: {} };
  }
  function actorStats(id) {
    const p = P();
    if (p && p.stats) { try { const s = p.stats(id); if (s) return s; } catch (e) { /* fall through */ } }
    const d = actorDef(id), lv = (actorState(id).level || 1);
    const o = {};
    for (const k of ['hp', 'sp', 'patk', 'pdef', 'eatk', 'edef', 'spd', 'crit', 'eva']) {
      const base = (d.base && d.base[k]) || 10, g = (d.growth && d.growth[k]) || 0;
      o[k] = base + Math.floor(g * (lv - 1));
    }
    return { mhp: o.hp, msp: o.sp, patk: o.patk, pdef: o.pdef, eatk: o.eatk, edef: o.edef, spd: o.spd, crit: o.crit, eva: o.eva };
  }
  function actorSkills(id) {
    const p = P();
    if (p && p.skills) { try { const s = p.skills(id); if (s) return s; } catch (e) { /* fall */ } }
    const d = actorDef(id), lv = actorState(id).level || 1;
    return (d.learn || []).filter((l) => l.level <= lv).map((l) => l.skill);
  }
  function weaponTypesOf(id) {
    const p = P();
    if (p && p.weaponTypesOf) { try { const w = p.weaponTypesOf(id); if (w && w.length) return w; } catch (e) { /* fall */ } }
    return actorDef(id).weapons || ['sword'];
  }
  function tierOf(partner) { return (G.romance && G.romance.tier) ? (G.romance.tier(partner) || 0) : 0; }
  // rngFn: seeded generator used by the headless sim; null = live randomness
  let rngFn = null;
  function rnd() { if (rngFn) return rngFn(); return (G.util && G.util.rand) ? G.util.rand() : Math.random(); }
  function rint(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
  function pickR(arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ---------------------------------------------------------------- BattleUnit
  let uid = 1;
  class BattleUnit {
    constructor(opts) {
      this.uid = uid++;
      this.side = opts.side;                // 'party' | 'enemy'
      this.id = opts.id;                    // actorId or enemyId
      this.isBoss = !!opts.boss;
      this.scale = opts.scale || 1;
      this.def = opts.def;                  // enemyDef or null
      this.name = opts.name;
      this.level = opts.level || 1;
      this.stats = opts.stats;              // {mhp,msp,patk,pdef,eatk,edef,spd,crit,eva}
      this.mhp = opts.stats.mhp; this.hp = opts.hp == null ? this.mhp : opts.hp;
      this.msp = opts.stats.msp || 0; this.sp = opts.sp == null ? this.msp : opts.sp;
      this.bp = opts.side === 'party' ? 1 : 0;
      this.status = {};                     // name -> turns left
      this.defending = false;
      this.defendNext = false;              // defend bonus for next-round ordering
      this.alive = this.hp > 0;
      this.shieldMax = opts.shields || 0;
      this.shield = this.shieldMax;
      this.broken = false;                  // currently broken (stunned)
      this.breakSkip = false;               // loses its next turn
      this.weak = (opts.weak || []).slice();
      this.resist = (opts.resist || []).slice();
      this.revealed = {};                   // token -> true once discovered
      this.skillsList = opts.skills || [];
      this.weapons = opts.weapons || [];
      this.acted = false;
      this.tauntTurns = 0;
      this.dmgTaken = 0;
      this.stolen = {};                     // steal bookkeeping (enemies)
      this.spd = this.stats.spd;
    }
    hasStatus(s) { return (this.status[s] || 0) > 0; }
    addStatus(s, turns) { if (!STATUSES.includes(s)) return; this.status[s] = Math.max(this.status[s] || 0, turns || 3); }
    clearStatus(s) { delete this.status[s]; }
    get isEnemy() { return this.side === 'enemy'; }
    // Token helpers
    isWeakTo(token) { return this.weak.indexOf(token) >= 0; }
    isResistTo(token) { return this.resist.indexOf(token) >= 0; }
    // Shield max grows back to full when broken recovers
    hpRatio() { return this.mhp ? this.hp / this.mhp : 0; }
  }
  G.battle.BattleUnit = BattleUnit;

  // ---------------------------------------------------------------- damage (CONTRACT §5)
  // returns {dmg, crit, weak, resist, miss}
  function computeDamage(att, def, skill, o) {
    o = o || {};
    const kind = skill.kind;
    const phys = kind === 'phys' || (kind !== 'elem' && kind !== 'heal' && kind !== 'buff' && kind !== 'debuff');
    const A = phys ? att.stats.patk : att.stats.eatk;
    const Dv = phys ? def.stats.pdef : def.stats.edef;
    const power = (skill.power || 100) * (o.powerMul || 1);
    const variance = 0.9 + rnd() * 0.2;
    let mult = 1, info = { weak: false, resist: false, crit: false, miss: false, dmg: 0 };
    // token for weakness: element or weapon token
    const token = o.token || skill.element || (phys ? (o.weaponType || skill.weapon || null) : null);
    if (token && def.isEnemy) {
      if (def.isWeakTo(token)) { mult *= 1.2; info.weak = true; }
      else if (def.isResistTo(token)) { mult *= 0.5; info.resist = true; }
    } else if (token && !def.isEnemy && def.isWeakTo && def.isWeakTo(token)) { mult *= 1.2; info.weak = true; }
    if (def.side === 'enemy' && def.broken) mult *= 1.5;
    if (rnd() * 100 < (att.stats.crit || 0)) { mult *= 1.5; info.crit = true; }
    if (att.hasStatus('atkup')) mult *= 1.3;
    if (att.hasStatus('atkdown')) mult *= 0.7;
    if (def.hasStatus('defup')) mult *= 0.7;
    if (def.hasStatus('defdown')) mult *= 1.3;
    if (def.defending) mult *= 0.5;
    const raw = (A * power / 100 * 2 - Dv * 0.9) * variance * mult;
    info.dmg = Math.max(1, Math.round(raw));
    return info;
  }
  G.battle.computeDamage = computeDamage;

  function evades(att, def, skill) {
    if (skill.kind === 'heal' || skill.kind === 'buff' || skill.kind === 'bond' && false) return false;
    if (skill.noMiss) return false;
    return rnd() * 100 < (def.stats.eva || 0);
  }

  // ---------------------------------------------------------------- shields / break
  // Returns {broke:bool} after a weakness hit. Applies per hit.
  function applyShieldHit(target, token, amount) {
    if (!target.isEnemy || target.shieldMax <= 0 || target.broken) return { broke: false, weak: false };
    if (!token || !target.isWeakTo(token)) return { broke: false, weak: false };
    target.revealed[token] = true;
    target.shield = Math.max(0, target.shield - (amount || 1));
    if (target.shield <= 0) {
      target.broken = true; target.breakSkip = true; target.shield = 0;
      return { broke: true, weak: true };
    }
    return { broke: false, weak: true };
  }
  G.battle.applyShieldHit = applyShieldHit;

  // Recover from break at the start of the enemy's would-be turn
  function recoverFromBreak(u) {
    if (u.broken && u.breakSkip) { u.breakSkip = false; u.broken = false; u.shield = u.shieldMax; return true; }
    return false;
  }
  G.battle.recoverFromBreak = recoverFromBreak;

  // ---------------------------------------------------------------- healing / status helpers
  function healUnit(u, amount) {
    const before = u.hp;
    u.hp = clamp(u.hp + Math.round(amount), 0, u.mhp);
    if (u.hp > 0) u.alive = true;
    return u.hp - before;
  }
  function damageUnit(u, amount) {
    const before = u.hp;
    u.hp = clamp(u.hp - Math.round(amount), 0, u.mhp);
    u.dmgTaken += before - u.hp;
    if (u.hp <= 0) { u.alive = false; u.hp = 0; u.status = {}; u.defending = false; }
    if (u.hasStatus('sleep')) u.clearStatus('sleep');
    return before - u.hp;
  }
  G.battle.healUnit = healUnit;
  G.battle.damageUnit = damageUnit;

  // Turn-start status effects (poison / regen) and expiry. Returns list of event strings for presentation.
  function tickStatuses(u) {
    const ev = [];
    if (!u.alive) return ev;
    if (u.hasStatus('poison')) { const d = Math.max(1, Math.round(u.mhp * 0.08)); damageUnit(u, d); ev.push({ type: 'dmg', unit: u, amount: d, kind: 'poison' }); }
    if (u.alive && u.hasStatus('regen')) { const h = Math.max(1, Math.round(u.mhp * 0.08)); const got = healUnit(u, h); ev.push({ type: 'heal', unit: u, amount: got }); }
    for (const s of Object.keys(u.status)) { u.status[s]--; if (u.status[s] <= 0) delete u.status[s]; }
    return ev;
  }
  G.battle.tickStatuses = tickStatuses;

  // ---------------------------------------------------------------- BP / boost
  function gainBP(u) { if (u.side === 'party') u.bp = Math.min(MAX_BP, u.bp + 1); }
  G.battle.gainBP = gainBP;

  // ---------------------------------------------------------------- turn order
  // Speed used for ordering: defenders get +50%; spdup/spddown modify.
  function orderSpeed(u) {
    let s = u.stats.spd || 1;
    if (u.hasStatus('spdup')) s *= 1.3;
    if (u.hasStatus('spddown')) s *= 0.7;
    if (u.defendNext) s *= 1.5;
    return s;
  }
  // Build a round's order (array of units, alive only). Ties random.
  function buildOrder(units) {
    const alive = units.filter((u) => u.alive);
    const keyed = alive.map((u) => ({ u, k: orderSpeed(u) * (1 + (rnd() - 0.5) * 0.02) }));
    keyed.sort((a, b) => b.k - a.k);
    return keyed.map((x) => x.u);
  }
  G.battle.buildOrder = buildOrder;
  G.battle.orderSpeed = orderSpeed;

  // ---------------------------------------------------------------- targeting helpers
  function aliveOf(list) { return list.filter((u) => u.alive); }
  function tauntedBy(list) { return list.filter((u) => u.alive && u.hasStatus('taunt')); }

  // ---------------------------------------------------------------- enemy AI
  // Returns {skill, targets:[units], boost:0} or null
  function enemyDecide(unit, enemies, party, rng) {
    const r = rng || rnd;
    const pick = (arr) => arr[Math.floor(r() * arr.length)];
    // skill choice (weighted), basic attack weight 3
    const pool = [{ skill: null, weight: 3 }].concat((unit.def && unit.def.skills) || []);
    let total = 0; for (const e of pool) total += (e.weight || 1);
    let roll = r() * total, chosen = pool[0];
    for (const e of pool) { roll -= (e.weight || 1); if (roll <= 0) { chosen = e; break; } }
    const sk = chosen.skill ? skillDef(chosen.skill) : skillDef('e_basic');
    if (sk.cost && unit.sp < sk.cost) return { skill: skillDef('e_basic'), targets: [pick(aliveOf(party))].filter(Boolean) };
    if (unit.sp !== undefined && sk.cost) unit.sp -= sk.cost;
    const foes = aliveOf(party);
    if (!foes.length) return null;
    const taunt = tauntedBy(foes);
    let targets;
    switch (sk.target) {
      case 'all_allies': targets = aliveOf(enemies); break;
      case 'self': targets = [unit]; break;
      case 'one_ally': targets = [pick(aliveOf(enemies))]; break;
      case 'dead_ally': targets = [pick(enemies.filter((u) => !u.alive))].filter(Boolean); break;
      case 'all_enemies': targets = foes.slice(); break;
      case 'random_enemies': targets = [pick(foes), pick(foes), pick(foes)].slice(0, Math.max(1, sk.hits || 2)); break;
      default: {
        // one_enemy: taunt respected; sometimes prefer weak/low-HP
        if (taunt.length) targets = [taunt[0]];
        else if (r() < 0.35) targets = [foes.slice().sort((a, b) => a.hp - b.hp)[0]];
        else targets = [pick(foes)];
      }
    }
    return { skill: sk, targets: targets.filter(Boolean) };
  }
  G.battle.enemyDecide = enemyDecide;

  // ---------------------------------------------------------------- escape chance
  function escapeChance(partyUnits, enemyUnits) {
    const avg = (arr) => arr.reduce((s, u) => s + u.stats.spd, 0) / Math.max(1, arr.length);
    const ps = avg(aliveOf(partyUnits)), es = avg(aliveOf(enemyUnits));
    return clamp(0.5 + (ps - es) * 0.02, 0.2, 0.95);
  }
  G.battle.escapeChance = escapeChance;

  // ---------------------------------------------------------------- experience split (CONTRACT §5)
  // roster: members that fought: {id, alive, inReserve}
  function expSplit(total, members) {
    const shares = {};
    for (const m of members) {
      const w = m.alive && !m.reserve ? 1 : 0.5;
      shares[m.id] = w;
    }
    const sum = Object.values(shares).reduce((a, b) => a + b, 0) || 1;
    const out = {};
    for (const k in shares) out[k] = Math.max(1, Math.round(total * shares[k] / sum));
    return out;
  }
  G.battle.expSplit = expSplit;

  // Expose for the presentation part (below)
  G.battle._internal = {
    STATUSES, ELEMENTS, WTYPES, MAX_BP, MAX_BOOST, skillDef, enemyDef, itemDef, statusInfo, actorDef, actorState,
    actorStats, actorSkills, weaponTypesOf, tierOf, rnd, rint, pickR, clamp, aliveOf, tauntedBy, evades, orderSpeed,
  };
  G.battle._computeDamage = computeDamage;
  G.battle._evades = evades;
  // ---------------------------------------------------------------- action resolution (pure; no drawing)
  // action: {actor, kind:'attack'|'skill'|'item'|'defend'|'escape', skill?, weaponType?, targets?, boost?, item?}
  // ctx: {party:[units], enemies:[units], loot:[], onEvent?(ev)} ; returns events array (also pushed through ctx.onEvent)
  function emit(ctx, out, ev) { out.push(ev); if (ctx.onEvent) ctx.onEvent(ev); return ev; }

  function bondPartnerOk(actor, partnerId, ctx) {
    if (!partnerId) return true;
    const pu = ctx.party.find((u) => u.id === partnerId);
    return !!(pu && pu.alive);
  }

  function applyEffects(ctx, out, actor, target, skill) {
    for (const ef of (skill.effects || [])) {
      const who = ef.target === 'self' ? actor : target;
      if (!who || !who.alive) continue;
      if (ef.status === 'poison' && who.side === 'enemy' && who.def && who.def.resist && who.def.resist.indexOf('poison') >= 0) continue;
      if (rnd() <= (ef.chance == null ? 1 : ef.chance)) {
        who.addStatus(ef.status, ef.turns || 3);
        emit(ctx, out, { type: 'status', unit: who, status: ef.status, applied: true });
      }
    }
  }

  function strikeOnce(ctx, out, actor, target, skill, o) {
    if (!target || !target.alive) return null;
    if (!skill.noMiss && actor.side !== target.side && rnd() * 100 < (target.stats.eva || 0)) {
      emit(ctx, out, { type: 'miss', unit: target, actor });
      return { miss: true, dmg: 0 };
    }
    const info = computeDamage(actor, target, skill, { token: o.token, weaponType: o.weaponType, powerMul: o.powerMul });
    const wasBroken = target.broken;
    let broke = false;
    const token = o.token;
    if (token && target.side === 'enemy' && target.shieldMax > 0) {
      const sh = applyShieldHit(target, token, skill.shield == null ? 1 : skill.shield);
      if (sh.weak) info.weak = true;
      if (sh.broke) broke = true;
    }
    const taken = damageUnit(target, info.dmg);
    if (info.crit) emit(ctx, out, { type: 'crit', unit: target });
    emit(ctx, out, { type: 'hit', unit: target, actor, amount: taken, crit: info.crit, weak: info.weak, resist: info.resist, token, element: skill.element, skill, shownDmg: info.dmg, brokenBefore: wasBroken });
    if (broke) emit(ctx, out, { type: 'break', unit: target });
    if (!target.alive) emit(ctx, out, { type: 'death', unit: target });
    return { miss: false, dmg: taken, weak: info.weak, crit: info.crit, broke };
  }

  function resolveAction(ctx, action) {
    const out = [];
    const a = action.actor;
    if (!a || !a.alive) return out;
    const boost = clamp(action.boost || 0, 0, MAX_BOOST);
    if (action.kind === 'escape') {
      const ok = rnd() < escapeChance(ctx.party, ctx.enemies);
      emit(ctx, out, { type: ok ? 'escaped' : 'escapeFail', actor: a });
      return out;
    }
    if (action.kind === 'defend') {
      a.defending = true; a.defendNext = true;
      emit(ctx, out, { type: 'defend', unit: a });
      return out;
    }
    if (action.kind === 'item') {
      applyItem(ctx, out, a, action.item, action.targets && action.targets[0]);
      return out;
    }
    if (action.kind === 'attack') {
      const wt = action.weaponType || (a.weapons && a.weapons[0]) || 'sword';
      const hits = 1 + boost;
      for (let h = 0; h < hits; h++) {
        let t = (action.targets || [])[0];
        if (!t || !t.alive) t = ctx.foesOf(a).find((u) => u.alive);   // retarget if the chosen foe fell
        if (!t) break;
        strikeOnce(ctx, out, a, t, { kind: 'phys', power: 100, shield: 1, weapon: wt }, { token: wt, weaponType: wt });
      }
      return out;
    }
    if (action.kind === 'skill') {
      const sk = action.skill;
      if (sk.partner && !bondPartnerOk(a, sk.partner, ctx)) return out;
      if (sk.kind === 'bond' && sk.partner && G.romance && G.romance.bondTrickle) { try { G.romance.bondTrickle(sk.partner); } catch (e) { /* ignore */ } }
      const tier = sk.partner ? tierOf(sk.partner) : 0;
      const bondMul = sk.kind === 'bond' ? (1 + 0.15 * Math.max(0, tier - 2)) : 1;
      const multiTgt = sk.target === 'all_enemies' || sk.target === 'all_allies' || sk.target === 'random_enemies';
      let hits = sk.hits || 1, powerMul = bondMul * (1 + 0.5 * boost);
      if (multiTgt && hits > 1) { hits += boost; powerMul = bondMul; }
      const elem = sk.element || null;
      const isPhysKind = sk.kind === 'phys' || sk.kind === 'bond' || sk.kind === 'special' && !elem;
      let token = elem || (isPhysKind ? (action.weaponType || sk.weapon || (a.weapons && a.weapons[0]) || null) : null);
      const targets = (action.targets || []).filter(Boolean);
      const eff = { kind: sk.kind, power: sk.power || 100, element: elem, weapon: sk.weapon, shield: sk.shield, noMiss: sk.kind === 'heal' || sk.kind === 'buff' || sk.kind === 'bond' && false };
      if (sk.kind === 'heal') {
        for (const t of targets) {
          if (!t.alive && sk.special !== 'revive') continue;
          const amt = Math.round(a.stats.eatk * (sk.power || 100) / 100 * 1.5 * (1 + 0.5 * boost));
          if (sk.special === 'revive' && !t.alive) {
            t.alive = true; t.hp = Math.max(1, Math.round(t.mhp * 0.4)); t.status = {};
            emit(ctx, out, { type: 'revive', unit: t, actor: a });
            continue;
          }
          const got = healUnit(t, amt);
          emit(ctx, out, { type: 'heal', unit: t, amount: got, actor: a, skill: sk });
          applyEffects(ctx, out, a, t, sk);
        }
      } else if (sk.kind === 'buff' || sk.kind === 'debuff' || sk.kind === 'special' && (sk.special === 'provoke' || sk.special === 'cleanse' || sk.special === 'give_bp' || sk.special === 'steal' || sk.special === 'revive')) {
        if (sk.special === 'revive') {
          for (const t of targets) if (!t.alive) { t.alive = true; t.hp = Math.max(1, Math.round(t.mhp * 0.4)); t.status = {}; emit(ctx, out, { type: 'revive', unit: t, actor: a }); }
        } else if (sk.special === 'provoke') {
          a.addStatus('taunt', 2); a.addStatus('guard', 2);
          emit(ctx, out, { type: 'status', unit: a, status: 'taunt', applied: true });
        } else if (sk.special === 'cleanse') {
          for (const t of targets) {
            for (const s of ['poison', 'sleep', 'atkdown', 'defdown', 'spddown']) if (t.hasStatus(s)) { t.clearStatus(s); emit(ctx, out, { type: 'cleanse', unit: t, status: s }); }
          }
        } else if (sk.special === 'give_bp') {
          for (const t of targets) { if (t.side === 'party') { t.bp = Math.min(MAX_BP, t.bp + 1); emit(ctx, out, { type: 'bp', unit: t, n: 1 }); } }
        } else if (sk.special === 'steal') {
          const t = targets[0];
          if (t && t.alive && t.def && t.def.steal) {
            for (const s of t.def.steal) {
              if (t.stolen[s.item]) continue;
              if (rnd() < (s.chance || 0.2)) { t.stolen[s.item] = true; ctx.loot.push(s.item); emit(ctx, out, { type: 'steal', unit: t, item: s.item, actor: a }); break; }
            }
            if (!Object.keys(t.stolen).length) emit(ctx, out, { type: 'stealFail', unit: t, actor: a });
          }
        }
        for (const t of targets) { if (t && t.alive && sk.kind !== 'special') applyEffects(ctx, out, a, t, sk); }
        if (sk.kind === 'buff') { if (!targets.length) applyEffects(ctx, out, a, a, sk); }
        if (sk.kind === 'debuff' && !targets.length) { /* nothing */ }
      } else {
        // damage skills (phys/elem/bond): all_enemies = every hit strikes each target; random = one random foe per hit
        const foes = ctx.foesOf(a);
        for (let h = 0; h < hits; h++) {
          let list;
          if (sk.target === 'all_enemies') list = targets.filter((t) => t.alive);
          else if (sk.target === 'random_enemies') list = [pickR(foes.filter((t) => t.alive))].filter(Boolean);
          else { const f = targets.find((t) => t.alive) || foes.find((t) => t.alive); list = f ? [f] : []; }
          if (!list.length) break;
          for (const t of list) {
            const r = strikeOnce(ctx, out, a, t, eff, { token, weaponType: action.weaponType, powerMul });
            if (r && !r.miss) applyEffects(ctx, out, a, t, sk);
          }
        }
      }
      if (a.side === 'enemy' && sk.cost) { /* sp already spent by AI */ }
      if (a.side === 'party' && sk.cost) a.sp = Math.max(0, a.sp - sk.cost);
      emit(ctx, out, { type: 'skillUsed', actor: a, skill: sk, boost, bond: sk.kind === 'bond' });
      return out;
    }
    return out;
  }

  // Items (battle + menu): applies effect to the target (or actor if none)
  function applyItem(ctx, out, actor, itemId, target) {
    const it = itemDef(itemId);
    const t = target || actor;
    const ef = it.effect || {};
    if (ef.revive != null) {
      if (!t.alive) { t.alive = true; t.hp = Math.max(1, Math.round(t.mhp * ef.revive)); t.status = {}; emit(ctx, out, { type: 'revive', unit: t, actor }); }
    } else if (t.alive) {
      if (ef.hp) { const got = healUnit(t, ef.hp); emit(ctx, out, { type: 'heal', unit: t, amount: got, actor }); }
      if (ef.sp) { t.sp = Math.min(t.msp, t.sp + ef.sp); emit(ctx, out, { type: 'spHeal', unit: t, amount: ef.sp }); }
      if (ef.bp && t.side === 'party') { t.bp = Math.min(MAX_BP, t.bp + ef.bp); emit(ctx, out, { type: 'bp', unit: t, n: ef.bp }); }
      if (ef.cure) for (const s of ef.cure) if (t.hasStatus(s)) { t.clearStatus(s); emit(ctx, out, { type: 'cleanse', unit: t, status: s }); }
    }
    if (ctx.consumeItem) ctx.consumeItem(itemId);
    emit(ctx, out, { type: 'itemUsed', actor, item: itemId, target: t });
    return out;
  }
  G.battle.resolveAction = resolveAction;
  G.battle.applyItem = applyItem;
  G.battle.STATUSES = STATUSES;

  // ---------------------------------------------------------------- context & setup
  function makeCtx(party, enemies, onEvent) {
    return {
      party, enemies, loot: [], onEvent: onEvent || null,
      foesOf: (u) => (u.side === 'party' ? enemies : party),
      consumeItem: null,
    };
  }
  G.battle.makeCtx = makeCtx;

  function makePartyUnit(id) {
    const st = actorStats(id), sa = actorState(id), def = actorDef(id);
    const hp = (sa.hp == null || sa.hp <= 0) ? st.mhp : Math.min(sa.hp, st.mhp);
    const sp = sa.sp == null ? st.msp : Math.min(sa.sp, st.msp);
    return new BattleUnit({ side: 'party', id, name: def.name || id, level: sa.level || 1, stats: st, hp, sp,
      weapons: weaponTypesOf(id), skills: actorSkills(id) });
  }
  function makeEnemyUnit(eid) {
    const d = enemyDef(eid);
    const s = d.stats || {};
    const stats = { mhp: d.hp || 50, msp: 30, patk: s.patk || 5, pdef: s.pdef || 3, eatk: s.eatk || 5, edef: s.edef || 3, spd: s.spd || 5, crit: s.crit || 3, eva: s.eva || 3 };
    return new BattleUnit({ side: 'enemy', id: eid, name: d.name || eid, level: d.level || 1, stats, boss: d.boss,
      shields: d.shields || 0, weak: d.weak || [], resist: d.resist || [], skills: d.skills || [], def: d, scale: d.scale || 1 });
  }
  // Build battle units for a troop + party ids. Returns {party, enemies}
  function setupUnits(troopId, partyIds) {
    const t = (D().troops && D().troops[troopId]) || { id: troopId, enemies: ['moss_slime'] };
    const party = (partyIds || ['rowan']).slice(0, 4).map(makePartyUnit);
    const enemies = (t.enemies || []).slice(0, 5).map(makeEnemyUnit);
    return { party, enemies, troop: t };
  }
  G.battle.setupUnits = setupUnits;
  G.battle.makePartyUnit = makePartyUnit;
  G.battle.makeEnemyUnit = makeEnemyUnit;

  // ---------------------------------------------------------------- auto controller (sim + AI for party)
  // Chooses a party action using revealed/true weaknesses. Used by G.battleSim.
  function autoPartyAction(u, ctx) {
    const foes = ctx.enemies.filter((e) => e.alive);
    const allies = ctx.party.filter((p) => p.alive);
    if (!foes.length) return null;
    // 1) heal low ally
    const low = allies.slice().sort((a, b) => a.hp / a.mhp - b.hp / b.mhp)[0];
    const skills = u.skillsList.map(skillDef).filter((s) => (s.cost || 0) <= u.sp &&
      (!s.partner || allies.some((a) => a.id === s.partner)) && (s.kind !== 'bond' || tierOf(s.partner) >= 2));
    if (low && low.hp / low.mhp < 0.35) {
      const h = skills.find((s) => s.kind === 'heal' && s.target !== 'dead_ally');
      if (h) return { actor: u, kind: 'skill', skill: h, targets: h.target === 'all_allies' ? allies : [low], boost: 0 };
    }
    // 2) a revival if someone is down
    const dead = ctx.party.find((p) => !p.alive);
    if (dead) { const r = skills.find((s) => s.special === 'revive'); if (r) return { actor: u, kind: 'skill', skill: r, targets: [dead], boost: 0 }; }
    // 3) pick a foe: broken/weak-revealed first, else lowest hp
    const target = foes.slice().sort((a, b) => (a.shield - b.shield) || (a.hp / a.mhp - b.hp / b.mhp))[0];
    // 4) damage skill whose element/weapon matches a weakness (or best raw power)
    const knownWeak = (s) => {
      const tok = s.element || s.weapon;
      return tok && target.weak.indexOf(tok) >= 0;
    };
    const dmg = skills.filter((s) => s.kind !== 'heal' && s.kind !== 'buff' && s.kind !== 'debuff' && s.kind !== 'special' && s.target !== 'self' && s.target !== 'dead_ally' && s.target !== 'one_ally' && s.target !== 'all_allies');
    const bestSkill = dmg.filter(knownWeak).concat(dmg).sort((a, b) => (b.power * (b.hits || 1)) - (a.power * (a.hits || 1)))[0];
    const boost = Math.min(u.bp, MAX_BOOST, target.shield <= 1 ? 2 : (u.bp >= 4 ? 1 : 0));
    if (bestSkill && (knownWeak(bestSkill) || u.sp >= 40 || !u.weapons.length)) {
      const tg = bestSkill.target === 'all_enemies' ? foes : bestSkill.target === 'random_enemies' ? foes : [target];
      return { actor: u, kind: 'skill', skill: bestSkill, targets: tg, boost: Math.min(boost, u.bp), weaponType: bestSkill.weapon || null };
    }
    // 5) attack with weapon that hits a weakness (revealed or not, the sim knows the truth)
    const wt = u.weapons.find((w) => target.weak.indexOf(w) >= 0) || pickR(u.weapons.length ? u.weapons : ['sword']);
    return { actor: u, kind: 'attack', weaponType: wt, targets: [target], boost: Math.min(boost, u.bp) };
  }
  G.battle.autoPartyAction = autoPartyAction;

  // Spend BP for an action (party only). Returns the actual boost used.
  function spendBP(action) {
    const a = action.actor;
    if (a.side !== 'party') return 0;
    let boost = clamp(action.boost || 0, 0, MAX_BOOST);
    boost = Math.min(boost, a.bp);
    a.bp -= boost;
    if (action.kind === 'skill' && action.skill && action.skill.kind === 'bond') a.bp = Math.max(0, a.bp - 1);
    action.boost = boost;
    return boost;
  }
  G.battle.spendBP = spendBP;

  // Decide an enemy action (weighted AI); returns action object
  function enemyAction(u, ctx) {
    const dec = enemyDecide(u, ctx.enemies, ctx.party);
    if (!dec) return null;
    if (dec.skill && dec.skill.kind === 'heal') {
      const hurt = ctx.enemies.filter((e) => e.alive).sort((a, b) => a.hp / a.mhp - b.hp / b.mhp)[0];
      dec.targets = [hurt];
    }
    const sk = dec.skill;
    if (!sk || sk.id === 'e_basic') {
      return { actor: u, kind: 'attack', weaponType: 'sword', targets: dec.targets, boost: 0 };
    }
    return { actor: u, kind: 'skill', skill: sk, targets: dec.targets, boost: 0 };
  }
  G.battle.enemyAction = enemyAction;

  // ---------------------------------------------------------------- headless round runner (shared by sim)
  // Runs one round: builds order, processes each turn. Returns {events, over, result}
  function runRound(ctx, roundNo, onEvent) {
    const all = ctx.party.concat(ctx.enemies);
    const order = buildOrder(all);
    all.forEach((u) => { u.defendNext = false; });
    const events = [];
    const ev = (e) => { events.push(e); if (onEvent) onEvent(e); };
    const ctx2 = Object.assign({}, ctx, { onEvent: ev });
    for (const u of order) {
      if (!u.alive) continue;
      if (u.side === 'party') { u.defending = false; gainBP(u); }
      tickStatuses(u).forEach(ev);
      if (!u.alive) continue;
      if (u.broken) {                       // stunned: recovers after the skipped turn
        ev({ type: 'skipBreak', unit: u });
        u.broken = false; u.breakSkip = false; u.shield = u.shieldMax;
        ev({ type: 'recover', unit: u });
        continue;
      }
      if (u.hasStatus('sleep')) { ev({ type: 'asleep', unit: u }); continue; }
      const alive = ctx2.party.concat(ctx2.enemies).some((x) => x.alive && x.side === 'party') && ctx2.enemies.some((x) => x.alive);
      if (!alive) break;
      const act = u.side === 'party' ? autoPartyAction(u, ctx2) : enemyAction(u, ctx2);
      if (!act) continue;
      spendBP(act);
      ev({ type: 'turn', unit: u, action: act });
      resolveAction(ctx2, act);
      if (!ctx2.enemies.some((x) => x.alive)) break;
      if (!ctx2.party.some((x) => x.alive)) break;
    }
    return events;
  }
  G.battle.runRound = runRound;

  // Headless auto-play. Deterministic for a given seed. Does not touch G.state.
  // Returns {result:'win'|'lose'|'timeout', rounds, hpLeft:{id:hp}, events}
  function battleSim(troopId, partyIds, opts) {
    opts = opts || {};
    const seed = opts.seed != null ? opts.seed : (G.util ? G.util.hash(troopId + '|' + (partyIds || []).join(',')) : 1);
    const saved = rngFn;
    rngFn = (G.util && G.util.rng) ? G.util.rng(seed) : Math.random;
    let result = 'timeout', rounds = 0; const log = [];
    try {
      const s = setupUnits(troopId, partyIds);
      const ctx = makeCtx(s.party, s.enemies);
      for (rounds = 1; rounds <= (opts.maxRounds || 60); rounds++) {
        const evs = runRound(ctx, rounds);
        if (opts.log) log.push(...evs);
        if (!ctx.enemies.some((u) => u.alive)) { result = 'win'; break; }
        if (!ctx.party.some((u) => u.alive)) { result = 'lose'; break; }
      }
      const hpLeft = {}; ctx.party.forEach((u) => { hpLeft[u.id] = u.hp; });
      return { result, rounds, hpLeft, loot: ctx.loot.slice(), events: log };
    } finally { rngFn = saved; }
  }
  G.battleSim = function (troopId, partyIds, opts) { return battleSim(troopId, partyIds || ['rowan'], opts); };

  G.provide && G.provide('battle_logic');
})();
