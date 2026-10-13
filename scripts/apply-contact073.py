#!/usr/bin/env python3
"""Small, reviewable local-only migration from the exact v0.7.2 sources."""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
def patch(p,a,b):
 q=R/p;s=q.read_text()
 if b in s:return
 if a not in s:raise RuntimeError('Missing migration anchor '+p+' '+a[:75])
 q.write_text(s.replace(a,b))
p='src/spatial-weakpoints-v072.js'
patch(p,"const VERSION='spatial-zones/1';","const VERSION='spatial-zones/2';")
patch(p,"  for(const z of zones(p,body)){", "  const entry=contact.kind==='projectile'?sweep(contact.x0,contact.y0,contact.x1,contact.y1,body,contact.padX??8,contact.padY??7):null;\n  if(contact.kind==='projectile'&&!entry)return result;\n  for(const z of zones(p,body)){")
patch(p,"   if(hit)return {id:z.id,label:z.label,critical:true,reason:'zone',point:contact.kind==='projectile'?hit:null};", "   // A non-piercing shot stops at its first body contact: deeper zones cannot\n   // grant a critical through an intervening part of the body.\n   if(hit&&entry&&hit.t>entry.t+1e-8){result.reason='occluded';continue;}\n   if(hit)return {id:z.id,label:z.label,critical:true,reason:'zone',point:contact.kind==='projectile'?hit:null};")
p='src/combat-foundation-v060.js'
patch(p,'options:{training:false,','lastImpact:null,options:{training:false,')
patch(p,'s.roundWinner=null;s.idleTraining=0;','s.roundWinner=null;s.idleTraining=0;s.lastImpact=null;')
helper="""// Read-only contact telemetry; values are collision coordinates, not sprite organs.
function impactDetails(s,a,d,m,contact,zone,blocked,amount){
 const body=box(d);let x=d.x,y=body.y+body.h/2,segment=null;
 if(contact?.kind==='projectile'&&root.RE_SPATIAL){
  const hit=root.RE_SPATIAL.sweep(contact.x0,contact.y0,contact.x1,contact.y1,body,contact.padX??8,contact.padY??7);
  if(hit){x=clamp(hit.x,body.x,body.x+body.w);y=clamp(hit.y,body.y,body.y+body.h);segment={x0:contact.x0,y0:contact.y0,x1:hit.x,y1:hit.y};}
 }else if(contact?.kind==='melee'&&overlap(contact.box,body)){
  const b=contact.box;x=(Math.max(b.x,body.x)+Math.min(b.x+b.w,body.x+body.w))/2;y=(Math.max(b.y,body.y)+Math.min(b.y+b.h,body.y+body.h))/2;
 }
 return {frame:s.frame,actor:a.slot,target:d.slot,x,y,kind:contact?.kind||'unlocalized',zone:zone?.critical?zone.id:null,reason:zone?.reason||null,blocked:!!blocked,amount,segment};
}
"""
patch(p,'function damage(s,a,d,m,',helper+'function damage(s,a,d,m,')
patch(p,"d.hit=12;d.vx=a.face*14;", "d.hit=12;d.vx=(projectile?Math.sign(flightVX):a.face)*14;")
patch(p,"a.stats.hits++;a.stats.damage+=amount;s.idleTraining=0;fx(s,d.x,d.y-100,blocking?'guard':'hit',m.tag);", "a.stats.hits++;a.stats.damage+=amount;s.idleTraining=0;s.lastImpact=impactDetails(s,a,d,m,contact,bio.zone,blocking,amount);fx(s,s.lastImpact.x,s.lastImpact.y,blocking?'guard':'hit',m.tag);")
patch(p,"const crossing=root.RE_SPATIAL?root.RE_SPATIAL.sweep(x0,y0,q.x,q.y,box(d),8,7):overlap(r,box(d));", "const crossing=root.RE_SPATIAL?root.RE_SPATIAL.sweep(x0,y0,q.x,q.y,box(d),8,7):overlap(r,box(d));\n  // Re-arm the return BEFORE sweeping this frame. Waiting until after the\n  // crossing loses fast return hits. Do not re-arm while still inside a body.\n  if(m.returnAt&&q.returned&&q.hitTargets[d.slot]==='out'&&!overlap({x:x0-8,y:y0-7,w:16,h:14},box(d)))delete q.hitTargets[d.slot];")
patch(p,"  }else if(m.returnAt&&q.returned&&q.hitTargets[d.slot]==='out'&&Math.abs(q.x-d.x)>90){delete q.hitTargets[d.slot];}","  }")
for p in ['src/technique-lab-v061.js','src/catalog-laboratory-v070.js']:
 patch(p,"events:s.events.slice(-10),", "events:s.events.slice(-10),lastImpact:s.lastImpact?JSON.parse(JSON.stringify(s.lastImpact)):null,")
 patch(p,"$('labTarget').value='re5-uroboros-mkono';", "$('labTarget').value=D.fighters.some(f=>f.uid===params.get('target'))?params.get('target'):'re5-uroboros-mkono';\nfor(const [param,id,values]of [['side','labTargetSide',['front','rear']],['face','labFacing',['1','-1']],['dummy','labDummy',['idle','guard','crouch','jump']]])if(values.includes(params.get(param)))$(id).value=params.get(param);\nif(params.get('opening')==='1')$('labTargetOpening').checked=true;\nconst linkedDistance=Number(params.get('distance'));if(params.has('distance')&&Number.isFinite(linkedDistance))$('labDistance').value=String(Math.round(Math.max(70,Math.min(750,linkedDistance))/10)*10);")
 patch(p,"function updateReadout(){const x=bench.snapshot();", "function updateReadout(){const x=bench.snapshot();root.RE_LAB_CONTACT?.readout(x,bench);")
 patch(p," updateReadout();", " if($('labBoxes').checked)root.RE_LAB_CONTACT?.draw(ctx,s.lastImpact);\n updateReadout();")
 patch(p,"root.addEventListener('pagehide',()=>{playing=false;cancelAnimationFrame(raf);});", "root.addEventListener('pagehide',()=>{playing=false;acc=0;last=0;cancelAnimationFrame(raf);raf=null;});\nroot.addEventListener('pageshow',e=>{if(e.persisted&&raf===null){playing=false;acc=0;last=performance.now();dirty=true;redraw();raf=requestAnimationFrame(loop);}});")
