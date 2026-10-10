#!/usr/bin/env python3
"""Compile the editable 0.2.0 release snapshots to browser JavaScript.

`data/roster.json`, `data/chronicles.json`, `data/finishers-v053.json` and
`data/lore-movesets.json` are the source-of-truth files for this release.
The compiler validates and merges the lore contract before serializing the
three runtime payloads. It intentionally performs no undocumented inference.
"""
from __future__ import annotations
from pathlib import Path
import copy, json

ROOT = Path(__file__).resolve().parents[1]
SLOTS = ['light','heavy','low','throw','special','specialDown','specialForward','specialBack','super','utility']
LEVELS = {'canonical','anatomical','simulation'}

def read(name): return json.loads((ROOT / name).read_text(encoding='utf-8'))
def write(name, value): (ROOT / name).write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
def deep_merge(base, override):
    result = copy.deepcopy(base)
    for key, value in (override or {}).items():
        if isinstance(value, dict) and isinstance(result.get(key), dict): result[key] = deep_merge(result[key], value)
        else: result[key] = copy.deepcopy(value)
    return result

roster, chronicles, finishers, lore = read('data/roster.json'), read('data/chronicles.json'), read('data/finishers-v053.json'), read('data/lore-movesets.json')
profiles = lore.get('profiles', {})
fighters = roster.get('fighters', [])
ids = [f['uid'] for f in fighters]
if len(ids) != 75 or len(set(ids)) != 75: raise SystemExit('Expected 75 unique playable incarnations')
if set(ids) != set(profiles): raise SystemExit('Lore profile coverage does not match roster')
counts = {'canonical': 0, 'anatomical': 0, 'simulation': 0}
for fighter in fighters:
    profile = profiles[fighter['uid']]
    fighter['role'] = fighter['combat']['role'] = profile['role']
    fighter['canonicalAttacks'] = copy.deepcopy(profile.get('canonicalAttacks', []))
    fighter['fidelity'] = copy.deepcopy(profile['fidelity'])
    fighter['combat']['resource'] = copy.deepcopy(profile['resource'])
    fighter['combat']['passive'] = copy.deepcopy(profile['passive'])
    fighter['combat']['sources'] = copy.deepcopy(profile.get('sources', []))
    fighter['combat']['fidelity'] = copy.deepcopy(profile['fidelity'])
    fighter['combat']['canonicalAttacks'] = copy.deepcopy(profile.get('canonicalAttacks', []))
    fighter['combat']['evidence'] = 'lore-audited'
    compiled = {}
    for slot in SLOTS:
        if slot not in fighter['combat']['moves'] or slot not in profile['moves']:
            raise SystemExit(f"{fighter['uid']}: missing {slot}")
        move = deep_merge(fighter['combat']['moves'][slot], profile['moves'][slot])
        evidence = move.get('evidence', move.get('lore'))
        if evidence not in LEVELS: raise SystemExit(f"{fighter['uid']}::{slot}: invalid evidence")
        move['evidence'] = move['lore'] = evidence
        move['id'], move['slot'] = f"{fighter['uid']}::{slot}", slot
        compiled[slot] = move; counts[evidence] += 1
    fighter['combat']['moves'] = compiled
if sum(counts.values()) != 750: raise SystemExit('Expected 750 compiled techniques')
roster['version'] = '0.2.0'; roster['loreSchema'] = lore['schema']
roster['counts'].update({'fighters':75,'loreProfiles':75,'loreMoves':750,'canonicalMoves':counts['canonical'],'anatomicalMoves':counts['anatomical'],'simulationMoves':counts['simulation']})
chronicles['version'] = '0.2.0'; chronicles['fighters'] = copy.deepcopy(fighters); chronicles['counts'] = copy.deepcopy(roster['counts'])
finishers['version'] = '0.2.0'; finishers['fighterCount'] = 75; finishers['finisherCount'] = 300
(ROOT / 'data/roster.json').write_text(json.dumps(roster, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(ROOT / 'data/chronicles.json').write_text(json.dumps(chronicles, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(ROOT / 'data/finishers-v053.json').write_text(json.dumps(finishers, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
write('src/re-data.js.tmp', roster); (ROOT/'src/re-data.js').write_text('window.RE_DATA=' + (ROOT/'src/re-data.js.tmp').read_text(encoding='utf-8').strip() + ';\n', encoding='utf-8'); (ROOT/'src/re-data.js.tmp').unlink()
write('src/chronicles-data-v060.js.tmp', chronicles); (ROOT/'src/chronicles-data-v060.js').write_text('window.CQC55_DATA=' + (ROOT/'src/chronicles-data-v060.js.tmp').read_text(encoding='utf-8').strip() + ';\n', encoding='utf-8'); (ROOT/'src/chronicles-data-v060.js.tmp').unlink()
write('src/finishers-v053.js.tmp', finishers); (ROOT/'src/finishers-v053.js').write_text('globalThis.CQC_FINISHERS_053=' + (ROOT/'src/finishers-v053.js.tmp').read_text(encoding='utf-8').strip() + ';\n', encoding='utf-8'); (ROOT/'src/finishers-v053.js.tmp').unlink()
print(json.dumps({'version':'0.2.0','fighters':75,'moves':750,'evidence':counts,'stories':len(chronicles.get('stories',{})),'finishers':finishers['finisherCount']}, ensure_ascii=False))
