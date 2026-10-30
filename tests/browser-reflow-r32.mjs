/** Actual delivered HTML/CSS; external scripts are inert fixtures for this static-heading regression. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = [
  {name: 'audio', directory: 'modules/fidelity-r31/audio', heading: '#reviewHeading'},
  {name: 'sprites', directory: 'modules/fidelity-r31/sprites', heading: 'h1'}
];
const sourceFiles = pages.flatMap(page => [page.directory + '/index.html', page.directory + '/style.css']);
const sources = new Map(sourceFiles.map(file => ['/' + file, fs.readFileSync(path.join(root, file))]));
const selected = process.argv.find(argument => argument.startsWith('--report='))?.slice('--report='.length)
  || 'qa-gamedev-r32/reflow.json';
const output = path.resolve(root, selected);
const captures = path.join(path.dirname(output), path.basename(output, path.extname(output)));
fs.mkdirSync(captures, {recursive: true});
const checks = [], errors = [], scriptFixtures = new Set();
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (sources.has(pathname)) {
    response.setHeader('Content-Type', pathname.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8');
    return response.end(sources.get(pathname));
  }
  // The failing headings exist in the original markup before media registries load.
  // Do not alter that markup or substitute fonts; only omit unrelated runtime/media work.
  if (pathname.endsWith('.js')) {
    scriptFixtures.add(pathname); response.setHeader('Content-Type', 'text/javascript');
    return response.end('/* Inert external-script fixture: static HTML/CSS reflow only. */');
  }
  if (pathname === '/favicon.ico') {response.statusCode = 204; return response.end();}
  response.statusCode = 404; response.end('This fixture serves the delivered static HTML and CSS only.');
});
await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
const origin = 'http://127.0.0.1:' + server.address().port;
let browser;

async function measure(page, selector) {
  return page.evaluate(selector => {
    const heading = document.querySelector(selector), box = heading.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(heading);
    const ancestors = []; for (let node = heading; node; node = node.parentElement) {
      ancestors.push({tag: node.tagName, overflowX: getComputedStyle(node).overflowX});
    }
    return {width: innerWidth, scroll: document.documentElement.scrollWidth,
      rootFontSize: getComputedStyle(document.documentElement).fontSize,
      heading: {text: heading.textContent.trim(), font: getComputedStyle(heading).font,
        left: box.left, right: box.right, width: box.width, scroll: heading.scrollWidth,
        textRects: [...range.getClientRects()].map(rect => ({left: rect.left, right: rect.right, width: rect.width}))},
      ancestors};
  }, selector);
}

try {
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage']});
  for (const item of pages) for (const dimensions of [{width: 320, text: 100}, {width: 320, text: 200}, {width: 1280, text: 100}]) {
    const name = item.name + ': ' + dimensions.width + 'px viewport, ' + dimensions.text + '% root text';
    const context = await browser.newContext({viewport: {width: dimensions.width, height: 1000}, reducedMotion: 'reduce'});
    const page = await context.newPage(); page.on('pageerror', error => errors.push({test: name, message: error.message}));
    let observed;
    const screenshot = path.join(captures, item.name + '-' + dimensions.width + '-text' + dimensions.text + '.png');
    try {
      const response = await page.goto(origin + '/' + item.directory + '/index.html'); assert.equal(response.status(), 200);
      await page.evaluate(({text, name}) => {
        document.documentElement.style.fontSize = text + '%';
        if (name === 'audio') document.querySelector('details').open = true;
      }, {...dimensions, name: item.name});
      await page.evaluate(() => document.fonts.ready);
      observed = await measure(page, item.heading);
      await page.screenshot({path: screenshot, fullPage: true});
      assert.equal(observed.rootFontSize, dimensions.text === 200 ? '32px' : '16px');
      assert(observed.scroll <= observed.width + 1, JSON.stringify(observed));
      assert(observed.heading.textRects.length > 0);
      for (const rect of observed.heading.textRects) {
        assert(rect.left >= observed.heading.left - 1 && rect.right <= observed.heading.right + 1, JSON.stringify(observed));
      }
      assert(!observed.ancestors.some(node => ['hidden', 'clip'].includes(node.overflowX)), 'Reflow must not hide overflowing text.');
      checks.push({name, pass: true, observed, screenshot: path.relative(root, screenshot)}); console.log('PASS ' + name);
    } catch (error) {
      checks.push({name, pass: false, error: error.stack, observed, screenshot: path.relative(root, screenshot)});
      console.error('FAIL ' + name + ': ' + error.message);
    } finally {await context.close();}
  }
} finally {
  const browserVersion = browser?.version(); await browser?.close(); await new Promise(resolve => server.close(resolve));
  const report = {schema: 're.bow.static-reflow-browser-r32/1',
    passed: checks.filter(check => check.pass).length, failed: checks.filter(check => !check.pass).length + errors.length,
    browserVersion, checks, browserErrors: errors, scriptFixtures: [...scriptFixtures].sort(),
    inputs: [...sourceFiles, 'tests/browser-reflow-r32.mjs'].map(file => ({path: file,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')})),
    scope: 'Delivered audio/sprites HTML and CSS, unchanged native fonts, actual 100%/200% root text at 320px and ordinary 1280px viewport. External scripts are explicit inert fixtures; static headings only. Original R31 browser suites separately verify populated pages, media and interactions. No artwork fidelity or physical-device certification.'};
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({passed: report.passed, failed: report.failed, report: path.relative(root, output)}));
  if (report.failed) process.exitCode = 1;
}
