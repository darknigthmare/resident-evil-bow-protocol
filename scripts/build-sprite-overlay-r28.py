#!/usr/bin/env python3
"""Resolve immutable R27 PNGs with SHA-bound R28 visual observations and replacements."""
import argparse
import copy
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = 'modules/fidelity-r27/sprites/manifest.json'
REVIEWS = 'docs/R28_SPRITE_REVIEW/index.json'
PACK = 'modules/fidelity-r28/sprites'
POSES = {'neutral-base', 'source-bind-pose', 'source-presentation', 'unknown'}
SPEC = importlib.util.spec_from_file_location('r27_measure', ROOT / 'scripts/import-generated-sprites-r27.py')
MEASURE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MEASURE)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def local(path):
    if not isinstance(path, str) or not path or '\\' in path:
        raise ValueError('Invalid local evidence path')
    result = (ROOT / path).resolve()
    if not result.is_relative_to(ROOT) or not result.is_file():
        raise ValueError('Missing or external evidence: ' + path)
    return result


def verified(value):
    path = local(value['path'])
    raw = path.read_bytes()
    if digest(raw) != value['sha256']:
        raise ValueError('Changed evidence: ' + value['path'])
    return json.loads(raw)


def admitted(entry):
    return ['idle'] if (entry.get('scope') == 'combatant-neutral-pose'
        and entry.get('reviewStatus') == 'visually-reviewed' and entry.get('fullBodyReviewed') is True
        and entry.get('sourceFacing') in ('left', 'right') and entry.get('poseKind') == 'neutral-base') else []


def validate_image(entry):
    raw = local(entry['image']).read_bytes()
    if digest(raw) != entry['sha256'] or len(raw) != entry['bytes']:
        raise ValueError('Sprite bytes changed: ' + entry['id'])
    measured = MEASURE.measure(raw)
    if len(raw) > 16 * 1024 * 1024 or measured['width'] * measured['height'] > 16 * 1024 * 1024:
        raise ValueError('Sprite exceeds actual combat decoder transport/pixel limits')
    for key, value in measured.items():
        if entry.get(key) != value:
            raise ValueError('Measured PNG metadata differs: ' + entry['id'] + ': ' + key)
    if entry.get('canMirror') is not False or entry.get('canonicalFidelityCertified') is not False:
        raise ValueError('Unsupported mirroring or fidelity certification')
    if entry.get('sourceFacing') not in ('left', 'right', 'front', 'unknown') or entry.get('poseKind') not in POSES:
        raise ValueError('Unknown facing or pose kind')
    if entry.get('availableStates') != admitted(entry):
        raise ValueError('Idle capability is inconsistent with visual admission')
    refs = entry.get('provenance', {}).get('references')
    if not refs or entry['provenance'].get('generator') != 'image_gen':
        raise ValueError('Missing generation provenance')
    for ref in refs:
        if digest(local(ref['path']).read_bytes()) != ref['sha256']:
            raise ValueError('Changed generation reference')


