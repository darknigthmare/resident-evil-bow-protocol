#!/usr/bin/env python3
"""Rebuild the editable per-incarnation lore contract from data/roster.json.

The compiled roster is the release snapshot. This exporter keeps the explicit
three-level evidence model used by B.O.W. Protocol 0.2.0:
canonical, anatomical and simulation. It does not infer new powers.
"""
from __future__ import annotations
from pathlib import Path
import copy, json

ROOT = Path(__file__).resolve().parents[1]
ROSTER = json.loads((ROOT / 'data/roster.json').read_text(encoding='utf-8'))
SLOTS = ['light','heavy','low','throw','special','specialDown','specialForward','specialBack','super','utility']
LEVELS = {'canonical','anatomical','simulation'}
profiles = {}
counts = {'fighters': len(ROSTER['fighters']), 'moves': 0, 'canonical': 0, 'anatomical': 0, 'simulation': 0}
for fighter in ROSTER['fighters']:
    moves = {}
    for slot in SLOTS:
        move = copy.deepcopy(fighter['combat']['moves'][slot])
        move.pop('id', None); move.pop('slot', None)
        evidence = move.get('evidence', move.get('lore', 'simulation'))
        if evidence not in LEVELS:
            raise SystemExit(f"{fighter['uid']}::{slot}: unsupported evidence {evidence}")
        move['evidence'] = move['lore'] = evidence
        if not move.get('source'):
            move['source'] = fighter.get('reference') or fighter['combat']['sources'][0]
        moves[slot] = move
        counts['moves'] += 1; counts[evidence] += 1
    profiles[fighter['uid']] = {
        'uid': fighter['uid'],
        'incarnation': fighter['ep'],
        'role': fighter['combat']['role'],
        'resource': copy.deepcopy(fighter['combat']['resource']),
        'passive': copy.deepcopy(fighter['combat']['passive']),
        'source': fighter.get('reference') or fighter['combat']['sources'][0],
        'sources': copy.deepcopy(fighter['combat'].get('sources', [])),
        'canonicalAttacks': copy.deepcopy(fighter.get('canonicalAttacks', [])),
        'fidelity': copy.deepcopy(fighter.get('fidelity') or fighter['combat']['fidelity']),
        'moves': moves,
    }
payload = {
    'schema': 're.bow.lore-movesets/2', 'version': '0.2.0',
    'evidenceLevels': {
        'canonical': 'Attaque ou comportement directement documenté/observé pour cette incarnation.',
        'anatomical': 'Variation soutenue par l’anatomie et les comportements de la même incarnation.',
        'simulation': 'Traduction nécessaire au système de duel, explicitement non revendiquée comme canonique.',
    },
    'documentation': {
        'officialEncyclopedia': 'https://game.capcom.com/residentevil/en/exfile.html',
        'policy': 'Une incarnation ne reçoit ni forme, ni arme, ni pouvoir provenant d’une autre phase ou d’un autre épisode.',
    },
    'counts': counts, 'profiles': profiles,
}
(ROOT / 'data/lore-movesets.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(counts, ensure_ascii=False))
