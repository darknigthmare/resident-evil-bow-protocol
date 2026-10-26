#!/usr/bin/env python3
"""Import actual R29 tool outputs and admit only manually reviewed SHA-bound bodies."""
import argparse
import copy
import hashlib
import importlib.util
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r29'
SPEC = importlib.util.spec_from_file_location('measure_r27', ROOT / 'scripts/import-generated-sprites-r27.py')
MEASURE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MEASURE)
POSES = {'neutral-base', 'source-bind-pose', 'source-presentation', 'unknown'}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def local(value):
    if not isinstance(value, str) or not value or '\\' in value:
        raise ValueError('Expected a retained local file path')
    path = (ROOT / value).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file():
        raise ValueError('Missing or external retained file: ' + value)
    return path


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def import_receipt(receipt_path, prepare=False):
    receipt_path = local(receipt_path)
    req = json.loads(receipt_path.read_text())
    baseline_path = ROOT / 'modules/fidelity-r28/sprites/manifest.json'
    baseline = json.loads(baseline_path.read_text())
    uid = req.get('uid')
    old = next((entry for entry in baseline['sprites'] if entry['id'] == uid), None)
    if old is None or any(entry['id'] == uid for entry in baseline['pending']):
        raise ValueError('Only an effective generated R28 UID can be replaced; preserved tool refusals are never retried')
    if not req.get('prompt') or req.get('transparent_background') is not True:
        raise ValueError('The actual prompt and transparent-background request are required')
    captured = Path(req.get('capturedRepositoryRoot', ''))
    if not captured.is_absolute():
        raise ValueError('The exact original repository capture root is required')
    actual_refs = req.get('referenced_image_paths')
    if not isinstance(actual_refs, list) or not actual_refs:
        raise ValueError('Exact actual image_gen reference paths are required')
    refs = []
    supplied_metadata = req.get('referenceMetadata', {})
    for value in actual_refs:
        original = Path(value)
        if not original.is_absolute() or not original.is_relative_to(captured):
            raise ValueError('Generation reference does not belong to its captured repository root')
        path = local(original.relative_to(captured).as_posix())
        relative = path.relative_to(ROOT).as_posix()
        if path.suffix.lower() != '.png':
            raise ValueError('This import accepts reviewed PNG references only')
        refs.append({'path':relative, 'sha256':sha(path.read_bytes()), 'bytes':path.stat().st_size,
                     'role':'retained-image-reference', **supplied_metadata.get(relative, {})})
        # Caller metadata cannot replace the actual retained path/hash/size.
        refs[-1].update(path=relative, sha256=sha(path.read_bytes()), bytes=path.stat().st_size)
    if len({entry['path'] for entry in refs}) != len(refs):
        raise ValueError('Duplicate generation references')
    source = Path(req.get('tool_output', '')).resolve()
    if not source.is_file() or not source.name.startswith('exec-') or source.suffix != '.png':
        raise ValueError('An actual retained image_gen tool PNG output is required')
    raw = source.read_bytes()
    measured = MEASURE.measure(raw)
    if len(raw) > 16 * 1024 * 1024 or measured['width'] * measured['height'] > 16 * 1024 * 1024:
        raise ValueError('The generated body exceeds effective decoder transport/pixel bounds')
    if sha(raw) == old['sha256']:
        raise ValueError('Unchanged bytes are not a newly generated replacement')
    facing, pose = req.get('observedFacing', 'unknown'), req.get('observedPoseKind', 'unknown')
    if facing not in ('left', 'right', 'front', 'unknown') or pose not in POSES or not req.get('notes'):
        raise ValueError('Explicit observed facing, pose and review limitations are required')
    gaps = req.get('knownAppearanceGaps', [])
    if not isinstance(gaps, list) or any(not isinstance(value, str) or not value.strip() for value in gaps):
        raise ValueError('Appearance gaps must remain explicit nonempty text entries')
    documentary = req.get('targetEditionAdmitted') is False
    source_edition = req.get('sourceEdition')
    variant_key = req.get('documentaryVariantKey', 'hd-pc-2013')
    if documentary and (not isinstance(source_edition, str) or not source_edition.strip() or not re.fullmatch('[a-z0-9-]+', variant_key)):
        raise ValueError('A documentary variant requires its exact source edition and a safe variant key')
    destination = (PACK / 'sprites/documentary-variants' / uid / (variant_key + '.png')) if documentary else (PACK / 'sprites/generated' / uid / 'full-body.png')
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists() and destination.read_bytes() != raw:
        raise ValueError('Refusing to overwrite a different R29 tool output; preserve revisions explicitly')
    if not destination.exists():
        shutil.copyfile(source, destination)
    image = destination.relative_to(ROOT).as_posix()
    record = copy.deepcopy(old)
    for stale in ('sourceCompletenessEvidence', 'r28VisualReview', 'r29VisualReview'):
        record.pop(stale, None)
    record.update(measured)
    record.update(image=image, bytes=len(raw), sha256=sha(raw), supersedesSha256=old['sha256'],
                  sourceFacing=facing, poseKind=pose, availableStates=[], canMirror=False,
                  reviewStatus='needs-visual-review', fullBodyReviewed=False, completeBodyReferenceVerified=False,
                  combatIntegrated=False, canonicalFidelityCertified=False,
                  equipmentCompletenessReviewed=req.get('equipmentCompletenessReviewed') is True, knownAppearanceGaps=gaps)
    record['admittedTargetEdition'] = not documentary
    if source_edition:
        record['sourceEdition'] = source_edition
    if documentary:
        record.pop('supersedesSha256', None)
        record.update(documentaryVariant=True, documentaryVariantKey=variant_key, variantId=uid + '-' + variant_key,
                      comparesAgainstSha256=old['sha256'], targetIncarnation=old['incarnation'], targetScope=old['scope'],
                      incarnation=source_edition, scope='documentary-edition-variant', targetFullBodyReviewed=False)
    if req.get('sourceVariantLabel'):
        record['sourceVariantLabel'] = req['sourceVariantLabel']
    record['limitations'] = [
        'Generated interpretation of documented same-incarnation source geometry, not an original game sprite or geometric1:1 certification.',
        'One reviewed source-guided presentation; original animation cycles, physical scale and all phases are not certified.', req['notes'], *gaps]
    if documentary:
        record['limitations'].insert(0, 'Documentary source edition only: ' + source_edition + '. The target incarnation ' + old['incarnation'] + ' is not completed or replaced by this source variant.')
    generation = {'id':uid, 'generator':'image_gen', 'prompt':req['prompt'], 'referenced_image_paths':actual_refs,
                  'capturedRepositoryRoot':str(captured), 'tool_output':str(source), 'transparent_background':True,
                  'manualPngEdits':False, 'requestReceipt':{'path':receipt_path.relative_to(ROOT).as_posix(), 'sha256':sha(receipt_path.read_bytes())}}
    record['provenance'] = {'generator':'image_gen', 'prompt':req['prompt'], 'references':refs,
                            'generationRecord':generation, 'toolArtifactSha256':sha(raw), 'manualPngEdits':False}
    if prepare:
        write(PACK / 'sources/generation-previews' / (uid + '.json'), record)
        return record
    if req.get('reviewed') is not True or req.get('sourceCompleteBodyObserved') is not True or req.get('generatedCompleteBodyObserved') is not True:
        raise ValueError('A human observation must qualify both complete source and complete output before replacement admission')
    if pose == 'neutral-base' and req.get('neutralPoseReviewed') is not True:
        raise ValueError('Neutral combat pose requires a separate explicit neutralPoseReviewed observation')
    visual_file = local(req.get('visualEvidencePath', 'docs/R29_BODY_VISUAL_EVIDENCE/' + uid + '.png'))
    record.update(reviewStatus='visually-reviewed', fullBodyReviewed=True, completeBodyReferenceVerified=True)
    if not documentary and old['scope'] == 'combatant-neutral-pose' and pose == 'neutral-base' and facing in ('left', 'right') and not gaps:
        record['availableStates'] = ['idle']
    proof = {'schema':'re.bow.source-body-observation-r29/1', 'uid':uid, 'image':image, 'imageSha256':sha(raw), 'references':refs,
             'sourceCompleteBodyObserved':True, 'generatedCompleteBodyObserved':True,
             'observedFacing':facing, 'observedPoseKind':pose, 'fullBodyReviewed':True,
             'canonicalFidelityCertified':False, 'originalGamePoseCertified':False,
             'oppositeViewReviewed':False, 'manualPngEdits':False, 'notes':req['notes'],
             'targetEditionAdmitted':not documentary,
             'visualEvidence':{'path':visual_file.relative_to(ROOT).as_posix(), 'sha256':sha(visual_file.read_bytes()), 'sourceAndOutputSideBySide':True}}
    proof_file = ROOT / 'docs/R29_BODY_VISUAL_EVIDENCE' / (uid + '.json')
    write(proof_file, proof)
    record['sourceCompletenessEvidence'] = {'path':proof_file.relative_to(ROOT).as_posix(), 'sha256':sha(proof_file.read_bytes())}
    record_path = (PACK / 'sprites/documentary-variants/records' / (uid + '.json')) if documentary else (PACK / 'sprites/records' / (uid + '.json'))
    write(record_path, record)
    return record


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--receipt', action='append', required=True, help='Exact image_gen request/result and manual observation JSON; repeat for a batch.')
    parser.add_argument('--prepare-images', action='store_true', help='Create unadmitted previews for browser review, outside the effective record directory.')
    args = parser.parse_args()
    for path in args.receipt:
        record = import_receipt(path, args.prepare_images)
        print(record['id'], record['sha256'], record['reviewStatus'], record['availableStates'])


if __name__ == '__main__':
    main()
