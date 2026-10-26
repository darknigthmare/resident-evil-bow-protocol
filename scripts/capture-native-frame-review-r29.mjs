/** Capture four native sample instants per scene for an explicit visual review. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), output = path.join(root, 'docs/R29_NATIVE_FRAME_REVIEW'); fs.mkdirSync(output, {recursive: true});
const manifestPath = path.join(root, 'modules/fidelity-r29/motion/manifest.json'), manifest = JSON.parse(fs.readFileSync(manifestPath));
const sha = raw => crypto.createHash('sha256').update(raw).digest('hex'), samples = [0, 5, 10, 15];
const port = Number(process.env.BOW_NATIVE_REVIEW_R29_PORT || 5788), base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
let browser; const sheets = [];
try {
  for (let n = 0; n < 80; n++) {try {if ((await fetch(base)).ok) break;} catch {} await new Promise(resolve => setTimeout(resolve, 75));}
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
  const page = await browser.newPage({viewport: {width: 1040, height: 1000}});
  for (let start = 0; start < manifest.entries.length; start += 4) {
    const entries = manifest.entries.slice(start, start + 4), records = entries.map(entry => ({id: entry.id, subjectId: entry.subjectId, frames: samples.map(index => ({index, ...entry.frames[index]}))}));
    await page.setContent('<!doctype html><html><head><meta charset="utf-8"><style>body{font:16px system-ui;background:#18241f;color:#edf5ed;margin:18px;width:1000px}section{margin:16px 0;border:1px solid #8cae9b;padding:10px}h2{font-size:16px;overflow-wrap:anywhere}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}figure{margin:0;background:repeating-conic-gradient(#3d5147 0% 25%,#253a30 0% 50%)50%/24px 24px}img{display:block;width:220px;height:220px;object-fit:contain}figcaption{background:#132019;padding:5px;font:13px system-ui}</style></head><body><h1>R29 · instants sources natifs</h1><p>Caméra fixe ; BA/DM/UZ non interprétés en actions. Quatre observations par scène, aucune validation de cycle de combat.</p><main></main></body></html>');
    await page.evaluate(({records, base}) => {
      for (const record of records) {
        const section = document.createElement('section'), heading = document.createElement('h2'), grid = document.createElement('div'); grid.className = 'grid'; heading.textContent = record.id; section.append(heading, grid);
        for (const frame of record.frames) {const figure = document.createElement('figure'), image = document.createElement('img'), caption = document.createElement('figcaption'); image.src = base + '/modules/fidelity-r29/motion/' + frame.path; caption.textContent = 'n°' + frame.index + ' · ' + frame.seconds.toFixed(4) + ' s'; figure.append(image, caption); grid.append(figure);}
        document.querySelector('main').append(section);
      }
    }, {records, base});
    await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    const name = 'contact-' + String(start / 4 + 1).padStart(2, '0') + '.png', target = path.join(output, name);
    await page.screenshot({path: target, fullPage: true}); sheets.push({path: 'docs/R29_NATIVE_FRAME_REVIEW/' + name, bytes: fs.statSync(target).size, sha256: sha(fs.readFileSync(target)), records});
  }
  fs.writeFileSync(path.join(output, 'index.json'), JSON.stringify({schema: 're.bow.native-frame-visual-review-r29/1', manifest: {path: 'modules/fidelity-r29/motion/manifest.json', sha256: sha(fs.readFileSync(manifestPath))}, sampleIndices: samples, sampledNativeFrames: sheets.reduce((sum, sheet) => sum + sheet.records.reduce((sum, record) => sum + record.frames.length, 0), 0), sourceScenes: manifest.entries.length, sheets, actionAssignments: 0, completeCombatCyclesCertified: 0, reviewStatus: 'capture-only-see-separate-observations.json'}, null, 2) + '\n');
  console.log(JSON.stringify({sheets: sheets.length, nativeFrameSamples: 96}));
} finally {await browser?.close(); server.kill('SIGTERM');}
