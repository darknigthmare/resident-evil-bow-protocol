#!/usr/bin/env python3
"""Keep exact R28 sprite, quotation and strictly scoped audio links reachable."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUTS = ['data/roster.json', 'modules/fidelity-r28/sprites/manifest.json',
          'modules/fidelity-r28/canonical/manifest.json', 'modules/fidelity-r28/audio/manifest.json']
OUTPUT = ROOT / 'modules/fidelity-r28/dossier-additions.json'


def build():
    roster, sprites, canonical, audio = [json.loads((ROOT / path).read_text()) for path in INPUTS]
    ids = [row['id'] for row in roster['catalog']]; known = set(ids)
    if len(ids) != 389 or len(known) != 389:
        raise ValueError('Exact catalogue identities are required')
    generated = {row['id']: row for row in sprites['sprites']}
    if len(generated) != len(sprites['sprites']) or not set(generated) <= known:
        raise ValueError('Unknown or duplicate generated sprite identity')
    claims = Counter(row['uid'] for row in canonical['claims'])
    assigned, candidates, clip_ids = Counter(), Counter(), set()
    candidate_clips = set()
    for row in audio['entries']:
        if row['clip_id'] in clip_ids or row.get('canonical_fidelity_certified') is not False or row.get('independent_listening_completed') is not False:
            raise ValueError('Duplicate or over-certified audio clip')
        clip_ids.add(row['clip_id'])
        uid = row['identity_id']; targets = row['candidate_identity_ids']
        if uid is not None:
            if uid != 're3r-licker' or targets or row['assignment_status'] != 'PUBLISHED_SUBJECT_GROUP_WITH_GAME_CONTEXT':
                raise ValueError('Unsupported exact R28 audio attribution')
            assigned[uid] += 1
        else:
            if not targets or not set(targets) <= {'re3r-ne-alpha-parasite', 're3r-nemesis', 're3r-stage-2-nemesis', 're3r-stage-3-nemesis'} or row['assignment_status'] != 'PUBLISHED_GROUP_ONLY_FORM_OR_HOST_UNRESOLVED':
                raise ValueError('Unsupported R28 candidate attribution')
            candidate_clips.add(row['clip_id']); candidates.update(targets)
    entries = []
    for uid in ids:
        sprite = generated.get(uid)
        pose = None
        if sprite:
            if sprite['reviewStatus'] != 'visually-reviewed' or sprite.get('canonicalFidelityCertified') is not False:
                raise ValueError('Unreviewed or over-certified sprite')
            pose = {'fullBodyReviewed': sprite['fullBodyReviewed'], 'poseKind': sprite['poseKind'],
                    'availableStates': sprite['availableStates'], 'sourceFacing': sprite['sourceFacing'],
                    'scope': sprite['scope'], 'revisedBodyR28': uid in sprites['replacements'],
                    'knownAppearanceGaps': sprite.get('knownAppearanceGaps', []),
                    'equipmentCompletenessReviewed': sprite.get('equipmentCompletenessReviewed', False)}
        entries.append({'id': uid, 'sprite': pose, 'canonicalClaims': claims[uid], 'assignedAudioClips': assigned[uid], 'candidateAudioClips': candidates[uid]})
    return {'schema': 're.bow.dossier-additions-r28/1', 'canonicalFidelityCertified': False,
            'summary': {'identities': len(ids), 'generatedSprites': len(generated), 'completeBodiesReviewed': sum(row['fullBodyReviewed'] for row in generated.values()),
                        'revisedBodies': len(sprites['replacements']), 'canonicalClaims': sum(claims.values()), 'canonicalIdentities': len(claims),
                        'assignedAudioClips': sum(assigned.values()), 'assignedAudioIdentities': len(assigned),
                        'candidateAudioClips': len(candidate_clips), 'candidateAudioIdentities': len(candidates)},
            'inputs': [{'path': path, 'sha256': hashlib.sha256((ROOT / path).read_bytes()).hexdigest()} for path in INPUTS], 'identities': entries}


def main():
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('--check', action='store_true'); args = parser.parse_args()
    value = build(); raw = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
    if args.check:
        if OUTPUT.read_bytes() != raw:
            raise ValueError('R28 Dossier index differs from its exact source manifests')
    else:
        OUTPUT.write_bytes(raw)
    print(json.dumps(value['summary']))


if __name__ == '__main__':
    main()
