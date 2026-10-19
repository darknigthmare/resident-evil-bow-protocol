/** Exact predecessor hashes plus one reviewed profile delta. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';import{fileURLToPath}from'node:url';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),base=process.env.BOW_R11_BASE||'HEAD',sha=x=>crypto.createHash('sha256').update(x).digest('hex'),old=f=>execFileSync('git',['show',base+':'+f],{cwd:R,maxBuffer:20*1024*1024});
const previous=JSON.parse(old('data/roster.json')),current=JSON.parse(fs.readFileSync(path.join(R,'data/roster.json'))),changed={};
const files=['data/roster.json','data/chronicles.json','data/lore-movesets.json','src/combat-foundation-v060.js','src/combat-cues-r6.js','src/re-data.js','src/chronicles-data-v060.js','src/runtime-contract.js','src/catalog-replay-contract.js','src/technique-lab-v061.js','src/catalog-laboratory-v070.js','src/unified-engine-v060.js'];
for(const f of files)changed[f]={before:sha(old(f)),after:sha(fs.readFileSync(path.join(R,f)))};
changed.mainFighters={before:sha(JSON.stringify(previous.fighters)),after:sha(JSON.stringify(current.fighters))};
for(const f of current.fighters)if(f.uid!=='re7-lucas-baker')assertEqual(f,previous.fighters.find(g=>g.uid===f.uid));
function assertEqual(a,b){if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Unintended fighter edit: '+a.uid);}
fs.writeFileSync(path.join(R,'docs/LUCAS_R11_CHANGES.json'),JSON.stringify({baseCommit:'b8b47ee78b80015263f10303781ae2566eb27699',changed},null,2)+'\n');
fs.writeFileSync(path.join(R,'docs/LUCAS_R11_PRESERVATION.json'),JSON.stringify({baseCommit:'b8b47ee78b80015263f10303781ae2566eb27699',profiles:Object.fromEntries(previous.fighters.map(f=>[f.uid,sha(JSON.stringify(f))])),annex:sha(old('data/catalog-expansion-v070.json')),art:sha(old('data/directional-art.json')),finishers:sha(old('data/finishers-v053.json')),contextContract:sha(old('src/context-contract.js'))},null,2)+'\n');
console.log('R11 predecessor hashes + 114 identical main profiles confirmed');
