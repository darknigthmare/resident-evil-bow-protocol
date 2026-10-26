#!/usr/bin/env node
/* Real rule engine tests; browser layout and controller devices are separate. */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const checks=[],notes=[];
const box={console,URL,URLSearchParams,TextEncoder,structuredClone};box.window=box;box.globalThis=box;vm.createContext(box);
const files=['src/re-data.js','src/catalog-expansion-data.js','src/catalog-trial-adapter.js','src/spatial-weakpoints-v072.js','src/combat-foundation-v060.js','src/catalog-replay-contract.js','src/catalog-replay-r7.js','modules/fidelity-r28/evolutions/data.js','modules/fidelity-r28/evolutions/engine.js','modules/fidelity-r28/evolutions/contract.js','modules/fidelity-r28/evolutions/replay.js'];
for(const filename of files)vm.runInContext(fs.readFileSync(path.join(ROOT,filename),'utf8'),box,{filename});
const C=box.CQCCombat060,E=box.RE_EVOLUTIONS_R28,R=box.RE_EVOLUTION_REPLAY_R28,G=box.RE_EVOLUTION_DATA_R28;
const clone=v=>JSON.parse(JSON.stringify(v)),eq=(a,b)=>assert.deepEqual(clone(a),clone(b));
const fighter=uid=>box.RE_DATA.fighters.find(f=>f.uid===uid);
const cfg={uid:'re2r-tyrant',target:'re3r-nemesis',stage:box.RE_DATA.stages[0].id,mode:'human',seed:7070};
const fresh=(a='re2r-tyrant',b='re3r-nemesis',options={})=>E.create(fighter(a),fighter(b),{skipIntro:true,rounds:1,seconds:99,seed:7070,...options});
function ready(s,slot=0){const p=[s.a,s.b][slot];s.frame=120;p.life=6000;p.meter=60;return s;}
async function test(name,run){try{const detail=await run();checks.push({name,pass:true,...(detail?{detail}:{})});console.log('PASS '+name);}catch(error){checks.push({name,pass:false,error:error.stack});console.error('FAIL '+name+'\n'+error.stack);}}

