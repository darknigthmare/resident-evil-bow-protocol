#!/usr/bin/env python3
"""Reviewed R8-to-R8B text integration. No network or art modifications."""
from pathlib import Path
import json,hashlib,subprocess
R=Path(__file__).resolve().parents[1];changes={}
assert hashlib.sha256((R/'src/unified-engine-v060.js').read_bytes()).hexdigest()=='9ebaefe351d55d575fa0fef3ba1cf5d330638dd0e1ed807d7af5006c6fd42b18','Unexpected R8 predecessor'
def edit(name,a,b):
 p=R/name;s=p.read_text();assert s.count(a)==1,(name,a[:80],s.count(a));old=hashlib.sha256(p.read_bytes()).hexdigest();s=s.replace(a,b);p.write_text(s);changes.setdefault(name,{'before':old})['after']=hashlib.sha256(p.read_bytes()).hexdigest()
core='src/unified-engine-v060.js'
edit(core,"function beginFinishWindow46(w){if(!window.RE_MATCH_SEQUENCES.canFinish(state,w))return false;","function beginFinishWindow46(w){if(state?._resultSent55||finishWindow46||finishScene46||!window.RE_MATCH_SEQUENCES.canFinish(state,w))return false;")
p=R/core;s=p.read_text();start=s.index('function startFinisher46(index)');end=s.index('\nfunction standardWin46',start);old=s[start:end]
new="""function startFinisher46(index){
 if(!finishWindow46||!window.RE_MATCH_SEQUENCES.canFinish(state,finishWindow46.winner===0?state.a:state.b))return false;
 const profile=finishWindow46.profile,winner=finishWindow46.winner,loser=finishWindow46.loser,w=winner===0?state.a:state.b;
 const token=window.RE_FINISHER_SESSION.select(state,w,profile,index,finishSettings46.mode==='cinematic'?1.18:1);
 if(!token)return false;
 const fin=profile.finishers[index];
 $('#finishPrompt46').classList.add('hidden');finishScene46={fin,winner,loser,frame:0,duration:token.duration,profile,token};finishWindow46=null;
 $('#finisherCaption46').classList.toggle('hidden',!finishSettings46.captions);$('#skipFinisherSceneR8').classList.remove('hidden');
 host58?.finisher(fin.id||fin.name,winner);$('#finisherName46').textContent=fin.name;$('#finisherDesc46').textContent=fin.description;
 clearKeys60();pressed.clear();return true;
}
function completeFinisherR8(){
 const sc=finishScene46;if(!sc)return false;
 const record=window.RE_FINISHER_SESSION.record(state,sc.token,sc.frame,sc.fin,sc.profile,new Date().toISOString());
 if(!record)return false;
 finishScene46=null;$('#finisherCaption46').classList.add('hidden');$('#skipFinisherSceneR8').classList.add('hidden');
 // Credit only after completed presentation, before the single result dispatch.
 finishProgress46.done[record.id]=record.date;finishProgress46.history=(finishProgress46.history||[]).concat([record]).slice(-120);saveFinish46();
 showResult(sc.winner===0?state.a:state.b,sc.fin);return true;
}
function skipFinisherSceneR8(){
 if(!finishScene46||!window.RE_FINISHER_SESSION.valid(state,finishScene46.token))return false;
 // Skip preserves the already-earned match win, not an unplayed finisher record.
 finishScene46=null;$('#skipFinisherSceneR8').classList.add('hidden');clearKeys60();pressed.clear();standardWin46();return true;
}"""
edit(core,old,new)
edit(core,"function standardWin46(){const w=state.winner===0?state.a:state.b;", "function standardWin46(){if(!state||!state.finished||state._resultSent55||![0,1].includes(state.winner))return false;const w=state.winner===0?state.a:state.b;")
edit(core,"if(finishScene46.frame>=finishScene46.duration){const scene=finishScene46;finishScene46=null;$('#finisherCaption46').classList.add('hidden');showResult(scene.winner===0?state.a:state.b,scene.fin)}", "if(finishScene46.frame>=finishScene46.duration)completeFinisherR8();")
edit(core,"if(finishScene46){if(e.code==='Escape'||e.code==='Enter'){e.preventDefault();finishScene46.frame=finishScene46.duration;}return;}", "if(finishScene46){if((e.code==='Escape'||e.code==='Enter')&&!e.repeat){e.preventDefault();skipFinisherSceneR8();}return;}")
edit(core,"$('#skipFinish46').onclick=standardWin46;", "$('#skipFinish46').onclick=standardWin46;$('#skipFinisherSceneR8').onclick=skipFinisherSceneR8;")
edit(core,"startFinisher:(i=0)=>{if(state?.finished&&!finishWindow46)beginFinishWindow46(state.winner===0?state.a:state.b);startFinisher46(i)}", "startFinisher:(i=0)=>{if(state?.finished&&!finishWindow46)beginFinishWindow46(state.winner===0?state.a:state.b);return startFinisher46(i)},skipFinisher:skipFinisherSceneR8")
s=(R/core).read_text();s=s.replace("finishScene46=null;$('#finishPrompt46').classList.add('hidden');", "finishScene46=null;$('#skipFinisherSceneR8').classList.add('hidden');$('#finishPrompt46').classList.add('hidden');")
(R/core).write_text(s);changes[core]['after']=hashlib.sha256((R/core).read_bytes()).hexdigest()
edit('modules/versus.html','<script src="../src/match-sequences-r8.js"></script>', '<script src="../src/match-sequences-r8.js"></script><script src="../src/finisher-session-r8.js"></script>')
edit('modules/versus.html','<div id="finisherCaption46"','<button id="skipFinisherSceneR8" type="button" class="hidden" style="position:fixed;right:18px;bottom:18px;z-index:80;padding:12px;background:#111b1d;color:#eee;border:1px solid #b7a378;cursor:pointer">PASSER LA CONCLUSION · ENTRÉE</button><div id="finisherCaption46"')
edit('scripts/contract.mjs',"'src/match-sequences-r8.js'", "'src/match-sequences-r8.js','src/finisher-session-r8.js'")
edit('tests/verify-pages.mjs',"must execute the selected canonical finisher", "must execute the selected stylized finisher")
p=R/'tests/r8-baseline.mjs';s=p.read_text();assert 'return e.after;' in s;s=s.replace('return e.after;',"const p2=path.join(root,'docs/EXCEL_R8B_CHANGES.json');if(!fs.existsSync(p2))return e.after;const next=JSON.parse(fs.readFileSync(p2,'utf8')).changed[file];if(!next)return e.after;assert.equal(next.before,e.after,'Unexpected Excel R8B predecessor '+file);return next.after;");p.write_text(s)
p=R/'src/runtime-contract.js';before=hashlib.sha256(p.read_bytes()).hexdigest();subprocess.run(['node','scripts/contract.mjs','--write'],cwd=R,check=True)
changes['src/runtime-contract.js']={'before':before,'after':hashlib.sha256(p.read_bytes()).hexdigest()}
(R/'docs/EXCEL_R8B_CHANGES.json').write_text(json.dumps({'baseCommit':'1e066fea9b9e5e1f5aba04234dcbb1bf0ff1f85c','changed':changes},indent=2)+'\n')
p=R/'package.json';d=json.loads(p.read_text());d['scripts']['verify']+=' && node tests/verify-excel-integration-r8.mjs';p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print('Integrated Excel R8B; no fighter, move, source image or finisher definition modified.')