def apply_review(entry, observation, proof):
    if (observation.get('schema') != 're.bow.sprite-visual-review-r28/1'
        or observation.get('uid') != entry['id'] or observation.get('image') != entry['image']
        or observation.get('imageSha256') != entry['sha256'] or observation.get('scope') != entry['scope']
        or observation.get('manualPngEdits') is not False or observation.get('canonicalFidelityCertified') is not False
        or observation.get('oppositeViewReviewed') is not False or observation.get('combatAnimationSetReviewed') is not False
        or observation.get('originalGamePoseCertified') is not False or not observation.get('notes')):
        raise ValueError('Visual observation does not bind exact immutable PNG and scope')
    old_record = local(observation['baseRecord']).read_bytes()
    if digest(old_record) != observation['baseRecordSha256']:
        raise ValueError('Baseline record changed')
    if json.loads(old_record) != entry:
        raise ValueError('Baseline record and manifest differ')
    expected = {ref['path']:ref['sha256'] for ref in entry['provenance']['references']}
    seen = {ref['path']:ref['sha256'] for ref in observation['references']}
    if seen != expected or any(digest(local(path).read_bytes()) != sha for path,sha in seen.items()):
        raise ValueError('Review source set or bytes changed')
    visual = observation['visualEvidence']
    if digest(local(visual['path']).read_bytes()) != visual['sha256'] or visual.get('sourceAndOutputSideBySide') is not True:
        raise ValueError('Changed or missing source/output contact evidence')
    body = observation.get('sourceCompleteBodyObserved') is True and observation.get('generatedCompleteBodyObserved') is True
    if observation.get('fullBodyReviewed') is not (body and entry['scope'] == 'combatant-neutral-pose'):
        raise ValueError('Complete-body admission requires complete source and generated body')
    result = copy.deepcopy(entry)
    result.update(reviewStatus='visually-reviewed', fullBodyReviewed=observation['fullBodyReviewed'],
        completeBodyReferenceVerified=observation['sourceCompleteBodyObserved'],
        sourceFacing=observation['observedFacing'], poseKind=observation['observedPoseKind'])
    result['availableStates'] = admitted(result)
    result['r28VisualReview'] = proof
    result['limitations'] = [value for value in result['limitations'] if not value.startswith('No complete body reference has been verified;')]
    result['limitations'].append('R28 visual observation: ' + observation['notes'])
    if not body:
        result['limitations'].append('The used source and generated image do not jointly establish the complete body; cropped or extrapolated regions remain held from combat.')
    return result


def generation_reference_paths(generation, expected):
    """Resolve captured tool-request paths portably without rewriting their receipt."""
    captured_root = generation.get('capturedRepositoryRoot')
    supplied = generation.get('referenced_image_paths')
    if (not isinstance(captured_root, str) or not captured_root.startswith('/')
        or '\\' in captured_root or '..' in captured_root.split('/')
        or not isinstance(supplied, list) or not supplied):
        raise ValueError('Generation receipt needs its captured repository root and exact request paths')
    prefix = captured_root.rstrip('/') + '/'
    result=[]
    for value in supplied:
        if not isinstance(value, str):
            raise ValueError('Invalid captured reference path')
        relative = value[len(prefix):] if value.startswith(prefix) else value
        if relative not in expected:
            raise ValueError('Captured reference differs from the same-UID generation sources')
        local(relative)
        result.append(relative)
    if len(result) != len(set(result)) or set(result) != set(expected):
        raise ValueError('Captured references repeat or omit the generation sources')
    return result


