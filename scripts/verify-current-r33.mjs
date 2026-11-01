#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  BASE_COMMIT as R31_COMMIT, R32_FILES, validateSnapshot as validateR32,
} from './verify-current-r32.mjs';

export const BASE_COMMIT = 'adb733b9faf10a041c0b4ef5aa115f43ec67dd34';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const GUARD = 'node scripts/verify-current-r33.mjs';
export const GUARD_TEST = 'node tests/verify-current-guard-r33.mjs';
export const MAX_ADDED_FILE_BYTES = 100 * 1024 * 1024;
export const MOUNTS = Object.freeze([
  'modules/versus.html', 'catalog-duel.html', 'codex.html', 'saves.html',
]);
export const WORKFLOWS = Object.freeze([
  '.github/workflows/source-fidelity-r25.yml',
  '.github/workflows/source-fidelity-r26.yml',
]);
const MODIFIED = new Set(['package.json', ...MOUNTS, ...WORKFLOWS]);
const MODULE_ROOTS = new Set([
  'native', 'sprites', 'evidence', 'persistence', 'replay', 'combat', 'selection',
  'performance', 'access', 'validation', 'evolutions', 'tracking',
]);
const MODULE_FILES = new Set([
  'index.html', 'dashboard.js', 'dossier-link.js', 'progress.json',
  'dossier-additions.json', 'source-additions.json',
]);
export const MOUNT_SUBSTITUTIONS = Object.freeze([
  ['fidelity-r31/combat/generated-runtime.js', 'fidelity-r33/combat/generated-runtime.js'],
  ['fidelity-r27/combat/adapter.js', 'fidelity-r33/combat/generated-adapter.js'],
  ['fidelity-r31/combat/native-runtime.js', 'fidelity-r33/combat/native-runtime.js'],
  ['fidelity-r31/combat/native-adapter.js', 'fidelity-r33/combat/native-adapter.js'],
  ['fidelity-r31/selection/avatars.js', 'fidelity-r33/selection/avatars.js'],
  ['fidelity-r31/evolutions/selection.js', 'fidelity-r33/evolutions/selection.js'],
]);

// New release commands are reviewed separately from the inherited functional
// pipeline. No original engine/input/browser assertion is moved to an archive.
export const PREFLIGHT_COMMANDS = Object.freeze([
  'python3 scripts/prepare-native-r33.py --check',
  'python3 scripts/pack-native-r33.py --check',
  'python3 scripts/build-native-r33.py --check',
  'python3 scripts/build-sprites-r33.py --check',
  'python3 scripts/build-evidence-r33.py --check',
  'python3 scripts/build-persistence-r33.py --check',
  'python3 scripts/build-runtime-r33.py --check',
]);
export const SOURCE_COMMANDS = Object.freeze([
  'python3 tests/test_native_r33.py',
  'python3 tests/test_generated_sprites_r33.py',
  'python3 tests/test_evidence_r33.py',
  'python3 tests/test_fidelity_r33.py',
  'node tests/verify-native-motion-r33.mjs',
  'node tests/verify-generated-sprites-r33.mjs',
  'node tests/verify-evidence-r33.mjs',
  'node tests/verify-persistence-r33.mjs',
  'node tests/verify-runtime-r33.mjs',
]);
export const BROWSER_COMMANDS = Object.freeze([
  'node tests/browser-native-r33.mjs',
  'node tests/browser-generated-sprites-r33.mjs',
  'node tests/browser-evidence-r33.mjs',
  'node tests/browser-persistence-r33.mjs',
  'node tests/browser-runtime-r33.mjs',
  'node tests/browser-fidelity-r33.mjs',
]);

function replaceOnce(source, before, after, label) {
  assert.equal(source.split(before).length - 1, 1, 'Exactly one reviewed anchor is required: ' + label);
  return source.replace(before, after);
}

export function allowedAddition(file) {
  if (typeof file !== 'string' || file.includes('\\') || file.includes('\0') ||
      path.posix.normalize(file) !== file || file.startsWith('/') ||
      file.split('/').some(part => !part || part === '.' || part === '..')) return false;
  if (file.startsWith('modules/fidelity-r33/')) {
    const relative = file.slice('modules/fidelity-r33/'.length);
    const parts = relative.split('/');
    return parts.length === 1 ? MODULE_FILES.has(relative) : MODULE_ROOTS.has(parts[0]);
  }
  if (/^(scripts|tests)\/[a-z0-9][a-z0-9_-]*r33[a-z0-9_-]*\.(mjs|js|py)$/.test(file)) return true;
  if (/^docs\/[^/]*R33[^/]*(?:\/[^/]+)*$/.test(file)) return true;
  return file === '.github/workflows/source-fidelity-r33.yml';
}

