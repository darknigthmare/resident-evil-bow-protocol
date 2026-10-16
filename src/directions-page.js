/* Uses the very same runtime selection and textures as gameplay.
 * The transport previews supplied frames; it never synthesizes missing animation. */
(function(root){
 'use strict';
 const $=id=>document.getElementById(id),D=root.RE_DATA,E=root.RE_CATALOG_EXPANSION;
 const F=D.fighters.concat(E.fighters),A=root.RE_FIGHTER_DIRECTIONS,R=root.RE_RENDERER;
 const canvas=$('directionCanvas'),ctx=canvas.getContext('2d');
 const labels={idle:'REPOS',walk:'MARCHE',retreat:'RECUL',dash:'DASH',jump:'SAUT',crouch:'ACCROUPI',guard:'GARDE',hit:'IMPACT',knockdown:'CHUTE',win:'VICTOIRE',lose:'DÉFAITE',light:'LÉGER',heavy:'LOURD',low:'BAS',throw:'PRISE',special:'TECHNIQUE NEUTRE',specialDown:'TECHNIQUE BASSE',specialForward:'TECHNIQUE AVANT',specialBack:'TECHNIQUE ARRIÈRE',super:'SUPER',utility:'UTILITAIRE'};
 let selected=F.find(f=>f.uid===new URLSearchParams(location.search).get('uid'))||F[0];
 let swap=false,raf=null,last=null,dirty=true,tick=0,playing=false,carry=0;
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const count=F.filter(f=>A.audit(f).ready).length;
 $('directionCounts').textContent=F.length+' CORPS DE COMBAT · '+count+' POSES DE RÉFÉRENCE BIDIRECTIONNELLES · '+(F.length-count)+' À TERMINER';
 for(const state of [...A.states,...A.slots]){const o=document.createElement('option');o.value=state;o.textContent=labels[state];$('directionState').append(o);}
 $('directionState').value='idle';
 function state(){return $('directionState').value;}
 function stop(){playing=false;last=null;carry=0;dirty=true;$('directionAnimate').textContent='LIRE LES FRAMES';}
 function reset(){stop();tick=0;dirty=true;}
 function list(){
  const q=normalize($('directionSearch').value),status=$('directionStatus').value;
  const items=F.filter(f=>(!q||normalize(f.name+' '+f.uid+' '+f.ep).includes(q))&&(status==='all'||A.audit(f).ready===(status==='ready')));
  $('directionSubject').replaceChildren();
  for(const f of items){const o=document.createElement('option');o.value=f.uid;o.textContent=f.name+' / '+f.ep;$('directionSubject').append(o);}
  selected=items.find(f=>f.uid===selected?.uid)||items[0];
  if(selected)$('directionSubject').value=selected.uid;
  reset();draw();
 }
 function pose(face){
  const s=state();return {time:tick/60,animationTick:tick,animationState:s,walk:s==='walk'||s==='retreat',velocity:face*(s==='retreat'?-1:1),actor:{face},reduceMotion:true};
 }
 function statusLine(plan){return plan.animated?'FRAME '+(plan.animationFrame+1)+' · SÉQUENCE FOURNIE':plan.sideProfile?'POSE STATIQUE · AUCUNE ANIMATION FOURNIE':'RÉFÉRENCE PROVISOIRE · PROFIL À PRODUIRE';}
 function draw(){
  dirty=false;ctx.clearRect(0,0,1280,720);R.drawStage(ctx,D.stages[0],0,0,true);
  $('directionTick').value=String(tick);$('directionTime').textContent='TICK '+tick+' · '+(playing?'LECTURE':'PAUSE');
  for(const id of ['directionPlay','directionLab']){$(id).hidden=!selected;}
  for(const id of ['directionAnimate','directionStep','directionReset','directionState','directionTick','directionSwap']){$(id).disabled=!selected;}
  if(!selected){$('directionMeta').textContent='Aucun profil ne correspond aux filtres.';$('directionDetail').textContent='';$('directionLeft').textContent='';$('directionRight').textContent='';return;}
  const a=A.audit(selected),height=selected.visual?.drawHeight||selected.visual?.height||225,scale=Math.min(1.3,385/height);
  const ax=swap?930:350,bx=swap?350:930,left=bx>ax?1:-1,right=-left;
  R.drawFighter(ctx,selected,ax,600,left,scale,pose(left));
  R.drawFighter(ctx,selected,bx,600,right,scale,pose(right));
  const lp=A.resolve(selected,-1,pose(-1)),rp=A.resolve(selected,1,pose(1));
  ctx.fillStyle='#101c21ef';ctx.fillRect(0,0,1280,100);ctx.fillStyle='#e6eadb';ctx.font='20px monospace';ctx.textAlign='center';ctx.fillText(selected.name,640,34);
  ctx.font='14px monospace';ctx.fillText('MÊME INCARNATION · '+labels[state()]+' · TICK '+tick,640,68);
  ctx.fillStyle='#dbc286';ctx.fillText(left===1?'A · VERS LA DROITE →':'A · ← VERS LA GAUCHE',ax,660);ctx.fillText(right===1?'B · VERS LA DROITE →':'B · ← VERS LA GAUCHE',bx,660);
  $('directionMeta').textContent=selected.uid+' · '+(a.asymmetric?'ASYMÉTRIE PROTÉGÉE':'REFLET APPROUVÉ OU À VALIDER')+' · '+(a.ready?'POSE DE RÉFÉRENCE : DEUX ORIENTATIONS':'PRODUCTION GRAPHIQUE INCOMPLÈTE');
  $('directionLeft').textContent='GAUCHE : '+statusLine(lp);$('directionRight').textContent='DROITE : '+statusLine(rp);
  $('directionDetail').textContent='GAUCHE : '+lp.reason+' DROITE : '+rp.reason;
  const experimental=E.fighters.some(f=>f.uid===selected.uid);
  $('directionPlay').href=(experimental?'catalog-duel.html?uid=':'modules/versus.html?uid=')+encodeURIComponent(selected.uid);
  $('directionLab').href=(experimental?'catalog-laboratory.html?uid=':'laboratory.html?uid=')+encodeURIComponent(selected.uid);
  const move=A.slots.includes(state())?state():'light';$('directionLab').href+='&slot='+encodeURIComponent(move);
 }
 function loop(t){
  if(playing&&!document.hidden){if(last!==null){carry+=Math.max(0,Math.min(100,t-last))*60/1000;const steps=Math.floor(carry);if(steps){carry-=steps;tick=Math.min(36000,tick+steps);dirty=true;if(tick===36000)stop();}}last=t;}else last=null;
  if(dirty)draw();raf=requestAnimationFrame(loop);
 }
 $('directionSubject').addEventListener('change',()=>{selected=F.find(f=>f.uid===$('directionSubject').value);reset();draw();});
 $('directionSearch').addEventListener('input',list);$('directionStatus').addEventListener('change',list);
 $('directionSwap').addEventListener('click',()=>{swap=!swap;draw();});
 $('directionState').addEventListener('change',()=>{reset();$('directionWalk').checked=state()==='retreat';draw();});
 $('directionWalk').addEventListener('change',()=>{$('directionState').value=$('directionWalk').checked?'retreat':'idle';reset();draw();});
 $('directionAnimate').addEventListener('click',()=>{if(playing)stop();else{playing=true;last=null;$('directionAnimate').textContent='PAUSE';dirty=true;}});
 $('directionStep').addEventListener('click',()=>{stop();tick=Math.min(36000,tick+1);draw();});
 $('directionReset').addEventListener('click',()=>{reset();draw();});
 $('directionTick').addEventListener('input',()=>{stop();const raw=Number($('directionTick').value);tick=Number.isFinite(raw)?Math.max(0,Math.min(36000,Math.floor(raw))):0;draw();});
 root.addEventListener('re:assetstatus',()=>dirty=true);
 root.addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 root.addEventListener('pagehide',()=>{stop();cancelAnimationFrame(raf);raf=null;});
 root.addEventListener('pageshow',e=>{if(e.persisted&&raf===null){dirty=true;raf=requestAnimationFrame(loop);}});
 root.RE_DIRECTIONS_PAGE=Object.freeze({counts:{combat:F.length,ready:count,unresolved:F.length-count,contextual:E.records.filter(r=>r.encounter).length},draw,snapshot:()=>({uid:selected?.uid||null,swap,state:state(),tick,playing})});
 list();raf=requestAnimationFrame(loop);
})(globalThis);