def validate_replacement(entry, old):
    if entry.get('supersedesSha256') != old['sha256'] or entry['id'] != old['id']:
        raise ValueError('Replacement must supersede exactly the immutable R27 UID/PNG')
    expected = PACK + '/generated/' + entry['id'] + '/full-body.png'
    if entry.get('image') != expected or entry['sha256'] == old['sha256']:
        raise ValueError('Replacement must be a new exact-UID R28 tool artifact')
    if entry.get('incarnation') != old['incarnation'] or entry.get('scope') != old['scope']:
        raise ValueError('Replacement cannot change incarnation or actor scope')
    if entry.get('reviewStatus') != 'visually-reviewed' or not entry.get('sourceCompletenessEvidence'):
        raise ValueError('Replacement requires actual visual review and source completeness evidence')
    proof = entry['sourceCompletenessEvidence']
    if isinstance(proof, dict) and 'path' in proof and 'sha256' in proof:
        evidence = verified(proof)
    else:
        raise ValueError('Completeness proof must bind a local SHA-256 evidence record')
    expected_refs = {r['path']:r['sha256'] for r in entry.get('provenance', {}).get('references', [])}
    evidence_refs = {r['path']:r['sha256'] for r in evidence.get('references', [])}
    if (evidence.get('schema') != 're.bow.source-body-observation-r28/1'
        or evidence.get('uid') != entry['id'] or evidence.get('image') != entry['image']
        or evidence.get('imageSha256') != entry['sha256'] or evidence_refs != expected_refs or not expected_refs
        or evidence.get('sourceCompleteBodyObserved') is not True or evidence.get('generatedCompleteBodyObserved') is not True
        or evidence.get('observedFacing') != entry.get('sourceFacing') or evidence.get('observedPoseKind') != entry.get('poseKind')
        or evidence.get('fullBodyReviewed') is not True or entry.get('fullBodyReviewed') is not True
        or evidence.get('canonicalFidelityCertified') is not False or evidence.get('originalGamePoseCertified') is not False
        or evidence.get('oppositeViewReviewed') is not False or evidence.get('manualPngEdits') is not False
        or not evidence.get('notes') or entry.get('completeBodyReferenceVerified') is not True):
        raise ValueError('New complete-body proof does not bind exact source, PNG, side and pose')
    visual = evidence.get('visualEvidence', {})
    if digest(local(visual.get('path')).read_bytes()) != visual.get('sha256'):
        raise ValueError('New complete-body proof lacks unchanged contact evidence')
    generation = entry.get('provenance', {}).get('generationRecord', {})
    if (generation.get('generator') != 'image_gen' or generation.get('id') != entry['id']
        or not generation.get('prompt')):
        raise ValueError('New generation receipt must bind exact UID and references')
    generation_reference_paths(generation, expected_refs)
    validate_image(entry)
    return copy.deepcopy(entry)


def build(validate_pixels=True):
    baseline_raw = local(BASE).read_bytes()
    baseline = json.loads(baseline_raw)
    index = json.loads(local(REVIEWS).read_text())
    if index['baselineManifest'] != {'path':BASE, 'sha256':digest(baseline_raw)}:
        raise ValueError('Baseline manifest changed')
    if baseline['counts']['generatedSprites'] != 363 or len(baseline['pending']) != 22:
        raise ValueError('R27 frozen production counts changed')
    entries = {entry['id']:copy.deepcopy(entry) for entry in baseline['sprites']}
    seen = set()
    for proof in index['entries']:
        uid = proof['uid']
        if uid in seen or uid not in entries or entries[uid]['reviewStatus'] != 'needs-visual-review':
            raise ValueError('Duplicate, missing or already reviewed baseline UID')
        seen.add(uid)
        entries[uid] = apply_review(entries[uid], verified(proof), {'path':proof['path'],'sha256':proof['sha256']})
    if len(seen) != 171 or index['reviewedIdentities'] != len(seen):
        raise ValueError('All171 previously unreviewed sprites require actual observations')
    replaced = []
    for path in sorted((ROOT / PACK / 'records').glob('*.json')):
        entry = json.loads(path.read_text()); uid = entry['id']
        if uid not in entries:
            raise ValueError('A blocked/missing R27 UID cannot be silently retried or counted as replacement')
        entries[uid] = validate_replacement(entry, next(old for old in baseline['sprites'] if old['id'] == uid))
        replaced.append(uid)
    sprites = [entries[entry['id']] for entry in baseline['sprites']]
    if validate_pixels:
        for entry in sprites:
            validate_image(entry)
    if len({s['decodedRgbaSha256'] for s in sprites}) != len(sprites):
        raise ValueError('Duplicate decoded pixels cannot stand in for another target identity')
    counts = copy.deepcopy(baseline['counts'])
    counts.update(visuallyReviewedSprites=sum(s['reviewStatus']=='visually-reviewed' for s in sprites),
        fullBodyReviewedSprites=sum(s['fullBodyReviewed'] for s in sprites),
        neutralBaseSprites=sum(s['poseKind']=='neutral-base' for s in sprites),
        neutralBaseCombatEligibleSprites=sum(bool(admitted(s)) for s in sprites),
        sourceBindPoseSprites=sum(s['poseKind']=='source-bind-pose' for s in sprites),
        sourcePresentationSprites=sum(s['poseKind']=='source-presentation' for s in sprites),
        unknownPoseSprites=sum(s['poseKind']=='unknown' for s in sprites),
        newVisualReviews=len(seen), replacedSprites=len(replaced), newTargetIdentities=0)
    result = copy.deepcopy(baseline)
    result.update(release='R28', purpose='SHA-bound review of all363 generated targets, with source-complete replacements; original-game geometry and complete animation cycles unverified.',
        baseline={'path':BASE,'sha256':digest(baseline_raw)}, jobs={'path':'modules/fidelity-r27/sprites/jobs.json','sha256':baseline['jobs']['sha256'],'relativeTo':'repository-root'},
        reviews={'path':REVIEWS,'sha256':digest(local(REVIEWS).read_bytes())}, counts=counts, sprites=sprites, replacements=replaced)
    return result


