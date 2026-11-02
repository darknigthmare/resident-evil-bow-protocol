#!/usr/bin/env python3
"""Compile only actual reviewed R34 outputs; inventory/fallback entries are never new media."""
import argparse
from collections import Counter
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HELPER_PATH = ROOT / 'scripts/import-roster-asset-r34.py'
spec = importlib.util.spec_from_file_location('r34_asset_import', HELPER_PATH)
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
JOBS = 'modules/fidelity-r34/assets/jobs.json'
MANIFEST = 'modules/fidelity-r34/assets/manifest.json'
BASE = 'modules/fidelity-r33/combat/manifest.json'
AVATARS = 'modules/fidelity-r33/selection/manifest.json'
ADMISSIONS = 'modules/fidelity-r34/assets/reference-admissions.json'


def read(name):
    return json.loads((ROOT / name).read_text())


def ref(name):
    return helper.binding(name)


def short_fallback(value, portrait=False):
    if not value:
        return None
    fields = ['id', 'label', 'image', 'width', 'height', 'bytes', 'sha256', 'format', 'bounds', 'pivot',
              'sourceFacing', 'canMirror', 'availableStates', 'fullBodyReviewed', 'poseKind', 'scope',
              'knownAppearanceGaps', 'sourceEdition', 'sourceKind', 'crop', 'selectionOnly', 'combatAnimationAssigned']
    result = {key: value[key] for key in fields if key in value}
    result.update(status='REUSED', generatedByR34=False, canonicalFidelityCertified=False,
                  sourceKind=value.get('sourceKind', 'historical-generated-pose' if not portrait else 'historical-source-portrait'))
    return result


def body_qualification(review, technical, gaps):
    visible = review.get('fullBodyVisible') is True and not technical['silhouetteTouchesCanvasEdge']
    full = visible and review.get('fullBodyReviewed') is True and review.get('completeBodyReferenceVerified') is True
    pose = full and review.get('fightingPoseReviewed') is True and not gaps and review.get('sourceFacing') == 'right'
    return visible, full, pose


def attach_fallbacks(item, portrait, idle, hold=None):
    retained = {'portrait': short_fallback(portrait, True), 'idle': short_fallback(idle)}
    if hold:
        item['fallbacks'] = {'portrait': None, 'idle': None}
        item['retainedUnadmittedFallbacks'] = {
            kind: {**value, 'status': 'HELD_SOURCE_EDITION', 'defaultAdmission': False, 'holdReason': hold['reason']}
            if value else None for kind, value in retained.items()}
    else:
        item['fallbacks'] = retained