export function expectedPackage(baseline) {
  const scripts = {...baseline.scripts};
  for (const key of ['verify:current', 'verify:r32']) {
    scripts[key] = replaceOnce(scripts[key],
      'node scripts/verify-current-r32.mjs && node tests/verify-current-guard-r32.mjs',
      GUARD + ' && ' + GUARD_TEST, key + ' guard boundary');
  }
  for (const key of ['verify:saves', 'verify:r20']) {
    scripts[key] = replaceOnce(scripts[key], 'node scripts/verify-current-r32.mjs', GUARD, key);
  }
  scripts['verify:r33'] = [GUARD, GUARD_TEST + ' --report=docs/R33_CURRENT_GUARD_TESTS.json',
    'python3 scripts/validate-fidelity-ci-r33.py', ...SOURCE_COMMANDS].join(' && ');
  scripts['verify:r33:delivered'] = [GUARD, ...PREFLIGHT_COMMANDS].join(' && ');
  scripts['verify:r33:http'] = BROWSER_COMMANDS.join(' && ');
  return {...baseline, scripts};
}

export function expectedWorkflow(file, baseline) {
  assert(WORKFLOWS.includes(file), 'Only the two direct inherited guard callers may change');
  return replaceOnce(baseline,
    '        run: node scripts/verify-current-r32.mjs\n',
    '        run: ' + GUARD + '\n', file);
}

export function expectedMount(file, baseline) {
  if (file === 'codex.html' || file === 'saves.html') {
    const script = file === 'codex.html' ? 'dossier-link.js' : 'persistence/link.js';
    return replaceOnce(baseline, '</body>',
      '<script src="modules/fidelity-r33/' + script + '"></script></body>', file);
  }
  assert(['modules/versus.html', 'catalog-duel.html'].includes(file), 'Unknown R33 mount');
  let source = baseline;
  for (const [before, after] of MOUNT_SUBSTITUTIONS) {
    source = replaceOnce(source, before, after, file + ': ' + before);
  }
  return source;
}

export function validateChangeList(changes, files) {
  const seen = new Set();
  for (const {file, status} of changes) {
    assert(!seen.has(file), 'Duplicate R33 changed path: ' + file);
    seen.add(file);
    if (status === 'M') assert(MODIFIED.has(file), 'Unreviewed modification of an inherited file: ' + file);
    else {
      assert.equal(status, 'A', 'Deletion, rename or type change is outside R33: ' + file);
      assert(allowedAddition(file), 'Unreviewed R33 addition: ' + file);
    }
    const metadata = files.get(file);
    assert(metadata?.regular === true && metadata.symlink === false,
      'Every delivered R33 path must be a regular file, not a symlink: ' + file);
    assert(Number.isSafeInteger(metadata.bytes) && metadata.bytes > 0,
      'Empty or invalid delivered file: ' + file);
    if (status === 'A') assert(metadata.bytes < MAX_ADDED_FILE_BYTES,
      'Added files must remain below the GitHub 100 MiB limit: ' + file);
  }
  for (const file of ['package.json', ...WORKFLOWS]) {
    assert(seen.has(file), 'The reviewed R33 pipeline change must be present: ' + file);
  }
}

export function inheritedSnapshot(snapshot) {
  // Package/workflow admission is checked against the exact R32 bytes before
  // this projection. All inherited runtime, tests and data are read from the
  // current checkout. No disk file is rewritten and no assertion is bypassed.
  const current = new Map(snapshot.inherited.current);
  for (const file of ['package.json', ...WORKFLOWS]) current.set(file, snapshot.baseline.get(file));
  return {
    baseline: new Map(snapshot.inherited.baseline), current,
    changes: snapshot.inherited.changes.map(change => ({...change})),
  };
}

export function validateSnapshot(snapshot) {
  validateChangeList(snapshot.changes, snapshot.files);
  assert.deepEqual(JSON.parse(snapshot.current.get('package.json')),
    expectedPackage(JSON.parse(snapshot.baseline.get('package.json'))),
    'R33 may only replace the guard boundary and add its explicit commands; all current and archival suites must remain');
  for (const file of WORKFLOWS) {
    assert.equal(snapshot.current.get(file), expectedWorkflow(file, snapshot.baseline.get(file)),
      'Only the direct guard invocation may change in ' + file);
  }
  for (const file of MOUNTS) {
    if (!snapshot.changes.some(change => change.file === file)) continue;
    assert.equal(snapshot.current.get(file), expectedMount(file, snapshot.baseline.get(file)),
      'Only the reviewed R33 external-script mounts may change in ' + file);
  }
  const inherited = validateR32(inheritedSnapshot(snapshot));
  return {
    schema: 're.bow.current-scope-r33/1', published_baseline: BASE_COMMIT,
    inherited_baseline: R31_COMMIT,
    modified: snapshot.changes.filter(change => change.status === 'M').map(change => change.file).sort(),
    added: snapshot.changes.filter(change => change.status === 'A').map(change => change.file).sort(),
    inheritedGuard: {schema: inherited.schema, modified: inherited.modified.length, added: inherited.added.length,
      runtimeInputs: 'current checkout; only previously checked package/workflow wiring is projected in memory'},
    historicalFilesRewritten: false,
    scope: 'R33 source and pipeline integrity; behavioural and artistic results require their separately executed suites.',
  };
}

