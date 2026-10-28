/** Listening-note imports cannot promote sources, redirect audio or certify a game action. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateManifest,validateNotes,documentFor} from '../modules/fidelity-r31/audio/review-format.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),manifestPath='modules/fidelity-r31/audio/manifest.json';
const raw=fs.readFileSync(path.join(root,manifestPath)),manifest=JSON.parse(raw),sha=value=>createHash('sha256').update(value).digest('hex'),hash=sha(raw);
const clip=manifest.entries[0],checks=[];
function note(changes={}){return{clipId:clip.clipId,sourceSha256:clip.sha256,candidateIdentityId:clip.candidateIdentityIds[0],heard:true,speaker:'Hypothèse personnelle',phase:'À vérifier',action:'Observation personnelle',note:'Séquence originale à retrouver',...changes};}
function doc(notes=[note()],changes={}){return{schema:'re.bow.audio-listening-notes-r31/1',manifestSha256:hash,notes,canonicalFidelityCertified:false,combatAudioAssigned:false,...changes};}
function test(name,run){try{const evidence=run();checks.push({name,pass:true,evidence});console.log('PASS '+name);}catch(error){checks.push({name,pass:false,error:error.stack});console.error('FAIL '+name+': '+error.message);}}
test('Actual published library passes without gaining an exact target or action claim',()=>{
 assert.equal(validateManifest(manifest),manifest);assert.equal(manifest.entries.length,218);assert.equal(manifest.identities.length,7);
 assert(manifest.entries.every(row=>row.identityId===null&&row.action===null&&row.phase===null&&!row.combatAudioAssigned));return{publishedClips:218,candidateIdentities:7};
});
test('Portable personal notes round-trip while their source assignment stays uncertified',()=>{
 const exported=documentFor([note()],manifest,hash),reloaded=validateNotes(JSON.parse(JSON.stringify(exported)),manifest,hash);
 assert.deepEqual(reloaded,[note()]);assert.equal(exported.canonicalFidelityCertified,false);assert.equal(exported.combatAudioAssigned,false);
 assert.equal(manifest.entries[0].action,null);return{userReportedNotes:1,sourceActionWritten:false};
});
test('Wrong manifest revision and wrong clip bytes are rejected',()=>{
 assert.throws(()=>validateNotes(doc(undefined,{manifestSha256:'0'.repeat(64)}),manifest,hash));
 assert.throws(()=>validateNotes(doc([note({sourceSha256:'0'.repeat(64)})]),manifest,hash));return{independentSourceBindings:2};
});
test('Unknown clips, unrelated incarnations and duplicate notes cannot enter an import',()=>{
 assert.throws(()=>validateNotes(doc([note({clipId:'0'.repeat(24)})]),manifest,hash));
 assert.throws(()=>validateNotes(doc([note({candidateIdentityId:'re7-jack-baker'})]),manifest,hash));
 assert.throws(()=>validateNotes(doc([note(),note()]),manifest,hash));return{rejectedCases:3};
});
test('An import cannot claim certification, combat assignment or add executable fields',()=>{
 assert.throws(()=>validateNotes(doc(undefined,{canonicalFidelityCertified:true}),manifest,hash));
 assert.throws(()=>validateNotes(doc(undefined,{combatAudioAssigned:true}),manifest,hash));
 assert.throws(()=>validateNotes(doc([note({html:'<img src=x>'})]),manifest,hash));return{promotionAndExtraFieldsRejected:3};
});
test('Script-like listening text remains plain data with strict field length bounds',()=>{
 const text='<img src=x onerror="alert(1)">',valid=validateNotes(doc([note({note:text})]),manifest,hash);
 assert.equal(valid[0].note,text);assert.throws(()=>validateNotes(doc([note({speaker:'a'.repeat(161)})]),manifest,hash));
 assert.throws(()=>validateNotes(doc([note({note:'a'.repeat(2001)})]),manifest,hash));return{inertTextPreserved:true};
});
test('Unsafe audio paths and external publisher links fail before any audio request',()=>{
 for(const changes of [{path:'https://untrusted.example/voice.wav'},{path:'modules/fidelity-r31/audio/clips/../voice.wav'},
  {action:'attack'},{targetEditionEquivalenceVerified:true},{combatAudioAssigned:true}]){
  const bad=structuredClone(manifest);Object.assign(bad.entries[0],changes);assert.throws(()=>validateManifest(bad));
 }
 const bad=structuredClone(manifest);bad.sources[0].url='javascript:alert(1)';assert.throws(()=>validateManifest(bad));return{rejectedLibraryChanges:6};
});
test('A failed proposed import leaves existing personal notes intact',()=>{
 const current=new Map([[clip.clipId,note()]]);const before=JSON.stringify([...current]);
 assert.throws(()=>{const proposed=validateNotes(doc([note({candidateIdentityId:'recv-nosferatu'})]),manifest,hash);current.clear();for(const row of proposed)current.set(row.clipId,row);});
 assert.equal(JSON.stringify([...current]),before);return{failedImportAtomic:true};
});
const names=['tests/verify-audio-listening-r31.mjs','modules/fidelity-r31/audio/review-format.js',manifestPath];
const report={schema:'re.bow.audio-listening-tests-r31/1',passed:checks.filter(row=>row.pass).length,failed:checks.filter(row=>!row.pass).length,checks,
 inputs:names.map(name=>({path:name,sha256:sha(fs.readFileSync(path.join(root,name)))})),scope:'Actual library and hostile portable-note documents; positive notes are user reports only, never a canonical source action review.'};
fs.writeFileSync(path.join(root,'docs/R31_AUDIO_LISTENING_TESTS.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,failed:report.failed}));if(report.failed)process.exitCode=1;
