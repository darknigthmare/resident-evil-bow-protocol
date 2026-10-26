#!/usr/bin/env python3
"""Resolve immutable R28 sprites with SHA-bound R29 pose reviews and source-bound replacements."""
import argparse
import copy
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = 'modules/fidelity-r28/sprites/manifest.json'
REVIEWS = 'docs/R29_POSE_REVIEW/index.json'
SOURCE_NOTES = 'modules/fidelity-r29/sprites/legacy-source-notes.json'
PACK = 'modules/fidelity-r29/sprites'
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
        and entry.get('sourceFacing') in ('left', 'right') and entry.get('poseKind') == 'neutral-base'
        and not entry.get('knownAppearanceGaps', [])) else []


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
    gaps = entry.get('knownAppearanceGaps', [])
    if not isinstance(gaps,list) or len(gaps)>64 or any(not isinstance(value,str) or not value.strip() or len(value)>2000 for value in gaps):
        raise ValueError('Appearance gap declarations must be a bounded list of actual observations')
    if entry.get('availableStates') != admitted(entry):
        raise ValueError('Idle capability is inconsistent with visual admission')
    refs = entry.get('provenance', {}).get('references')
    if not refs or entry['provenance'].get('generator') != 'image_gen':
        raise ValueError('Missing generation provenance')
    for ref in refs:
        if digest(local(ref['path']).read_bytes()) != ref['sha256']:
            raise ValueError('Changed generation reference')


