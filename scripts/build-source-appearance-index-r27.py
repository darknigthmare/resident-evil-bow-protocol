#!/usr/bin/env python3
"""Index exact existing appearance references without promoting portraits to bodies."""
from collections import Counter
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'modules/fidelity-r27/sources/manifest.json'


def read(path):
    return json.loads((ROOT / path).read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def local(value):
    if not isinstance(value, str) or not value or Path(value).is_absolute() or '\\' in value or '..' in Path(value).parts:
        raise ValueError('Appearance evidence paths must be relative and stay inside the checkout')
    supplied = ROOT / value
    path = supplied.resolve(strict=True)
    if not path.is_relative_to(ROOT) or not path.is_file() or any(part.is_symlink() for part in (supplied, *supplied.parents)):
        raise ValueError('Appearance evidence must be a regular checkout-local file')
    return path


def image_record(value, role, *, complete=False, **metadata):
    path = local(value)
    with Image.open(path) as image:
        image.verify()
    with Image.open(path) as image:
        width, height = image.size
        alpha = image.mode in ('RGBA', 'LA') or 'transparency' in image.info
    # An explicit conservative coverage classification takes precedence over a historical flag.
    coverage = metadata.pop('bodyCoverage', 'complete' if complete else 'unknown')
    return {'path': path.relative_to(ROOT).as_posix(), 'sha256': sha(path), 'bytes': path.stat().st_size,
            'width': width, 'height': height, 'hasAlphaChannel': alpha, 'role': role,
            'bodyCoverage': coverage,
            'exactIdentity': metadata.pop('exactIdentity', True), 'candidate': metadata.pop('candidate', False),
            'independentAppearanceReviewCompleted': False, **metadata}


def build():
    roster = read('data/roster.json')
    models = read('modules/fidelity-r26/models/catalog.json')
    sheets = read('modules/fidelity-r26/sprites/manifest.json')
    reviewed = {entry['id']: entry for entry in read('modules/source-motion-r22/native-portraits.json')['entries']}
    contexts = {entry['id'] for entry in read('data/catalog-expansion-v070.json')['records'] if entry.get('encounter')}
    ids = {entry['id'] for entry in roster['catalog']}
    fighters = {entry['uid']: entry for entry in roster['fighters']}
    entries = []
    for entry in roster['catalog']:
        uid = entry['id']
        portrait = image_record(entry['portrait'], 'portrait', sourceUrl=entry.get('imageUrl', ''),
                                sourcePage=entry.get('sourcePage', ''), edition=entry['game'],
                                bodyCoverageBasis='Historical catalogue portrait assignment only; body completeness is not established.')
        portrait['historicalRecordedSha256'] = entry.get('sha256')
        portrait['historicalRecordedBytes'] = entry.get('bytes')
        portrait['historicalMetadataMatchesCurrentFile'] = (
            portrait['sha256'] == entry.get('sha256') and portrait['bytes'] == entry.get('bytes')) if entry.get('sha256') and entry.get('bytes') else None
        refs = [portrait]
        if uid in reviewed:
            source = reviewed[uid]
            path = 'modules/source-motion-r22/' + source['image']
            body = source['view_scope'] == 'body'
            record = image_record(path, 'full-body-reference' if body else 'portrait' if source['view_scope'] == 'portrait' else 'scene-reference',
                                  complete=body, sourceUrl=source['source_image']['url'],
                                  sourcePage=source['source_page']['url'], edition=source['source_game'],
                                  bodyCoverageBasis='R22 recorded visual-and-adjacent-text review: ' + source['visible_review']['notes'],
                                  reviewManifest='modules/source-motion-r22/native-portraits.json',
                                  sourceReviewRecorded=True, sourceViewScope=source['view_scope'])
            if record['sha256'] != source['sha256']:
                raise ValueError('Reviewed R22 image differs from its original source record')
            refs.append(record)
        fighter = fighters.get(uid)
        if fighter and fighter.get('sprite'):
            complete = fighter.get('visual', {}).get('fullBody') is True
            refs.append(image_record(fighter['sprite'], 'full-body-reference' if complete else 'partial-body-reference',
                                     complete=complete, bodyCoverage='partial', sourceUrl=fighter.get('spriteSource', ''),
                                     sourcePage=fighter.get('reference', ''), edition=entry['game'],
                                     bodyCoverageBasis='Historical visual.fullBody flag, not a new independent anatomical review.'))
        exact_models, candidate_models = [], []
        for model in models['entries']:
            exact = model.get('subjectId') == uid
            candidate = model.get('candidateUid') == uid
            if not exact and not candidate:
                continue
            role = model.get('modelRole', 'reference')
            info = {'id': model['id'], 'sourcePage': model.get('sourcePage', ''),
                    'sourceModelSha256': model['model']['sha256'], 'sourceEdition': model.get('sourceEdition', model['game']),
                    'geometryScope': model.get('geometryScope', ''), 'modelRole': role,
                    'exactIdentity': exact, 'candidate': candidate,
                    'viewer': 'modules/fidelity-r26/models/index.html?model=' + model['id']}
            (exact_models if exact else candidate_models).append(info)
            # A separately declared associated object or part cannot be a body's reference.
            if role == 'associated-object' or 'part' in model.get('geometryScope', '').lower():
                continue
            if model.get('preview'):
                base = ROOT / 'modules/fidelity-r26/models' / model['base']
                path = (base / model['preview']['path']).resolve()
                if sha(path) != model['preview']['sha256']:
                    raise ValueError('Published model preview SHA mismatch')
                refs.append(image_record(path.relative_to(ROOT).as_posix(), 'model-preview',
                                         exactIdentity=exact, candidate=candidate, sourceUrl=model.get('sourcePage', ''),
                                         edition=info['sourceEdition'], modelId=model['id'],
                                         sourceModelSha256=info['sourceModelSha256'],
                                         bodyCoverageBasis='Publisher preview; uncropped canonical body completeness has not been independently established.'))
        for sheet in sheets['entries']:
            if sheet.get('subjectId') != uid or sheet.get('candidateUid'):
                continue
            if sheet.get('originalGameSprite') is not False or sheet.get('combatReady') is not False:
                raise ValueError('Derived source sheets cannot become certified game sprites')
            path = ROOT / 'modules/fidelity-r26/sprites' / sheet['sheet']['path']
            if sha(path) != sheet['sheet']['sha256']:
                raise ValueError('Derived model sheet SHA mismatch')
            refs.append(image_record(path.relative_to(ROOT).as_posix(), 'source-model-render', complete=True,
                                     sourceUrl=sheet.get('sourcePage', ''), edition=entry['game'], modelId=sheet['id'],
                                     sourceModelSha256=sheet['sourceModelSha256'], derived=True,
                                     originalGameSprite=False, combatReady=False,
                                     bodyCoverageBasis='Entire published body geometry is framed in all eight views; this is not a new anatomical or native-lighting certification.'))
        # Exact source bytes can occur under several published catalogue names. Keep this visible.
        seen = set()
        refs = [ref for ref in refs if not ((ref['path'], ref['role']) in seen or seen.add((ref['path'], ref['role'])))]
        entries.append({'id': uid, 'name': entry['name'], 'edition': entry['game'], 'sourcePage': entry.get('sourcePage', ''),
                        'encounter': uid in contexts,
                        'references': refs, 'exactModels': exact_models, 'candidateModels': candidate_models,
                        'limitations': [
                            'A portrait is not promoted to a complete body reference.',
                            'Generated output must retain its own interpretation status; these references do not certify geometric 1:1 equality.',
                            'Associated objects, body parts, edition candidates and unpublished sides are not substituted for the exact incarnation.',
                        ]})
    if len(entries) != 389 or {entry['id'] for entry in entries} != ids:
        raise ValueError('All 389 catalogue identities must be present exactly once')
    image_users = Counter(ref['sha256'] for entry in entries for ref in entry['references'])
    for entry in entries:
        for ref in entry['references']:
            ref['referenceOccurrences'] = image_users[ref['sha256']]
    source_paths = ['data/roster.json', 'data/catalog-expansion-v070.json', 'modules/source-motion-r22/native-portraits.json', 'modules/fidelity-r26/models/catalog.json', 'modules/fidelity-r26/sprites/manifest.json']
    return {'schema': 're.bow.appearance-source-index/1', 'release': 'R27',
            'canonicalFidelityCertified': False, 'sourceFilesRewritten': False,
            'inputs': [{'path': path, 'sha256': sha(ROOT / path)} for path in source_paths],
            'counts': {'identities': len(entries), 'sourceImageReferences': sum(len(entry['references']) for entry in entries),
                       'encounterIdentities': len(contexts),
                       'identitiesWithHistoricalCompleteBody': sum(any(ref['role'] == 'full-body-reference' for ref in entry['references']) for entry in entries),
                       'identitiesWithExactModel': sum(bool(entry['exactModels']) for entry in entries),
                       'identitiesWithDerivedCompleteGeometryViews': sum(any(ref['role'] == 'source-model-render' for ref in entry['references']) for entry in entries),
                       'cataloguePortraitMetadataDrifts': sum(entry['references'][0]['historicalMetadataMatchesCurrentFile'] is False for entry in entries),
                       'cataloguePortraitMetadataAbsent': sum(entry['references'][0]['historicalMetadataMatchesCurrentFile'] is None for entry in entries),
                       'bodyCompletenessIndependentlyCertified': 0, 'generatedSprites': 0},
            'entries': entries}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = (json.dumps(build(), ensure_ascii=False, indent=2) + '\n').encode()
    if args.check:
        if TARGET.read_bytes() != raw:
            raise ValueError('Appearance source index differs from its original source files')
    else:
        TARGET.parent.mkdir(parents=True, exist_ok=True)
        TARGET.write_bytes(raw)
    print(json.dumps(json.loads(raw)['counts']))


if __name__ == '__main__':
    main()
