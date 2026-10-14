/** Validate local direction-specific artwork before including it in the runtime. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(R,p),'utf8'));
const D=read('data/roster.json'),E=read('data/catalog-expansion-v070.json'),M=read('data/directional-art.json');
if(M.schema!=='re.bow.directional-art/1')throw Error('Unknown directional-art schema');
const fighters=new Map([...D.fighters,...E.fighters].map(f=>[f.uid,f]));
for(const [uid,record] of Object.entries(M.records)){
 const f=fighters.get(uid);if(!f)throw Error('Unknown combat incarnation: '+uid);
 if(record.mirrorReviewed===true && (f.visual?.asymmetric===true || /BIRKIN|BANDERSNATCH|N[EÉ]M[EÉ]SIS|T[-\s]?002/i.test(f.name)))
  throw Error('Asymmetric fighter requires dedicated views: '+uid);
 for(const [direction,v] of Object.entries(record.views||{})){
  if(!['left','right'].includes(direction)||v.facing!==direction||v.projection!=='side'||v.reviewed!==true)
   throw Error('Unreviewed/mismatched side view: '+uid+' / '+direction);
  if(!/^assets\/[\w./-]+\.(?:png|webp)$/i.test(v.path)||v.path.split('/').some(p=>p==='..'||p==='.'))throw Error('Unsafe asset path');
  const p=path.resolve(R,v.path);if(!p.startsWith(R+path.sep)||fs.lstatSync(p).isSymbolicLink())throw Error('Unsafe local asset');
  if(!Number.isFinite(v.width)||!Number.isFinite(v.height)||v.width<8||v.height<8)throw Error('Missing image dimensions');
  if(!Array.isArray(v.anchor)||v.anchor.length!==2||v.anchor.some(n=>!Number.isFinite(n)||n<0||n>1))throw Error('Invalid foot anchor');
  const hash=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');if(hash!==v.sha256)throw Error('Artwork changed since review: '+v.path);
 }
}
const out='/* Generated from data/directional-art.json; no roster mutation. */\nglobalThis.RE_DIRECTIONAL_ART='+JSON.stringify(M)+';\n';
const p=path.join(R,'src/directional-art.js');
if(process.argv.includes('--write'))fs.writeFileSync(p,out);
else if(!fs.existsSync(p)||fs.readFileSync(p,'utf8')!==out)throw Error('Stale directional registry; run node scripts/compile-directions.mjs --write');
console.log(JSON.stringify({directionalRecords:Object.keys(M.records).length,combatIdentities:fighters.size,contextualIdentities:E.records.filter(r=>r.encounter).length,strictSideArtGenerated:false}));
