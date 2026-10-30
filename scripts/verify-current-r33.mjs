#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const BASE_COMMIT='51044acfe1c2a5428a8de5e5b7ca188f4c69f53d';
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const R33_FILES=Object.freeze({
  'dev.html':'M',
  'scripts/verify-current-r32.mjs':'M',
  'modules/fidelity-r33/index.html':'A',
  'modules/fidelity-r33/style.css':'A',
  'modules/fidelity-r33/page.js':'A',
  'modules/fidelity-r33/native-renderer.js':'A',
  'modules/fidelity-r33/manifest.json':'A',
  'scripts/verify-current-r33.mjs':'A',
  'tests/verify-current-guard-r33.mjs':'A',
  'tests/browser-r33.mjs':'A',
  '.github/workflows/gamedev-r33.yml':'A',
  'docs/GAMEDEV_APPLIED_R33.md':'A',
});
const BASELINE_PATHS=Object.keys(R33_FILES).filter(file=>R33_FILES[file]==='M');

function replaceOnce(source,before,after,label){
 assert.equal(source.split(before).length-1,1,'Baseline anchor must occur once: '+label);
 return source.replace(before,after);
}
export function expectedDev(baseline){
 const anchor='      <a href="coverage.html?dev=1">Couverture et manquants<small>État de la production et frontières de fidélité.</small></a>\n';
 const addition='      <a href="modules/fidelity-r33/index.html?dev=1">R33 — sources et orientations<small>16 vues natives générables, orientation source et inventaire des 389 incarnations.</small></a>\n';
 return replaceOnce(baseline,anchor,addition+anchor,'R33 DEV access');
}
export function expectedR32Guard(baseline){
 const anchor="const BASELINE_PATHS = Object.keys(R32_FILES).filter(file => R32_FILES[file] === 'M');\n";
 const block=`const R33_OVERLAY_FILES = Object.freeze(new Set([
  'dev.html',
  'modules/fidelity-r33/index.html',
  'modules/fidelity-r33/style.css',
  'modules/fidelity-r33/page.js',
  'modules/fidelity-r33/native-renderer.js',
  'modules/fidelity-r33/manifest.json',
  'scripts/verify-current-r33.mjs',
  'tests/verify-current-guard-r33.mjs',
  'tests/browser-r33.mjs',
  '.github/workflows/gamedev-r33.yml',
  'docs/GAMEDEV_APPLIED_R33.md',
]));
export function isLaterReleasePath(file) { return R33_OVERLAY_FILES.has(file); }
`;
 let source=replaceOnce(baseline,anchor,anchor+block,'R33 overlay declaration in R32 guard');
 const before=`  const changes = [];
  for (let i = 0; i < fields.length; i += 2) changes.push({status: fields[i], file: fields[i + 1]});
  for (const file of git('ls-files', '--others', '--exclude-standard', '-z').split('\\0').filter(Boolean)) {
    changes.push({status: 'A', file});
  }
  // Check the entire Git delta before opening selected files. Ignored QA outputs
  // do not authorize changes to any tracked historical report.
  validateChangeList(changes);
`;
 const after=`  const allChanges = [];
  for (let i = 0; i < fields.length; i += 2) allChanges.push({status: fields[i], file: fields[i + 1]});
  for (const file of git('ls-files', '--others', '--exclude-standard', '-z').split('\\0').filter(Boolean)) {
    allChanges.push({status: 'A', file});
  }
  // R32 remains exact for its own release. R33 is validated by its separate guard;
  // only the explicit R33 overlay list is excluded here.
  const changes = allChanges.filter(change => !isLaterReleasePath(change.file));
  validateChangeList(changes);
`;
 return replaceOnce(source,before,after,'R33 filtering in R32 guard');
}
function validateManifest(raw){
 const manifest=JSON.parse(raw);
 assert.equal(manifest.schema,'re.bow.fidelity-r33/1');assert.equal(manifest.release,'R33');assert.equal(manifest.baseCommit,BASE_COMMIT);
 assert.equal(manifest.catalogueFidelityCertified,false);
 assert.deepEqual(manifest.counts,{identities:389,mainFighters:115,experimentalFighters:231,contextualEncounters:43,newNativeModelVariants:4,newNativeViews:16,newOriginalGameFrames:0,newGeneratedCombatPoses:0});
 assert.deepEqual(manifest.nativeViews.angles,[0,90,180,270]);assert.equal(manifest.nativeViews.cellSize,512);
 assert.equal(manifest.nativeViews.geometryMirrored,false);assert.equal(manifest.nativeViews.modelTransformsChanged,false);assert.equal(manifest.nativeViews.poseChanged,false);
 const ids=manifest.nativeViews.entries.map(entry=>entry.id);
 assert.deepEqual(ids,['re0-zombie-gc-r26-1','re0-zombie-gc-r26-2','reoutbreak-zombie-uss-b-ps2-r26','reoutbreak-zombie-uss-c-ps2-r26']);
 for(const entry of manifest.nativeViews.entries){
  assert(['re0-zombie','reoutbreak-zombie'].includes(entry.subjectId),entry.id);
  assert.equal(entry.format,'OBJ',entry.id);assert(entry.model.path.startsWith('modules/fidelity-r26/visual/models/'),entry.model.path);
  assert(entry.materials.path.startsWith('modules/fidelity-r26/visual/models/'),entry.materials.path);
  for(const source of [entry.model,entry.materials,...entry.textures]){
   assert(Number.isInteger(source.bytes)&&source.bytes>0,entry.id);assert.match(source.sha256,/^[a-f0-9]{64}$/);assert(source.path.startsWith('modules/fidelity-r26/visual/models/'));
  }
  assert.equal(entry.geometry.bones,0);assert.equal(entry.geometry.animationClips,0);
 }
 const left=manifest.exactSourceOrientation;
 assert.equal(left.subjectId,'re1r-zombie');assert.equal(left.facing,'left');assert.equal(left.mirrored,false);assert.equal(left.combatIdleCertified,false);
 assert.equal(left.image.path,'modules/fidelity-r31/sprites/sources/views/re1r-zombie-naked-gc-r31/source-90.png');
 assert.equal(left.image.sha256,'079c75e094ad3ee0c79445b30d6aa19f76878876a406ce901a31e58342910fda');
 const lucas=manifest.lucasFraming;
 assert.equal(lucas.subjectId,'re7-lucas-baker-mutated');assert.equal(lucas.output.sourcePixelsAltered,false);assert.equal(lucas.output.newAnatomyGenerated,false);
 assert.equal(lucas.source.path,'modules/fidelity-r31/sprites/generated/re7-lucas-baker-mutated/full-body.png');
 assert.equal(lucas.source.sha256,'c52ea3e524fed6230118d609bc8434f6e52790575c02892287acaff44e52d414');
 assert(manifest.limitations.some(value=>/1:1/.test(value)));return manifest;
}
export function validateChangeList(changes){
 const seen=new Set();
 for(const {status,file} of changes){
  assert(Object.hasOwn(R33_FILES,file),'Unreviewed R33 change: '+file);assert.equal(status,R33_FILES[file],'Unexpected R33 change kind: '+file);assert(!seen.has(file),'Duplicate R33 change: '+file);seen.add(file);
 }
 for(const file of Object.keys(R33_FILES))assert(seen.has(file),'Missing required R33 change: '+file);
}
export function validateSnapshot({baseline,current,changes}){
 validateChangeList(changes);
 for(const file of Object.keys(R33_FILES))assert.equal(typeof current.get(file),'string','Missing R33 source: '+file);
 assert.equal(current.get('dev.html'),expectedDev(baseline.get('dev.html')),'Only the reviewed R33 DEV link is permitted');
 assert.equal(current.get('scripts/verify-current-r32.mjs'),expectedR32Guard(baseline.get('scripts/verify-current-r32.mjs')),'R32 may exclude only the explicit R33 overlay list');
 validateManifest(current.get('modules/fidelity-r33/manifest.json'));
 const page=current.get('modules/fidelity-r33/page.js'),renderer=current.get('modules/fidelity-r33/native-renderer.js'),test=current.get('tests/browser-r33.mjs'),workflow=current.get('.github/workflows/gamedev-r33.yml'),doc=current.get('docs/GAMEDEV_APPLIED_R33.md');
 for(const token of ['389','renderNative','sourceLeft','lucasFrame','newAnatomyGenerated:false'])assert(page.includes(token),'R33 page missing reviewed boundary: '+token);
 for(const token of ['geometryMirrored:false','modelTransformsChanged:false','poseChanged:false','verifiedBytes'])assert(renderer.includes(token),'R33 renderer missing source-preservation boundary: '+token);
 for(const token of ['RE_FIDELITY_R33','nativeViews','sourceLeft','lucas','320','200'])assert(test.includes(token),'R33 browser recipe missing required coverage: '+token);
 assert(workflow.includes('node scripts/verify-current-r32.mjs'));assert(workflow.includes('node scripts/verify-current-r33.mjs'));assert(workflow.includes('node tests/browser-r33.mjs'));assert(!workflow.includes('continue-on-error: true'));
 assert(/non certifiée|non certifié|pas.*1:1|1:1.*ouvert/i.test(doc),'R33 documentation must keep fidelity limits explicit');
 for(const forbidden of ['src/combat-foundation-v060.js','src/catalog-replay-contract.js','data/roster.json','data/catalog-expansion-v070.json'])assert(!changes.some(change=>change.file===forbidden),'R33 cannot modify combat, replay or roster contracts');
 return{schema:'re.bow.current-scope-r33/1',base:BASE_COMMIT,modified:changes.filter(c=>c.status==='M').map(c=>c.file).sort(),added:changes.filter(c=>c.status==='A').map(c=>c.file).sort(),assertions:[
  'R33 is a bounded overlay on the successful R32 commit.',
  'Only DEV access and the R32 later-release filter modify existing files.',
  'Four exact R26 OBJ variants yield sixteen camera-only source renders; no geometry mirror, pose rewrite or new original-game frame is claimed.',
  'The GameCube zombie left view is an existing verified source render and is not promoted to an original combat idle.',
  'Lucas receives deterministic presentation padding only; no new anatomy is generated.',
  'Combat rules, roster data and replay contracts retain R32 bytes.'
 ],scope:'R33 source coverage and inspection tools only; global 1:1 fidelity remains unclaimed.'};
}
export function collectSnapshot(root=ROOT){
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});
 assert.equal(git('rev-parse','--verify',BASE_COMMIT+'^{commit}').trim(),BASE_COMMIT,'Fetch full history for the R33 base commit');
 const fields=git('diff','--name-status','--no-renames','-z',BASE_COMMIT,'--').split('\0').filter(Boolean);assert.equal(fields.length%2,0);
 const changes=[];for(let i=0;i<fields.length;i+=2)changes.push({status:fields[i],file:fields[i+1]});
 for(const file of git('ls-files','--others','--exclude-standard','-z').split('\0').filter(Boolean))changes.push({status:'A',file});
 validateChangeList(changes);
 const baseline=new Map(BASELINE_PATHS.map(file=>[file,git('show',BASE_COMMIT+':'+file)])),current=new Map();
 for(const file of Object.keys(R33_FILES)){const absolute=path.join(root,file);assert(fs.existsSync(absolute)&&fs.lstatSync(absolute).isFile(),'Missing regular R33 file: '+file);current.set(file,fs.readFileSync(absolute,'utf8'));}
 return{baseline,current,changes};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const report=validateSnapshot(collectSnapshot()),output=path.join(ROOT,'qa-gamedev-r33/current-scope.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
 catch(error){console.error('FAIL R33 current source check: '+error.message);process.exitCode=1;}
}
