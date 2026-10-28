#!/usr/bin/env python3
"""Apply explicitly reviewed native-loop observations; never infer action from clip codes."""
import argparse
import copy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r30/native/revelations'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def verified(record):
    path = (ROOT / record['path']).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file() or sha(path.read_bytes()) != record['sha256']:
        raise ValueError('Changed review evidence: ' + record['path'])
    return path


def apply(manifest):
    review_path = PACK / 'review/observations.json'
    review_raw = review_path.read_bytes()
    review = json.loads(review_raw)
    if review['schema'] != 're.bow.native-revelations-visual-review-r30/1' or review['sourceClipsEdited'] or review['nativePngsEdited']:
        raise ValueError('Wrong manual observation scope')
    verified(review['renderer'])
    for observation in review['observations']:
        uid = observation['subjectId']
        entries = [entry for entry in manifest['entries'] if entry['subjectId'] == uid]
        if len(entries) != 2 or {e['sourceFacing'] for e in entries} != {'left', 'right'}:
            raise ValueError('Actual source camera pair required')
        verified(observation['contact'])
        evidence = [{'entryId': entry['id'], 'pngs': [{'path': f['path'], 'sha256': f['sha256']}
                     for f in entry['frames'] + [entry['endpoint']]]} for entry in entries]
        if sha(json.dumps(evidence, sort_keys=True, separators=(',', ':')).encode()) != observation['sequencePngEvidenceSha256']:
            raise ValueError('The visually reviewed native sequence bytes changed')
        neutral = observation['observedNeutralLoopReviewed']
        if neutral:
            measured = observation['measurements']
            if (observation['actionIdentity'] != 'observed-neutral-loop' or not observation['continuityVerified']
                or not observation['fightingPoseReviewed'] or not observation['fullBodyReviewed']
                or measured['playbackSeamBodyHeightRatio'] > .01
                or measured['playbackSeamToMaximumAdjacentRatio'] > 1.05
                or measured['nativeMovingBoneCount'] < 3):
                raise ValueError('Observed neutral loop requires an actual multi-bone continuous source cycle')
        for entry in entries:
            if (entry['nativeSource']['clip']['sha256'] != observation['nativeClipSha256']
                or entry['admittedTargetEdition'] is not False or entry['admittedCombatStates'] != []
                or entry['sampleRate'] != 60 or entry['fullNativeDuration'] is not True):
                raise ValueError('Wrong source edition/clip/sampling contract')
            for key in ['fullBodyReviewed', 'observedNeutralLoopReviewed', 'fightingPoseReviewed',
                        'continuityVerified', 'actionIdentity', 'sourceActionCertified', 'originalIdleActionCertified']:
                entry[key] = copy.deepcopy(observation[key])
            entry['actionVerified'] = False
            entry['selectablePresentationVariant'] = neutral
            entry['variantFamilyId'] = uid + '--pc-hd2013-neutral' if neutral else None
            entry['variantCombatStates'] = ['idle'] if neutral else []
            entry['reviewStatus'] = 'visually-reviewed-native-loop' if neutral else 'visually-reviewed-native-study'
            entry['visualReview'] = {'path': review_path.relative_to(ROOT).as_posix(), 'sha256': sha(review_raw),
                                    'subjectId': uid, 'notes': observation['notes']}
            entry['continuityMeasurements'] = copy.deepcopy(observation['measurements'])
            entry['sourceActionCertified'] = False
    manifest['counts']['observedNeutralVariantSubjects'] = len({e['subjectId'] for e in manifest['entries'] if e['selectablePresentationVariant']})
    manifest['counts']['selectableNeutralVariantSequences'] = sum(e['selectablePresentationVariant'] for e in manifest['entries'])
    manifest['counts']['sourceActionCertified'] = 0
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    path = PACK / 'manifest.json'
    current = json.loads(path.read_text())
    result = apply(copy.deepcopy(current))
    if args.check:
        if result != current:
            raise ValueError('Manual native-loop observations are not applied')
    else:
        path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result['counts']))


if __name__ == '__main__':
    main()
