/** WCAG automation, reflow, transport focus and opt-in simulated gamepad navigation. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa-access-r24'); fs.mkdirSync(output, {recursive: true});
const require = createRequire(import.meta.url);
const axePath = process.env.AXE_CORE_PATH || (() => { try { return require.resolve('axe-core/axe.min.js'); }
  catch { return '/workspace/.cache/bow-r24-access-tools/node_modules/axe-core/axe.min.js'; } })();
assert(fs.existsSync(axePath), 'Install axe-core@4.14.0 and set AXE_CORE_PATH to axe.min.js.');
const axeSource = fs.readFileSync(axePath, 'utf8');
const port = Number(process.env.BOW_R24_ACCESS_PORT || 5286), base = 'http://127.0.0.1:' + port;
const pages = ['modules/fidelity-r23/index.html', ...['visual', 'motion', 'canonical', 'persistence', 'audio'].map(name => `modules/fidelity-r23/${name}/index.html`),
  'modules/fidelity-r24/index.html', ...['models', 'motion', 'canonical', 'persistence', 'audio'].map(name => `modules/fidelity-r24/${name}/index.html`)];
const gamepadPages = ['modules/fidelity-r24/index.html', 'modules/fidelity-r24/models/index.html'];
const startedAt = new Date().toISOString(), checks = [];
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
let browser, axeVersion;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function test(name, run) {
  try { const detail = await run(); checks.push({name, pass: true, detail}); console.log('PASS ' + name); }
  catch (error) { checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message); }
}
async function loaded(page, rel) {
  const response = await page.goto(base + '/' + rel); assert.equal(response.status(), 200, rel);
  await page.waitForLoadState('networkidle');
  if (/fidelity-r2[34]\/index\.html$/.test(rel)) await page.waitForFunction(() => document.querySelectorAll('[data-task-id]').length === 17);
  if (rel.includes('fidelity-r23/canonical')) await page.waitForFunction(() => document.querySelectorAll('#results button').length === 389);
  if (rel.includes('fidelity-r23/motion')) await page.waitForFunction(() => document.querySelector('#caption').textContent.startsWith('Image 1 /'));
  if (rel.includes('fidelity-r24/models')) await page.waitForFunction(() => window.RE_SOURCE_MODELS_R24?.state().ready, null, {timeout: 60000});
  if (rel.includes('fidelity-r24/audio')) {
    await page.waitForFunction(() => !document.querySelector('#clip').disabled && !document.querySelector('#prepare').disabled);
    await page.click('#prepare'); await page.waitForFunction(() => document.querySelector('#audio').src.startsWith('blob:'));
    assert.equal(await page.locator('#audio').evaluate(audio => audio.paused), true, 'Source audio never autoplays during inspection');
  }
}
async function palette(page) {
  return page.evaluate(() => {
    const parse = value => {
      const numbers = value.match(/[\d.]+/g)?.map(Number); if (!numbers || numbers.length < 3) return null;
      return [...numbers.slice(0, 3), numbers[3] ?? 1];
    };
    const merge = (front, back) => front.slice(0, 3).map((n, i) => n * front[3] + back[i] * (1 - front[3]));
    const luminance = color => color.slice(0, 3).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4)
      .reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
    const pairs = new Map(); let skipped = 0;
    for (const element of document.querySelectorAll('p,h1,h2,h3,a,button,input,select,th,td,label,summary,small')) {
      const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
      if (!rect.width || !rect.height || rect.bottom < 0 || rect.top >= innerHeight || element.matches(':disabled') || !element.textContent.trim()) continue;
      const chain = []; let safe = true;
      for (let node = element; node; node = node.parentElement) {
        const s = getComputedStyle(node); if (s.backgroundImage !== 'none' || Number(s.opacity) !== 1) { safe = false; break; }
        const c = parse(s.backgroundColor); if (!c) { safe = false; break; } chain.unshift(c);
      }
      const color = parse(style.color); if (!safe || !color) { skipped++; continue; }
      let background = [0, 0, 0]; for (const c of chain) background = merge(c, background);
      const foreground = merge(color, background), a = luminance(foreground), b = luminance(background);
      const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      const font = parseFloat(style.fontSize), weight = parseInt(style.fontWeight) || 400;
      const required = font >= 24 || (font >= 18.666 && weight >= 700) ? 3 : 4.5;
      const key = [style.color, background.join(','), required].join('|');
      if (!pairs.has(key)) pairs.set(key, {foreground: style.color, background: background.map(Math.round), requiredRatio: required,
        ratio, meetsThreshold: ratio >= required, sample: element.textContent.trim().slice(0, 100)});
    }
    return {scope: 'Flat backgrounds and visible text in the current viewport only; transparent layers composited; disabled controls excluded.',
      skippedComplexOrTransparentCases: skipped, pairs: [...pairs.values()]};
  });
}
try {
  for (let attempt = 0; attempt < 80; attempt++) { try { if ((await fetch(base)).ok) break; } catch {} await wait(75); }
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader']});
  for (const width of [1280, 320]) for (const rel of pages) await test('WCAG automation and reflow: ' + rel + ' at ' + width + 'px', async () => {
    const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'}), page = await context.newPage();
    try {
      await loaded(page, rel); await page.evaluate(axeSource); axeVersion = await page.evaluate(() => axe.version);
      assert.equal(axeVersion, '4.14.0', 'Pinned axe-core version');
      const result = await page.evaluate(() => axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']}}));
      const violations = result.violations.map(item => ({id: item.id, impact: item.impact, help: item.help,
        nodes: item.nodes.map(node => ({target: node.target, summary: node.failureSummary}))}));
      assert.deepEqual(violations, [], 'No automated violations; incomplete checks remain explicitly unverified');
      const colors = await palette(page);
      assert.deepEqual(colors.pairs.filter(item => !item.meetsThreshold), [], 'Measured simple visible text colors meet their contrast threshold');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Document reflows without horizontal overflow');
      if (width === 320) {
        await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Document remains usable with root text scaled to 200%');
        const skip = page.locator('a.skip');
        if (await skip.count()) {
          assert((await skip.boundingBox()).y + (await skip.boundingBox()).height <= 0, 'Unfocused skip link remains fully above viewport even with large text');
          await skip.focus(); const bounds = await skip.boundingBox(); assert(bounds.y >= 0 && bounds.y + bounds.height <= 1000, 'Focused skip link is visible with large text');
          await skip.evaluate(element => element.blur());
        }
      }
      await page.screenshot({path: path.join(output, rel.replaceAll('/', '-').replace('.html', '') + '-' + width + '.png'), fullPage: false});
      return {page: rel, width, axeVersion, automatedPassRules: result.passes.length, violations,
        incomplete: result.incomplete.map(item => ({id: item.id, affectedNodes: item.nodes.length, help: item.help})),
        measuredTextContrast: colors, reflow: {viewportCssPx: width, equivalentLayout: width === 320 ? '1280px screen at 400% layout zoom, simulated via viewport; browser UI zoom not exercised' : null,
          rootTextResizeAt320: width === 320 ? '200%' : null}};
    } finally { await context.close(); }
  });
  await test('Malacoda endpoint focus recovers without stealing a deliberate new target', async () => {
    const context = await browser.newContext(), page = await context.newPage();
    try {
      await loaded(page, 'modules/fidelity-r23/motion/index.html');
      assert.equal(await page.evaluate(() => Boolean(window.RE_FOCUS_RETENTION_R24)), true, 'R24 additive focus patch is loaded');
      await page.locator('#position').focus(); await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => document.querySelector('#caption').textContent.startsWith('Image 2 /'));
      await page.locator('#previous').focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('#caption').textContent.startsWith('Image 1 /'));
      assert.equal(await page.evaluate(() => document.activeElement.id), 'position');
      await page.keyboard.press('ArrowRight'); await page.waitForFunction(() => document.querySelector('#caption').textContent.startsWith('Image 2 /'));
      await page.evaluate(() => { document.querySelector('#previous').focus(); document.querySelector('#previous').click(); document.querySelector('summary').focus(); });
      await page.waitForFunction(() => document.querySelector('#caption').textContent.startsWith('Image 1 /'));
      assert.equal(await page.evaluate(() => document.activeElement.tagName), 'SUMMARY');
      return {previousEndpointMovesFocusToRange: true, subsequentArrowWorks: true, deliberateSummaryFocusRetained: true};
    } finally { await context.close(); }
  });
  for (const rel of gamepadPages) await test('Opt-in simulated standard gamepad: ' + rel, async () => {
    const context = await browser.newContext(), page = await context.newPage();
    await page.addInitScript(() => {
      window.__R24pad = {id: 'R24 simulated standard pad', index: 0, connected: true, mapping: 'standard', axes: [0, 0],
        buttons: Array.from({length: 17}, () => ({pressed: false, touched: false, value: 0}))};
      window.__R24pad.buttons[0] = {pressed: true, touched: true, value: 1};
      Object.defineProperty(navigator, 'getGamepads', {configurable: true, value: () => [window.__R24pad]});
    });
    const release = async () => { await page.evaluate(() => window.__R24pad.buttons.forEach(button => { button.pressed = false; button.value = 0; })); await page.waitForTimeout(75); };
    const press = async index => { await page.evaluate(index => { window.__R24pad.buttons[index].pressed = true; window.__R24pad.buttons[index].value = 1; }, index); await page.waitForTimeout(75); };
    try {
      await loaded(page, rel); await page.waitForFunction(() => Boolean(window.RE_WORKBENCH_GAMEPAD_R24));
      const toggle = page.locator('[data-r24-gamepad-ui] button'); assert.equal(await toggle.isVisible(), true);
      assert.deepEqual(await page.evaluate(() => RE_WORKBENCH_GAMEPAD_R24.state()), {enabled: false, polling: false});
      await page.evaluate(() => {
        window.__R24activations = 0; const button = document.createElement('button'); button.id = 'r24TestAction'; button.type = 'button';
        button.textContent = 'Action de vérification temporaire'; button.addEventListener('click', () => window.__R24activations++);
        document.querySelector('[data-r24-gamepad-root]').prepend(button);
      });
      await toggle.click(); await page.waitForTimeout(150);
      assert.equal(await page.evaluate(() => window.__R24activations), 0, 'Held A on enable never activates');
      await release(); await press(13); await release();
      assert.equal(await page.evaluate(() => document.activeElement.id), 'r24TestAction');
      await press(0); await page.waitForTimeout(350); assert.equal(await page.evaluate(() => window.__R24activations), 1, 'Held confirmation does not repeat'); await release();
      const beforeDrift = await page.evaluate(() => document.activeElement.id);
      await page.evaluate(() => { window.__R24pad.axes[0] = .3; }); await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => document.activeElement.id), beforeDrift); await page.evaluate(() => { window.__R24pad.axes[0] = 0; });
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', {configurable: true, get: () => true}); document.dispatchEvent(new Event('visibilitychange')); });
      assert.equal(await page.evaluate(() => RE_WORKBENCH_GAMEPAD_R24.state().polling), false);
      await press(0); await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
      await page.waitForTimeout(150); assert.equal(await page.evaluate(() => window.__R24activations), 1, 'Held A on visibility return is ignored');
      await release(); await press(0); assert.equal(await page.evaluate(() => window.__R24activations), 2); await release();
      const before = page.url(); await page.evaluate(() => { for (const index of [0, 1]) { window.__R24pad.buttons[index].pressed = true; window.__R24pad.buttons[index].value = 1; } });
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => RE_WORKBENCH_GAMEPAD_R24.state().enabled), false);
      assert.equal(await page.evaluate(() => window.__R24activations), 2, 'Back has priority over simultaneous confirmation');
      assert.equal(page.url(), before, 'Back never navigates away'); assert.equal(await toggle.evaluate(el => el === document.activeElement), true);
      return {realPage: rel, navigatorApiSimulated: true, physicalGamepad: false, explicitEnable: true, initialHeldIgnored: true,
        dpadFocus: true, confirmationEdgeOnly: true, deadZoneObserved: .3, visibilityBranchFaultInjected: true, heldOnReturnIgnored: true, backStopsWithoutNavigation: true};
    } finally { await context.close(); }
  });
  await test('Denied or missing gamepad API preserves keyboard and hides unavailable opt-in', async () => {
    const states = [];
    for (const denied of [false, true]) {
      const context = await browser.newContext(), page = await context.newPage();
      try {
        await page.addInitScript(denied => Object.defineProperty(navigator, 'getGamepads', {configurable: true,
          value: denied ? () => { throw new DOMException('Denied by test policy', 'SecurityError'); } : undefined}), denied);
        await loaded(page, gamepadPages[0]);
        const widget = page.locator('[data-r24-gamepad-ui]');
        if (denied) {
          await widget.locator('button').click(); await page.waitForTimeout(100);
          assert.equal(await page.evaluate(() => RE_WORKBENCH_GAMEPAD_R24.state().enabled), false);
          assert.match(await widget.innerText(), /indisponible/);
        } else assert.equal(await widget.isHidden(), true);
        const target = page.locator('main a[href],main button:not(:disabled)').filter({visible: true}).first();
        await target.focus(); assert.equal(await target.evaluate(el => el === document.activeElement), true);
        states.push({apiDenied: denied, noKeyboardBlock: true});
      } finally { await context.close(); }
    }
    return states;
  });
} finally {
  const report = {schema: 're.bow.accessibility-evidence-r24/1', startedAt, completedAt: new Date().toISOString(),
    environment: {node: process.version, chromium: browser?.version() || null, axeCore: axeVersion || null, virtualized: true, headless: true, softwareWebGL: true},
    certification: {physicalDevices: false, physicalGamepads: false, screenReaders: false, completeWcagConformance: false, originalArtFidelity: false},
    passed: checks.filter(item => item.pass).length, failed: checks.filter(item => !item.pass).length, checks};
  await browser?.close(); server.kill('SIGTERM');
  const data = JSON.stringify(report, null, 2) + '\n'; fs.writeFileSync(path.join(output, 'R24_ACCESS_RESULTS.json'), data);
  fs.writeFileSync(path.join(root, 'docs/R24_ACCESS_BROWSER.json'), data);
  console.log(JSON.stringify({passed: report.passed, failed: report.failed}));
  if (report.failed) process.exitCode = 1;
}
