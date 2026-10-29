#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const BASE_COMMIT = '413b89bfafc18abc55be1404ff77bdaf573b1334';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GUARD = 'node scripts/verify-current-r32.mjs';
const GUARD_TEST = 'node tests/verify-current-guard-r32.mjs';
const INPUT_TEST = 'node tests/verify-input-r32.mjs';
// Reviewed R32 page-controller bytes; no historical manifest or contract is rewritten.
const CATALOG_SOURCE_SHA256 = '5ebfaa1c2c67afbf57ef62dabec5f54372b2fcf5ec855f7d83f53abbcf87c456';
const ARCHIVED_COMMANDS = [
  'node tests/verify-save-center-r19.mjs',
  'node tests/verify-preservation-r20.mjs',
];
export const HISTORICAL_PLAN = Object.freeze({
  schema: 're.bow.published-check-plan-r29/1',
  commands: ARCHIVED_COMMANDS.map(command => command.split(' ')),
});

// R32 is a bounded delivery. A later release must review its own source delta;
// changing a historical manifest/hash is never a way to admit new source bytes.
export const R32_FILES = Object.freeze({
  'src/trial-input-v071.js': 'M',
  'src/catalog-duel-v070.js': 'M',
  'src/game-menu-r20.js': 'M',
  'modules/fidelity-r31/performance/page.js': 'M',
  'modules/fidelity-r31/motion/page.js': 'M',
  'modules/fidelity-r31/audio/style.css': 'M',
  'modules/fidelity-r31/sprites/style.css': 'M',
  'package.json': 'M',
  '.github/workflows/ci.yml': 'M',
  '.github/workflows/source-fidelity-r23.yml': 'M',
  '.github/workflows/source-fidelity-r24.yml': 'M',
  '.github/workflows/source-fidelity-r25.yml': 'M',
  '.github/workflows/source-fidelity-r26.yml': 'M',
  '.github/workflows/source-fidelity-r28.yml': 'M',
  '.github/workflows/source-fidelity-r31.yml': 'M',
  'AGENTS.md': 'A',
  'docs/GAMEDEV_GUIDANCE.md': 'A',
  'docs/GAMEDEV_APPLIED_R32.md': 'A',
  'docs/GAMEDEV_APPLIED_R32.json': 'A',
  'scripts/verify-current-r32.mjs': 'A',
  'tests/verify-current-guard-r32.mjs': 'A',
  'tests/r32-historical-plan.json': 'A',
  'tests/verify-input-r32.mjs': 'A',
  'tests/browser-input-r32.mjs': 'A',
  'tests/browser-catalog-controls-r32.mjs': 'A',
  'tests/browser-catalog-focus-r32.mjs': 'A',
  'tests/browser-menu-input-r32.mjs': 'A',
  'tests/browser-performance-lifecycle-r32.mjs': 'A',
  'tests/browser-reflow-r32.mjs': 'A',
  'tests/browser-motion-input-r32.mjs': 'A',
  '.github/workflows/gamedev-r32.yml': 'A',
});
const OPTIONAL = new Set(['docs/GAMEDEV_APPLIED_R32.json']);
const BASELINE_PATHS = Object.keys(R32_FILES).filter(file => R32_FILES[file] === 'M');

function replaceOnce(source, before, after, label) {
  assert.equal(source.split(before).length - 1, 1, 'Baseline anchor must occur once: ' + label);
  return source.replace(before, after);
}

export function expectedInput(baseline) {
  const source = replaceOnce(baseline,
    "  for(const a of pad.edges||[])if(a!=='pause')queue(a);\n",
    "  for(const a of pad.edges||[])if(a!=='pause')queue(a);\n" +
    '  // Opposite directions cancel, including when they come from different devices.\n' +
    '  const direction=(input.right?1:0)-(input.left?1:0);\n', 'input normalization');
  return replaceOnce(source,
    "input.left||input.right?(((input.right?1:-1)===face)?'specialForward':'specialBack'):'special'",
    "direction===face?'specialForward':direction===-face?'specialBack':'special'",
    'special slot resolution');
}

