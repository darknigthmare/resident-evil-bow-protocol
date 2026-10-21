#!/usr/bin/env python3
"""Give the Dossier action bar its true height instead of overlapping the header.
The browser verifies native hit-testing; no forced click or hidden overlay removal.
"""
from pathlib import Path
R=Path(__file__).resolve().parents[1]
p=R/'styles/access-context-r18.css';s=p.read_text()
css='''
/* R18: controls own their space when the subject label is long. */
#fight .fightbar{height:auto;min-height:48px;padding-top:4px;padding-bottom:4px}
#fight .fightbar>small{min-width:0;flex:1 1 0}
#fight .fightbar>div{display:flex;gap:6px;flex:0 0 auto;align-items:center}
#storyTextMountR18 button{min-height:44px}
@media(max-width:720px){
 #fight .fightbar{flex-wrap:wrap;align-items:stretch;padding:6px 8px;gap:4px}
 #fight .fightbar>small{flex:1 1 100%;max-width:100%;line-height:1.5}
 #fight .fightbar>div{flex:1 1 100%;min-width:0;flex-wrap:nowrap;justify-content:flex-end}
 #fight .fightbar>div>button,#storyTextMountR18{flex:1 1 0;min-width:0}
 #storyTextMountR18 button{width:100%}
}
'''
if css not in s:p.write_text(s+css)
p=R/'tests/browser-access-context-r18.mjs';s=p.read_text()
old="await test('Story parent observes its genuine iframe and shows a real empty detonator without audio',width,async()=>{await page.click('#storyTextMountR18 button');"
new="""await test('Story parent observes its genuine iframe and shows a real empty detonator without audio',width,async()=>{
   const targets=await page.evaluate(()=>{const header=document.querySelector('#app>header').getBoundingClientRect();return [...document.querySelectorAll('#fight .fightbar button')].map(b=>{const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {label:b.textContent,belowHeader:r.top>=header.bottom-1,inViewport:r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight,owned:hit===b||b.contains(hit),height:r.height};});});
   assert.equal(targets.length,3);for(const t of targets){assert(t.belowHeader&&t.inViewport&&t.owned,JSON.stringify(t));assert(t.height>=40);}
   await page.click('#storyTextMountR18 button');"""
if new not in s:
 assert s.count(old)==1;s=s.replace(old,new);p.write_text(s)
print('R18 mobile: auto-height toolbar, constrained label, three independently native-clickable controls.')
