from pathlib import Path
import json,subprocess,hashlib,os
R=Path(__file__).resolve().parents[1]
BASE=os.environ.get('BOW_R13_BASE','31671fecf53a26d81f77d2cb13a5ff61f15ef363')
old=lambda p:subprocess.check_output(['git','show',BASE+':'+p],cwd=R)
sha=lambda x:hashlib.sha256(x).hexdigest()
def replace(s,a,b):
 assert s.count(a)==1,(a[:100],s.count(a));return s.replace(a,b)
p=R/'src/unified-engine-v060.js';s=old(str(p.relative_to(R))).decode()
s=replace(s,"let replay48={mode:'record',frames:[],cursor:0,meta:null,last:null,ghostSlot:null};", "let replay48={mode:'record',frames:[],cursor:0,meta:null,last:null,ghostSlot:null};\nconst replayVaultR13=window.RE_REPLAY_VAULT.create({onChange:()=>{const info=replayVaultR13.status();if(['idle','saved','removed'].includes(info.lastWrite.state))safetyR9.clearWarning('replay-storage');else safetyR9.warn('replay-storage',info.lastWrite.message);window.dispatchEvent(new CustomEvent('re:replaystatus'));}});\nlet replayRecorderR13=null,lastReplayR13=null;let replaySerialR13=0;")
a=s.index('function replayHistory48()');b=s.index('\nfunction validateReplayMeta58',a)
s=s[:a]+'''function replayHistory48(){return replayVaultR13.list().map(x=>x.record);}
function clearReplays48(){replayVaultR13.clear();return replayHistory48();}
function captureReplayR13(w=null,fin=null){
 if(!replayRecorderR13||replay48.mode!=='record'||!replay48.meta)return null;
 const capture=replayRecorderR13.status();if(!capture.frames)return null;
 const terminal=!!w&&capture.complete,loser=w?(w.slot===0?state.b:state.a):null;
 return {version:'0.48',id:'r48-'+Date.now().toString(36)+'-'+(++replaySerialR13),createdAt:new Date().toISOString(),meta:{...replay48.meta},
 result:terminal?{winner:w.f.uid,loser:loser.f.uid,winnerSlot:w.slot,life:w.life,maxLife:w.max,timer:state.timer,timerStart:state.timerStart,rounds:[state.a.wins,state.b.wins],stage:state.stage.name,finisher:fin?{id:fin.id,name:fin.name,family:fin.family}:null,metrics:JSON.parse(JSON.stringify(state.metrics||{}))}:null,
 captureR13:{kind:terminal?'complete':'excerpt',reason:capture.reason||(!w?'manual-excerpt':''),frames:capture.frames},frames:replayRecorderR13.exportRuns()};
}
function finalizeReplay48(w,fin){const rep=captureReplayR13(w,fin);if(!rep)return null;replay48.last=lastReplayR13=rep;replayVaultR13.save(rep);return rep;}
''' + s[b:]
a="inputA=mutateInput49(s,inputA);inputB=mutateInput49(s,inputB);replay48.frames.push([packInput48(inputA),packInput48(inputB)]);"
b="inputA=mutateInput49(s,inputA);inputB=mutateInput49(s,inputB);if(replayRecorderR13&&!replayRecorderR13.append([packInput48(inputA),packInput48(inputB)]))safetyR9.warn('replay-limit','Limite d’enregistrement atteinte. Le combat continue ; seul un extrait sans victoire est exportable.');"
s=replace(s,a,b)
a=" if(pendingReplay48){const x=pendingReplay48;"
s=replace(s,a," replayRecorderR13=null;safetyR9.clearWarning('replay-limit');\n"+a)
a="last:null,ghostSlot:null}}"
b="last:null,ghostSlot:null};if(!dojo.on&&replayVaultR13.canCapture())replayRecorderR13=RE_REPLAY_VAULT.recorder();else if(!dojo.on)safetyR9.warn('replay-limit','Enregistrement suspendu : archives en mémoire pleines. Exportez et retirez les entrées en attente.');}"
s=replace(s,a,b)
s=replace(s,"function getReplayState60(){return{mode:replay48.mode,frame:replay48.cursor,frames:replay48.frames.length,exhausted:!!replay48.exhausted,legacy:!!state?.options?.replayLegacy59};}","function getReplayState60(){return{mode:replay48.mode,frame:replay48.cursor,frames:replay48.mode==='record'?(replayRecorderR13?.status().frames||0):replay48.frames.length,exhausted:!!replay48.exhausted,legacy:!!state?.options?.replayLegacy59,capture:replayRecorderR13?.status()||null,trainingNotRecorded:!!dojo.on};}")
s=replace(s,"getReplayState:getReplayState60,getReplays:replayHistory48,clearReplays:clearReplays48,getLastReplay:()=>replay48.last,", "getReplayState:getReplayState60,getReplays:replayHistory48,clearReplays:clearReplays48,getLastReplay:()=>replay48.last,getLatestReplay:()=>lastReplayR13,getReplayArchive:()=>replayVaultR13,captureReplay:()=>captureReplayR13(),")
p.write_text(s)
p=R/'modules/versus.html';s=old(str(p.relative_to(R))).decode();a='<script src="../src/unified-engine-v060.js"></script>';s=replace(s,a,'<script src="../src/replay-vault-r13.js"></script>'+a);s=replace(s,'</body>','<script src="../src/replay-panel-r13.js"></script></body>');p.write_text(s)
p=R/'scripts/contract.mjs';s=old(str(p.relative_to(R))).decode();s=replace(s,"const files=['src/finisher-compatibility-r10.js'","const files=['src/replay-vault-r13.js','src/finisher-compatibility-r10.js'");p.write_text(s)
p=R/'tests/r12-baseline.mjs';s=old('tests/r12-baseline.mjs').decode();s="import {r13Expected} from './r13-baseline.mjs';\n"+s;s=s.replace('return previous;','return r13Expected(root,key,previous);').replace('return x.after;','return r13Expected(root,key,x.after);');p.write_text(s)
p=R/'package.json';d=json.loads(old('package.json'));d['scripts']['verify']+=' && node tests/verify-replay-vault-r13.mjs';p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
subprocess.run(['node','scripts/contract.mjs','--write'],cwd=R,check=True)
files=['src/unified-engine-v060.js','src/runtime-contract.js']
(R/'docs/REPLAY_R13_CHANGES.json').write_text(json.dumps({'baseCommit':BASE,'changed':{p:{'before':sha(old(p)),'after':sha((R/p).read_bytes())}for p in files}},indent=2)+'\n')
protected=['data/roster.json','data/catalog-expansion-v070.json','data/chronicles.json','data/finishers-v053.json','data/directional-art.json','src/combat-foundation-v060.js','src/catalog-replay-r7.js','src/catalog-replay-contract.js','src/context-contract.js','src/re-renderer.js']
tracked=subprocess.check_output(['git','ls-tree','-r','--name-only',BASE],cwd=R,text=True).splitlines()
protected += [p for p in tracked if p.startswith('docs/planning/') and p.endswith('.xlsx')]
proof={'baseCommit':BASE,'files':{p:sha(old(p)) for p in protected}}
for p,h in proof['files'].items():assert sha((R/p).read_bytes())==h,p
(R/'docs/REPLAY_R13_PRESERVATION.json').write_text(json.dumps(proof,indent=2)+'\n')
print('Runtime generated; data, core combat, experimental/context contracts and previous workbooks preserved.')
