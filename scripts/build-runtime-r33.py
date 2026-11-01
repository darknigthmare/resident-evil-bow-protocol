#!/usr/bin/env python3
"""Bind the R33 presentation readers to preserved inputs, without editing those inputs."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GENERATED = 'modules/fidelity-r31/sprites/manifest.json'
NATIVE = 'modules/fidelity-r30/native/manifest.json'
AVATARS = 'modules/fidelity-r30/selection/manifest.json'
NEW_SPRITES = 'modules/fidelity-r33/sprites/manifest.json'
NEW_NATIVE = 'modules/fidelity-r33/native/manifest.json'


def read(name):
    return json.loads((ROOT / name).read_text())


def ref(name):
    raw = (ROOT / name).read_bytes()
    return {'path': name, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def generated_registry():
    result = read(GENERATED)
    new = read(NEW_SPRITES)
    variants = new.get('variants', new.get('entries', []))
    targets = {item['id']: item for item in result['sprites']}
    bound = []
    for value in variants:
        item = dict(value)
        uid = item.get('subjectId', item.get('uid', item.get('id')))
        if uid not in targets:
            raise ValueError('Unknown source-edition sprite target: ' + str(uid))
        item.update(id=uid, targetIncarnation=targets[uid]['incarnation'],
                    comparesAgainstSha256=targets[uid]['sha256'])
        # These are separate, voluntary presentations. They never enter sprites[].
        if item.get('defaultAdmission') is not False or item.get('admittedTargetEdition') is not False:
            raise ValueError('A source-edition illustration must remain explicitly optional.')
        item.setdefault('targetEditionAdmitted', False)
        item.setdefault('sameEditionVariant', False)
        item.setdefault('documentaryVariant', True)
        item.setdefault('animated', False)
        item.setdefault('animationFrames', 1)
        bound.append(item)
    result.update(release='R33', sourceEditionVariants=bound,
                  r33Inputs=[ref(GENERATED), ref(NEW_SPRITES)])
    result['counts'].update(newGeneratedPngs=len(bound), newTargetIdentities=0,
                            optionalSourceEditionFamilies=len({item['variantFamilyId'] for item in bound}),
                            optionalSourceEditionSides=len(bound), newNativeIdleAnimations=0)
    result['purpose'] = 'Preserved R31 catalogue and same-edition option, plus separate voluntary R33 source-edition families. No original animation claim.'
    return result


def native_index():
    result, extra = read(NATIVE), read(NEW_NATIVE)
    assert extra['schema'] == 're.bow.native-library-r33/1' and extra['release'] == 'R33'
    result.update(schema='re.bow.native-2d-index-r33/1', release='R33',
                  inputs=[ref(NATIVE), ref(NEW_NATIVE)])
    result['lots'].append(ref(NEW_NATIVE))
    entries = [entry for lot in result['lots'] for entry in read(lot['path'])['entries']]
    ids = [entry['id'] for entry in entries]
    assert len(ids) == len(set(ids)), 'Native entry identifiers must be unique across lots.'
    result['counts'] = {'subjects': len({entry['subjectId'] for entry in entries}), 'entries': len(entries),
                        'nativeRenderedFrames': sum(len(entry['frames']) for entry in entries),
                        'sequenceEntries': sum(entry['kind'] == 'native-sequence' for entry in entries),
                        'staticPoseEntries': sum(entry['kind'] == 'native-static-pose' for entry in entries)}
    result['scope'] = 'Published R30 native studies plus the separately qualified R33 source library. Source edition, materials, pose and action admission remain per entry.'
    return result


def avatar_registry():
    result, native = read(AVATARS), read(NEW_NATIVE)
    result.update(schema='re.bow.selection-avatars-r33/1', release='R33')
    result['inputs'] += [ref(AVATARS), ref(NEW_NATIVE)]
    # Source-rendered face/upper-body crops, inspected at 512px. No raster is edited.
    choices = {
        're0-zombie': ('re0-zombie-gc-r26-1--front', {'x': 213, 'y': 78, 'width': 86, 'height': 128}),
        're5-chainsaw-majini': ('re5-chainsaw-majini-pc-published--front', {'x': 218, 'y': 80, 'width': 76, 'height': 130}),
        're5-executioner': ('re5-executioner-pc-published--front', {'x': 208, 'y': 80, 'width': 100, 'height': 140}),
    }
    originals = {entry['id']: entry for entry in result['entries']}
    entries = {entry['id']: entry for entry in native['entries']}
    replacements = {}
    for uid, (key, crop) in choices.items():
        source, old = entries[key], originals[uid]
        frame = source['frames'][0]
        image = ref(frame['path'])
        assert image['sha256'] == frame['sha256'] and image['bytes'] == frame['bytes']
        record = dict(old)
        record.update(image=frame['path'], bytes=image['bytes'], sha256=image['sha256'], format='PNG',
                      width=frame['width'], height=frame['height'], sourceKind='native-model-render',
                      sourcePage=source['sourcePage'], sourceImage=None, sourceEdition=source['sourceEdition'],
                      nativeAssetCertified=False, derivedNativeModelRender=True, originalGame2DFrame=False,
                      targetEditionMatched=False, canonicalFidelityCertified=False, imageEditedByR33=False,
                      selectionOnly=True, combatAnimationAssigned=False, crop=crop,
                      sourceBodyCompleteCertified=False, sourceAppearanceGaps=source['knownAppearanceGaps'],
                      provenance=[{'kind': 'r33-native-model-render', 'manifest': ref(NEW_NATIVE),
                                   'entryId': source['id'], 'previousReference': old['image'],
                                   'previousReferenceSha256': old['sha256']}])
        replacements[uid] = record
    result['entries'] = [replacements.get(entry['id'], entry) for entry in result['entries']]
    for field, kind in [('nativeMenuThumbnails', 'native-menu-thumbnail'), ('nativeModelRenders', 'native-model-render'),
                        ('reviewedSecondaryReferences', 'reviewed-secondary-reference'), ('documentedSecondaryReferences', 'documented-secondary-reference')]:
        result['counts'][field] = sum(entry['sourceKind'] == kind for entry in result['entries'])
    result['counts']['newSourceRenderedAvatars'] = len(replacements)
    result['scope'] += ' R33 replaces three documentary portraits with inspected native-model face/upper-body crops. Missing equipment and source material limitations remain recorded; this is not full-body or target-edition certification.'
    return result


def validation_outputs():
    reports = ['docs/R33_RUNTIME_TESTS.json', 'docs/R33_RUNTIME_BROWSER.json']
    for name in reports:
        report = read(name)
        assert report['passed'] > 0 and report['failed'] == 0, 'A positive executed report is required: ' + name
        for source in report['sourceFiles']:
            assert ref(source['path'])['sha256'] == source['sha256'], 'Stale runtime proof: ' + source['path']
    names = ['scripts/build-runtime-r33.py', 'modules/fidelity-r33/combat/generated-runtime.js',
             'modules/fidelity-r33/combat/generated-adapter.js', 'modules/fidelity-r33/combat/native-runtime.js',
             'modules/fidelity-r33/combat/native-adapter.js', 'modules/fidelity-r33/combat/manifest.json',
             'modules/fidelity-r33/combat/native-index.json', 'modules/fidelity-r33/selection/avatars.js',
             'modules/fidelity-r33/selection/manifest.json', 'modules/fidelity-r33/evolutions/selection.js',
             'modules/fidelity-r33/evolutions/index.html', 'modules/versus.html', 'catalog-duel.html'] + reports
    counts = {'nodeGroups': read(reports[0])['passed'], 'browserGroups': read(reports[1])['passed'],
              'currentCombatMounts': 3, 'optionalSourceEditionFamilies': 4, 'qualifiedOptionalStaticPoseFamilies': 2,
              'sourceEditionSidePngs': 8, 'sourceRenderedAvatarReplacements': 3, 'coveredAvatarIdentities': 388,
              'nativeLibrarySubjects': 53, 'managedPixelLimit': 33554432, 'newCertifiedOriginalIdleCycles': 0}
    advances = ['Les trois montages actuels partagent les nouveaux lecteurs bornés : registre généré conservé, quatre familles source volontaires et bibliothèque native composite de53identités.',
                'Deux familles de poses adaptées ont des côtés gauche/droite indépendants ; seuls les états réellement produits sont dessinés. Les cibles contextuelles et gestes non attribués restent tenus hors admission.',
                'Trois portraits natifs utilisent des cadres de tête/haut du corps inspectés sans modifier les PNG, avec édition et équipements absents conservés comme limites.',
                'Le choix marin Sea Creeper est explicitement aquatique ; le cycle conserve ses300images antérieures et ses temps natifs, avec réduction du mouvement respectée.',
                'Les vrais PNG des deux côtés et atlas restent sous le budget coordonné ; après pression synthétique32MP, les deux côtés reprennent automatiquement sans erreur de corruption ni délai de cache négatif.',
                'Les contrôles au clavier restent utilisables à320pixels avec un texte réellement doublé ; les deux panneaux nouveaux passent axe4.14 dans ce périmètre. Les acteurs, replays et sauvegardes restent inchangés par les choix visuels.']
    remaining = ['La mémoire totale du navigateur/GPU, la cadence de l’écran physique et les appareils cibles restent non mesurés ; le budget ne couvre que les lecteurs participants.',
                 'Manettes physiques et lecteurs d’écran réels non éprouvés ; les interactions clavier sont émises par Chromium, les événements de cycle de vie et la réservation de pression sont des fixtures explicites.',
                 'Les PNG générés ne certifient ni texels originaux ni équivalence GameCube/PlayStation. Une pose fixe n’est pas un idle animé.',
                 'Aucun nouvel idle original certifié. La boucle marine observée n’atteste pas un appui terrestre ou le nom original de l’action ; les armes RE5 absentes et matériaux natifs non qualifiés restent ouverts.']
    manifest = {'schema': 're.bow.presentation-validation-r33/1', 'release': 'R33', 'counts': counts,
                'sourceFiles': [ref(name) for name in names], 'advances': advances, 'remaining': remaining,
                'canonicalFidelityCertified': False, 'physicalDeviceCertified': False, 'globalMemoryCertified': False}
    portraits = avatar_registry()
    changed = [item for item in portraits['entries'] if item.get('imageEditedByR33') is False]
    delivery = {'schema': 're.bow.fidelity-lot-r33/1', 'release': 'R33', 'lotId': 'validation',
                'workstreams': ['G-PERF', 'G-ACCESS'], 'summary': 'Lecteurs courants intégrés, choix explicites d’édition/orientation, portraits natifs et recette de crédits/clavier.',
                'advances': advances, 'remaining': remaining, 'counts': counts,
                'sourceFiles': [ref(name) for name in names], 'canonicalFidelityCertified': False,
                'resources': [{'path': 'modules/fidelity-r33/evolutions/index.html', 'label': 'Combat avec évolutions et nouvelles variantes'},
                              {'path': 'docs/R33_RUNTIME_TESTS.json', 'label': 'Dix groupes Node exécutés'},
                              {'path': 'docs/R33_RUNTIME_BROWSER.json', 'label': 'Huit groupes navigateur exécutés'}],
                'identities': [{'id': item['id'], 'summary': 'Portrait de sélection issu d’un modèle source, avec cadre de tête/haut du corps inspecté ; corps combattant non certifié.',
                                'artifacts': [{'path': item['image'], 'label': 'Portrait natif avec cadrage de sélection R33',
                                               'kind': 'selection-native-crop', 'sourceEdition': item['sourceEdition'],
                                               'sha256': item['sha256'], 'bytes': item['bytes']}]} for item in changed]}
    return {'modules/fidelity-r33/validation/manifest.json': manifest, 'modules/fidelity-r33/validation/delivery.json': delivery}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--validation', action='store_true', help='Bind the completed runtime reports, after their execution.')
    args = parser.parse_args()
    outputs = validation_outputs() if args.validation else {
        'modules/fidelity-r33/combat/manifest.json': generated_registry(),
        'modules/fidelity-r33/combat/native-index.json': native_index(),
        'modules/fidelity-r33/selection/manifest.json': avatar_registry()}
    for name, content in outputs.items():
        raw = (json.dumps(content, ensure_ascii=False, indent=2) + '\n').encode()
        path = ROOT / name
        if args.check:
            assert path.read_bytes() == raw, 'R33 reader binding is stale: ' + name
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
    print(json.dumps({'checks': len(outputs), 'current': True, 'historicalInputsWritten': False}))


if __name__ == '__main__':
    main()
