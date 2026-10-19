#!/usr/bin/env node
/** Integration checks for the shipped Operations and Codex pages.
 * Two real VM windows communicate through a queued postMessage transport.
 * DOM and Canvas are controlled; this is not browser or CSS layout QA.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { loadGame, native } = require('./engine-vm.cjs');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const Data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/roster.json')));
const FAMILY_IDS = ['re7-mia-winters-infected','re7-jack-baker','re7-jack-baker-scissor','re7-marguerite-baker','re7-lucas-baker','re7-eveline','re7-jack-baker-mutated','re7-jack-baker-swamp-man','re7-marguerite-baker-mutated','re7-lucas-baker-mutated','re7-eveline-final','re7-fumer','re7-mama-mold','re7-little-crawler'];
const APEX_IDS = ['re2r-super-tyrant','re3r-stage-2-nemesis','re3r-stage-3-nemesis','re4r-del-lago','re4r-garrador','re4r-iron-maiden','re4r-ramon-salazar-mutated','re4r-osmund-saddler-mutated','revillage-mutated-dimitrescu','revillage-mutated-moreau','revillage-mutated-heisenberg','re6-ustanak'];
const checks = [], duels = [], notes = [], environments = new Set();
const clone = x => JSON.parse(JSON.stringify(x));
const equal = (a, b, message) => assert.deepEqual(clone(a), clone(b), message);
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
const read = name => fs.readFileSync(path.join(ROOT, name), 'utf8');
const $ = (env, selector) => {
  const node = env.document.querySelector(selector);
  assert(node, 'Missing rendered control ' + selector);
  return node;
};
const change = (env, selector, value, event = 'change') => {
  const node = $(env, selector); node.value = value; node.dispatchEvent({ type: event });
};
const state = pair => pair.ops.window.RE_OPERATIONS.getState();

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

async function load(name, options) {
  const env = await loadGame(path.join(ROOT, name), options);
  environments.add(env); return env;
}
function dispose(env) { if (env) { env.dispose(); environments.delete(env); } }

function resetCodex(env, { search = '', game = 'all', status = 'all' } = {}) {
  change(env, '#catalogSearch', search, 'input');
  change(env, '#catalogGame', game); change(env, '#catalogStatus', status);
}
function collectCards(env, inspect) {
  const ids = []; let pages = 0;
  for (;;) {
    const buttons = $(env, '#catalogGrid').querySelectorAll('button');
    assert(buttons.length <= 24, 'Pagination must keep a bounded page size');
    ids.push(...buttons.map(x => x.dataset.id));
    buttons.forEach(button => inspect?.(button)); pages++;
    if ($(env, '#catalogNext').disabled) break;
    assert(pages < 100, 'Pagination did not terminate'); $(env, '#catalogNext').click();
  }
  assert.equal(new Set(ids).size, ids.length, 'A dossier occurs on multiple pages');
  return { ids, pages };
}

async function connectOperations() {
  const ops = await load('operations.html', { search: '?mode=arcade&uid=re3r-nemesis' });
  const queue = [], packets = [];
  const iframeWindow = { postMessage(data) { queue.push({ to: 'engine', data: clone(data) }); } };
  const parentWindow = { postMessage(data) { queue.push({ to: 'operations', data: clone(data) }); } };
  const frame = $(ops, '#combatFrame'); frame.contentWindow = iframeWindow;
  const engine = await load('modules/versus.html', { search: '?embed=battle', parent: parentWindow });
  await engine.images(); assert.deepEqual(engine.imageErrors, []);
  let randomSeed = 12060;
  ops.window.Math = Object.assign(Object.create(Math), {
    random: () => { randomSeed = (Math.imul(randomSeed, 1664525) + 1013904223) >>> 0; return randomSeed / 4294967296; }
  });
  const pair = { ops, engine, frame, iframeWindow, parentWindow, queue, packets };
  pair.flush = () => {
    let count = 0;
    while (queue.length) {
      assert(++count < 200, 'postMessage response cycle did not settle');
      const item = queue.shift(); packets.push(item);
      if (item.to === 'engine') engine.message(item.data, parentWindow);
      else ops.message(item.data, iframeWindow);
    }
  };
  pair.start = ({ mode = 'arcade', difficulty = 'normal', finishers = 'off', uid = 're3r-nemesis' } = {}) => {
    if (state(pair)) { $(ops, '#leaveRun').click(); pair.flush(); }
    for (const [selector, value] of [['#runMode', mode], ['#runDifficulty', difficulty], ['#runFighter', uid], ['#runFinishers', finishers]]) {
      change(ops, selector, value);
    }
    $(ops, '#runForm').dispatchEvent({ type: 'submit' });
    engine.tick(120); pair.flush();
    return state(pair);
  };
  pair.settleAssets = async () => {
    const api = engine.api(), arena = api.getState()?.stage;
    const pendingStage = arena?.background ? engine.window.RE_RENDERER.preloadStage(arena) : null;
    api.draw(); await engine.images();
    if (pendingStage) assert.equal((await pendingStage).ok, true, 'The operation arena must actually decode');
    assert.deepEqual(engine.imageErrors, []);
    const assets = engine.window.RE_RENDERER.diagnostics();
    assert.equal(assets.loading, 0); assert.equal(assets.queued, 0); equal(assets.errors, []);
  };
  return pair;
}

function assertActive(pair) {
  const run = state(pair), api = pair.engine.api(), combat = api.getState();
  assert(run?.pending, 'Operations must await the active duel result; status: ' + $(pair.ops, '#runStatus').textContent);
  assert(combat && !combat.finished, 'The real iframe combat must be running');
  assert(/Combat actif/.test($(pair.ops, '#runStatus').textContent), 'The correlated engine acknowledgement must activate the run');
  assert.equal(pair.frame.hidden, false); assert.equal($(pair.ops, '#runResult').hidden, true);
  return combat;
}

function engineSnapshot(s) {
  return { frame: s.frame, timer: s.timer, phase: s.phase, finished: s.finished, winner: s.winner,
    actors: [s.a, s.b].map(p => ({ uid: p.f.uid, life: p.life, x: p.x, y: p.y, meter: p.meter, resource: p.r, guard: p.guard,
      hits: p.stats.hits, damage: p.stats.damage, wins: p.wins })) };
}

async function realDuel(pair, { winningSlot = 0, woundFirst = false, selectFinisher = false } = {}) {
  await pair.settleAssets();
  const run = state(pair); assert(run?.pending, 'A pending operation is required');
  const api = pair.engine.api(), s = assertActive(pair), from = pair.packets.length;
  let wound = null;
  // Use the engine's own controller to reach the desired branch. Only controller
  // ownership changes; life, damage, meter, energy, hits and the winner are real.
  if (woundFirst) {
    s.a.ai = false; s.b.ai = true;
    for (let i = 0; i < 450 && s.a.life > .76 * s.a.max && !s.finished; i++) api.advance(250);
    assert(s.a.life > 0 && s.a.life < .88 * s.a.max, 'Opponent must inflict actual nontrivial injuries');
    assert(s.b.stats.damage > 0 && s.b.stats.hits > 0);
    wound = { life: s.a.life, opponentHits: s.b.stats.hits, frame: s.frame };
  }
  s.a.ai = winningSlot === 0; s.b.ai = winningSlot === 1;
  let packet;
  for (let i = 0; i < 700 && !packet; i++) {
    api.advance(250); pair.flush();
    if (selectFinisher && api.getFinisherState().window) {
      const key = winningSlot === 0 ? 'KeyO' : 'KeyY';
      pair.engine.key(key, true); pair.engine.key(key, false);
    }
    packet = pair.packets.slice(from).find(x => x.to === 'operations' && x.data.type === 'cqc-versus-result')?.data;
  }
  assert(s.finished, 'Real combat did not terminate');
  assert(packet, 'The real engine did not emit its result');
  assert.equal(packet.winnerSlot, winningSlot, 'Controlled CPU must reach the intended result branch');
  assert.equal(packet.requestId, run.requestId, 'The engine result must retain its original requestId');
  assert.equal(packet.winner, [s.a, s.b][winningSlot].f.uid);
  assert.equal(packet.life, [s.a, s.b][winningSlot].life);
  assert.equal(packet.maxLife, [s.a, s.b][winningSlot].max);
  assert.equal(Math.min(s.a.life, s.b.life), 0, 'Branch verification requires a genuine KO, not a fabricated outcome');
  assert([s.a, s.b][winningSlot].stats.damage > 0);
  const result = { mode: run.mode, encounter: run.index + 1, requestId: run.requestId,
    p1: s.a.f.uid, p2: s.b.f.uid, winnerSlot: s.winner, frame: s.frame,
    life: [s.a.life, s.b.life], hits: [s.a.stats.hits, s.b.stats.hits], wound };
  duels.push(result); return { packet, snapshot: engineSnapshot(s), summary: result };
}

async function main() {
  await test('Operations and Codex scripts parse and their shipped HTML loads', async () => {
    for (const name of ['src/operations.js', 'src/codex.js']) new vm.Script(read(name), { filename: name });
    const env = await load('operations.html');
    assert(env.window.RE_OPERATIONS);
    equal($(env, '#runDifficulty').children.map(x => x.value), ['recruit', 'normal', 'veteran', 'legend']);
    assert.equal($(env, '#runDifficulty').value, 'normal');
    assert.equal($(env, '#runFighter').children.length, Data.fighters.length);
    assert.equal($(env, '#run').hidden, true);
    dispose(env);
    return { fighters: Data.fighters.length, difficultyValues: ['recruit', 'normal', 'veteran', 'legend'] };
  });

  const codex = await load('codex.html');
  await test('Codex pagination exposes every dossier exactly once with the right status', () => {
    assert.equal(Number($(codex, '#catalogCount').textContent), Data.catalog.length);
    assert.equal($(codex, '#catalogPrev').disabled, true);
    const playable = new Set(Data.fighters.map(f => f.uid));
    const result = collectCards(codex, button => {
      const label = button.querySelector('.specimen-state');
      assert.equal(label.classList.contains('is-playable'), playable.has(button.dataset.id));
      assert.equal(label.textContent, playable.has(button.dataset.id) ? '● JOUABLE' : 'DOCUMENTÉ');
    });
    equal(result.ids, Data.catalog.map(x => x.id));
    return { dossiers: result.ids.length, pages: result.pages, playable: playable.size };
  });

  await test('Codex status and episode filters partition the real catalog without leakage', () => {
    const playable = new Set(Data.fighters.map(f => f.uid));
    for (const status of ['playable', 'reference']) {
      resetCodex(codex, { status });
      equal(collectCards(codex).ids, Data.catalog.filter(x => playable.has(x.id) === (status === 'playable')).map(x => x.id));
    }
    const games = new Set(Data.catalog.map(x => x.gameKey));
    for (const game of games) for (const status of ['all', 'playable', 'reference']) {
      resetCodex(codex, { game, status });
      equal(collectCards(codex).ids, Data.catalog.filter(x => x.gameKey === game && (status === 'all' || playable.has(x.id) === (status === 'playable'))).map(x => x.id));
    }
    return { episodes: games.size, episodeStatusCombinations: games.size * 3 };
  });

  await test('Codex search ignores accents and case; empty results and filter resets are usable', () => {
    resetCodex(codex, { search: 'nemesis' }); const ids = collectCards(codex).ids;
    assert(ids.includes('re3r-nemesis'));
    resetCodex(codex, { search: 'NÉMÉSIS' }); equal(collectCards(codex).ids, ids);
    resetCodex(codex, { search: 'NO_SPECIMEN_012060' });
    assert.equal($(codex, '#catalogGrid').querySelectorAll('button').length, 0);
    assert.equal($(codex, '#catalogPage').textContent, '0 / 0');
    assert.equal($(codex, '#noResults').hidden, false);
    assert($(codex, '#catalogNext').disabled && $(codex, '#catalogPrev').disabled);
    resetCodex(codex); $(codex, '#catalogNext').click();
    assert($(codex, '#catalogPage').textContent.startsWith('2 /'));
    change(codex, '#catalogStatus', 'playable');
    assert($(codex, '#catalogPage').textContent.startsWith('1 /'));
    assert.equal($(codex, '#noResults').hidden, true);
    assert.equal($(codex, '.codex-filters').dispatchEvent({ type: 'submit' }), false);
  });

  await test('All Codex details resolve real assets, sources and playable links; closing restores focus', () => {
    resetCodex(codex); const fighters = new Map(Data.fighters.map(f => [f.uid, f]));
    let details = 0, actions = 0, archives = 0;
    collectCards(codex, button => {
      const entry = Data.catalog.find(x => x.id === button.dataset.id), fighter = fighters.get(entry.id);
      button.focus(); button.click(); assert.equal($(codex, '#specimenDialog').open, true);
      assert.equal($(codex, '#detailName').textContent, entry.name);
      assert.equal($(codex, '#detailEpisode').textContent, entry.game);
      assert($(codex, '#detailDescription').textContent);
      assert(!/\bundefined\b|\[object Object\]/.test($(codex, '#detailScope').textContent));
      const asset = $(codex, '#detailImage').getAttribute('src');
      if (asset) assert(fs.existsSync(path.join(ROOT, asset)), 'Missing dossier image: ' + asset);
      const links = $(codex, '#detailActions').querySelectorAll('a');
      if (fighter) {
        assert.equal($(codex, '#detailImage').getAttribute('src'), fighter.sprite);
        assert.equal(links.length, 2); actions += links.length;
        for (const a of links) {
          const url = new URL(a.getAttribute('href'), 'https://example.test/');
          assert.equal(url.pathname, '/modules/versus.html'); assert.equal(url.searchParams.get('uid'), entry.id);
        }
        assert(/VISUEL PROVISOIRE|POSE DE RÉFÉRENCE/i.test($(codex, '#detailStatus').textContent));
      } else { assert.equal(links.length, 1); assert.equal(new URL(links[0].getAttribute('href'),'https://example.test/').pathname,'/catalog.html'); assert.equal(new URL(links[0].getAttribute('href'),'https://example.test/').searchParams.get('id'),entry.id); assert(/ARCHIVE DOCUMENTAIRE/.test($(codex, '#detailStatus').textContent)); archives++; }
      const sources = $(codex, '#detailSources').querySelectorAll('a');
      assert(sources.length >= 1, entry.id + ' needs source attribution');
      for (const a of sources) {
        assert(/^https?:\/\//.test(a.getAttribute('href'))); assert.equal(a.getAttribute('target'), '_blank');
        assert(a.getAttribute('rel').includes('noopener'));
      }
      $(codex, '#closeSpecimen').click(); assert.equal($(codex, '#specimenDialog').open, false);
      assert.equal(codex.document.activeElement, button); details++;
    });
    return { details, playableLinks: actions, documentaryEntries: archives };
  });

  await test('Codex direct links open the requested dossier and missing image failures stay explicit', async () => {
    const direct = await load('codex.html', { search: '?id=re3r-nemesis' });
    assert($(direct, '#specimenDialog').open);
    assert.equal($(direct, '#detailName').textContent, Data.catalog.find(x => x.id === 're3r-nemesis').name);
    const image = $(direct, '#catalogGrid').querySelector('img'); assert(image);
    image.dispatchEvent({ type: 'error' }); assert.equal(image.hidden, true);
    assert(image.parentElement.textContent.includes('VISUEL INDISPONIBLE'));
    dispose(direct);
    const missing = await load('codex.html', { search: '?id=unknown-test-dossier' });
    assert.equal($(missing, '#specimenDialog').open, false); dispose(missing);
  });
  dispose(codex);

  const pair = await connectOperations();
  await test('Operations iframe handshake launches the real eight-opponent Arcade route', () => {
    const run = pair.start({ difficulty: 'veteran' }), s = assertActive(pair);
    assert.equal(run.mode, 'arcade'); assert.equal(run.route.length, 8); assert.equal(new Set(run.route).size, 8);
    assert(!run.route.includes(s.a.f.uid));
    for (const id of run.route) assert(Data.fighters.some(f => f.uid === id));
    assert.equal(pair.frame.getAttribute('src'), 'modules/versus.html?embed=battle');
    assert.equal($(pair.ops, '#setup').hidden, true); assert.equal($(pair.ops, '#run').hidden, false);
    assert.equal(s.a.f.uid, 're3r-nemesis'); assert.equal(s.b.f.uid, run.route[0]);
    assert.equal(s.options.aiLevel49, 'veteran'); assert.equal(s.rounds, 1); assert.equal(s.timerStart, 99 * 60);
    assert.equal(s.a.ai, false); assert.equal(s.b.ai, true); assert.equal(s.a.life, s.a.max);
    assert.equal(pair.ops.document.activeElement, pair.frame);
    pair.ops.tick(12500); pair.flush(); assert(/Combat actif/.test($(pair.ops, '#runStatus').textContent));
    assert(!pair.packets.some(x => x.data.type === 'cqc-versus-error'), 'Handshake emitted a runtime error');
    return { requestId: run.requestId, difficulty: s.options.aiLevel49, opponents: run.route };
  });

  await test('Operations ignore unrelated windows, stale results and stale acknowledgements', () => {
    pair.start(); assertActive(pair); const before = clone(state(pair)), status = $(pair.ops, '#runStatus').textContent;
    pair.ops.message({ type: 'cqc-versus-result', requestId: before.requestId, winnerSlot: 0, life: 10000, maxLife: 10000 }, {});
    pair.ops.message({ type: 'cqc-versus-result', requestId: 'previous-duel', winnerSlot: 0, life: 10000, maxLife: 10000 }, pair.iframeWindow);
    pair.ops.message({ type: 'cqc-versus-started', requestId: 'previous-duel' }, pair.iframeWindow);
    equal(state(pair), before); assert.equal($(pair.ops, '#runStatus').textContent, status);
  });

  await test('A genuine Arcade KO advances only on Next; duplicate results count once', async () => {
    pair.start(); const before = clone(state(pair)); const result = await realDuel(pair);
    assert.equal(state(pair).wins, 1); assert.equal(state(pair).pending, false); assert.equal(state(pair).index, 0);
    assert.equal(pair.frame.hidden, true); assert.equal($(pair.ops, '#runResult').hidden, false);
    assert.equal($(pair.ops, '#resultTitle').textContent, 'ESSAI VALIDÉ'); assert.equal($(pair.ops, '#nextFight').hidden, false);
    pair.ops.message(result.packet, pair.iframeWindow); assert.equal(state(pair).wins, 1);
    $(pair.ops, '#nextFight').click(); pair.flush(); const s = assertActive(pair);
    assert.equal(state(pair).index, 1); assert.equal(s.b.f.uid, before.route[1]); assert.equal(s.a.life, s.a.max);
    assert.notEqual(state(pair).requestId, before.requestId);
    pair.ops.message(result.packet, pair.iframeWindow); assert.equal(state(pair).wins, 1); assert.equal(state(pair).pending, true);
    return result.summary;
  });

  await test('Eight real Arcade victories complete the route and persist the record', async () => {
    pair.start({ difficulty: 'recruit' });
    for (let n = 0; n < 8; n++) {
      const result = await realDuel(pair); assert.equal(state(pair).wins, n + 1);
      assert.equal(result.summary.encounter, n + 1);
      if (n < 7) { $(pair.ops, '#nextFight').click(); pair.flush(); }
    }
    assert.equal($(pair.ops, '#resultTitle').textContent, 'PROTOCOLE ACHEVÉ');
    assert.equal($(pair.ops, '#nextFight').hidden, true); assert.equal(state(pair).pending, false);
    const after = clone(state(pair)); $(pair.ops, '#nextFight').click(); pair.flush(); equal(state(pair), after);
    const record = JSON.parse(pair.ops.storage.get('re.bow.operations.records/1'))['arcade|recruit'];
    assert.equal(record.wins, 8); assert.equal(record.uid, 're3r-nemesis'); assert(Number.isFinite(Date.parse(record.date)));
    $(pair.ops, '#restartRun').click(); pair.flush(); assert.equal(state(pair), null);
    assert.equal($(pair.ops, '#setup').hidden, false); assert(/8 victoires/.test($(pair.ops, '#record').textContent));
    assert.equal(pair.engine.api().getState(), null);
    return { wins: record.wins, difficulty: 'recruit' };
  });

  await test('Boss Rush selects ten genuine bosses and preserves the selected difficulty', () => {
    const run = pair.start({ mode: 'boss', difficulty: 'legend' }), s = assertActive(pair);
    assert.equal(run.route.length, 10); assert.equal(new Set(run.route).size, 10);
    assert(!run.route.includes(s.a.f.uid));
    assert(run.route.every(id => Data.fighters.find(f => f.uid === id)?.boss));
    assert.equal(s.options.aiLevel49, 'legend'); assert.equal(s.stage.id, Data.stages[5].id);
    assert.equal(pair.engine.api().getMatchConfig().route, 'boss');
    return { difficulty: s.options.aiLevel49, opponents: run.route };
  });

  await test('Apex Mutation selects its twelve fixed forms and matching first chamber', () => {
    const run = pair.start({ mode: 'apex', difficulty: 'veteran' }), stateNow = assertActive(pair);
    assert.equal(run.route.length, 12); assert.equal(new Set(run.route).size, 12);
    assert.deepEqual(Array.from(run.route), APEX_IDS);
    assert.equal(stateNow.b.f.uid, APEX_IDS[0]);
    assert.equal(stateNow.stage.id, 'nest_escape_2019');
    assert.equal(stateNow.options.aiLevel49, 'veteran');
    assert.equal(pair.engine.api().getMatchConfig().route, 'apex');
    assert.deepEqual(Array.from(pair.ops.window.RE_OPERATIONS.apexIds), APEX_IDS);
    return { opponents: run.route, firstStage: stateNow.stage.id };
  });

  await test('E-001 Family Protocol selects fourteen Dulvey subjects',()=>{const run=pair.start({mode:'family',difficulty:'legend',uid:'re3r-nemesis'}),stateNow=assertActive(pair);assert.equal(run.route.length,14);assert.deepEqual(Array.from(run.route),FAMILY_IDS);assert.equal(stateNow.stage.id,'guest_house_attic_2017');assert.equal(pair.engine.api().getMatchConfig().route,'family');return{opponents:run.route}});

  await test('Stylized and cinematic finishes emit one correlated result after their actual sequence', async () => {
    const results = [];
    for (const finishers of ['stylized', 'cinematic']) {
      // R10: use the fixed Family opener (Mia) against Nemesis so this test
      // still exercises an actual compatible conclusion, not a random excluded rig.
      pair.start({ mode: 'family', uid: 're3r-nemesis', finishers }); const before = pair.packets.length;
      const result = await realDuel(pair, { selectFinisher: true });
      assert(result.packet.finisher?.id, finishers + ' must execute the selected compatible prototype finisher');
      assert.equal(pair.packets.slice(before).filter(x => x.data.type === 'cqc-versus-result').length, 1);
      assert.equal(state(pair).wins, 1); assert.equal(state(pair).pending, false);
      assert.equal(pair.engine.api().getFinisherState().window, null);
      assert.equal(pair.engine.api().getFinisherState().scene, null);
      results.push({ mode: finishers, id: result.packet.finisher.id, requestId: result.packet.requestId });
    }
    return { finishes: results };
  });

  let survivalReplay, survivalExpected, survivalInitialLife;
  await test('Survival restores twelve percentage points after actual injuries and carries life into the next engine match', async () => {
    pair.start({ mode: 'survival', difficulty: 'normal' });
    const first = await realDuel(pair, { woundFirst: true });
    const expectedHealth = Math.min(1, first.packet.life / first.packet.maxLife + .12);
    assert(expectedHealth < 1, 'This scenario must exercise an uncapped recovery');
    assert.equal(state(pair).wins, 1); assert.equal(state(pair).health, expectedHealth);
    assert.equal(Number($(pair.ops, '#runHealth').value), expectedHealth);
    assert.equal($(pair.ops, '#runHealthText').textContent, Math.round(expectedHealth * 100) + ' %');
    assert(/SÉRIE 1/.test($(pair.ops, '#runProgress').textContent));
    const previous = state(pair).requestId;
    $(pair.ops, '#nextFight').click(); pair.flush(); const s = assertActive(pair);
    assert.notEqual(state(pair).requestId, previous);
    survivalInitialLife = Math.round(s.a.max * expectedHealth);
    assert.equal(s.a.life, survivalInitialLife); assert.equal(s.b.life, s.b.max);
    assert.equal(pair.engine.api().getMatchConfig().p1Life, survivalInitialLife, 'Restart/replay metadata must reflect actual survival health');
    const second = await realDuel(pair); survivalReplay = clone(second.packet.replay); survivalExpected = second.snapshot;
    assert.equal(survivalReplay.meta.rules58.p1Life, survivalInitialLife, 'Recorded replay must start with the reduced survival health');
    assert.equal(state(pair).wins, 2); assert.equal(state(pair).health, Math.min(1, second.packet.life / second.packet.maxLife + .12));
    return { survivingLife: first.packet.life, maxLife: first.packet.maxLife, recovery: .12,
      nextHealthRatio: expectedHealth, actualNextLife: survivalInitialLife, wins: state(pair).wins };
  });

  await test('A replay recorded during reduced-health Survival reproduces the real result', async () => {
    assert(survivalReplay, 'No survival replay was produced');
    const before = clone(state(pair));
    pair.engine.api().startReplay(survivalReplay); await pair.settleAssets();
    assert.equal(pair.engine.api().getState().a.life, survivalInitialLife);
    for (let i = 0; i < 700 && !pair.engine.api().getState().finished; i++) pair.engine.api().advance(250);
    pair.flush(); equal(engineSnapshot(pair.engine.api().getState()), survivalExpected);
    equal(state(pair), before, 'A replay must not add a second operation victory');
    return { frame: survivalExpected.frame, initialLife: survivalInitialLife, resultSHA256: hash(JSON.stringify(survivalExpected)) };
  });

  await test('A real Survival defeat ends the run and does not increase its record', async () => {
    pair.start({ mode: 'survival' });
    const result = await realDuel(pair, { winningSlot: 1 });
    assert.equal(state(pair).wins, 0); assert.equal(state(pair).pending, false);
    assert.equal($(pair.ops, '#resultTitle').textContent, 'CONFINEMENT ÉCHOUÉ');
    assert.equal($(pair.ops, '#nextFight').hidden, true); assert.equal(pair.frame.hidden, true);
    const after = clone(state(pair)); $(pair.ops, '#nextFight').click(); pair.flush(); equal(state(pair), after);
    assert.equal(JSON.parse(pair.ops.storage.get('re.bow.operations.records/1'))['survival|normal'].wins, 2);
    return result.summary;
  });

  await test('Stale engine errors cannot cancel an active duel with a newer requestId', () => {
    pair.start(); assertActive(pair); const before = clone(state(pair));
    const status = $(pair.ops, '#runStatus').textContent;
    pair.ops.message({ type: 'cqc-versus-error', requestId: 'previous-request', message: 'Delayed old error' }, pair.iframeWindow);
    equal(state(pair), before); assert.equal($(pair.ops, '#runStatus').textContent, status);
  });

  await test('A real engine launch failure retains its requestId and offers a clean restart', () => {
    if (state(pair)) { $(pair.ops, '#leaveRun').click(); pair.flush(); }
    $(pair.ops, '#runForm').dispatchEvent({ type: 'submit' });
    const run = clone(state(pair)); assert(run?.pending);
    const request = pair.queue.find(x => x.to === 'engine' && x.data.type === 'cqc-versus-start');
    assert(request); request.data.config.p1 = 'invalid-fighter-test';
    const before = pair.packets.length; pair.flush();
    const failure = pair.packets.slice(before).find(x => x.data.type === 'cqc-versus-error')?.data;
    assert(failure, 'Engine must explicitly reject an invalid launch'); assert.equal(failure.requestId, run.requestId);
    assert.equal(state(pair).pending, false); assert(/n’a pas pu démarrer/.test($(pair.ops, '#runStatus').textContent));
    assert.equal(pair.engine.api().getState(), null);
    pair.start(); assertActive(pair);
    return { requestId: failure.requestId, message: failure.message };
  });

  await test('A delayed ready notification cannot automatically replay an already completed encounter', async () => {
    pair.start(); await realDuel(pair); const before = clone(state(pair));
    const starts = pair.packets.filter(x => x.data.type === 'cqc-versus-start').length;
    pair.ops.message({ type: 'cqc-versus-ready' }, pair.iframeWindow); pair.flush();
    equal(state(pair), before);
    assert.equal(pair.packets.filter(x => x.data.type === 'cqc-versus-start').length, starts);
  });

  await test('Leaving a run aborts the real engine, late results stay ignored and a new run can launch', () => {
    pair.start({ mode: 'boss' }); assertActive(pair); const old = clone(state(pair));
    $(pair.ops, '#leaveRun').click(); pair.flush();
    assert.equal(state(pair), null); assert.equal(pair.engine.api().getState(), null);
    assert.equal(pair.engine.api().diagnostics().running, false); assert.equal($(pair.ops, '#setup').hidden, false);
    pair.ops.message({ type: 'cqc-versus-result', requestId: old.requestId, winnerSlot: 0, life: 10000, maxLife: 10000 }, pair.iframeWindow);
    assert.equal(state(pair), null);
    pair.start({ mode: 'arcade' }); assertActive(pair);
    assert.notEqual(state(pair).requestId, old.requestId);
    pair.ops.window.dispatchEvent({ type: 'pagehide' }); pair.flush();
    assert.equal(pair.engine.api().diagnostics().paused, true);
  });

  await test('Stored operation records survive a page reload and corrupted storage falls back to a clean setup', async () => {
    const reloaded = await load('operations.html', { storage: pair.ops.storage });
    change(reloaded, '#runDifficulty', 'recruit'); assert(/8 victoires/.test($(reloaded, '#record').textContent));
    dispose(reloaded);
    const corrupted = await load('operations.html', { storage: new Map([['re.bow.operations.records/1', '{invalid']]) });
    assert.equal($(corrupted, '#record').textContent, 'AUCUN RÉSULTAT ENREGISTRÉ'); dispose(corrupted);
  });
  dispose(pair.ops); dispose(pair.engine);
}

function report() {
  const files = ['operations.html', 'codex.html', 'src/operations.js', 'src/codex.js', 'src/unified-engine-v060.js',
    'src/combat-foundation-v060.js', 'src/re-data.js', 'tests/engine-vm.cjs'];
  const output = { generatedAt: new Date().toISOString(), passed: checks.filter(c => c.pass).length,
    failed: checks.filter(c => !c.pass).length, method: `Shipped HTML/scripts, controlled DOM/native Canvas (${native.__binding}), queued postMessage between real operations and engine windows.`,
    sourceSHA256: Object.fromEntries(files.map(f => [f, hash(read(f))])),
    coverage: { catalog: Data.catalog.length, playable: Data.fighters.length, realOperationDuels: duels.length },
    notes, duels, checks };
  fs.writeFileSync(path.join(ROOT, 'tests/pages-results.json'), JSON.stringify(output, null, 2) + '\n');
  fs.writeFileSync(path.join(ROOT, 'docs/verification-pages.md'), [
    '# Vérification des opérations et du bestiaire', '',
    `Exécution : ${output.generatedAt}. **${output.passed} contrôles réussis ; ${output.failed} en échec.**`, '',
    '## Méthode', '',
    'La suite charge réellement `operations.html`, `codex.html` et `modules/versus.html`, puis leurs scripts livrés. Deux fenêtres VM distinctes communiquent avec une file asynchrone de messages `postMessage`, en conservant les identités de `event.source`. Aucun résultat positif n’est fabriqué : les victoires et défaites passent par les collisions, dégâts, KO et fonctions de résultat du moteur.', '',
    'Pour rendre les branches reproductibles, le contrôleur CPU réel pilote temporairement un des deux combattants pendant que l’autre reste immobile. Le scénario Survie laisse d’abord l’adversaire infliger des blessures réelles, puis vérifie la récupération de douze points de pourcentage et les points de vie du prochain combat. Les vies, dégâts, ressources et vainqueurs ne sont jamais écrits par le test. Les messages erronés ou retardés sont injectés uniquement pour vérifier leur rejet.', '',
    'Avant chaque duel ou replay, la suite attend le décodage réel de son décor et des images demandées par le module. Un fichier manquant ou illisible échoue explicitement ; l’horloge de simulation ne remplace pas cette attente.', '',
    'Le DOM contrôlé vérifie les états, liens, filtres, dialogues et interactions de scripts. Il ne remplace pas une inspection navigateur de la mise en page, du clavier réel, de l’iframe native, des tailles tactiles ou des protections de déploiement. La navigation de l’iframe est reliée explicitement au vrai module de combat dans ce banc de test.', '',
    '## Reproduction', '', '```sh', 'node tests/verify-pages.mjs', '```', '',
    'Prérequis : Node.js, les données compilées et `@napi-rs/canvas`, directement installé ou disponible dans `CODEX_PRIMARY_RUNTIME_NODE_MODULES`. Le résultat détaillé et les empreintes SHA-256 des sources sont enregistrés dans `tests/pages-results.json`.', '',
    '## Couverture', '',
    `- ${Data.catalog.length} dossiers consultables ; ${Data.fighters.length} versions jouables.`,
    '- Pagination, recherche avec accents, filtres par épisode/statut, sources et liens des dossiers, fermeture et retour du focus.',
    '- Lancement, accusé de réception et résultat du vrai moteur ; origine de fenêtre et identifiant de requête.',
    '- Huit victoires Arcade, sélection des dix boss, Survie, replays, défaite, retour à la sélection et records persistants.',
    `- ${duels.length} duels d’opération exécutés jusqu’au KO dans cette exécution.`, '',
    '## Duels du parcours', '',
    '| Mode | Rencontre | P1 | P2 | Gagnant | Images simulées | Vie P1 / P2 |',
    '|---|---:|---|---|---:|---:|---:|',
    ...duels.map(d => `| ${d.mode} | ${d.encounter} | ${d.p1} | ${d.p2} | ${d.winnerSlot + 1} | ${d.frame} | ${d.life.join(' / ')} |`), '',
    '## Contrôles', '',
    ...checks.map(c => `- ${c.pass ? 'RÉUSSI' : 'ÉCHEC'} — ${c.name}${c.pass ? '' : '\n\n  ' + String(c.error).split('\n')[0]}`), '',
    '## Traçabilité', '',
    'Une modification de source après cette exécution nécessite de relancer la suite. Les autres règles du combat, techniques, collisions, cinématiques et chroniques sont couvertes par `tests/verify-engine.mjs` et son rapport `docs/verification-runtime.md`.', ''
  ].join('\n'));
  process.stdout.write(JSON.stringify({ passed: output.passed, failed: output.failed, report: 'tests/pages-results.json' }) + '\n');
  process.exitCode = output.failed ? 1 : 0;
}

try { await main(); }
catch (error) { checks.push({ name: 'Suite initialization/completion', pass: false, error: error.stack || String(error) }); }
finally { for (const env of environments) env.dispose(); report(); }
