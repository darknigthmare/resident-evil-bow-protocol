#!/usr/bin/env python3
"""Index only new R27 audio/quotes; retain the independent R26 source links."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
PATHS = ['data/roster.json', 'modules/fidelity-r26/dossier-index.json',
         'modules/fidelity-r27/audio/manifest.json', 'modules/fidelity-r27/canonical/manifest.json']


def build(root=ROOT):
    def read(path):
        return json.loads((root / path).read_text())
    roster, previous, audio, canonical = [read(path) for path in PATHS]
    ids = [entry['id'] for entry in roster['catalog']]
    known = set(ids)
    if len(ids) != 389 or len(known) != 389:
        raise ValueError('All 389 catalogue identities are required')
    if (previous.get('schema') != 're.bow.dossier-source-index/2' or len(previous['identities']) != 389
            or {entry['id'] for entry in previous['identities']} != known):
        raise ValueError('The preserved source index must cover all identities')
    sounds, claims = Counter(), Counter()
    clip_ids = set()
    for entry in audio['entries']:
        uid = entry.get('identity_id')
        if (uid not in known or entry.get('assignment_status') != 'PUBLISHED_SUBJECT_GROUP_WITH_GAME_CONTEXT'
                or entry.get('canonical_fidelity_certified') is not False or entry.get('native_bank_certified') is not False
                or entry.get('independent_listening_completed') is not False or entry['clip_id'] in clip_ids):
            raise ValueError('Unknown, repeated or uncertified audio attribution')
        clip_ids.add(entry['clip_id']); sounds[uid] += 1
    claim_ids = set()
    for entry in canonical['claims']:
        uid = entry['uid']
        if uid not in known or entry.get('subject_uid') != uid or entry.get('canonical_fidelity_certified') is not False or entry['id'] in claim_ids:
            raise ValueError('Unknown, repeated or unsupported documentary claim')
        claim_ids.add(entry['id']); claims[uid] += 1
    if (len(audio['entries']) != audio['counts']['documentary_clips']
            or len(canonical['claims']) != canonical['summary']['new_reviewed_claims']):
        raise ValueError('Declared source counts differ from actual entries')
    identities = []
    for uid in ids:
        identities.append({'id': uid,
            'audio': {'clips': sounds[uid], 'scope': 'publisher-subject-group',
                      'independentListeningCompleted': False, 'nativeBankCertified': False,
                      'href': 'audio/index.html?identity=' + quote(uid, safe='')} if sounds[uid] else None,
            'canonical': {'claims': claims[uid], 'scope': 'quoted-documentary-evidence',
                          'directPrimaryCapture': False,
                          'href': 'canonical/index.html#' + quote(uid, safe='')} if claims[uid] else None})
    old_audio = {item['id'] for item in previous['identities'] if item['audioReferences']}
    old_claims = {item['id'] for item in previous['identities'] if item['canonicalReferences']}
    return {'schema': 're.bow.dossier-additions-r27/1', 'canonicalFidelityCertified': False,
            'summary': {'identities': 389, 'newAudioClips': sum(sounds.values()), 'newAudioIdentities': len(sounds),
                        'newClaims': sum(claims.values()), 'newClaimIdentities': len(claims),
                        'cumulativeAudioIdentities': len(old_audio | set(sounds)),
                        'cumulativeClaimIdentities': len(old_claims | set(claims))},
            'inputs': [{'path': path, 'sha256': hashlib.sha256((root / path).read_bytes()).hexdigest()} for path in PATHS],
            'identities': identities}


def main():
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('--check', action='store_true'); args = parser.parse_args()
    result = build(); target = ROOT / 'modules/fidelity-r27/dossier-additions.json'
    raw = (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode()
    if args.check:
        if target.read_bytes() != raw:
            raise ValueError('Dossier additions differ from their source manifests')
    else:
        target.write_bytes(raw)
    print(json.dumps(result['summary']))


if __name__ == '__main__':
    main()
