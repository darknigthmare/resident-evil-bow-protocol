#!/usr/bin/env python3
"""Materialize reviewed R11 source from exact main; historical hashes retained."""
from pathlib import Path
import json,subprocess
R=Path(__file__).resolve().parents[1]
def put(name,a,b):
 p=R/name;s=p.read_text()
 if b in s:return
 assert s.count(a)==1,(name,a[:80]);p.write_text(s.replace(a,b))
for script in ['apply-lucas-r11.py','patch-devices-r11.py','build-lore-movesets.py','compile-content.py']:
 subprocess.run(['python3','scripts/'+script],cwd=R,check=True)
for script in ['contract.mjs','catalog-replay-contract.mjs']:
 subprocess.run(['node','scripts/'+script,'--write'],cwd=R,check=True)
p=R/'tests/r10-baseline.mjs';s=p.read_text()
if 'import {r11Expected}' not in s:
 s="import {r11Expected} from './r11-baseline.mjs';\n"+s
 s=s.replace('return previous;','return r11Expected(root,file,previous);').replace('return e.after;','return r11Expected(root,file,e.after);');p.write_text(s)
for name in ['tests/verify-match-sequences-r8.mjs','tests/verify-delivery-r10.mjs','tests/verify-audit-r9.mjs']:
 p=R/name;s=p.read_text()
 if 'import {r11Expected}' not in s:s="import {r11Expected} from './r11-baseline.mjs';\n"+s
 s=s.replace(',base.files[p],p)',',r11Expected(R,p,base.files[p]),p)')
 s=s.replace(',digest,f);',',r11Expected(R,f,digest),f);').replace(',expected,file);',',r11Expected(R,file,expected),file);');p.write_text(s)
put('tests/verify-combat-stage-r6.mjs',"const different=hash(JSON.stringify(f))!==b.originalProfiles[f.uid];", "if(f.uid==='re7-lucas-baker'){const prev=JSON.parse(read('docs/LUCAS_R11_PRESERVATION.json'));assert.equal(prev.profiles[f.uid],b.originalProfiles[f.uid]);continue;}const different=hash(JSON.stringify(f))!==b.originalProfiles[f.uid];")
put('tests/verify-combat-stage-r6.mjs','assert.equal(same,111);return{unchanged:111,changed:4}', 'assert.equal(same,110);return{unchangedSinceR6:110,r6Changed:4,r11Changed:1}')
put('tests/verify-combat-stage-r6.mjs','Only four reviewed production profiles change; 111 remaining definitions are exact','Historical R6 changes preserved; only documented human Lucas changes in R11')
p=R/'package.json';d=json.loads(p.read_text())
if 'verify-lucas-r11' not in d['scripts']['verify']:d['scripts']['verify']+=' && node tests/verify-lucas-r11.mjs'
d['scripts']['compile:content']='python3 scripts/compile-content.py && node scripts/contract.mjs --write && node scripts/catalog-replay-contract.mjs --write'
p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
subprocess.run(['node','scripts/finalize-lucas-r11.mjs'],cwd=R,check=True)
print('Reviewed R11 source materialized; full QA must pass before publication.')
