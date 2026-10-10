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
      if (a.side === 'party') a.bp = Math.min(MAX_BP, a.bp + 1);
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

  // ================================================================ PRESENTATION
  // ---------------------------------------------------------------- soft gfx wrappers (fallbacks if gfx is absent)
  const GX = () => G.gfx || {};
  function gWindow(ctx, x, y, w, h, o) {
    if (GX().window) return GX().window(ctx, x, y, w, h, o);
    ctx.save(); ctx.fillStyle = 'rgba(16,30,84,0.92)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#cfe6ff'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); ctx.restore();
  }
  function gText(ctx, s, x, y, o) {
    o = o || {};
    if (GX().text) return GX().text(ctx, String(s), x, y, o);
    ctx.save(); ctx.font = (o.bold ? 'bold ' : '') + (o.size || 16) + 'px Trebuchet MS, Segoe UI, Arial, sans-serif';
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'top';
    ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText(String(s), x, y);
    ctx.fillStyle = o.color || '#fff'; ctx.fillText(String(s), x, y); ctx.restore();
  }
  function gTextW(s, size, bold) {
    if (GX().textWidth) return GX().textWidth(String(s), size || 16, bold);
    return String(s).length * (size || 16) * 0.55;
  }
  function gGauge(ctx, x, y, w, h, ratio, c1, c2, o) {
    if (GX().gauge) return GX().gauge(ctx, x, y, w, h, ratio, c1, c2, o);
    ctx.save(); ctx.fillStyle = '#1a0c24'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = c1 || '#7fd3ff'; ctx.fillRect(x, y, Math.round(w * clamp(ratio, 0, 1)), h); ctx.restore();
  }
  function gPips(ctx, x, y, n, max, color) {
    if (GX().pips) return GX().pips(ctx, x, y, n, max, color);
    ctx.save(); for (let i = 0; i < max; i++) { ctx.fillStyle = i < n ? color : '#333'; ctx.fillRect(x + i * 8, y, 6, 6); } ctx.restore();
  }
  function gIcon(ctx, name, x, y, size) {
    if (GX().icon) return GX().icon(ctx, name, x, y, size || 16);
    ctx.save(); ctx.fillStyle = '#9ad'; ctx.fillRect(x, y, size || 16, size || 16); ctx.restore();
  }
  function gFace(ctx, id, x, y, size, expr) {
    if (GX().drawFace) return GX().drawFace(ctx, id, x, y, size, expr);
    ctx.save(); ctx.fillStyle = (actorDef(id).color || '#ccc'); ctx.fillRect(x, y, size, size); ctx.restore();
  }
  function gBattler(ctx, id, pose, x, y, frame, opts) {
    if (GX().drawBattler) { try { return GX().drawBattler(ctx, id, pose, x, y, frame, opts); } catch (e) { /* fall through */ } }
    ctx.save(); ctx.fillStyle = (actorDef(id).color || '#ccc'); ctx.globalAlpha = 0.9;
    ctx.fillRect(Math.round(x - 14), Math.round(y - 56), 28, 56); ctx.restore();
  }
  function gEnemy(ctx, key, x, y, frame, opts) {
    if (GX().drawEnemy) { try { return GX().drawEnemy(ctx, key, x, y, frame, opts); } catch (e) { /* fall through */ } }
    ctx.save(); ctx.fillStyle = '#6a3c8a'; ctx.beginPath(); ctx.ellipse(x, y - 30, 30, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function gFx(ctx, name, x, y, t, o) {
    if (GX().drawFx) { try { return GX().drawFx(ctx, name, x, y, t, o); } catch (e) { /* fall */ } }
    ctx.save(); ctx.globalAlpha = 1 - t; ctx.strokeStyle = (o && o.color) || '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, 8 + t * 26, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  function gFxDur(name) { return GX().fxDuration ? GX().fxDuration(name) : 24; }
  function gShieldPips(ctx, x, y, n, max, broken) {
    if (GX().drawShieldPips) return GX().drawShieldPips(ctx, x, y, n, max, broken);
    gText(ctx, broken ? 'BREAK' : ('SH ' + n + '/' + max), x, y, { size: 11, color: broken ? '#ff8a8a' : '#cfe6ff' });
  }
  function gWeakIcons(ctx, x, y, weak, revealed) {
    if (GX().drawWeakIcons) return GX().drawWeakIcons(ctx, x, y, weak, revealed);
    let cx = x; for (const k of weak) { gText(ctx, revealed && revealed[k] ? k.slice(0, 2) : '?', cx, y, { size: 11, color: '#ffe38a' }); cx += 16; }
  }
  function gBg(key) {
    if (GX().battleBg) { try { return GX().battleBg(key); } catch (e) { /* fall */ } }
    return null;
  }
  function gCursor(ctx, x, y, frame) {
    if (GX().cursor) return GX().cursor(ctx, x, y, frame);
    ctx.save(); ctx.fillStyle = '#fff'; ctx.beginPath(); const b = Math.sin(frame / 6) * 2;
    ctx.moveTo(x + b, y); ctx.lineTo(x + b + 8, y + 5); ctx.lineTo(x + b, y + 10); ctx.fill(); ctx.restore();
  }
  function enemyIconCanvas(key) {
    const c = G.gfx && G.gfx.enemy ? G.gfx.enemy(key) : null;
    return c && c.width ? c : null;
  }

  // ---------------------------------------------------------------- layout (640x480)
  const LAY = {
    turnY: 6, turnH: 36,
    cmdX: 6, cmdY: 326, cmdW: 176, cmdH: 148,
    subX: 186, subW: 214,
    statX: 430, statY: 318, statW: 206, statH: 158, statRow: 39,
    tgtY: 280,
    partySlots: [[462, 300], [520, 266], [404, 262], [578, 232]],
  };
  function enemySlot(i, n) {
    // left side layouts by count (x,y = bottom centre)
    const layouts = {
      1: [[190, 272]],
      2: [[140, 288], [246, 258]],
      3: [[84, 288], [198, 290], [142, 236]],
      4: [[80, 290], [192, 292], [56, 244], [240, 240]],
      5: [[78, 290], [186, 292], [34, 246], [242, 244], [136, 234]],
    };
    const L = layouts[Math.min(5, Math.max(1, n))] || layouts[3];
    return L[Math.min(i, L.length - 1)];
  }
  // Pull enemy positions in toward centre for big enemies
  function enemyPos(u, i, n) {
    const s = enemySlot(i, n);
    const big = u.isBoss ? 1.0 : 0;
    return [s[0] + (big ? 10 : 0), s[1] + (big ? 6 : 0)];
  }
  G.battle._layout = { LAY, enemySlot, enemyPos };

  // Canvas text colours for damage numbers
  const DMG_COL = { normal: '#ffffff', weak: '#ffe04a', heal: '#7dffb0', crit: '#ffb347', poison: '#c77dff', resist: '#9aa4b8' };

  // ---------------------------------------------------------------- small helpers for the scene
  function cap(s) { return String(s).charAt(0).toUpperCase() + String(s).slice(1); }
  function wtFallback(u) { return (u.weapons && u.weapons[0]) || 'sword'; }
  // consumables usable in battle that the bag holds
  function usableItems() {
    const inv = (G.state && G.state.inventory) || {};
    return Object.keys(inv).filter((id) => inv[id] > 0 && (() => { const d = itemDef(id); return d.type === 'consumable' && (d.use === 'battle' || d.use === 'both'); })());
  }

  // ---------------------------------------------------------------- scene: BattleScene
  // Scene update() only pumps input/animation; the battle itself is an async coroutine (main()) using G.wait.
  function pace(n) { const f = (G.input && G.input.down && G.input.down('dash')) ? Math.max(1, Math.round(n / 3)) : n; return G.wait(f); }
  function sfx(n) { if (G.audio && G.audio.sfx) { try { G.audio.sfx(n); } catch (e) { /* audio locked */ } } }
  function shake(p, f) { if (G.fx && G.fx.doShake) G.fx.doShake(p, f); }
  function flash(c, f) { if (G.fx && G.fx.doFlash) G.fx.doFlash(c, f); }

  class BattleScene {
    constructor(params) {
      this.p = params || {};
      this.opts = this.p;
      this.opaque = true;
      this.t = 0;                       // frames since enter
      this.party = []; this.enemies = [];
      this.ctx = null;
      this.round = 0;
      this.order = []; this.preview = [];
      this.texts = []; this.fxs = []; this.banner = null; this.big = null;
      this.menu = null;                 // active input request {kind, ...}
      this.boost = 0;
      this.actor = null;
      this.halfDone = false;
      this.encounterT = -1;
      this.outcome = null;
      this.bgKey = this.p.bg || 'forest';
      this.result = null;
      this.onEnd = this.p.onEnd || null;
      this.ended = false;
      this.dimA = 0;
      this.stats = null;
    }
    // Called by G.scenes.push
    enter() {
      const troop = (D().troops && D().troops[this.p.troop]) || { bg: 'forest', bgm: 'battle' };
      this.troop = troop;
      this.bgKey = this.p.bg || troop.bg || 'forest';
      const bgm = this.p.bgm || troop.bgm || 'battle';
      const partyIds = (G.party && G.party.members) ? G.party.members() : (G.state.party || ['rowan']);
      const s = setupUnits(this.p.troop, partyIds);
      this.party = s.party; this.enemies = s.enemies;
      this.party.forEach((u, i) => { u.slot = i; });
      this.enemies.forEach((u, i) => { u.slot = i; u.dispHp = u.hp; u.enterOff = -140; });
      this.party.forEach((u) => { u.dispHp = u.hp; u.enterOff = 140; u.dispSp = u.sp; u.dispBp = u.bp; });
      this.ctx = makeCtx(this.party, this.enemies, null);
      this.ctx.consumeItem = (id) => { if (G.party && G.party.removeItem) G.party.removeItem(id, 1); };
      this.bgm = bgm;
      this.canEscape = this.p.canEscape !== false && !this.enemies.some((e) => e.isBoss);
      this.hasBoss = this.enemies.some((e) => e.isBoss);
      this.bgImg = gBg(this.bgKey);
      this.dimA = 0.85;
      this.lastLayout = true;
      if (G.audio && G.audio.playBgm) { try { G.audio.playBgm(bgm, { fade: 20 }); } catch (e) { /* ignore */ } }
      this.co = this.main().catch((e) => { console.error('[battle] error', e); this.finish('win'); });
    }
    exit() { this.ended = true; }

    // -------- timing helpers
    pace(n) { return pace(n); }
    // run an async script callback while this scene stays active
    runScript(fn) { if (!fn) return Promise.resolve(); return G.script.run(fn); }

    // -------- main coroutine
    async main() {
      await this.pace(10);
      await this.intro();
      if (this.p.intro) await this.runScript(this.p.intro);
      await this.pace(6);
      for (;;) {
        this.round++;
        const all = this.party.concat(this.enemies);
        this.order = buildOrder(all);
        all.forEach((u) => { u.defendNext = false; });
        this.preview = all.filter((u) => u.alive).sort((a, b) => orderSpeed(b) - orderSpeed(a));
        this.roundBanner = 'Round ' + this.round;
        await this.pace(12);
        this.roundBanner = null;
        for (let i = 0; i < this.order.length; i++) {
          const u = this.order[i];
          this.idx = i;
          if (!u.alive) continue;
          if (this.checkOver()) break;
          const cont = await this.turn(u);
          if (cont === 'escape') { this.finish('escape'); return; }
          if (this.checkOver()) break;
        }
        if (this.checkOver()) break;
      }
      if (this.party.some((u) => u.alive)) await this.victory();
      else await this.defeat();
    }

    checkOver() {
      return !this.enemies.some((u) => u.alive) || !this.party.some((u) => u.alive);
    }

    async intro() {
      sfx('encounter');
      this.encounterT = 0;
      await this.pace(8);
      // fade the enemies and party in, sliding
      this.introT = 0;
      await G.wait(0);
      await this.waitFrames(36, () => {
        const k = Math.min(1, this.introT / 30);
        this.enemies.forEach((u) => { u.enterOff = -140 * (1 - k); });
        this.party.forEach((u) => { u.enterOff = 140 * (1 - k); });
      });
      this.enemies.forEach((u) => { u.enterOff = 0; }); this.party.forEach((u) => { u.enterOff = 0; });
      this.encounterT = -1;
      await this.pace(10);
    }
    // waits n frames, calling fn each frame (independent of G.wait so draw/update stay in sync)
    async waitFrames(n, fn) {
      for (let i = 0; i < n; i++) {
        this.introT = i;
        if (fn) fn(i);
        await G.wait(1);
      }
    }

    // -------- one unit's turn
    async turn(u) {
      if (u.side === 'party') { u.defending = false; gainBP(u); u.dispBp = u.bp; }
      if (u.side === 'party') this.ensurePulse(u);
      this.current = u;
      const ticks = tickStatuses(u);
      for (const ev of ticks) await this.showEvent(ev, null);
      if (!u.alive) { this.current = null; return 'ok'; }
      if (u.broken) {
        this.addText(u, 'Stunned', '#ffd27a');
        await this.pace(24);
        u.broken = false; u.breakSkip = false; u.shield = u.shieldMax;
        this.addText(u, 'Recovered', '#cfe6ff');
        await this.pace(10);
        this.current = null; return 'ok';
      }
      if (u.hasStatus('sleep')) { this.addText(u, 'Asleep', '#c9b8ff'); await this.pace(14); this.current = null; return 'ok'; }
      let act;
      if (u.side === 'party') act = await this.playerCommand(u);
      else act = enemyAction(u, this.ctx);
      if (!act) { this.current = null; return 'ok'; }
      if (act.kind === 'escape') {
        const evs = resolveAction(this.ctx, act);
        const esc = evs.some((e) => e.type === 'escaped');
        await this.showEvent({ type: esc ? 'escaped' : 'escapeFail', actor: u }, null);
        await this.pace(20);
        this.current = null;
        return esc ? 'escape' : 'ok';
      }
      spendBP(act);
      this.current = u;
      await this.performAction(act);
      this.current = null;
      if (this.hasBoss && !this.halfDone) {
        const boss = this.enemies.find((e) => e.isBoss && e.alive);
        if (boss && boss.hp <= boss.mhp / 2) {
          this.halfDone = true;
          await this.pace(10);
          await this.runScript(this.p.onHalf);
        }
      }
      return 'ok';
    }
    ensurePulse(u) { u.pulse = 0; }

    // -------- input requests (resolved from update())
    // list menu: returns chosen item.value or null (cancel). Items: {label, value, enabled, desc, right, icon, color}
    menuPick(spec) {
      return new Promise((resolve) => {
        this.menu = Object.assign({ kind: 'list', cursor: 0, scroll: 0, items: [], resolve, ready: 2 }, spec);
        this.menu.cursor = Math.max(0, (spec.items || []).findIndex((i) => i.enabled !== false));
      });
    }
    // target picker: candidates = array of units; returns unit or null
    targetPick(cands, spec) {
      return new Promise((resolve) => {
        const sorted = cands.slice();
        this.menu = Object.assign({ kind: 'target', cands: sorted, cursor: 0, resolve, ready: 2 }, spec || {});
        // default to a foe with a revealed weakness matching the weapon, else first
        const tok = spec && spec.token;
        const good = tok ? sorted.findIndex((u) => u.weak.indexOf(tok) >= 0) : -1;
        this.menu.cursor = good >= 0 ? good : 0;
      });
    }
    closeMenu() { this.menu = null; }

    // -------- screen positions
    posOf(u) {
      const L = LAY;
      let x, y;
      if (u.side === 'party') {
        const s = L.partySlots[Math.min(u.slot, L.partySlots.length - 1)];
        x = s[0]; y = s[1];
        x += (u.enterOff || 0);
      } else {
        const n = this.enemies.length;
        const p = enemyPos(u, u.slot, n);
        x = p[0]; y = p[1];
        x += (u.enterOff || 0);
      }
      x += (u.lx || 0) + (u.shk ? (rnd() * 2 - 1) * u.shk : 0);
      y += (u.ly || 0);
      return { x: Math.round(x), y: Math.round(y), h: this.heightOf(u) };
    }
    heightOf(u) {
      if (u.side === 'party') return 64;
      const cv = enemyIconCanvas(u.id);
      return cv ? Math.round(cv.height * (u.scale || 1)) : 60;
    }

    // -------- floating text / fx spawning
    addNum(u, amount, kind, big) {
      const p = this.posOf(u);
      const color = kind === 'heal' ? DMG_COL.heal : kind === 'crit' ? DMG_COL.crit : kind === 'weak' ? DMG_COL.weak : kind === 'poison' ? DMG_COL.poison : DMG_COL.normal;
      this.texts.push({ s: String(amount), x: p.x + (rnd() * 20 - 10), y: p.y - p.h - 6, t: 0, life: 52, color, size: big ? 24 : 18, big: !!big });
    }
    addText(u, s, color) {
      const p = this.posOf(u);
      this.texts.push({ s, x: p.x, y: p.y - p.h - 6, t: 0, life: 46, color: color || '#fff', size: 15, big: false, label: true });
    }
    spawnFx(name, u, o) {
      if (!u) return;
      const p = this.posOf(u);
      this.fxs.push({ name, x: p.x, y: p.y - (u.side === 'party' ? 34 : Math.round(p.h * 0.5)), f: 0, dur: gFxDur(name), big: !!(o && o.big), color: o && o.color });
    }

    // Skill name banner
    showBanner(text, color) { this.banner = { text, t: 0, life: 60, color: color || '#ffffff' }; }

    // -------- player/enemy action presentation
    async performAction(act) {
      const u = act.actor;
      if (act.kind === 'defend') {
        u.defending = true; u.defendNext = true;
        u.posing = 'defend';
        const evs = resolveAction(this.ctx, act);
        for (const e of evs) await this.showEvent(e, act);
        await this.pace(10);
        u.posing = null;
        return;
      }
      // banner for skills/items
      if (act.kind === 'skill') {
        const sk = act.skill;
        if (sk.kind === 'bond' && sk.partner) {
          const pn = (actorDef(sk.partner).name || sk.partner);
          this.showBanner('Kindled Link - ' + pn + '!', '#ffb3d1');
        } else this.showBanner(sk.name, sk.kind === 'bond' ? '#ffb3d1' : '#ffffff');
      } else if (act.kind === 'item') this.showBanner(itemDef(act.item).name, '#c9ffd9');
      else if (act.kind === 'attack') this.showBanner(cap(act.weaponType || 'Attack'), '#e8f1ff');

      const tgt = (act.targets || []).find((t) => t && t.alive) || (act.targets || [])[0] || null;
      const evs = resolveAction(this.ctx, act);
      const isAtk = act.kind === 'attack' || (act.kind === 'skill' && (act.skill.kind === 'phys' || act.skill.kind === 'elem' || act.skill.kind === 'bond'));
      const pose = isAtk ? 'attack' : 'cast';
      if (act.kind === 'skill' && act.skill.kind === 'bond' && act.skill.partner) {
        const pu = this.party.find((p) => p.id === act.skill.partner);
        if (pu) this.stepForward(pu, u, 'cast');
      }
      const lunging = (isAtk && tgt && u.side === 'party' && act.kind !== 'item') || (act.kind === 'attack' && u.side === 'enemy');
      if (lunging && tgt) await this.lunge(u, tgt);
      else { u.posing = pose; if (act.kind !== 'item') await this.pace(6); }
      // cast/heal visual at actor
      if (pose === 'cast' && act.kind === 'skill') { this.spawnFx(act.skill.anim || 'buff', act.skill.target === 'self' ? u : (tgt || u), { big: act.skill.kind === 'bond' }); }
      for (const e of evs) await this.showEvent(e, act);
      if (lunging && tgt) await this.lungeBack(u);
      u.posing = null;
      await this.pace(8);
      if (this.banner) { this.banner.t = this.banner.life - 14; }
    }
    // step a unit toward a target and hold until stepBack
    async lunge(u, tgt) {
      const a = this.posOf(u), b = this.posOf(tgt);
      const dir = u.side === 'party' ? -1 : 1;
      u.posing = 'attack';
      const dx = Math.round((b.x - a.x) * 0.55) + dir * 16 * (u.side === 'party' ? 1 : -1) * 0 , dy = Math.round((b.y - a.y) * 0.18);
      for (let i = 1; i <= 8; i++) { u.lx = (dx * i) / 8; u.ly = (dy * i) / 8; await G.wait(1); }
      u.lxImpact = u.lx; u.lyImpact = u.ly;
    }
    async lungeBack(u) {
      const dx = u.lx || 0, dy = u.ly || 0;
      for (let i = 7; i >= 0; i--) { u.lx = (dx * i) / 8; u.ly = (dy * i) / 8; await G.wait(1); }
      u.lx = 0; u.ly = 0;
    }
    // side step for partners in bond skills
    stepForward(pu, _target, pose) {
      pu.posing = pose || 'cast';
      pu.lx = (pu.slot === 0 ? -20 : -14); pu.ly = -6;
      G.wait(30).then(() => { pu.lx = 0; pu.ly = 0; pu.posing = null; });
    }

    // Visuals for a single resolved event. Awaits pacing so the sequence reads well.
    async showEvent(ev, act) {
      const skAnim = act && act.kind === 'skill' ? (act.skill.anim || null) : null;
      const weapAnim = act && act.kind === 'attack' ? (ev.unit ? ({ sword: 'slash', spear: 'pierce', dagger: 'pierce', axe: 'blunt', bow: 'arrow', staff: 'blunt' })[act.weaponType] || 'slash' : 'slash') : null;
      switch (ev.type) {
        case 'hit': {
          const u = ev.unit;
          const anim = ev.element && skAnim ? (skAnim) : (skAnim || weapAnim || 'slash');
          const fxName = ev.element ? (ELEMENT_FX[ev.element] || anim) : anim;
          this.spawnFx(fxName, u, { big: ev.crit });
          u.hurt = 16; u.flashA = 1; if (u.side === 'enemy') u.shk = 4;
          this.addNum(u, ev.amount, ev.crit ? 'crit' : (ev.weak ? 'weak' : 'normal'), ev.crit);
          if (ev.crit) { flash('#ffffff', 6); shake(3, 8); sfx('crit'); } else sfx('hit');
          if (ev.weak && !ev.crit) sfx('hit');
          await this.pace(12);
          return;
        }
        case 'miss': this.addText(ev.unit, 'Miss', '#dfe6ff'); sfx('cursor'); await this.pace(12); return;
        case 'break': {
          const u = ev.unit;
          this.spawnFx('break', u, { big: true });
          this.big = { text: 'BREAK!', t: 0, life: 70, color: '#8fe6ff' };
          u.shk = 6; shake(7, 26); flash('#cfeaff', 14); sfx('break');
          await this.pace(40);
          return;
        }
        case 'death': {
          const u = ev.unit;
          if (u.side === 'enemy') { u.dying = 40; sfx('hit'); }
          else { u.posing = null; }
          await this.pace(14); return;
        }
        case 'heal': {
          this.spawnFx('heal', ev.unit);
          this.addNum(ev.unit, ev.amount, 'heal');
          sfx('heal'); await this.pace(16); return;
        }
        case 'dmg': { // poison tick
          this.addNum(ev.unit, ev.amount, 'poison');
          ev.unit.hurt = 10; sfx('hit'); await this.pace(14); return;
        }
        case 'status': {
          const info = statusInfo(ev.status);
          const buff = info.buff || /up$|regen/.test(ev.status);
          this.addText(ev.unit, info.name || ev.status, buff ? '#9fe6ff' : '#d9a6ff');
          this.spawnFx(buff ? 'buff' : 'debuff', ev.unit);
          sfx(buff ? 'buff' : 'debuff'); await this.pace(14); return;
        }
        case 'revive': this.spawnFx('heal', ev.unit, { big: true }); this.addText(ev.unit, 'Revived!', '#7dffb0'); sfx('heal'); await this.pace(22); return;
        case 'cleanse': this.addText(ev.unit, 'Cleansed', '#bdf7ff'); this.spawnFx('buff', ev.unit); await this.pace(12); return;
        case 'bp': this.addText(ev.unit, '+' + ev.n + ' BP', '#ffd86b'); sfx('buff'); await this.pace(12); return;
        case 'spHeal': this.addText(ev.unit, '+' + ev.amount + ' SP', '#8fd6ff'); sfx('heal'); await this.pace(12); return;
        case 'steal': this.addText(ev.unit, 'Stole ' + itemDef(ev.item).name + '!', '#ffe38a'); sfx('coin'); await this.pace(26); return;
        case 'stealFail': this.addText(ev.unit, 'Nothing!', '#cfcfcf'); await this.pace(12); return;
        case 'itemUsed': sfx('heal'); await this.pace(10); return;
        case 'defend': this.addText(ev.unit, 'Defend', '#cfe6ff'); await this.pace(10); return;
        case 'escaped': this.big = { text: 'Escaped!', t: 0, life: 50, color: '#ffffff' }; sfx('escape'); await this.pace(40); return;
        case 'escapeFail': this.addText(ev.actor, 'Failed!', '#ffffff'); sfx('buzzer'); await this.pace(18); return;
        default: return;
      }
    }

    // -------- end of battle
    finish(result, o) {
      if (this.ended) return;
      this.ended = true;
      this.result = result;
      const cb = this.onEnd;
      if (o && o.gameover) { G.scenes.replace('gameover', {}); }
      else { G.scenes.pop(); }
      if (typeof cb === 'function') { try { cb(result); } catch (e) { console.error('[battle] onEnd', e); } }
    }
    ackPress() { return new Promise((res) => { this.menu = { kind: 'ack', resolve: res, ready: 8 }; }); }

    async victory() {
      this.party.forEach((u) => { if (u.alive) u.posing = 'win'; });
      if (G.audio && G.audio.jingle) { try { G.audio.jingle('victory'); } catch (e) { /* ignore */ } }
      this.big = { text: 'VICTORY!', t: 0, life: 110, color: '#ffe38a' };
      await this.pace(90);
      const roster = (G.state.roster || {});
      const ids = this.party.map((u) => u.id);
      const reserve = Object.keys(roster).filter((id) => ids.indexOf(id) < 0);
      const fought = this.party.map((u) => ({ id: u.id, alive: u.alive, reserve: false }));
      const members = fought.concat(reserve.map((id) => ({ id, alive: true, reserve: true })));
      const totalExp = this.enemies.reduce((s, e) => s + ((e.def && e.def.exp) || 5), 0);
      const shares = expSplit(totalExp, members);
      const gold = this.enemies.reduce((s, e) => s + ((e.def && e.def.gold) || 0), 0);
      const drops = [];
      for (const e of this.enemies) {
        for (const d of ((e.def && e.def.drops) || [])) if (rnd() < (d.chance == null ? 0.2 : d.chance)) drops.push(d.item);
      }
      for (const it of this.ctx.loot) drops.push(it);
      const levelups = [];
      for (const m of members) {
        const gain = shares[m.id] || 0;
        let r = [];
        if (G.party && G.party.gainExp) { try { r = G.party.gainExp(m.id, gain) || []; } catch (e) { r = []; } }
        if (r.length) levelups.push({ id: m.id, list: r });
      }
      // write back HP/SP (dead party members come back with 1 HP after the fight)
      for (const u of this.party) {
        const rr = roster[u.id]; if (!rr) continue;
        rr.hp = Math.max(1, u.hp); rr.sp = u.sp;
      }
      for (const id of Object.keys(roster)) {
        const rr = roster[id]; const st = G.party && G.party.stats ? G.party.stats(id) : null;
        if (st) rr.sp = Math.min(st.msp, (rr.sp || 0) + Math.ceil(st.msp * 0.1));
      }
      G.state.gold = (G.state.gold || 0) + gold;
      for (const it of drops) { if (G.party && G.party.addItem) G.party.addItem(it, 1); }
      G.state.battles = (G.state.battles || 0) + 1;
      this.result = { exp: shares, gold, drops, levelups };
      this.resultView = { t: 0, phase: 'rewards' };
      this.big = null;
      await this.ackPress();
      for (const lv of levelups) {
        for (const l of lv.list) {
          this.levelView = { id: lv.id, level: l.level, learned: l.learned || [] };
          if (G.audio && G.audio.sfx) sfx('levelup');
          await this.ackPress();
        }
      }
      this.levelView = null; this.resultView = null;
      if (this.p.outro) await this.runScript(this.p.outro);
      this.finish('win');
    }
    async defeat() {
      this.party.forEach((u) => { u.posing = 'dead'; });
      this.big = { text: 'DEFEATED', t: 0, life: 110, color: '#ff9b9b' };
      await this.pace(100);
      if (this.p.loseOk) {
        if (G.party && G.party.healAll) G.party.healAll();
        this.finish('lose');
      } else {
        this.finish('lose', { gameover: true });
      }
    }

    // -------- drawing
    partyPose(u) {
      if (!u.alive) return 'dead';
      if (u.posing) return u.posing;
      if (u.hurt > 0) return 'hurt';
      if (u.defending) return 'defend';
      if (u.hp / u.mhp < 0.25) return 'weak';
      return 'idle';
    }
    draw(ctx) {
      const frame = G.frame | 0;
      ctx.save();
      // background
      if (this.bgImg) ctx.drawImage(this.bgImg, 0, 0, G.W, G.H);
      else { const g = ctx.createLinearGradient(0, 0, 0, G.H); g.addColorStop(0, '#2b3d6e'); g.addColorStop(1, '#14182c'); ctx.fillStyle = g; ctx.fillRect(0, 0, G.W, G.H); }
      // enemies back-to-front
      const eList = this.enemies.filter((e) => e.alive || e.dying > 0).map((e) => ({ u: e, p: this.posOf(e) })).sort((a, b) => a.p.y - b.p.y);
      for (const { u, p } of eList) {
        const alpha = u.alive ? 1 : Math.max(0, u.dying / 40);
        gEnemy(ctx, u.id, p.x, p.y, frame, { flash: u.flashA || 0, alpha, scale: u.scale || 1 });
      }
      for (const { u, p } of eList) if (u.alive) this.drawEnemyHud(ctx, u, p);
      // party back-to-front
      const pList = this.party.map((u) => ({ u, p: this.posOf(u) })).sort((a, b) => a.p.y - b.p.y);
      for (const { u, p } of pList) {
        gBattler(ctx, u.id, this.partyPose(u), p.x, p.y, frame, { flash: u.flashA || 0, alpha: u.alive ? 1 : 0.7 });
      }
      // active-member marker
      if (this.actor && this.actor.alive && this.menu && this.menu.kind !== 'ack') {
        const ap = this.posOf(this.actor);
        const bob = Math.round(Math.sin(frame / 5) * 2);
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(ap.x - 6, ap.y - 80 + bob); ctx.lineTo(ap.x + 6, ap.y - 80 + bob); ctx.lineTo(ap.x, ap.y - 72 + bob); ctx.fill();
      }
      // target marker
      if (this.menu && this.menu.kind === 'target' && this.menu.cands.length) {
        const t = this.menu.cands[this.menu.cursor];
        if (t) {
          const p = this.posOf(t);
          const blink = (frame % 24) < 14 ? 1 : 0.45;
          const y0 = p.y - p.h - 22 + Math.round(Math.sin(frame / 4) * 2);
          ctx.globalAlpha = blink; ctx.fillStyle = t.side === 'party' ? '#8fe0ff' : '#ffe38a';
          ctx.beginPath(); ctx.moveTo(p.x - 7, y0 - 8); ctx.lineTo(p.x + 7, y0 - 8); ctx.lineTo(p.x, y0); ctx.fill(); ctx.globalAlpha = 1;
        }
      }
      // effects & texts
      for (const f of this.fxs) gFx(ctx, f.name, f.x, f.y, Math.min(1, f.f / f.dur), { big: f.big, color: f.color });
      for (const x of this.texts) {
        const a = x.t > x.life - 14 ? Math.max(0, (x.life - x.t) / 14) : 1;
        ctx.globalAlpha = a;
        gText(ctx, x.s, Math.round(x.x), Math.round(x.y), { size: x.big ? 26 : (x.label ? 14 : x.size || 18), color: x.color, bold: x.big, align: 'center' });
        ctx.globalAlpha = 1;
      }
      this.drawBanners(ctx, frame);
      this.drawTurnBar(ctx, frame);
      this.drawWindows(ctx, frame);
      ctx.restore();
    }
    drawEnemyHud(ctx, u, p) {
      const nameY = Math.max(46, p.y - p.h - 14);
      const label = u.name + (u.isBoss ? '' : '');
      gText(ctx, label, p.x, nameY, { size: 11, bold: true, align: 'center', color: u.isBoss ? '#ffd27a' : '#ffffff' });
      // HP gauge (always shown for bosses; others when damaged or revealed)
      if (u.isBoss || u.hp < u.mhp || Object.keys(u.revealed).length) {
        gGauge(ctx, p.x - 26, nameY + 14, 52, 4, (u.dispHp || 0) / u.mhp, '#ff7a86', '#b3263a', { bg: '#1a0c24' });
      }
      // shield pips & weakness icons under the feet
      if (u.shieldMax > 0) gShieldPips(ctx, p.x - u.shieldMax * 5, p.y + 6, u.shield, u.shieldMax, u.broken);
      if (u.weak && u.weak.length) gWeakIcons(ctx, p.x - u.weak.length * 8, p.y + 18, u.weak, u.revealed);
    }
    drawBanners(ctx, frame) {
      if (this.banner) {
        const b = this.banner;
        const a = b.t < 8 ? b.t / 8 : (b.t > b.life - 10 ? Math.max(0, (b.life - b.t) / 10) : 1);
        const w = Math.max(160, gTextW(b.text, 18, true) + 40);
        ctx.globalAlpha = a;
        gWindow(ctx, 320 - w / 2, 54, w, 30, { style: 'dark', alpha: 0.9 });
        gText(ctx, b.text, 320, 60, { size: 18, bold: true, align: 'center', color: b.color });
        ctx.globalAlpha = 1;
      }
      if (this.roundBanner) gText(ctx, this.roundBanner, 630, 46, { size: 12, align: 'right', color: '#cfe6ff' });
      if (this.big) {
        const b = this.big;
        const pop = b.t < 10 ? 1 + (10 - b.t) * 0.04 : 1;
        const a = b.t > b.life - 16 ? Math.max(0, (b.life - b.t) / 16) : 1;
        ctx.globalAlpha = a;
        gText(ctx, b.text, 320, 190 - Math.round((pop - 1) * 40), { size: Math.round(40 * pop), bold: true, align: 'center', color: b.color });
        ctx.globalAlpha = 1;
      }
      if (this.encounterT >= 0) {
        const a = Math.min(1, this.encounterT / 16);
        ctx.globalAlpha = a * 0.55; ctx.fillStyle = '#000'; ctx.fillRect(0, 170, G.W, 80); ctx.globalAlpha = 1;
        gText(ctx, 'Encounter!', 320, 186, { size: 34, bold: true, align: 'center', color: '#ffe38a' });
      }
    }
    drawTurnBar(ctx, frame) {
      gWindow(ctx, 4, 4, 632, 40, { style: 'dark', alpha: 0.7 });
      let x = 12;
      const cur = this.order.slice(this.idx || 0).filter((u) => u.alive).slice(0, 9);
      cur.forEach((u, i) => { const s = i === 0 ? 34 : 28; this.drawTurnIcon(ctx, u, x, 9 + (34 - s) / 2, s, i === 0, frame); x += s + 4; });
      x += 8;
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, 10, 2, 28); ctx.restore(); x += 12;
      const nxt = this.preview.slice(0, 9);
      nxt.forEach((u) => { this.drawTurnIcon(ctx, u, x, 17, 18, false, frame, true); x += 20; });
    }
    drawTurnIcon(ctx, u, x, y, s, active, frame, small) {
      ctx.save();
      ctx.globalAlpha = small ? 0.7 : 1;
      ctx.fillStyle = '#0b0f1f'; ctx.fillRect(x - 1, y - 1, s + 2, s + 2);
      const border = u.side === 'party' ? '#6ec5ff' : '#ff6b6b';
      ctx.fillStyle = active ? '#ffe38a' : border; ctx.fillRect(x - 2, y - 2, s + 4, 2); ctx.fillRect(x - 2, y + s, s + 4, 2);
      ctx.fillRect(x - 2, y - 2, 2, s + 4); ctx.fillRect(x + s, y - 2, 2, s + 4);
      if (u.side === 'party') gFace(ctx, u.id, x, y, s);
      else {
        const cv = enemyIconCanvas(u.id);
        ctx.fillStyle = '#2a1830'; ctx.fillRect(x, y, s, s);
        if (cv) { const k = Math.min(s / cv.width, s / cv.height); const w = cv.width * k, h = cv.height * k; ctx.drawImage(cv, x + (s - w) / 2, y + (s - h) / 2, w, h); }
      }
      ctx.restore();
    }
    drawWindows(ctx, frame) {
      const L = LAY;
      // result / level windows take the whole middle
      if (this.resultView && this.result && this.result.levelups !== undefined && !this.levelView) {
        this.drawRewards(ctx);
        return;
      }
      if (this.levelView) { this.drawLevel(ctx); return; }
      const m = this.menu;
      // party status panel (always)
      this.drawStatus(ctx);
      if (!m) return;
      if (m.kind === 'list') {
        if (m.mode === 'cmd') {
          gWindow(ctx, L.cmdX, L.cmdY, L.cmdW, L.cmdH, { style: 'blue', alpha: 0.92 });
          gText(ctx, m.title || '', L.cmdX + 12, L.cmdY + 8, { size: 13, bold: true, color: '#e6f3ff' });
          gText(ctx, 'BOOST ' + this.boost, L.cmdX + L.cmdW - 12, L.cmdY + 8, { size: 13, align: 'right', color: this.boost ? '#ffd86b' : '#8fa6c8' });
          m.items.forEach((it, i) => {
            const y = L.cmdY + 30 + i * 22;
            const col = it.enabled === false ? '#6d7a96' : '#ffffff';
            if (i === m.cursor) gCursor(ctx, L.cmdX + 6, y + 3, frame);
            gText(ctx, it.label, L.cmdX + 22, y, { size: 15, color: col });
          });
          this.drawInfo(ctx, m.items[m.cursor] ? m.items[m.cursor].desc : '');
        } else {
          this.drawSubList(ctx, m, frame);
        }
      } else if (m.kind === 'target') {
        this.drawTargetInfo(ctx, m);
      }
    }
    drawInfo(ctx, text) {
      gWindow(ctx, 6, 280, 420, 40, { style: 'dark', alpha: 0.85 });
      gText(ctx, text || '', 16, 290, { size: 13, color: '#e8f1ff', maxWidth: 400 });
    }
    drawSubList(ctx, m, frame) {
      const x = LAY.subX, y = LAY.cmdY, w = LAY.subW, h = LAY.cmdH;
      gWindow(ctx, x, y, w, h, { style: 'blue', alpha: 0.92 });
      gText(ctx, m.title || '', x + 12, y + 8, { size: 13, bold: true, color: '#e6f3ff' });
      const rows = 6, rowH = 20, top = y + 28;
      if (m.cursor < m.scroll) m.scroll = m.cursor;
      if (m.cursor >= m.scroll + rows) m.scroll = m.cursor - rows + 1;
      for (let r = 0; r < rows; r++) {
        const i = m.scroll + r; const it = m.items[i]; if (!it) break;
        const ry = top + r * rowH;
        const col = it.enabled === false ? '#6d7a96' : (it.color || '#ffffff');
        if (i === m.cursor) gCursor(ctx, x + 6, ry + 3, frame);
        gText(ctx, it.label, x + 22, ry, { size: 14, color: col });
        if (it.right) gText(ctx, it.right, x + w - 12, ry + 1, { size: 12, align: 'right', color: it.enabled === false ? '#6d7a96' : '#cfe6ff' });
      }
      if (m.items.length > rows) gText(ctx, (m.cursor + 1) + '/' + m.items.length, x + w - 12, y + h - 18, { size: 10, align: 'right', color: '#8fa6c8' });
      const cur = m.items[m.cursor];
      this.drawInfo(ctx, cur ? (cur.desc || '') : '');
    }
    drawTargetInfo(ctx, m) {
      const t = m.cands[m.cursor];
      gWindow(ctx, 6, 280, 420, 40, { style: 'dark', alpha: 0.85 });
      if (!t) return;
      gText(ctx, (m.label ? m.label + ' > ' : '') + t.name, 16, 288, { size: 14, bold: true, color: t.side === 'party' ? '#bfeaff' : '#ffffff' });
      if (t.side === 'enemy') {
        if (t.shieldMax > 0) gShieldPips(ctx, 16, 306, t.shield, t.shieldMax, t.broken);
        gWeakIcons(ctx, 110, 306, t.weak, t.revealed);
      } else {
        gText(ctx, 'HP ' + t.hp + '/' + t.mhp, 16, 306, { size: 11, color: '#cfe6ff' });
      }
    }
    drawStatus(ctx) {
      const L = LAY;
      gWindow(ctx, L.statX, L.statY, L.statW, L.statH, { style: 'blue', alpha: 0.92 });
      this.party.forEach((u, i) => {
        const y = L.statY + 6 + i * L.statRow;
        gFace(ctx, u.id, L.statX + 6, y + 2, 32);
        const nameCol = u.alive ? '#ffffff' : '#7d7d8c';
        gText(ctx, u.name, L.statX + 44, y, { size: 13, bold: true, color: nameCol });
        gPips(ctx, L.statX + 130, y + 5, u.bp, MAX_BP, '#ffd86b');
        gText(ctx, 'BP', L.statX + 124, y + 1, { size: 9, align: 'right', color: '#ffd86b' });
        const hpR = u.alive ? clamp((u.dispHp || 0) / u.mhp, 0, 1) : 0;
        gText(ctx, 'HP', L.statX + 44, y + 14, { size: 10, color: '#e6f3ff' });
        gText(ctx, u.alive ? String(Math.round(u.dispHp || 0)) + '/' + u.mhp : 'KO', L.statX + L.statW - 8, y + 14, { size: 11, align: 'right', color: u.alive ? '#ffffff' : '#ff9b9b' });
        gGauge(ctx, L.statX + 44, y + 26, 156, 5, hpR, hpR > 0.5 ? '#6cf0a0' : hpR > 0.25 ? '#ffd27a' : '#ff7a86', '#1f6b4a', { bg: '#0d1733' });
        gText(ctx, 'SP', L.statX + 44, y + 32, { size: 9, color: '#bfe6ff' });
        const spR = u.msp ? clamp((u.dispSp || 0) / u.msp, 0, 1) : 0;
        gGauge(ctx, L.statX + 62, y + 35, 138, 3, spR, '#7fc8ff', '#2a5fa0', { bg: '#0d1733' });
      });
    }
    drawRewards(ctx) {
      const r = this.result; if (!r) return;
      gWindow(ctx, 150, 120, 340, 230, { style: 'blue', alpha: 0.94 });
      gText(ctx, 'Battle Results', 320, 132, { size: 16, bold: true, align: 'center', color: '#ffe38a' });
      const lines = [];
      lines.push('EXP  ' + this.party.map((u) => u.name + ' +' + (r.exp[u.id] || 0)).join('   '));
      lines.push('Benched members earn half the EXP.');
      lines.push('Gold  +' + r.gold);
      const drops = r.drops || [];
      if (drops.length) lines.push('Items  ' + drops.map((d) => itemDef(d).name).join(', '));
      else lines.push('Items  none');
      lines.forEach((s, i) => gText(ctx, s, 166, 164 + i * 22, { size: 13, color: '#e6f3ff', maxWidth: 310 }));
      gText(ctx, 'Press Z to continue', 320, 326, { size: 11, align: 'center', color: '#8fa6c8' });
    }
    drawLevel(ctx) {
      const v = this.levelView; if (!v) return;
      gWindow(ctx, 170, 150, 300, 160, { style: 'blue', alpha: 0.94 });
      gText(ctx, (G.party && G.party.nameOf ? G.party.nameOf(v.id) : v.id) + ' reached Lv ' + v.level + '!', 320, 166, { size: 17, bold: true, align: 'center', color: '#ffe38a' });
      if (v.learned.length) gText(ctx, 'Learned: ' + v.learned.map((s) => skillDef(s).name).join(', '), 186, 210, { size: 13, color: '#e6f3ff', maxWidth: 270 });
      else gText(ctx, 'Stats grew!', 320, 210, { size: 13, align: 'center', color: '#e6f3ff' });
      gText(ctx, 'Press Z to continue', 320, 286, { size: 11, align: 'center', color: '#8fa6c8' });
    }

    // -------- per-frame update (input + animation timers)
    update() {
      this.t++;
      if (this.introT !== undefined && this.encounterT >= 0) this.encounterT++;
      this.handleInput();
      for (const u of this.party.concat(this.enemies)) {
        const ease = (cur, tgt) => { const d = tgt - cur; if (Math.abs(d) < 0.5) return tgt; return cur + d * 0.12; };
        u.dispHp = ease(u.dispHp == null ? u.hp : u.dispHp, u.hp);
        u.dispSp = ease(u.dispSp == null ? u.sp : u.dispSp, u.sp);
        if (u.hurt > 0) u.hurt--;
        if (u.flashA > 0) u.flashA = Math.max(0, u.flashA - 0.08);
        if (u.shk > 0) u.shk = Math.max(0, u.shk - 0.5);
        if (u.dying > 0) u.dying--;
      }
      for (const f of this.fxs) f.f++;
      this.fxs = this.fxs.filter((f) => f.f < f.dur);
      for (const x of this.texts) { x.t++; x.y -= 0.6; }
      this.texts = this.texts.filter((x) => x.t < x.life);
      if (this.banner) { this.banner.t++; if (this.banner.t >= this.banner.life) this.banner = null; }
      if (this.big) { this.big.t++; if (this.big.t >= this.big.life) this.big = null; }
    }

    // Process input for the active request. Called from update().
    handleInput() {
      const m = this.menu;
      if (!m) return;
      if (m.ready > 0) { m.ready--; return; }
      const I = G.input;
      if (m.kind === 'list') {
        const n = m.items.length;
        if (I.repeat('up')) { m.cursor = (m.cursor - 1 + n) % n; sfx('cursor'); }
        if (I.repeat('down')) { m.cursor = (m.cursor + 1) % n; sfx('cursor'); }
        if (m.onBoost && I.pressed('boost')) { m.onBoost(); }
        if (I.pressed('ok')) {
          const it = m.items[m.cursor];
          if (it && it.enabled !== false) { sfx('ok'); this.menu = null; m.resolve(it.value); }
          else sfx('buzzer');
        } else if (I.pressed('cancel')) { sfx('cancel'); this.menu = null; m.resolve(null); }
      } else if (m.kind === 'target') {
        const n = m.cands.length;
        if (n) {
          if (I.repeat('left') || I.repeat('up')) { m.cursor = (m.cursor - 1 + n) % n; sfx('cursor'); }
          if (I.repeat('right') || I.repeat('down')) { m.cursor = (m.cursor + 1) % n; sfx('cursor'); }
        }
        if (m.onBoost && I.pressed('boost')) { m.onBoost(); }
        if (I.pressed('ok') && n) { sfx('ok'); const u = m.cands[m.cursor]; this.menu = null; m.resolve(u); }
        else if (I.pressed('cancel')) { sfx('cancel'); this.menu = null; m.resolve(null); }
      } else if (m.kind === 'ack') {
        if (I.pressed('ok') || I.pressed('cancel')) { sfx('ok'); this.menu = null; m.resolve(true); }
      }
    }

    // -------- player command selection
    cmdItems(u) {
      const sk = actorSkills(u.id).map(skillDef);
      const invUsable = usableItems();
      return [
        { label: 'Attack', value: 'attack', enabled: true, desc: 'Strike a foe with a weapon. Boost adds hits.' },
        { label: 'Skills', value: 'skill', enabled: sk.length > 0, desc: 'Use a learned skill. Costs SP.' },
        { label: 'Item', value: 'item', enabled: invUsable.length > 0, desc: 'Use an item from your bag.' },
        { label: 'Defend', value: 'defend', enabled: true, desc: 'Take half damage and act earlier next turn. +1 BP.' },
        { label: 'Escape', value: 'escape', enabled: this.canEscape, desc: this.canEscape ? 'Try to flee. Chance depends on speed.' : 'Nowhere to run from this fight!' },
      ];
    }

    async playerCommand(u) {
      this.actor = u; this.boost = 0;
      const boostUp = () => { const max = Math.min(MAX_BOOST, u.bp); if (this.boost < max) { this.boost++; sfx('boost'); } else sfx('buzzer'); };
      for (;;) {
        const cmd = await this.menuPick({ mode: 'cmd', title: u.name, items: this.cmdItems(u), onBoost: boostUp, desc: true });
        if (!cmd) continue;
        if (cmd === 'defend') return { actor: u, kind: 'defend', boost: 0 };
        if (cmd === 'escape') return { actor: u, kind: 'escape', boost: 0 };
        if (cmd === 'attack') {
          const wts = u.weapons.length ? u.weapons : ['sword'];
          let wt = wts[0];
          if (wts.length > 1) {
            wt = await this.menuPick({ mode: 'sub', title: 'Weapon', items: wts.map((w) => ({ label: cap(w), value: w, enabled: true, desc: 'Strike with a ' + w + '.' })), onBoost: boostUp });
            if (!wt) continue;
          }
          const foes = this.enemies.filter((e) => e.alive);
          const t = await this.targetPick(foes, { token: wt, label: 'Attack', onBoost: boostUp });
          if (!t) continue;
          return { actor: u, kind: 'attack', weaponType: wt, targets: [t], boost: this.boost };
        }
        if (cmd === 'skill') {
          const sk = await this.menuPick({ mode: 'skill', title: 'Skills', items: this.skillItems(u), onBoost: boostUp });
          if (!sk) continue;
          const tg = await this.pickTargets(u, sk, boostUp);
          if (!tg) continue;
          return { actor: u, kind: 'skill', skill: sk, targets: tg, boost: this.boost, weaponType: sk.kind === 'phys' || sk.kind === 'bond' ? (sk.weapon || wtFallback(u)) : null };
        }
        if (cmd === 'item') {
          const it = await this.menuPick({ mode: 'item', title: 'Items', items: usableItems().map((id) => ({ label: itemDef(id).name, value: id, right: 'x' + ((G.state.inventory || {})[id] || 0), enabled: true, desc: itemDef(id).desc || '' })), onBoost: null });
          if (!it) continue;
          const ef = itemDef(it).effect || {};
          const cands = ef.revive != null ? this.party.filter((p) => !p.alive) : this.party.filter((p) => p.alive);
          if (!cands.length) { sfx('buzzer'); continue; }
          const t = await this.targetPick(cands, { label: itemDef(it).name });
          if (!t) continue;
          return { actor: u, kind: 'item', item: it, targets: [t], boost: 0 };
        }
      }
    }
    skillItems(u) {
      const allies = this.party.filter((p) => p.alive);
      return actorSkills(u.id).map(skillDef).map((s) => {
        const costOk = (s.cost || 0) <= u.sp;
        const bondOk = s.kind !== 'bond' || (s.partner && allies.some((a) => a.id === s.partner) && tierOf(s.partner) >= 2 && u.bp >= 1);
        const deadOk = s.target !== 'dead_ally' || this.party.some((p) => !p.alive);
        const enabled = costOk && !!bondOk && deadOk;
        return { label: s.name, value: s, enabled, right: s.cost ? 'SP ' + s.cost : '', desc: s.desc || '', color: s.kind === 'bond' ? '#ffb3d1' : null };
      });
    }
    // resolve targets for a skill; returns array (possibly empty) or null for cancel
    async pickTargets(u, sk, boostUp) {
      const foes = this.enemies.filter((e) => e.alive), allies = this.party.filter((p) => p.alive), dead = this.party.filter((p) => !p.alive);
      switch (sk.target) {
        case 'all_enemies': case 'random_enemies': return foes;
        case 'all_allies': return allies;
        case 'self': return [u];
        case 'one_ally': { const t = await this.targetPick(allies, { label: sk.name, onBoost: boostUp, friendly: true }); return t ? [t] : null; }
        case 'dead_ally': { const t = await this.targetPick(dead, { label: sk.name, onBoost: boostUp, friendly: true }); return t ? [t] : null; }
        default: { const t = await this.targetPick(foes, { token: sk.element || sk.weapon, label: sk.name, onBoost: boostUp }); return t ? [t] : null; }
      }
    }
  }
  const ELEMENT_FX = { fire: 'fire', ice: 'ice', lightning: 'lightning', wind: 'wind', light: 'light', dark: 'dark' };
  G.battle._BattleScene = BattleScene;

  // ---------------------------------------------------------------- registration & script command
  G.scenes.register('battle', (params) => new BattleScene(params));

  // c.battle(troopId, opts) -> Promise<'win'|'lose'|'escape'>
  function battleCommand(troopId, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      G.scenes.push('battle', {
        troop: troopId, canEscape: opts.canEscape !== false, bg: opts.bg, bgm: opts.bgm, loseOk: !!opts.loseOk,
        intro: opts.intro, onHalf: opts.onHalf, outro: opts.outro, onEnd: (r) => resolve(r),
      });
    });
  }
  G.battle.command = battleCommand;
  if (G.script && G.script.define) G.script.define('battle', battleCommand);

  G.provide && G.provide('battle');
})();