export function expectedMenu(baseline) {
  return replaceOnce(baseline,
    '    if (event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;\n',
    '    if (event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;\n' +
    '    // A held confirmation/back key must not activate the newly focused screen.\n' +
    "    const confirmation = event.key === 'Enter' || event.key === ' ';\n" +
    "    if (event.repeat && (event.key === 'Escape' || (confirmation && (!boot.hidden || event.target?.closest?.('button,a[href]'))))) {\n" +
    '      event.preventDefault(); return;\n' +
    '    }\n', 'menu repeat filter');
}

export function expectedMotion(baseline) {
  let source = baseline;
  source = replaceOnce(source, "byId('canvas').addEventListener('keydown', event => {\n",
    "byId('play').addEventListener('keydown', event => {\n  if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return;\n  if (event.repeat && ['Enter', ' '].includes(event.key)) event.preventDefault();\n});\nbyId('canvas').addEventListener('keydown', event => {\n  if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return;\n", 'motion keyboard boundary 1');
  source = replaceOnce(source, "  event.preventDefault(); if (event.key === ' ') {play(); return;} stop();",
    "  event.preventDefault(); if (event.key === ' ') {if (!event.repeat) play(); return;} stop();", 'motion keyboard boundary 2');
  return source;
}

export function historicalCommand(evidence, command) {
  return 'python3 scripts/run-published-release-r29.py --commit ' + BASE_COMMIT +
    ' --evidence qa-gamedev-r32/' + evidence +
    (command ? ' -- ' + command : ' --plan tests/r32-historical-plan.json');
}

export function expectedReflow(file, baseline) {
  if (file === 'modules/fidelity-r31/audio/style.css') {
    return replaceOnce(baseline, 'h2{font-size:1.3rem}',
      'h2{font-size:1.3rem;overflow-wrap:anywhere}', 'audio heading wrapping');
  }
  assert.equal(file, 'modules/fidelity-r31/sprites/style.css', 'Unknown reflow source');
  return replaceOnce(baseline, 'h1{font-size:clamp(1.5rem,4vw,2.2rem)}',
    'h1{font-size:clamp(1.5rem,4vw,2.2rem);overflow-wrap:anywhere}', 'sprite heading wrapping');
}

export function expectedPackage(baseline) {
  const currentCommands = baseline.scripts.verify.split(' && ');
  for (const command of ARCHIVED_COMMANDS) {
    assert.equal(currentCommands.filter(value => value === command).length, 1,
      'Exactly one original historical command is required: ' + command);
    currentCommands.splice(currentCommands.indexOf(command), 1);
  }
  const scripts = {...baseline.scripts};
  scripts.verify = 'npm run verify:current && npm run verify:historical:r31';
  scripts['verify:current'] = [GUARD, GUARD_TEST, ...currentCommands, INPUT_TEST].join(' && ');
  scripts['verify:historical:r31'] = historicalCommand('historical-r31');
  scripts['verify:saves'] = GUARD + ' && ' + historicalCommand('saves-r19', ARCHIVED_COMMANDS[0]);
  scripts['verify:r20'] = [
    GUARD, 'node tests/verify-menu-r20.mjs', 'node tests/verify-sprites-r20.mjs',
    historicalCommand('preservation-r20', ARCHIVED_COMMANDS[1]),
  ].join(' && ');
  scripts['verify:r32'] = [GUARD, GUARD_TEST, INPUT_TEST].join(' && ');
  scripts['verify:r32:http'] = [
    'node tests/browser-input-r32.mjs',
    'node tests/browser-catalog-controls-r32.mjs',
    'node tests/browser-catalog-focus-r32.mjs',
    'node tests/browser-menu-input-r32.mjs',
    'node tests/browser-performance-lifecycle-r32.mjs',
    'node tests/browser-reflow-r32.mjs',
    'node tests/browser-motion-input-r32.mjs',
  ].join(' && ');
  return {...baseline, scripts};
}

