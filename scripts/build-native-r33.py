#!/usr/bin/env python3
"""Bind reviewed R33 native derivations and their strictly held combat claims."""
import argparse
import copy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r33/native'


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def bound(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': digest(raw)}


def verified(record):
    path = (ROOT / record['path']).resolve()
    if not path.is_relative_to(ROOT) or digest(path.read_bytes()) != record['sha256']:
        raise ValueError('Reviewed source evidence differs: ' + record['path'])
    return path


def applied(original):
    manifest = copy.deepcopy(original)
    review_path = PACK / 'review/observations.json'
    review = json.loads(review_path.read_bytes())
    if review['schema'] != 're.bow.native-visual-review-r33/1' or review['nativePngsEdited'] or review['sourceClipsEdited']:
        raise ValueError('Source-preserving visual review required')
    review_proof = bound(review_path)
    manifest['entries'] = [entry for entry in manifest['entries'] if not entry.get('reusedPublishedFrames')]
    for entry in manifest['entries']:
        rows = review['bodies'] if entry['kind'] == 'native-static-pose' else review['nativeScenes']
        observation = next(item for item in rows if item.get('modelId') == entry['modelId']) if entry['kind'] == 'native-static-pose' else next(item for item in rows if item['clipId'] == entry['clipId'])
        verified(observation['contact'])
        entry['fullBodyReviewed'] = observation['fullBodyReviewed']
        entry['fightingPoseReviewed'] = False
        entry['visualReview'] = {**review_proof, 'notes': observation.get('notes', observation.get('observedGesture', {}).get('summary'))}
        if entry['kind'] == 'native-static-pose' and entry['recipe']['cameraAngle'] == 180:
            entry['sourceFacing'] = 'unknown'
            entry['sourceViewLabel'] = 'back-camera-180'
        if entry['kind'] == 'native-sequence':
            entry['observedGesture'] = observation['observedGesture']
    neutral = review['neutralReview']
    verified(neutral['sourceManifest'])
    source = json.loads((ROOT / neutral['sourceManifest']['path']).read_bytes())
    entries = [entry for entry in source['entries'] if entry['subjectId'] == neutral['subjectId']]
    if len(entries) != 2 or {entry['sourceFacing'] for entry in entries} != {'left', 'right'}:
        raise ValueError('The reviewed marine presentation needs both actual camera sides')
    evidence = [{'entryId': entry['id'], 'pngs': [{'path': frame['path'], 'sha256': frame['sha256']}
                 for frame in entry['frames'] + [entry['endpoint']]]} for entry in entries]
    if digest(json.dumps(evidence, sort_keys=True, separators=(',', ':')).encode()) != neutral['sequencePngEvidenceSha256']:
        raise ValueError('The full visually reviewed native sequence bytes changed')
    verified(neutral['contact'])
    measurements, policy = neutral['measurements'], neutral['continuityPolicy']
    if (neutral['habitat'] != 'aquatic' or neutral['contactIsTerrestrial'] or neutral['sourceActionCertified']
        or neutral['originalIdleActionCertified'] or neutral['actionIdentity'] != 'observed-neutral-loop'
        or measurements['playbackSeamBodyHeightRatio'] > policy['maximumLastToFirstBodyHeightRatio']
        or measurements['playbackSeamToMaximumAdjacentRatio'] > policy['maximumLastToFirstToAdjacentRatio']
        or policy['maximumLastToFirstBodyHeightRatio'] != .015 or policy['maximumLastToFirstToAdjacentRatio'] != 1.0):
        raise ValueError('The new aquatic presentation policy is not met')
    for source_entry in entries:
        if source_entry['nativeSource']['clip']['sha256'] != neutral['nativeClipSha256']:
            raise ValueError('The reviewed original source clip changed')
        entry = copy.deepcopy(source_entry)
        entry['id'] += '--r33-observed-neutral'
        entry.update(reusedPublishedFrames=True, publishedSourceEntryId=source_entry['id'],
                     sourceManifest=neutral['sourceManifest'], admittedCombatStates=[], admittedTargetEdition=False,
                     actionIdentity='observed-neutral-loop', actionVerified=False, sourceActionCertified=False,
                     originalIdleActionCertified=False, fullBodyReviewed=True, fightingPoseReviewed=True,
                     observedNeutralLoopReviewed=True, continuityVerified=True, selectablePresentationVariant=True,
                     variantFamilyId=neutral['variantFamilyId'], variantCombatStates=['idle'], knownAppearanceGaps=[],
                     variantHabitat='aquatic', originalGameFrames=False, canonicalFidelityCertified=False,
                     variantScope='Voluntary aquatic source-observed presentation during the adapted 2D waiting state; no original idle, target3DS equivalence or terrestrial contact certified.',
                     visualReview={**review_proof, 'notes': neutral['notes']}, continuityMeasurements=measurements,
                     observedGesture={'label': 'Nage stationnaire observée · variante marine volontaire', 'summary': neutral['notes']})
        manifest['entries'].append(entry)
    manifest['observations'] = review_proof
    manifest['counts']['reusedPublishedFrames'] = sum(entry['frameCount'] for entry in manifest['entries'] if entry.get('reusedPublishedFrames'))
    manifest['counts']['newObservedMarineVariantFamilies'] = 1
    manifest['counts']['selectableObservedMarineSequences'] = 2
    manifest['counts']['totalEntries'] = len(manifest['entries'])
    return manifest


def delivery(manifest):
    contacts = json.loads((PACK / 'review/contacts.json').read_bytes())['contacts']
    review = json.loads((PACK / 'review/observations.json').read_bytes())
    sources = [PACK / 'manifest.json', PACK / 'inputs.json', PACK / 'review/observations.json',
               PACK / 'review/contacts.json', ROOT / 'scripts/prepare-native-r33.py', ROOT / 'scripts/render-native-r33.mjs',
               ROOT / 'scripts/pack-native-r33.py', ROOT / 'scripts/build-native-r33.py', ROOT / 'docs/R33_NATIVE.md',
               ROOT / 'docs/R33_NATIVE_TESTS.json', ROOT / 'docs/R33_NATIVE_RIG_TESTS.json', ROOT / 'docs/R33_NATIVE_BROWSER.json']
    for path in sources[-3:]:
        value = json.loads(path.read_bytes())
        if not value.get('passed') or value.get('failed'):
            raise ValueError('A positive, actually executed native R33 validation report is required: ' + str(path))
        for record in value['sourceFiles']:
            verified(record)
    identities = []
    for uid in sorted({entry['subjectId'] for entry in manifest['entries']}):
        artifacts = [{'path': item['contact']['path'], 'label': item.get('modelId', item.get('clipId')),
                      'kind': 'native-body-review-contact' if 'modelId' in item else 'native-scene-review-contact',
                      'sourceEdition': 'GameCube2002' if uid.startswith('re0-') else 'PC2009' if uid.startswith('re5-') else 'PC/HD2013',
                      'sha256': item['contact']['sha256'], 'bytes': item['contact']['bytes']}
                     for item in contacts if item['subjectId'] == uid]
        if uid == review['neutralReview']['subjectId']:
            contact = review['neutralReview']['contact']
            artifacts.append({'path': contact['path'], 'label': 'Nage stationnaire source observée, variante volontaire',
                              'kind': 'native-observed-marine-loop-review', 'sourceEdition': 'PC/HD2013',
                              'sha256': contact['sha256'], 'bytes': contact['bytes']})
        identities.append({'id': uid, 'summary': 'Source native dérivée et revue ; critères de combat et d’édition conservés séparément.', 'artifacts': artifacts})
    return {'schema': 're.bow.fidelity-lot-r33/1', 'release': 'R33', 'lotId': 'native',
            'workstreams': ['R20-09', 'G-COMMANDES', 'G-CINEMATIQUES', 'G-MANCHES'],
            'summary': 'Trois identités supplémentaires ont des vues de corps sources ; six nouvelles scènes natives complètes et une présentation marine volontaire sont consultables.',
            'advances': [
                'Seize vues indépendantes de quatre corps : deux costumes Zombie RE0 GameCube2002, Chainsaw Majini et Executioner RE5 PC2009, sans retouche de pose ou de géométrie.',
                'Six scènes inédites Sea Creeper/Scagdead, douze projections opposées réelles et1270images60Hz plus douze points de fin ; courbes, poids et textures conservés.',
                'Une variante marine de nage stationnaire observée peut être choisie volontairement ; ses300imagesR30 sont réutilisées, sans être recomptées comme nouveaux rendus ni comme idle original.',
                'Cent cinquante-six échantillons de contact examinés, séquences reconstruites indépendamment et atlas RGBA comparés sans perte.',
                'Les six gestes observés sont nommés descriptivement, sans attribuer BA/DM à une commande, intro, outro ou résultat.'
            ],
            'remaining': [
                'Aucun nouvel idle original certifié, aucune attaque ou séquence de résultat originale affectée.',
                'Les quatre nouveaux corps sont en pose source en T ; les armes RE5 et matériaux inconnus ne sont pas complétés au jugé.',
                'La variante marine est une adaptation de présentation PC/HD2013, sans admission automatique à la cible3DS2012 ni contact terrestre certifié.',
                'Inventaires officiels, timings, scènes causales, sons liés et compatibilités de victimes restent soumis aux preuves d’origine.',
                'Les22refus initiaux et le refus de révisionTyrant sont conservés sans nouvel essai.'
            ],
            'canonicalFidelityCertified': False, 'counts': manifest['counts'], 'sourceFiles': [bound(path) for path in sources],
            'resources': [{'path': 'modules/fidelity-r33/native/index.html', 'label': 'Corps et mouvements sources R33'},
                          {'path': 'modules/fidelity-r33/native/review/observations.json', 'label': 'Revues visuelles et limites'},
                          {'path': 'docs/R33_NATIVE.md', 'label': 'Portée du lot natif'}], 'identities': identities}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--review', action='store_true', help='Apply reviewed qualifications before running the real recipes')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    path = PACK / 'manifest.json'
    current = json.loads(path.read_text())
    reviewed = applied(current)
    payload = (json.dumps(reviewed, ensure_ascii=False, indent=2) + '\n').encode()
    if args.check:
        if payload != path.read_bytes():
            raise ValueError('Reviewed native metadata is not applied reproducibly')
    elif payload != path.read_bytes():
        path.write_bytes(payload)
    if args.review:
        print(json.dumps(reviewed['counts']))
        return
    value = delivery(reviewed)
    encoded = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
    target = PACK / 'delivery.json'
    if args.check:
        if target.read_bytes() != encoded:
            raise ValueError('Native lot delivery differs from current reviewed sources and actual reports')
    else:
        target.write_bytes(encoded)
    print(json.dumps({'counts': reviewed['counts'], 'identities': len(value['identities']), 'sourceFiles': len(value['sourceFiles'])}))


if __name__ == '__main__':
    main()