def body_queue(manifest):
    """Keep exact unresolved body and pose work visible without inflating produced art."""
    entries=[]
    for entry in manifest['sprites']:
        if entry['fullBodyReviewed']:
            continue
        next_step = ('Acquire same-incarnation complete body references before any new generation.'
            if not entry.get('completeBodyReferenceVerified') else
            'Review all documented body extents and produce a complete source-bound output before admission.')
        if entry['scope'] == 'context-encounter':
            next_step = 'Document the complete encounter/structure where possible; do not invent a free fighter.'
        entries.append({'id':entry['id'],'label':entry['label'],'incarnation':entry['incarnation'],
            'scope':entry['scope'],'image':entry['image'],'imageSha256':entry['sha256'],
            'completeBodyReferenceVerified':entry.get('completeBodyReferenceVerified') is True,
            'poseKind':entry['poseKind'],'actualFacing':entry['sourceFacing'],
            'availableStates':entry['availableStates'],
            'referencePaths':[r['path'] for r in entry['provenance']['references']],
            'review':entry.get('r28VisualReview') or entry.get('sourceCompletenessEvidence'),
            'nextStep':next_step})
    return {'schema':'re.bow.body-completion-queue-r28/1',
        'activeManifestSha256':digest((json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode()),
        'sourceAndGeneratedBodyNotJointlyQualified':len(entries),
        'combatantBodiesPending':sum(e['scope']=='combatant-neutral-pose' for e in entries),
        'contextBodiesNotQualified':sum(e['scope']=='context-encounter' for e in entries),
        'preservedToolRefusals':len(manifest['pending']),
        'fidelityCertified':False,'entries':entries,'blockedIdentities':[e['id'] for e in manifest['pending']],
        'knownAppearanceGaps':[{'id':e['id'],'imageSha256':e['sha256'],'gaps':e['knownAppearanceGaps']}
            for e in manifest['sprites'] if e.get('knownAppearanceGaps')],
        'limitations':['A whole-body flag establishes only visible silhouette coverage in cited views, not original-game geometry, attack cycles or opposite sides.',
            'Context encounters and preserved tool refusals are tracked separately from bodies awaiting complete visual references.']}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    result=build(); target=ROOT / PACK / 'manifest.json'
    raw=(json.dumps(result,ensure_ascii=False,indent=2)+'\n').encode()
    queue_target = ROOT / PACK / 'body-gaps.json'
    queue_raw = (json.dumps(body_queue(result),ensure_ascii=False,indent=2)+'\n').encode()
    if args.check:
        if not target.is_file() or target.read_bytes()!=raw or not queue_target.is_file() or queue_target.read_bytes()!=queue_raw:
            raise ValueError('Published R28 effective sprite manifest or body queue is stale')
    else:
        target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw);queue_target.write_bytes(queue_raw)
    print(json.dumps(result['counts'],sort_keys=True))


if __name__=='__main__':
    main()