export function browserWorkflow() {
  return [
    'name: R32 current inputs, menus, measurement lifecycle and reflow',
    'on:',
    '  pull_request:',
    '    branches: [main]',
    '  push:',
    "    branches: [main, 'codex/**']",
    '  workflow_dispatch:',
    'permissions:',
    '  contents: read',
    'concurrency:',
    '  group: gamedev-r32-${{ github.ref }}',
    '  cancel-in-progress: true',
    'jobs:',
    '  current:',
    '    runs-on: ubuntu-latest',
    '    timeout-minutes: 15',
    '    steps:',
    '      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262',
    '        with:',
    '          persist-credentials: false',
    '          fetch-depth: 0',
    '      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
    '        with:',
    "          node-version: '22.16.0'",
    '      - name: Install pinned browser verification tools',
    '        run: npm install --no-audit --no-fund --no-save --package-lock=false --fetch-timeout=60000 --fetch-retries=2 playwright@1.64.1 @napi-rs/canvas@0.1.80 @puppeteer/browsers@2.10.10',
    '      - name: Install the recorded Chromium version',
    '        run: |',
    "          node --input-type=module - <<'JS'",
    "          import fs from 'node:fs';",
    "          import path from 'node:path';",
    "          import {install,Browser} from '@puppeteer/browsers';",
    "          const browser=await install({browser:Browser.CHROME,buildId:'154.0.8037.57',",
    "            cacheDir:path.join(process.env.RUNNER_TEMP,'gamedev-r32-chrome')});",
    "          fs.appendFileSync(process.env.GITHUB_ENV,'CHROME_BIN='+browser.executablePath+'\\n');",
    '          JS',
    '      - name: Check the current delta and input regression before any report refresh',
    '        run: npm run verify:r32',
    '      - name: Exercise delivered inputs, menu keys, measurement lifecycle and reflow',
    '        run: npm run verify:r32:http',
    '      - name: Preserve evidence from this execution',
    '        if: always()',
    '        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
    '        with:',
    '          name: gamedev-r32-current-${{ github.run_id }}',
    '          path: qa-gamedev-r32/',
    '          if-no-files-found: warn',
    '          retention-days: 14',
    '',
  ].join('\n');
}

