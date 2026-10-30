import {renderSource} from './native-renderer.js';

const $=id=>document.getElementById(id);
const PAGE=24;
let manifest=null,identities=[],filtered=[],page=0,loadController=null,renderController=null,active=true;
const state={ready:false,error:'',identityCount:0,filtered:0,page:0,pages:0,native:{status:'idle',id:null,views:[]},sourceLeft:null,lucas:null};

const sha256=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
async function bounded(record,signal){
 const response=await fetch(new URL('../../'+record.path,new URL('.',location.href)),{signal,credentials:'same-origin'});
 if(!response.ok)throw Error('Source indisponible : '+record.path);
 const bytes=new Uint8Array(await response.arrayBuffer());
 if(bytes.byteLength!==record.bytes)throw Error('Taille source inattendue : '+record.path);
 if(await sha256(bytes)!==record.sha256)throw Error('SHA-256 source différent : '+record.path);
 return bytes;
}
async function imageRecord(record,signal){
 const bytes=await bounded(record,signal),url=URL.createObjectURL(new Blob([bytes],{type:'image/png'})),image=new Image();
 try{image.src=url;await image.decode();if(record.width&&image.naturalWidth!==record.width||record.height&&image.naturalHeight!==record.height)throw Error('Dimensions source inattendues.');return image;}
 catch(error){URL.revokeObjectURL(url);throw error;}
}
function revokeImage(image){try{URL.revokeObjectURL(image.src);}catch{}}
async function json(url,signal){const response=await fetch(url,{signal,credentials:'same-origin'});if(!response.ok)throw Error('JSON indisponible : '+url);return response.json();}

