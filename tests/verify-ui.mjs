#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const json = file => JSON.parse(read(file));
const Data = json('data/roster.json');
const Package = json('package.json');
const version = Package.version;
const fighterCount = Data.fighters.length;
const moveCount = Data.counts?.loreMoves || fighterCount * 10;
const dossierCount = Data.counts?.stories || fighterCount;
const report = [];
function check(name, fn) {
  try { const detail = fn(); report.push({ name, pass: true, ...(detail ? { detail } : {}) }); console.log('PASS ' + name); }
  catch (error) { report.push({ name, pass: false, error: error.stack || String(error) }); console.log('FAIL ' + name + '\n' + error.message); }
}

const pages = {
  accueil: read('index.html'), bestiaire: read('codex.html'), operations: read('operations.html'),
  versus: read('modules/versus.html'), dossiers: read('modules/chronicles.html'), movesets: read('movesets.html')
};
const themeFile = `styles/bow-v${version.replace(/\./g, '')}.css`;
const themeName = path.basename(themeFile);
const theme = read(themeFile);
const engine = read('src/unified-engine-v060.js');
const codex = read('src/codex.js');
const operations = read('src/operations.js');
const gameMenu = read('src/game-menu-r20.js');
const menuTheme = read('styles/game-menu-r20.css');
const playerTheme = read('styles/player-shell-r20.css');
const movesets = read('src/movesets.js');
const section = id => pages.accueil.match(new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?<\\/section>`))?.[0] || '';
const hrefs = html => [...html.matchAll(/\bhref="([^"#][^"]*)"/g)].map(m => m[1]);
const toolPages = new Set(['dev.html','laboratory.html','catalog-laboratory.html','catalog-duel.html','catalog-encounter.html','coverage.html','directions.html','finishers.html','stages.html','sequences.html']);

check('Primary screens load the R20 game presentation and shared preferences', () => {
  assert.match(pages.accueil,/styles\/game-menu-r20\.css/);
  for (const [name, html] of Object.entries(pages)) {
    assert.match(html,/src\/interface-preferences-r20\.js/,name);
    if(name!=='accueil')assert.match(html,/styles\/player-shell-r20\.css/,name);
  }
  return { screens: Object.keys(pages).length, theme: 'R20 game menu and shared player shell' };
});
check('Main menu exposes six player entries without development routes or audit badges', () => {
  const home=section('homeView');
  assert.equal((home.match(/class="menu-item(?:[ "])/g)||[]).length,6);
  for(const label of ['JOUER','DOSSIERS','ENTRAÎNEMENT','ARCHIVES','OPTIONS','CRÉDITS'])assert(home.includes(label),label);
  for(const href of hrefs(pages.accueil))assert(!toolPages.has(new URL(href,'https://game.test/').pathname.slice(1)),href);
  assert.doesNotMatch(pages.accueil,/LORE AUDIT|BUILD \d|lore-seal|combat-audit-badge|PR\d+ · R\d+/);
  assert.doesNotMatch(pages.accueil,/<script[^>]+src="src\/hub\.js"/);
});
check('Seven game protocols and biological archives retain exact native routes', () => {
  assert.deepEqual(hrefs(section('modesView')),['modules/versus.html','operations.html?mode=arcade','operations.html?mode=survival','operations.html?mode=boss','operations.html?mode=apex','operations.html?mode=family','operations.html?mode=uroboros']);
  assert.deepEqual(hrefs(section('archivesView')),['codex.html','movesets.html','catalog.html']);
  assert.match(section('homeView'),/href="modules\/chronicles\.html"/);
  assert.match(section('homeView'),/href="modules\/versus\.html\?mode=training"/);
  assert.match(section('optionsView'),/href="saves\.html"/);
  return { protocols:7,archives:3 };
});
check('Bestiary preserves identified incarnations and their biological sources', () => {
  for(const id of ['catalogGrid','catalogSearch','catalogGame','catalogStatus','detailName','detailEpisode','detailFacts','detailSources'])assert(pages.bestiaire.includes(`id="${id}"`),id);
  for (const label of ['Agent biologique','Incarnation','Techniques','Actions de référence']) assert.match(codex, new RegExp(label, 'i'));
});
check('Technique dossier exposes traceability and adaptation boundaries', () => {
  for (const id of ['moveEvidence45','moveLore45','moveScope45','sourceList45','techLimit45']) assert.match(pages.versus, new RegExp(`id="${id}"`));
  for (const level of ['CANONIQUE','ANATOMIQUE','SIMULATION']) assert.match(engine, new RegExp(level));
});
check('Combat selection, pause and technique controls retain their engine mounts', () => {
  for(const id of ['launch','game','pauseBtn','resume43','techSelect45','techFight45'])assert(pages.versus.includes(`id="${id}"`),id);
  assert(pages.versus.includes('src/unified-engine-v060.js'));
  assert(pages.versus.includes('src/runtime-contract.js'));
});
check('Health presentation contains Resident Evil FINE, CAUTION and DANGER states', () => {
  for (const state of ['FINE','CAUTION','DANGER']) assert.match(engine, new RegExp(`label:'${state}'`));
  assert.match(theme, /run-health meter\{accent-color:var\(--bow-green\)/);
  for (const state of ['CAUTION','DANGER']) assert.match(theme, new RegExp(`data-state="${state}"`));
  assert.match(operations, /FINE|CAUTION|DANGER/);
  assert.match(pages.operations, /data-state="FINE"/);
});
check('Presentation styles are local and preserve keyboard focus and reduced-motion support', () => {
  for(const css of [theme,menuTheme,playerTheme])assert.doesNotMatch(css,/url\(\s*["']?https?:/i);
  assert.match(menuTheme,/:focus-visible/);
  assert.match(menuTheme,/prefers-reduced-motion|data-r20-motion/);
  assert.match(playerTheme,/:focus-visible/);
});
check('Moveset archive declares all traceability fields and commands', () => {
  for (const id of ['movesetRoster','movesetRows','movesetAgent','movesetResource','movesetPassive','movesetBoundary','movesetSources']) assert.match(pages.movesets, new RegExp(`id="${id}"`));
  for (const slot of ['light','heavy','low','throw','special','specialDown','specialForward','specialBack','super','utility']) assert.match(movesets, new RegExp(`['"]${slot}['"]`));
  assert.match(pages.movesets, new RegExp(String(moveCount)));
  assert.match(pages.movesets, /CANONIQUES/);
});
check('Dossiers preserve campaign selection, continuation and the real combat iframe', () => {
  for(const id of ['roster','beginBtn','resumeBtn','saveStatus','engine','storyTextMountR18'])assert(pages.dossiers.includes(`id="${id}"`),id);
  for(const script of ['chronicles-data-v060.js','chronicles-core-v060.js','chronicles-v060.js'])assert(pages.dossiers.includes(script),script);
  assert.equal(dossierCount,fighterCount);
});
check('All public pages retain a route back to the main containment menu', () => {
  for (const [name, html] of Object.entries(pages)) if (name !== 'accueil') assert.match(html, /(?:\.\.\/|)index\.html/, name);
});