export function expectedWorkflow(file, baseline) {
  if (file === '.github/workflows/gamedev-r32.yml') return browserWorkflow();
  let result = baseline;
  if (file === '.github/workflows/ci.yml') {
    result = replaceOnce(result,
      '      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262\n',
      '      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262\n' +
      '        with:\n          persist-credentials: false\n          fetch-depth: 0\n', 'main CI history');
    return result + [
      '      - name: Preserve current scope and published R31 assertion evidence',
      '        if: always()',
      '        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
      '        with:',
      '          name: gamedev-r32-unit-and-archive-${{ github.run_id }}',
      '          path: qa-gamedev-r32/',
      '          if-no-files-found: warn',
      '          retention-days: 14',
      '',
    ].join('\n');
  }
  if (file === '.github/workflows/source-fidelity-r25.yml' ||
      file === '.github/workflows/source-fidelity-r26.yml') {
    const release = file.includes('r25') ? '25' : '26';
    const firstGeneration = '      - name: Reproduce frozen source catalogue and workbook before evidence reports are regenerated\n';
    result = replaceOnce(result, firstGeneration,
      '      - name: Verify the reviewed current delta before any R' + release + ' report refresh\n' +
      '        run: node scripts/verify-current-r32.mjs\n' + firstGeneration,
      'R' + release + ' current scope before report refresh');
    result = replaceOnce(result, '          node tests/verify-r' + release + '-integration.mjs\n',
      '          python3 scripts/run-published-release-r29.py --commit ' + BASE_COMMIT +
      ' --evidence qa-fidelity-r' + release + '-ci/published-integration -- node tests/verify-r' + release + '-integration.mjs\n',
      'R' + release + ' original integration on published R31');
    const lastReport = '            docs/R' + release + (release === '25' ? '_FULL_MATCHES.json\n' : '_MATCHES.json\n');
    return replaceOnce(result, lastReport,
      lastReport + '            !docs/R' + release + '_INTEGRATION_TESTS.json\n',
      'R' + release + ' archive report must not be uploaded as a fresh current result');
  }
  if (file === '.github/workflows/source-fidelity-r23.yml' ||
      file === '.github/workflows/source-fidelity-r24.yml') {
    const release = file.includes('r23') ? 'r23' : 'r24';
    if (release === 'r23') result = replaceOnce(result,
      '          persist-credentials: false\n',
      '          persist-credentials: false\n          fetch-depth: 0\n', 'R23 history');
    result = replaceOnce(result,
      '          node tests/verify-preservation-r20.mjs\n',
      '          ' + historicalCommand(release + '-historical-preservation', ARCHIVED_COMMANDS[1]) + '\n',
      release + ' published preservation command');
    return replaceOnce(result, '            qa-*' + release + '*/\n',
      '            qa-*' + release + '*/\n' +
      '            qa-gamedev-r32/' + release + '-historical-preservation/\n',
      release + ' archive evidence');
  }
  if (file === '.github/workflows/source-fidelity-r28.yml') {
    const block = '      - name: Keep the original engine and content assertions active\n' +
      '        run: npm run verify > qa-fidelity-r28-ci/historical-verify.log\n';
    result = replaceOnce(result, block, '', 'R28 original verification block');
    return replaceOnce(result,
      '      - name: Invalidate the previous test reports before this execution\n',
      '      - name: Validate current engine and historical assertions before report generation\n' +
      '        run: npm run verify > qa-fidelity-r28-ci/current-and-published-verify.log\n' +
      '      - name: Invalidate the previous test reports before this execution\n',
      'R28 verification before report refresh');
  }
  assert.equal(file, '.github/workflows/source-fidelity-r31.yml', 'Unknown workflow policy');
  const checkout = '      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262\n        with:\n';
  assert.equal(result.split(checkout).length - 1, 3, 'All three R31 jobs retain their checkout');
  let checkoutNumber = 0;
  result = result.replaceAll(checkout, () => checkout + '          ref: ' +
    (checkoutNumber++ === 1 ? '${{ github.sha }}' : BASE_COMMIT) + '\n');
  result = replaceOnce(result,
    'playwright@1.64.1 @napi-rs/canvas@0.1.80 @puppeteer/browsers@2.10.10\n',
    'playwright@1.64.1 @napi-rs/canvas@0.1.80 @puppeteer/browsers@2.10.10 axe-core@4.14.0\n',
    'R31 current browser accessibility dependency');
  for (const [before, after] of [
    ['name: R31 all open fidelity workstreams, generated bodies and real restore',
      'name: R31 published provenance/build and current browser regressions'],
    ['  provenance:\n', '  provenance:\n    name: Published R31 provenance\n'],
    ['  browser:\n', '  browser:\n    name: Current R31 browser - ${{ matrix.suite }}\n'],
    ['  build:\n', '  build:\n    name: Published R31 static build\n'],
    ['Require every current source report to be freshly executed',
      'Require every published R31 report to be freshly executed'],
    ['Keep every original current engine and UI assertion active',
      'Keep every original engine and UI assertion active in published R31'],
    ['current-engine-ui.log', 'published-engine-ui.log'],
    ['Upload actual current source results', 'Upload executed published R31 results'],
    ['Run the current source browser checks', 'Run unchanged R31 browser assertions on current source'],
    ['name: fidelity-r31-provenance-${{ github.run_id }}',
      'name: fidelity-r31-archive-provenance-${{ github.run_id }}'],
    ['name: fidelity-r31-${{ matrix.suite }}-${{ github.run_id }}',
      'name: fidelity-r31-current-${{ matrix.suite }}-${{ github.run_id }}'],
    ['Build and compare the complete current static delivery',
      'Build and compare the published R31 static delivery'],
  ]) result = replaceOnce(result, before, after, before);
  return result;
}

export function validateChangeList(changes) {
  const seen = new Set();
  for (const {status, file} of changes) {
    assert(Object.hasOwn(R32_FILES, file), 'Unreviewed R32 change: ' + file);
    assert.equal(status, R32_FILES[file], 'Unexpected change kind: ' + file);
    assert(!seen.has(file), 'Duplicate changed path: ' + file);
    seen.add(file);
  }
  for (const file of Object.keys(R32_FILES)) {
    if (!OPTIONAL.has(file)) assert(seen.has(file), 'Missing required R32 change: ' + file);
  }
}

