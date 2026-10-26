#!/usr/bin/env python3
"""Project R28 evidence onto all seventeen open workstreams and 389 identities."""
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


def eligible(sprite):
    return bool(sprite and sprite.get('reviewStatus') == 'visually-reviewed'
                and sprite.get('fullBodyReviewed') is True and sprite.get('poseKind') == 'neutral-base'
                and sprite.get('scope') == 'combatant-neutral-pose'
                and sprite.get('sourceFacing') in ('left', 'right') and sprite.get('availableStates') == ['idle'])


def build():
    prior = read('docs/R27_TRACKING.json')
    pack = read('modules/fidelity-r28/sprites/manifest.json')
    graph = read('modules/fidelity-r28/evolutions/graph.json')
    bodies = read('modules/fidelity-r28/sources/body-rasters/manifest.json')
    online = read('modules/fidelity-r28/sources/online-evidence.json')
    gaps = read('modules/fidelity-r28/sprites/body-gaps.json')
    validation = read('docs/R28_VALIDATION.json')
    review = read('docs/R28_SPRITE_REVIEW/index.json')
    canonical_path = 'modules/fidelity-r28/canonical/manifest.json'
    canonical = read(canonical_path) if (ROOT / canonical_path).is_file() else None
    current_canonical = canonical or read('modules/fidelity-r27/canonical/manifest.json')
    documentary_ids = {entry['id'] for entry in current_canonical['entries']
                       if entry.get('new_claim_ids') or entry.get('previous_reviewed_claim_count', 0)}
    new_claims = Counter(claim['uid'] for claim in canonical['claims']) if canonical else Counter()
    audio_path = 'modules/fidelity-r28/audio/manifest.json'
    audio = read(audio_path) if (ROOT / audio_path).is_file() else None
    audio_exact = Counter(entry['identity_id'] for entry in audio['entries'] if entry.get('identity_id')) if audio else Counter()
    audio_candidates = Counter(uid for entry in audio['entries'] for uid in entry.get('candidate_identity_ids', [])) if audio else Counter()
    counts, bc = pack['counts'], bodies['counts']
    family_by_uid = {uid: family for family in graph['families'] for uid in family['forms']}
    outgoing = defaultdict(list)
    for edge in graph['edges']:
        outgoing[edge['from']].append(edge)
    models = defaultdict(list)
    for model in bodies['entries']:
        models[model['id']].append(model)
    sprites = {sprite['id']: sprite for sprite in pack['sprites']}
    pending = {item['id']: item for item in pack['pending']}
    old_updates = {item['id']: item for item in prior['identity_updates']}
    old_sprite_ids = {item['id'] for item in read('assets/sprites/bow/manifest.json')['sprites']}
    roster = read('data/roster.json')['catalog']
    replacements = set(pack['replacements'])
    body_gap_ids = {item['id'] for item in gaps['entries']}
    inputs = ['docs/BOW_FIDELITE_R27.xlsx', 'docs/R27_TRACKING.json', 'data/roster.json',
              'assets/sprites/bow/manifest.json', 'modules/fidelity-r27/sprites/jobs.json',
              'modules/fidelity-r28/sprites/manifest.json', 'modules/fidelity-r28/sprites/body-gaps.json',
              'modules/fidelity-r28/evolutions/graph.json', 'modules/fidelity-r28/evolutions/contract.json',
              'modules/fidelity-r28/sources/body-rasters/manifest.json',
              'modules/fidelity-r28/sources/online-evidence.json', 'modules/fidelity-r28/sources/acquisition-limits.json',
              'docs/R28_VALIDATION.json', 'docs/R28_SPRITE_REVIEW/index.json',
              'docs/R28_EVOLUTIONS_UI.md', 'docs/R28_EVOLUTIONS_ENGINE.md', 'docs/R28_BODY_SOURCES.md',
              'docs/R28_SPRITES.md', 'docs/R28_TRACKING.md', 'docs/FIDELITE_R28.md', 'modules/fidelity-r28/index.html',
              'scripts/build-fidelity-tracking-r28.py', 'scripts/build-validation-summary-r28.py',
              'scripts/export-fidelity-progress-r28.py'] + [item['path'] for item in validation['checks']]
    if canonical:
        inputs.extend([canonical_path, 'modules/fidelity-r28/canonical/curation.json',
                       'modules/fidelity-r28/canonical/captures.json'])
        if (ROOT / 'docs/R28_CANONICAL.md').is_file():
            inputs.append('docs/R28_CANONICAL.md')
    if audio:
        inputs.extend([audio_path, 'docs/R28_AUDIO.md'])
    for path in ('modules/fidelity-r28/dossier-additions.json', 'modules/fidelity-r28/dossier-link.js',
                 'scripts/build-dossier-additions-r28.py', 'docs/R28_DOSSIER.md'):
        if (ROOT / path).is_file():
            inputs.append(path)
    additions = {
        'R20-09': ['Les 32 nouvelles vues géométriques restent des poses de référence de huit modèles pour six UID ; aucun clip, rig final ou nouveau cycle de combat n’est déduit.'],
        'R20-10': [f"Les 363 poses actives ont maintenant toutes une revue visuelle : {counts['newVisualReviews']} revues supplémentaires, {counts['fullBodyReviewedSprites']} corps anatomiques entiers revus et {counts['neutralBaseCombatEligibleSprites']} poses neutres admissibles au seul idle.",
                   'Quatre fichiers partiels sont remplacés à partir de vues du modèle de la même incarnation ; les versions précédentes R27 sont conservées. Les refus restent à 22 et les identités cibles à 385.'],
        'G-PERIMETRE': [f"Les {len(graph['families'])} familles regroupent {sum(len(f['forms']) for f in graph['families'])} formes de la même incarnation. Le sélecteur du mode expose 348 identités, dont 340 ouvertes au duel libre et huit choix de rencontre retenus."],
        'G-PREUVES': [f"Six pages de publication ont été consultées à nouveau sur Internet et leurs réponses brutes sont conservées. Les 32 vues dérivées sont liées à huit modèles et six UID ; les {len(graph['sources'])} citations de transformations restent des preuves secondaires attribuées."],
        'G-COMMANDES': [f"Le mode R28 ajoute {sum(e['playable'] for e in graph['edges'])} mutations volontaires : choix de la forme, vie ≤ 70 %, jauge ≥ 35, après 120 ticks, posture neutre au sol. Les coûts et délais sont des règles originales de ce mode."],
        'G-MANCHES': ['Le scénario naturel Tyrant RE2 remake contre Nemesis RE3 remake se transforme à F679 puis termine par KO dans la recette du moteur R28 ; le replay reconstruit ce résultat.'],
        'G-CINEMATIQUES': ['La mutation remplace l’identité et le profil au tick enregistré, avec une récupération vulnérable de 24 ticks ; aucune cinématique de transformation originale n’est produite.'],
        'G-REPLAYS': ['Un schéma R28 séparé enregistre les demandes volontaires au tick exact. La relecture reconstruit l’avant/après, refuse les données altérées et désactive les commandes de mutation. Les anciens formats restent séparés.'],
        'G-SAUVES': ['Les replays R28 sont exportés volontairement comme fichiers. Les sauvegardes et la base de répétition R27 restent dans leur périmètre historique ; aucune reprise de campagne supplémentaire n’est validée.'],
        'G-VICTIMES': ['Les formes retenues pour leur rencontre particulière restent visibles dans leur famille et accessibles par leur dossier. Neuf transitions contextuelles ne sont pas ouvertes au duel libre ni contournées par un saut de phase.'],
        'G-ECHELLE': ['Les 32 rendus conservent les bornes de la géométrie sélectionnée et les accessoires exportés dans les sources. Anatomie, équipement, phase et taille physique demeurent des qualifications distinctes.'],
        'G-RENDU': [f"Les {counts['neutralBaseCombatEligibleSprites']} poses neutres admissibles peuvent être utilisées dans le rendu idle vérifié. Les quatre nouveaux corps complets sont des poses de liaison ou de présentation, sans nouvel idle.",
                    'Lisa Trevor conserve des lacunes d’accessoires et de phase tentaculaire ; Cerberus conserve une incertitude sur un élément de chaîne. Une anatomie entière ne certifie pas l’apparence complète.'],
        'G-PERF': ['Le chargeur de sprites R28 conserve ses limites d’image, de cache et de transport ; une initialisation unique par cycle empêche la course entre chargement et pageshow. La galerie charge la pose sélectionnée.'],
        'G-ACCESS': ['Les contrôles d’évolution affichent les conditions, la santé et la jauge actuelles ; les boutons compacts restent au-dessus de l’arène. Les touches V/B et une pression Select de manette simulée déclenchent les choix volontaires.',
                     'La sélection principale et le mode ont été vérifiés à 320 px avec chaque taille de texte calculée doublée, ainsi qu’à 1280 px pour le mode ; les manettes physiques restent sans certification.'],
        'G-AUDIO': ['Les publications et preuves audio R27 restent conservées. Cette livraison n’ajoute aucune voix, attribution sonore de mutation ou nouvelle banque officielle.'],
        'G-RECETTE': ['Les rapports R28 vérifient les remplacements corporels, les 363 revues, les admissions de pose, les évolutions volontaires et leurs replays. Les résultats historiques ne sont pas recomptés comme exécutés en R28.'],
        'G-LIVRAISON': ['Les 35 feuilles R27 sont conservées octet pour octet dans leurs parties XML et relations. Sept feuilles R28 suivent les 17 chantiers, 389 identités, transformations, références corporelles et recettes.',
                        'Les compteurs distinguent 363 identités avec PNG actif, quatre nouvelles versions, 22 refus et aucune nouvelle identité cible. Les 17 chantiers restent ouverts.'],
    }
    evidence = {
        'R20-09': [('sources/body-rasters/manifest.json', 'Vues des modèles sources')],
        'R20-10': [('sprites/manifest.json', 'Registre des poses R28'), ('sprites/body-gaps.json', 'Corps et apparences encore incomplets')],
        'G-PERIMETRE': [('evolutions/graph.json', 'Familles, formes et éditions')],
        'G-PREUVES': [('sources/online-evidence.json', 'Réponses Internet conservées'), ('evolutions/graph.json', 'Citations des transitions')],
        'G-COMMANDES': [('evolutions/index.html', 'Mode jouable avec évolutions'), ('../../docs/R28_EVOLUTIONS_ENGINE.md', 'Conditions et moteur')],
        'G-MANCHES': [('../../docs/R28_EVOLUTIONS_ENGINE_TESTS.json', 'Match et KO naturels avec évolution')],
        'G-CINEMATIQUES': [('../../docs/R28_EVOLUTIONS_UI.md', 'Portée de la présentation')],
        'G-REPLAYS': [('../../docs/R28_EVOLUTIONS_ENGINE_TESTS.json', 'Replays reconstruits'), ('../../docs/R28_EVOLUTIONS_BROWSER.json', 'Avant et après la mutation')],
        'G-SAUVES': [('../../docs/R28_EVOLUTIONS_UI.md', 'Fichiers R28 hors progression')],
        'G-VICTIMES': [('evolutions/graph.json', 'Transitions et rencontres retenues')],
        'G-ECHELLE': [('sources/body-rasters/manifest.json', 'Bornes et recettes de caméra'), ('../../docs/R28_BODY_SOURCES.md', 'Anatomie, accessoires et phases')],
        'G-RENDU': [('sprites/index.html', 'Galerie des poses revues'), ('sprites/body-gaps.json', 'Apparences encore ouvertes')],
        'G-PERF': [('../../docs/R28_COMBAT_SPRITE_TESTS.json', 'Chargeur et bornes'), ('../../docs/R28_SPRITES_BROWSER.json', 'Parcours de galerie')],
        'G-ACCESS': [('../../docs/R28_EVOLUTIONS_BROWSER.json', 'Clavier, reflow et manette simulée')],
        'G-AUDIO': [('../fidelity-r27/audio/index.html', 'Publication R27 conservée')],
        'G-RECETTE': [('../../docs/R28_VALIDATION.json', 'Rapports R28 réellement exécutés')],
        'G-LIVRAISON': [('../../docs/R28_TRACKING.json', 'Suivi R28 reproductible')],
    }
    if canonical:
        summary = canonical['summary']
        additions['G-PERIMETRE'].append(f"{summary['newly_reviewed_identities']} incarnations supplémentaires disposent d’une revue documentaire ; {summary['cumulative_reviewed_identities']} au cumul. Cette couverture inclut les localisations et contextes et ne certifie aucun répertoire complet.")
        additions['G-PREUVES'].append(f"{len(canonical['claims'])} nouvelles citations sont liées à leurs captures ; localisations, variantes et acteurs restent distingués des gestes, des timings et des captures primaires.")
        evidence['G-PERIMETRE'].append(('canonical/index.html', 'Couverture documentaire cumulative'))
        evidence['G-PREUVES'].append(('canonical/manifest.json', 'Citations et contexte exacts'))
    if audio:
        ac = audio['counts']
        additions['G-AUDIO'] = [f"{ac['documentary_clips']} fichiers WAV publiés, {ac['distinct_published_file_contents_sha256']} contenus SHA distincts et {ac['duplicate_published_file_contents']} doublons de publication. {ac['contents_already_present_r24_r27']} contenus sont déjà présents dans les versions antérieures.",
            f"{ac['exact_subject_clips']} clips appartiennent au groupe publié Licker de RE3 remake ; {ac['candidate_only_clips']} clips restent candidats NE-α/Nemesis pour quatre UID. Aucun son de mutation, geste ou locuteur individuel n’est affecté automatiquement au combat."]
        evidence['G-AUDIO'] = [('audio/index.html', 'Écoute volontaire et attributions séparées'), ('../../docs/R28_AUDIO.md', 'Archives, doublons et limites')]
    tasks = []
    changed_ids = set(additions) - {'R20-09', 'G-CINEMATIQUES', 'G-SAUVES'}
    for previous in prior['tasks']:
        task = {key: previous[key] for key in ('id', 'title', 'category')}
        task.update(status='EN COURS', advances=additions[task['id']], remaining=list(previous['remaining']),
                    evidence=[{'href': href, 'label': label} for href, label in evidence[task['id']]],
                    previous_evidence={'path': 'docs/R27_TRACKING.json', 'workstreamId': task['id']},
                    r28_new_implementation=task['id'] in changed_ids)
        if task['id'] == 'R20-10':
            task['remaining'] = [f"{gaps['sourceAndGeneratedBodyNotJointlyQualified']} corps ne disposent pas d’une qualification conjointe source/génération, dont {gaps['combatantBodiesPending']} combattants et {gaps['contextBodiesNotQualified']} rencontres ; les 22 refus sont conservés.",
                                 'Cycles complets, membres, deux orientations, gestes, effets, équipements et phases encore non vérifiés.']
        tasks.append(task)
    rows, updates = [], []
    for entry in roster:
        uid = entry['id']; sprite = sprites.get(uid); wait = pending.get(uid, {}); family = family_by_uid.get(uid)
        update = {**old_updates[uid]}
        if sprite:
            update.update(visual=sprite['image'], sprite_generated=True, sprite_review_status=sprite['reviewStatus'],
                sprite_full_body_reviewed=sprite['fullBodyReviewed'], sprite_reference_full_body_verified=sprite['completeBodyReferenceVerified'],
                sprite_scope=sprite['scope'], sprite_facing=sprite['sourceFacing'], sprite_pose_kind=sprite['poseKind'],
                sprite_available_states=sprite['availableStates'], sprite_combat_eligible=eligible(sprite),
                sprite_combat_integrated=False, sprite_generation_status='GENERATED', sprite_generation_reason='')
            rows.append(['R20-10', uid, 'Pose active R28', sprite['image'],
                         f"Revue {sprite['reviewStatus']}; corps anatomique entier {sprite['fullBodyReviewed']}; pose {sprite['poseKind']}; côté {sprite['sourceFacing']}; idle {eligible(sprite)}; équipement/phase séparés.", sprite['sha256']])
        else:
            update.update(sprite_generation_status='HISTORICAL_R20' if uid in old_sprite_ids else wait.get('generationStatus', 'AWAITING_OUTPUT'),
                          sprite_generation_reason=wait.get('reason', ''))
        update.update(r28_replaced=uid in replacements, r28_family_id=family['id'] if family else '',
                      r28_family_base=family['baseUid'] if family else '', r28_context_only=uid in graph['contextOnlyUids'],
                      r28_evolution_targets=[edge['to'] for edge in outgoing[uid] if edge['playable']],
                      r28_held_targets=[edge['to'] for edge in outgoing[uid] if not edge['playable']],
                      r28_source_models=len(models[uid]), r28_source_views=sum(len(model['views']) for model in models[uid]),
                      r28_body_jointly_qualified=uid in sprites and uid not in body_gap_ids,
                      r28_equipment_complete=bool(sprite and sprite.get('equipmentCompletenessReviewed') is True),
                      r28_known_appearance_gaps=sprite.get('knownAppearanceGaps', []) if sprite else [],
                      r28_canonical_claims=new_claims[uid], r28_documentary_reviewed=uid in documentary_ids,
                      r28_audio_exact_clips=audio_exact[uid], r28_audio_candidate_clips=audio_candidates[uid])
        update['limitations'] = 'Une anatomie entière ne certifie ni équipement complet, toutes les phases, géométrie 1:1, vue opposée ou animation originale. Les conditions des évolutions R28 sont des règles de simulation.'
        updates.append(update)
    for item in review['entries']:
        inputs.append(item['path'])
        rows.append(['G-PREUVES', item['uid'], 'Nouvelle revue visuelle R28', item['path'], 'Observation SHA-liée de l’image active ; aucune certification 1:1.', item['sha256']])
    for model in bodies['entries']:
        for view in model['views']:
            path = 'modules/fidelity-r28/sources/body-rasters/' + view['path']; inputs.append(path)
            rows.append(['G-PREUVES', model['id'], 'Vue caméra de géométrie source', path,
                         model['sourcePoseScope'] + ' ' + model['equipmentScope'], view['sha256']])
    for capture in online['entries']:
        inputs.append(capture['path'])
        rows.append(['G-PREUVES', 'MODÈLE SOURCE', 'Page de publication consultée en R28', capture['url'],
                     f"HTTP {capture['status']}; capture brute {capture['path']}; source secondaire.", capture['sha256']])
    for edge in graph['edges']:
        rows.append(['G-COMMANDES', edge['from'], 'Évolution jouable' if edge['playable'] else 'Transition de rencontre retenue', edge['to'],
                     'Conditions originales R28 ; source d’identité/phase distincte de la règle de duel.', '; '.join(edge['sourceIds'])])
    for source in graph['sources']:
        rows.append(['G-PREUVES', source.get('uid', source.get('id', 'TRANSITION')), 'Citation documentaire de transformation',
                     source.get('url', source.get('path', '')), source.get('scope', 'Source secondaire de la même incarnation.'),
                     source.get('quote', source.get('excerpt', ''))])
        for key in ('path', 'rawPath', 'snapshotPath', 'snapshot'):
            if isinstance(source.get(key), str) and (ROOT / source[key]).is_file():
                inputs.append(source[key])
    for uid in sorted(replacements):
        sprite = sprites[uid]; inputs.append(sprite['image'])
        proof = sprite.get('sourceCompletenessEvidence')
        if proof:
            inputs.append(proof['path'])
    if canonical:
        for claim in canonical['claims']:
            for proof in claim['evidence']:
                rows.append(['G-PREUVES', claim['uid'], 'Citation R28 — ' + claim['type'], proof['source_id'],
                             proof.get('scope', claim.get('limitation', 'Source secondaire.')), proof['excerpt']])
        for source in canonical['sources']:
            value = source.get('snapshot')
            if isinstance(value, str):
                target = (ROOT / 'modules/fidelity-r28/canonical' / value).resolve()
                if target.is_relative_to(ROOT) and target.is_file():
                    inputs.append(target.relative_to(ROOT).as_posix())
    if audio:
        for entry in audio['entries']:
            subject = entry.get('identity_id') or 'CANDIDATS : ' + '; '.join(entry.get('candidate_identity_ids', []))
            rows.append(['G-AUDIO', subject, entry['published_group'], 'modules/fidelity-r28/audio/' + entry['path'],
                         entry['assignment_status'] + '; ' + entry['attribution_scope'] + '; aucune écoute sémantique indépendante ou affectation de combat.', entry['sha256']])
        for source in audio['sources']:
            for key in ('page_path', 'archive_path'):
                if source.get(key):
                    inputs.append('modules/fidelity-r28/audio/' + source[key])
            for part in source.get('archive_parts', []):
                inputs.append('modules/fidelity-r28/audio/' + part['path'])
    statistics = [
        {'label': 'poses actives sur 385 cibles', 'value': counts['generatedSprites'], 'scope': '22 refus conservés ; quatre remplacements ne créent aucune nouvelle identité cible.'},
        {'label': 'poses actives revues visuellement', 'value': counts['visuallyReviewedSprites'], 'scope': '171 revues supplémentaires R28 ; aucune revue visuelle ne certifie le 1:1 global.'},
        {'label': 'corps anatomiques entiers revus', 'value': counts['fullBodyReviewedSprites'], 'scope': 'L’équipement complet et les différentes phases restent des critères séparés.'},
        {'label': 'poses admissibles au seul idle', 'value': counts['neutralBaseCombatEligibleSprites'], 'scope': 'Pose neutre, corps et côté revus ; aucun cycle complet.'},
        {'label': 'versions corporelles remplacées', 'value': len(replacements), 'scope': 'Même incarnation sourcée, versions R27 conservées ; zéro nouvel idle pour ces quatre versions.'},
        {'label': 'mutations volontaires jouables', 'value': sum(edge['playable'] for edge in graph['edges']), 'scope': '26 liens documentés dans quinze familles ; neuf transitions de rencontre retenues.'},
        {'label': 'vues dérivées de modèles sources', 'value': bc['renderedReferenceImages'], 'scope': f"{bc['sourceBodyModels']} modèles / {bc['identities']} UID ; zéro image originale extraite ou sprite de combat certifié."},
        {'label': 'corps conjointement non qualifiés', 'value': gaps['sourceAndGeneratedBodyNotJointlyQualified'], 'scope': f"{gaps['combatantBodiesPending']} combattants et {gaps['contextBodiesNotQualified']} contextes, distincts des 22 refus ; accessoires et phases restent ouverts."},
        {'label': 'chantiers ouverts', 'value': 17, 'scope': 'Les acquis et limites de chaque chantier restent visibles ; aucune clôture automatique.'},
    ]
    statistics.insert(-1, {'label': 'incarnations avec revue documentaire au cumul', 'value': len(documentary_ids),
                         'scope': 'Couverture des assertions documentaires, incluant lieux et contextes ; zéro répertoire complet, capture primaire ou fidélité 1:1 certifiée.'})
    if audio:
        statistics.insert(-1, {'label': 'fichiers WAV publiés en R28', 'value': audio['counts']['documentary_clips'],
            'scope': f"{audio['counts']['distinct_published_file_contents_sha256']} contenus SHA distincts ; 301 clips sous le groupe Licker publié et 1 149 clips candidats NE-α/Nemesis ; zéro geste sonore certifié."})
    result = {'schema': 're.bow.parallel-workstreams/3', 'release': 'R28', 'canonical_fidelity_certified': 0,
              'summary': '363 poses actives revues, quatre versions corporelles étendues à partir de sources attribuées et 17 évolutions volontaires jouables ; 22 refus conservés et 17 chantiers ouverts.',
              'statistics': statistics, 'tasks': tasks, 'identity_updates': updates, 'source_rows': rows,
              'validation': validation['checks'], 'validation_complete': validation['complete'],
              'resources': [
                  {'href': 'sprites/index.html', 'title': 'Sprites R28', 'label': 'Examiner les poses revues'},
                  {'href': 'evolutions/index.html', 'title': 'Évolutions volontaires', 'label': 'Jouer avec les formes'},
                  {'href': 'sprites/body-gaps.json', 'title': 'Corps et apparences manquants', 'label': 'Lire les critères ouverts'},
                  {'href': 'sources/body-rasters/manifest.json', 'title': 'Corps sources', 'label': 'Examiner les références'},
                  {'href': '../fidelity-r27/audio/index.html', 'title': 'Audio R27 conservé', 'label': 'Écouter les publications'},
                  {'href': '../fidelity-r27/persistence/index.html', 'title': 'Persistance R27 conservée', 'label': 'Vérifier les valeurs restaurées'}],
              'sprite_manifest': 'modules/fidelity-r28/sprites/manifest.json',
              'evolution_graph': 'modules/fidelity-r28/evolutions/graph.json',
              'body_manifest': 'modules/fidelity-r28/sources/body-rasters/manifest.json',
              'generation_preference': prior['generation_preference'],
              'inputs': [{'path': path, 'sha256': digest(path)} for path in dict.fromkeys(inputs)]}
    if canonical:
        result['resources'].append({'href': 'canonical/index.html', 'title': 'Revue documentaire R28', 'label': 'Lire les citations et contextes'})
        result['canonical_manifest'] = canonical_path
    if audio:
        result['resources'].append({'href': 'audio/index.html', 'title': 'Audio documentaire R28', 'label': 'Écouter les groupes et candidats'})
        result['audio_manifest'] = audio_path
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    result = build()
    content = (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode()
    path = ROOT / 'docs/R28_TRACKING.json'
    if args.check:
        if path.read_bytes() != content:
            raise ValueError('R28 tracking differs from reviewed inputs')
    else:
        path.write_bytes(content)
    workstreams = {key: result[key] for key in ('release', 'summary', 'tasks', 'generation_preference')}
    workstream_bytes = (json.dumps(workstreams, ensure_ascii=False, indent=2) + '\n').encode()
    workstream_path = ROOT / 'docs/R28_WORKSTREAMS.json'
    if args.check:
        if workstream_path.read_bytes() != workstream_bytes:
            raise ValueError('R28 workstreams differ from tracking')
    else:
        workstream_path.write_bytes(workstream_bytes)
    print(json.dumps({'tasks': len(result['tasks']), 'identities': len(result['identity_updates']),
                      'source_rows': len(result['source_rows']), 'inputs': len(result['inputs'])}))


if __name__ == '__main__':
    main()
