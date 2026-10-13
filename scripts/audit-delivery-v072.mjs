/** Offline integrity audit. Local paths only; never downloads a reference. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function audit(root=R){
 const read=p=>fs.readFileSync(path.join(root,p),'utf8'),D=JSON.parse(read('data/roster.json')),E=JSON.parse(read('data/catalog-expansion-v070.json'));
 const catalog=new Set(D.catalog.map(c=>c.id)),main=new Map(D.fighters.map(f=>[f.uid,f])),trial=new Map(E.fighters.map(f=>[f.uid,f])),context=new Map(E.records.filter(r=>r.encounter).map(r=>[r.id,r]));
 assert.equal(catalog.size,D.catalog.length);assert.equal(main.size,115);assert.equal(trial.size,231);assert.equal(context.size,43);
 const missing=[],files=new Set(),routes=[],pages=fs.readdirSync(root).filter(n=>n.endsWith('.html')).concat(fs.readdirSync(path.join(root,'modules')).filter(n=>n.endsWith('.html')).map(n=>'modules/'+n));
 function checkFile(ref,from='index.html'){
  if(!ref||/^(?:https?:|data:|mailto:|#)/i.test(ref))return;
  const relative=decodeURIComponent(ref.split(/[?#]/)[0]);if(!relative)return;
  const p=path.resolve(root,path.dirname(from),relative),local=path.relative(root,p);
  if(local.startsWith('..')||path.isAbsolute(local)){missing.push({from,ref,error:'outside-project'});return;}
  if(!fs.existsSync(p)||!fs.statSync(p).isFile())missing.push({from,ref,error:'missing'});else files.add(local);
 }
 for(const id of catalog){
  const owners=[main.has(id),trial.has(id),context.has(id)].filter(Boolean).length;assert.equal(owners,1,'Non-exclusive identity '+id);
  const mode=main.has(id)?'main':trial.has(id)?'trial':'context';const f=main.get(id)||trial.get(id),record=context.get(id);
  const route=mode==='main'?'modules/versus.html?uid='+id:mode==='trial'?'catalog-duel.html?uid='+id:'catalog-encounter.html?id='+id;
  checkFile(route);if(f){checkFile(f.sprite);checkFile(f.portrait);assert.equal(Object.keys(f.combat.moves).length,10,id);}
  else checkFile(record.portrait);routes.push({id,mode,route});
 }
 for(const p of pages){const text=read(p);for(const m of text.matchAll(/\b(?:src|href)=["']([^"']+)["']/g))checkFile(m[1],p);
  if(text.includes('combat-foundation-v060.js'))assert(text.indexOf('spatial-weakpoints-v072.js')>=0&&text.indexOf('spatial-weakpoints-v072.js')<text.indexOf('combat-foundation-v060.js'),'Missing spatial module '+p);
 }
 for(const f of D.stages)if(f.background)checkFile(f.background);
 for(const f of ['modules/versus.html','operations.html','modules/chronicles.html'])assert(!read(f).includes('catalog-trial-adapter'),'Experimental promotion '+f);
 return {version:JSON.parse(read('package.json')).version,identities:catalog.size,main:main.size,experimental:trial.size,contextual:context.size,commands:main.size*10+trial.size*10,pages:pages.length,checkedLocalFiles:files.size,missing,routes};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const report=audit();fs.writeFileSync(path.join(R,'docs/DELIVERY_AUDIT_v0.7.2.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({...report,routes:undefined}));if(report.missing.length)process.exitCode=1;
}
