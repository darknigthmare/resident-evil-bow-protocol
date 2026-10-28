/** Shared decode accounting, voluntary timing and read-only combat summary regressions. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const paths = ['modules/fidelity-r31/performance/image-budget.js', 'modules/fidelity-r31/performance/monitor.js',
  'modules/fidelity-r31/access/match-summary.js', 'tests/verify-performance-access-r31.mjs'];
const source = file => fs.readFileSync(path.join(root, file), 'utf8');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const checks = [];
async function test(name, run) {try {checks.push({name, pass: true, detail: await run()}); console.log('PASS ' + name);}
  catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}}
function budget() {
  const events = new Map(), sandbox = {addEventListener(type, callback) {events.set(type, callback);}};
  vm.createContext(sandbox); vm.runInContext(source(paths[0]), sandbox);
  return {api: sandbox.RE_IMAGE_BUDGET_R31, hide: () => events.get('pagehide')()};
}
const MP = 1024 * 1024;
await test('Separate reader caches share one actual reservation cap', () => {
  const {api} = budget(), evicted = [];
  api.reserve('native', 'a', 12 * MP, () => evicted.push('native')).ready();
  api.reserve('avatars', 'b', 12 * MP, () => evicted.push('avatars')).ready();
  const generated = api.reserve('generated', 'c', 10 * MP, () => {}); assert(generated); generated.ready();
  assert.deepEqual(evicted, ['native']); assert.equal(api.state().reservedPixels, 22 * MP);
  assert(api.state().peakPixels <= api.state().limits.pixels);
  return {syntheticPixelReservations: true, readers: 3, managedLimitPixels: 32 * MP};
});
await test('Pending decodes remain reserved and cannot be silently evicted', () => {
  const {api} = budget(); let evicted = false;
  const first = api.reserve('native', 'pending', 32 * MP, () => {evicted = true;});
  assert.equal(api.reserve('avatars', 'next', 1, () => {}), null); assert.equal(evicted, false);
  assert.equal(api.state().pendingPixels, 32 * MP); first.release(); assert.equal(api.state().reservedPixels, 0);
  assert(api.reserve('avatars', 'next', 1, () => {})); return {pendingCreditsCounted: true, laterReservationRecovers: true};
});
await test('Invalid reservations never allocate credit and owner names cannot alter prototypes', () => {
  const {api} = budget();
  for (const count of [0, -1, NaN, Infinity, .5, 33 * MP]) assert.equal(api.reserve('native', 'bad', count, () => {}), null);
  assert.equal(api.reserve('../outside', 'bad', 1, () => {}), null); assert.equal(api.state().assets, 0);
  const lease = api.reserve('constructor', 'safe-key', 10, () => {}); lease.ready();
  assert.equal(api.state().owners.constructor.pixels, 10); assert.equal(Object.prototype.pixels, undefined);
  return {invalidCountsRefused: 6, prototypeCollisionHandled: true};
});
await test('LRU touches protect live artwork while stale leases cannot free newer assets', () => {
  const {api} = budget(), evicted = [];
  const old = api.reserve('native', 'old', 12 * MP, () => evicted.push('old')); old.ready();
  api.reserve('avatars', 'other', 12 * MP, () => evicted.push('other')).ready(); old.touch();
  api.reserve('generated', 'new', 10 * MP, () => {}).ready(); assert.deepEqual(evicted, ['other']);
  api.clear(); const replacement = api.reserve('native', 'old', 1, () => {}); replacement.ready();
  assert.equal(old.release(), false); assert.equal(api.state().assets, 1); replacement.release();
  return {usedNativeArtRetained: true, staleLeaseCannotReleaseReplacement: true};
});
await test('Asset count is bounded even for tiny images and eviction failures do not leak credit', () => {
  const {api} = budget();
  for (let n = 0; n < 70; n++) api.reserve('avatars', String(n), 1, () => {throw Error('Fault-injected cleanup');}).ready();
  assert.equal(api.state().assets, 64); assert.equal(api.state().reservedPixels, 64); assert.equal(api.state().evictions, 6);
  api.clear(); assert.equal(api.state().reservedPixels, 0); return {maximumAssets: 64, failingCleanupCreditsReleased: true};
});
await test('Pagehide clears pending and ready credits and a restored page can reserve again', () => {
  const {api, hide} = budget(); let callbacks = 0;
  api.reserve('native', 'ready', MP, () => callbacks++).ready(); api.reserve('avatars', 'pending', MP, () => callbacks++);
  hide(); assert.equal(callbacks, 2); assert.equal(api.state().assets, 0); assert.equal(api.state().reservedPixels, 0);
  assert(api.reserve('generated', 'restored', 1, () => {})); return {pendingAndReadyReleased: 2, resumed: true};
});
await test('Capacity notifications are coalesced after releases and do not create reservation eviction loops', async () => {
  const {api} = budget(); let notices = 0; const unsubscribe = api.subscribe(() => notices++);
  const first = api.reserve('native', 'first', 32 * MP, () => {}); first.ready();
  api.reserve('avatars', 'second', 1, () => {}).ready(); await Promise.resolve();
  assert.equal(notices, 0, 'Allocating and evicting cannot immediately trigger a reader reload loop');
  api.clear(); await Promise.resolve(); assert.equal(notices, 1);
  unsubscribe(); api.clear(); await Promise.resolve(); assert.equal(notices, 1); return {releaseListenerCoalesced: true, evictionReloadLoopPrevented: true};
});
function monitoring() {
  let clock = 0, id = 0; const rafs = new Map(), timers = new Map(), events = new Map(), observers = [];
  const actor = Object.freeze({f: Object.freeze({uid: 'fixture', name: 'Fixture'}), life: 5000});
  const state = Object.freeze({a: actor, b: actor, frame: 120, round: 1});
  class Observer {static supportedEntryTypes = ['longtask']; constructor(callback) {this.callback = callback; this.disconnected = false; observers.push(this);} observe() {} disconnect() {this.disconnected = true;}}
  const sandbox = {performance: {now: () => clock}, PerformanceObserver: Observer, RE_CATALOG_DUEL: {getState: () => state},
    document: {hidden: false, addEventListener(type, callback) {events.set(type, callback);}},
    addEventListener(type, callback) {events.set(type, callback);},
    requestAnimationFrame(callback) {rafs.set(++id, callback); return id;}, cancelAnimationFrame(key) {rafs.delete(key);},
    setTimeout(callback, delay) {timers.set(++id, {callback, at: clock + delay}); return id;}, clearTimeout(key) {timers.delete(key);}};
  vm.createContext(sandbox); vm.runInContext(source(paths[1]), sandbox);
  function step(ms) {clock += ms; const current = [...rafs.values()]; rafs.clear(); for (const callback of current) callback(clock);
    for (const [key, timer] of [...timers]) if (timer.at <= clock) {timers.delete(key); timer.callback();}}
  return {api: sandbox.RE_PERFORMANCE_R31, sandbox, state, observers, step, events, rafs, timers};
}
await test('Voluntary timing observes callbacks without modifying a frozen engine', async () => {
  const e = monitoring(), before = JSON.stringify(e.state); assert.equal(e.api.state().active, false);
  const promise = e.api.start({durationMs: 1000}); await assert.rejects(e.api.start({durationMs: 1000}), /déjà/);
  e.observers[0].callback({getEntries: () => [{duration: 60}, {duration: 80}]});
  for (let n = 0; n < 70; n++) e.step(1000 / 60);
  const result = await promise; assert.equal(result.reason, 'duration'); assert(result.callbackIntervals >= 50);
  assert.equal(result.longTasks, 2); assert.equal(result.observedEngineTicks, 0); assert.equal(before, JSON.stringify(e.state));
  assert.equal(e.rafs.size, 0); assert.equal(e.timers.size, 0); assert.equal(e.observers[0].disconnected, true);
  assert.equal(result.physicalDeviceCertified, false); assert.equal(result.gpuAllocationsMeasured, false);
  return {virtualClockFixture: true, physicalFpsClaimed: false, frozenEngineUnchanged: true};
});
await test('Hidden and interrupted timing runs stop and release all observation handles', async () => {
  const e = monitoring(); await assert.rejects(e.api.start({durationMs: 999}), /limites/);
  const promise = e.api.start({durationMs: 1000}); for (let n = 0; n < 10; n++) e.step(17);
  e.sandbox.document.hidden = true; e.events.get('visibilitychange')();
  assert.equal((await promise).reason, 'hidden'); assert.equal(e.rafs.size, 0); assert.equal(e.timers.size, 0);
  await assert.rejects(e.api.start(), /Afficher/); return {backgroundMeasurementsPrevented: true, partialRunRetained: true};
});
await test('Timing samples and long-task observations stay bounded during very high callback rates', async () => {
  const e = monitoring(), promise = e.api.start({durationMs: 60000});
  for (let n = 0; n < 20000; n++) e.step(.01);
  e.observers[0].callback({getEntries: () => Array.from({length: 2000}, () => ({duration: 60}))});
  e.api.stop(); const result = await promise;
  assert.equal(result.callbackIntervals, 7200); assert.equal(result.longTasks, 256); return {virtualCallbacks: 20000, retainedIntervals: 7200, retainedLongTasks: 256};
});
await test('Combat snapshot reads exact actor resources and evolution reasons without writing actors', () => {
  const sandbox = {}; vm.createContext(sandbox); vm.runInContext(source(paths[2]), sandbox);
  const fighter = Object.freeze({uid: 'example', name: 'Sujet <img src=x>', combat: Object.freeze({resource: Object.freeze({label: 'MUNITIONS', max: 6})})});
  const actor = Object.freeze({f: fighter, life: 3910, max: 10000, meter: 36, r: 3, guard: 75, wins: 1});
  const state = Object.freeze({a: actor, b: actor, frame: 678, phase: 'fight', round: 2, evolutionsR28: Object.freeze({})});
  const original = JSON.stringify(state), snapshot = sandbox.RE_MATCH_SUMMARY_R31.describe(state, {available: () => [{to: 'next', target: {name: 'Forme suivante'}, reason: null}]});
  assert.equal(snapshot.fighters[0].lifePercent, 39); assert.equal(snapshot.fighters[0].resource, 3); assert.equal(snapshot.fighters[0].meter, 36);
  assert.equal(snapshot.fighters[0].evolutions[0].available, true); assert.equal(JSON.stringify(state), original);
  assert(snapshot.text.includes('Sujet <img src=x>')); assert.equal(snapshot.round, 2);
  return {frozenActorsUnchanged: true, actualResourceLabel: 'MUNITIONS', evolutionReasonReadOnly: true};
});
await test('No match and nonfinite actor data produce bounded readable snapshots', () => {
  const sandbox = {}; vm.createContext(sandbox); vm.runInContext(source(paths[2]), sandbox); const api = sandbox.RE_MATCH_SUMMARY_R31;
  assert.equal(api.describe(null).available, false);
  const actor = {f: {uid: 'x', name: 'x'.repeat(5000)}, life: NaN, max: NaN, meter: Infinity};
  const value = api.describe({a: actor, b: actor, phase: 'fight'}); assert.equal(value.fighters[0].name.length, 300);
  assert.equal(value.fighters[0].lifePercent, 0); assert(!value.text.includes('NaN')); assert(!value.text.includes('Infinity'));
  return {emptyStateSupported: true, labelsBounded: 300, nonfiniteValuesExcluded: true};
});
const report = {schema: 're.bow.performance-access-unit-r31/1', passed: checks.filter(row => row.pass).length,
  failed: checks.filter(row => !row.pass).length, checks,
  inputs: paths.map(file => ({path: file, sha256: hash(fs.readFileSync(path.join(root, file)))})),
  scope: 'Actual shared reservation, observer lifecycle and read-only snapshot code. Synthetic pixel/timing fixtures verify bounds, not physical-device performance or real screen-reader certification.'};
fs.writeFileSync(path.join(root, 'docs/R31_PERFORMANCE_ACCESS_TESTS.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, failed: report.failed})); if (report.failed) process.exitCode = 1;
