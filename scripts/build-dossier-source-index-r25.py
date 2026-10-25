#!/usr/bin/env python3
"""Make a compact, attributed index for source links in catalogue Dossiers."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'modules/fidelity-r25/dossier-index.json'


def build():
    def read(path):
        return json.loads((ROOT / path).read_text(encoding='utf-8'))
    roster = read('data/roster.json')['catalog']
    identities = {item['id']: {'id': item['id'], 'models': [], 'audio': None, 'canonical': None} for item in roster}
    paths = ['modules/fidelity-r25/models/catalog.json']
    for model in read(paths[0])['entries']:
        exact, candidate = model.get('subjectId'), model.get('candidateUid')
        uid = exact or candidate
        if uid not in identities:
            if exact:
                raise ValueError('Unknown exact model identity')
            continue
        identities[uid]['models'].append({'id': model['id'], 'label': model['label'],
            'relation': 'exact' if exact else 'candidate', 'modelRole': model.get('modelRole', 'reference'),
            'href': 'models/index.html?model=' + quote(model['id'], safe='')})
    audio_path = 'modules/fidelity-r25/audio/manifest.json'
    if (ROOT / audio_path).exists():
        paths.append(audio_path)
        audio = read(audio_path)
        counts = Counter()
        for entry in audio['entries']:
            uid = entry.get('identity_id')
            if uid not in identities or entry.get('assignment_status') != 'PUBLISHED_SUBJECT_GROUP_WITH_GAME_CONTEXT':
                raise ValueError('Unknown or unproven audio identity assignment')
            if entry.get('native_bank_certified') is not False or entry.get('canonical_fidelity_certified') is not False:
                raise ValueError('Unsupported native audio certification')
            counts[uid] += 1
        if sum(counts.values()) != audio['counts']['documentary_clips']:
            raise ValueError('Audio count differs from its evidence')
        for uid, count in counts.items():
            identities[uid]['audio'] = {'clips': count, 'scope': 'publisher-subject-group',
                'independentListeningCompleted': False, 'href': 'audio/index.html?identity=' + quote(uid, safe='')}
    canonical_path = 'modules/fidelity-r25/canonical/manifest.json'
    if (ROOT / canonical_path).exists():
        paths.append(canonical_path)
        counts = Counter(claim['uid'] for claim in read(canonical_path)['claims'])
        for uid, count in counts.items():
            if uid not in identities:
                raise ValueError('Unknown documentary identity')
            identities[uid]['canonical'] = {'claims': count, 'scope': 'quoted-documentary-evidence',
                'href': 'canonical/index.html#' + quote(uid, safe='')}
    return {'schema': 're.bow.dossier-source-index/1', 'canonicalFidelityCertified': False,
        'inputs': [{'path': p, 'sha256': hashlib.sha256((ROOT/p).read_bytes()).hexdigest()} for p in paths],
        'identities': list(identities.values())}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    index = build()
    if args.check:
        if json.loads(TARGET.read_text()) != index:
            raise ValueError('Dossier source index differs from verified manifests')
    else:
        TARGET.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'identities': len(index['identities']),
        'with_models': sum(bool(i['models']) for i in index['identities']),
        'with_audio': sum(bool(i['audio']) for i in index['identities']),
        'with_new_claims': sum(bool(i['canonical']) for i in index['identities'])}))


if __name__ == '__main__':
    main()