function badges(row){
 const labels=[];if(row.kind==='main')labels.push(['Principal','']);if(row.kind==='prototype')labels.push(['Prototype','']);if(row.kind==='context')labels.push(['Contexte','']);
 for(const type of row.r33)labels.push([type==='native'?'Vues natives R33':type==='source'?'Orientation source R33':'Cadrage R33','r33']);
 return labels;
}
function coverageFor(id){
 if(id==='re0-zombie'||id==='reoutbreak-zombie')return['native'];
 if(id==='re1r-zombie')return['source'];
 if(id==='re7-lucas-baker-mutated')return['framing'];
 return[];
}
function makeIdentities(roster,annex,dossiers){
 const result=[],seen=new Set(),r31=new Map((dossiers.identities||[]).map(row=>[row.id,row]));
 const add=(id,name,game,kind)=>{if(!id||seen.has(id))throw Error('Identité dupliquée ou absente : '+id);seen.add(id);const old=r31.get(id);result.push({id,name:name||id,game:game||'',kind,r33:coverageFor(id),r31Lots:old?.lots||[]});};
 for(const fighter of roster.fighters||[])add(fighter.uid,fighter.name,fighter.ep||fighter.game,'main');
 const prototypes=new Set((annex.fighters||[]).map(f=>f.uid));
 for(const record of annex.records||[])add(record.id,record.name,record.game,prototypes.has(record.id)?'prototype':'context');
 const counts={main:result.filter(r=>r.kind==='main').length,prototype:result.filter(r=>r.kind==='prototype').length,context:result.filter(r=>r.kind==='context').length};
 if(result.length!==manifest.counts.identities||counts.main!==manifest.counts.mainFighters||counts.prototype!==manifest.counts.experimentalFighters||counts.context!==manifest.counts.contextualEncounters)throw Error('Inventaire 389 incohérent avec le manifeste R33.');
 return result.sort((a,b)=>(a.game+' '+a.name+' '+a.id).localeCompare(b.game+' '+b.name+' '+b.id,'fr'));
}
function renderSummary(){
 const rows=[
  ['Incarnations inventoriées',manifest.counts.identities],
  ['Variantes OBJ nouvellement rendables',manifest.counts.newNativeModelVariants],
  ['Vues natives générables',manifest.counts.newNativeViews],
  ['Nouveaux frames originaux revendiqués',manifest.counts.newOriginalGameFrames],
  ['Nouvelles poses de combat générées',manifest.counts.newGeneratedCombatPoses]
 ];
 $('summary').replaceChildren(...rows.map(([label,value])=>{const article=document.createElement('article'),strong=document.createElement('strong'),span=document.createElement('span');strong.textContent=String(value);span.textContent=label;article.append(strong,span);return article;}));
 $('limits').replaceChildren(...manifest.limitations.map(value=>{const li=document.createElement('li');li.textContent=value;return li;}));
}
function renderInventory(){
 const query=$('search').value.trim().toLocaleLowerCase('fr'),kind=$('kind').value,cov=$('coverage').value;
 filtered=identities.filter(row=>{
  if(kind!=='all'&&row.kind!==kind)return false;
  if(cov==='r33'&&!row.r33.length)return false;
  if(['native','source','framing'].includes(cov)&&!row.r33.includes(cov))return false;
  if(cov==='open'&&row.r33.length)return false;
  return !query||[row.id,row.name,row.game,...row.r31Lots].join(' ').toLocaleLowerCase('fr').includes(query);
 });
 const pages=Math.max(1,Math.ceil(filtered.length/PAGE));page=Math.max(0,Math.min(page,pages-1));
 const slice=filtered.slice(page*PAGE,page*PAGE+PAGE);
 $('inventory').replaceChildren(...slice.map(row=>{const article=document.createElement('article'),title=document.createElement('h3'),meta=document.createElement('p'),proof=document.createElement('p');title.textContent=row.name;meta.textContent=row.id+(row.game?' · '+row.game:'');for(const [label,klass] of badges(row)){const badge=document.createElement('span');badge.className='badge '+klass;badge.textContent=label;proof.append(badge);}if(row.r31Lots.length){const old=document.createElement('span');old.className='badge';old.textContent='R31 : '+row.r31Lots.join(', ');proof.append(old);}article.append(title,meta,proof);return article;}));
 state.filtered=filtered.length;state.page=page;state.pages=pages;
 $('inventoryCount').textContent=filtered.length+' incarnation(s) · '+identities.length+' au total.';
 for(const id of ['pageLabel','pageLabelBottom'])$(id).textContent='Page '+(page+1)+' / '+pages;
 for(const id of ['previous','previousBottom'])$(id).disabled=page===0;
 for(const id of ['next','nextBottom'])$(id).disabled=page>=pages-1;
}
function movePage(delta){page+=delta;renderInventory();$('inventoryTitle').scrollIntoView({block:'start'});}
function facts(result){
 const pairs=[['Modèle',result.entry.label],['Édition',result.entry.sourceEdition],['SHA modèle',result.entry.modelSha256],['Projection',result.recipe.projection],['Angles',result.recipe.angles.join('°, ')+'°'],['Géométrie miroir',result.recipe.geometryMirrored?'oui':'non'],['Pose modifiée',result.recipe.poseChanged?'oui':'non'],['Matériau de revue',result.recipe.renderMaterialMode]];
 $('nativeFacts').replaceChildren(...pairs.flatMap(([a,b])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=a;dd.textContent=b;return[dt,dd];}));
}
function downloadCanvas(canvas,name){canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png');}
async function renderNative(id=$('nativeModel').value){
 renderController?.abort();renderController=new AbortController();const token=renderController,entry=manifest.nativeViews.entries.find(item=>item.id===id);if(!entry)return;
 state.native={status:'loading',id,views:[]};$('nativeStatus').textContent='Vérification des octets et rendu des quatre angles…';$('nativeRetry').hidden=true;$('renderNative').disabled=true;$('nativeViews').replaceChildren();$('nativeFacts').replaceChildren();
 try{
  const result=await renderSource(entry,{signal:token.signal,cellSize:manifest.nativeViews.cellSize});if(token.signal.aborted||!active)return;
  const figures=result.views.map(view=>{const figure=document.createElement('figure'),caption=document.createElement('figcaption'),button=document.createElement('button');caption.textContent=view.angle+'° · '+view.bounds.width+'×'+view.bounds.height+' px visibles · bord '+view.edgePixels;button.type='button';button.textContent='Télécharger '+view.angle+'°';button.addEventListener('click',()=>downloadCanvas(view.canvas,entry.id+'-'+view.angle+'.png'));figure.append(view.canvas,caption,button);return figure;});
  $('nativeViews').replaceChildren(...figures);facts(result);$('nativeStatus').textContent='4 vues générées depuis les octets source vérifiés ; aucun miroir, aucune transformation de modèle.';state.native={status:'ready',id,views:result.views.map(({angle,bounds,pivot,occupiedPixels,edgePixels,rgbaSha256})=>({angle,bounds,pivot,occupiedPixels,edgePixels,rgbaSha256})),recipe:result.recipe,modelSha256:result.entry.modelSha256};
 }catch(error){if(token.signal.aborted||!active)return;state.native={status:'error',id,views:[],error:error.message};$('nativeStatus').textContent='Rendu refusé : '+error.message;$('nativeRetry').hidden=false;}
 finally{if(renderController===token)$('renderNative').disabled=false;}
}
async function showSourceLeft(signal){
 const record=manifest.exactSourceOrientation.image,image=await imageRecord(record,signal);try{const canvas=$('sourceLeft'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);$('sourceLeftStatus').textContent='Vue '+manifest.exactSourceOrientation.facing+' vérifiée · '+record.sha256+' · non miroir · pose statique source, pas idle certifié.';state.sourceLeft={ready:true,sha256:record.sha256,width:image.naturalWidth,height:image.naturalHeight,mirrored:false,combatIdleCertified:false};}finally{revokeImage(image);}}
async function showLucas(signal){
 const cfg=manifest.lucasFraming,image=await imageRecord(cfg.source,signal);try{const canvas=$('lucasFrame'),ctx=canvas.getContext('2d',{willReadFrequently:true}),pad=Math.round(canvas.width*cfg.output.paddingRatio),available=canvas.width-pad*2,scale=Math.min(available/image.naturalWidth,available/image.naturalHeight),w=Math.round(image.naturalWidth*scale),h=Math.round(image.naturalHeight*scale),x=Math.round((canvas.width-w)/2),y=Math.round((canvas.height-h)/2);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,x,y,w,h);const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data;let minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1;for(let i=3;i<rgba.length;i+=4)if(rgba[i]>=16){const p=(i-3)/4,px=p%canvas.width,py=Math.floor(p/canvas.width);minX=Math.min(minX,px);minY=Math.min(minY,py);maxX=Math.max(maxX,px);maxY=Math.max(maxY,py);}const margins={left:minX,top:minY,right:canvas.width-1-maxX,bottom:canvas.height-1-maxY};if(Math.min(...Object.values(margins))<pad-2)throw Error('Le cadrage Lucas ne respecte pas la marge R33.');$('lucasStatus').textContent='PNG R31 vérifié puis recadré sans nouvelle anatomie · marge visible min. '+Math.min(...Object.values(margins))+' px.';state.lucas={ready:true,sourceSha256:cfg.source.sha256,canvas:canvas.width,paddingRatio:cfg.output.paddingRatio,margins,sourcePixelsAltered:false,newAnatomyGenerated:false};}finally{revokeImage(image);}}
