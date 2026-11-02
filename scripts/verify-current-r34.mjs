#!/usr/bin/env node
/** New roster art and sequential selection; published release checks stay intact. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {collectSnapshot as collectR33, validateSnapshot as validateR33, ownedReportPath} from './verify-current-r33.mjs';
export {ownedReportPath};
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BASE_COMMIT = '6c2d0d91f4dd79eff1190cd50a352feb2a05dfe5';
const PREVIOUS_BASE = 'adb733b9faf10a041c0b4ef5aa115f43ec67dd34';
export const MOUNTS = ['modules/versus.html', 'catalog-duel.html'];
export const WORKFLOWS = ['.github/workflows/source-fidelity-r25.yml', '.github/workflows/source-fidelity-r26.yml',
  '.github/workflows/source-fidelity-r31.yml', '.github/workflows/gamedev-r32.yml', '.github/workflows/source-fidelity-r33.yml'];
const MODIFIED = new Set(['package.json', ...MOUNTS, ...WORKFLOWS]);
export const SUBSTITUTIONS = [
  ['fidelity-r33/combat/generated-runtime.js', 'fidelity-r34/combat/generated-runtime.js'],
  ['fidelity-r33/selection/avatars.js', 'fidelity-r34/selection/avatars.js'],
  ['fidelity-r33/evolutions/selection.js', 'fidelity-r34/evolutions/selection.js'],
];
const GUARD = 'node scripts/verify-current-r34.mjs', GUARD_TEST = 'node tests/verify-current-guard-r34.mjs';
function once(source, before, after) {assert.equal(source.split(before).length - 1, 1, 'A unique reviewed anchor is required: ' + before); return source.replace(before, after);}
export function allowedAddition(file) {
  if (typeof file !== 'string' || file.includes('\\') || file.includes('\0') || path.posix.normalize(file) !== file || file.startsWith('/')
      || file.split('/').some(part => !part || part === '.' || part === '..') || /\.(?:tmp|part)$/.test(file)) return false;
  if (file.startsWith('modules/fidelity-r34/')) return /^(?:assets|combat|selection|evolutions|validation)\//.test(file.slice('modules/fidelity-r34/'.length));
  return /^(?:scripts|tests)\/[a-z0-9][a-z0-9_-]*r34[a-z0-9_-]*\.(?:mjs|js|py)$/.test(file)
    || /^docs\/[^/]*R34[^/]*(?:\/[^/]+)*$/.test(file) || file === '.github/workflows/source-fidelity-r34.yml';
}
export function expectedPackage(base) {
  const scripts = {...base.scripts};
  for (const key of ['verify:current', 'verify:r32']) scripts[key] = once(scripts[key],
    'node scripts/verify-current-r33.mjs && node tests/verify-current-guard-r33.mjs', GUARD + ' && ' + GUARD_TEST);
  for (const key of ['verify:saves', 'verify:r20']) scripts[key] = once(scripts[key], 'node scripts/verify-current-r33.mjs', GUARD);
  scripts['verify:r32:http'] = 'node scripts/run-browser-compat-r34.mjs --suite=r32';
  scripts['verify:r33:http'] = 'node scripts/run-browser-compat-r34.mjs --suite=r33';
  scripts['verify:r34'] = GUARD + ' && ' + GUARD_TEST + ' && python3 tests/test_roster_assets_r34.py && node tests/verify-roster-runtime-r34.mjs';
  scripts['verify:r34:http'] = 'node tests/browser-selection-r34.mjs && node tests/browser-roster-runtime-r34.mjs';
  return {...base, scripts};
}
export function expectedMount(file, source) {
  for (const [before, after] of SUBSTITUTIONS) source = once(source, before, after);
  const prefix = file === 'modules/versus.html' ? 'fidelity-r34/selection/' : 'modules/fidelity-r34/selection/';
  const renderer = '<script src="' + (file === 'modules/versus.html' ? '../' : '') + 'src/re-renderer.js"></script>';
  source = once(source, renderer, renderer + '<script src="' + prefix.replace('selection/', 'combat/') + 'held-presentation.js"></script>');
  source = once(source, '</head>', '<link rel="stylesheet" href="' + prefix + 'flow.css"><script src="' + prefix + 'prepare.js"></script></head>');
  return once(source, '</body>', '<script src="' + prefix.replace('selection/', 'combat/') + 'held-presentation.js"></script><script src="' + prefix + 'flow.js"></script></body>');
}
export function expectedWorkflow(file, source) {
  if (/source-fidelity-r(?:25|26)\.yml$/.test(file)) return once(source, 'run: node scripts/verify-current-r33.mjs', 'run: ' + GUARD);
  if (file.endsWith('gamedev-r32.yml')) return once(source,
    'name: R32 current inputs, menus, measurement lifecycle and reflow',
    'name: R32 current controls in the explicit legacy selection view');
  if (file.endsWith('source-fidelity-r31.yml')) {
    source = once(source, 'name: Current R31 browser -', 'name: Current R31 browser compatibility view -');
    source = once(source, 'name: Run unchanged R31 browser assertions on current source', 'name: Run unchanged R31 assertions on current source with explicit legacy presentation');
    return once(source, "node '${{ matrix.script }}' ${{ matrix.argument }}", "node --import=./tests/browser-compat-r34.mjs '${{ matrix.script }}' ${{ matrix.argument }}");
  }
  assert(file.endsWith('source-fidelity-r33.yml'));
  source = once(source, 'name: Current R33 source, integration and engine assertions', 'name: Published R33 source, integration and engine assertions');
  const browserJob = source.indexOf('\n  browser:'); assert(browserJob > 0, 'The published source and current browser jobs must remain distinct');
  source = once(source.slice(0, browserJob), '          fetch-depth: 0\n', '          fetch-depth: 0\n          ref: ' + BASE_COMMIT + '\n') + source.slice(browserJob);
  source = once(source, 'name: Current R33 browser -', 'name: Current R33 browser compatibility view -');
  return once(source, "          node '${{ matrix.script }}'\n", "          node --import=./tests/browser-compat-r34.mjs '${{ matrix.script }}'\n");
}
function git(root, ...args) {return execFileSync('git', args, {cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});}
function changes(raw) {const values = raw.split('\0').filter(Boolean); assert.equal(values.length % 2, 0); const out = []; for (let i = 0; i < values.length; i += 2) out.push({status: values[i], file: values[i + 1]}); return out;}
export function collectSnapshot(root = ROOT) {
  const result = {baseline: new Map(), current: new Map(), files: new Map(),
    changes: changes(git(root, 'diff', '--name-status', '--no-renames', '-z', BASE_COMMIT, '--')), inherited: collectR33(root)};
  for (const file of git(root, 'ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean)) result.changes.push({status: 'A', file});
  for (const file of MODIFIED) {
    result.baseline.set(file, git(root, 'show', BASE_COMMIT + ':' + file));
    if (fs.existsSync(path.join(root, file))) result.current.set(file, fs.readFileSync(path.join(root, file), 'utf8'));
  }
  for (const {file} of result.changes) {const stat = fs.lstatSync(path.join(root, file), {throwIfNoEntry: false}); if (stat) result.files.set(file, {regular: stat.isFile(), symlink: stat.isSymbolicLink(), bytes: stat.size});}
  result.publishedChanges = changes(git(root, 'diff', '--name-status', '--no-renames', '-z', PREVIOUS_BASE, BASE_COMMIT, '--'));
  return result;
}
export function projectedR33(snapshot) {
  const old = snapshot.inherited;
  const projected = {...old, current: new Map(old.current), changes: snapshot.publishedChanges.map(item => ({...item})), files: new Map(old.files),
    inherited: {...old.inherited, current: new Map(old.inherited.current)}};
  for (const file of MODIFIED) {
    const baseline = snapshot.baseline.get(file);
    if (projected.current.has(file)) projected.current.set(file, baseline);
    if (projected.inherited.current.has(file)) projected.inherited.current.set(file, baseline);
    if (projected.files.has(file)) projected.files.set(file, {regular: true, symlink: false, bytes: Buffer.byteLength(baseline)});
  }
  return projected;
}
export function validateSnapshot(snapshot) {
  const seen = new Set();
  for (const item of snapshot.changes) {
    assert(!seen.has(item.file), 'Duplicate R34 path'); seen.add(item.file);
    if (item.status === 'M') assert(MODIFIED.has(item.file), 'Frozen file changed: ' + item.file);
    else {assert.equal(item.status, 'A', 'No removal, rename or type change is admitted'); assert(allowedAddition(item.file), 'Unknown R34 addition: ' + item.file);}
    const stat = snapshot.files.get(item.file); assert(stat?.regular && !stat.symlink && stat.bytes > 0 && stat.bytes < 100 * 1024 * 1024, 'A delivered file must be regular, nonempty and below100MiB');
  }
  for (const file of ['package.json', ...WORKFLOWS]) assert(seen.has(file), 'Required reviewed pipeline boundary absent: ' + file);
  assert.deepEqual(JSON.parse(snapshot.current.get('package.json')), expectedPackage(JSON.parse(snapshot.baseline.get('package.json'))), 'All original functional commands and explicit compatibility suites must remain');
  for (const file of WORKFLOWS) assert.equal(snapshot.current.get(file), expectedWorkflow(file, snapshot.baseline.get(file)), 'Workflow changes exceed the reviewed scope: ' + file);
  for (const file of MOUNTS) if (seen.has(file)) assert.equal(snapshot.current.get(file), expectedMount(file, snapshot.baseline.get(file)), 'Only the reviewed external presentation mounts may change: ' + file);
  const inherited = validateR33(projectedR33(snapshot));
  return {schema: 're.bow.current-scope-r34/1', baselineCommit: BASE_COMMIT,
    modified: snapshot.changes.filter(item => item.status === 'M').map(item => item.file).sort(), added: snapshot.changes.filter(item => item.status === 'A').map(item => item.file).sort(),
    preservedR33Guard: {modified: inherited.modified.length, added: inherited.added.length, inheritedR32Guard: inherited.inheritedGuard},
    functionalTestsArchived: false, scope: 'R34 art and presentation boundary. All original engine functions remain current; legacy interaction assertions use a declared current-code compatibility view, while new sequential selection is tested by default.'};
}
export function sourceFiles(root = ROOT) {return ['scripts/verify-current-r34.mjs', 'tests/verify-current-guard-r34.mjs', 'scripts/verify-current-r33.mjs', 'tests/verify-current-guard-r33.mjs',
  'scripts/verify-current-r32.mjs', 'tests/verify-current-guard-r32.mjs', 'package.json', ...WORKFLOWS].map(file => ({path: file, sha256: createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')}));}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = validateSnapshot(collectSnapshot());
    const output = ownedReportPath(process.argv.find(value => value.startsWith('--report='))?.slice(9) || 'qa-fidelity-r34/current-scope.json', report.schema, 'docs/R34_CURRENT_SCOPE.json');
    fs.mkdirSync(path.dirname(output), {recursive: true}); fs.writeFileSync(output, JSON.stringify({...report, sourceFiles: sourceFiles()}, null, 2) + '\n');
    console.log(JSON.stringify({modified: report.modified.length, added: report.added.length, preservedGuardsVerified: true}));
  } catch (error) {console.error(error.stack); process.exitCode = 1;}
}