function gitAt(root, ...args) {
  return execFileSync('git', args, {cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024});
}
function parseChanges(raw) {
  const values = raw.split('\0').filter(Boolean);
  assert.equal(values.length % 2, 0, 'Unexpected NUL-delimited Git change record');
  const result = [];
  for (let index = 0; index < values.length; index += 2) result.push({status: values[index], file: values[index + 1]});
  return result;
}

export function collectSnapshot(root = ROOT) {
  for (const commit of [BASE_COMMIT, R31_COMMIT]) {
    assert.equal(gitAt(root, 'rev-parse', '--verify', commit + '^{commit}').trim(), commit,
      'Fetch complete Git history for the explicit published reference');
  }
  const changes = parseChanges(gitAt(root, 'diff', '--name-status', '--no-renames', '-z', BASE_COMMIT, '--'));
  for (const file of gitAt(root, 'ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean)) {
    changes.push({status: 'A', file});
  }
  const baseline = new Map();
  const current = new Map();
  const files = new Map();
  for (const file of ['package.json', ...WORKFLOWS, ...MOUNTS]) {
    baseline.set(file, gitAt(root, 'show', BASE_COMMIT + ':' + file));
    if (fs.existsSync(path.join(root, file))) current.set(file, fs.readFileSync(path.join(root, file), 'utf8'));
  }
  for (const {file} of changes) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute)) continue;
    const stat = fs.lstatSync(absolute);
    files.set(file, {regular: stat.isFile(), symlink: stat.isSymbolicLink(), bytes: stat.size});
  }
  const oldChanges = parseChanges(gitAt(root, 'diff', '--name-status', '--no-renames', '-z', R31_COMMIT, BASE_COMMIT, '--'));
  const oldBaseline = new Map();
  const oldCurrent = new Map();
  for (const [file, status] of Object.entries(R32_FILES)) {
    if (status === 'M') oldBaseline.set(file, gitAt(root, 'show', R31_COMMIT + ':' + file));
    const absolute = path.join(root, file);
    if (fs.existsSync(absolute)) oldCurrent.set(file, fs.readFileSync(absolute, 'utf8'));
  }
  return {baseline, current, changes, files,
    inherited: {baseline: oldBaseline, current: oldCurrent, changes: oldChanges}};
}

export function sourceFiles(root = ROOT) {
  return ['scripts/verify-current-r33.mjs', 'tests/verify-current-guard-r33.mjs',
    'scripts/verify-current-r32.mjs', 'tests/verify-current-guard-r32.mjs',
    'package.json', ...WORKFLOWS].map(file => ({path: file,
      sha256: createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')}));
}

export function ownedReportPath(target, schema, document, root = ROOT) {
  assert(typeof target === 'string' && !target.includes('\\') &&
    path.posix.normalize(target) === target && !target.startsWith('/'), 'Report path must be relative and normalized');
  assert(target === document || /^qa-[A-Za-z0-9_-]+\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.json$/.test(target),
    'Reports may only use their own document or an ignored QA output namespace');
  const output = path.resolve(root, target);
  assert(output.startsWith(root + path.sep), 'Report must stay in this checkout');
  const components = target.split('/');
  for (let index = 1; index <= components.length; index++) {
    const candidate = path.join(root, ...components.slice(0, index));
    if (!fs.existsSync(candidate)) {
      assert(!fs.lstatSync(candidate, {throwIfNoEntry: false}), 'A dangling report symlink is refused');
      continue;
    }
    const stat = fs.lstatSync(candidate);
    assert(!stat.isSymbolicLink(), 'Report outputs must not traverse a symlink');
    if (index < components.length) assert(stat.isDirectory(), 'Report parent must be a directory');
    else {
      assert(stat.isFile(), 'Report output must be a regular file');
      assert.equal(JSON.parse(fs.readFileSync(candidate, 'utf8')).schema, schema,
        'An existing unrelated JSON file cannot be replaced by this report');
    }
  }
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = validateSnapshot(collectSnapshot());
    const target = process.argv.find(value => value.startsWith('--report='))?.slice(9) ||
      'qa-fidelity-r33-ci/current-scope.json';
    const output = ownedReportPath(target, report.schema, 'docs/R33_CURRENT_SCOPE.json');
    fs.mkdirSync(path.dirname(output), {recursive: true});
    fs.writeFileSync(output, JSON.stringify({...report, sourceFiles: sourceFiles()}, null, 2) + '\n');
    console.log(JSON.stringify({suite: 'r33-current-scope', modified: report.modified.length,
      added: report.added.length, inheritedGuardVerified: true}));
  } catch (error) {
    console.error('FAIL R33 current source/pipeline check: ' + error.message);
    process.exitCode = 1;
  }
}
