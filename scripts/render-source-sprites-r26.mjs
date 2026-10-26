/** Render honest, derived inspection sheets from exact OBJ references; no combat asset assignment. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pack = path.join(root, 'modules/fidelity-r26/sprites');
const sourcePath = path.join(root, 'modules/fidelity-r26/visual/manifest.json');
const source = JSON.parse(fs.readFileSync(sourcePath));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const port = Number(process.env.BOW_SPRITES_R26_PORT || 5581), base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
let browser;
try {
  for (let n = 0; n < 100; n++) {try {if ((await fetch(base)).ok) break;} catch {} await new Promise(resolve => setTimeout(resolve, 50));}
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader']});
  const page = await browser.newPage();
  await page.goto(base + '/modules/fidelity-r26/sprites/index.html');
  fs.mkdirSync(path.join(pack, 'sheets'), {recursive: true});
  const entries = [];
  for (const entry of source.entries) {
    const result = await page.evaluate(async id => {
      const manifest = await fetch('../visual/manifest.json').then(r => r.json());
      const {renderSheet} = await import('./renderer.js');
      const result = await renderSheet(manifest.entries.find(entry => entry.id === id));
      return {bytes: [...new Uint8Array(await result.blob.arrayBuffer())], evidence: result.evidence};
    }, entry.id);
    const bytes = Buffer.from(result.bytes), target = 'sheets/' + entry.id + '.png';
    fs.writeFileSync(path.join(pack, target), bytes);
    entries.push({...result.evidence, subjectId: entry.subjectId || null, candidateUid: entry.candidateUid || null,
      label: entry.label, sourcePage: entry.sourcePage, sheet: {path: target, bytes: bytes.length, sha256: hash(bytes)}});
    console.log('RENDERED ' + entry.id + ' ' + bytes.length);
  }
  const manifest = {schema: 're.bow.source-pose-sheets/1', release: 'R26',
    classification: 'derived-source-pose-inspection-sheet', originalGameSprites: 0, combatReadySprites: 0,
    sourceManifest: {path: '../visual/manifest.json', sha256: hash(fs.readFileSync(sourcePath))},
    recipe: {path: 'renderer.js', sha256: hash(fs.readFileSync(path.join(pack, 'renderer.js')))},
    environment: {browser: await browser.version(), backend: 'headless Chromium / software SwiftShader in cloud', physicalDeviceCertified: false},
    counts: {sheets: entries.length, sourceModels: entries.length, orientationViews: entries.reduce((sum, entry) => sum + entry.views.length, 0), mirroredViews: 0, combatReadySprites: 0, originalGameSprites: 0},
    limits: ['Rendus dérivés des poses sources publiées, sans animation ni attribution automatique au combat.', 'Caméra orthographique et éclairage de cette recette ; rendu original du jeu non certifié.', 'Huit angles de caméra, sans miroir ni modification des coordonnées du modèle ; aucune face avant officielle déduite.', 'La plateforme cloud logicielle ne certifie aucun appareil physique.'], entries};
  fs.writeFileSync(path.join(pack, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify(manifest.counts));
} finally {await browser?.close(); server.kill();}
