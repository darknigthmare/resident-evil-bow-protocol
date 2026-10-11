import {readFile,cp,mkdir,rm,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(await readFile(path.join(root,'src/re-data.js'),'utf8'),ctx);const D=ctx.window.RE_DATA;
const ids=new Set();for(const f of D.fighters){if(ids.has(f.uid))throw Error('Duplicate fighter '+f.uid);ids.add(f.uid);for(const key of ['sprite','portrait'])await stat(path.join(root,f[key]));if(!f.combat?.moves?.special)throw Error('Missing combat profile '+f.uid)}
for(const f of D.catalog)if(f.portrait)await stat(path.join(root,f.portrait));
for(const s of D.stages)if(s.background)await stat(path.join(root,s.background));
const output=path.join(root,'dist');await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
for(const name of ['index.html','codex.html','movesets.html','operations.html','coverage.html','src','styles','modules','assets','docs'])await cp(path.join(root,name),path.join(output,name),{recursive:true});
console.log(`B.O.W. Protocol ${D.version} : ${D.fighters.length} spécimens, ${D.catalog.length} références, ${D.stages.length} arènes. Build statique validé.`);
