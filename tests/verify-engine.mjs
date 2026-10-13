#!/usr/bin/env node
/** Runtime verification of the delivered Resident Evil adaptation.
 * The DOM harness executes the real HTML and scripts with native Canvas.
 * No browser, remote request, controller or display-layout claim is made here.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { loadGame, native } = require('./engine-vm.cjs');
const checks = [], notes = [], duelRecords = [], rosterRecords = [], imageRecords = [];
const clone = value => JSON.parse(JSON.stringify(value));
const read = name => fs.readFileSync(path.join(ROOT, name), 'utf8');
const json = name => JSON.parse(read(name));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const equal = (a, b, message) => assert.deepEqual(clone(a), clone(b), message);
let Data, StoryData, Combat, Stories, env, report;

async function test(name, run) {
  const start = performance.now();
  try {
    const detail = await run();
    checks.push({ name, pass: true, milliseconds: Math.round(performance.now() - start), ...(detail ? { detail } : {}) });
    process.stdout.write('PASS ' + name + '\n');
  } catch (error) {
    checks.push({ name, pass: false, milliseconds: Math.round(performance.now() - start), error: error.stack || String(error) });
    process.stdout.write('FAIL ' + name + '\n' + String(error.message || error) + '\n');
  }
}

function sandbox() {
  const box = { console, URL, URLSearchParams, structuredClone };
  box.window = box; box.globalThis = box;
  vm.createContext(box);
  return box;
}

function localFile(value) {
  assert.equal(typeof value, 'string');
  assert(!/^(?:https?:|data:|file:)/i.test(value), 'The release must contain local assets: ' + value);
  const absolute = path.resolve(ROOT, value);
  assert(absolute.startsWith(ROOT + path.sep), 'Asset outside release directory: ' + value);
  assert(fs.statSync(absolute).isFile(), 'Asset is not a file: ' + value);
  return absolute;
}

const input = (fields = {}) => ({ ...Combat.empty(), ...fields });
const by = name => Data.fighters.find(f => f.uid === name || f.id === name);
const choose = (predicate, fallback = 0) => Data.fighters.find(predicate) || Data.fighters[fallback];
const fresh = (a, b, options = {}) => Combat.create(a, b, {
  skipIntro: true, seed: 12060, seconds: 99, rounds: 1, freeMeter: false,
  freeResource: false, autoheal: false, ...options
});

function physicsInvariant(state) {
  assert(Number.isInteger(state.frame) && state.frame >= 0);
  assert(Number.isFinite(state.timer) && state.timer >= 0);
  for (const actor of [state.a, state.b]) {
    for (const key of ['x', 'y', 'vx', 'vy', 'life', 'r', 'meter', 'guard']) {
      assert(Number.isFinite(actor[key]), actor.f.uid + ' has nonfinite ' + key);
    }
    assert(actor.life >= 0 && actor.life <= actor.max, actor.f.uid + ' life bounds');
    assert(actor.r >= -1e-9 && actor.r <= actor.f.combat.resource.max + 1e-9, actor.f.uid + ' resource bounds');
    assert(actor.meter >= -1e-9 && actor.meter <= 100 + 1e-9, actor.f.uid + ' meter bounds');
    assert(actor.guard >= -1e-9 && actor.guard <= 100 + 1e-9, actor.f.uid + ' guard bounds');
    assert(actor.x >= 65 - 1e-9 && actor.x <= 1215 + 1e-9, actor.f.uid + ' arena bounds');
    assert(actor.y <= Combat.FLOOR + 1e-9, actor.f.uid + ' fell through floor');
  }
}

function step(state, frames, a = input(), b = input()) {
  for (let i = 0; i < frames; i++) Combat.step(state, [a, b]);
}

function stateView(s) {
  return {
    frame: s.frame, phase: s.phase, timer: s.timer, round: s.round,
    finished: s.finished, winner: s.winner, metrics: clone(s.metrics),
    actors: [s.a, s.b].map(p => ({ id: p.f.uid, x: p.x, y: p.y, life: p.life,
      resource: p.r, meter: p.meter, guard: p.guard, wins: p.wins,
      stats: clone(p.stats), statuses: clone(p.statuses) }))
  };
}

function runCPU(a, b, { seed = 1, profileA = 'balanced', profileB = 'boss', frames = 6400, record = false } = {}) {
  const state = fresh(a, b, { seed, skipIntro: false });
  let closest = 520, maxMeter = [0, 0], airborne = [0, 0];
  const commands = record ? [] : null;
  for (let i = 0; i < frames && !state.finished; i++) {
    const ai = Combat.cpu(state, state.a, state.b, { profile: profileA, reaction: 18, aggression: 1 });
    const bi = Combat.cpu(state, state.b, state.a, { profile: profileB, reaction: 18, aggression: 1 });
    if (ai.slot) assert(Combat.canStart(state, state.a, ai.slot), a.uid + ' CPU chose unavailable ' + ai.slot);
    if (bi.slot) assert(Combat.canStart(state, state.b, bi.slot), b.uid + ' CPU chose unavailable ' + bi.slot);
    if (record) commands.push([clone(ai), clone(bi)]);
    Combat.step(state, [ai, bi]);
    closest = Math.min(closest, Math.abs(state.a.x - state.b.x));
    maxMeter = maxMeter.map((n, j) => Math.max(n, [state.a, state.b][j].meter));
    airborne = airborne.map((n, j) => n + Number(![state.a, state.b][j].onGround));
    if (i % 24 === 0) physicsInvariant(state);
  }
  physicsInvariant(state);
  const summary = { p1: a.uid, p2: b.uid, seed, profiles: [profileA, profileB],
    frame: state.frame, complete: state.finished, winner: state.winner,
    outcome: Math.min(state.a.life, state.b.life) <= 0 ? 'KO' : state.finished ? 'timer' : 'unfinished',
    life: [state.a.life, state.b.life], hits: [state.a.stats.hits, state.b.stats.hits],
    damage: [state.a.stats.damage, state.b.stats.damage], starts: [state.a.stats.starts, state.b.stats.starts],
    denied: [state.a.stats.denied, state.b.stats.denied], maxMeter, airborne,
    closest: Math.round(closest), metrics: clone(state.metrics) };
  return { state, summary, commands };
}

function advanceAPI(api, maxCalls = 1000) {
  for (let i = 0; i < maxCalls && !api.getState().finished && !api.diagnostics().paused; i++) api.advance(250);
  return api.getState();
}

async function settleMatchAssets(environment) {
  const api = environment.api(), stage = api.getState()?.stage;
  const pendingStage = stage?.background ? environment.window.RE_RENDERER.preloadStage(stage) : null;
  api.draw(); // Request this match's actual sprites and portrait assets as well.
  await environment.images();
  if (pendingStage) assert.equal((await pendingStage).ok, true, 'The active arena must finish decoding before simulation advances');
  assert.deepEqual(environment.imageErrors, []);
  const diagnostic = environment.window.RE_RENDERER.diagnostics();
  assert.equal(diagnostic.loading, 0); assert.equal(diagnostic.queued, 0);
  equal(diagnostic.errors, []);
}

async function main() {
  for (const required of ['data/roster.json', 'data/chronicles.json', 'src/re-data.js']) {
    assert(fs.existsSync(path.join(ROOT, required)), 'Compile release content first; missing ' + required);
  }
  Data = json('data/roster.json'); StoryData = json('data/chronicles.json');
  const pure = sandbox();
  vm.runInContext(read('src/spatial-weakpoints-v072.js'), pure);
  vm.runInContext(read('src/combat-foundation-v060.js'), pure);
  vm.runInContext(read('src/chronicles-core-v060.js'), pure);
  Combat = pure.CQCCombat060; Stories = pure.CQC60_CORE;

  await test('Every delivered JavaScript source parses', () => {
    const files = fs.readdirSync(path.join(ROOT, 'src')).filter(name => name.endsWith('.js'));
    for (const name of files) new vm.Script(read('src/' + name), { filename: name });
    return { sources: files.length };
  });

  await test('Compiled browser datasets exactly match their editable release records', () => {
    const box = sandbox();
    vm.runInContext(read('src/re-data.js'), box);
    vm.runInContext(read('src/chronicles-data-v060.js'), box);
    equal(box.RE_DATA, Data);
    equal(box.CQC55_DATA, StoryData);
    equal(StoryData.fighters, Data.fighters);
    assert(Data.fighters.length >= 2 && Data.stages.length >= 1);
    return { fighters: Data.fighters.length, stages: Data.stages.length, catalog: Data.catalog?.length || 0 };
  });

  await test('Unique playable identities, physical dimensions and complete authored move contracts', () => {
    const identifiers = new Set(), moveIds = new Set();
    for (const f of Data.fighters) {
      assert(!identifiers.has(f.uid), 'Duplicate fighter ' + f.uid); identifiers.add(f.uid);
      assert.equal(f.id, f.uid); assert.equal(f.combat.uid, f.uid);
      assert(f.name && f.ep && f.source && f.reference, f.uid + ' missing identity/source');
      assert(!/METAL GEAR|SOLID SNAKE|FOXHOUND|MGS[1-5]/i.test(JSON.stringify(f)), f.uid + ' has active MGS content');
      assert(f.visual.height >= 45 && f.visual.height <= 360, f.uid + ' collision height out of engine range');
      assert(f.visual.width >= 40 && f.visual.width <= 280, f.uid + ' collision width out of engine range');
      const r = f.combat.resource;
      assert(r.max > 0 && Number.isFinite(r.regen) && r.regen >= 0, f.uid + ' resource profile');
      equal(Object.keys(f.combat.moves).sort(), [...Combat.SLOTS].sort(), f.uid + ' missing slots');
      for (const [slot, m] of Object.entries(f.combat.moves)) {
        assert(!moveIds.has(m.id), 'Duplicate move ' + m.id); moveIds.add(m.id);
        assert.equal(m.slot, slot); assert(m.name && m.counterplay);
        for (const key of ['startup', 'active', 'recovery']) assert(Number.isInteger(m[key]) && m[key] >= (key === 'active' ? 1 : 0), m.id + ' ' + key);
        assert(Number.isFinite(m.damage) && m.damage >= 0);
        assert(Number.isFinite(m.cost) && m.cost >= 0 && m.cost <= r.max, m.id + ' impossible resource cost');
        assert(Number.isFinite(m.meter) && m.meter >= 0 && m.meter <= 100);
        if (m.launchSelf !== undefined) assert(typeof m.launchSelf === 'number' && m.launchSelf < 0, m.id + ' launchSelf must be a negative numeric impulse');
      }
    }
    return { fighters: identifiers.size, moves: moveIds.size,
      kinds: [...new Set(Data.fighters.flatMap(f => Object.values(f.combat.moves).map(m => m.kind)))] };
  });

  await test('All referenced local portraits, full-body sprites and declared arena files decode', async () => {
    const files = new Map();
    for (const f of Data.fighters) {
      files.set(f.sprite, { kind: 'sprite', fighter: f });
      if (!files.has(f.portrait)) files.set(f.portrait, { kind: 'portrait', fighter: f });
    }
    for (const s of Data.stages) if (s.background) files.set(s.background, { kind: 'stage' });
    for (const [relative, info] of files) {
      const full = localFile(relative), image = await native.loadImage(full);
      assert(image.width > 0 && image.height > 0, relative);
      const bounds = info.kind === 'sprite' ? info.fighter.visual.spriteCrop : null;
      if (bounds) {
        const [x, y, width, height] = bounds;
        assert(x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= image.width + 1 && y + height <= image.height + 1,
          relative + ' invalid source crop');
      }
      imageRecords.push({ path: relative, width: image.width, height: image.height, bytes: fs.statSync(full).size });
    }
    const fallback = Data.stages.filter(s => !s.background).map(s => s.id);
    if (fallback.length) notes.push({ category: 'arenas', note: 'Stages use the visible simulation fallback when no background was declared.', stages: fallback });
    return { decoded: files.size, stagesWithImage: Data.stages.filter(s => s.background).length, fallbackStages: fallback };
  });

  await test('Every dossier, route opponent and cinematic stage resolves to delivered content', () => {
    const fighters = new Set(Data.fighters.map(f => f.uid)), stages = new Set(Data.stages.map(s => s.id));
    assert.equal(Object.keys(StoryData.stories).length, fighters.size);
    for (const f of Data.fighters) {
      const story = StoryData.stories[f.uid]; assert(story, f.uid);
      assert.equal(story.uid, f.uid); assert.equal(story.route.length, 8);
      assert(story.intro.length && story.outro.length);
      for (const card of [...story.intro, ...story.outro]) {
        assert(card.title && card.text && stages.has(card.stage), f.uid + ' cinematic card');
      }
      for (const [index, battle] of story.route.entries()) {
        assert(fighters.has(battle.opponent) && battle.opponent !== f.uid, f.uid + ' opponent ' + index);
        assert(stages.has(battle.stage), f.uid + ' stage ' + index);
        assert(battle.before && battle.challenge && battle.after);
      }
    }
    return { routes: fighters.size, duels: fighters.size * 8 };
  });

  const humanoid = choose(f => f.visual.height >= 205 && f.visual.height <= 240);
  const smallest = [...Data.fighters].sort((a, b) => a.visual.height - b.visual.height)[0];
  const largest = [...Data.fighters].sort((a, b) => b.visual.height - a.visual.height)[0];
  const dog = choose(f => f.archetype === 'quadruped');
  const nemesis = choose(f => f.archetype === 'nemesis');
  const wesker = choose(f => /WESKER/.test(f.name));

  await test('All real repertoires start, spend resources and activate only after their startup', () => {
    let executed = 0;
    for (const f of Data.fighters) for (const slot of Combat.SLOTS) {
      const s = fresh(f, humanoid), m = f.combat.moves[slot];
      s.a.x = 250; s.b.x = 1100; s.a.meter = 100;
      if (m.requiresStagger) { s.b.hit = 20; s.b.lastHit = s.frame; }
      const before = s.a.r, targetBefore = s.b.life;
      assert(Combat.start(s, s.a, slot), f.uid + '/' + slot);
      assert.equal(s.a.r, before + (['heat', 'cost'].includes(f.combat.resource.kind) ? 1 : -1) * m.cost);
      assert.equal(s.a.meter, 100 - m.meter);
      assert.equal(s.b.life, targetBefore, 'Effect applied before simulation');
      if (m.startup > 0) { step(s, m.startup - 1); assert.equal(s.a.stats.activations, 0, m.id); step(s, 1); }
      else step(s, 1);
      assert.equal(s.a.stats.activations, 1, m.id + ' never activated');
      physicsInvariant(s); executed++;
    }
    return { executed };
  });

  await test('Resource exhaustion blocks paid attacks, then passive recovery restores eligibility', () => {
    const f = choose(f => f.combat.resource.kind === 'energy' && f.combat.moves.special.cost > 0);
    const s = fresh(f, humanoid); s.b.x = 1215; s.a.x = 65;
    const move = f.combat.moves.special; let starts = 0;
    while (s.a.r >= move.cost && starts < 30) {
      assert(Combat.start(s, s.a, 'special')); starts++;
      while (s.a.attack || s.a.cool) step(s, 1);
    }
    assert(s.a.r < move.cost && starts > 0);
    const reserve = s.a.r;
    assert.equal(Combat.start(s, s.a, 'special'), false);
    assert.equal(s.a.r, reserve); assert.equal(s.a.attack, null);
    step(s, 160); assert(s.a.r > reserve); assert(Combat.canStart(s, s.a, 'special'));
    return { fighter: f.uid, paidStarts: starts, exhaustedReserve: reserve, recoveredReserve: s.a.r };
  });

  await test('The real recovery utility is delayed and clamps to the reserve capacity', () => {
    const f = choose(f => f.combat.moves.utility.kind === 'recover'), m = f.combat.moves.utility;
    assert.equal(m.kind, 'recover');
    const s = fresh(f, humanoid); s.a.r = 10; s.b.x = 1100;
    assert(Combat.start(s, s.a, 'utility')); step(s, m.startup - 1);
    assert.equal(s.a.r, 10); assert.equal(s.metrics.recover || 0, 0);
    step(s, 1); assert.equal(s.a.r, Math.min(f.combat.resource.max, 10 + m.restore));
    assert.equal(s.metrics.recover, 1);
    const t = fresh(f, humanoid); t.a.r = f.combat.resource.max - 2;
    Combat.start(t, t.a, 'utility'); step(t, m.startup);
    assert.equal(t.a.r, f.combat.resource.max);
  });

  await test('Organic healing uses real recoverable damage, has a budget and can be interrupted', () => {
    const healer = choose(f => f.combat.moves.utility.kind === 'heal');
    assert.equal(healer.combat.moves.utility.kind, 'heal');
    const s = fresh(healer, humanoid); s.a.life = 5000; s.a.gray = 3000; s.b.x = 1150;
    for (let n = 0; n < 5; n++) {
      if (!Combat.canStart(s, s.a, 'utility')) step(s, 200);
      assert(Combat.start(s, s.a, 'utility'));
      while (s.a.attack || s.a.cool) step(s, 1);
    }
    assert(s.a.stats.healed > 0 && s.a.stats.healed <= healer.combat.passive.regenBudget);
    assert.equal(s.a.life, 5000 + s.a.stats.healed);
    const interrupted = fresh(healer, humanoid); interrupted.a.x = 500; interrupted.b.x = 575;
    interrupted.a.life = 7000; interrupted.a.gray = 1000;
    assert(Combat.start(interrupted, interrupted.a, 'utility'));
    assert(Combat.start(interrupted, interrupted.b, 'light'));
    step(interrupted, healer.combat.moves.utility.startup + 8);
    assert(interrupted.a.life < 7000); assert.equal(interrupted.a.stats.healed, 0);
    return { fighter: healer.uid, totalHealed: s.a.stats.healed, budget: healer.combat.passive.regenBudget };
  });

  await test('A morphologically small attacker really leaves the floor during its authored leap', () => {
    const leaper = choose(f => f.archetype === 'quadruped' && f.combat.moves.special.launchSelf);
    const m = leaper.combat.moves.special; assert(m.launchSelf < 0);
    const s = fresh(leaper, largest); s.a.x = 450; s.b.x = 800;
    Combat.start(s, s.a, 'special'); step(s, m.startup + 1);
    assert(s.a.y < Combat.FLOOR - 1); assert.equal(s.a.onGround, false);
    step(s, 160); assert.equal(s.a.y, Combat.FLOOR); assert.equal(s.a.onGround, true);
    return { fighter: leaper.uid, impulse: m.launchSelf };
  });

  await test('High and low guards apply the correct real contact response', () => {
    const strike = guardDown => {
      const s = fresh(humanoid, humanoid); s.a.x = 500; s.b.x = 575;
      Combat.start(s, s.a, 'low'); step(s, humanoid.combat.moves.low.startup + 1, input(), input({ guard: true, down: guardDown }));
      return s;
    };
    const standing = strike(false), crouched = strike(true);
    assert(standing.b.life < 10000 && crouched.b.life < 10000);
    assert(standing.b.life < crouched.b.life); assert.equal(standing.b.stats.blocked, 0); assert(crouched.b.stats.blocked > 0);
    return { unblockedDamage: 10000 - standing.b.life, guardedDamage: 10000 - crouched.b.life };
  });

  await test('Authored projectiles travel into real targets and ranged CPU adapts to a crouched small body', () => {
    const shooter = choose(f => Object.values(f.combat.moves).some(m => m.kind === 'projectile'));
    const ranged = Object.values(shooter.combat.moves).find(m => m.kind === 'projectile');
    assert(ranged, 'No authored projectile available');
    const flight = fresh(shooter, humanoid); flight.a.x = 260; flight.b.x = 750;
    assert(Combat.start(flight, flight.a, ranged.slot));
    step(flight, ranged.startup - 1); assert.equal(flight.projectiles.length, 0); assert.equal(flight.b.life, 10000);
    step(flight, 1); assert(flight.projectiles.length > 0); assert.equal(flight.b.life, 10000);
    step(flight, 150); assert(flight.b.life < 10000); assert(flight.a.stats.damage > 0); physicsInvariant(flight);
    const short = fresh(smallest, shooter, { seed: 106051 });
    let closest = 520;
    for (let i = 0; i < 1100 && !short.finished; i++) {
      const command = Combat.cpu(short, short.b, short.a, { profile: 'sniper', reaction: 18, aggression: 1 });
      Combat.step(short, [input({ down: true }), command]);
      closest = Math.min(closest, Math.abs(short.a.x - short.b.x));
    }
    assert(short.b.stats.hits > 0, 'Ranged CPU keeps firing over the crouched small target');
    assert(closest < 210, 'CPU did not adapt its distance'); assert.equal(short.b.stats.denied, 0);
    return { shooter: shooter.uid, projectile: ranged.name, projectileDamage: flight.a.stats.damage,
      shortTarget: smallest.uid, closeRangeHits: short.b.stats.hits, closestDistance: Math.round(closest) };
  });

  await test('Camouflage activates through its real move and a real hit cancels it without invulnerability', () => {
    const f = choose(f => Object.values(f.combat.moves).some(m => m.kind === 'buff' && m.buff === 'cloak'));
    const cloak = Object.values(f.combat.moves).find(m => m.kind === 'buff' && m.buff === 'cloak');
    assert(cloak, 'No authored camouflage available');
    const s = fresh(f, humanoid); s.a.x = 500; s.b.x = 575;
    assert(Combat.start(s, s.a, cloak.slot)); step(s, cloak.startup);
    assert(s.a.buffs.cloak, 'Camouflage never activated');
    assert(Combat.start(s, s.b, 'light')); step(s, humanoid.combat.moves.light.startup + 2);
    assert(s.a.life < 10000); assert.equal(s.a.buffs.cloak, undefined);
    return { fighter: f.uid, damageReceived: 10000 - s.a.life };
  });

  await test('Small and large bodies separate at both walls without crossing floor or bounds', () => {
    for (const wall of [65, 1215]) for (const pair of [[smallest, largest], [largest, smallest]]) {
      const s = fresh(...pair); s.a.x = s.b.x = wall; step(s, 1);
      const minimum = (Combat.box(s.a).w + Combat.box(s.b).w) * .3;
      assert(Math.abs(Math.abs(s.a.x - s.b.x) - minimum) < 1e-6); physicsInvariant(s);
    }
    return { smallest: smallest.uid, smallHeight: smallest.visual.height, largest: largest.uid, largeHeight: largest.visual.height };
  });

  await test('Every playable species closes distance and damages an idle opponent through the real CPU', () => {
    const failures = [];
    for (const [index, f] of Data.fighters.entries()) {
      const s = fresh(humanoid, f, { seed: 1060 + index });
      for (let n = 0; n < 1100 && !s.finished; n++) {
        const command = Combat.cpu(s, s.b, s.a, { profile: 'balanced', reaction: 18, aggression: 1 });
        if (command.slot) assert(Combat.canStart(s, s.b, command.slot), f.uid + ' invalid CPU decision');
        Combat.step(s, [input(), command]); if (n % 60 === 0) physicsInvariant(s);
      }
      const row = { uid: f.uid, hits: s.b.stats.hits, damage: s.b.stats.damage, starts: s.b.stats.starts, denied: s.b.stats.denied, resource: s.b.r };
      rosterRecords.push(row);
      if (!row.hits || row.denied) failures.push(row);
    }
    assert.deepEqual(failures, []);
    return { fighters: rosterRecords.length, totalHits: rosterRecords.reduce((n, x) => n + x.hits, 0) };
  });

  const pairCandidates = [
    [dog, largest, 'rushdown', 'boss'], [largest, dog, 'boss', 'rushdown'],
    [smallest, nemesis, 'evasive', 'boss'], [nemesis, smallest, 'zoner', 'rushdown'],
    [choose(f => f.archetype === 'molded'), wesker, 'resource', 'rushdown'],
    [wesker, choose(f => /STURM/.test(f.name)), 'whiff', 'boss'],
    [choose(f => f.visual.morphology === 'winged'), choose(f => f.archetype === 'soldat'), 'balanced', 'boss'],
    [choose(f => f.archetype === 'plant'), choose(f => /TYRANT/.test(f.name)), 'trapper', 'grappler']
  ];
  await test('Eight complete CPU duels cover asymmetric matchups at full initial life', () => {
    for (const [index, [a, b, profileA, profileB]] of pairCandidates.entries()) {
      const result = runCPU(a, b, { seed: 6060 + index, profileA, profileB });
      duelRecords.push(result.summary);
      assert(result.state.finished, 'Duel did not terminate: ' + a.uid + ' / ' + b.uid);
      assert(result.state.metrics.damage > 0, 'No contact in ' + a.uid + ' / ' + b.uid);
      assert.equal(result.state.a.stats.denied + result.state.b.stats.denied, 0);
    }
    assert(duelRecords.some(d => d.outcome === 'KO'), 'No natural knockout observed');
    assert(duelRecords[0].hits[0] > 0 && duelRecords[1].hits[1] > 0, 'Quadruped cannot reach the large opponent');
    return { duels: duelRecords.length, knockouts: duelRecords.filter(d => d.outcome === 'KO').length,
      timerDecisions: duelRecords.filter(d => d.outcome === 'timer').length,
      totalFrames: duelRecords.reduce((n, d) => n + d.frame, 0) };
  });

  await test('Super techniques require earned gauge and create real deferred damage', () => {
    const s = fresh(nemesis, humanoid); s.a.x = 500; s.b.x = 610;
    assert.equal(Combat.start(s, s.a, 'super'), false);
    assert.equal(s.a.meter, 0); assert.equal(s.a.attack, null);
    let contacts = 0;
    while (s.a.meter < nemesis.combat.moves.super.meter && contacts < 30) {
      s.b.x = s.a.x + 90;
      if (Combat.canStart(s, s.a, 'light')) { Combat.start(s, s.a, 'light'); contacts++; }
      step(s, 45);
    }
    assert(s.a.meter >= nemesis.combat.moves.super.meter, 'Gauge was not earned from real contacts');
    const before = s.b.life, gauge = s.a.meter, superMove = nemesis.combat.moves.super;
    s.b.x = s.a.x + 120; assert(Combat.start(s, s.a, 'super'));
    assert.equal(s.a.meter, gauge - superMove.meter); assert.equal(s.b.life, before);
    step(s, superMove.startup - 1); assert.equal(s.b.life, before);
    step(s, superMove.active + 2); assert(s.b.life < before);
    return { fighter: nemesis.uid, contactsToEarnGauge: contacts, realDamage: before - s.b.life };
  });

  await test('Seeded CPU commands reproduce the same simulation without consulting AI during replay', () => {
    const one = runCPU(dog, largest, { seed: 0, profileA: 'rushdown', profileB: 'boss', frames: 1800, record: true });
    const two = runCPU(dog, largest, { seed: 0, profileA: 'rushdown', profileB: 'boss', frames: 1800, record: true });
    equal(one.commands, two.commands); equal(stateView(one.state), stateView(two.state));
    const playback = fresh(dog, largest, { seed: 0, skipIntro: false });
    for (const pair of one.commands) Combat.step(playback, pair);
    equal(stateView(one.state), stateView(playback));
    return { recordedFrames: one.commands.length, physicsHash: hash(JSON.stringify(stateView(playback))) };
  });

  await test('All stories advance through eight validated wins into their own unlocked ending', () => {
    for (const f of Data.fighters) {
      let p = Stories.begin(StoryData, Stories.fresh(StoryData), f.uid);
      while (p.active.phase === 'intro') p = Stories.next(StoryData, p);
      assert(!p.unlocked.includes(f.uid));
      for (let duel = 0; duel < 8; duel++) {
        assert.equal(p.active.phase, 'pre'); assert.equal(p.active.index, duel);
        p = Stories.next(StoryData, p); assert.equal(p.active.phase, 'fight');
        const checkpoint = Stories.checkpoint(StoryData, p); assert.equal(checkpoint.active.phase, 'pre');
        const opponent = StoryData.stories[f.uid].route[duel].opponent;
        p = Stories.result(StoryData, p, { winner: f.uid, loser: opponent, life: 5900, maxLife: 10000, seconds: 23 });
        p = Stories.validate(StoryData, p);
        assert.equal(p.active.won, duel + 1);
        if (duel < 7) assert(!p.unlocked.includes(f.uid));
        p = Stories.next(StoryData, p);
      }
      assert.equal(p.active.phase, 'outro'); assert(p.unlocked.includes(f.uid));
      while (p.active.phase === 'outro') p = Stories.next(StoryData, p);
      assert.equal(p.active.phase, 'finished'); assert.equal(p.records[f.uid].clears, 1);
      p = Stories.validate(StoryData, p);
      assert.equal(Stories.next(StoryData, p).active, null);
    }
    return { completedStories: Data.fighters.length, progressionResults: Data.fighters.length * 8 };
  });

  await test('Defeat consumes only the three continues and rejects an unrelated duel result', () => {
    const uid = dog.uid, opponent = StoryData.stories[uid].route[0].opponent;
    let p = Stories.begin(StoryData, Stories.fresh(StoryData), uid);
    while (p.active.phase === 'intro') p = Stories.next(StoryData, p);
    for (let attempt = 0; attempt < 4; attempt++) {
      p = Stories.next(StoryData, p); assert.equal(p.active.phase, 'fight');
      assert.throws(() => Stories.result(StoryData, p, { winner: uid, loser: 'unknown-test-actor' }));
      p = Stories.result(StoryData, p, { winner: opponent, loser: uid });
      assert.equal(p.active.phase, 'defeat'); p = Stories.validate(StoryData, p);
      p = Stories.next(StoryData, p);
      if (attempt < 3) { assert.equal(p.active.continues, 2 - attempt); assert.equal(p.active.spent, attempt + 1); }
    }
    assert.equal(p.active, null); assert.deepEqual(clone(p.unlocked), []);
  });

  await test('Two-slot saves preserve progression and recover from a corrupted latest write', () => {
    let p = Stories.begin(StoryData, Stories.fresh(StoryData), dog.uid);
    p = Stories.markRead(StoryData, p, dog.uid, 'intro', 0);
    const first = Stories.envelope(StoryData, p, 4), last = Stories.envelope(StoryData, p, 5);
    const parsed = JSON.parse(last); parsed.payload.selected = 'damaged';
    assert.throws(() => Stories.readSlot(StoryData, JSON.stringify(parsed)));
    const storage = new Map([['qa.a', first], ['qa.b', JSON.stringify(parsed)]]);
    const recovered = Stories.loadSlots(StoryData, { getItem: key => storage.get(key) }, 'qa');
    assert.equal(recovered.recovered, true); assert.equal(recovered.revision, 4);
    assert.equal(recovered.profile.selected, dog.uid);
    assert.equal(Stories.readScenes(StoryData, recovered.profile, dog.uid).length, 1);
    assert.throws(() => Stories.markRead(StoryData, p, dog.uid, 'outro', 0));
  });

  await test('The actual versus HTML initializes its real controls, engine and reference renderer', async () => {
    env = await loadGame(path.join(ROOT, 'modules/versus.html'), { allowTimers: false });
    await env.images();
    assert(env.api()); assert.equal(env.api().fighters.length, Data.fighters.length);
    assert.equal(env.api().engine.version, '0.60');
    assert(env.window.RE_RENDERER && env.window.CQC55_ART && env.window.CQC56_PORTRAITS);
    assert.equal(env.document.querySelector('#roster').children.length, Math.min(18, Data.fighters.length));
    assert.deepEqual(env.imageErrors, []);
    return { source: 'modules/versus.html', renderer: env.window.RE_RENDERER.diagnostics().version,
      initialLoadedImages: env.window.RE_RENDERER.diagnostics().completed };
  });

  await test('Actual keyboard movement, pause and rematch preserve the chosen match configuration', async () => {
    assert(env, 'Versus did not initialize'); const api = env.api();
    const config = { p1: dog.uid, p2: largest.uid, stage: Data.stages[0].id, mode: 'local',
      rounds: 1, seconds: 60, seed: 6001, finishers: 'off', p1Meter: 17, p2Meter: 23 };
    api.startExternal(config); await settleMatchAssets(env);
    for (let i = 0; i < 8; i++) api.advance(250);
    const before = api.getState().a.x; env.key('ArrowRight'); api.advance(150);
    assert(api.getState().a.x > before); api.pause(true);
    const pausedFrame = api.getState().frame; api.advance(250); assert.equal(api.getState().frame, pausedFrame);
    assert.equal(api.diagnostics().keys.length, 0); env.key('ArrowRight', false); api.pause(false);
    const expected = clone(api.getMatchConfig()); env.document.querySelector('#rematch').click();
    await settleMatchAssets(env);
    equal(api.getMatchConfig(), expected); assert.equal(api.getState().frame, 0);
    assert.equal(api.getState().a.meter, 17); assert.equal(api.getState().b.meter, 23);
    assert.equal(api.getState().stage.id, config.stage);
  });

  let realReplay;
  await test('The actual UI engine records and replays a complete CPU match identically', async () => {
    assert(env); const api = env.api();
    api.startExternal({ p1: nemesis.uid, p2: wesker.uid, stage: Data.stages[0].id,
      mode: 'cpu-cpu', rounds: 1, seconds: 99, seed: 60060, finishers: 'off',
      aiProfile: ['boss', 'rushdown'], aiLevel: 'veteran', noFlash55: true });
    await settleMatchAssets(env);
    const original = advanceAPI(api); assert(original.finished, 'Actual UI match did not terminate');
    const expected = stateView(original); realReplay = clone(api.getLastReplay());
    assert(realReplay && realReplay.frames.length); assert.equal(realReplay.meta.engineVersion, '0.60');
    api.startReplay(realReplay); await settleMatchAssets(env);
    const replayed = advanceAPI(api); assert(replayed.finished);
    equal(stateView(replayed), expected);
    api.draw(); await env.images(); assert.deepEqual(env.imageErrors, []);
    return { winner: expected.winner, frames: expected.frame, compressedRows: realReplay.frames.length,
      resultHash: hash(JSON.stringify(expected)) };
  });

  await test('Corrupted replays are rejected and truncated replays pause with an explicit incomplete state', async () => {
    assert(env && realReplay, 'No actual recorded replay'); const api = env.api();
    const corrupt = clone(realReplay); corrupt.frames[0][0] = -1;
    assert.throws(() => api.startReplay(corrupt));
    const unknown = clone(realReplay); unknown.meta.p1 = 'unknown-test-actor';
    assert.throws(() => api.startReplay(unknown));
    const short = clone(realReplay); short.frames = [[30, 0, 0, 0, 0]];
    api.startReplay(short); await settleMatchAssets(env);
    for (let i = 0; i < 8; i++) api.advance(250);
    assert.equal(api.getState().finished, false); assert.equal(api.getReplayState().exhausted, true);
    assert.equal(api.diagnostics().paused, true);
    assert(/INCOMPLET/.test(env.document.querySelector('#matchLabel').textContent));
  });

  await test('Cinematic contracts draw actual references for hero, before, after and ending scenes', async () => {
    assert(env); const doc = env.document;
    const byUid = Object.fromEntries(Data.fighters.map(f => [f.uid, f]));
    const byStage = Object.fromEntries(Data.stages.map(s => [s.id, s]));
    const samples = [nemesis, smallest, choose(f => f.visual.morphology === 'winged')];
    const canvases = samples.map(f => ({ f, canvas: doc.createElement('canvas') }));
    for (const item of canvases) {
      item.canvas.width = 1280; item.canvas.height = 720; item.canvas.id = 'heroArt';
      env.window.CQC60_CINEMA.draw(item.canvas, StoryData.stories[item.f.uid], 'intro', 0, 0,
        { motion: false, fighters: byUid, stages: byStage });
    }
    await env.images();
    for (const { f, canvas } of canvases) for (const phase of ['intro', 'pre', 'post', 'outro']) {
      env.window.CQC60_CINEMA.draw(canvas, StoryData.stories[f.uid], phase, 0, 0,
        { motion: false, fighters: byUid, stages: byStage });
      await env.images();
      env.window.CQC60_CINEMA.draw(canvas, StoryData.stories[f.uid], phase, 0, 0,
        { motion: false, fighters: byUid, stages: byStage });
      const image = canvas.getContext('2d').getImageData(0, 0, 1280, 720).data;
      assert(image.some((value, index) => index % 4 !== 3 && value > 40), f.uid + '/' + phase + ' blank composition');
    }
    await env.images(); assert.deepEqual(env.imageErrors, []);
    return { species: samples.map(f => f.uid), phases: 4, compositions: samples.length * 4 };
  });

  if (env) { env.dispose(); env = null; }
}

function writeReport() {
  const sourceFiles = ['src/combat-foundation-v060.js', 'src/unified-engine-v060.js',
    'src/chronicles-core-v060.js', 'src/re-renderer.js', 'src/re-data.js', 'tests/engine-vm.cjs'];
  report = {
    generatedAt: new Date().toISOString(), version: Data?.version || 'uncompiled',
    method: `Real delivered JavaScript, deterministic combat CPU, controlled DOM and native Canvas (${native.__binding}). No browser/CSS layout or physical controller verification.`,
    passed: checks.filter(c => c.pass).length, failed: checks.filter(c => !c.pass).length,
    sourceSHA256: Object.fromEntries(sourceFiles.filter(f => fs.existsSync(path.join(ROOT, f))).map(f => [f, hash(fs.readFileSync(path.join(ROOT, f)))])),
    coverage: { fighters: Data?.fighters?.length || 0, moveContracts: (Data?.fighters?.length || 0) * 10,
      actualCPUDuels: duelRecords.length, CPUReadinessSpecies: rosterRecords.length,
      decodedImages: imageRecords.length }, notes, duels: duelRecords, speciesReadiness: rosterRecords,
    decodedImages: imageRecords, checks
  };
  fs.mkdirSync(path.join(ROOT, 'tests'), { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'tests/engine-results.json'), JSON.stringify(report, null, 2) + '\n');
  const lines = [
    '# Vérification du moteur Resident Evil — B.O.W. Protocol', '',
    `Exécution : ${report.generatedAt}. Version du contenu : ${report.version}.`, '',
    `**${report.passed} contrôles réussis ; ${report.failed} contrôle(s) en échec.**`, '',
    '## Méthode', '',
    'La suite charge les sources livrées. Elle exécute la simulation CQC 0.60 adaptée, sa véritable IA, les règles des chroniques et le module versus complet dans un DOM contrôlé avec Canvas natif. Les duels CPU commencent à 10 000 points de vie, sans invulnérabilité, soin automatique ni ressource gratuite. Les données de résultat passent par les fonctions réelles du jeu.', '',
    'Les vérifications de scénario isolent volontairement des situations : énergie insuffisante, blessures récupérables, interruption, mur et lancement de technique. Elles sont distinctes des duels complets. Les replays sont enregistrés puis relus par le moteur livré.', '',
    'Les ressources d’un nouveau match sont demandées et réellement décodées avant toute avance de la simulation. Les fichiers locaux sont transmis au décodeur Canvas par leur chemin : le passage brut en Buffer du binding pouvait confondre certains PNG contenant du texte SVG dans leurs métadonnées avec une image SVG. Le PNG, son URL et le renderer livré restent inchangés ; les erreurs de fichier ou de décodage restent bloquantes pour la suite.', '',
    'Cette exécution ne mesure pas la mise en page CSS dans un navigateur et ne constitue pas un essai avec une manette physique. Les images sont réellement décodées et les compositions sont réellement dessinées par Canvas.', '',
    '## Reproduction', '',
    'Prérequis : Node.js et `@napi-rs/canvas` installé. Le chargeur accepte également le chemin de modules indiqué par `CODEX_PRIMARY_RUNTIME_NODE_MODULES`.', '',
    '```sh', 'node tests/verify-engine.mjs', '```', '',
    'Le contenu compilé doit déjà exister dans `data/roster.json`, `data/chronicles.json` et `src/re-data.js`. La suite écrit son résultat dans `tests/engine-results.json` et actualise le présent rapport.', '',
    '## Couverture', '',
    `- ${report.coverage.fighters} combattants et ${report.coverage.moveContracts} contrats de techniques.`,
    `- ${report.coverage.CPUReadinessSpecies} espèces testées contre un adversaire immobile avec la véritable IA.`,
    `- ${report.coverage.actualCPUDuels} duels CPU complets ciblant notamment les petites et grandes morphologies.`,
    `- ${report.coverage.decodedImages} images locales réellement décodées.`, '',
    '## Duels CPU à vie entière', '',
    '| P1 | P2 | Issue | Frames | Impacts P1 / P2 | Vie P1 / P2 |',
    '|---|---|---|---:|---:|---:|',
    ...duelRecords.map(d => `| ${d.p1} | ${d.p2} | ${d.outcome} | ${d.frame} | ${d.hits.join(' / ')} | ${d.life.join(' / ')} |`), '',
    '## Contrôles', '',
    ...checks.map(c => `- ${c.pass ? 'RÉUSSI' : 'ÉCHEC'} — ${c.name}${c.pass ? '' : '\n\n  ' + String(c.error).split('\n')[0]}`), '',
    ...(notes.length ? ['## Périmètre signalé', '', ...notes.map(n => '- ' + n.note + (n.stages ? ' ' + n.stages.join(', ') : '')), ''] : []),
    '## Traçabilité', '',
    'Les empreintes SHA-256 des sources exactes exécutées sont conservées dans `tests/engine-results.json`. Une modification ultérieure des sources requiert une nouvelle exécution avant de réutiliser ce résultat.', ''
  ];
  fs.writeFileSync(path.join(ROOT, 'docs/verification-runtime.md'), lines.join('\n'));
  process.stdout.write(JSON.stringify({ passed: report.passed, failed: report.failed, report: 'tests/engine-results.json' }) + '\n');
  process.exitCode = report.failed ? 1 : 0;
}

try { await main(); }
catch (error) { checks.push({ name: 'Suite initialization/completion', pass: false, error: error.stack || String(error) }); }
finally { if (env) env.dispose(); writeReport(); }
