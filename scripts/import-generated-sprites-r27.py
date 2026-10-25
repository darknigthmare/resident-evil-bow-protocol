#!/usr/bin/env python3
"""Import actual image_gen PNGs, preserve their bytes, and publish honest coverage."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import tempfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r27/sprites'
POSE_KINDS = ('neutral-base', 'source-bind-pose', 'source-presentation', 'unknown')


def read(path):
    return json.loads(path.read_text())


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def load_jobs():
    path = PACK / 'jobs.json'
    raw = path.read_bytes()
    lock = PACK / 'generation-lock.json'
    if lock.exists() and read(lock)['jobsSha256'] != sha(raw):
        raise ValueError('Generation job lock does not match the source requests')
    return json.loads(raw)


def atomic_write(path, raw):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as handle:
        temporary = Path(handle.name)
        handle.write(raw)
    try:
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def measure(raw):
    if not raw.startswith(b'\x89PNG\r\n\x1a\n') or len(raw) > 32 * 1024 * 1024:
        raise ValueError('Expected an actual PNG of at most32MiB')
    with Image.open(io.BytesIO(raw)) as image:
        if image.format != 'PNG' or image.width < 64 or image.height < 64 or image.width * image.height > 32_000_000:
            raise ValueError('Unexpected sprite dimensions or image format')
        if 'A' not in image.getbands() and 'transparency' not in image.info:
            raise ValueError('Sprite must contain a real transparency channel')
        rgba = image.convert('RGBA')
        alpha = rgba.getchannel('A')
        histogram = alpha.histogram()
        if not histogram[0] or sum(histogram[16:]) == 0:
            raise ValueError('Sprite must contain transparent pixels and a visible subject')
        # This only inspects pixels. No pixel is resampled, cropped or rewritten.
        bbox = alpha.point(lambda value: 255 if value >= 16 else 0).getbbox()
        x, y, right, bottom = bbox
        pixels = image.width * image.height
        return {'width': image.width, 'height': image.height,
                'alpha': {'channel': True, 'min': min(i for i, n in enumerate(histogram) if n),
                          'max': max(i for i, n in enumerate(histogram) if n),
                          'transparentPixels': histogram[0], 'totalPixels': pixels,
                          'transparentFraction': histogram[0] / pixels, 'visibleThreshold': 16},
                'bounds': {'x': x, 'y': y, 'width': right - x, 'height': bottom - y},
                'pivot': {'x': (x + right) / 2, 'y': bottom},
                'decodedRgbaSha256': sha(str(image.size).encode() + b'\0' + rgba.tobytes())}


def source_completeness_evidence(path, uid, image_sha, references, facing, image_path):
    path = (ROOT / path).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file() or path.stat().st_size > 1024 * 1024:
        raise ValueError('Source completeness evidence must be a bounded local observation file')
    raw = path.read_bytes()
    evidence = json.loads(raw)
    reference = evidence.get('reference', {})
    used = next((ref for ref in references if ref['path'] == reference.get('path')), None)
    if (evidence.get('schema') != 're.bow.source-body-observation-r27/1'
            or evidence.get('uid') != uid or used is None
            or reference.get('sha256') != used['sha256']
            or evidence.get('image') != image_path or evidence.get('image_sha256') != image_sha
            or evidence.get('source_complete_body_observed') is not True
            or evidence.get('generated_complete_body_observed') is not True
            or evidence.get('exact_identity_declared') is not True
            or facing not in ('left', 'right', 'front') or evidence.get('observed_facing') != facing
            or evidence.get('canonical_fidelity_certified') is not False
            or evidence.get('opposite_view_reviewed') is not False
            or evidence.get('original_game_pose_certified') is not False
            or not isinstance(evidence.get('notes'), str) or not evidence['notes'].strip()):
        raise ValueError('Source completeness evidence does not bind this exact reviewed source, image, side and limited scope')
    visual = evidence.get('visual_evidence', {})
    visual_path = (ROOT / str(visual.get('path', ''))).resolve()
    if (not visual_path.is_relative_to(ROOT) or not visual_path.is_file()
            or sha(visual_path.read_bytes()) != visual.get('sha256')):
        raise ValueError('The manual body observation requires its unchanged visual evidence')
    return {'path': path.relative_to(ROOT).as_posix(), 'sha256': sha(raw),
            'referencePath': used['path'], 'referenceSha256': used['sha256'],
            'imageSha256': image_sha, 'observedFacing': facing,
            'scope': 'Whole body visually observed in this source image and this generated pose only; no opposite view, geometry or original-game pose certification.'}


def qualified_limits(job, body_evidence):
    limits = list(job['limitations'])
    if body_evidence:
        qualifier = ('The original job lacked a complete-body declaration; the linked SHA-bound observation covers this visible source and generated pose only, without certifying other views or geometry.'
                     if not job['completeBodyReferenceVerified'] else
                     'The linked SHA-bound observation covers this visible source and generated pose only, without certifying other views or geometry.')
        limits = [qualifier if item.startswith('No complete body reference has been verified;') else item for item in limits]
        if qualifier not in limits:
            limits.append(qualifier)
    return limits


def admitted_states(entry):
    return ['idle'] if (entry.get('scope') == 'combatant-neutral-pose'
                       and entry.get('poseKind') == 'neutral-base'
                       and entry.get('reviewStatus') == 'visually-reviewed'
                       and entry.get('fullBodyReviewed') is True
                       and entry.get('sourceFacing') in ('left', 'right')) else []


def import_sprite(uid, source, generation_record, reviewed=False, facing=None,
                  full_body_reviewed=False, existing=None, revision_of=None,
                  source_completeness_path=None, pose_kind=None):
    jobs = {entry['id']: entry for entry in load_jobs()['jobs']}
    if uid not in jobs:
        raise ValueError('Unknown or historically covered sprite identity')
    job = jobs[uid]
    metadata = read(Path(generation_record))
    if (metadata.get('generator') != 'image_gen' or metadata.get('id') != uid
            or not isinstance(metadata.get('prompt'), str) or not metadata['prompt'].strip()):
        raise ValueError('An actual image_gen generation record bound to the same UID is required')
    supplied = metadata.get('referenced_image_paths')
    if not isinstance(supplied, list) or not supplied:
        raise ValueError('Generation must record the exact reference images used')
    expected = {(ROOT / entry['path']).resolve(): entry for entry in job['references']}
    used = []
    for value in supplied:
        if not isinstance(value, str):
            raise ValueError('Invalid image generation reference path')
        path = (ROOT / value).resolve()
        if path not in expected or not path.is_file() or sha(path.read_bytes()) != expected[path]['sha256']:
            raise ValueError('Unreviewed or changed generation reference: ' + value)
        used.append(expected[path])
    raw = Path(source).read_bytes()
    measured = measure(raw)
    digest = sha(raw)
    target = ROOT / job['outputPath']
    record_path = PACK / 'records' / (uid + '.json')
    previous_record = read(record_path) if record_path.is_file() else None
    superseded = None
    if revision_of is not None:
        if (not isinstance(revision_of, str) or len(revision_of) != 64
                or any(char not in '0123456789abcdef' for char in revision_of)
                or not target.is_file() or not record_path.is_file()):
            raise ValueError('A correction requires an existing active PNG and its exact old SHA-256')
        old_raw, old_record_raw = target.read_bytes(), record_path.read_bytes()
        old_record = json.loads(old_record_raw)
        if sha(old_raw) != revision_of or old_record['sha256'] != revision_of or old_record['id'] != uid:
            raise ValueError('The explicit revision SHA does not match the current active image')
        if old_raw == raw or old_record.get('decodedRgbaSha256') == measured['decodedRgbaSha256']:
            raise ValueError('A correction must contain genuinely new image pixels')
        archive = PACK / 'superseded' / uid / revision_of
        superseded = {'image': (archive / 'idle-right.png').relative_to(ROOT).as_posix(),
                      'record': (archive / 'sprite-record.json').relative_to(ROOT).as_posix(),
                      'sha256': revision_of, 'recordSha256': sha(old_record_raw)}
        for path, content in [(archive / 'idle-right.png', old_raw), (archive / 'sprite-record.json', old_record_raw)]:
            if path.exists() and path.read_bytes() != content:
                raise ValueError('An immutable superseded generation archive already differs')
    elif target.exists() and target.read_bytes() != raw:
        raise ValueError('Refusing to overwrite a previously imported generated image')
    same_pixels = bool(previous_record and revision_of is None and target.is_file()
                       and target.read_bytes() == raw)
    if same_pixels and (previous_record.get('id') != uid or previous_record.get('sha256') != digest
            or previous_record.get('provenance', {}).get('generationRecord') != metadata):
        raise ValueError('Metadata-only review must preserve the original generation receipt and pixel identity')
    if (previous_record and target.is_file() and target.read_bytes() == raw and not reviewed
            and not full_body_reviewed and facing is None and source_completeness_path is None
            and revision_of is None and pose_kind is None
            and previous_record.get('provenance', {}).get('generationRecord') == metadata):
        # Resume must not erase a later human review or its SHA-bound evidence.
        return previous_record
    if existing is None:
        existing = [read(path) for path in (PACK / 'records').glob('*.json')]
    for previous in existing:
        if previous['id'] != uid and (previous['sha256'] == digest
                or previous.get('decodedRgbaSha256') == measured['decodedRgbaSha256']):
            raise ValueError('The same generated pixels cannot count as two independent identities')
    actual_facing = facing if facing is not None else (
        previous_record.get('sourceFacing', 'unknown') if same_pixels else metadata.get('source_facing', 'unknown'))
    if actual_facing not in ('left', 'right', 'front', 'unknown'):
        raise ValueError('Unsupported source-facing declaration')
    actual_pose = pose_kind if pose_kind is not None else (
        previous_record.get('poseKind', 'unknown') if previous_record and revision_of is None else 'unknown')
    actual_reviewed = reviewed or bool(same_pixels and previous_record.get('reviewStatus') == 'visually-reviewed')
    actual_fullbody = full_body_reviewed or bool(same_pixels and previous_record.get('fullBodyReviewed'))
    if actual_pose not in POSE_KINDS or actual_pose == 'neutral-base' and not actual_reviewed:
        raise ValueError('Pose kind must be supported; neutral-base requires an explicit visual review')
    body_evidence = None
    if source_completeness_path:
        body_evidence = source_completeness_evidence(source_completeness_path, uid, digest, used,
                                                    actual_facing, job['outputPath'])
    elif same_pixels and previous_record.get('sourceCompletenessEvidence'):
        body_evidence = source_completeness_evidence(previous_record['sourceCompletenessEvidence']['path'],
                                                    uid, digest, used, actual_facing, job['outputPath'])
    if actual_fullbody and (not actual_reviewed or job['scope'] == 'context-encounter'
            or not (any(item.get('bodyCoverage') == 'complete' for item in used) or body_evidence)):
        raise ValueError('Full-body admission requires visual review and a used complete-body reference for a combatant')
    record = {'id': uid, 'label': job['label'], 'incarnation': job['incarnation'],
              'image': job['outputPath'], 'bytes': len(raw), 'sha256': digest, 'format': 'PNG', **measured,
              'sourceFacing': actual_facing, 'canMirror': False, 'requestedState': 'idle', 'animationFrames': 1,
              'poseKind': actual_pose,
              'modularParts': False, 'combatIntegrated': False, 'canonicalFidelityCertified': False,
              'reviewStatus': 'visually-reviewed' if actual_reviewed else 'needs-visual-review',
              'fullBodyReviewed': bool(actual_fullbody),
              'completeBodyReferenceVerified': job['completeBodyReferenceVerified'],
              'scope': job['scope'], 'openStates': job['openStates'], 'limitations': qualified_limits(job, body_evidence),
              'provenance': {'generator': 'image_gen', 'prompt': metadata['prompt'], 'references': used,
                             'generationRecord': metadata, 'sourceBytesTransformed': False}}
    if same_pixels:
        record['provenance'] = previous_record['provenance']
    if superseded:
        record['provenance']['revisionOf'] = superseded
        atomic_write(ROOT / superseded['image'], old_raw)
        atomic_write(ROOT / superseded['record'], old_record_raw)
    if body_evidence:
        record['sourceCompletenessEvidence'] = body_evidence
        record['jobLimitations'] = job['limitations']
    record['availableStates'] = admitted_states(record)
    # Both retained files contain exact tool pixels or explicit observations, never a fabricated output.
    atomic_write(target, raw)
    atomic_write(record_path, (json.dumps(record, ensure_ascii=False, indent=2) + '\n').encode())
    return record


def record_failure(path):
    metadata = read(Path(path))
    jobs = {entry['id']: entry for entry in load_jobs()['jobs']}
    uid = metadata.get('id')
    if uid not in jobs or metadata.get('generator') != 'image_gen':
        raise ValueError('Generation failures require an exact requested UID and the actual tool name')
    reason = metadata.get('reason') or metadata.get('error')
    if not isinstance(reason, str) or not reason.strip():
        raise ValueError('An actual tool failure reason is required')
    entry = {'id': uid, 'label': jobs[uid]['label'], 'incarnation': jobs[uid]['incarnation'],
             'reason': reason, 'generator': 'image_gen', 'originalFailureRecord': metadata,
             'countsAsGeneratedSprite': False}
    target = PACK / 'failures' / (uid + '.json')
    if target.exists() and read(target) != entry:
        raise ValueError('A recorded failed attempt must not be overwritten by a different error')
    atomic_write(target, (json.dumps(entry, ensure_ascii=False, indent=2) + '\n').encode())
    return entry


def build():
    jobs = load_jobs()
    requested = {entry['id']: entry for entry in jobs['jobs']}
    sprites = []
    for path in sorted((PACK / 'records').glob('*.json')):
        entry = read(path)
        # Older in-flight receipts stay immutable; an absent observation is never a neutral pose.
        entry.setdefault('poseKind', 'unknown')
        if entry['id'] not in requested or path.stem != entry['id']:
            raise ValueError('Unknown or mismatched generated sprite record')
        image = (ROOT / entry['image']).resolve()
        if not image.is_relative_to((PACK / 'generated').resolve()):
            raise ValueError('Generated image leaves the output pack')
        raw = image.read_bytes()
        if len(raw) != entry['bytes'] or sha(raw) != entry['sha256']:
            raise ValueError('Generated PNG differs from its recorded bytes')
        measured = measure(raw)
        if any(entry[key] != measured[key] for key in measured):
            raise ValueError('Generated alpha, bounds or dimensions differ from the PNG')
        if entry.get('canonicalFidelityCertified') is not False or entry.get('combatIntegrated') is not False:
            raise ValueError('Unsupported final certification in the generation pack')
        if entry.get('availableStates') != admitted_states(entry) or entry.get('requestedState') != 'idle' or entry.get('canMirror') is not False:
            raise ValueError('A generated neutral pose cannot imply unseen states or sides')
        if entry['poseKind'] not in POSE_KINDS or entry['poseKind'] == 'neutral-base' and entry.get('reviewStatus') != 'visually-reviewed':
            raise ValueError('Unsupported or unreviewed neutral pose declaration')
        if (entry.get('reviewStatus') not in ('visually-reviewed', 'needs-visual-review')
                or type(entry.get('fullBodyReviewed')) is not bool
                or entry.get('sourceFacing') not in ('left', 'right', 'front', 'unknown')
                or entry.get('completeBodyReferenceVerified') != requested[entry['id']]['completeBodyReferenceVerified']):
            raise ValueError('Unsupported or inconsistent source/review declaration')
        body_evidence = entry.get('sourceCompletenessEvidence')
        if body_evidence:
            verified = source_completeness_evidence(body_evidence['path'], entry['id'], entry['sha256'],
                                                    entry['provenance']['references'], entry['sourceFacing'], entry['image'])
            if verified != body_evidence:
                raise ValueError('Source completeness observation bytes or scope changed')
        if entry['fullBodyReviewed'] and (entry['reviewStatus'] != 'visually-reviewed'
                or entry['scope'] == 'context-encounter'
                or not (any(ref.get('bodyCoverage') == 'complete' for ref in entry['provenance']['references']) or body_evidence)):
            raise ValueError('Full-body review cannot be inferred from a generated or contextual image')
        revision = entry.get('provenance', {}).get('revisionOf')
        if revision:
            expected = f"modules/fidelity-r27/sprites/superseded/{entry['id']}/{revision['sha256']}/"
            if revision['image'] != expected + 'idle-right.png' or revision['record'] != expected + 'sprite-record.json':
                raise ValueError('A superseded generation archive leaves its exact UID/SHA directory')
            archived = (ROOT / revision['record']).read_bytes()
            if sha((ROOT / revision['image']).read_bytes()) != revision['sha256'] or sha(archived) != revision['recordSha256']:
                raise ValueError('A superseded generation archive changed bytes')
            historical = json.loads(archived)
            if historical['id'] != entry['id'] or historical['sha256'] != revision['sha256']:
                raise ValueError('A superseded generation record belongs to a different identity')
        sprites.append(entry)
    if (len({entry['id'] for entry in sprites}) != len(sprites)
            or len({entry['sha256'] for entry in sprites}) != len(sprites)
            or len({entry['decodedRgbaSha256'] for entry in sprites}) != len(sprites)):
        raise ValueError('Independent identities require independent generated PNG files')
    produced = {entry['id'] for entry in sprites}
    failures = {}
    for path in sorted((PACK / 'failures').glob('*.json')):
        entry = read(path)
        if entry.get('id') not in requested or path.stem != entry['id'] or entry.get('countsAsGeneratedSprite') is not False:
            raise ValueError('Unsupported generation failure record')
        failures[entry['id']] = entry
    pending = [{'id': entry['id'], 'label': entry['label'], 'incarnation': entry['incarnation'],
                'scope': entry['scope'], 'completeBodyReferenceVerified': entry['completeBodyReferenceVerified'],
                'generationStatus': 'BLOCKED_BY_TOOL' if entry['id'] in failures else 'AWAITING_OUTPUT',
                'reason': failures[entry['id']]['reason'] if entry['id'] in failures else 'No actual generated PNG has been imported for this UID.'}
               for entry in jobs['jobs'] if entry['id'] not in produced]
    return {'schema': 're.bow.generated-combat-sprites/1', 'release': 'R27',
            'purpose': 'Source-guided generated neutral poses; original-game rendering and final combat cycles unverified.',
            'jobs': {'path': 'jobs.json', 'sha256': sha((PACK / 'jobs.json').read_bytes())},
            'counts': {'targetIdentities': 385, 'generatedSprites': len(sprites), 'pendingSprites': len(pending),
                       'visuallyReviewedSprites': sum(entry['reviewStatus'] == 'visually-reviewed' for entry in sprites),
                       'fullBodyReviewedSprites': sum(entry['fullBodyReviewed'] for entry in sprites),
                       'neutralBaseSprites': sum(entry['poseKind'] == 'neutral-base' for entry in sprites),
                       'neutralBaseCombatEligibleSprites': sum(entry['availableStates'] == ['idle'] for entry in sprites),
                       'sourceBindPoseSprites': sum(entry['poseKind'] == 'source-bind-pose' for entry in sprites),
                       'sourcePresentationSprites': sum(entry['poseKind'] == 'source-presentation' for entry in sprites),
                       'unknownPoseSprites': sum(entry['poseKind'] == 'unknown' for entry in sprites),
                       'generationBlockedSprites': sum(entry['id'] in failures for entry in pending),
                       'recordedGenerationFailures': len(failures),
                       'originalGameSprites': 0, 'completeCombatAnimationSets': 0,
                       'canonicalFidelityCertified': 0}, 'sprites': sprites, 'pending': pending,
            'failures': list(failures.values())}


def migrate_contract_fields():
    """Conservatively add only explicit pose/capability fields; never infer neutral poses."""
    changes = []
    for path in sorted((PACK / 'records').glob('*.json')):
        before = path.read_bytes()
        entry = json.loads(before)
        image = ROOT / entry['image']
        if sha(image.read_bytes()) != entry['sha256']:
            raise ValueError('Cannot migrate a changed generated PNG')
        old = dict(entry)
        entry.setdefault('poseKind', 'unknown')
        entry['requestedState'] = 'idle'
        entry['availableStates'] = admitted_states(entry)
        fields = [key for key in ('poseKind', 'requestedState', 'availableStates') if old.get(key) != entry.get(key)]
        if fields:
            # Refuse a concurrent reviewer update instead of replacing its observations.
            if path.read_bytes() != before:
                raise ValueError('Concurrent metadata review; rerun the conservative migration')
            raw = (json.dumps(entry, ensure_ascii=False, indent=2) + '\n').encode()
            atomic_write(path, raw)
            changes.append({'id': entry['id'], 'beforeRecordSha256': sha(before), 'afterRecordSha256': sha(raw),
                            'pngSha256': entry['sha256'], 'changedFields': fields})
    target = ROOT / 'docs/R27_SPRITE_CONTRACT_MIGRATION.json'
    previous = read(target) if target.exists() else {'schema': 're.bow.sprite-contract-migration-r27/1', 'changes': []}
    previous['changes'].extend(changes)
    previous['scope'] = 'Only poseKind/requestedState/availableStates metadata changed. Absent pose observations remain unknown. Generated PNGs, source provenance and frozen jobs remain unchanged.'
    atomic_write(target, (json.dumps(previous, ensure_ascii=False, indent=2) + '\n').encode())
    return changes


def write_manifest(check=False):
    result = build()
    raw = (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode()
    target = PACK / 'manifest.json'
    if check:
        if target.read_bytes() != raw:
            raise ValueError('Generated sprite registry differs from actual files and records')
    else:
        atomic_write(target, raw)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--uid')
    parser.add_argument('--source', type=Path)
    parser.add_argument('--generation-record', type=Path)
    parser.add_argument('--reviewed', action='store_true')
    parser.add_argument('--full-body-reviewed', action='store_true')
    parser.add_argument('--facing', choices=('left', 'right', 'front', 'unknown'))
    parser.add_argument('--revision-of', help='Explicit old active PNG SHA; preserve it before a corrective generation replaces it')
    parser.add_argument('--source-completeness-evidence', type=Path, help='SHA-bound manual whole-body source/output observation; no frozen job mutation')
    parser.add_argument('--pose-kind', choices=POSE_KINDS, help='Explicit reviewed pose classification; absence stays unknown')
    parser.add_argument('--migrate-contract-fields', action='store_true', help='Add conservative pose/capability metadata without changing pixels or inferring neutral poses')
    parser.add_argument('--batch', type=Path, help='JSON array of import requests, then one manifest rebuild')
    parser.add_argument('--failure-record', type=Path, help='Preserve an actual failed tool request without inventing any PNG')
    parser.add_argument('--defer-manifest', action='store_true', help='Import one actual file; rebuild the manifest after the queue finishes')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if args.migrate_contract_fields:
        if args.uid or args.batch or args.failure_record or args.source or args.generation_record or args.reviewed or args.full_body_reviewed or args.facing or args.revision_of or args.source_completeness_evidence or args.pose_kind or args.check:
            parser.error('--migrate-contract-fields cannot be combined with image import or check flags')
        changes = migrate_contract_fields()
        print(json.dumps({'metadata_contracts_migrated': len(changes), 'png_bytes_changed': 0, 'neutral_poses_inferred': 0}))
        if args.defer_manifest:
            return
    if args.failure_record:
        if args.uid or args.batch or args.source or args.generation_record or args.reviewed or args.full_body_reviewed or args.facing or args.revision_of or args.source_completeness_evidence or args.pose_kind or args.check:
            parser.error('--failure-record cannot be combined with image import or check flags')
        failure = record_failure(args.failure_record)
        if args.defer_manifest:
            print(json.dumps({'failed_request_recorded': failure['id'], 'countsAsGeneratedSprite': False, 'manifest_rebuild_deferred': True}))
            return
    elif args.batch:
        if args.uid or args.source or args.generation_record or args.reviewed or args.full_body_reviewed or args.facing or args.revision_of or args.source_completeness_evidence or args.pose_kind or args.check or args.defer_manifest:
            parser.error('--batch cannot be combined with individual import or check flags')
        requests = read(args.batch)
        if not isinstance(requests, list) or len({item['uid'] for item in requests}) != len(requests):
            raise ValueError('Batch imports require a list of distinct UID')
        existing = [read(path) for path in (PACK / 'records').glob('*.json')]
        for item in requests:
            record = import_sprite(item['uid'], item['source'], item['generation_record'],
                                   item.get('reviewed', False), item.get('facing'),
                                   item.get('full_body_reviewed', False), existing, item.get('revision_of'),
                                   item.get('source_completeness_evidence'), item.get('pose_kind'))
            existing = [previous for previous in existing if previous['id'] != record['id']]
            existing.append(record)
    elif args.uid:
        if args.check or not args.source or not args.generation_record:
            parser.error('--uid requires --source and --generation-record, without --check')
        record = import_sprite(args.uid, args.source, args.generation_record, args.reviewed, args.facing, args.full_body_reviewed,
                               revision_of=args.revision_of, source_completeness_path=args.source_completeness_evidence,
                               pose_kind=args.pose_kind)
        if args.defer_manifest:
            print(json.dumps({'imported': record['id'], 'sha256': record['sha256'], 'manifest_rebuild_deferred': True}))
            return
    elif args.source or args.generation_record or args.reviewed or args.full_body_reviewed or args.facing or args.revision_of or args.source_completeness_evidence or args.pose_kind or args.defer_manifest:
        parser.error('Import flags require --uid')
    print(json.dumps(write_manifest(args.check)['counts']))


if __name__ == '__main__':
    main()