p='src/catalog-duel-v070.js'
patch(p,"root.addEventListener('pagehide',()=>{controls.clear();cancelAnimationFrame(raf);});", "root.addEventListener('pagehide',()=>{controls.clear();pending=null;paused=true;acc=0;last=0;cancelAnimationFrame(raf);raf=null;});root.addEventListener('pageshow',e=>{if(e.persisted&&raf===null){controls.clear();pending=null;paused=true;acc=0;last=performance.now();dirty=true;draw();raf=requestAnimationFrame(loop);}});")
p='src/catalog-encounter-page.js'
patch(p,"cancelAnimationFrame(raf);});", "cancelAnimationFrame(raf);raf=null;});\nroot.addEventListener('pageshow',e=>{if(e.persisted&&raf===null){pause();padPrev=[];padID=null;raf=requestAnimationFrame(loop);}});")
for p in ['laboratory.html','catalog-laboratory.html']:
 patch(p,'<p id="labWeakpoints"', '<p id="labContact" class="contact-status" role="status" aria-live="polite">AUCUN IMPACT MESURÉ</p><a id="labScenarioLink" class="quiet-link" href="?">LIEN DE CET ESSAI →</a><p id="labWeakpoints"')
 file='technique-lab-v061.js' if p=='laboratory.html' else 'catalog-laboratory-v070.js'
 patch(p,'<script src="src/'+file+'">','<script src="src/lab-contact-v073.js"></script><script src="src/'+file+'">')
# Keep all fighter definitions and contextual contract data unchanged.
p=R/'package.json';v=json.loads(p.read_text());assert v['version'] in ('0.7.2','0.7.3');v['version']='0.7.3';v['description']='Resident Evil — B.O.W. Protocol · Contacts et reprise'
if 'verify-v073' not in v['scripts']['verify']:v['scripts']['verify']+=' && node tests/verify-v073.mjs'
v['scripts']['docs:release']='python3 scripts/release-v073.py';p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
p=R/'data/roster.json';d=json.loads(p.read_text());d['version']='0.7.3';p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');(R/'src/re-data.js').write_text('window.RE_DATA='+json.dumps(d,ensure_ascii=False,separators=(',',':'))+';\n')
for p in list(R.glob('*.html'))+list((R/'modules').glob('*.html')):
 s=p.read_text().replace('bow-v072.css','bow-v073.css').replace('0.7.2','0.7.3');p.write_text(s)
(R/'styles/bow-v073.css').write_text((R/'styles/bow-v072.css').read_text()+'\n.contact-status{border:1px solid #826e48;background:#181f20;padding:12px 16px;color:#efcea0;font:13px/1.6 monospace;overflow-wrap:anywhere}.contact-status[data-hit="critical"]{border-color:#e2bc72;color:#ffdf91}.contact-status[data-hit="guard"]{border-color:#6ea5b8;color:#acd9e5}\n')
p=R/'data/lore-movesets.json';v=json.loads(p.read_text());v['version']='0.7.3';p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
p=R/'src/unified-engine-v060.js';p.write_text(p.read_text().replace('RE 0.7.2 ','RE 0.7.3 '))
p=R/'docs/deployment.json';d=json.loads(p.read_text());d['version']='0.7.3';d['developmentBranch']='codex/v0.7.3-contact-continuity';d['verificationManifest']='docs/RELEASE_MANIFEST_v0.7.3.json';p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print('v0.7.3 contact/lifecycle migration applied; gameplay profiles and context data unchanged.')