def apply_review(entry, observation, proof):
    if (observation.get('schema') != 're.bow.sprite-pose-review-r29/1'
        or observation.get('uid') != entry['id'] or observation.get('image') != entry['image']
        or observation.get('imageSha256') != entry['sha256'] or observation.get('scope') != entry['scope']
        or observation.get('manualPngEdits') is not False or observation.get('canonicalFidelityCertified') is not False
        or observation.get('oppositeViewReviewed') is not False or observation.get('combatAnimationSetReviewed') is not False
        or observation.get('originalGamePoseCertified') is not False or not observation.get('notes')
        or type(observation.get('sourceCompleteBodyObserved')) is not bool
        or type(observation.get('generatedCompleteBodyObserved')) is not bool
        or observation.get('observedFacing') not in ('left','right','front','unknown')
        or observation.get('observedPoseKind') not in POSES):
        raise ValueError('Visual observation does not bind exact immutable PNG and scope')
    entry_sha = digest(json.dumps(entry,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode())
    if entry_sha != observation.get('baseEntrySha256'):
        raise ValueError('The observed R28 entry changed')
    expected = {ref['path']:ref['sha256'] for ref in entry['provenance']['references']}
    seen = {ref['path']:ref['sha256'] for ref in observation['references']}
    if seen != expected or any(digest(local(path).read_bytes()) != sha for path,sha in seen.items()):
        raise ValueError('Review source set or bytes changed')
    visual = observation['visualEvidence']
    if digest(local(visual['path']).read_bytes()) != visual['sha256'] or visual.get('sourceAndOutputSideBySide') is not True:
        raise ValueError('Changed or missing source/output contact evidence')
    body = observation.get('sourceCompleteBodyObserved') is True and observation.get('generatedCompleteBodyObserved') is True
    if observation.get('fullBodyReviewed') is not body:
        raise ValueError('Complete-body admission requires complete source and generated body')
    result = copy.deepcopy(entry)
    result.update(reviewStatus='visually-reviewed', fullBodyReviewed=observation['fullBodyReviewed'],
        completeBodyReferenceVerified=observation['sourceCompleteBodyObserved'],
        sourceFacing=observation['observedFacing'], poseKind=observation['observedPoseKind'])
    result['r29VisualReview'] = proof
    if observation.get('knownAppearanceGaps'):
        if observation.get('equipmentCompletenessReviewed') is not False or not all(isinstance(value,str) and value.strip() for value in observation['knownAppearanceGaps']):
            raise ValueError('Known equipment gaps cannot be certified complete')
        result['equipmentCompletenessReviewed'] = False
        result['knownAppearanceGaps'] = list(dict.fromkeys([*result.get('knownAppearanceGaps',[]),*observation['knownAppearanceGaps']]))
    result['availableStates'] = admitted(result)
    result['limitations'] = [value for value in result['limitations'] if not value.startswith('No complete body reference has been verified;')]
    result['limitations'] = ['One source-guided generated presentation; no authored attack, opposite view or full animation cycle.' if value.startswith('One neutral source-guided pose;') else value for value in result['limitations']]
    result['limitations'].append('R29 visual observation: ' + observation['notes'])
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


def apply_legacy_source_note(entry, note, proof):
    """Qualify an archived source edition without recertifying anatomy or replacing art."""
    if (note.get('id') != entry['id'] or note.get('image') != entry['image']
        or note.get('imageSha256') != entry['sha256']
        or note.get('baseEntrySha256') != digest(json.dumps(entry,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode())
        or note.get('editionEquivalenceVerified') is not False
        or note.get('sourceEdition') != 'Resident Evil Revelations — HD/PC (2013)'
        or not isinstance(note.get('sourceVariantLabel'),str) or not note['sourceVariantLabel'].strip()
        or not isinstance(note.get('knownAppearanceGaps'),list) or not note['knownAppearanceGaps']
        or any(not isinstance(v,str) or not v.strip() for v in note['knownAppearanceGaps'])
        or not isinstance(note.get('notes'),str) or not note['notes'].strip()):
        raise ValueError('Legacy source note must bind the unchanged baseline entry and explicit edition uncertainty')
    source_manifest = verified(note['sourceManifest'])
    source = next((source for source in source_manifest['entries'] if source['id']==entry['id']),None)
    if (source is None or source.get('sourceEdition') != note.get('sourceEditionDeclaration')
        or digest(json.dumps(source,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()) != note.get('sourceEntrySha256')
        or source.get('platform') != 'PC / Computer'):
        raise ValueError('Legacy source edition is not bound to its actual archived model declaration')
    source_refs = {str(Path(note['sourceManifest']['path']).parent / image['path']):image['sha256'] for image in source['views']}
    if any(source_refs.get(ref['path']) != ref['sha256'] or digest(local(ref['path']).read_bytes()) != ref['sha256'] for ref in entry['provenance']['references']):
        raise ValueError('Legacy source edition does not bind every actual generation reference')
    result=copy.deepcopy(entry)
    result.update(sourceEdition=note['sourceEdition'],sourceVariantLabel=note['sourceVariantLabel'],
        editionEquivalenceVerified=False,r29LegacySourceNote=proof)
    result['knownAppearanceGaps']=list(dict.fromkeys([*result.get('knownAppearanceGaps',[]),*note['knownAppearanceGaps']]))
    result['limitations'].append('R29 archived source-edition qualification: '+note['notes'])
    result['availableStates']=admitted(result)
    return result


def validate_source_body_receipt(entry):
    if entry.get('reviewStatus') != 'visually-reviewed' or not entry.get('sourceCompletenessEvidence'):
        raise ValueError('Replacement requires actual visual review and source completeness evidence')
    proof = entry['sourceCompletenessEvidence']
    if isinstance(proof, dict) and 'path' in proof and 'sha256' in proof:
        evidence = verified(proof)
    else:
        raise ValueError('Completeness proof must bind a local SHA-256 evidence record')
    expected_refs = {r['path']:r['sha256'] for r in entry.get('provenance', {}).get('references', [])}
    evidence_refs = {r['path']:r['sha256'] for r in evidence.get('references', [])}
    if (evidence.get('schema') != 're.bow.source-body-observation-r29/1'
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
    return evidence


def validate_replacement(entry, old):
    if entry.get('documentaryVariant') is True or entry.get('admittedTargetEdition') is False or entry.get('targetEditionAdmitted') is False:
        raise ValueError('A documentary edition variant cannot replace the active target')
    if entry.get('supersedesSha256') != old['sha256'] or entry['id'] != old['id']:
        raise ValueError('Replacement must supersede exactly the immutable active R28 UID/PNG')
    expected = PACK + '/generated/' + entry['id'] + '/full-body.png'
    if entry.get('image') != expected or entry['sha256'] == old['sha256']:
        raise ValueError('Replacement must be a new exact-UID R29 tool artifact')
    if entry.get('incarnation') != old['incarnation'] or entry.get('scope') != old['scope']:
        raise ValueError('Replacement cannot change incarnation or actor scope')
    evidence=validate_source_body_receipt(entry)
    receipt=verified(entry['provenance']['generationRecord']['requestReceipt'])
    if evidence.get('targetEditionAdmitted') is False or receipt.get('targetEditionAdmitted') is False:
        raise ValueError('Documentary edition provenance cannot be discarded to qualify an active replacement')
    return copy.deepcopy(entry)


def validate_documentary_variant(entry, old):
    key=entry.get('documentaryVariantKey')
    if (entry.get('id')!=old['id'] or not isinstance(key,str) or not key
        or len(key)>100 or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in key)
        or entry.get('variantId')!=old['id']+'-'+key or entry.get('documentaryVariant') is not True
        or entry.get('admittedTargetEdition') is not False or entry.get('targetFullBodyReviewed') is not False
        or entry.get('scope')!='documentary-edition-variant' or entry.get('targetScope')!=old['scope']
        or entry.get('targetIncarnation')!=old['incarnation'] or entry.get('comparesAgainstSha256')!=old['sha256']
        or 'supersedesSha256' in entry or entry.get('availableStates')!=[]):
        raise ValueError('Documentary variant cannot replace or qualify its catalogue target')
    expected=PACK+'/documentary-variants/'+old['id']+'/'+key+'.png'
    edition=entry.get('sourceEdition')
    if (entry.get('image')!=expected or not isinstance(edition,str) or not edition.strip()
        or edition==old['incarnation'] or entry.get('incarnation')!=edition):
        raise ValueError('Documentary variant requires its explicit source-edition image and caption')
    evidence=validate_source_body_receipt(entry)
    generation=entry['provenance']['generationRecord']
    receipt=verified(generation['requestReceipt'])
    if (evidence.get('targetEditionAdmitted') is not False or receipt.get('targetEditionAdmitted') is not False
        or receipt.get('sourceEdition')!=edition or receipt.get('documentaryVariantKey')!=key):
        raise ValueError('Documentary edition is not bound to its actual request and visual evidence')
    return copy.deepcopy(entry)


def revision_failures(entries):
    failures=[]
    for path in sorted((ROOT/PACK/'revision-failures').glob('*.json')):
        value=json.loads(path.read_text());uid=value.get('id')
        error=value.get('actualToolError',{})
        if (value.get('schema')!='re.bow.generated-sprite-revision-failure-r29/1' or uid not in entries
            or value.get('generator')!='image_gen' or value.get('status')!='BLOCKED_BY_TOOL'
            or value.get('revisionOnly') is not True or value.get('existingActiveSpritePreserved') is not True
            or value.get('retryPerformed') is not False or not isinstance(error,dict) or not error.get('message')):
            raise ValueError('Revision refusal must retain the existing active identity and actual tool error')
        preserved=value.get('preservedActiveSprite',{})
        if preserved!={'image':entries[uid]['image'],'sha256':entries[uid]['sha256']} or value.get('request',{}).get('uid')!=uid:
            raise ValueError('Revision refusal does not bind the unchanged active image')
        references=value.get('references',[])
        if not references or any(digest(local(ref['path']).read_bytes())!=ref['sha256'] for ref in references):
            raise ValueError('Revision refusal source bytes changed')
        request=value.get('request',{})
        generation_reference_paths(request,{ref['path']:ref['sha256'] for ref in references})
        failures.append({'id':uid,'path':path.relative_to(ROOT).as_posix(),'sha256':digest(path.read_bytes()),
            'status':'BLOCKED_BY_TOOL','revisionOnly':True,'existingActiveSpritePreserved':True,'retryPerformed':False,
            'preservedActiveSha256':entries[uid]['sha256']})
    return failures


def build(validate_pixels=True):
    baseline_raw = local(BASE).read_bytes()
    baseline = json.loads(baseline_raw)
    index = json.loads(local(REVIEWS).read_text())
    if index['baselineManifest'] != {'path':BASE, 'sha256':digest(baseline_raw)}:
        raise ValueError('Baseline manifest changed')
    if baseline['counts']['generatedSprites'] != 363 or len(baseline['pending']) != 22:
        raise ValueError('R28 frozen production counts changed')
    entries = {entry['id']:copy.deepcopy(entry) for entry in baseline['sprites']}
    seen = set()
    for proof in index['entries']:
        uid = proof['uid']
        if uid in seen or uid not in entries or entries[uid]['poseKind'] != 'unknown':
            raise ValueError('Duplicate, missing or already classified baseline UID')
        seen.add(uid)
        entries[uid] = apply_review(entries[uid], verified(proof), {'path':proof['path'],'sha256':proof['sha256']})
    if len(seen) != 106 or index['reviewedIdentities'] != len(seen):
        raise ValueError('All106 previously unknown poses require actual source/output observations')
    baseline_entries={entry['id']:entry for entry in baseline['sprites']}
    source_notes_raw=local(SOURCE_NOTES).read_bytes()
    source_notes=json.loads(source_notes_raw)
    if (source_notes.get('schema')!='re.bow.legacy-sprite-source-notes-r29/1'
        or source_notes.get('baselineManifest')!={'path':BASE,'sha256':digest(baseline_raw)}
        or source_notes.get('manualPngEdits') is not False or source_notes.get('newPoseReviews')!=0
        or source_notes.get('newTargetIdentities')!=0
        or {n['id'] for n in source_notes['entries']}!={'rerev-scagdead','rerev-wall-blister'}
        or len(source_notes['entries'])!=2):
        raise ValueError('Legacy source notes must qualify exactly the two archived R28 PC/HD sources')
    for note in source_notes['entries']:
        uid=note['id']
        entries[uid]=apply_legacy_source_note(entries[uid],note,{'path':SOURCE_NOTES,'sha256':digest(source_notes_raw),'id':uid})
    variants=[];variant_ids=set()
    for path in sorted((ROOT/PACK/'documentary-variants/records').glob('*.json')):
        value=json.loads(path.read_text());uid=value.get('id')
        if uid not in baseline_entries:
            raise ValueError('A documentary variant must compare an existing unblocked target')
        variant=validate_documentary_variant(value,baseline_entries[uid])
        if variant['variantId'] in variant_ids:
            raise ValueError('Duplicate documentary edition variant')
        variant_ids.add(variant['variantId']);variants.append(variant)
    revisions_failed=revision_failures(baseline_entries)
    replaced = []
    for path in sorted((ROOT / PACK / 'records').glob('*.json')):
        entry = json.loads(path.read_text()); uid = entry['id']
        if uid not in entries:
            raise ValueError('A blocked/missing R28 UID cannot be silently retried or counted as replacement')
        entries[uid] = validate_replacement(entry, next(old for old in baseline['sprites'] if old['id'] == uid))
        replaced.append(uid)
    if set(replaced)&{entry['id'] for entry in revisions_failed}:
        raise ValueError('A preserved refused revision cannot also replace its active sprite')
    sprites = [entries[entry['id']] for entry in baseline['sprites']]
    if validate_pixels:
        for entry in sprites:
            validate_image(entry)
    all_images=sprites+variants
    if len({s['decodedRgbaSha256'] for s in all_images}) != len(all_images):
        raise ValueError('Duplicate decoded pixels cannot stand in for another target identity')
    counts = copy.deepcopy(baseline['counts'])
    counts.update(visuallyReviewedSprites=sum(s['reviewStatus']=='visually-reviewed' for s in sprites),
        fullBodyReviewedSprites=sum(s['fullBodyReviewed'] for s in sprites),
        neutralBaseSprites=sum(s['poseKind']=='neutral-base' for s in sprites),
        neutralBaseCombatEligibleSprites=sum(bool(admitted(s)) for s in sprites),
        sourceBindPoseSprites=sum(s['poseKind']=='source-bind-pose' for s in sprites),
        sourcePresentationSprites=sum(s['poseKind']=='source-presentation' for s in sprites),
        unknownPoseSprites=sum(s['poseKind']=='unknown' for s in sprites),
        newVisualReviews=len(seen), newPoseReviews=len(seen), firstVisualReviews=0, replacedSprites=len(replaced),
        cumulativeReplacedIdentities=len(set(replaced)|set(baseline.get('replacements',[]))),
        explicitAppearanceGapSprites=sum(bool(s.get('knownAppearanceGaps')) for s in sprites),
        neutralBaseHeldForAppearanceSprites=sum(s['poseKind']=='neutral-base' and s['fullBodyReviewed'] and s['scope']=='combatant-neutral-pose' and s['sourceFacing'] in ('left','right') and bool(s.get('knownAppearanceGaps')) for s in sprites),
        documentaryVariants=len(variants), recordedRevisionFailures=len(revisions_failed),
        legacySourceEditionNotes=len(source_notes['entries']), newTargetIdentities=0)
    result = copy.deepcopy(baseline)
    result.update(release='R29', purpose='SHA-bound classification of106 source/output poses plus source-complete body replacements; no original-game geometry or complete animation certification.',
        baseline={'path':BASE,'sha256':digest(baseline_raw)}, jobs=copy.deepcopy(baseline['jobs']),
        reviews={'path':REVIEWS,'sha256':digest(local(REVIEWS).read_bytes())}, counts=counts, sprites=sprites, previousReplacements=copy.deepcopy(baseline.get('replacements',[])), replacements=replaced,
        documentaryVariants=variants, revisionFailures=revisions_failed,
        legacySourceNotes={'path':SOURCE_NOTES,'sha256':digest(source_notes_raw)})
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
            'review':entry.get('r29VisualReview') or entry.get('sourceCompletenessEvidence') or entry.get('r28VisualReview'),
            'nextStep':next_step})
    return {'schema':'re.bow.body-completion-queue-r29/1',
        'activeManifestSha256':digest((json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode()),
        'sourceAndGeneratedBodyNotJointlyQualified':len(entries),
        'combatantBodiesPending':sum(e['scope']=='combatant-neutral-pose' for e in entries),
        'contextBodiesNotQualified':sum(e['scope']=='context-encounter' for e in entries),
        'preservedToolRefusals':len(manifest['pending']),
        'revisionRefusals':len(manifest.get('revisionFailures',[])),
        'documentaryVariantCount':len(manifest.get('documentaryVariants',[])),
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
            raise ValueError('Published R29 effective sprite manifest or body queue is stale')
    else:
        target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw);queue_target.write_bytes(queue_raw)
    print(json.dumps(result['counts'],sort_keys=True))


if __name__=='__main__':
    main()
