#!/usr/bin/env python3
"""Publish reviewed native reference poses without admitting invented idles."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r30/native/new-sources'


def record(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


# Observations below were recorded after viewing all 152 camera views on eight
# bound contact sheets, rather than inferred from file names or mesh counts.
NOTES = {
    're2-g-stage1-gamecube': (False, 'Corps et gros bras visibles ; une main et la barre sont détachées sous/à côté des jambes dans cet export.'),
    're3-nemesis-em34-gamecube': (False, 'Manteau intact, mais des groupes de mains/texture restent détachés sous les pieds.'),
    're3-nemesis-em35-gamecube': (False, 'Variante de manteau intact ; objets/mains détachés sous les pieds dans la géométrie source.'),
    're3-nemesis-em36-gamecube': (False, 'Torse découvert, vêtement inférieur ; longue partie détachée sous le corps.'),
    're3-nemesis-em3a-gamecube': (False, 'Variante de torse découvert ; longue partie détachée sous le corps.'),
    're2-g-stage2-gamecube': (False, 'Tête, torse, bras et jambes visibles ; joints segmentés et main basse ne qualifient pas une posture de combat.'),
    're2-g-stage3-gamecube': (True, 'Corps entier debout, deux gros bras et deux bras inférieurs visibles ; pose statique de présentation.'),
    're2-g-stage4-gamecube': (False, 'Corps à grande gueule et membres visibles ; placement des membres de la pose brute non qualifié.'),
    're2-g-stage5-gamecube': (False, 'Avant et profils rendus ; large dos ouvert/non rendu par les faces natives, appendices séparés sous la masse.'),
    're2-super-tyrant-gamecube': (True, 'Corps debout avec deux grands bras griffus, deux jambes et pieds visibles ; aucune action animée.'),
    're2-tyrant-gamecube': (True, 'Corps entier en manteau, mains baissées, visage et bottes visibles ; étrangetés de texture conservées.'),
    're2-licker-gamecube': (False, 'Export vertical aux membres étendus et cou allongé ; posture quadrupède du jeu non présente.'),
    're2-evolved-licker-gamecube': (False, 'Même présentation verticale, peau plus sombre ; posture quadrupède du jeu non présente.'),
    're2-alligator-gamecube': (True, 'Corps quadrupède entier de profil, gueule fermée et queue complète ; pose statique.'),
    're3-hunter-beta-gamecube': (False, 'Tête, torse, griffes et jambes visibles ; extrémités/orteils à joints ouverts dans cet export.'),
    're3-hunter-gamma-gamecube': (False, 'Corps de Hunter γ classique, bouche entrouverte ; joints des pieds et griffes non qualifiés.'),
    're3-drain-deimos-gamecube': (False, 'Pattes/appendices largement écartés dans la pose brute ; posture au sol non vérifiée.'),
    're3-brain-sucker-gamecube': (False, 'Pattes/appendices en croix dans la pose brute ; aucun redressement de membre appliqué.'),
    're3-grave-digger-gamecube': (True, 'Ver complet à gueule étoilée et queue effilée, profil horizontal ; posture/source de sol non certifiée.'),
    're3-sliding-worm-gamecube': (True, 'Petit ver entier, gueule étoilée et queue effilée ; pose statique non animée.'),
    're2-crow-gamecube-r30': (True, 'Oiseau sombre entier ; ailes écartées visibles dans les vues frontale/dorsale, pas de battement natif.'),
    're2-zombie-dog-gamecube-r30': (True, 'Chien entier debout, quatre pattes, tête et queue visibles ; aucune marche ou respiration native.'),
    're2-giant-spider-gamecube-r30': (False, 'Abdomen, tête et pattes visibles mais aplatis/étalés dans le plan de la pose brute.'),
    're2-g-type-adult-gamecube-r30': (False, 'Gros bras, tête et appendice inférieur rectiligne ; pose verticale brute sans validation du contact au sol.'),
    're2-g-type-young-gamecube-r30': (False, 'Petite masse larvaire très plate ; complétude anatomique du rendu non établie par une capture du jeu.'),
    're2-ivy-gamecube-r30-1': (False, 'Texture verte, longs appendices rectilignes ; pose d’export non qualifiée comme neutre de combat.'),
    're2-poison-ivy-gamecube-r30-2': (False, 'Texture rouge/violacée distincte de EM02E ; association Poison Ivy candidate, non promue comme identité certifiée.'),
    're2-giant-moth-gamecube-r30': (False, 'Corps, antennes et pattes visibles ; ailes compactées dans le plan de la pose source, pas une phase de vol attestée.'),
    're2-large-roach-gamecube-r30': (True, 'Petit insecte brun entier, corps aplati, pattes et longues antennes visibles ; aucune action assignée.'),
    're2-larvae-gamecube-r30': (True, 'Larve à géométrie très peu polygonale entière ; faible détail natif conservé sans ajout.'),
    're3r-hunter-gamma-pc-r30': (True, 'Corps entier de la version 2020, deux pieds et quatre lobes de gueule ouverts ; présentation statique, aucune action idle attestée.'),
}
for number in range(1, 8):
    NOTES['re3-zombie-gamecube-r30-' + str(number)] = (True,
        'Variante féminine entière debout, bras baissés ; tenue et texture source distinctes conservées. La pose immobile ne prouve pas un idle du jeu.')

FACING_UNVERIFIED = {'re3-drain-deimos-gamecube', 're3-brain-sucker-gamecube',
    're2-g-type-young-gamecube-r30', 're2-ivy-gamecube-r30-1',
    're2-poison-ivy-gamecube-r30-2', 're2-larvae-gamecube-r30'}


def main():
    catalog_path, renders_path = PACK / 'catalog.json', PACK / 'renders.json'
    catalog = json.loads(catalog_path.read_bytes())
    renders = json.loads(renders_path.read_bytes())
    contacts = json.loads((PACK / 'review/contacts.json').read_bytes())
    by_model = {entry['id']: entry for entry in catalog['entries']}
    if set(NOTES) != set(by_model):
        raise ValueError('Every actually rendered model requires an explicit observation')
    for contact in contacts:
        contact['reviewed'] = True
        contact['method'] = 'Actual contact image inspected with view_image; four source camera views per listed model.'
    (PACK / 'review/contacts.json').write_text(json.dumps(contacts, ensure_ascii=False, indent=2) + '\n')
    entries, observations = [], []
    for rendered in renders['entries']:
        model_id = rendered['modelId']
        source = by_model[model_id]
        complete, note = NOTES[model_id]
        exact_edition = model_id == 're3r-hunter-gamma-pc-r30'
        gaps = ['La pose d’export est statique ; sa correspondance avec une garde/attente de combat du jeu n’est pas vérifiée.',
            'Le rendu est un dérivé Three.js en albédo non éclairé ; les matériaux/éclairage natifs du jeu ne sont pas reproduits.']
        if not exact_edition:
            gaps.insert(0, 'Source GameCube ; équivalence de cette géométrie/texturation avec l’incarnation PlayStation du catalogue non vérifiée.')
        if not complete:
            gaps.append('La complétude anatomique et/ou le placement de parties visibles de cet export restent non qualifiés : ' + note)
        if model_id.startswith('re2-poison-ivy'):
            gaps.append('Le code de fichier EM039 et sa couleur ne suffisent pas à certifier l’association à Poison Ivy.')
        contact = next(row for row in contacts if model_id in row['models'])
        proof = {'path': contact['path'], 'sha256': contact['sha256']}
        observations.append({'modelId': model_id, 'subjectId': source['subjectId'], 'fullBodyReviewed': complete,
            'allFourViewsInspected': True, 'fightingPoseReviewed': False, 'note': note, 'contact': proof,
            'facingReview': 'No reliable anatomical facing assigned to this raw pose.' if model_id in FACING_UNVERIFIED else 'Actual four rendered contours inspected: head, mouth/beak, torso and/or tail determine the profile orientation; camera angle alone is not the proof.',
            'images': [{'path': view['path'], 'sha256': view['sha256']} for view in rendered['views']],
            'originalGameFrameComparison': False, 'canonicalFidelityCertified': False})
        for view in rendered['views']:
            angle = view['angle']
            facing = ({0: 'front', 90: 'left', 180: 'unknown', 270: 'right'} if exact_edition else {0: 'left', 90: 'front', 180: 'right', 270: 'unknown'})[angle]
            if model_id in FACING_UNVERIFIED:
                facing = 'unknown'
            frame = {key: view[key] for key in ('path', 'width', 'height', 'bytes', 'sha256', 'bounds')}
            frame['seconds'] = 0
            entries.append({'id': model_id + '--camera-' + str(angle), 'modelId': model_id,
                'subjectId': source['subjectId'], 'label': source['label'] + ' — caméra ' + str(angle) + '°',
                'sourceEdition': source['sourceEdition'], 'admittedTargetEdition': exact_edition,
                'kind': 'native-static-pose', 'sourceFacing': facing, 'canMirror': False,
                'fullBodyReviewed': complete, 'fightingPoseReviewed': False, 'actionIdentity': 'unassigned',
                'actionVerified': False, 'continuityVerified': False, 'admittedCombatStates': [],
                'canonicalFidelityCertified': False, 'originalGameFrames': False, 'animated': False,
                'pivot': view['pivot'], 'pivotScope': 'Projected complete-source bounds floor estimate; anatomical contact point unverified.',
                'referenceBounds': view['bounds'], 'frames': [frame], 'knownAppearanceGaps': gaps,
                'sourceCatalog': record(catalog_path), 'renderRecipe': renders['renderer'],
                'provenance': {'sourceModel': source['model'], 'sourceMaterials': source['materials'],
                    'sourceTextures': source['textures'], 'sourceArchive': source['archive'], 'sourcePage': source['sourcePage'],
                    'sourceMatricesChanged': False, 'sourceVerticesChanged': False, 'sourceTexturesChanged': False,
                    'canMirror': False, 'contact': proof},
                'visualObservation': note})
    review = {'schema': 're.bow.native-model-review-r30/1', 'release': 'R30', 'reviewedImages': 152,
        'scope': 'Visual source presentation review only; no motion/action/edition equivalence certification.', 'entries': observations}
    (PACK / 'review/observations.json').write_text(json.dumps(review, ensure_ascii=False, indent=2) + '\n')
    result = {'schema': 're.bow.native-2d-lot-r30/1', 'release': 'R30',
        'lot': 'new-sources', 'scope': 'Source-preserving RE2/RE3 native model presentations, deliberately held from combat until pose/action/edition qualification.',
        'inputs': [record(catalog_path), record(renders_path), record(PACK / 'review/observations.json')],
        'sourceFilesRewritten': False, 'canonicalFidelityCertified': False,
        'counts': {'subjects': len({row['subjectId'] for row in entries}), 'modelVariants': len(renders['entries']),
            'nativeRenderedPoseViews': len(entries), 'newArchives': catalog['counts']['newArchives'],
            'newModelVariants': catalog['counts']['newModelVariants'], 'reusedModelVariants': catalog['counts']['reusedModelVariants'],
            'exactTargetEditionPoseViews': sum(row['admittedTargetEdition'] for row in entries),
            'documentaryEditionPoseViews': sum(not row['admittedTargetEdition'] for row in entries),
            'nativeAnimationClips': 0, 'admittedCombatPoses': 0, 'admittedIdleAnimations': 0, 'originalGameFrames': 0},
        'entries': entries}
    (PACK / 'manifest.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result['counts']))


if __name__ == '__main__':
    main()