await test('15 source-scoped families, acyclic forward forms and incarnation separation',()=>{
 assert.equal(G.families.length,15);assert.equal(G.edges.length,26);assert.equal(G.edges.filter(e=>e.playable).length,17);
 const seen=new Set();for(const family of G.families){assert.equal(family.forms[0],family.baseUid);for(const uid of family.forms){assert(!seen.has(uid));seen.add(uid);}for(const edge of G.edges.filter(e=>e.familyId===family.id)){assert(family.forms.indexOf(edge.from)<family.forms.indexOf(edge.to));assert(edge.sourceIds.length);}}
 assert.equal(seen.size,42);assert(Object.isFrozen(G.edges[0].conditions));
 assert(!G.edges.some(e=>e.from==='re2-tyrant'&&e.to==='re2r-super-tyrant'));
 return{families:15,forms:42,playableEdges:17,contextEdges:9,sourceQuotes:G.sources.length};
});
await test('exact-source compatibility contract binds every engine, profile and graph input',()=>{
 const contract=JSON.parse(fs.readFileSync(path.join(ROOT,'modules/fidelity-r28/evolutions/contract.json'),'utf8'));
 for(const item of contract.files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,item.path))).digest('hex'),item.sha256,item.path);
 const sorted=contract.files.map(item=>({path:item.path,sha256:item.sha256}));
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(sorted)).digest('hex'),contract.digest);
 assert.equal(box.RE_EVOLUTION_CONTRACT_R28.digest,contract.digest);
});
await test('legacy CQC globals and ordinary combat are byte-for-byte behavior preserved',()=>{
 assert.equal(C.version,'0.60');assert.equal(box.CQCCombat046,C);assert.equal(box.CQCCombat045,C);
 const a=C.create(fighter(cfg.uid),fighter(cfg.target),{skipIntro:true,seed:998,rounds:1}),b=C.create(fighter(cfg.uid),fighter(cfg.target),{skipIntro:true,seed:998,rounds:1});
 for(let n=0;n<600;n++){const ai=C.cpu(a,a.a,a.b),bi=C.cpu(a,a.b,a.a),aj=C.cpu(b,b.a,b.b),bj=C.cpu(b,b.b,b.a);C.step(a,[ai,bi]);C.step(b,[aj,bj]);}eq(a,b);assert(!a.evolutionsR28);assert.throws(()=>E.step(a),/R28/);
});
await test('eligibility queries have no side effects and full-health forms never change automatically',()=>{
 const s=fresh();const before=JSON.stringify(s);assert.match(E.reason(s,0,'re2r-super-tyrant'),/120/);E.available(s,0);assert.equal(JSON.stringify(s),before);
 for(let n=0;n<700;n++)E.step(s);assert.equal(s.a.f.uid,cfg.uid);assert.equal(s.evolutionsR28.history.length,0);
 assert.match(E.reason(s,0,'re2r-super-tyrant'),/70/);
});
await test('frame, health, meter, neutral ground and active object conditions each block independently',()=>{
 const cases=[
  [s=>s.frame=119,/120/],[s=>s.a.life=7001,/70/],[s=>s.a.meter=34.99,/35/],
  [s=>s.a.onGround=false,/sol/],[s=>s.a.vy=-1,/sol/],[s=>s.a.y--,/sol/],
  [s=>s.a.attack={def:{},t:0},/neutre/],[s=>s.a.hit=1,/neutre/],[s=>s.a.blockstun=1,/neutre/],
  [s=>s.a.cool=1,/neutre/],[s=>s.a.block=true,/neutre/],[s=>s.a.crouch=true,/neutre/],[s=>s.a.vx=1,/neutre/],
  [s=>s.projectiles.push({owner:0,dead:false}),/projectiles/],[s=>s.traps.push({owner:0,dead:false}),/dispositifs/]
 ];
 for(const[change,expected]of cases){const s=ready(fresh());change(s);assert.match(E.reason(s,0,'re2r-super-tyrant'),expected);assert.equal(E.request(s,0,'re2r-super-tyrant').ok,false);}
 const boundary=ready(fresh());boundary.a.life=7000;boundary.a.meter=35;assert.equal(E.reason(boundary,0,'re2r-super-tyrant'),null);
});
await test('explicit request changes actual fighter profile at the next tick without healing or clearing harms',()=>{
 const s=ready(fresh()),p=s.a;p.gray=900;p.regenUsed=300;p.guard=41;p.statuses.poison={t:100,budget:200};p.cooldowns.special=90;p.r=25;p.buffs.focus={t:100,hits:2};p.lastHit=p.lastOffense=s.frame;
 const before={life:p.life,guard:p.guard,gray:p.gray,regen:p.regenUsed,old:p.f};assert(E.request(s,0,'re2r-super-tyrant').ok);assert.equal(p.f.uid,cfg.uid);assert(!E.request(s,0,'re2r-super-tyrant').ok);
 E.step(s);assert.equal(p.f,fighter('re2r-super-tyrant'));assert.notEqual(p.f,before.old);assert.equal(p.life,before.life);assert.equal(p.guard,before.guard);assert.equal(p.gray,before.gray);assert.equal(p.regenUsed,before.regen);assert.equal(p.meter,25);assert.equal(p.statuses.poison.t,99);assert.equal(p.cooldowns.special,89);assert.equal(p.r,25);eq(p.buffs,{});assert.equal(s.evolutionsR28.history[0].frame,121);assert.equal(s.evolutionsR28.counts[0],1);
});
await test('all 17 admitted edges switch to exact UID and preserve finite spent resource capacity',()=>{
 for(const edge of G.edges.filter(e=>e.playable)){
  const s=ready(fresh(edge.from,'re1r-cerberus')),p=s.a,old=p.f.combat.resource;p.r=old.max*.4;p.resourceDelay=200;
  const available=['heat','cost'].includes(old.kind)?.6:.4;assert.equal(E.reason(s,0,edge.to),null,edge.id);assert(E.request(s,0,edge.to).ok);E.step(s);
  assert.equal(p.f.uid,edge.to,edge.id);assert.equal(p.life,6000);assert.equal(p.meter,25);assert(Number.isFinite(p.r));const target=p.f.combat.resource;const after=['heat','cost'].includes(target.kind)?1-p.r/target.max:p.r/target.max;assert(Math.abs(after-available)<1e-9,edge.id);assert(p.r>=0&&p.r<=target.max);
 }
 return{transitions:17};
});
await test('giant, rooted and scene-bound phases cannot be manufactured as free duel actors',()=>{
 for(const uid of G.contextOnlyUids.filter(fighter))assert.throws(()=>fresh(uid,'re1r-cerberus'),/contexte/);
 const s=ready(fresh('re3r-stage-2-nemesis'));assert.match(E.reason(s,0,'re3r-stage-3-nemesis'),/contexte/);assert(!E.request(s,0,'re3r-stage-3-nemesis').ok);
 assert.throws(()=>R.create({...cfg,uid:'re3r-stage-3-nemesis'}),/contexte/);
});
await test('no cross-incarnation links, reverse mutation, skip-a-form or equipment-as-mutation',()=>{
 const s=ready(fresh('re2-g'));for(const to of ['re2-g-third-form','re2r-g-second-form','re2-tyrant-mutation'])assert.match(E.reason(s,0,to),/Aucune/);
 const changed=ready(fresh('re2r-super-tyrant'));assert.match(E.reason(changed,0,'re2r-tyrant'),/Aucune/);
 const jack=ready(fresh('re7-jack-baker'));assert.match(E.reason(jack,0,'re7-jack-baker-scissor'),/Aucune/);
});
await test('successful recovery consumes exactly 24 ticks and rejects attack/jump while remaining hittable',()=>{
 const s=ready(fresh());assert(E.request(s,0,'re2r-super-tyrant').ok);for(let n=0;n<24;n++){E.step(s,[{...C.empty(),slot:'light',jump:true},C.empty()]);assert(!s.a.attack);assert(s.a.onGround);}assert.equal(s.a.cool,0);E.step(s,[{...C.empty(),slot:'light'},C.empty()]);assert(s.a.attack);assert.equal(s.a.stats.starts,1);
 const hurt=ready(fresh());E.request(hurt,0,'re2r-super-tyrant');E.step(hurt);const before=hurt.a.life;C.damage(hurt,hurt.b,hurt.a,hurt.b.f.combat.moves.heavy,{contact:{kind:'melee',fromX:hurt.b.x}});assert(hurt.a.life<before);
});
await test('revalidated queue cancellation and opponent objects do not permit stale commands',()=>{
 const s=ready(fresh());E.request(s,0,'re2r-super-tyrant');E.cancel(s);E.step(s);assert.equal(s.a.f.uid,cfg.uid);eq(E.commands(s),[null,null]);
 const bad=ready(fresh());E.request(bad,0,'re2r-super-tyrant');bad.a.hit=2;E.step(bad);assert.equal(bad.a.f.uid,cfg.uid);assert.equal(bad.evolutionsR28.lastResults[0].ok,false);
 const other=ready(fresh());other.traps.push({owner:1,dead:false});assert.equal(E.reason(other,0,'re2r-super-tyrant'),null);
});
await test('simultaneous voluntary mutations keep actor identity, physics and both meter costs',()=>{
 const s=ready(fresh('re2r-tyrant','re2-tyrant'));ready(s,1);const a=s.a,b=s.b;s.a.x=65;s.b.x=66;
 assert(E.request(s,0,'re2r-super-tyrant').ok);assert(E.request(s,1,'re2-tyrant-mutation').ok);E.step(s);assert.equal(s.a,a);assert.equal(s.b,b);assert.equal(a.meter,25);assert.equal(b.meter,25);assert(a.x>=65);assert(b.x<=1215);assert(b.x-a.x>=(C.box(a).w+C.box(b).w)*.3-1e-9);eq(s.evolutionsR28.counts,[1,1]);
});
await test('round reset keeps evolved profile while legacy engine resets life under ordinary round rules',()=>{
 const s=ready(fresh(undefined,undefined,{rounds:2,seconds:1}));E.request(s,0,'re2r-super-tyrant');E.step(s);s.b.life=0;E.step(s);for(let n=0;n<91;n++)E.step(s);assert.equal(s.round,2);assert.equal(s.a.f.uid,'re2r-super-tyrant');assert.equal(s.a.life,10000);assert.equal(s.evolutionsR28.history.length,1);
});
let naturalRecord;
await test('natural human duel reaches eligibility and records a real voluntary mutation without state overrides',()=>{
 const live=R.create(cfg);let frame=-1;
 while(live.frames()<6000&&!live.getState().finished){const s=live.getState();if(E.reason(s,0,'re2r-super-tyrant')===null){frame=s.frame;assert(live.requestEvolution(0,'re2r-super-tyrant').ok);live.step(C.empty());break;}live.step(C.empty());}
 assert.equal(frame,678);assert.equal(live.getState().a.f.uid,'re2r-super-tyrant');while(live.frames()<10000&&!live.getState().finished)live.step(C.empty());assert(live.getState().finished);
 naturalRecord=live.exportValue();assert(naturalRecord.runs.some(row=>row[3]==='re2r-super-tyrant'));eq(R.validate(naturalRecord),naturalRecord);
 return{mutationFrame:679,frames:naturalRecord.frames,digest:naturalRecord.stateDigest,complete:live.getState().finished,winner:live.getState().winner,life:[live.getState().a.life,live.getState().b.life]};
});
await test('replay seek before/after mutation reconstructs exact UID, history and final result',()=>{
 const p=R.createPlayer(naturalRecord);p.seek(678);assert.equal(p.getState().a.f.uid,'re2r-tyrant');p.tick();assert.equal(p.getState().a.f.uid,'re2r-super-tyrant');p.seek(naturalRecord.frames);assert.equal(R.seal(p.getState()),naturalRecord.stateDigest);p.seek(0);assert.equal(p.getState().a.f.uid,'re2r-tyrant');assert.equal(E.snapshot(p.getState()).history.length,0);p.seek(naturalRecord.frames);assert.equal(R.seal(p.getState()),naturalRecord.stateDigest);assert(p.ended());assert.throws(()=>p.seek(-1),/limites/);assert.throws(()=>p.seek(naturalRecord.frames+1),/limites/);assert.equal(p.requestEvolution,undefined);
});
await test('corrupted mutation, health injection, wrong engine, invalid run and wrong digest fail closed',()=>{
 const variants=[v=>v.contract='0'.repeat(64),v=>v.schema='re.bow.catalog-duel-replay/1',v=>v.life=9999,v=>v.runs.find(r=>r[3])[3]='re2-tyrant-mutation',v=>v.runs.find(r=>r[3])[3]='re3r-stage-3-nemesis',v=>v.runs[0][0]++,v=>v.runs[0][1]=128,v=>v.stateDigest='00000000',v=>v.setup.uid='absent',v=>v.setup.seed=-1,v=>v.runs[0].push('junk')];
 for(const change of variants){const v=clone(naturalRecord);change(v);assert.throws(()=>R.validate(v));}assert.throws(()=>R.validate('{'),/JSON/);assert.throws(()=>R.validate(' '.repeat(R.MAX_BYTES+1)),/volumineux/);
});
await test('R28 and preserved R7 replay parsers reject each other without touching original records',()=>{
 const old=box.RE_CATALOG_REPLAY.create(cfg);for(let n=0;n<240;n++)old.step(C.empty());const record=old.exportValue(),before=JSON.stringify(record);assert.throws(()=>R.validate(record),/R28/);assert.throws(()=>box.RE_CATALOG_REPLAY.validate(naturalRecord),/inconnu/);eq(box.RE_CATALOG_REPLAY.validate(record),record);assert.equal(JSON.stringify(record),before);
});
await test('CPU spectator and second-slot mutation requests remain manual and reproducible',()=>{
 const live=R.create({...cfg,uid:'re2r-tyrant',target:'re2-tyrant',mode:'cpu'});let choice=null;
 while(live.frames()<8000&&!live.getState().finished){const s=live.getState();for(const slot of [0,1]){const edge=E.available(s,slot).find(e=>e.reason===null);if(edge){assert(live.requestEvolution(slot,edge.to).ok);choice={slot,to:edge.to};break;}}live.step(C.empty());if(choice)break;}
 assert(choice,'a naturally available CPU mutation');assert.equal([live.getState().a,live.getState().b][choice.slot].f.uid,choice.to);assert.equal(live.getState().evolutionsR28.history.length,1);eq(R.validate(live.exportValue()),live.exportValue());return choice;
});

const report={schema:'re.bow.evolution-engine-tests/1',release:'R28',generatedAt:new Date().toISOString(),pass:checks.every(x=>x.pass),checks,counts:{groups:checks.length,passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length},notes:['Synthetic boundary fixtures test rule safety; separate natural replay scenario changes no actor state.','No official transformation frames, physical controllers or 1:1 world scales certified.']};
fs.writeFileSync(path.join(ROOT,'docs/R28_EVOLUTIONS_ENGINE_TESTS.json'),JSON.stringify(report,null,2)+'\n');
if(!report.pass)process.exitCode=1;
