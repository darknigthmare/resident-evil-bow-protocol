#!/usr/bin/env python3
from pathlib import Path
R=Path(__file__).resolve().parents[1];p=R/'tests/browser-text-continuity-r18.mjs';s=p.read_text()
a="const engine=page.frameLocator('#engine');await page.waitForFunction(()=>document.getElementById('engine').contentWindow.__CQC053Versus?.getState()?.phase==='fight');"
b="""const engine=page.frameLocator('#engine');try{await page.waitForFunction(()=>document.getElementById('engine').contentWindow.__CQC053Versus?.getState()?.phase==='fight',null,{timeout:5000});}catch(error){const diagnostic=await page.evaluate(()=>{const w=document.getElementById('engine').contentWindow,a=w.__CQC053Versus,s=a?.getState();return{parent:CQC60.snapshot(),active:document.activeElement.id,modal:document.getElementById('modal').open,modalText:document.getElementById('modal').textContent,child:{phase:s?.phase,frame:s?.frame,hidden:w.document.hidden,active:w.document.activeElement?.id,diagnostics:a?.diagnostics(),location:w.location.href},messages:document.getElementById('toast')?.textContent};});fs.writeFileSync(path.join(O,'story-start-failure-'+width+'.json'),JSON.stringify({diagnostic,errors},null,2));await page.screenshot({path:path.join(O,'story-start-failure-'+width+'.png')});throw error;}"""
if b not in s:
 assert s.count(a)==1;s=s.replace(a,b);p.write_text(s)
print('R18 HTTP story timeout now preserves parent/child state and real screenshot.')
