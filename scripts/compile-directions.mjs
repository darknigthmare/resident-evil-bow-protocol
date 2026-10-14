/** Compile only reviewed direction records; validate actual files, crops and fixed frame bounds. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import vm from 'node:vm';
import {fileURLToPath} from 'node:url';import {dimensions} from './directional-image-metadata.mjs';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(R,p),'utf8'));
const D=read('data/roster.json'),E=read('data/catalog-expansion-v070.json'),M=read('data/directional-art.json');
if(M.schema!=='re.bow.directional-art/1'||!Number.isInteger(M.revision)||M.revision<1||!M.records||typeof M.records!=='object')throw Error('Invalid directional-art registry');
const box={RE_DIRECTIONAL_ART:M};box.globalThis=box;vm.createContext(box);vm.runInContext(fs.readFileSync(path.join(R,'src/fighter-directions.js'),'utf8'),box);const A=box.RE_FIGHTER_DIRECTIONS;
const fighters=new Map([...D.fighters,...E.fighters].map(f=>[f.uid,f]));const checkedFiles=new Map();
function checkImage(view){
 if(!A.safeAsset(view.path))throw Error('Unsafe image path');
 const absolute=path.resolve(R,view.path),real=fs.realpathSync(absolute);
 if(!real.startsWith(fs.realpathSync(path.join(R,'assets'))+path.sep))throw Error('Image escapes asset directory');
 for(let p=absolute;p!==R;p=path.dirname(p))if(fs.lstatSync(p).isSymbolicLink())throw Error('Symlinked asset path');
 let meta=checkedFiles.get(view.path);if(!meta){const bytes=fs.readFileSync(real);meta={...dimensions(bytes),sha256:crypto.createHash('sha256').update(bytes).digest('hex')};checkedFiles.set(view.path,meta);}
 if(meta.width!==view.width||meta.height!==view.height||meta.sha256!==view.sha256)throw Error('Image dimensions/hash differ from review: '+view.path);
 if(view.crop&&!A.validCrop(view.crop,meta.width,meta.height))throw Error('Crop outside image');
 if(!Array.isArray(view.anchor)||view.anchor.length!==2||view.anchor.some(x=>!Number.isFinite(x)||x<0||x>1))throw Error('Invalid source-space anchor');
 if(view.borderKey!==undefined&&(!Number.isInteger(view.borderKey)||view.borderKey<0||view.borderKey>12))throw Error('Unsafe background key tolerance');
}
for(const [uid,r]of Object.entries(M.records)){
 const f=fighters.get(uid);if(!f)throw Error('Unknown incarnation: '+uid);
 if((r.mirrorReviewed===true||r.referenceMirrorReviewed===true)&&!A.mayMirror(f,r))throw Error('Asymmetric drawing cannot be mirrored: '+uid);
 for(const [dir,v]of Object.entries(r.views||{})){if(!['left','right'].includes(dir)||!A.validView(v,dir))throw Error('Invalid/unreviewed directional view: '+uid);checkImage(v);}
 for(const [state,views]of Object.entries(r.clips||{})){
  if(!A.states.includes(state)&&!A.slots.includes(state))throw Error('Unknown animation state: '+state);
  for(const [dir,c]of Object.entries(views)){if(!['left','right'].includes(dir)||!A.validClip(c,dir))throw Error('Invalid directional clip: '+uid+' '+state);checkImage(c);
   const size=c.frames[0].crop.slice(2);if(c.frames.some(f=>f.crop[2]!==size[0]||f.crop[3]!==size[1]))throw Error('Frame canvases must share dimensions to avoid breathing scale');
  }
 }
 const l=r.views?.left,t=r.views?.right;if(l&&t&&l.sha256===t.sha256&&JSON.stringify(l.crop||null)===JSON.stringify(t.crop||null))throw Error('One identical view cannot represent two independent anatomical sides');
}
const out='/* Generated directional registry; preserves gameplay and archive portraits. */\nglobalThis.RE_DIRECTIONAL_ART='+JSON.stringify(M)+';\n';const p=path.join(R,'src/directional-art.js');
if(process.argv.includes('--write'))fs.writeFileSync(p,out);else if(!fs.existsSync(p)||fs.readFileSync(p,'utf8')!==out)throw Error('Stale registry: npm run compile:directions');
console.log(JSON.stringify({records:Object.keys(M.records).length,combatIdentities:fighters.size,readyReferencePoses:[...fighters.values()].filter(f=>A.audit(f).ready).length,filesChecked:checkedFiles.size,newGeneratedCharacterArt:0,finishedPerMoveAnimations:0}));
