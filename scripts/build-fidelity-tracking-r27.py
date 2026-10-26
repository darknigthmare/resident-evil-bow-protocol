#!/usr/bin/env python3
"""Derive R27 Excel progress from real generated assets and separately scoped sources."""
from collections import Counter, defaultdict
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads((ROOT / path).read_text())


def digest(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


def idle_eligible(sprite):
    return bool(sprite and sprite.get('reviewStatus') == 'visually-reviewed'
                and sprite.get('fullBodyReviewed') is True and sprite.get('poseKind') == 'neutral-base'
                and sprite.get('scope') == 'combatant-neutral-pose'
                and sprite.get('sourceFacing') in ('left', 'right') and sprite.get('availableStates') == ['idle'])


def build():
    paths = {name: f'modules/fidelity-r27/{name}/manifest.json' for name in ('sprites', 'sources', 'audio', 'canonical')}
    packs = {name: read(path) for name, path in paths.items()}
    for name in ('motion', 'persistence'):
        path = f'modules/fidelity-r27/{name}/manifest.json'
        if (ROOT / path).is_file():
            paths[name] = path
            packs[name] = read(path)
    raster_path = 'modules/fidelity-r27/sources/body-rasters/manifest.json'
    rasters = read(raster_path) if (ROOT / raster_path).is_file() else {'entries': [], 'counts': {'identities': 0, 'renderedReferenceImages': 0}}
    sprites, sources, audio, canonical = (packs[name] for name in ('sprites', 'sources', 'audio', 'canonical'))
    motion = packs.get('motion', {'entries': [], 'summary': {'sourceAnimationFiles': 0, 'positiveTimeMotionFiles': 0, 'positiveTimePoseFiles': 0}})
    review, validation = read('docs/R27_WORKSTREAMS.json'), read('docs/R27_VALIDATION.json')
    roster = read('data/roster.json')['catalog']
    roster_ids = {item['id'] for item in roster}
    old = {item['id']: item for item in read('docs/R26_TRACKING.json')['tasks']}
    historical_sprites = {item['id'] for item in read('assets/sprites/bow/manifest.json')['sprites']}
    jobs = {item['id']: item for item in read('modules/fidelity-r27/sprites/jobs.json')['jobs']}
    by_sprite = {item['id']: item for item in sprites['sprites']}
    by_pending = {item['id']: item for item in sprites['pending']}
    by_source = {item['id']: item for item in sources['entries']}
    rigs = defaultdict(list)
    for item in motion['entries']:
        rigs[item.get('subjectId') or item['id']].append(item)
    assigned_audio = Counter(item['identity_id'] for item in audio['entries'] if item.get('identity_id') in roster_ids)
    claims = Counter(item['uid'] for item in canonical['claims'])
    values = {
        'generated_sprites': len(by_sprite), 'pending_sprites': len(sprites['pending']),
        'blocked_sprites': sum(item.get('generationStatus') == 'BLOCKED_BY_TOOL' for item in sprites['pending']),
        'awaiting_sprites': sum(item.get('generationStatus') != 'BLOCKED_BY_TOOL' for item in sprites['pending']),
        'reviewed_sprites': sum(item.get('reviewStatus') == 'visually-reviewed' for item in by_sprite.values()),
        'full_body_reviewed': sum(item.get('fullBodyReviewed') is True for item in by_sprite.values()),
        'neutral_base_combat_eligible': sum(idle_eligible(item) for item in by_sprite.values()),
        'context_targets': sum(job['scope'] == 'context-encounter' for job in jobs.values()),
        'source_images': sources['counts']['sourceImageReferences'],
        'source_models': sources['counts']['identitiesWithExactModel'],
        'source_body_refs': sources['counts']['identitiesWithHistoricalCompleteBody'],
        'source_metadata_drifts': sources['counts']['cataloguePortraitMetadataDrifts'],
        'source_metadata_absent': sources['counts']['cataloguePortraitMetadataAbsent'],
        'body_raster_subjects': rasters['counts']['identities'], 'body_raster_views': rasters['counts']['renderedReferenceImages'],
        'new_keyed_files': motion['summary']['sourceAnimationFiles'],
        'new_motions': motion['summary']['positiveTimeMotionFiles'],
        'new_poses': motion['summary']['positiveTimePoseFiles'],
        'audio_files': len(audio['entries']), 'audio_distinct': len({item['sha256'] for item in audio['entries']}),
        'audio_subjects': len(assigned_audio), 'claims': len(canonical['claims']), 'new_reviewed_subjects': len(claims),
        'cumulative_reviewed': canonical['summary']['cumulative_reviewed_identities'],
        'still_unreviewed': len(roster_ids) - canonical['summary']['cumulative_reviewed_identities'],
    }
    if set(old) != {item['id'] for item in review['tasks']}:
        raise ValueError('R27 review must preserve all seventeen workstreams')
    tasks = []
    for item in review['tasks']:
        task = {**old[item['id']], **item, 'status': 'EN COURS'}
        for key in ('advances', 'remaining'):
            task[key] = [text.format_map(values) for text in task[key]]
        tasks.append(task)
    updates, rows, manual_inputs = [], [], []
    for entry in roster:
        uid = entry['id']; sprite = by_sprite.get(uid); job = jobs.get(uid); pending = by_pending.get(uid)
        eligible = idle_eligible(sprite)
        manual = sprite.get('sourceCompletenessEvidence') if sprite else None
        if manual:
            if digest(manual['path']) != manual['sha256']:
                raise ValueError('Manual source body evidence bytes changed: ' + manual['path'])
            manual_inputs.append(manual['path'])
        updates.append({
            'id': uid, 'visual': sprite['image'] if sprite else 'PRÉSENTATION HISTORIQUE R20' if uid in historical_sprites
                  else 'GÉNÉRATION BLOQUÉE PAR L’OUTIL' if pending.get('generationStatus') == 'BLOCKED_BY_TOOL' else 'GÉNÉRATION EN ATTENTE',
            'rig': '; '.join(item['id'] for item in rigs[uid]), 'motion_clips': sum(len(item['clips']) for item in rigs[uid]),
            'audio': assigned_audio[uid], 'claims': claims[uid],
            'limitations': 'Une pose générée ne certifie ni corps original, vue opposée, cycle complet ou fidélité 1:1. Le contexte reste distinct des combattants. Une pose de liaison, de présentation ou inconnue ne devient pas idle.'
                          + (' Observation manuelle du corps source : ' + manual['path'] if manual else ''),
            'sprite_generated': sprite is not None,
            'sprite_review_status': sprite['reviewStatus'] if sprite else 'historical-r20' if uid in historical_sprites else 'pending',
            'sprite_full_body_reviewed': bool(sprite and sprite.get('fullBodyReviewed')),
            'sprite_reference_full_body_verified': bool(sprite.get('completeBodyReferenceVerified') if sprite else job and job.get('completeBodyReferenceVerified')),
            'sprite_scope': sprite['scope'] if sprite else job['scope'] if job else 'historical-presentation',
            'sprite_facing': sprite['sourceFacing'] if sprite else '',
            'sprite_pose_kind': sprite.get('poseKind', 'unknown') if sprite else 'neutral-base' if uid in historical_sprites else 'unknown',
            'sprite_available_states': sprite['availableStates'] if sprite else [],
            'sprite_combat_eligible': eligible, 'sprite_combat_integrated': False,
            'sprite_generation_status': 'GENERATED' if sprite else 'HISTORICAL_R20' if uid in historical_sprites else pending.get('generationStatus', 'AWAITING_OUTPUT'),
            'sprite_generation_reason': pending.get('reason', '') if pending else '',
        })
        if sprite:
            rows.append(['R20-10', uid, 'Pose générée — ' + sprite['scope'], sprite['image'],
                         'Revue : ' + sprite['reviewStatus'] + '; corps entier revu : ' + str(sprite['fullBodyReviewed'])
                         + '; orientation : ' + sprite['sourceFacing'] + '; type de pose : ' + sprite.get('poseKind', 'unknown')
                         + '; admissible idle : ' + str(eligible) + '; zéro cycle complet ou original certifié.', sprite['sha256']])
            if manual:
                rows.append(['G-ECHELLE', uid, 'Observation manuelle locale de corps source', manual['path'],
                             manual['scope'], manual['sha256']])
        elif job:
            blocked = pending.get('generationStatus') == 'BLOCKED_BY_TOOL'
            rows.append(['R20-10', uid, 'Génération bloquée par l’outil' if blocked else 'Génération en attente', job['outputPath'],
                         'Aucun fichier généré n’est compté. Référence corporelle complète : ' + str(job['completeBodyReferenceVerified']), pending.get('reason', '')])
        source = by_source[uid]
        for reference in source['references']:
            rows.append(['G-PREUVES', uid, 'Référence d’apparence — ' + reference['role'], reference['path'],
                         reference.get('bodyCoverageBasis', 'Portée à lire dans le manifeste d’apparence.'), reference['sha256']])
    for entry in motion['entries']:
        for clip in entry['clips']:
            rows.append(['R20-09', entry.get('subjectId') or entry['id'], 'Pose à clés' if clip['positiveTimePoseOnly'] else 'Mouvement après zéro',
                         clip.get('path') or clip['member'], 'Geste non attribué ; rôle : ' + entry.get('modelRole', 'body'), clip['sha256']])
    for entry in rasters['entries']:
        for view in entry['views']:
            rows.append(['G-PREUVES', entry['id'], 'Vue dérivée de géométrie source — pas un sprite image_gen',
                         'modules/fidelity-r27/sources/body-rasters/' + view['path'],
                         entry['sourcePoseScope'] + ' ' + entry['equipmentScope'], view['sha256']])
    for entry in audio['entries']:
        rows.append(['G-AUDIO', entry.get('identity_id') or 'NON ATTRIBUÉ', 'Fichier sonore publié', entry['path'],
                     'Groupe publié ; aucune écoute indépendante, action ou banque native certifiée.', entry['sha256']])
    for claim in canonical['claims']:
        for proof in claim['evidence']:
            rows.append(['G-PREUVES', claim['uid'], claim['type'], proof['source_id'], proof['scope'], proof['excerpt']])
    # Surface current SHA-bound visual observations, including held crops and inferred anatomy.
    # Historical observations of superseded pixels stay in their own reports rather than becoming current admissions.
    reviews = []
    first_review = ROOT / 'docs/R27_SPRITE_REVIEW.json'
    if first_review.is_file():
        reviews.extend((first_review, item) for item in json.loads(first_review.read_text()).get('entries', []))
    review_folder = ROOT / 'docs/R27_SPRITE_REVIEW_BATCHES'
    for path in sorted(review_folder.rglob('*.json')) if review_folder.exists() else []:
        document = json.loads(path.read_text())
        if document.get('schema') == 're.bow.sprite-visual-review-r27/1':
            reviews.append((path, document))
    for path, observation in reviews:
        sprite = by_sprite.get(observation.get('uid'))
        if (not sprite or observation.get('image_sha256') != sprite['sha256']
                or observation.get('observed_facing') != sprite['sourceFacing']
                or observation.get('full_body_reviewed') != sprite['fullBodyReviewed']):
            continue
        relative = path.relative_to(ROOT).as_posix(); manual_inputs.append(relative)
        rows.append(['G-PREUVES', sprite['id'], 'Revue visuelle locale de la génération', relative,
                     observation.get('review_outcome', '') + '; corps revu : ' + str(sprite['fullBodyReviewed'])
                     + '; côté observé : ' + sprite['sourceFacing'] + '; pose : ' + sprite.get('poseKind', 'unknown')
                     + '; zéro image originale ou cycle complet certifié.',
                     observation.get('notes', '')])
        visual = observation.get('visual_evidence')
        if visual:
            if digest(visual['path']) != visual['sha256']:
                raise ValueError('Visual review evidence bytes changed: ' + visual['path'])
            manual_inputs.append(visual['path'])
    input_paths = ['docs/BOW_FIDELITE_R26.xlsx', 'docs/R26_TRACKING.json', 'docs/R27_WORKSTREAMS.json', 'docs/R27_VALIDATION.json',
                   'modules/fidelity-r27/sprites/jobs.json', *paths.values(), *[item['path'] for item in validation['checks']],
                   *review.get('additional_inputs', []), *manual_inputs]
    if rasters['entries']:
        input_paths.append(raster_path)
    result = {
        'schema': 're.bow.parallel-workstreams/2', 'release': 'R27', 'canonical_fidelity_certified': 0,
        'summary': f"{values['generated_sprites']} poses générées, {values['blocked_sprites']} refus conservés et {values['awaiting_sprites']} demandes encore sans résultat sur 385 cibles ; les 17 chantiers restent ouverts.",
        'statistics': [
            {'label': 'poses générées sur 385 cibles', 'value': values['generated_sprites'], 'scope': f"{values['pending_sprites']} sans PNG : {values['blocked_sprites']} refus d’outil et {values['awaiting_sprites']} demandes encore sans résultat ; les 43 contextes restent distincts des combattants libres."},
            {'label': 'corps entiers revus dans les générations', 'value': values['full_body_reviewed'], 'scope': 'Revue du fichier généré, sans certification géométrique de l’original.'},
            {'label': 'poses de base admissibles au rendu idle', 'value': values['neutral_base_combat_eligible'], 'scope': 'Corps entier, côté et pose neutral-base revus ; poses de liaison, de présentation et inconnues exclues, aucun cycle complet.'},
            {'label': 'nouveaux fichiers audio publiés', 'value': values['audio_files'], 'scope': f"{values['audio_distinct']} contenus distincts ; {values['audio_subjects']} UID ; zéro banque native certifiée."},
            {'label': 'incarnations revues au cumul', 'value': values['cumulative_reviewed'], 'scope': f"{values['still_unreviewed']} restent sans revue canonique ; zéro capture primaire nouvelle."},
        ],
        'resources': review['resources'], 'tasks': tasks, 'identity_updates': updates,
        'source_rows': rows, 'validation': validation['checks'],
        'inputs': [{'path': p, 'sha256': digest(p)} for p in dict.fromkeys(input_paths)],
        'generation_preference': review.get('generation_preference'),
        'sprite_manifest': paths['sprites'],
    }
    if 'motion' in paths:
        result['motion_manifest'] = paths['motion']
    return (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    output = ROOT / 'docs/R27_TRACKING.json'
    expected = build()
    if args.check:
        if output.read_bytes() != expected:
            raise ValueError('R27 tracking differs from its reviewed inputs')
    else:
        output.write_bytes(expected)
    result = json.loads(expected)
    print(json.dumps({'check': args.check, 'tasks': len(result['tasks']), 'identities': len(result['identity_updates']),
                      'source_rows': len(result['source_rows']), 'generated_sprites': result['statistics'][0]['value']}))


if __name__ == '__main__':
    main()
