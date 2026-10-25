#!/usr/bin/env python3
"""Link exact, candidate and documentary source groups without merging their claims."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'modules/fidelity-r26/dossier-index.json'


def build():
    def read(path):
        return json.loads((ROOT / path).read_text(encoding='utf-8'))
    roster = read('data/roster.json')['catalog']
    identities = {item['id']: {'id': item['id'], 'models': [], 'audioReferences': [], 'audioCandidates': [], 'canonicalReferences': [], 'poseSheets': []} for item in roster}
    paths = ['modules/fidelity-r26/models/catalog.json']
    for model in read(paths[0])['entries']:
        exact, candidate = model.get('subjectId'), model.get('candidateUid')
        uid = exact or candidate
        if uid not in identities:
            if exact:
                raise ValueError('Unknown exact model identity')
            continue
        identities[uid]['models'].append({'id': model['id'], 'label': model['label'],
            'relation': 'exact' if exact else 'candidate', 'modelRole': model.get('modelRole', 'reference'),
            'platform': model.get('platform', ''), 'href': 'models/index.html?model=' + quote(model['id'], safe='')})
    sheets_path = 'modules/fidelity-r26/sprites/manifest.json'
    if (ROOT / sheets_path).exists():
        sheets = read(sheets_path)
        models = {entry['id']: entry for entry in read(paths[0])['entries']}
        if sheets.get('schema') != 're.bow.source-pose-sheets/1' or sheets.get('originalGameSprites') != 0 or sheets.get('combatReadySprites') != 0:
            raise ValueError('Unsupported pose sheet certification')
        paths.append(sheets_path)
        for sheet in sheets['entries']:
            model = models.get(sheet['id'])
            if not model or sheet.get('sourceModelSha256') != model['model']['sha256'] or sheet.get('originalGameSprite') is not False or sheet.get('combatReady') is not False:
                raise ValueError('Pose sheet differs from its source model')
            exact, candidate = model.get('subjectId'), model.get('candidateUid')
            uid = exact or candidate
            if uid not in identities:
                raise ValueError('Unknown pose sheet identity')
            identities[uid]['poseSheets'].append({'id': sheet['id'], 'label': sheet['label'], 'relation': 'exact' if exact else 'candidate',
                'originalGameSprite': False, 'combatReady': False, 'href': 'sprites/index.html?model=' + quote(sheet['id'], safe='')})
    for release in ('r25', 'r26'):
        source_path = f'modules/fidelity-{release}/audio/manifest.json'
        if not (ROOT / source_path).exists():
            continue
        paths.append(source_path)
        audio = read(source_path)
        counts, candidates = Counter(), Counter()
        for entry in audio['entries']:
            if entry.get('native_bank_certified') is not False or entry.get('canonical_fidelity_certified') is not False:
                raise ValueError('Unsupported native audio certification')
            uid = entry.get('identity_id')
            if uid:
                if uid not in identities or entry.get('assignment_status') != 'PUBLISHED_SUBJECT_GROUP_WITH_GAME_CONTEXT':
                    raise ValueError('Unknown or unproven audio identity assignment')
                counts[uid] += 1
            else:
                assigned = entry.get('candidate_identity_ids', [])
                if not isinstance(assigned, list) or len(set(assigned)) != len(assigned) or any(uid not in identities for uid in assigned):
                    raise ValueError('Unknown candidate audio identity')
                for candidate in assigned:
                    candidates[candidate] += 1
        prefix = '' if release == 'r26' else '../fidelity-r25/'
        for count_set, key, scope in [(counts, 'audioReferences', 'publisher-subject-group'), (candidates, 'audioCandidates', 'ambiguous-publisher-subject-group')]:
            for uid, count in count_set.items():
                identities[uid][key].append({'clips': count, 'release': release.upper(), 'scope': scope,
                    'independentListeningCompleted': False, 'href': prefix + 'audio/index.html?identity=' + quote(uid, safe='')})
    for release in ('r23', 'r24', 'r25', 'r26'):
        source_path = f'modules/fidelity-{release}/canonical/manifest.json'
        if not (ROOT / source_path).exists():
            continue
        paths.append(source_path)
        pack = read(source_path)
        claims = [claim for entry in pack['entries'] for claim in entry.get('claims', [])] if release == 'r23' else pack['claims']
        counts = Counter(claim['uid'] for claim in claims)
        prefix = '' if release == 'r26' else f'../fidelity-{release}/'
        for uid, count in counts.items():
            if uid not in identities:
                raise ValueError('Unknown documentary identity')
            identities[uid]['canonicalReferences'].append({'claims': count, 'release': release.upper(), 'scope': 'quoted-documentary-evidence',
                'href': prefix + 'canonical/index.html#' + quote(uid, safe='')})
    return {'schema': 're.bow.dossier-source-index/2', 'canonicalFidelityCertified': False,
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
        'with_audio': sum(bool(i['audioReferences']) for i in index['identities']),
        'with_candidate_audio': sum(bool(i['audioCandidates']) for i in index['identities']),
        'with_claims': sum(bool(i['canonicalReferences']) for i in index['identities'])}))


if __name__ == '__main__':
    main()
