#!/usr/bin/env python3
"""Create current R34 presentation bindings from genuine reviewed generation receipts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = 'modules/fidelity-r34/assets/manifest.json'
BASE_SPRITES = 'modules/fidelity-r33/combat/manifest.json'
BASE_AVATARS = 'modules/fidelity-r33/selection/manifest.json'


def read(name):
    return json.loads((ROOT / name).read_text())


def ref(name):
    raw = (ROOT / name).read_bytes()
    return {'path': name, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def pose(source):
    item = {key: source[key] for key in ['id', 'label', 'incarnation', 'image', 'bytes', 'sha256', 'format', 'width', 'height',
            'bounds', 'pivot', 'sourceFacing', 'canMirror', 'reviewStatus', 'knownAppearanceGaps']}
    for key in ['fullBodyReviewed', 'completeBodyReferenceVerified', 'fightingPoseReviewed']:
        assert source.get(key) is True, (source['id'], key)
        item[key] = True
    assert source.get('status') == 'GENERATED' and source.get('canonicalFidelityCertified') is False
    assert source['sourceFacing'] == 'right' and not source['knownAppearanceGaps']
    assert source.get('availableStates') == ['idle']
    assert source.get('targetEditionMatched') is True
    item.update(poseKind='neutral-base', scope='combatant-neutral-pose', availableStates=['idle'], fullBodyVisible=True,
                animationFrames=1, animated=False, canonicalFidelityCertified=False, originalIdleAnimationCertified=False,
                originalGameSprite=False, generatedByR34=True, generatedBytesEdited=False, sourceEdition=source['sourceEdition'],
                admittedTargetEdition=True, targetEditionAdmitted=True, sourceKind='generated-whole-body-idle-pose', receipt=source['receipt'])
    return item


def sprite_registry(assets):
    result = read(BASE_SPRITES)
    holds = {item['id']: item for item in assets.get('retainedPresentationHolds', [])}
    result['inheritedR33Counts'] = dict(result['counts'])
    historical = {item['id']: item for item in read('assets/sprites/bow/manifest.json')['sprites']}
    current = {item['id']: item for item in result['sprites']}
    updates, historical_updates = {}, []
    for source in assets['sprites']:
        if source.get('defaultAdmission') is not True:
            continue
        item = pose(source)
        if item['id'] in current:
            updates[item['id']] = item
        elif item['id'] in historical:
            item['replacesHistoricalSha256'] = historical[item['id']]['sha256']
            historical_updates.append(item)
        else:
            raise ValueError('A new pose cannot silently introduce a new catalogue fighter.')
    result['sprites'] = [updates.get(item['id'], item) for item in result['sprites']
                         if item['id'] not in holds or item['id'] in updates]
    result.update(release='R34', historicalReplacements=historical_updates,
                  retainedPresentationHolds=list(holds.values()),
                  r34Inputs=[ref(BASE_SPRITES), ref(ASSETS)],
                  purpose='Source-bound whole-body combat base poses, with preserved incomplete-state fallbacks and no invented idle cycle.')
    # Legacy optional families remain linked to their published base target. If
    # the default has changed, they stay available in the old R33 gallery rather
    # than being re-labelled as a comparison against the new creation.
    updated_ids = set(updates) | set(holds)
    result['sameEditionVariants'] = [item for item in result['sameEditionVariants'] if item['id'] not in updated_ids]
    result['sourceEditionVariants'] = [item for item in result['sourceEditionVariants'] if item['id'] not in updated_ids]
    result['counts'].update(newR34WholeBodyDefaults=len(updates) + len(historical_updates),
                            newR34HistoricalDefaults=len(historical_updates), newR34OriginalIdleCycles=0,
                            newR34GeneratedBasePoses=assets['counts']['newGeneratedIdlePoses'],
                            generatedSprites=len(result['sprites']),
                            retainedPresentationSourceHolds=len(holds),
                            retainedDefaultsHeld=sum(uid in current and uid not in updates for uid in holds))
    # Published R33 counters remain above as provenance. Current counters are
    # derived from current records rather than inherited after replacements.
    result['counts'] = {
        'targetIdentities': result['inheritedR33Counts']['targetIdentities'],
        'generatedSprites': len(result['sprites']), 'historicalBaseSlots': len(historical),
        'inheritedGenerationFailuresPreserved': len(result['failures']),
        'visuallyReviewedSprites': sum(item['reviewStatus'] == 'visually-reviewed' for item in result['sprites']),
        'fullBodyReviewedSprites': sum(item.get('fullBodyReviewed') is True for item in result['sprites']),
        'currentWholeBodyIdleDefaults': sum(item.get('fullBodyReviewed') is True and item.get('availableStates') == ['idle']
                                           for item in result['sprites']) + len(historical_updates),
        **{key: value for key, value in result['counts'].items()
           if key.startswith('newR34') or key in {'retainedPresentationSourceHolds', 'retainedDefaultsHeld'}},
        'canonicalFidelityCertified': 0, 'completeCombatAnimationSets': 0,
        'originalGameSprites': 0, 'newOriginalIdleAnimations': 0,
    }
    return result


def avatar_registry(assets):
    result = read(BASE_AVATARS)
    holds = {item['id']: item for item in assets.get('retainedPresentationHolds', [])}
    previous = {item['id']: item for item in result['entries']}
    replacements = {}
    for source in assets['portraits']:
        if source.get('defaultAdmission') is not True:
            continue
        assert source['status'] == 'GENERATED' and source['portraitIdentityReviewed'] is True
        assert source['targetEditionMatched'] is True and source['generatedBytesEdited'] is False
        item = {key: source[key] for key in ['id', 'label', 'image', 'bytes', 'sha256', 'format', 'width', 'height', 'crop',
            'sourceEdition', 'targetEditionMatched', 'portraitIdentityReviewed', 'defaultAdmission', 'generatedByR34', 'generatedBytesEdited', 'knownAppearanceGaps']}
        item.update(game=source['incarnation'], targetIncarnation=source['incarnation'], sourceKind='generated-portrait',
                    nativeAssetCertified=False, derivedNativeModelRender=False, originalGame2DFrame=False,
                    canonicalFidelityCertified=False, selectionOnly=True, combatAnimationAssigned=False, sourceBodyCompleteCertified=False,
                    receipt=source['receipt'], limitations=['Generated selection portrait; source framing and anatomy review do not certify original game pixels or a complete body.'])
        replacements[item['id']] = item
    result['entries'] = [replacements.pop(item['id'], item) for item in result['entries']
                         if item['id'] not in holds or item['id'] in replacements]
    result['entries'] += list(replacements.values())
    for uid, hold in holds.items():
        if uid not in {row['id'] for row in result['entries']} and uid in previous:
            before = previous[uid]
            result['missing'].append({'id': uid, 'label': before['label'], 'game': before['game'],
                                      'reason': hold['reason'], 'sourceKind': 'missing',
                                      'nativeAssetCertified': False, 'canonicalFidelityCertified': False})
    result['missing'] = [item for item in result['missing'] if item['id'] not in {row['id'] for row in result['entries']}]
    result.update(schema='re.bow.selection-avatars-r34/1', release='R34', retainedPresentationHolds=list(holds.values()),
                  r34Inputs=[ref(BASE_AVATARS), ref(ASSETS)])
    result['counts'].update(avatars=len(result['entries']), missing=len(result['missing']),
                            generatedAvatars=sum(item['sourceKind'] == 'generated-portrait' for item in result['entries']))
    for name, kind in [('nativeMenuThumbnails', 'native-menu-thumbnail'), ('nativeModelRenders', 'native-model-render'),
                       ('reviewedSecondaryReferences', 'reviewed-secondary-reference'), ('documentedSecondaryReferences', 'documented-secondary-reference')]:
        result['counts'][name] = sum(item['sourceKind'] == kind for item in result['entries'])
    result['scope'] = 'Reviewed generated portraits for current characters plus explicitly retained older references. Raw generator bytes are verified; source-region crops and256px display thumbnails are computed in the browser under transient/steady image credits.'
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    assets = read(ASSETS)
    assert assets['schema'] == 're.bow.fighter-assets-r34/1' and assets['counts']['combatantIdentities'] == 346
    outputs = {'modules/fidelity-r34/combat/manifest.json': sprite_registry(assets),
               'modules/fidelity-r34/selection/manifest.json': avatar_registry(assets)}
    for name, value in outputs.items():
        raw = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
        path = ROOT / name
        if args.check:
            assert path.read_bytes() == raw, 'Current R34 reader binding is stale: ' + name
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            temp = path.with_suffix(path.suffix + '.tmp'); temp.write_bytes(raw); temp.replace(path)
    print(json.dumps({'generatedPortraits': outputs['modules/fidelity-r34/selection/manifest.json']['counts']['generatedAvatars'],
                      'newBasePoseDefaults': outputs['modules/fidelity-r34/combat/manifest.json']['counts']['newR34WholeBodyDefaults'],
                      'canonicalFidelityCertified': False}))


if __name__ == '__main__':
    main()
