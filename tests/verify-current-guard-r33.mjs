import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  BASE_COMMIT, ROOT, MAX_ADDED_FILE_BYTES, WORKFLOWS, MOUNTS, allowedAddition,
  collectSnapshot, inheritedSnapshot, validateSnapshot, sourceFiles, ownedReportPath,
} from '../scripts/verify-current-r33.mjs';
import {runGuardCases as runInheritedCases} from './verify-current-guard-r32.mjs';

function clone(snapshot) {
  return {baseline: new Map(snapshot.baseline), current: new Map(snapshot.current),
    changes: snapshot.changes.map(change => ({...change})),
    files: new Map([...snapshot.files].map(([file, metadata]) => [file, {...metadata}])),
    inherited: {baseline: new Map(snapshot.inherited.baseline), current: new Map(snapshot.inherited.current),
      changes: snapshot.inherited.changes.map(change => ({...change}))}};
}
function add(snapshot, file, status = 'A', metadata = {}) {
  snapshot.changes.push({file, status});
  snapshot.files.set(file, {regular: true, symlink: false, bytes: 1, ...metadata});
}
function editPackage(snapshot, edit) {
  const pkg = JSON.parse(snapshot.current.get('package.json'));
  edit(pkg);
  snapshot.current.set('package.json', JSON.stringify(pkg));
}