const require = createRequire(import.meta.url);
const { loadGame } = require('./engine-vm.cjs');
try {
  const env = await loadGame(path.join(ROOT, 'movesets.html'));
  await env.images();
  assert.equal(env.imageErrors.length, 0);
  assert.equal(env.document.querySelectorAll('.moveset-entry').length, fighterCount);
  assert.equal(env.document.querySelectorAll('#movesetRows tr').length, 10);
  assert.equal(env.document.querySelector('#movesetTotal').textContent, String(moveCount));
  assert.equal(env.document.querySelector('#movesetName').textContent, 'NEMESIS — FORME 1, LANCE-ROQUETTES');
  report.push({ name: 'Moveset archive initializes every subject and ten rows from delivered data', pass: true, detail: { subjects: fighterCount, rows: 10, moves: moveCount } });
  console.log('PASS Moveset archive initializes every subject and ten rows from delivered data');
  env.dispose();
} catch (error) {
  report.push({ name: 'Moveset archive initializes every subject and ten rows from delivered data', pass: false, error: error.stack || String(error) });
  console.log('FAIL Moveset archive initializes every subject and ten rows from delivered data\n' + error.message);
}
check('Every menu route resolves to a shipped page; boot and options have explicit controls',()=>{
  for(const href of hrefs(pages.accueil)){
    const url=new URL(href,'https://game.test/');
    assert.equal(url.origin,'https://game.test');
    assert(fs.statSync(path.join(ROOT,url.pathname)).isFile(),href);
  }
  for(const id of ['enterProtocol','fullscreen','motionSetting','contrastSetting','textSetting','optionsStatus'])assert(pages.accueil.includes(`id="${id}"`),id);
  assert.match(gameMenu,/ctrlKey[\s\S]*shiftKey[\s\S]*KeyD/);
  return {runtimeValidation:'Dedicated R20 menu unit and browser suites'};
});

const failures = report.filter(x => !x.pass);
const payload = { version, pass: failures.length === 0, fighters: fighterCount, moves: moveCount, checks: report.length, failures: failures.length, report };
fs.writeFileSync(path.join(ROOT, 'tests/ui-results.json'), JSON.stringify(payload, null, 2) + '\n');
fs.writeFileSync(path.join(ROOT, 'docs/verification-ui.md'), [
  `# Vérification de l’interface Resident Evil — v${version}`,'',
  `- Résultat : **${payload.pass ? 'RÉUSSI' : 'ÉCHEC'}**`,
  `- Contrôles : **${payload.checks - payload.failures}/${payload.checks}**`,
  `- Portée : ${fighterCount} sujets, ${moveCount} techniques, menu R20, sept protocoles, archives, options, sources des incarnations et états FINE/CAUTION/DANGER.`,
  '- Portée technique : structure et routes réellement présentes, initialisation de l’Archive des movesets dans le DOM contrôlé. Interactions du menu R20 vérifiées séparément par les suites dédiées et le navigateur.','',
  ...report.map(item => `- ${item.pass ? '✅' : '❌'} ${item.name}`),''
].join('\n'));
if (failures.length) process.exitCode = 1;
else console.log(JSON.stringify({ pass: true, checks: report.length, fighters: fighterCount, moves: moveCount }, null, 2));
