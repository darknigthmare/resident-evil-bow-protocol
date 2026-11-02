#!/usr/bin/env node
/** Run unchanged interaction assertions in their declared legacy presentation view. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = '6c2d0d91f4dd79eff1190cd50a352feb2a05dfe5';
const suite = process.argv.find(value => value.startsWith('--suite='))?.slice(8);
assert(['r32', 'r33'].includes(suite), 'Choose the unchanged R32 or R33 interaction suite.');
const original = JSON.parse(execFileSync('git', ['show', baseline + ':package.json'], {cwd: root, encoding: 'utf8'})).scripts['verify:' + suite + ':http'];
const commands = original.split(' && ').map(command => {assert(/^node tests\/[a-z0-9-]+\.mjs$/.test(command)); return command.split(' ');});
for (const [, name] of commands) assert(fs.readFileSync(path.join(root, name)).equals(execFileSync('git', ['show', baseline + ':' + name], {cwd: root})), 'Published assertions changed: ' + name);
const checks = [], startedAt = new Date().toISOString();
const preserved = new Map(), evidence = [];
if (suite === 'r33') for (const key of ['NATIVE', 'SPRITES', 'EVIDENCE', 'PERSISTENCE', 'RUNTIME', 'DASHBOARD', 'DOSSIER']) {
  const name = 'docs/R33_' + key + '_BROWSER.json'; preserved.set(name, fs.readFileSync(path.join(root, name))); fs.rmSync(path.join(root, name));
}
try {
  for (const command of commands) {
    const result = spawnSync(process.execPath, ['--import=' + path.join(root, 'tests/browser-compat-r34.mjs'), command[1]], {cwd: root, env: process.env, stdio: 'inherit'});
    checks.push({command, exitCode: result.status, signal: result.signal, error: result.error?.message || null});
    if (result.status !== 0) break;
  }
} finally {
  for (const [name, originalBytes] of preserved) {
    const source = path.join(root, name);
    if (fs.existsSync(source)) {
      const raw = fs.readFileSync(source), target = 'qa-browser-compat-r34/r33-reports/' + path.basename(name);
      fs.mkdirSync(path.dirname(path.join(root, target)), {recursive: true}); fs.writeFileSync(path.join(root, target), raw);
      evidence.push({path: target, sha256: createHash('sha256').update(raw).digest('hex'), bytes: raw.length, fresh: true});
    }
    fs.writeFileSync(source, originalBytes); assert(fs.readFileSync(source).equals(originalBytes));
  }
}
const names = ['scripts/run-browser-compat-r34.mjs', 'tests/browser-compat-r34.mjs', 'package.json',
  'modules/versus.html', 'catalog-duel.html', 'modules/fidelity-r34/evolutions/index.html',
  'modules/fidelity-r34/combat/generated-runtime.js', 'modules/fidelity-r34/selection/avatars.js',
  'modules/fidelity-r34/combat/held-presentation.js',
  'modules/fidelity-r34/selection/prepare.js', 'modules/fidelity-r34/selection/flow.js',
  'modules/fidelity-r33/combat/manifest.json', 'modules/fidelity-r33/selection/manifest.json', ...commands.map(command => command[1])];
const report = {schema: 're.bow.interaction-compatibility-r34/1', suite, baselineCommit: baseline, startedAt, finishedAt: new Date().toISOString(),
  passed: checks.filter(check => check.exitCode === 0).length, failed: checks.filter(check => check.exitCode !== 0).length,
  expectedCommands: commands.length, complete: checks.length === commands.length && checks.every(check => check.exitCode === 0), checks,
  preservedPublishedReports: preserved.size, freshExecutionReports: evidence,
  sourceFiles: names.map(name => ({path: name, sha256: createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex')})),
  scope: 'Original assertions unchanged on current controllers, with explicit dev=1&selection=direct presentation and R33 asset dialect. This isolates the former input/presentation contracts; it does not certify the new default character→arena flow or new R34 media.'};
const out = path.join(root, 'qa-browser-compat-r34', suite + '.json'); fs.mkdirSync(path.dirname(out), {recursive: true}); fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
if (!report.complete) process.exitCode = 1;
