import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  BASE_COMMIT, ROOT, R32_FILES, collectSnapshot, validateSnapshot,
} from '../scripts/verify-current-r32.mjs';

const clone = snapshot => ({
  baseline: new Map(snapshot.baseline),
  current: new Map(snapshot.current),
  changes: snapshot.changes.map(change => ({...change})),
});

export function runGuardCases(snapshot, {writeReport = true, origin = 'supplied in-memory snapshot'} = {}) {
  const cases = [];
  function test(name, check) {
    try {
      check();
      cases.push({name, pass: true});
      console.log('PASS ' + name);
    } catch (error) {
      cases.push({name, pass: false, error: error.message});
      console.error('FAIL ' + name + ': ' + error.message);
    }
  }
  function rejected(name, mutate, message) {
    test(name, () => {
      const fixture = clone(snapshot);
      mutate(fixture);
      assert.throws(() => validateSnapshot(fixture), message);
    });
  }
  function editPackage(fixture, change) {
    const pkg = JSON.parse(fixture.current.get('package.json'));
    change(pkg);
    fixture.current.set('package.json', JSON.stringify(pkg));
  }
  test('The reviewed current files and historical command split are accepted', () => {
    const result = validateSnapshot(snapshot);
    assert.equal(result.published_baseline, BASE_COMMIT);
    assert.equal(result.modified.length, 17);
    assert.equal(result.added.length, Object.keys(R32_FILES).length - 17 -
      (snapshot.current.has('docs/GAMEDEV_APPLIED_R32.json') ? 0 : 1));
  });
  rejected('An unrelated engine change is refused', fixture => {
    fixture.changes.push({status: 'M', file: 'src/unified-engine-v060.js'});
  }, /Unreviewed R32 change/);
  rejected('An extra change to a historical test is refused', fixture => {
    fixture.changes.push({status: 'M', file: 'tests/verify-preservation-r20.mjs'});
  }, /Unreviewed R32 change/);
  rejected('A regenerated historical delivery report is not accepted as new source evidence', fixture => {
    fixture.changes.push({status: 'M', file: 'docs/R31_DELIVERY_AUDIT.json'});
  }, /Unreviewed R32 change/);
  rejected('An undeclared new file is refused', fixture => {
    fixture.changes.push({status: 'A', file: 'src/unreviewed-helper-r32.js'});
  }, /Unreviewed R32 change/);
  rejected('Deleting an approved source file is refused', fixture => {
    fixture.changes.find(value => value.file === 'src/trial-input-v071.js').status = 'D';
    fixture.current.delete('src/trial-input-v071.js');
  }, /Unexpected change kind/);
  rejected('A rename cannot hide behind the approved source path', fixture => {
    fixture.changes.find(value => value.file === 'src/game-menu-r20.js').status = 'D';
    fixture.changes.push({status: 'A', file: 'src/game-menu-renamed-r32.js'});
  }, /Unexpected change kind|Unreviewed R32 change/);
  rejected('The full browser input test must be present', fixture => {
    fixture.changes = fixture.changes.filter(value => value.file !== 'tests/browser-input-r32.mjs');
    fixture.current.delete('tests/browser-input-r32.mjs');
  }, /Missing required R32 change/);
  for (const file of ['tests/browser-catalog-controls-r32.mjs', 'tests/browser-catalog-focus-r32.mjs']) {
    rejected('The delivered catalogue regression must remain present: ' + file, fixture => {
      fixture.changes = fixture.changes.filter(value => value.file !== file);
      fixture.current.delete(file);
    }, /Missing required R32 change/);
  }
  rejected('Unrelated edits inside the approved input file are refused', fixture => {
    fixture.current.set('src/trial-input-v071.js', fixture.current.get('src/trial-input-v071.js') +
      '\nwindow.unreviewedInputChange=true;\n');
  }, /Only the reviewed opposite-direction resolution/);
  rejected('Unrelated edits inside the approved catalogue controller are refused', fixture => {
    fixture.current.set('src/catalog-duel-v070.js', fixture.current.get('src/catalog-duel-v070.js') +
      '\nwindow.unreviewedCatalogueChange=true;\n');
  }, /Only the reviewed catalogue controls and focus revision/);
  rejected('The original keyboard and focus defects cannot replace the catalogue correction', fixture => {
    fixture.current.set('src/catalog-duel-v070.js', fixture.baseline.get('src/catalog-duel-v070.js'));
  }, /Only the reviewed catalogue controls and focus revision/);
  rejected('Unrelated edits inside the approved menu file are refused', fixture => {
    fixture.current.set('src/game-menu-r20.js', fixture.current.get('src/game-menu-r20.js') +
      '\nwindow.unreviewedMenuChange=true;\n');
  }, /Only the reviewed held confirmation/);
  rejected('The motion keyboard browser regression must remain present', fixture => {
    fixture.changes = fixture.changes.filter(value => value.file !== 'tests/browser-motion-input-r32.mjs');
    fixture.current.delete('tests/browser-motion-input-r32.mjs');
  }, /Missing required R32 change/);
  rejected('Unrelated changes to the motion reader are refused', fixture => {
    fixture.current.set('modules/fidelity-r31/motion/page.js', fixture.current.get('modules/fidelity-r31/motion/page.js') + '\nwindow.unreviewedMotion=true;\n');
  }, /Only the reviewed motion keyboard boundaries/);
  rejected('The evolution input browser regression must remain present', fixture => {
    fixture.changes = fixture.changes.filter(value => value.file !== 'tests/browser-evolution-input-r32.mjs');
    fixture.current.delete('tests/browser-evolution-input-r32.mjs');
  }, /Missing required R32 change/);
  rejected('Unrelated changes to the evolution controller are refused', fixture => {
    const file = 'modules/fidelity-r28/evolutions/duel.js';
    fixture.current.set(file, fixture.current.get(file) + '\nwindow.unreviewedEvolution=true;\n');
  }, /Only the reviewed evolution focus and numpad boundaries/);
  rejected('The original evolution focus defect cannot replace the correction', fixture => {
    const file = 'modules/fidelity-r28/evolutions/duel.js';
    fixture.current.set(file, fixture.baseline.get(file));
  }, /Only the reviewed evolution focus and numpad boundaries/);
  rejected('The gallery selection browser regression must remain present', fixture => {
    fixture.changes = fixture.changes.filter(value => value.file !== 'tests/browser-sprite-gallery-r32.mjs');
    fixture.current.delete('tests/browser-sprite-gallery-r32.mjs');
  }, /Missing required R32 change/);
  rejected('Unrelated changes to the gallery controller are refused', fixture => {
    const file = 'modules/fidelity-r31/sprites/page.js';
    fixture.current.set(file, fixture.current.get(file) + '\nwindow.unreviewedGallery=true;\n');
  }, /Only the reviewed gallery selection and initialization boundaries/);
  rejected('The original gallery races cannot replace the correction', fixture => {
    const file = 'modules/fidelity-r31/sprites/page.js';
    fixture.current.set(file, fixture.baseline.get(file));
  }, /Only the reviewed gallery selection and initialization boundaries/);
  rejected('The original lifecycle defect cannot be delivered unchanged', fixture => {
    fixture.current.set('modules/fidelity-r31/performance/page.js',
      fixture.baseline.get('modules/fidelity-r31/performance/page.js'));
  }, /The lifecycle fix must be delivered/);
  for (const section of ['audio', 'sprites']) {
    rejected('Unrelated style changes in the approved ' + section + ' stylesheet are refused', fixture => {
      const file = 'modules/fidelity-r31/' + section + '/style.css';
      fixture.current.set(file, fixture.current.get(file) + '\n*{opacity:0}\n');
    }, /Only the reviewed heading wrapping change/);
  }
  rejected('The primary verify alias cannot omit current assertions', fixture => {
    editPackage(fixture, pkg => { pkg.scripts.verify = 'npm run verify:historical:r31'; });
  }, /command pipelines/);
  rejected('An original current engine suite cannot be dropped', fixture => {
    editPackage(fixture, pkg => {
      pkg.scripts['verify:current'] = pkg.scripts['verify:current']
        .replace('node tests/verify-engine.mjs && ', '');
    });
  }, /command pipelines/);
  rejected('The archival command cannot substitute another commit', fixture => {
    editPackage(fixture, pkg => {
      pkg.scripts['verify:historical:r31'] = pkg.scripts['verify:historical:r31']
        .replace(BASE_COMMIT, '0'.repeat(40));
    });
  }, /command pipelines/);
  rejected('Both original historical suites are mandatory in the archive plan', fixture => {
    const plan = JSON.parse(fixture.current.get('tests/r32-historical-plan.json'));
    plan.commands.pop();
    fixture.current.set('tests/r32-historical-plan.json', JSON.stringify(plan));
  }, /Both original historical suites/);
  rejected('A command that only prints success cannot replace a historical assertion', fixture => {
    const plan = JSON.parse(fixture.current.get('tests/r32-historical-plan.json'));
    plan.commands[0] = ['node', '-e', 'console.log("pass")'];
    fixture.current.set('tests/r32-historical-plan.json', JSON.stringify(plan));
  }, /Both original historical suites/);
  rejected('R31 archives cannot silently follow main or the submitted branch', fixture => {
    const file = '.github/workflows/source-fidelity-r31.yml';
    fixture.current.set(file, fixture.current.get(file).replace('ref: ' + BASE_COMMIT, 'ref: main'));
  }, /Workflow must preserve/);
  rejected('R31 browser assertions must exercise the current source', fixture => {
    const file = '.github/workflows/source-fidelity-r31.yml';
    fixture.current.set(file, fixture.current.get(file).replace('ref: ${{ github.sha }}', 'ref: ' + BASE_COMMIT));
  }, /Workflow must preserve/);
  rejected('An original R31 browser recipe cannot be replaced by the new focused test', fixture => {
    const file = '.github/workflows/source-fidelity-r31.yml';
    fixture.current.set(file, fixture.current.get(file).replace(
      'script: tests/browser-performance-access-r31.mjs', 'script: tests/browser-reflow-r32.mjs'));
  }, /Workflow must preserve/);
  rejected('R23 must keep its original preservation suite on the published snapshot', fixture => {
    const file = '.github/workflows/source-fidelity-r23.yml';
    fixture.current.set(file, fixture.current.get(file).replace(
      /          python3 scripts\/run-published-release-r29\.py[^\n]*\n/,
      '          echo skipped\n'));
  }, /Workflow must preserve/);
  for (const release of ['25', '26']) {
    rejected('R' + release + ' frozen integration must use the exact published R31 snapshot', fixture => {
      const file = '.github/workflows/source-fidelity-r' + release + '.yml';
      fixture.current.set(file, fixture.current.get(file).replace('--commit ' + BASE_COMMIT, '--commit ' + '0'.repeat(40)));
    }, /Workflow must preserve/);
  }
  rejected('Current scope verification cannot be postponed after R28 report refresh', fixture => {
    const file = '.github/workflows/source-fidelity-r28.yml';
    const command = '        run: npm run verify > qa-fidelity-r28-ci/current-and-published-verify.log\n';
    fixture.current.set(file, fixture.current.get(file).replace(command, '') + command);
  }, /Workflow must preserve/);
  rejected('The current browser workflow cannot omit its executed suites', fixture => {
    const file = '.github/workflows/gamedev-r32.yml';
    fixture.current.set(file, fixture.current.get(file).replace(
      '        run: npm run verify:r32:http', '        run: echo skipped'));
  }, /Workflow must preserve/);
  rejected('The new browser suites cannot be made nonblocking', fixture => {
    const file = '.github/workflows/gamedev-r32.yml';
    fixture.current.set(file, fixture.current.get(file).replace(
      '        run: npm run verify:r32:http',
      '        continue-on-error: true\n        run: npm run verify:r32:http'));
  }, /Workflow must preserve/);
  rejected('A package version change cannot invalidate old replay contracts unnoticed', fixture => {
    editPackage(fixture, pkg => { pkg.version = '0.7.4'; });
  }, /command pipelines/);
  const report = {
    schema: 're.bow.current-guard-tests-r32/1',
    baseline: BASE_COMMIT,
    input: origin,
    passed: cases.filter(value => value.pass).length,
    failed: cases.filter(value => !value.pass).length,
    cases,
    scope: 'Source/pipeline guard fault injection only. Fixtures are changed in memory; historical files are never rewritten.',
  };
  if (writeReport) {
    const output = path.join(ROOT, 'qa-gamedev-r32/current-guard.json');
    fs.mkdirSync(path.dirname(output), {recursive: true});
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({suite: 'r32-current-guard', passed: report.passed, failed: report.failed, input: origin}));
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = runGuardCases(collectSnapshot(), {origin: 'actual Git worktree compared with published R31'});
  if (report.failed) process.exitCode = 1;
}
