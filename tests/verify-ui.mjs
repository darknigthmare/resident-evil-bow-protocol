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
const hub = read('src/hub.js');
const movesets = read('src/movesets.js');
const incidentIds = ['re7-jack-baker-mutated','re7-jack-baker-swamp-man','re7-marguerite-baker-mutated','re7-lucas-baker-mutated','re7-eveline-final','re7-fumer'];
const familyIds = ['re7-mia-winters-infected','re7-jack-baker','re7-jack-baker-scissor','re7-marguerite-baker','re7-lucas-baker','re7-eveline'];
const apexIds = ['re2r-super-tyrant','re3r-stage-2-nemesis','re3r-stage-3-nemesis','re4r-del-lago','re4r-garrador','re4r-iron-maiden','re4r-ramon-salazar-mutated','re4r-osmund-saddler-mutated','revillage-mutated-dimitrescu','revillage-mutated-moreau','revillage-mutated-heisenberg','re6-ustanak'];

check('Every primary screen loads the current containment theme', () => {
  for (const [name, html] of Object.entries(pages)) assert.match(html, new RegExp(themeName.replace('.', '\\.')), name);
  return { screens: Object.keys(pages).length, theme: themeName };
});
check('Home screen exposes the exact audited scope and current build', () => {
  assert.match(pages.accueil, new RegExp(`${fighterCount}/${fighterCount}`));
  assert.match(pages.accueil, new RegExp(`BUILD ${version.replaceAll('.', '\\.')}`));
  assert.match(pages.accueil, /id="moveCount"/);
  assert.match(pages.accueil, /INCARNATIONS CLOISONNÉES/);
  assert.match(pages.accueil, /INCIDENT BAKER/);
  assert.match(pages.accueil, /id="incidentGrid"/);
  assert.match(pages.accueil, /APEX MUTATION/);
  assert.match(pages.accueil, /id="apexGrid"/);
});
check('Home runtime fills public counters, Incident Baker, Apex Mutation and E-001 Family cards', () => {
  for (const id of ['fighterCount','arenaCount','catalogCount','moveCount','incidentGrid','apexGrid','familyGrid']) assert.match(hub, new RegExp(id));
  for (const uid of [...incidentIds,...apexIds,...familyIds]) assert.match(hub, new RegExp(uid));
  assert.match(hub, /loreMoves|fighters\.reduce/);
  return { incidentSubjects: incidentIds.length, apexSubjects: apexIds.length };
});
check('Bestiary communicates full-body status and the audited ten-move contract', () => {
  assert.match(pages.bestiaire, /RENDU EN PIED \+ MOVESET 10\/10 AUDITÉ/);
  assert.match(codex, /MOVESET 10 (?:SUR|\/) 10 AUDITÉ/i);
  for (const label of ['Agent biologique','Incarnation','Techniques','Actions de référence']) assert.match(codex, new RegExp(label, 'i'));
});
check('Technique dossier exposes traceability and adaptation boundaries', () => {
  for (const id of ['moveEvidence45','moveLore45','moveScope45','sourceList45','techLimit45']) assert.match(pages.versus, new RegExp(`id="${id}"`));
  assert.match(pages.versus, /TRACABILITÉ LORE, SOURCES ET FRONTIÈRE DE SIMULATION/);
  for (const level of ['CANONIQUE','ANATOMIQUE','SIMULATION']) assert.match(engine, new RegExp(level));
});
check('Combat release identifies the current audited build', () => {
  assert.match(engine, new RegExp(`RE ${version.replaceAll('.', '\\.')} E-001 FAMILY PROTOCOL / CQC 0\\.60`));
  assert.match(engine, /PROFIL AUDITÉ · 10 TECHNIQUES/);
  assert.match(engine, /OUVRIR LE MOVESET 10\/10/);
});
check('Health presentation contains Resident Evil FINE, CAUTION and DANGER states', () => {
  for (const state of ['FINE','CAUTION','DANGER']) assert.match(engine, new RegExp(`label:'${state}'`));
  assert.match(theme, /run-health meter\{accent-color:var\(--bow-green\)/);
  for (const state of ['CAUTION','DANGER']) assert.match(theme, new RegExp(`data-state="${state}"`));
  assert.match(operations, /FINE|CAUTION|DANGER/);
  assert.match(pages.operations, /data-state="FINE"/);
});
check('Theme contains the containment visual language without remote assets', () => {
  for (const token of ['--bow-red','--bow-green','--bow-amber','lore-seal','combat-audit-badge','repeating-linear-gradient','box-shadow:inset 0 0 180px','incident-baker','apex-mutation','apex-grid','e001-family','e001-grid']) assert(theme.includes(token), token);
  assert.doesNotMatch(theme, /url\(\s*["']?https?:/i);
});
check('Moveset archive declares all traceability fields and commands', () => {
  for (const id of ['movesetRoster','movesetRows','movesetAgent','movesetResource','movesetPassive','movesetBoundary','movesetSources']) assert.match(pages.movesets, new RegExp(`id="${id}"`));
  for (const slot of ['light','heavy','low','throw','special','specialDown','specialForward','specialBack','super','utility']) assert.match(movesets, new RegExp(`['"]${slot}['"]`));
  assert.match(pages.movesets, new RegExp(String(moveCount)));
  assert.match(pages.movesets, /CANONIQUES/);
});
check('Dossiers identify the full dynamic campaign scope', () => {
  assert.match(pages.dossiers, new RegExp(`${dossierCount} DOSSIERS · ${moveCount} TECHNIQUES`));
  assert.match(pages.dossiers, /8 DUELS · RAPPORT DE CONFINEMENT/);
  assert.match(pages.dossiers, new RegExp(`${fighterCount} INCARNATIONS CLOISONNÉES`));
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
try {
  const env = await loadGame(path.join(ROOT, 'index.html'));
  await env.images();
  assert.equal(env.imageErrors.length, 0);
  assert.equal(env.document.querySelector('#fighterCount').textContent, String(fighterCount));
  assert.equal(env.document.querySelector('#moveCount').textContent, String(moveCount));
  assert.equal(env.document.querySelectorAll('.incident-card').length, incidentIds.length);
  assert.equal(env.document.querySelectorAll('.apex-card').length, apexIds.length);assert.equal(env.document.querySelectorAll('.e001-card').length, familyIds.length);
  assert.match(env.document.querySelector('#heroName').textContent, /EVELINE/);
  report.push({ name: 'Home screen initializes Incident Baker, Apex Mutation and the six-subject E-001 Family panel', pass: true, detail: { subjects: fighterCount, incidentCards: incidentIds.length, apexCards: apexIds.length } });
  console.log('PASS Home screen initializes Incident Baker, Apex Mutation and the six-subject E-001 Family panel');
  env.dispose();
} catch (error) {
  report.push({ name: 'Home screen initializes Incident Baker, Apex Mutation and the six-subject E-001 Family panel', pass: false, error: error.stack || String(error) });
  console.log('FAIL Home screen initializes Incident Baker, Apex Mutation and the six-subject E-001 Family panel\n' + error.message);
}

const failures = report.filter(x => !x.pass);
const payload = { version, pass: failures.length === 0, fighters: fighterCount, moves: moveCount, checks: report.length, failures: failures.length, report };
fs.writeFileSync(path.join(ROOT, 'tests/ui-results.json'), JSON.stringify(payload, null, 2) + '\n');
fs.writeFileSync(path.join(ROOT, 'docs/verification-ui.md'), [
  `# Vérification de l’interface Resident Evil — v${version}`,'',
  `- Résultat : **${payload.pass ? 'RÉUSSI' : 'ÉCHEC'}**`,
  `- Contrôles : **${payload.checks - payload.failures}/${payload.checks}**`,
  `- Portée : ${fighterCount} sujets, ${moveCount} techniques, thème ${themeName}, compteurs publics, Incident Baker, Apex Mutation, traçabilité lore, états FINE/CAUTION/DANGER et navigation.`,
  '- Portée technique : contrôle structurel et initialisation réelle de l’accueil et de l’Archive des movesets dans le DOM contrôlé. Le rendu CSS pixel par pixel et les résolutions physiques ne sont pas revendiqués.','',
  ...report.map(item => `- ${item.pass ? '✅' : '❌'} ${item.name}`),''
].join('\n'));
if (failures.length) process.exitCode = 1;
else console.log(JSON.stringify({ pass: true, checks: report.length, fighters: fighterCount, moves: moveCount }, null, 2));
