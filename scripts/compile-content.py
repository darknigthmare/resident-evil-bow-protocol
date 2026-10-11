#!/usr/bin/env python3
"""Validate and compile editable release snapshots to browser JavaScript."""
from __future__ import annotations
from pathlib import Path
import copy,json
ROOT=Path(__file__).resolve().parents[1]
SLOTS=['light','heavy','low','throw','special','specialDown','specialForward','specialBack','super','utility']; LEVELS={'canonical','anatomical','simulation'}
def read(name): return json.loads((ROOT/name).read_text(encoding='utf-8'))
def deep_merge(base,override):
    result=copy.deepcopy(base)
    for key,value in (override or {}).items():
        result[key]=deep_merge(result[key],value) if isinstance(value,dict) and isinstance(result.get(key),dict) else copy.deepcopy(value)
    return result
def runtime(path,prefix,value): (ROOT/path).write_text(prefix+json.dumps(value,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
package=read('package.json'); version=package['version']; roster=read('data/roster.json'); chronicles=read('data/chronicles.json'); finishers=read('data/finishers-v053.json'); lore=read('data/lore-movesets.json')
profiles=lore.get('profiles',{}); fighters=roster.get('fighters',[]); ids=[f['uid'] for f in fighters]; expected=len(fighters); expected_moves=expected*len(SLOTS)
if not expected or len(set(ids))!=expected: raise SystemExit('Playable incarnation identifiers must be unique')
if set(ids)!=set(profiles): raise SystemExit('Lore profile coverage does not match roster')
counts={'canonical':0,'anatomical':0,'simulation':0}
for fighter in fighters:
    profile=profiles[fighter['uid']]; fighter['role']=fighter['combat']['role']=profile['role']; fighter['canonicalAttacks']=copy.deepcopy(profile.get('canonicalAttacks',[])); fighter['fidelity']=copy.deepcopy(profile['fidelity'])
    fighter['combat'].update({'resource':copy.deepcopy(profile['resource']),'passive':copy.deepcopy(profile['passive']),'sources':copy.deepcopy(profile.get('sources',[])),'fidelity':copy.deepcopy(profile['fidelity']),'canonicalAttacks':copy.deepcopy(profile.get('canonicalAttacks',[])),'evidence':'lore-audited'})
    compiled={}
    for slot in SLOTS:
        if slot not in fighter['combat']['moves'] or slot not in profile['moves']: raise SystemExit(f"{fighter['uid']}: missing {slot}")
        m=deep_merge(fighter['combat']['moves'][slot],profile['moves'][slot]); evidence=m.get('evidence',m.get('lore'))
        if evidence not in LEVELS: raise SystemExit(f"{fighter['uid']}::{slot}: invalid evidence")
        m['evidence']=m['lore']=evidence; m['id']=f"{fighter['uid']}::{slot}"; m['slot']=slot; compiled[slot]=m; counts[evidence]+=1
    fighter['combat']['moves']=compiled
if sum(counts.values())!=expected_moves: raise SystemExit(f'Expected {expected_moves} compiled techniques')
finisher_count=sum(len(p.get('finishers',[])) for p in finishers.get('profiles',{}).values())
base={'fighters':expected,'stories':len(chronicles.get('stories',{})),'authored':len(chronicles.get('stories',{})),'structured':len(chronicles.get('stories',{})),'duels':len(chronicles.get('stories',{}))*8,'introPanels':len(chronicles.get('stories',{}))*3,'outroPanels':len(chronicles.get('stories',{}))*3,'paragraphs':len(chronicles.get('stories',{}))*6,'illustratedPortraits':expected,'paintedArenas':len(roster.get('stages',[])),'catalog':len(roster.get('catalog',[])),'finishers':finisher_count,'loreProfiles':expected,'loreMoves':expected_moves,'canonicalMoves':counts['canonical'],'anatomicalMoves':counts['anatomical'],'simulationMoves':counts['simulation']}
roster['version']=version; roster['loreSchema']=lore['schema']; roster['counts'].update(base)
chronicles['version']=version; chronicles['sourceVersion']=version; chronicles['fighters']=copy.deepcopy(fighters); chronicles['counts']=copy.deepcopy(roster['counts'])
finishers['version']=version; finishers['fighterCount']=expected; finishers['finisherCount']=finisher_count
for p,d in [('data/roster.json',roster),('data/chronicles.json',chronicles),('data/finishers-v053.json',finishers)]: (ROOT/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
runtime('src/re-data.js','window.RE_DATA=',roster); runtime('src/chronicles-data-v060.js','window.CQC55_DATA=',chronicles); runtime('src/finishers-v053.js','globalThis.CQC_FINISHERS_053=',finishers)
print(json.dumps({'version':version,'fighters':expected,'moves':expected_moves,'evidence':counts,'stories':len(chronicles.get('stories',{})),'finishers':finisher_count},ensure_ascii=False))
