import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT, BASE_COMMIT, WORKFLOWS, LEGACY_BROWSER_WORKFLOWS, DISCOVERY_TEST, MOUNTS, collectSnapshot, validateSnapshot, projectedR33,
  projectedLegacyWorkflow, projectedDiscoveryTest, allowedAddition, ownedReportPath, sourceFiles,
  AI_TOOLING_ADDITIONS} from '../scripts/verify-current-r34.mjs';
import {runGuardCases as inheritedCases} from './verify-current-guard-r33.mjs';
function clone(s) {return {...s, baseline: new Map(s.baseline), current: new Map(s.current), files: new Map([...s.files].map(([key, value]) => [key, {...value}])),
  changes: s.changes.map(value => ({...value})), publishedChanges: s.publishedChanges.map(value => ({...value})),
  inherited: {...s.inherited, current: new Map(s.inherited.current), files: new Map(s.inherited.files), changes: s.inherited.changes.map(value => ({...value})),
    inherited: {...s.inherited.inherited, current: new Map(s.inherited.inherited.current)}}};}
function add(s, file, status = 'A', extra = {}) {s.changes.push({file, status}); s.files.set(file, {regular: true, symlink: false, bytes: 1, ...extra});}
export function runCases(snapshot) {
  const checks = [];
  function test(name, run) {try {run(); checks.push({name, pass: true}); console.log('PASS ' + name);} catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}}
  function reject(name, change, reason) {test(name, () => {const fixture = clone(snapshot); change(fixture); assert.throws(() => validateSnapshot(fixture), reason);});}
  function editPackage(s, edit) {const pkg = JSON.parse(s.current.get('package.json')); edit(pkg); s.current.set('package.json', JSON.stringify(pkg));}
  test('The actual R34 boundary preserves both previous source guards', () => {const result = validateSnapshot(snapshot); assert.equal(result.baselineCommit, BASE_COMMIT); assert.equal(result.preservedR33Guard.modified, 7); assert.equal(result.functionalTestsArchived, false);});
  test('Developer tooling admits only the six named additions', () => {
    assert.equal(AI_TOOLING_ADDITIONS.length, 6);
    for (const file of AI_TOOLING_ADDITIONS) assert.equal(allowedAddition(file), true);
    for (const file of ['.ai-tools/unreviewed.py', '.ai-tools/tests/extra.py', '.claude/settings.json',
      '.agents/skills/unreviewed/SKILL.md', 'CLAUDE.local.md', '.ai-tools/../src/extra.js']) assert.equal(allowedAddition(file), false);
  });
  if (snapshot.changes.some(item => item.file === 'AGENTS.md')) {
    test('Tooling preserves the original agent bytes in both inherited projections', () => {
      assert.equal(validateSnapshot(snapshot).aiTooling, true);
      assert.equal(projectedR33(snapshot).inherited.current.get('AGENTS.md'), snapshot.baseline.get('AGENTS.md'));
    });
    test('The published R34 boundary remains valid without the optional tooling', () => {
      const fixture = clone(snapshot);
      fixture.changes = fixture.changes.filter(item => item.file !== 'AGENTS.md' && !AI_TOOLING_ADDITIONS.includes(item.file));
      fixture.current.set('AGENTS.md', fixture.baseline.get('AGENTS.md'));
      assert.equal(validateSnapshot(fixture).aiTooling, false);
    });
    reject('Existing agent instructions cannot be edited through the appendix', s => {
      s.current.set('AGENTS.md', 'rewritten instructions\n' + s.current.get('AGENTS.md'));
    }, /published agent instructions/);
    reject('Extra instructions cannot be hidden after the reviewed appendix', s => {
      s.current.set('AGENTS.md', s.current.get('AGENTS.md') + '\nUnreviewed instruction\n');
    }, /reviewed AI tooling appendix/);
    reject('The helper cannot be delivered without its reviewed tests', s => {
      s.changes = s.changes.filter(item => item.file !== '.ai-tools/tests/test_setup.py');
    }, /complete reviewed AI tooling/);
    reject('Tooling cannot be delivered without its additive agent instructions', s => {
      s.changes = s.changes.filter(item => item.file !== 'AGENTS.md');
    }, /reviewed AGENTS.md append/);
    reject('A tooling path cannot replace a delivered regular file with a symlink', s => {
      s.files.set('.ai-tools/setup.py', {regular: false, symlink: true, bytes: 1});
    }, /regular/);
  }
  for (const file of ['src/catalog-duel-v070.js', 'src/unified-engine-v060.js', 'data/roster.json', 'assets/catalog/unreviewed.png',
    'tests/verify-engine.mjs', 'modules/fidelity-r33/combat/generated-runtime.js', 'docs/R33_VALIDATION.json']) reject('Previously published source remains frozen: ' + file, s => add(s, file, 'M'), /Frozen file changed/);
  reject('A source outside the R34 namespace is refused', s => add(s, 'src/new-unreviewed.js'), /Unknown R34 addition/);
  reject('A deleted mount is refused', s => {s.changes = s.changes.filter(item => item.file !== MOUNTS[0]); add(s, MOUNTS[0], 'D');}, /No removal/);
  reject('A rename cannot bypass source conservation', s => add(s, 'src/renamed.js', 'R100'), /No removal/);
  reject('A delivered symlink is refused', s => add(s, 'modules/fidelity-r34/assets/fault.json', 'A', {regular: false, symlink: true}), /regular/);
  reject('An empty pending output is not a delivered image', s => add(s, 'modules/fidelity-r34/assets/generated/fault.png', 'A', {bytes: 0}), /nonempty/);
  reject('A100MiB individual blob is refused', s => add(s, 'modules/fidelity-r34/assets/large.png', 'A', {bytes: 100 * 1024 * 1024}), /below100MiB/);
  test('Traversal, temporary output and alternate separators are refused', () => {for (const value of ['modules/fidelity-r34/assets/../../src/x.js', '/modules/fidelity-r34/assets/x.png',
    'modules\\fidelity-r34\\assets\\x.png', 'modules/fidelity-r34/assets/x.json.tmp', 'modules/fidelity-r34//assets/x.json']) assert.equal(allowedAddition(value), false);});
  reject('Repeated changed paths are refused', s => s.changes.push({...s.changes[0]}), /Duplicate/);
  reject('An original current engine assertion cannot disappear', s => editPackage(s, pkg => {pkg.scripts['verify:current'] = pkg.scripts['verify:current'].replace('node tests/verify-engine.mjs && ', '');}), /original functional commands/);
  reject('Current verification must still require its published preservation step', s => editPackage(s, pkg => {pkg.scripts.verify = 'npm run verify:current';}), /original functional commands/);
  reject('The published R31 reference cannot follow an arbitrary branch', s => editPackage(s, pkg => {pkg.scripts['verify:historical:r31'] = pkg.scripts['verify:historical:r31'].replace(/[a-f0-9]{40}/, 'main');}), /original functional commands/);
  reject('The exact unchanged R32 compatibility runner cannot become a success print', s => editPackage(s, pkg => {pkg.scripts['verify:r32:http'] = 'node -e "console.log(true)"';}), /original functional commands/);
  reject('The new default flow recipe cannot be omitted', s => editPackage(s, pkg => {pkg.scripts['verify:r34:http'] = 'node tests/browser-roster-runtime-r34.mjs';}), /original functional commands/);
  reject('Package metadata remains unchanged', s => editPackage(s, pkg => {pkg.version = '1.0.0';}), /original functional commands/);
  for (const file of MOUNTS) reject('Unreviewed inline presentation is refused: ' + file, s => s.current.set(file, s.current.get(file).replace('</body>', '<script>alert(1)</script></body>')), /external presentation mounts/);
  test('Mounts preserve original controller URL identities', () => {assert(snapshot.current.get('catalog-duel.html').includes('src/catalog-duel-v070.js')); assert(!snapshot.current.get('catalog-duel.html').includes('catalog-controller.js'));});
  for (const file of WORKFLOWS) reject('A workflow cannot bypass assertions: ' + file, s => s.current.set(file, s.current.get(file) + '\n# unexpected edit\n'), /Workflow changes/);
  test('Every legacy teststep preload has an exact inverse to the published workflow', () => {
    assert.equal(Object.keys(LEGACY_BROWSER_WORKFLOWS).length, 21);
    assert.equal(Object.values(LEGACY_BROWSER_WORKFLOWS).flat().length, 65);
    for (const file of Object.keys(LEGACY_BROWSER_WORKFLOWS)) assert.equal(projectedLegacyWorkflow(file, snapshot.current.get(file)), snapshot.baseline.get(file));
  });
  reject('A legacy test cannot remove its explicitly scoped preload', s => {
    const file = '.github/workflows/flight-r12-browser.yml';
    s.current.set(file, s.current.get(file).replace('node --import=./tests/browser-compat-r34.mjs tests/browser-flight-r12.mjs', 'node tests/browser-flight-r12.mjs'));
  }, /Workflow changes/);
  reject('A legacy test cannot use a job-wide preload before dependencies exist', s => {
    const file = '.github/workflows/flight-r12-browser.yml';
    s.current.set(file, s.current.get(file).replace('jobs:\n', 'env:\n  NODE_OPTIONS: --import=./tests/browser-compat-r34.mjs\njobs:\n'));
  }, /Workflow changes/);
  test('The dashboard discovery correction restores every original assertion byte on inverse projection', () => {
    assert.equal(projectedDiscoveryTest(snapshot.current.get(DISCOVERY_TEST)), snapshot.baseline.get(DISCOVERY_TEST));
  });
  reject('A dashboard assertion cannot be removed with its discovery correction', s => {
    s.current.set(DISCOVERY_TEST, s.current.get(DISCOVERY_TEST).replace("assert.equal(await link.count(), 1, 'One named source entry');", ''));
  }, /Only the owning-dashboard discovery/);
  reject('Published R33 source validation cannot silently become an arbitrary checkout', s => {const file = '.github/workflows/source-fidelity-r33.yml'; s.current.set(file, s.current.get(file).replace('ref: ' + BASE_COMMIT, 'ref: main'));}, /Workflow changes/);
  test('The report writer cannot replace another release or follow a symlink', () => {assert.throws(() => ownedReportPath('docs/R33_VALIDATION.json', 're.bow.current-guard-tests-r34/1', 'docs/R34_CURRENT_GUARD_TESTS.json')); assert.throws(() => ownedReportPath('../outside.json', 'x', 'docs/R34_CURRENT_GUARD_TESTS.json'));});
  const inherited = inheritedCases(projectedR33(snapshot), {writeReport: false});
  const report = {schema: 're.bow.current-guard-tests-r34/1', passed: checks.filter(item => item.pass).length,
    failed: checks.filter(item => !item.pass).length + (inherited.failed || inherited.historicalFailed ? 1 : 0), checks,
    inheritedR33Passed: inherited.passed, inheritedR33Failed: inherited.failed, inheritedR32Passed: inherited.historicalPassed, inheritedR32Failed: inherited.historicalFailed,
    sourceFiles: sourceFiles(), scope: 'R34 boundary fault injections. The original39 R33 and40 R32 cases execute unchanged after the exact reviewed R34 mount/pipeline projection; no original current functional assertion is removed.'};
  const target = process.argv.find(value => value.startsWith('--report='))?.slice(9) || 'qa-fidelity-r34/current-guard.json';
  const output = ownedReportPath(target, report.schema, 'docs/R34_CURRENT_GUARD_TESTS.json'); fs.mkdirSync(path.dirname(output), {recursive: true}); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({passed: report.passed, failed: report.failed, inheritedR33: report.inheritedR33Passed, inheritedR32: report.inheritedR32Passed})); return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {if (runCases(collectSnapshot()).failed) process.exitCode = 1;}
