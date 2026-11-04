#!/usr/bin/env node
/** Verify the developer-only successor to published R34 without transferring its receipts. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {ownedReportPath} from './verify-current-r33.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BASE_COMMIT = 'b1ec3d3e193d7e629079ad390d73652c17b868c1';
export const DECLARATION_PATH = 'docs/AI_TOOLING_SUCCESSOR_R34.json';
export const PLAN_PATH = 'docs/AI_TOOLING_R34_RECEIPT_PLAN.json';
export const WORKFLOW_PATH = '.github/workflows/source-fidelity-r34.yml';
export const EXPECTED_PATHS = Object.freeze({
  '.ai-tools/.gitignore': 'A',
  '.ai-tools/README.md': 'A',
  '.ai-tools/setup.py': 'A',
  '.ai-tools/sources.json': 'A',
  '.ai-tools/tests/test_setup.py': 'A',
  'AGENTS.md': 'M',
  'CLAUDE.md': 'A',
  'scripts/verify-current-r34.mjs': 'M',
  'tests/verify-current-guard-r34.mjs': 'M',
  [WORKFLOW_PATH]: 'M',
  'scripts/verify-ai-tooling-r34.mjs': 'A',
  'tests/verify-ai-tooling-guard-r34.mjs': 'A',
  [PLAN_PATH]: 'A',
  [DECLARATION_PATH]: 'A',
});
export const RECEIPT_PLAN = Object.freeze({
  schema: 're.bow.published-check-plan-r29/1',
  commands: [
    ['{python}', 'scripts/fidelity-progress-r34.py', 'check'],
    ['{python}', 'scripts/fidelity-progress-r34.py', 'reproduce'],
    ['{python}', 'scripts/audit-delivery-r34.py', '--check'],
    ['node', 'tests/verify-r34-integration.mjs'],
  ],
});
export const RECEIPT_COMMAND = 'python3 scripts/run-published-release-r29.py --commit ' + BASE_COMMIT +
  ' --evidence qa-fidelity-r34-ci/published-r34-receipts --plan ' + PLAN_PATH;
const AGENTS_APPEND_SHA256 = '5a5ed7cf0d3167a4df3f3fcb2327072bbfc5306fb62e98ed74e8135d33babb28';
export const hash = value => createHash('sha256').update(value).digest('hex');
function once(source, before, after) {
  assert.equal(source.split(before).length - 1, 1, 'A unique published workflow anchor is required');
  return source.replace(before, after);
}
export function expectedWorkflow(source) {
  source = once(source, 'name: Current R34 receipts, admission boundaries and original engine',
    'name: Current tooling and engine, published R34 receipts');
  source = once(source, 'name: Verify the delivered source and media bindings before any report refresh',
    'name: Verify current tooling and media, then published R34 receipts before report refresh');
  source = once(source, '          node scripts/verify-current-r34.mjs\n',
    '          node scripts/verify-current-r34.mjs\n' +
    '          node scripts/verify-ai-tooling-r34.mjs\n' +
    '          node tests/verify-ai-tooling-guard-r34.mjs\n' +
    '          python3 -B -m unittest discover -s .ai-tools/tests -v\n');
  return once(source,
    '          python3 scripts/fidelity-progress-r34.py check\n' +
    '          python3 scripts/fidelity-progress-r34.py reproduce\n' +
    '          python3 scripts/audit-delivery-r34.py --check\n' +
    '          node tests/verify-r34-integration.mjs\n',
    '          ' + RECEIPT_COMMAND + '\n');
}
function git(root, ...args) {
  return execFileSync('git', args, {cwd: root, maxBuffer: 64 * 1024 * 1024});
}
export function collectSnapshot(root = ROOT) {
  assert.equal(git(root, 'rev-parse', '--verify', BASE_COMMIT + '^{commit}').toString().trim(), BASE_COMMIT);
  const values = git(root, 'diff', '--name-status', '--no-renames', '-z', BASE_COMMIT, '--').toString().split('\0').filter(Boolean);
  assert.equal(values.length % 2, 0);
  const changes = [];
  for (let i = 0; i < values.length; i += 2) changes.push({status: values[i], file: values[i + 1]});
  for (const file of git(root, 'ls-files', '--others', '--exclude-standard', '-z').toString().split('\0').filter(Boolean)) {
    changes.push({status: 'A', file});
  }
  const baseline = new Map(), current = new Map(), files = new Map();
  for (const [file, status] of Object.entries(EXPECTED_PATHS)) {
    if (status === 'M') baseline.set(file, git(root, 'show', BASE_COMMIT + ':' + file));
    const full = path.join(root, file), stat = fs.lstatSync(full, {throwIfNoEntry: false});
    if (stat) {
      files.set(file, {regular: stat.isFile(), symlink: stat.isSymbolicLink(), executable: Boolean(stat.mode & 0o111)});
      if (stat.isFile() && !stat.isSymbolicLink()) current.set(file, fs.readFileSync(full));
    }
  }
  return {changes, baseline, current, files};
}
export function validateSnapshot(snapshot) {
  const seen = new Set();
  for (const change of snapshot.changes) {
    assert(!seen.has(change.file), 'Duplicate tooling path: ' + change.file);
    seen.add(change.file);
    assert(Object.hasOwn(EXPECTED_PATHS, change.file), 'Published game or receipt changed outside the tooling scope: ' + change.file);
    assert.equal(change.status, EXPECTED_PATHS[change.file], 'Unreviewed change kind: ' + change.file);
  }
  assert.deepEqual([...seen].sort(), Object.keys(EXPECTED_PATHS).sort(), 'The complete tooling successor must be present');
  for (const file of seen) {
    const stat = snapshot.files.get(file), raw = snapshot.current.get(file);
    assert(stat?.regular && !stat.symlink && !stat.executable && Buffer.isBuffer(raw) && raw.length > 0,
      'Tooling sources must be nonempty regular files with their reviewed nonexecutable mode: ' + file);
  }
  const declaration = JSON.parse(snapshot.current.get(DECLARATION_PATH));
  assert.equal(declaration.schema, 're.bow.ai-tooling-source-scope-r34/1');
  assert.equal(declaration.baselineCommit, BASE_COMMIT, 'The published predecessor must remain exact');
  assert.equal(declaration.kind, 'source-scope-declaration', 'A scope declaration must not claim executed results');
  assert.equal(declaration.runtimeChanged, false, 'Runtime changes are outside this successor');
  assert.equal(declaration.historicalEvidenceTransferred, false, 'Historical receipts must not become current evidence');
  assert.deepEqual(Object.keys(declaration).sort(),
    ['schema', 'baselineCommit', 'kind', 'runtimeChanged', 'historicalEvidenceTransferred', 'changes'].sort());
  const declared = new Set();
  for (const item of declaration.changes) {
    assert(item.path !== DECLARATION_PATH && Object.hasOwn(EXPECTED_PATHS, item.path), 'Unreviewed declared tooling path: ' + item.path);
    assert(!declared.has(item.path), 'Duplicate declared tooling path');
    declared.add(item.path);
    assert.equal(item.status, EXPECTED_PATHS[item.path], 'Declared change kind differs');
    assert.match(item.sha256, /^[a-f0-9]{64}$/);
    assert.equal(hash(snapshot.current.get(item.path)), item.sha256, 'Reviewed tooling bytes differ: ' + item.path);
    if (item.status === 'M') {
      assert.equal(hash(snapshot.baseline.get(item.path)), item.baselineSha256, 'Published predecessor bytes differ: ' + item.path);
      assert.deepEqual(Object.keys(item).sort(), ['path', 'status', 'sha256', 'baselineSha256'].sort());
    } else assert.deepEqual(Object.keys(item).sort(), ['path', 'status', 'sha256'].sort());
  }
  assert.deepEqual([...declared].sort(), Object.keys(EXPECTED_PATHS).filter(file => file !== DECLARATION_PATH).sort(),
    'Every successor source must have a declared binding');
  const before = snapshot.baseline.get('AGENTS.md'), after = snapshot.current.get('AGENTS.md');
  assert(after.subarray(0, before.length).equals(before), 'Published agent instructions must remain exact');
  assert.equal(hash(after.subarray(before.length)), AGENTS_APPEND_SHA256, 'Only the reviewed tooling appendix is admitted');
  assert.deepEqual(JSON.parse(snapshot.current.get(PLAN_PATH)), RECEIPT_PLAN, 'Published receipt assertions must remain exact');
  assert.equal(snapshot.current.get(WORKFLOW_PATH).toString(), expectedWorkflow(snapshot.baseline.get(WORKFLOW_PATH).toString()),
    'Only the reviewed receipt separation and current tooling checks may change in the workflow');
  return {
    schema: 're.bow.ai-tooling-successor-r34/1',
    publishedPredecessor: BASE_COMMIT,
    changedPaths: [...seen].sort(),
    currentRuntimeInputsUnchanged: true,
    historicalEvidenceTransferred: false,
    sourceFiles: [...seen].sort().map(file => ({path: file, sha256: hash(snapshot.current.get(file))})),
    scope: 'Actual tooling-only source boundary. Published R34 receipts remain evidence of their pinned revision; current tooling, engine, media and browser checks execute separately on the submitted source.',
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = validateSnapshot(collectSnapshot());
  const output = ownedReportPath('qa-fidelity-r34-ci/ai-tooling-scope.json', report.schema, 'docs/AI_TOOLING_R34_SCOPE.json');
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({toolingPaths: report.changedPaths.length, currentRuntimeInputsUnchanged: true, historicalEvidenceTransferred: false}));
}
