import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT, BASE_COMMIT, DECLARATION_PATH, PLAN_PATH, WORKFLOW_PATH, hash,
  collectSnapshot, validateSnapshot} from '../scripts/verify-ai-tooling-r34.mjs';
import {ownedReportPath} from '../scripts/verify-current-r33.mjs';

function clone(snapshot) {
  return {baseline: new Map(snapshot.baseline), current: new Map(snapshot.current),
    files: new Map([...snapshot.files].map(([file, info]) => [file, {...info}])),
    changes: snapshot.changes.map(change => ({...change}))};
}
function editDeclaration(snapshot, change) {
  const data = JSON.parse(snapshot.current.get(DECLARATION_PATH));
  change(data);
  snapshot.current.set(DECLARATION_PATH, Buffer.from(JSON.stringify(data)));
}
function editBoundFile(snapshot, file, change) {
  const data = Buffer.from(change(snapshot.current.get(file).toString()));
  snapshot.current.set(file, data);
  editDeclaration(snapshot, declaration => {
    declaration.changes.find(item => item.path === file).sha256 = hash(data);
  });
}
export function runCases(snapshot) {
  const checks = [];
  function test(name, run) {
    try {run(); checks.push({name, pass: true}); console.log('PASS ' + name);}
    catch (error) {checks.push({name, pass: false, error: error.message}); console.error('FAIL ' + name + ': ' + error.message);}
  }
  function reject(name, change, reason) {
    test(name, () => {const fixture = clone(snapshot); change(fixture); assert.throws(() => validateSnapshot(fixture), reason);});
  }
  test('The actual successor is bounded to tooling and retains the exact published predecessor', () => {
    const result = validateSnapshot(snapshot);
    assert.equal(result.publishedPredecessor, BASE_COMMIT);
    assert.equal(result.currentRuntimeInputsUnchanged, true);
    assert.equal(result.historicalEvidenceTransferred, false);
    assert.equal(result.changedPaths.length, 14);
  });
  for (const file of ['src/unified-engine-v060.js', 'data/roster.json', 'assets/catalog/new.png',
    'docs/R34_CURRENT_GUARD_TESTS.json', 'docs/R34_CI_VALIDATION.json', 'docs/BOW_FIDELITE_R34.xlsx']) {
    reject('Game inputs and published receipts stay outside this successor: ' + file,
      s => s.changes.push({file, status: 'M'}), /outside the tooling scope/);
  }
  reject('No broad new skill namespace is admitted', s => s.changes.push({file: '.claude/skills/unreviewed/SKILL.md', status: 'A'}),
    /outside the tooling scope/);
  reject('A declared file cannot be removed', s => {s.changes.find(item => item.file === '.ai-tools/setup.py').status = 'D';},
    /Unreviewed change kind/);
  reject('A duplicate delta entry is rejected', s => s.changes.push({...s.changes[0]}), /Duplicate tooling path/);
  reject('A partial delivery cannot omit the tests', s => {s.changes = s.changes.filter(item => item.file !== '.ai-tools/tests/test_setup.py');},
    /complete tooling successor/);
  reject('A source cannot become a symlink', s => s.files.set('.ai-tools/setup.py', {regular: false, symlink: true, executable: false}),
    /regular files/);
  reject('An unreviewed executable mode is rejected', s => {s.files.get('.ai-tools/setup.py').executable = true;}, /nonexecutable mode/);
  reject('Changed current guard bytes cannot reuse the declared source binding', s => {
    s.current.set('scripts/verify-current-r34.mjs', Buffer.concat([s.current.get('scripts/verify-current-r34.mjs'), Buffer.from('\n// unreviewed\n')]));
  }, /Reviewed tooling bytes differ/);
  reject('A different published predecessor cannot be substituted', s => editDeclaration(s, d => {d.baselineCommit = '0'.repeat(40);}),
    /published predecessor/);
  reject('The declaration cannot transfer historical test results to current source', s => editDeclaration(s, d => {d.historicalEvidenceTransferred = true;}),
    /Historical receipts/);
  reject('The declaration cannot grant a runtime change', s => editDeclaration(s, d => {d.runtimeChanged = true;}), /Runtime changes/);
  reject('Old agent instructions remain exact even if a new hash is declared', s => editBoundFile(s, 'AGENTS.md', source => 'rewritten\n' + source),
    /Published agent instructions/);
  reject('Additional instructions remain rejected even with an updated declaration', s => editBoundFile(s, 'AGENTS.md', source => source + '\nextra\n'),
    /reviewed tooling appendix/);
  reject('A historical assertion cannot be replaced by a success printer', s => editBoundFile(s, PLAN_PATH, source => {
    const plan = JSON.parse(source); plan.commands[0] = ['node', '-e', 'console.log("pass")']; return JSON.stringify(plan);
  }), /Published receipt assertions/);
  reject('A current engine suite cannot be removed through the successor workflow', s => editBoundFile(s, WORKFLOW_PATH,
    source => source.replace('run: npm run verify > qa-fidelity-r34-ci/current-and-published-engine.log', 'run: echo skipped')),
  /Only the reviewed receipt separation/);
  reject('Current browser jobs cannot be moved onto the published checkout', s => editBoundFile(s, WORKFLOW_PATH,
    source => source.replaceAll('persist-credentials: false', 'persist-credentials: false\n          ref: ' + BASE_COMMIT)),
  /Only the reviewed receipt separation/);
  const result = validateSnapshot(snapshot);
  const report = {schema: 're.bow.ai-tooling-tests-r34/1', passed: checks.filter(item => item.pass).length,
    failed: checks.filter(item => !item.pass).length, checks, sourceFiles: result.sourceFiles,
    historicalEvidenceTransferred: false,
    scope: 'Executed negative tests for the developer-only successor; no gameplay or historical test result is inferred.'};
  const output = ownedReportPath('qa-fidelity-r34-ci/ai-tooling-tests.json', report.schema, 'docs/AI_TOOLING_R34_TESTS.json');
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({passed: report.passed, failed: report.failed, historicalEvidenceTransferred: false}));
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (runCases(collectSnapshot()).failed) process.exitCode = 1;
}
