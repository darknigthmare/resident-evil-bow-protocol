/** Negative preservation checks inject reads; no repository file is mutated. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {legacyAssetFiles, verifyLegacyR19Sets} from './legacy-preservation-r20.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/SAVES_R19_PRESERVATION.json'), 'utf8'));
const checks = [];
function test(name, run) {
  try { const detail = run(); checks.push({name, pass: true, ...(detail ? {detail} : {})}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); }
}
function withAlteredRead(file, run) {
  const original = fs.readFileSync, target = path.join(root, file);
  fs.readFileSync = function (candidate, ...args) {
    const value = original.call(this, candidate, ...args);
    if (candidate !== target) return value;
    return typeof value === 'string' ? value + '\n' : Buffer.concat([value, Buffer.from('\n')]);
  };
  try { return run(); } finally { fs.readFileSync = original; }
}
function withDirectoryChange(dir, edit, run) {
  const original = fs.readdirSync, target = path.join(root, dir);
  fs.readdirSync = function (candidate, ...args) {
    const entries = original.call(this, candidate, ...args);
    return candidate === target ? edit(entries) : entries;
  };
  try { return run(); } finally { fs.readdirSync = original; }
}

test('All original sets and the three reviewed presentation changes match exact recorded hashes', () =>
  verifyLegacyR19Sets(root, manifest));
test('An unreviewed engine modification is rejected', () => withAlteredRead('src/unified-engine-v060.js', () =>
  assert.throws(() => verifyLegacyR19Sets(root, manifest), /Historical bytes changed: src\/unified-engine-v060\.js/)));
test('A later edit of an approved presentation module still requires a new review', () => withAlteredRead('src/codex.js', () =>
  assert.throws(() => verifyLegacyR19Sets(root, manifest), /Unreviewed presentation change: src\/codex\.js/)));
const originalArt = legacyAssetFiles(root)[0];
const artPath = path.relative(root, originalArt).split(path.sep).join('/');
test('Changed historical artwork cannot hide behind the new sprite namespace', () => withAlteredRead(artPath, () =>
  assert.throws(() => verifyLegacyR19Sets(root, manifest), /Historical bytes changed: assets\//)));
test('A new file outside assets/sprites/bow is rejected', () => withDirectoryChange('assets', entries => [
  ...entries, {name: 'unreviewed-r20.png', isDirectory: () => false, isFile: () => true},
], () => assert.throws(() => legacyAssetFiles(root), /Unapproved addition, rename or missing historical file: assets/)));
test('A removed historical asset is rejected before computing its aggregate', () => withDirectoryChange(
  path.posix.dirname(artPath), entries => entries.filter(entry => entry.name !== path.posix.basename(artPath)),
  () => assert.throws(() => legacyAssetFiles(root), /Unapproved addition, rename or missing historical file: assets/)));
test('The R19 backup implementation stays byte-identical', () => withAlteredRead('src/save-center-r19.js', () =>
  assert.throws(() => verifyLegacyR19Sets(root, manifest), /R19 addition changed: src\/save-center-r19\.js/)));
test('The R19 workbook stays byte-identical', () => withAlteredRead('docs/planning/BOW_SAUVEGARDES_R19.xlsx', () =>
  assert.throws(() => verifyLegacyR19Sets(root, manifest), /R19 addition changed: docs\/planning\/BOW_SAUVEGARDES_R19\.xlsx/)));

const failed = checks.filter(check => !check.pass).length;
fs.writeFileSync(path.join(root, 'docs/R20_PRESERVATION_TESTS.json'), JSON.stringify({
  suite: 'legacy-preservation-r20', passed: checks.length - failed, failed, checks,
  scope: 'Exact source/data/art/workbook hashes, with in-memory fault injections. No source files mutated.',
}, null, 2) + '\n');
console.log(JSON.stringify({passed: checks.length - failed, failed}));
if (failed) process.exitCode = 1;