export function validateSnapshot({baseline, current, changes}) {
  validateChangeList(changes);
  for (const file of Object.keys(R32_FILES)) {
    if (OPTIONAL.has(file) && !current.has(file)) continue;
    assert.equal(typeof current.get(file), 'string', 'Required regular UTF-8 source is missing: ' + file);
  }
  assert.deepEqual(JSON.parse(current.get('package.json')),
    expectedPackage(JSON.parse(baseline.get('package.json'))),
    'The current and historical command pipelines, package metadata and version must remain explicit');
  assert.deepEqual(JSON.parse(current.get('tests/r32-historical-plan.json')), HISTORICAL_PLAN,
    'Both original historical suites must run unchanged on published R31');
  assert.equal(current.get('src/trial-input-v071.js'), expectedInput(baseline.get('src/trial-input-v071.js')),
    'Only the reviewed opposite-direction resolution is permitted in trial input');
  assert.equal(createHash('sha256').update(current.get('src/catalog-duel-v070.js')).digest('hex'),
    CATALOG_SOURCE_SHA256, 'Only the reviewed catalogue controls and focus revision is permitted');
  assert.equal(current.get('src/game-menu-r20.js'), expectedMenu(baseline.get('src/game-menu-r20.js')),
    'Only the reviewed held confirmation/back filter is permitted in the menu');
  for (const file of ['modules/fidelity-r31/audio/style.css', 'modules/fidelity-r31/sprites/style.css']) {
    assert.equal(current.get(file), expectedReflow(file, baseline.get(file)),
      'Only the reviewed heading wrapping change is permitted: ' + file);
  }
  assert.equal(current.get('modules/fidelity-r31/motion/page.js'), expectedMotion(baseline.get('modules/fidelity-r31/motion/page.js')),
    'Only the reviewed motion keyboard boundaries are permitted');
  assert.notEqual(current.get('modules/fidelity-r31/performance/page.js'),
    baseline.get('modules/fidelity-r31/performance/page.js'), 'The lifecycle fix must be delivered');
  for (const file of Object.keys(R32_FILES).filter(value => value.startsWith('.github/workflows/'))) {
    assert.equal(current.get(file), expectedWorkflow(file, baseline.get(file)),
      'Workflow must preserve the reviewed current/archive split: ' + file);
  }
  return {
    schema: 're.bow.current-scope-r32/1',
    published_baseline: BASE_COMMIT,
    modified: changes.filter(value => value.status === 'M').map(value => value.file).sort(),
    added: changes.filter(value => value.status === 'A').map(value => value.file).sort(),
    assertions: [
      'Only explicitly reviewed R32 paths changed; old tests, data, assets, reports and replay contracts retain published bytes.',
      'Input, menu and two heading style changes match the reviewed baseline transformations; catalogue controls/focus match the reviewed R32 source hash.',
      'All 38 remaining original npm verify commands stay on current, in their original order.',
      'Both npm preservation suites and the R25/R26 frozen integration suites run unchanged on the exact published R31 snapshot.',
      'All seven R32 browser suites and unchanged R31 browser recipes stay current; R31 provenance/build use the published snapshot.',
    ],
    scope: 'Source and pipeline integrity. Behavioural results are reported by their separate executed suites.',
  };
}

export function collectSnapshot(root = ROOT) {
  const git = (...args) => execFileSync('git', args, {
    cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(git('rev-parse', '--verify', BASE_COMMIT + '^{commit}').trim(), BASE_COMMIT,
    'Fetch full Git history to verify the published R31 snapshot');
  const fields = git('diff', '--name-status', '--no-renames', '-z', BASE_COMMIT, '--')
    .split('\0').filter(Boolean);
  assert.equal(fields.length % 2, 0, 'Unexpected Git change record');
  const changes = [];
  for (let i = 0; i < fields.length; i += 2) changes.push({status: fields[i], file: fields[i + 1]});
  for (const file of git('ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean)) {
    changes.push({status: 'A', file});
  }
  // Check the entire Git delta before opening selected files. Ignored QA outputs
  // do not authorize changes to any tracked historical report.
  validateChangeList(changes);
  const baseline = new Map(BASELINE_PATHS.map(file => [file, git('show', BASE_COMMIT + ':' + file)]));
  const current = new Map();
  for (const file of Object.keys(R32_FILES)) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute)) continue;
    assert(fs.lstatSync(absolute).isFile(), 'R32 source must be a regular file: ' + file);
    current.set(file, fs.readFileSync(absolute, 'utf8'));
  }
  return {baseline, current, changes};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = validateSnapshot(collectSnapshot());
    const output = path.join(ROOT, 'qa-gamedev-r32/current-scope.json');
    fs.mkdirSync(path.dirname(output), {recursive: true});
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } catch (error) {
    console.error('FAIL R32 current source/pipeline check: ' + error.message);
    process.exitCode = 1;
  }
}