export function runGuardCases(snapshot, {writeReport = true, reportPath} = {}) {
  const cases = [];
  function test(name, check) {
    try {check(); cases.push({name, pass: true}); console.log('PASS ' + name);}
    catch (error) {cases.push({name, pass: false, error: error.message}); console.error('FAIL ' + name + ': ' + error.message);}
  }
  function rejected(name, mutate, expected) {
    test(name, () => {const fixture = clone(snapshot); mutate(fixture); assert.throws(() => validateSnapshot(fixture), expected);});
  }

  test('The current R33 delta and inherited current sources are admitted together', () => {
    const report = validateSnapshot(snapshot);
    assert.equal(report.published_baseline, BASE_COMMIT);
    assert.equal(report.inheritedGuard.modified, 17);
    assert.equal(report.inheritedGuard.added, 18);
    assert.equal(report.historicalFilesRewritten, false);
  });
  for (const file of ['src/unified-engine-v060.js', 'tests/verify-engine.mjs',
    'assets/portraits/unreviewed.png', 'data/roster.json', 'docs/R31_DELIVERY.json',
    'modules/fidelity-r31/combat/generated-runtime.js']) {
    rejected('An inherited file remains frozen: ' + file,
      fixture => add(fixture, file, 'M'), /Unreviewed modification/);
  }
  rejected('Deleting a permitted HTML mount is refused', fixture => {
    add(fixture, 'modules/versus.html', 'D');
  }, /Deletion, rename or type change|Duplicate R33/);
  rejected('A rename cannot hide an old source modification', fixture => {
    add(fixture, 'src/catalog-duel-v070.js', 'R100');
  }, /Deletion, rename or type change/);
  rejected('A new source outside the R33 namespaces is refused', fixture => {
    add(fixture, 'src/unreviewed-controller.js');
  }, /Unreviewed R33 addition/);
  rejected('A new tool must have an R33 name', fixture => {
    add(fixture, 'scripts/unreviewed-helper.py');
  }, /Unreviewed R33 addition/);
  rejected('An unknown root file cannot masquerade as an R33 module', fixture => {
    add(fixture, 'modules/fidelity-r33/unreviewed.js');
  }, /Unreviewed R33 addition/);
  test('Traversal and alternate separators cannot enter an allowed namespace', () => {
    for (const file of ['modules/fidelity-r33/native/../../../../src/engine.js',
      'modules/fidelity-r33//native/file.json', '/modules/fidelity-r33/native/file.json',
      'modules\\fidelity-r33\\native\\file.json', 'modules/fidelity-r33/native/\0bad']) {
      assert.equal(allowedAddition(file), false, file);
    }
  });
  rejected('A delivered symlink is refused', fixture => {
    add(fixture, 'modules/fidelity-r33/native/fault-symlink.json', 'A', {regular: false, symlink: true});
  }, /regular file, not a symlink/);
  rejected('An empty placeholder does not count as a delivered source', fixture => {
    add(fixture, 'modules/fidelity-r33/native/fault-empty.json', 'A', {bytes: 0});
  }, /Empty or invalid/);
  rejected('A 100 MiB source cannot be committed as a regular Git asset', fixture => {
    add(fixture, 'modules/fidelity-r33/native/fault-large.zip', 'A', {bytes: MAX_ADDED_FILE_BYTES});
  }, /100 MiB limit/);
  rejected('Duplicate Git changes are refused', fixture => {
    fixture.changes.push({...fixture.changes.find(change => change.file === 'package.json')});
  }, /Duplicate R33 changed path/);
  rejected('An original current engine assertion cannot be omitted', fixture => {
    editPackage(fixture, pkg => {pkg.scripts['verify:current'] = pkg.scripts['verify:current'].replace('node tests/verify-engine.mjs && ', '');});
  }, /all current and archival suites must remain/);
  rejected('The primary verification still requires both original published assertions', fixture => {
    editPackage(fixture, pkg => {pkg.scripts.verify = 'npm run verify:current';});
  }, /all current and archival suites must remain/);
  rejected('The original published commit cannot silently follow a branch', fixture => {
    editPackage(fixture, pkg => {pkg.scripts['verify:historical:r31'] = pkg.scripts['verify:historical:r31'].replace(/[a-f0-9]{40}/, 'main');});
  }, /all current and archival suites must remain/);
  rejected('The nine R32 browser recipes cannot be shortened', fixture => {
    editPackage(fixture, pkg => {pkg.scripts['verify:r32:http'] = 'node tests/browser-input-r32.mjs';});
  }, /all current and archival suites must remain/);
  rejected('Package metadata cannot change incidentally to the guard boundary', fixture => {
    editPackage(fixture, pkg => {pkg.version = '0.7.4';});
  }, /all current and archival suites must remain/);
  rejected('The new R33 source verification cannot be replaced by a success print', fixture => {
    editPackage(fixture, pkg => {pkg.scripts['verify:r33'] = 'node -e "console.log(1)"';});
  }, /all current and archival suites must remain/);
  rejected('The new R33 browser recipes remain blocking commands', fixture => {
    editPackage(fixture, pkg => {pkg.scripts['verify:r33:http'] += ' || true';});
  }, /all current and archival suites must remain/);
  for (const file of WORKFLOWS) {
    rejected('The direct guard caller cannot acquire an unrelated workflow change: ' + file, fixture => {
      fixture.current.set(file, fixture.current.get(file) + '\n# unrelated change\n');
    }, /Only the direct guard invocation/);
  }
  rejected('An R33 pipeline edit must be checked before in-memory projection', fixture => {
    fixture.current.set(WORKFLOWS[0], fixture.baseline.get(WORKFLOWS[0]));
  }, /Only the direct guard invocation/);
  rejected('A required direct guard caller cannot disappear from the delta', fixture => {
    fixture.changes = fixture.changes.filter(change => change.file !== WORKFLOWS[0]);
  }, /pipeline change must be present/);
  for (const file of MOUNTS) {
    rejected('An unrelated HTML edit remains refused: ' + file, fixture => {
      if (!fixture.changes.some(change => change.file === file)) add(fixture, file, 'M');
      fixture.current.set(file, fixture.current.get(file) + '<script>window.unreviewed=true;</script>');
    }, /Only the reviewed R33 external-script mounts/);
  }
  rejected('The inherited input fix is still checked against current bytes', fixture => {
    const file = 'src/trial-input-v071.js';
    fixture.inherited.current.set(file, fixture.inherited.current.get(file) + '\nwindow.unreviewed=true;\n');
  }, /Only the reviewed opposite-direction resolution/);
  rejected('The inherited evolution focus correction cannot revert behind the projection', fixture => {
    const file = 'modules/fidelity-r28/evolutions/duel.js';
    fixture.inherited.current.set(file, fixture.inherited.baseline.get(file));
  }, /Only the reviewed evolution focus and numpad boundaries/);
  rejected('The inherited gallery lifecycle correction cannot revert behind the projection', fixture => {
    const file = 'modules/fidelity-r31/sprites/page.js';
    fixture.inherited.current.set(file, fixture.inherited.baseline.get(file));
  }, /Only the reviewed gallery selection and initialization boundaries/);
  rejected('The original current browser workflow cannot be made nonblocking', fixture => {
    const file = '.github/workflows/gamedev-r32.yml';
    fixture.inherited.current.set(file, fixture.inherited.current.get(file).replace('run: npm run verify:r32:http', 'run: echo skipped'));
  }, /Workflow must preserve/);
  rejected('The current R31 browser recipes cannot be silently archived', fixture => {
    const file = '.github/workflows/source-fidelity-r31.yml';
    fixture.inherited.current.set(file, fixture.inherited.current.get(file).replace('ref: ${{ github.sha }}', 'ref: ' + BASE_COMMIT));
  }, /Workflow must preserve/);
  test('Report output paths cannot overwrite package, historical reports or another R33 proof', () => {
    for (const file of ['package.json', 'docs/R31_DELIVERY.json', 'docs/R33_VALIDATION.json',
      'docs/R33_CI_VALIDATION.json', 'qa-fidelity-r33-ci/../../package.json', '/tmp/unowned.json']) {
      assert.throws(() => ownedReportPath(file, 're.bow.current-guard-tests-r33/1',
        'docs/R33_CURRENT_GUARD_TESTS.json'), /relative and normalized|own document or an ignored QA/);
    }
  });
  test('The source guard and its tests have separate owned report documents', () => {
    assert.equal(ownedReportPath('docs/R33_CURRENT_GUARD_TESTS.json', 're.bow.current-guard-tests-r33/1',
      'docs/R33_CURRENT_GUARD_TESTS.json'), path.join(ROOT, 'docs/R33_CURRENT_GUARD_TESTS.json'));
    assert.equal(ownedReportPath('qa-fidelity-r33-ci/current-scope.json', 're.bow.current-scope-r33/1',
      'docs/R33_CURRENT_SCOPE.json'), path.join(ROOT, 'qa-fidelity-r33-ci/current-scope.json'));
  });

  const inherited = runInheritedCases(inheritedSnapshot(snapshot), {
    writeReport: false, origin: 'Current inherited sources with strictly verified R33-only wiring projected in memory',
  });
  const report = {
    schema: 're.bow.current-guard-tests-r33/1', baseline: BASE_COMMIT,
    passed: cases.filter(item => item.pass).length, failed: cases.filter(item => !item.pass).length,
    historicalPassed: inherited.passed, historicalFailed: inherited.failed,
    historicalCases: inherited.cases, cases, sourceFiles: sourceFiles(),
    scope: 'New R33 source/pipeline fault injections only; the separately counted 40 R32 guard cases are unchanged. Runtime suites still execute current source.',
  };
  if (inherited.failed) report.failed += 1;
  if (writeReport) {
    const output = ownedReportPath(reportPath || 'qa-fidelity-r33-ci/current-guard.json', report.schema,
      'docs/R33_CURRENT_GUARD_TESTS.json');
    fs.mkdirSync(path.dirname(output), {recursive: true});
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({suite: 'r33-current-guard', passed: report.passed, failed: report.failed,
    historicalPassed: inherited.passed, historicalFailed: inherited.failed}));
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const reportPath = process.argv.find(value => value.startsWith('--report='))?.slice(9);
  const report = runGuardCases(collectSnapshot(), {reportPath});
  if (report.failed) process.exitCode = 1;
}
