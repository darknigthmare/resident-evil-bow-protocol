#!/usr/bin/env python3
"""Corrections identified by the first real Canvas render; keep evidence honest."""
from pathlib import Path
R=Path(__file__).resolve().parents[1]
def change(file,a,b):
 p=R/file;s=p.read_text()
 if b in s:return
 assert s.count(a)==1,(file,a[:100],s.count(a));p.write_text(s.replace(a,b))
change('src/baker-stages-r14.js',"rect(1046,122,174,142,'#152820');rect(1060,137,146,113,'#30443e');for(let i=0;i<9;i++)poly([[1050+i*20,250],[1060+i*20,155+noise(seed,i)*35],[1071+i*20,250]],'#1a2e28');", "rect(1046,122,174,142,'#152820');c.save();c.beginPath();c.rect(1060,137,146,113);c.clip();rect(1060,137,146,113,'#30443e');for(let i=0;i<9;i++)poly([[1050+i*20,250],[1060+i*20,155+noise(seed,i)*35],[1071+i*20,250]],'#1a2e28');c.restore();")
change('src/baker-stages-r14.js',"rect(538,156,204,204,'#19281f');rect(550,169,180,177,'#293b37');ellipse(682,202,17,17,'#9fa98c88');for(let i=0;i<13;i++)poly([[540+i*18,344],[552+i*18,238+noise(seed,i)*39],[564+i*18,344]],'#172d26');", "rect(538,156,204,204,'#19281f');c.save();c.beginPath();c.rect(550,169,180,177);c.clip();rect(550,169,180,177,'#293b37');ellipse(682,202,17,17,'#9fa98c88');for(let i=0;i<13;i++)poly([[540+i*18,344],[552+i*18,238+noise(seed,i)*39],[564+i*18,344]],'#172d26');c.restore();")
change('tests/verify-baker-stages-r14.mjs',"const c=surface();S.drawStage(c.getContext('2d'),stages[0],0);assert.notEqual(h(c),h(paint(stages[0])));", "const c=e.document.createElement('canvas');c.width=1280;c.height=720;S.drawStage(c.getContext('2d'),stages[0],0);assert.notEqual(h(c),h(paint(stages[0])));")
change('tests/verify-baker-stages-r14.mjs',"assert.equal(B.describe(stages[2]).rainRegion,null);for(const s of stages)", "assert.equal(B.describe(stages[2]).rainRegion,null);for(const s of stages.slice(0,2)){const c=surface(),raw=c.getContext('2d'),clips=[];let latest=null;const proxy=new Proxy(raw,{get(t,k){if(k==='rect')return(...a)=>{latest=a;return t.rect(...a);};if(k==='clip')return(...a)=>{clips.push(latest);return t.clip(...a);};return typeof t[k]==='function'?t[k].bind(t):t[k];},set(t,k,v){t[k]=v;return true;}});B.draw(proxy,s,0,0,false,{layer:'architecture'});assert(clips.some(r=>JSON.stringify(r)===JSON.stringify(B.describe(s).rainRegion)),'Static exterior trees/moon must be clipped too');}for(const s of stages)")
print('Exterior scenery clipped behind glass; native fallback uses the same DOM-image adapter as the actual renderer.')
