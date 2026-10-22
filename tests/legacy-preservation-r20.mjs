/**
 * Keep historical preservation claims scoped to their exact original file sets.
 * R20 adds art under one new namespace and changes three reviewed presentation
 * modules. No gameplay, data, old artwork or prior workbook is exempted.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const readJSON = (root, file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const snapshotPath = 'docs/R20_PRESENTATION_BASELINE.json';
const presentationPaths = ['src/catalog-page-v070.js', 'src/codex.js', 'src/movesets.js'];
const artPrefix = 'assets/sprites/bow/';

function snapshot(root) {
  const data = readJSON(root, snapshotPath);
  assert.equal(data.schema, 're.bow.presentation-baseline/1');
  assert.equal(data.baseCommit, 'e4b27bc42eacee69ecb0280fb35de117d4031cf1');
  assert.deepEqual(Object.keys(data.approvedPresentationChanges).sort(), presentationPaths);
  assert.equal(data.allowedR20Additions.assetsPrefix, artPrefix);
  assert.equal(sha(fs.readFileSync(path.join(root, data.historicalManifest))), data.historicalManifestSha256,
    'The R19 historical manifest must not be rewritten for R20');
  return data;
}

function walk(root, dir) {
  return fs.readdirSync(path.join(root, dir), {withFileTypes: true}).flatMap(entry => {
    const file = dir + '/' + entry.name;
    if (entry.isDirectory()) return walk(root, file);
    assert(entry.isFile(), 'Unexpected non-file in protected tree: ' + file);
    return [file];
  }).sort();
}

function originalPaths(root, dir, baseline, historical) {
  const expected = baseline.legacySets[dir];
  assert(expected, 'Unknown protected directory: ' + dir);
  const paths = expected.files.map(([file]) => file);
  assert.deepEqual(paths, [...new Set(paths)].sort(), 'Original paths must be unique and sorted: ' + dir);
  assert(paths.every(file => file.startsWith(dir + '/') && !file.includes('/../')), 'Invalid original path');
  assert.equal(paths.length, historical.count, 'Original count: ' + dir);
  assert.equal(sha(JSON.stringify(expected.files)), historical.digest, 'Original digest: ' + dir);
  const additions = baseline.allowedR20Additions[dir] || [];
  const actual = walk(root, dir).filter(file => !historical.exclude.includes(file)
    && !(dir === 'assets' && file.startsWith(artPrefix)) && !additions.includes(file));
  assert.deepEqual(actual, paths, 'Unapproved addition, rename or missing historical file: ' + dir);
  return paths;
}

/** Absolute paths of all 508 original assets; old tests retain their own hashes. */
export function legacyAssetFiles(root) {
  const baseline = snapshot(root);
  const historical = readJSON(root, baseline.historicalManifest).sets.assets;
  return originalPaths(root, 'assets', baseline, historical).map(file => path.join(root, file));
}

/**
 * Verify current bytes first. Only then reconstitute the historical aggregate
 * with the documented pre-presentation hashes for the three reviewed files.
 * Returning the original hash is never a substitute for checking current bytes.
 */
export function verifyLegacyR19Sets(root, manifest) {
  const baseline = snapshot(root);
  assert.deepEqual(Object.keys(manifest.sets).sort(), Object.keys(baseline.legacySets).sort());
  const changes = baseline.approvedPresentationChanges;
  for (const [dir, historical] of Object.entries(manifest.sets)) {
    const paths = originalPaths(root, dir, baseline, historical);
    const before = new Map(baseline.legacySets[dir].files);
    const rows = paths.map(file => {
      const actual = sha(fs.readFileSync(path.join(root, file)));
      const change = changes[file];
      if (change) {
        assert.equal(change.beforeSha256, before.get(file), 'Reviewed before hash: ' + file);
        assert.notEqual(change.afterSha256, change.beforeSha256, 'Review must describe an actual change: ' + file);
        assert.equal(actual, change.afterSha256, 'Unreviewed presentation change: ' + file);
        assert(change.scope && change.evidence.length, 'A presentation change requires scope and evidence: ' + file);
        return [file, change.beforeSha256];
      }
      assert.equal(actual, before.get(file), 'Historical bytes changed: ' + file);
      return [file, actual];
    });
    assert.equal(rows.length, historical.count, dir);
    assert.equal(sha(JSON.stringify(rows)), historical.digest, dir);
  }
  for (const [file, expected] of Object.entries(baseline.protectedR19Additions)) {
    assert.equal(sha(fs.readFileSync(path.join(root, file))), expected, 'R19 addition changed: ' + file);
  }
  return {
    sets: Object.keys(manifest.sets),
    originalAssets: manifest.sets.assets.count,
    originalDataFiles: manifest.sets.data.count,
    historicalSourceFiles: manifest.sets.src.count,
    reviewedPresentationChanges: Object.keys(changes),
    protectedR19Additions: Object.keys(baseline.protectedR19Additions),
    allowedNewArtNamespace: artPrefix,
  };
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const result = verifyLegacyR19Sets(root, readJSON(root, 'docs/SAVES_R19_PRESERVATION.json'));
  console.log(JSON.stringify(result, null, 2));
}
