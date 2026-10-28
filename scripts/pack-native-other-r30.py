#!/usr/bin/env python3
"""Bind native static views and held full-duration motion studies into one R30 lot."""
import copy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOT = 'modules/fidelity-r30/native/other-games'


def read(path):
    return json.loads((ROOT / path).read_text())


def proof(path):
    raw = (ROOT / path).read_bytes()
    return {'path': path, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def verify(record):
    actual = proof(record['path'])
    if actual['sha256'] != record['sha256'] or record.get('bytes', actual['bytes']) != actual['bytes']:
        raise ValueError('Changed native evidence: ' + record['path'])


def build():
    renders = read(LOT + '/renders.json')
    observations = read(LOT + '/review/static-observations.json')
    reviews = {entry['modelId']: entry for entry in observations['entries']}
    roster = {entry['id']: entry for entry in read('data/roster.json')['catalog']}
    static_review = proof(LOT + '/review/static-observations.json')
    entries = []
    for source in renders['entries']:
        observed = reviews[source['modelId']]
        if observed['sourceModelSha256'] != source['model']['sha256']:
            raise ValueError('A reviewed native source model changed.')
        for view in source['views']:
            verify(view)
            if {'path': view['path'], 'sha256': view['sha256'], 'angle': view['angle']} not in observed['reviewedViews']:
                raise ValueError('Unreviewed source view.')
            facing = {0: 'front', 90: 'left', 180: 'unknown', 270: 'right'}[view['angle']]
            neutral = observed['poseKind'] == 'neutral-stance' and facing in ('left', 'right')
            exact_edition = source['modelId'] not in {
                're4-dr-salvador-pc-published', 're4-del-lago-pc-published',
                're4-el-gigante-pc-published', 're0-proto-tyrant-gc-r26-1'}
            gaps = [] if neutral and exact_edition else [observed['note']]
            admitted = neutral and exact_edition and not gaps
            variant = ('Zombie 1 — manteau vert, PlayStation 1996'
                       if source['subjectId'] == 're1-zombie' else source['label'])
            frame = {key: view[key] for key in ('path', 'width', 'height', 'bytes', 'sha256', 'bounds')}
            frame['seconds'] = 0
            frame['pivot'] = source['views'][source['views'].index(view)]['pivot']
            entries.append({
                'id': source['subjectId'] + '--native-' + source['modelId'] + '--' + str(view['angle']),
                'subjectId': source['subjectId'], 'modelId': source['modelId'],
                'label': roster[source['subjectId']]['name'] + ' — ' + variant,
                'game': roster[source['subjectId']]['game'],
                'sourceEdition': source['sourceEdition'], 'sourceVariantLabel': variant,
                'sourcePage': source['sourcePage'], 'admittedTargetEdition': exact_edition,
                'kind': 'native-static-pose', 'animated': False, 'sourceFacing': facing,
                'canMirror': False, 'fullBodyReviewed': observed['fullSourceBodyVisible'],
                'fightingPoseReviewed': neutral, 'poseKind': observed['poseKind'],
                'actionIdentity': 'neutral-stance' if neutral else 'unassigned',
                'actionVerified': False, 'continuityVerified': False,
                'admittedCombatStates': ['idle'] if admitted else [],
                'availableCombatStates': ['idle'] if admitted else [],
                'knownAppearanceGaps': gaps, 'canonicalFidelityCertified': False,
                'originalGameFrames': False, 'frameCount': 1, 'sampleRate': 0,
                'durationSeconds': 0, 'fullNativeDuration': False,
                'pivot': view['pivot'], 'pivotScope': view['pivotScope'],
                'referenceBounds': view['bounds'], 'frames': [frame],
                'nativeSource': {key: source[key] for key in ('sourceCatalog', 'model', 'materials', 'textures')},
                'sourceReview': static_review, 'sourceReviewNote': observed['note'],
                'sourceBytesRewritten': False, 'sourceTransformsChanged': False,
                'poseChanged': False, 'recipe': source['recipe'],
                'identityCuration': {
                    'retainedCatalogCandidate': source['identityCandidate'],
                    'exactSourceVariantReviewed': source['subjectId'] == 're1-zombie',
                    'note': ('Published source title Zombie 1 (Green Trenchcoat), PlayStation Resident Evil; '
                             'the exact green-coat variant belongs to the generic RE1 zombie catalogue subject. '
                             'No other outfit or remake identity is inferred.') if source['subjectId'] == 're1-zombie' else
                            'Retained exact source identity, or explicit unadmitted candidate/edition hold.'},
                'limitations': ['A single native source pose is a static render, not a true idle animation.',
                                'Source geometry, textures, materials and transforms are retained; shader and camera are this derivation recipe.',
                                'No source silhouette is mirrored, no missing texture or attached equipment is invented.']})
    motions = read(LOT + '/motion-manifest.json')
    motion_review = proof(LOT + '/review/motion-observations.json')
    for entry in motions['entries']:
        item = copy.deepcopy(entry)
        item.update(fullBodyReviewed=True, fightingPoseReviewed=False,
                    admittedCombatStates=[], availableCombatStates=[],
                    actionIdentity='unassigned', actionVerified=False,
                    sourceReview=motion_review, continuityVerified=False)
        item['game'] = 'Resident Evil Revelations — édition HD/PC (2013)'
        item['sourceVariantLabel'] = 'PC / HD 2013 — mouvement natif étudié, idle de combat non admis'
        item['sourceReviewNote'] = ('Native underwater/hovering body pose; no dry-ground fighting stance is verified.'
                                   if item['subjectId'] == 'rerev-sea-creeper' else
                                   'Native full-body motion has curled/raised legs across the source cycle; a grounded neutral combat stance is not verified.')
        item['knownAppearanceGaps'] = [item['sourceReviewNote']]
        entries.append(item)
    result = {
        'schema': 're.bow.native-2d-lot-r30/1', 'release': 'R30', 'lot': 'other-games',
        'inputs': [proof(LOT + '/renders.json'), proof(LOT + '/motion-manifest.json'),
                   proof(LOT + '/portrait-renders.json'), static_review, motion_review,
                   proof(LOT + '/sources.json'), proof(LOT + '/motion-sources.json')],
        'counts': {'subjects': len({entry['subjectId'] for entry in entries}),
                   'staticSourceModels': len(renders['entries']),
                   'nativeStaticViews': sum(len(source['views']) for source in renders['entries']),
                   'portraitOnlyNativeViews': sum(len(source['views']) for source in read(LOT + '/portrait-renders.json')['entries']),
                   'admittedStaticPoses': sum(entry['kind'] == 'native-static-pose' and entry['admittedCombatStates'] == ['idle'] for entry in entries),
                   'nativeClips': len({entry['clipId'] for entry in entries if entry['kind'] == 'native-sequence'}),
                   'orientedNativeSequences': sum(entry['kind'] == 'native-sequence' for entry in entries),
                   'nativeRenderedMotionFrames': sum(len(entry['frames']) for entry in entries if entry['kind'] == 'native-sequence'),
                   'endpointReferenceFrames': sum(entry['kind'] == 'native-sequence' for entry in entries),
                   'admittedAnimatedIdleSequences': 0, 'originalGameFrames': 0,
                   'heldTextureFailureModels': len(read(LOT + '/render-failures.json')['entries'])},
        'sourceFilesRewritten': False, 'canonicalFidelityCertified': False,
        'scope': 'Native static source poses and complete source motion studies; four oriented static neutral poses are usable. Static poses are never counted as true idle animations; the two Revelations native motion studies remain held from grounded combat.',
        'entries': entries}
    return result


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    result = build()
    payload = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    output = ROOT / LOT / 'manifest.json'
    if args.check:
        if output.read_text() != payload:
            raise SystemExit('Native other-game manifest differs from reviewed source evidence.')
    else:
        output.write_text(payload)
    print(json.dumps(result['counts']))
