#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const report = [];
function check(name, fn) {
  try { const detail = fn(); report.push({ name, pass: true, ...(detail ? { detail } : {}) }); console.log('PASS ' + name); }
  catch (error) { report.push({ name, pass: false, error: error.stack || String(error) }); console.log('FAIL ' + name + '\n' + error.message); }
}
const pages = { accueil: read('index.html'), bestiaire: read('codex.html'), operations: read('operations.html'), versus: read('modules/versus.html'), dossiers: read('modules/chronicles.html'), movesets: read('movesets.html') };
const theme = read('styles/bow-v020.css'), engine = read('src/unified-engine-v060.js'), codex = read('src/codex.js'), operations = read('src/operations.js'), hub = read('src/hub.js'), movesets = read('src/movesets.js');

check('Every primary screen loads the B.O.W. 0.2 containment theme', () => { for (const [name, html] of Object.entries(pages)) assert.match(html, /bow-v020\.css/, name); return { screens: Object.keys(pages).length }; });
check('Home screen exposes the exact audited scope and build', () => { assert.match(pages.accueil, /75\/75/); assert.match(pages.accueil, /BUILD 0\.2\.0/); assert.match(pages.accueil, /id="moveCount"/); assert.match(pages.accueil, /INCARNATIONS CLOISONNÉES/); });
check('Home runtime fills all four public counters', () => { for (const id of ['fighterCount','arenaCount','catalogCount','moveCount']) assert.match(hub, new RegExp(id)); assert.match(hub, /loreMoves|fighters\.length\s*\*\s*10/); });
check('Bestiary communicates full-body status and the 10/10 audited moveset', () => { assert.match(pages.bestiaire, /RENDU EN PIED \+ MOVESET 10\/10 AUDITÉ/); assert.match(codex, /MOVESET 10 (?:SUR|\/) 10 AUDITÉ/i); for (const label of ['Agent biologique','Incarnation','Techniques','Actions de référence']) assert.match(codex, new RegExp(label, 'i')); });
check('Technique dossier exposes traceability and adaptation boundaries', () => { for (const id of ['moveEvidence45','moveLore45','moveScope45','sourceList45','techLimit45']) assert.match(pages.versus, new RegExp(`id="${id}"`)); assert.match(pages.versus, /TRACABILITÉ LORE, SOURCES ET FRONTIÈRE DE SIMULATION/); for (const level of ['CANONIQUE','ANATOMIQUE','SIMULATION']) assert.match(engine, new RegExp(level)); });
check('Combat release identifies the lore-audited 0.2.0 build', () => { assert.match(engine, /RE 0\.2\.0 LORE AUDIT \/ CQC 0\.60/); assert.match(engine, /PROFIL AUDITÉ · 10 TECHNIQUES/); assert.match(engine, /OUVRIR LE MOVESET 10\/10/); });
check('Health presentation contains Resident Evil FINE, CAUTION and DANGER states', () => { for (const state of ['FINE','CAUTION','DANGER']) assert.match(engine, new RegExp(`label:'${state}'`)); assert.match(theme, /run-health meter\{accent-color:var\(--bow-green\)/); for (const state of ['CAUTION','DANGER']) assert.match(theme, new RegExp(`data-state="${state}"`)); assert.match(operations, /FINE|CAUTION|DANGER/); assert.match(pages.operations, /data-state="FINE"/); });
check('Theme contains the containment visual language without external assets', () => { for (const token of ['--bow-red','--bow-green','--bow-amber','lore-seal','combat-audit-badge','repeating-linear-gradient','box-shadow:inset 0 0 180px']) assert(theme.includes(token), token); assert.doesNotMatch(theme, /url\(\s*["']?https?:/i); });
check('Moveset archive declares all traceability fields and commands', () => { for (const id of ['movesetRoster','movesetRows','movesetAgent','movesetResource','movesetPassive','movesetBoundary','movesetSources']) assert.match(pages.movesets, new RegExp(`id="${id}"`)); for (const slot of ['light','heavy','low','throw','special','specialDown','specialForward','specialBack','super','utility']) assert.match(movesets, new RegExp(`['"]${slot}['"]`)); assert.match(pages.movesets, /750/); assert.match(pages.movesets, /CANONIQUES/); });
check('Dossiers identify the full 75-subject, 750-technique campaign scope', () => { assert.match(pages.dossiers, /75 DOSSIERS · 750 TECHNIQUES/); assert.match(pages.dossiers, /8 DUELS · RAPPORT DE CONFINEMENT/); });
check('All public pages retain a route back to the main containment menu', () => { for (const [name, html] of Object.entries(pages)) if (name !== 'accueil') assert.match(html, /(?:\.\.\/|)index\.html/, name); });

const require = createRequire(import.meta.url); const { loadGame } = require('./engine-vm.cjs');
try { const env = await loadGame(path.join(ROOT, 'movesets.html')); await env.images(); assert.equal(env.imageErrors.length, 0); assert.equal(env.document.querySelectorAll('.moveset-entry').length, 75); assert.equal(env.document.querySelectorAll('#movesetRows tr').length, 10); assert.equal(env.document.querySelector('#movesetTotal').textContent, '750'); assert.equal(env.document.querySelector('#movesetName').textContent, 'NEMESIS — FORME 1, LANCE-ROQUETTES'); report.push({ name: 'Moveset archive initializes 75 subjects and ten rows from delivered data', pass: true, detail: { subjects: 75, rows: 10 } }); console.log('PASS Moveset archive initializes 75 subjects and ten rows from delivered data'); env.dispose(); }
catch (error) { report.push({ name: 'Moveset archive initializes 75 subjects and ten rows from delivered data', pass: false, error: error.stack || String(error) }); console.log('FAIL Moveset archive initializes 75 subjects and ten rows from delivered data\n' + error.message); }
const failures = report.filter(x => !x.pass);
const payload = { version: '0.2.0', pass: failures.length === 0, checks: report.length, failures: failures.length, report };
fs.writeFileSync(path.join(ROOT, 'tests/ui-results.json'), JSON.stringify(payload, null, 2) + '\n');
fs.writeFileSync(path.join(ROOT, 'docs/verification-ui.md'), ['# Vérification de l’interface Resident Evil — v0.2.0','',`- Résultat : **${payload.pass ? 'RÉUSSI' : 'ÉCHEC'}**`,`- Contrôles : **${payload.checks - payload.failures}/${payload.checks}**`,'- Portée : liens de thème, compteurs publics, traçabilité lore des techniques, états FINE/CAUTION/DANGER, navigation et périmètre des Dossiers.','- Portée technique : contrôle structurel et initialisation réelle de l’Archive des movesets dans le DOM contrôlé. Le rendu CSS pixel par pixel et les résolutions physiques ne sont pas revendiqués.','',...report.map(item => `- ${item.pass ? '✅' : '❌'} ${item.name}`),''].join('\n'));
if (failures.length) process.exitCode = 1; else console.log(JSON.stringify({ pass: true, checks: report.length }, null, 2));
