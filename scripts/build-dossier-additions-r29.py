#!/usr/bin/env python3
"""Expose only exact-UID R29 sprite changes and native-reference evidence."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE = Path('modules/fidelity-r29')
BODY_PATHS = [MODULE / 'sources/body-rasters/manifest.json', MODULE / 'sources/revelations-body-rasters/manifest.json']
POSE_FIELDS = ('fullBodyReviewed', 'completeBodyReferenceVerified', 'scope', 'sourceFacing', 'poseKind',
               'availableStates', 'knownAppearanceGaps', 'equipmentCompletenessReviewed')
EDITION_FIELDS = ('sourceEdition', 'sourceVariantLabel')


def read(path):
    return json.loads(path.read_text())


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def retained_source_observation_files(row, root=ROOT):
    """Validate a legacy manual observation without rewriting the frozen job flag."""
    if row.get('completeBodyReferenceVerified') is True:
        return []
    proof = row.get('sourceCompletenessEvidence')
    if not isinstance(proof, dict) or not proof.get('path'):
        return []
    root = Path(root).resolve(); path = (root / proof['path']).resolve()
    if not path.is_relative_to(root) or not path.is_file() or digest(path) != proof.get('sha256'):
        raise ValueError('Retained manual source observation changed')
    observation = read(path)
    reference, visual = observation.get('reference', {}), observation.get('visual_evidence', {})
    if (observation.get('schema') != 're.bow.source-body-observation-r27/1'
            or observation.get('uid') != row['id'] or observation.get('source_complete_body_observed') is not True
            or observation.get('exact_identity_declared') is not True or observation.get('image_sha256') != row['sha256']
            or observation.get('observed_facing') != row.get('sourceFacing')
            or observation.get('canonical_fidelity_certified') is not False
            or observation.get('original_game_pose_certified') is not False):
        raise ValueError('Retained source observation does not bind this identity and output')
    references = {item['path']: item['sha256'] for item in row.get('provenance', {}).get('references', [])}
    if reference.get('sha256') != references.get(reference.get('path')):
        raise ValueError('Retained source reference differs from the generation provenance')
    files = [proof['path']]
    for item in (reference, visual):
        target = (root / item.get('path', '')).resolve()
        if not target.is_relative_to(root) or not target.is_file() or digest(target) != item.get('sha256'):
            raise ValueError('Retained source or visual comparison bytes changed')
        files.append(target.relative_to(root).as_posix())
    return files


def source_body_observed(row, root=ROOT):
    return row.get('completeBodyReferenceVerified') is True or bool(retained_source_observation_files(row, root))


def build(root=ROOT):
    root = Path(root)
    inputs = [Path('data/roster.json'), Path('modules/fidelity-r28/sprites/manifest.json'), MODULE / 'sprites/manifest.json']
    roster, previous, current = [read(root / path) for path in inputs]
    ids = [row['id'] for row in roster['catalog']]
    known = set(ids)
    if len(ids) != 389 or len(known) != 389:
        raise ValueError('The same exact 389 catalogue identities are required')
    before = {row['id']: row for row in previous['sprites']}
    sprites = {row['id']: row for row in current['sprites']}
    if (len(sprites) != len(current['sprites']) or set(sprites) != set(before)
            or len(current['pending']) != 22 or current['pending'] != previous['pending']):
        raise ValueError('R29 must preserve active identities and all 22 tool refusals')
    models, native = {}, {}
    for path in BODY_PATHS:
        if not (root / path).is_file():
            continue
        body = read(root / path); inputs.append(path)
        for entry in body['entries']:
            uid = entry['id']
            if uid not in known:
                raise ValueError('Unknown native body subject')
            key = entry.get('modelId', entry['id'])
            target = models.setdefault(uid, {})
            views = []
            for view in entry.get('views', []):
                relative = Path(view['path'])
                if relative.is_absolute() or '..' in relative.parts or '\\' in view['path'] or relative.suffix.lower() != '.png':
                    raise ValueError('Body reference must be a local source PNG')
                base_kind = view.get('pathBase', entry.get('pathBase', body.get('pathBase', 'manifest')))
                if base_kind not in ('manifest', 'repository'):
                    raise ValueError('Unknown body-reference path base')
                image = relative if base_kind == 'repository' else path.parent / relative
                if not (image.is_relative_to(MODULE / 'sources') or image.is_relative_to(MODULE / 'motion')):
                    raise ValueError('A new body reference must stay inside the R29 evidence packs')
                actual = root / image
                if not actual.is_file() or actual.stat().st_size != view['bytes'] or digest(actual) != view['sha256']:
                    raise ValueError('Body reference PNG differs from its source evidence')
                views.append({'angle': view.get('angle'), 'path': image.relative_to(MODULE).as_posix(),
                              'sha256': view['sha256'], 'bytes': view['bytes']})
            if key in target:
                old = target[key]
                if (old['sourceEdition'] != entry.get('sourceEdition', '')
                        or old['variant'] != entry.get('sourceVariantScope', entry.get('sourcePoseScope', ''))
                        or old['equipmentScope'] != entry.get('equipmentScope', '')):
                    raise ValueError('A shared body model cannot change its edition, phase or equipment scope')
                combined = {view['path']: view for view in old['views']}
                for view in views:
                    if view['path'] in combined and view != combined[view['path']]:
                        raise ValueError('A shared body reference cannot change its SHA or angle')
                    combined[view['path']] = view
                old['views'] = list(combined.values())
                continue
            target[key] = {'id': key, 'sourceEdition': entry.get('sourceEdition', ''),
                           'variant': entry.get('sourceVariantScope', entry.get('sourcePoseScope', '')),
                           'equipmentScope': entry.get('equipmentScope', ''), 'views': views}
    motion_path = MODULE / 'motion/manifest.json'
    if (root / motion_path).is_file():
        motion = read(root / motion_path); inputs.append(motion_path)
        if motion.get('schema') != 're.bow.native-frame-library-r29/1':
            raise ValueError('Unexpected native frame evidence schema')
        seen = set()
        for entry in motion['entries']:
            uid, key = entry['subjectId'], entry['id']
            if (uid not in known or key in seen or entry.get('originalGameFrames') is not False
                    or entry.get('canonicalFidelityCertified') is not False
                    or entry.get('actionIdentity') != 'unassigned' or entry.get('availableCombatStates') != []
                    or type(entry.get('frameCount')) is not int or entry['frameCount'] != len(entry['frames'])):
                raise ValueError('Native model frames cannot become an assigned combat action')
            seen.add(key)
            native.setdefault(uid, []).append({'id': key, 'clipId': entry['clipId'], 'frameCount': entry['frameCount'],
                'sourceEdition': entry['sourceEdition'],
                'role': entry.get('modelRole', 'body'), 'actionIdentity': 'unassigned', 'availableCombatStates': []})
    variants, seen_variants = {}, set()
    for variant in current.get('documentaryVariants', []):
        uid, key = variant['id'], variant['variantId']
        image = root / variant['image']
        if (uid not in before or key in seen_variants or not key.startswith(uid + '-')
                or variant.get('scope') != 'documentary-edition-variant'
                or variant.get('admittedTargetEdition') is not False or variant.get('targetFullBodyReviewed') is not False
                or variant.get('availableStates') != [] or variant.get('comparesAgainstSha256') != before[uid]['sha256']
                or sprites[uid]['sha256'] != before[uid]['sha256']
                or not image.resolve().is_relative_to((root / MODULE / 'sprites').resolve())
                or not image.is_file() or image.stat().st_size != variant['bytes'] or digest(image) != variant['sha256']):
            raise ValueError('A documentary edition variant cannot supersede its target identity')
        seen_variants.add(key)
        variants.setdefault(uid, []).append({'variantId': key, 'sourceEdition': variant['sourceEdition'],
            'targetIncarnation': variant['targetIncarnation'], 'admittedTargetEdition': False,
            'targetFullBodyReviewed': False, 'availableStates': []})
    entries = []
    for uid in ids:
        sprite, old = sprites.get(uid), before.get(uid)
        source_note = sprite.get('r29LegacySourceNote') if sprite else None
        if source_note:
            path = (root / source_note['path']).resolve()
            if not path.is_relative_to(root.resolve()) or digest(path) != source_note['sha256']:
                raise ValueError('Legacy edition qualification changed')
            document = read(path); matches = [note for note in document['entries'] if note['id'] == uid]
            baseline_binding = document.get('baselineManifest', {})
            if (document.get('schema') != 're.bow.legacy-sprite-source-notes-r29/1'
                    or document.get('manualPngEdits') is not False or document.get('newPoseReviews') != 0
                    or document.get('newTargetIdentities') != 0
                    or baseline_binding.get('path') != 'modules/fidelity-r28/sprites/manifest.json'
                    or baseline_binding.get('sha256') != digest(root / baseline_binding['path'])
                    or sprite['sha256'] != old['sha256'] or sprite['fullBodyReviewed'] != old['fullBodyReviewed']
                    or sprite['poseKind'] != old['poseKind'] or sprite['sourceFacing'] != old['sourceFacing']
                    or len(matches) != 1 or matches[0]['imageSha256'] != sprite['sha256']
                    or matches[0]['sourceEdition'] != sprite.get('sourceEdition')
                    or matches[0]['sourceVariantLabel'] != sprite.get('sourceVariantLabel')
                    or matches[0].get('editionEquivalenceVerified') is not False
                    or any(gap not in sprite.get('knownAppearanceGaps', []) for gap in matches[0]['knownAppearanceGaps'])):
                raise ValueError('Legacy edition note does not bind this unchanged interpretation')
        changed = sprite is not None and (sprite['sha256'] != old['sha256'] or any(sprite.get(key) != old.get(key) for key in POSE_FIELDS + EDITION_FIELDS))
        pose = None
        if changed:
            if sprite.get('reviewStatus') != 'visually-reviewed' or sprite.get('canonicalFidelityCertified') is not False:
                raise ValueError('An unreviewed interpretation cannot be promoted in a Dossier')
            if sprite.get('knownAppearanceGaps') and sprite.get('availableStates'):
                raise ValueError('Known appearance gaps must hold every combat state')
            pose = {key: sprite.get(key, [] if key in ('availableStates', 'knownAppearanceGaps') else False) for key in POSE_FIELDS}
            pose['pixelRevision'] = sprite['sha256'] != old['sha256']
            pose['sourceBodyObserved'] = source_body_observed(sprite, root)
            pose.update({key: sprite.get(key) for key in EDITION_FIELDS})
        sources = list(models.get(uid, {}).values())
        entries.append({'id': uid, 'activeSourceBodyObserved': bool(sprite and source_body_observed(sprite, root)),
                        'spriteChange': pose, 'documentaryVariants': variants.get(uid, []), 'bodyModels': len(sources), 'bodySources': sources,
                        'bodyViews': sum(len(source['views']) for source in sources), 'nativeClips': native.get(uid, [])})
    return {'schema': 're.bow.dossier-additions-r29/1', 'canonicalFidelityCertified': False,
            'summary': {'identities': 389, 'changedSpriteIdentities': sum(row['spriteChange'] is not None for row in entries),
                'pixelRevisions': sum(bool(row['spriteChange'] and row['spriteChange']['pixelRevision']) for row in entries),
                'bodySourceIdentities': len(models), 'bodySourceModels': sum(len(value) for value in models.values()),
                'documentaryEditionVariants': len(seen_variants),
                'nativeSourceIdentities': len(native), 'nativeSourceClips': sum(len(value) for value in native.values()),
                'nativeSourceFrames': sum(clip['frameCount'] for value in native.values() for clip in value),
                'assignedCombatCycles': 0},
            'inputs': [{'path': path.as_posix(), 'sha256': digest(root / path)} for path in inputs], 'identities': entries}


def main():
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('--check', action='store_true'); args = parser.parse_args()
    value = build(); raw = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
    if len(raw) > 512 * 1024:
        raise ValueError('Dossier evidence exceeds its small transport bound')
    output = ROOT / MODULE / 'dossier-additions.json'
    if args.check:
        if output.read_bytes() != raw:
            raise ValueError('R29 Dossier additions differ from their actual manifests')
    else:
        output.parent.mkdir(parents=True, exist_ok=True); output.write_bytes(raw)
    print(json.dumps(value['summary']))


if __name__ == '__main__':
    main()
