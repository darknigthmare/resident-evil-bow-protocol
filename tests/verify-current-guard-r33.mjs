import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {BASE_COMMIT,ROOT,R33_FILES,collectSnapshot,validateSnapshot} from '../scripts/verify-current-r33.mjs';

const clone=snapshot=>({baseline:new Map(snapshot.baseline),current:new Map(snapshot.current),changes:snapshot.changes.map(change=>({...change}))});
export function runGuardCases(snapshot,{writeReport=true,origin='supplied in-memory snapshot'}={}){
 const cases=[];
 function test(name,run){try{run();cases.push({name,pass:true});console.log('PASS '+name);}catch(error){cases.push({name,pass:false,error:error.message});console.error('FAIL '+name+': '+error.message);}}
 function rejected(name,mutate,pattern){test(name,()=>{const fixture=clone(snapshot);mutate(fixture);assert.throws(()=>validateSnapshot(fixture),pattern);});}
 function remove(file){return fixture=>{fixture.changes=fixture.changes.filter(change=>change.file!==file);fixture.current.delete(file);};}
 function manifest(fixture,change){const value=JSON.parse(fixture.current.get('modules/fidelity-r33/manifest.json'));change(value);fixture.current.set('modules/fidelity-r33/manifest.json',JSON.stringify(value));}
 test('The exact reviewed R33 overlay is accepted',()=>{const report=validateSnapshot(snapshot);assert.equal(report.base,BASE_COMMIT);assert.equal(report.modified.length,2);assert.equal(report.added.length,10);});
 rejected('An unrelated engine change is refused',fixture=>fixture.changes.push({status:'M',file:'src/unified-engine-v060.js'}),/Unreviewed R33 change/);
 rejected('Roster bytes cannot change in R33',fixture=>fixture.changes.push({status:'M',file:'data/roster.json'}),/Unreviewed R33 change/);
 rejected('Annex bytes cannot change in R33',fixture=>fixture.changes.push({status:'M',file:'data/catalog-expansion-v070.json'}),/Unreviewed R33 change/);
 rejected('Replay contracts cannot change in R33',fixture=>fixture.changes.push({status:'M',file:'src/catalog-replay-contract.js'}),/Unreviewed R33 change/);
 rejected('Package commands cannot change under this source-only overlay',fixture=>fixture.changes.push({status:'M',file:'package.json'}),/Unreviewed R33 change/);
 rejected('The DEV entry point is mandatory',remove('dev.html'),/Missing required R33 change/);
 rejected('The R33 workbench HTML is mandatory',remove('modules/fidelity-r33/index.html'),/Missing required R33 change/);
 rejected('The R33 responsive stylesheet is mandatory',remove('modules/fidelity-r33/style.css'),/Missing required R33 change/);
 rejected('The R33 workbench controller is mandatory',remove('modules/fidelity-r33/page.js'),/Missing required R33 change/);
 rejected('The source-preserving native renderer is mandatory',remove('modules/fidelity-r33/native-renderer.js'),/Missing required R33 change/);
 rejected('The R33 manifest is mandatory',remove('modules/fidelity-r33/manifest.json'),/Missing required R33 change/);
 rejected('The R33 source guard is mandatory',remove('scripts/verify-current-r33.mjs'),/Missing required R33 change/);
 rejected('The R33 guard fault tests are mandatory',remove('tests/verify-current-guard-r33.mjs'),/Missing required R33 change/);
 rejected('The R33 browser recipe is mandatory',remove('tests/browser-r33.mjs'),/Missing required R33 change/);
 rejected('The R33 blocking workflow is mandatory',remove('.github/workflows/gamedev-r33.yml'),/Missing required R33 change/);
 rejected('The R33 delivery note is mandatory',remove('docs/GAMEDEV_APPLIED_R33.md'),/Missing required R33 change/);
 rejected('DEV cannot hide unrelated markup inside its approved file',fixture=>fixture.current.set('dev.html',fixture.current.get('dev.html')+'\n<div>unreviewed</div>\n'),/Only the reviewed R33 DEV link/);
 rejected('R32 cannot ignore an undeclared later-release path',fixture=>fixture.current.set('scripts/verify-current-r32.mjs',fixture.current.get('scripts/verify-current-r32.mjs').replace("'docs/GAMEDEV_APPLIED_R33.md',","'docs/GAMEDEV_APPLIED_R33.md',\n  'src/unified-engine-v060.js',")),/R32 may exclude only/);
 rejected('The identity inventory count cannot be inflated',fixture=>manifest(fixture,m=>m.counts.identities=390),/deepStrictEqual|Expected values/);
 rejected('The main roster count remains115',fixture=>manifest(fixture,m=>m.counts.mainFighters=116),/deepStrictEqual|Expected values/);
 rejected('The isolated prototype count remains231',fixture=>manifest(fixture,m=>m.counts.experimentalFighters=230),/deepStrictEqual|Expected values/);
 rejected('The contextual encounter count remains43',fixture=>manifest(fixture,m=>m.counts.contextualEncounters=42),/deepStrictEqual|Expected values/);
 rejected('Exactly four new native model variants are declared',fixture=>manifest(fixture,m=>m.counts.newNativeModelVariants=5),/deepStrictEqual|Expected values/);
 rejected('Exactly sixteen native views are declared',fixture=>manifest(fixture,m=>m.counts.newNativeViews=12),/deepStrictEqual|Expected values/);
 rejected('R33 cannot claim a new original-game frame',fixture=>manifest(fixture,m=>m.counts.newOriginalGameFrames=1),/deepStrictEqual|Expected values/);
 rejected('R33 cannot claim a generated combat pose',fixture=>manifest(fixture,m=>m.counts.newGeneratedCombatPoses=1),/deepStrictEqual|Expected values/);
 rejected('All four camera angles are mandatory',fixture=>manifest(fixture,m=>m.nativeViews.angles=[0,90,180]),/deepStrictEqual|Expected values/);
 rejected('The reviewed native render size remains512',fixture=>manifest(fixture,m=>m.nativeViews.cellSize=768),/strictEqual|Expected values/);
 rejected('Geometry mirroring cannot be introduced',fixture=>manifest(fixture,m=>m.nativeViews.geometryMirrored=true),/strictEqual|Expected values/);
 rejected('Native source poses cannot be rewritten',fixture=>manifest(fixture,m=>m.nativeViews.poseChanged=true),/strictEqual|Expected values/);
 rejected('Native model transforms cannot be rewritten',fixture=>manifest(fixture,m=>m.nativeViews.modelTransformsChanged=true),/strictEqual|Expected values/);
 rejected('The exact left source view cannot be labelled mirrored',fixture=>manifest(fixture,m=>m.exactSourceOrientation.mirrored=true),/strictEqual|Expected values/);
 rejected('A static source view cannot become a certified combat idle',fixture=>manifest(fixture,m=>m.exactSourceOrientation.combatIdleCertified=true),/strictEqual|Expected values/);
 rejected('The exact left source view path is fixed',fixture=>manifest(fixture,m=>m.exactSourceOrientation.image.path='modules/fidelity-r31/sprites/sources/views/re1r-zombie-naked-gc-r31/source-270.png'),/strictEqual|Expected values/);
 rejected('Lucas R33 cannot generate new anatomy',fixture=>manifest(fixture,m=>m.lucasFraming.output.newAnatomyGenerated=true),/strictEqual|Expected values/);
 rejected('Lucas R33 cannot repaint source pixels',fixture=>manifest(fixture,m=>m.lucasFraming.output.sourcePixelsAltered=true),/strictEqual|Expected values/);
 rejected('Native R33 models must remain inside the verified R26 source tree',fixture=>manifest(fixture,m=>m.nativeViews.entries[0].model.path='assets/unreviewed.obj'),/unreviewed\.obj/);
 rejected('Native source hashes remain mandatory',fixture=>manifest(fixture,m=>m.nativeViews.entries[0].model.sha256='0'.repeat(63)),/pattern|match|64|Expected/);
 rejected('The workflow cannot skip the current R32 boundary',fixture=>fixture.current.set('.github/workflows/gamedev-r33.yml',fixture.current.get('.github/workflows/gamedev-r33.yml').replace('node scripts/verify-current-r32.mjs','echo skipped-r32')),/workflow|includes|false|Expected/);
 rejected('The R33 browser check cannot be made nonblocking',fixture=>fixture.current.set('.github/workflows/gamedev-r33.yml',fixture.current.get('.github/workflows/gamedev-r33.yml').replace('        run: node tests/browser-r33.mjs','        continue-on-error: true\n        run: node tests/browser-r33.mjs')),/workflow|false|Expected/);
 const report={schema:'re.bow.current-guard-tests-r33/1',base:BASE_COMMIT,input:origin,passed:cases.filter(c=>c.pass).length,failed:cases.filter(c=>!c.pass).length,cases,scope:'R33 overlay fault injection only. No source asset or historical report is rewritten by these tests.'};
 if(writeReport){const output=path.join(ROOT,'qa-gamedev-r33/current-guard.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify({suite:'r33-current-guard',passed:report.passed,failed:report.failed}));
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const report=runGuardCases(collectSnapshot(),{origin:'actual Git worktree compared with successful R32 head'});if(report.failed)process.exitCode=1;}