def build(preview=False):
    plan = read(JOBS)
    old = read(BASE)
    avatars = read(AVATARS)
    old_sprites = {entry['id']: entry for entry in old['sprites']}
    old_sprites.update({entry['id']: entry for entry in read('assets/sprites/bow/manifest.json')['sprites']})
    old_avatars = {entry['id']: entry for entry in avatars['entries']}
    sources = {name: ref(name) for name in [JOBS, BASE, AVATARS, 'assets/sprites/bow/manifest.json',
                                           'scripts/build-roster-assets-r34.py', 'scripts/import-roster-asset-r34.py']}
    admissions, presentation_holds = {}, []
    if (ROOT / ADMISSIONS).exists():
        reviewed = read(ADMISSIONS)
        if reviewed.get('schema') != 're.bow.reference-admissions-r34/1':
            raise ValueError('Unexpected source-reference admission schema')
        sources[ADMISSIONS] = ref(ADMISSIONS)
        for entry in reviewed['references']:
            if entry.get('actuallyInspected') is not True or entry.get('sourceCombatAdmissionChanged') is not False:
                raise ValueError('Reference curation cannot silently rewrite historical combat admission')
            actual = ref(entry['path'])
            if actual['sha256'] != entry['sha256'] or actual['bytes'] != entry['bytes']:
                raise ValueError('A reviewed reference changed: ' + entry['path'])
            key = (entry['uid'], entry['path'])
            if key in admissions:
                raise ValueError('Duplicate reference admission')
            admissions[key] = entry
            if entry.get('blockRetainedPresentationFallbacks') is True:
                if (entry.get('targetEditionReferenceMatched') is not False or not isinstance(entry.get('reason'), str)
                        or not entry['reason'].strip() or entry['uid'] not in {job['uid'] for job in plan['jobs']}):
                    raise ValueError('A presentation hold needs a known UID, rejected source admission and concrete reason')
                presentation_holds.append({'id': entry['uid'], 'reason': entry['reason'], 'reference': actual})
        for entry in reviewed.get('sourceFiles', []):
            actual = ref(entry['path'])
            if actual['sha256'] != entry['sha256']:
                raise ValueError('Reference curation provenance changed: ' + entry['path'])
            sources[entry['path']] = actual
    entries, records, failures = [], {'portrait': [], 'idle': []}, []
    statuses = {'portrait': Counter(), 'idle': Counter()}
    expected_receipts = set()
    for job in plan['jobs']:
        item = {key: job[key] for key in ['id', 'label', 'incarnation', 'gameKey', 'fighterCategory', 'lotId']}
        item.update(canonicalFidelityCertified=False, originalIdleAnimationCertified=False)
        for kind in ['portrait', 'idle']:
            path = job['outputs'][kind]['receiptPath']
            expected_receipts.add(path)
            receipt_file = ROOT / path
            if job['historicalRefusalPreserved']:
                if receipt_file.exists() or (ROOT / job['outputs'][kind]['outputPath']).exists():
                    raise ValueError('A preserved historical refusal has been retried: ' + job['uid'])
                value = {'status': 'BLOCKED_HISTORICAL_REFUSAL', 'reason': job['blockedReason'],
                         'generatedByR34': False, 'historicalRefusalPreserved': True}
            elif not receipt_file.exists():
                prior = item.get('portrait', {})
                status = 'BLOCKED_BY_TOOL_PRIOR_PHASE' if kind == 'idle' and prior.get('status') == 'BLOCKED_BY_TOOL' else 'PENDING'
                value = {'status': status, 'generatedByR34': False,
                         'reason': 'No completed production receipt is present.' if status == 'PENDING' else 'The portrait request for this subject was refused; no body retry.'}
            else:
                receipt = read(path)
                if preview and receipt.get('status') == 'GENERATED' and receipt.get('review', {}).get('visuallyReviewed') is not True:
                    if receipt.get('uid') != job['uid'] or receipt.get('lotId') != job['lotId'] or receipt.get('image') != job['outputs'][kind]['outputPath']:
                        raise ValueError('Unreviewed receipt leaves its assigned owner: ' + path)
                    if not (ROOT / receipt['image']).is_file() and not receipt.get('bytes') and not receipt.get('sha256'):
                        value = {'status': 'PENDING_TOOL_OUTPUT', 'generatedByR34': False,
                                 'reason': 'An in-flight request template exists but no tool PNG bytes are delivered.'}
                    else:
                        actual = ref(receipt['image'])
                        if actual['bytes'] != receipt.get('bytes') or actual['sha256'] != receipt.get('sha256'):
                            raise ValueError('Unreviewed output bytes differ: ' + path)
                        helper.measure(ROOT / receipt['image'])
                        value = {'status': 'PENDING_VISUAL_REVIEW', 'generatedByR34': False,
                                 'reason': 'Tool output exists but actual visual review is not complete; no image is admitted.'}
                    item[kind] = value
                    statuses[kind][value['status']] += 1
                    continue
                helper.validate_receipt(receipt)
                sources[path] = ref(path)
                for archive in helper.revision_bindings(receipt):
                    sources[archive['path']] = ref(archive['path'])
                if receipt['status'] != 'GENERATED':
                    value = {'status': receipt['status'], 'reason': receipt['reason'], 'receipt': ref(path), 'generatedByR34': False}
                    failures.append({'uid': job['uid'], 'kind': kind, **value})
                else:
                    technical = helper.measure(ROOT / receipt['image'])
                    review = receipt['review']
                    sources[receipt['image']] = ref(receipt['image'])
                    for source in receipt['references']:
                        sources[source['path']] = ref(source['path'])
                    held_names = {source['path'] for source in job['heldEditionReferences']}
                    def edition_admitted(source):
                        reviewed = admissions.get((job['uid'], source['path']))
                        if reviewed and reviewed['sha256'] == source['sha256']:
                            return reviewed.get('targetEditionReferenceMatched') is True
                        return source.get('targetEditionAdmitted') is not False and source['path'] not in held_names
                    edition_matched = all(edition_admitted(source) for source in receipt['references'])
                    gaps = list(review['knownAppearanceGaps'])
                    if kind == 'idle' and technical['silhouetteTouchesCanvasEdge']:
                        gaps.append('The visible alpha16 silhouette reaches the canvas edge; whole-body padding remains unqualified.')
                    visible, full, pose = body_qualification(review, technical, gaps)
                    value = {**technical, 'status': 'GENERATED', 'id': job['uid'], 'label': job['label'],
                             'incarnation': job['incarnation'], 'image': receipt['image'], 'bytes': receipt['bytes'], 'sha256': receipt['sha256'],
                             'receipt': ref(path), 'generatedByR34': True, 'generatedBytesEdited': False,
                             'sourceKind': 'generated-portrait' if kind == 'portrait' else 'generated-whole-body-idle-pose',
                             'sourceEdition': review.get('sourceEdition', job['incarnation']), 'targetEditionMatched': edition_matched,
                             'admittedTargetEdition': edition_matched, 'targetEditionAdmitted': edition_matched,
                             'reviewStatus': 'visually-reviewed', 'knownAppearanceGaps': gaps,
                             'sourceFacing': review.get('sourceFacing', 'front' if kind == 'portrait' else 'unknown'),
                             'canMirror': False, 'selectionOnly': kind == 'portrait', 'combatAnimationAssigned': False,
                             'canonicalFidelityCertified': False, 'originalGameSprite': False, 'originalIdleAnimationCertified': False,
                             'animationFrames': 1, 'animated': False, 'observations': review['observations']}
                    if kind == 'idle':
                        value.update(fullBodyVisible=visible, fullBodyReviewed=full,
                                     completeBodyReferenceVerified=review.get('completeBodyReferenceVerified') is True,
                                     fightingPoseReviewed=review.get('fightingPoseReviewed') is True,
                                     poseKind='neutral-base' if pose else 'source-presentation', scope='combatant-neutral-pose',
                                     availableStates=['idle'] if pose else [], defaultAdmission=pose and edition_matched)
                    else:
                        crop_reviewed = not gaps or review.get('portraitDisplayRegionReviewed') is True
                        value.update(portraitIdentityReviewed=True, crop=review.get('portraitCrop', technical['bounds']),
                                     portraitDisplayRegionReviewed=crop_reviewed, defaultAdmission=edition_matched and crop_reviewed)
                    records[kind].append(value)
            item[kind] = value
            statuses[kind][value['status']] += 1
        hold = next((entry for entry in presentation_holds if entry['id'] == job['uid']), None)
        attach_fallbacks(item, old_avatars.get(job['uid']), old_sprites.get(job['uid']), hold)
        entries.append(item)
    for path in (ROOT / 'modules/fidelity-r34/assets/lots').rglob('*.json') if (ROOT / 'modules/fidelity-r34/assets/lots').exists() else []:
        if path.name in {'portrait.json', 'idle.json'} and path.relative_to(ROOT).as_posix() not in expected_receipts:
            raise ValueError('Output receipt is outside its assigned UID/lot: ' + str(path))
    counts = {'combatantIdentities': len(entries), 'mainFighters': 115, 'experimentalFighters': 231, 'excludedContextualEncounters': 43,
              'requestedPortraits': 346, 'requestedWholeBodyIdlePoses': 346,
              'newGeneratedPortraits': len(records['portrait']), 'newGeneratedIdlePoses': len(records['idle']),
              'newGeneratedPngs': len(records['portrait']) + len(records['idle']),
              'newReviewedWholeBodyIdlePoses': sum(value['fullBodyReviewed'] for value in records['idle']),
              'newCombatEligibleStaticPoses': sum(bool(value['availableStates']) and value['defaultAdmission'] for value in records['idle']),
              'generatedPortraitsAdmittedTargetEdition': sum(value['admittedTargetEdition'] for value in records['portrait']),
              'generatedPortraitsAdmittedForSelection': sum(value['defaultAdmission'] for value in records['portrait']),
              'generatedPortraitsWithCropLimitations': sum(bool(value['knownAppearanceGaps']) for value in records['portrait']),
              'historicallyBlockedCombatants': plan['counts']['blockedCombatants'],
              'newOutputRefusals': sum(value['status'] == 'BLOCKED_BY_TOOL' for value in failures),
              'heldOutputReferences': sum(value['status'] == 'HELD_REFERENCE' for value in failures),
              'pendingVisualReviews': statuses['portrait']['PENDING_VISUAL_REVIEW'] + statuses['idle']['PENDING_VISUAL_REVIEW'],
              'pendingToolOutputs': statuses['portrait']['PENDING_TOOL_OUTPUT'] + statuses['idle']['PENDING_TOOL_OUTPUT'],
              'retainedPortraitFallbacksAvailable': sum(bool(value['fallbacks']['portrait']) for value in entries),
              'retainedIdleFallbacksAvailable': sum(bool(value['fallbacks']['idle']) for value in entries),
              'heldRetainedPresentationCombatants': len({value['id'] for value in presentation_holds}),
              'retainedUnadmittedPortraitFallbacks': sum(bool(value.get('retainedUnadmittedFallbacks', {}).get('portrait')) for value in entries),
              'retainedUnadmittedIdleFallbacks': sum(bool(value.get('retainedUnadmittedFallbacks', {}).get('idle')) for value in entries),
              'portraitStates': dict(sorted(statuses['portrait'].items())), 'idleStates': dict(sorted(statuses['idle'].items())),
              'newNativeSprites': 0, 'newOriginalIdleAnimations': 0, 'canonicalFidelityCertified': 0}
    return {'schema': 're.bow.fighter-assets-r34/1', 'release': 'R34', 'counts': counts,
            'canonicalFidelityCertified': False, 'originalIdleAnimationCertified': False,
            'scope': 'Actual reviewed R34 image_gen outputs for combatants; old media are separate REUSED fallbacks. Contexts, refusals, edition gaps and pending work remain explicit.',
            'sourceFiles': [sources[name] for name in sorted(sources)], 'failures': failures,
            'retainedPresentationHolds': presentation_holds,
            'portraits': records['portrait'], 'sprites': records['idle'], 'entries': entries}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--preview', action='store_true', help='Expose in-flight raw outputs as pending review, never as generated/admitted images.')
    args = parser.parse_args()
    result = build(args.preview)
    raw = (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode()
    target = ROOT / MANIFEST
    if args.check:
        assert target.read_bytes() == raw, 'The R34 generated asset registry is stale.'
    else:
        helper.atomic_write(target, raw)
    print(json.dumps(result['counts']))


if __name__ == '__main__':
    main()
