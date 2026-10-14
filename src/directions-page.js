(function(root){'use strict';
const $=id=>document.getElementById(id),D=root.RE_DATA,E=root.RE_CATALOG_EXPANSION,
 F=D.fighters.concat(E.fighters),A=root.RE_FIGHTER_DIRECTIONS,R=root.RE_RENDERER,
 canvas=$('directionCanvas'),ctx=canvas.getContext('2d');let selected=F[0],swap=false,raf=null,last=0,dirty=true;
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const count=F.filter(f=>A.audit(f).ready).length;
$('directionCounts').textContent=F.length+' CORPS DE COMBAT · '+count+' PAIRES LATÉRALES VALIDÉES · '+(F.length-count)+' À TERMINER';
function list(){const q=normalize($('directionSearch').value),state=$('directionStatus').value;const items=F.filter(f=>(!q||normalize(f.name+' '+f.uid+' '+f.ep).includes(q))&&(state==='all'||A.audit(f).ready===(state==='ready')));$('directionSubject').replaceChildren();for(const f of items){const o=document.createElement('option');o.value=f.uid;o.textContent=f.name+' / '+f.ep;$('directionSubject').append(o);}selected=items.find(f=>f.uid===selected?.uid)||items[0];if(selected)$('directionSubject').value=selected.uid;draw();}
function draw(time=0){dirty=false;ctx.clearRect(0,0,1280,720);R.drawStage(ctx,D.stages[0],0,0,true);if(!selected){$('directionMeta').textContent='Aucun profil ne correspond aux filtres.';return;}const a=A.audit(selected),height=selected.visual?.drawHeight||selected.visual?.height||225,scale=Math.min(1.3,385/height);const left=swap?-1:1,right=-left,walk=$('directionWalk').checked;
 R.drawFighter(ctx,selected,350,600,left,scale,{time,walk,velocity:-left,actor:{face:left}});
 R.drawFighter(ctx,selected,930,600,right,scale,{time,walk,velocity:-right,actor:{face:right}});
 ctx.fillStyle='#101c21ef';ctx.fillRect(0,0,1280,100);ctx.fillStyle='#e6eadb';ctx.font='20px monospace';ctx.textAlign='center';ctx.fillText(selected.name,640,34);ctx.font='14px monospace';ctx.fillText('MÊME INCARNATION · DEUX DIRECTIONS · DESSINS NON INTERCHANGEABLES',640,68);
 ctx.font='14px monospace';ctx.fillStyle='#dbc286';ctx.fillText(left===1?'VERS LA DROITE →':'← VERS LA GAUCHE',350,660);ctx.fillText(right===1?'VERS LA DROITE →':'← VERS LA GAUCHE',930,660);
 $('directionMeta').textContent=selected.uid+' · '+(a.asymmetric?'ASYMÉTRIE PROTÉGÉE':'MIROIR À VALIDER PAR DESSIN')+' · '+(a.ready?'DEUX PROFILS DISPONIBLES':'PRODUCTION GRAPHIQUE INCOMPLÈTE');
 $('directionDetail').textContent='GAUCHE : '+A.resolve(selected,-1).reason+' DROITE : '+A.resolve(selected,1).reason;
 $('directionPlay').href=(E.fighters.some(f=>f.uid===selected.uid)?'catalog-duel.html?uid=':'modules/versus.html?uid=')+encodeURIComponent(selected.uid);
}
function loop(t){if(dirty||$('directionWalk').checked)draw(t/1000);last=t;raf=requestAnimationFrame(loop);}
$('directionSubject').addEventListener('change',()=>{selected=F.find(f=>f.uid===$('directionSubject').value);draw();});$('directionSearch').addEventListener('input',list);$('directionStatus').addEventListener('change',list);$('directionSwap').addEventListener('click',()=>{swap=!swap;draw();});$('directionWalk').addEventListener('change',()=>dirty=true);root.addEventListener('re:assetstatus',()=>dirty=true);
root.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);raf=null;});root.addEventListener('pageshow',e=>{if(e.persisted&&raf===null){dirty=true;raf=requestAnimationFrame(loop);}});
root.RE_DIRECTIONS_PAGE=Object.freeze({counts:{combat:F.length,ready:count,unresolved:F.length-count,contextual:E.records.filter(r=>r.encounter).length},draw});list();raf=requestAnimationFrame(loop);
})(globalThis);
