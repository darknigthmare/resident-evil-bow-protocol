/** Bump application metadata, preserving the contextual engine and its journals. */
import fs from 'node:fs';import path from 'node:path';import{fileURLToPath}from'node:url';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),V='0.7.2',read=p=>fs.readFileSync(path.join(R,p),'utf8'),write=(p,v)=>fs.writeFileSync(path.join(R,p),typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');
const p=JSON.parse(read('package.json'));p.version=V;p.description='Resident Evil — B.O.W. Protocol · Zones critiques';
if(!p.scripts.verify.includes('verify-v072'))p.scripts.verify+=' && node tests/verify-v072.mjs && node scripts/audit-delivery-v072.mjs';
p.scripts['docs:release']='python3 scripts/release-v072.py';write('package.json',p);
const D=JSON.parse(read('data/roster.json'));D.version=V;write('data/roster.json',D);write('src/re-data.js','window.RE_DATA='+JSON.stringify(D)+';\n');
const lore=JSON.parse(read('data/lore-movesets.json'));lore.version=V;write('data/lore-movesets.json',lore);
for(const file of fs.readdirSync(R).filter(p=>p.endsWith('.html')).concat(['modules/versus.html','modules/chronicles.html'])){
 let s=read(file).replaceAll('bow-v071.css','bow-v072.css').replaceAll('BUILD 0.7.1','BUILD 0.7.2').replaceAll('0.7.1 ·','0.7.2 ·').replaceAll('PROTOCOL / 0.7.0','PROTOCOL / 0.7.2').replaceAll('PROTOCOL / V0.6.0','PROTOCOL / V0.7.2');write(file,s);
}
write('styles/bow-v072.css',read('styles/bow-v071.css')+'\n'+read('styles/spatial-v072.css'));
write('src/unified-engine-v060.js',read('src/unified-engine-v060.js').replace('RE 0.7.1 UROBOROS ASCENSION','RE 0.7.2 UROBOROS ASCENSION'));
const deploy=JSON.parse(read('docs/deployment.json'));deploy.version=V;deploy.developmentBranch='codex/v0.7.2-spatial-completion';deploy.verificationManifest='docs/RELEASE_MANIFEST_v0.7.2.json';write('docs/deployment.json',deploy);
console.log('0.7.2 application; unchanged 0.7.1 catalog data and context contract retained.');