async function initialize(){
 loadController?.abort();const controller=new AbortController();loadController=controller;state.ready=false;state.error='';$('retry').hidden=true;$('status').textContent='Chargement du manifeste R33…';
 try{
  manifest=await json('manifest.json',controller.signal);
  if(manifest.schema!=='re.bow.fidelity-r33/1'||manifest.release!=='R33'||manifest.nativeViews.entries.length!==4||manifest.counts.newNativeViews!==16)throw Error('Manifeste R33 invalide.');
  const [roster,annex,dossiers]=await Promise.all([json('../../data/roster.json',controller.signal),json('../../data/catalog-expansion-v070.json',controller.signal),json('../fidelity-r31/dossier-additions.json',controller.signal)]);
  if(controller.signal.aborted||!active)return;
  identities=makeIdentities(roster,annex,dossiers);state.identityCount=identities.length;
  $('nativeModel').replaceChildren(...manifest.nativeViews.entries.map(entry=>{const option=document.createElement('option');option.value=entry.id;option.textContent=entry.label;return option;}));$('nativeModel').disabled=false;$('renderNative').disabled=false;
  for(const id of ['search','kind','coverage'])$(id).disabled=false;
  renderSummary();page=0;renderInventory();
  await Promise.all([showSourceLeft(controller.signal),showLucas(controller.signal)]);if(controller.signal.aborted||!active)return;
  state.ready=true;$('status').textContent='R33 prêt : 389 incarnations inventoriées, 16 vues natives générables, orientation gauche source et cadrage Lucas vérifiés.';
 }catch(error){if(controller.signal.aborted||!active)return;state.error=error.message;$('status').textContent='R33 indisponible : '+error.message;$('retry').hidden=false;}
}
for(const id of ['search','kind','coverage'])$(id).addEventListener(id==='search'?'input':'change',()=>{page=0;renderInventory();});
$('previous').addEventListener('click',()=>movePage(-1));$('previousBottom').addEventListener('click',()=>movePage(-1));$('next').addEventListener('click',()=>movePage(1));$('nextBottom').addEventListener('click',()=>movePage(1));
$('renderNative').addEventListener('click',()=>renderNative());$('nativeRetry').addEventListener('click',()=>renderNative());$('retry').addEventListener('click',initialize);
addEventListener('pagehide',()=>{active=false;loadController?.abort();renderController?.abort();});
addEventListener('pageshow',event=>{if(event.persisted){active=true;initialize();}});
globalThis.RE_FIDELITY_R33=Object.freeze({state:()=>structuredClone(state),renderNative,initialize});
initialize();
