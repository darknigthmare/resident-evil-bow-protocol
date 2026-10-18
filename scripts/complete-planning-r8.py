#!/usr/bin/env python3
"""Finish the reviewed R8 integration and restore artifact_tool's XML losslessly.
No network calls, no drawings, and no source or statistics imported from Excel.
"""
from pathlib import Path
import hashlib,json,lzma,subprocess,zipfile,xml.etree.ElementTree as ET
R=Path(__file__).resolve().parents[1]
assert json.loads((R/'package.json').read_text())['version']=='0.7.3'
chunks=[R/f'.github/integration/matrix-r8-{i}.bin' for i in range(1,6)]
b=b''.join(p.read_bytes() for p in chunks)
assert hashlib.sha256(b).hexdigest()=='88eb94d815d63d6c9eda266ad13fc26252bf9d9a131b11692da2aba6379b12f4'
z=lzma.LZMADecompressor(memlimit=128*1024*1024);raw=z.decompress(b,max_length=4*1024*1024)
assert z.eof and not z.unused_data
components=json.loads(raw);assert isinstance(components,dict) and len(components)==32
for name,xml in components.items():
 p=Path(name);assert not p.is_absolute() and '..' not in p.parts and isinstance(xml,str)
 assert name.endswith(('.xml','.rels'))
 ET.fromstring(xml)
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
book=ET.fromstring(components['xl/workbook.xml'])
assert len(book.findall('s:sheets/s:sheet',ns))==9
output=R/'docs/planning/BOW_PR11_MATRICE_EXECUTION_R8.xlsx';output.parent.mkdir(parents=True,exist_ok=True)
assert not output.exists(),'Refusing to overwrite an existing workbook'
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
 for name,xml in components.items():archive.writestr(name,xml.encode('utf8'))
with zipfile.ZipFile(output) as archive:
 assert archive.testzip() is None
 assert {name:archive.read(name).decode('utf8') for name in archive.namelist()}==components
# Validated source anchors make the migration fail on an unexpected base.
def change(name,old,new):
 p=R/name;s=p.read_text();assert s.count(old)==1,(name,old[:80]);p.write_text(s.replace(old,new))
change('src/match-sequences-r8.js','return !!s&&s.finished===true&&slot(s.winner)&&actor===','return !!s&&s.finished===true&&s._resultSent55!==true&&slot(s.winner)&&actor===')
change('src/unified-engine-v060.js','function beginFinishWindow46(w){if(!window.RE_MATCH_SEQUENCES.canFinish(state,w))return false;','function beginFinishWindow46(w){if(finishWindow46||finishScene46||!window.RE_MATCH_SEQUENCES.canFinish(state,w))return false;')
change('src/unified-engine-v060.js','const fin=finishWindow46.profile.finishers[index]||finishWindow46.profile.finishers[0],winner=','if(!Number.isInteger(index)||index<0||index>=finishWindow46.profile.finishers.length)return false;const fin=finishWindow46.profile.finishers[index],winner=')
change('sequences.html','<label>SÉQUENCE<select id="sequenceState"></select></label>','<label>SÉQUENCE<select id="sequenceState"></select></label><label>ARÈNE<select id="sequenceStage"></select></label>')
change('sequences.html','<a id="sequenceMoves" href="movesets.html">RÉPERTOIRE DU SUJET →</a>','<a id="sequenceMoves" href="movesets.html">RÉPERTOIRE DU SUJET →</a><p><a id="sequenceScenario" href="sequences.html">LIEN DE CET ESSAI →</a> · <a href="docs/planning/BOW_PR11_MATRICE_EXECUTION_R8.xlsx">SUIVI EXCEL R8 →</a></p>')
change('src/sequences-page-r8.js'," const cv=$('sequenceCanvas')"," const stages=root.RE_DATA.stages;let stage=stages.find(s=>s.id===q.get('stage'))||stages[0];\n const cv=$('sequenceCanvas')")
a=" $('sequenceState').value=M.states.includes(q.get('state'))?q.get('state'):'roundLose';"
change('src/sequences-page-r8.js',a,a+"\n for(const s of stages){const o=document.createElement('option');o.value=s.id;o.textContent=s.name;$('sequenceStage').append(o);}$('sequenceStage').value=stage.id;\n function scenario(){const p=new URLSearchParams();if(chosen)p.set('uid',chosen.uid);p.set('state',$('sequenceState').value);p.set('stage',stage.id);p.set('tick',String(tick));return 'sequences.html?'+p.toString();}")
change('src/sequences-page-r8.js','R.drawStage(c,root.RE_DATA.stages[0],reduced?0:tick/60,0,true);',"R.drawStage(c,stage,reduced?0:tick/60,0,true);$('sequenceScenario').href=scenario();$('sequenceScenario').hidden=!chosen;")
change('src/sequences-page-r8.js'," root.addEventListener('blur',pause);"," $('sequenceStage').addEventListener('change',()=>{stage=stages.find(s=>s.id===$('sequenceStage').value)||stages[0];tick=0;pause();draw();});\n root.addEventListener('blur',pause);")
change('src/sequences-page-r8.js',"state:$('sequenceState').value,drawings:filled","state:$('sequenceState').value,stage:stage.id,scenario:scenario(),drawings:filled")
change('src/sequences-page-r8.js','}),draw});list();raf=requestAnimationFrame(loop);',"}),draw});list();const requested=q.get('tick');if(requested!==null&&/^\\d{1,5}$/.test(requested)){tick=Math.min(36000,Number(requested));draw();}raf=requestAnimationFrame(loop);")
p=R/'package.json';d=json.loads(p.read_text());assert 'verify-sequences-r8-addendum.mjs' in d['scripts']['verify']
assert 'verify-planning-integration-r8.mjs' not in d['scripts']['verify']
d['scripts']['verify']+=' && node tests/verify-planning-integration-r8.mjs';p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
subprocess.run(['node','scripts/contract.mjs','--write'],cwd=R,check=True)
p=R/'docs/SEQUENCES_R8_CHANGES.json';d=json.loads(p.read_text())
for name,e in d['changed'].items():e['after']=hashlib.sha256((R/name).read_bytes()).hexdigest()
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
# The compressed transfer is not part of the delivered game.
for p in chunks:p.unlink()
manifest={'schema':'bow.planning.r8/1','originalP1Sha256':'809cbf4c68f290cfe0c4c67f29bd895f9f07f578f15ad39e9911a889cce89ac1','workbook':output.name,'workbookSha256':hashlib.sha256(output.read_bytes()).hexdigest(),'sheets':[n.attrib['name'] for n in book.findall('s:sheets/s:sheet',ns)],'xmlMembers':len(components),'xmlTransferSha256':hashlib.sha256(b).hexdigest(),'source':'artifact_tool export; identical XML members reconstructed and compared','scope':{'bodies':346,'sequenceSlots':2768,'commandsInventoried':3460,'stages':52,'contextualEntries':43,'newFinalArt':0,'closedGlobalP1Tasks':0},'note':'Complementary matrix with P1 task IDs, not a replacement for the original 21-tab P1 workbook. Final QA evidence is separate from its preparation-time status.'}
(R/'docs/planning/MANIFESTE_EXECUTION_R8.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(manifest,ensure_ascii=False))
