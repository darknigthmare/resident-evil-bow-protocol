#!/usr/bin/env python3
"""Bind observed source gestures and audit adapted commands without changing gameplay."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r31/motion'
COMMANDS = ROOT / 'modules/fidelity-r31/commands'
TASKS = ('R20-09', 'G-COMMANDES', 'G-CINEMATIQUES', 'G-MANCHES')


def raw(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def read(name):
    return json.loads((ROOT / name).read_text())


def proof(name):
    data = (ROOT / name).read_bytes()
    return {'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def save(name, value, check):
    target = ROOT / name
    if check:
        if target.read_bytes() != raw(value):
            raise ValueError('Repertoire/observation binding differs: ' + name)
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(raw(value))


def build(check=False):
    observations_path = 'modules/fidelity-r31/motion/review/observations.json'
    observations = read(observations_path)
    by_clip = {row['id']: row for row in observations['observations']}
    observation_proof = proof(observations_path)
    follow_name = 'modules/fidelity-r31/motion/root-follow-manifest.json'
    follow = read(follow_name)
    world_name = 'modules/fidelity-r31/motion/manifest.json'
    world = read(world_name)
    for manifest in (follow, world):
        for entry in manifest['entries']:
            row = by_clip[entry['subjectId'] + '--' + entry['clipId']]
            entry['observedGesture'] = {'id': row['id'], 'label': row['label'], 'summary': row['summary'],
                'classification': row['observedGestureClass'], 'originalGameActionAssigned': False}
            entry['observationEvidence'] = observation_proof
        manifest['observations'] = observation_proof
    save(follow_name, follow, check)
    world['rootFollowManifest'] = proof(follow_name)
    world['counts'].update(observedGestureClips=len(by_clip), visuallyInspectedWorldContactViews=160,
        visuallyInspectedRootFollowContactViews=40, rootFollowInspectionFrames=sum(len(row['frames']) for row in follow['entries']),
        rootFollowOrientedSequences=len(follow['entries']))
    save(world_name, world, check)
    roster_name = 'data/roster.json'
    expansion_name = 'data/catalog-expansion-v070.json'
    roster, expansion = read(roster_name), read(expansion_name)
    profiles = {row['uid']: row for row in roster['fighters']}
    profiles.update({row['uid']: row for row in expansion['fighters']})
    graph_name = 'modules/fidelity-r28/evolutions/graph.json'
    contexts = set(read(graph_name)['contextOnlyUids'])
    canonical_names = [f'modules/fidelity-r{number}/canonical/manifest.json' for number in range(24, 29)]
    canonical_names.append('modules/fidelity-r31/canonical/manifest.json')
    claimed = {}
    for name in canonical_names:
        manifest = read(name)
        for claim in manifest.get('claims', []):
            if claim.get('type') not in ('move', 'counter'):
                continue
            uid = claim.get('subject_uid', claim.get('uid'))
            claimed.setdefault(uid, []).append({'claimId': claim['id'], 'label': claim['label'],
                'phase': claim.get('phase', ''), 'type': claim['type'], 'manifest': name,
                'polarity': claim.get('polarity', 'DOCUMENTED_WITH_SCOPE'),
                'conditions': claim.get('conditions', []), 'actorUid': claim.get('actor_uid', uid),
                'actorRole': claim.get('actor_role', 'subject-under-documented-conditions'),
                'limitation': claim.get('limitation', ''),
                'sourceEdition': claim.get('sourceEdition', claim.get('game', 'Edition from retained source manifest')),
                'targetEditionMatched': claim.get('targetEditionMatched', False),
                'originalInputCommandVerified': False, 'completeRepertoireCertified': False,
                'sourceScope': 'Documentary behavior/counter claim; does not assign a player command or an opaque native clip.'})
    entries = []
    for identity in roster['catalog']:
        uid = identity['id']; profile = profiles.get(uid)
        moves = profile.get('combat', {}).get('moves', {}) if profile else {}
        adapted = []
        for slot, move in moves.items():
            adapted.append({'slot': slot, 'id': move['id'], 'label': move['name'], 'kind': move['kind'],
                'authoredPrototypeCommand': True, 'originalInputCommandVerified': False,
                'sourceRecordSha256': hashlib.sha256(raw(move)).hexdigest(),
                'animationAssignedFromObservedClip': False})
        clips = [row for row in world['entries'] if row['subjectId'] == uid]
        unique = list(dict.fromkeys(row['clipId'] for row in clips))
        entries.append({'id': uid, 'name': identity['name'], 'game': identity['game'], 'gameKey': identity['gameKey'],
            'hasPrototypeProfile': profile is not None, 'contextOnlyEvolutionIdentity': uid in contexts,
            'adaptedCommandCount': len(adapted), 'adaptedCommands': adapted,
            'documentaryMoveClaims': claimed.get(uid, []), 'nativeClipIds': unique,
            'nativeObservedGestures': [row for row in observations['observations'] if row['subjectId'] == uid],
            'nativeSourceEdition': clips[0]['sourceEdition'] if clips else None,
            'officialCommandInventoryComplete': False, 'originalGameClipAssignments': [],
            'certifiedIntro': False, 'certifiedOutro': False, 'certifiedVictory': False, 'certifiedDefeat': False,
            'canonicalFidelityCertified': False,
            'remaining': ['Action names and original behavior sequence evidence',
                          'Exact target edition and complete original repertoire',
                          'Original intro/outro/result role, counterpart, environment, audio and causal trigger']})
    inputs = [proof(name) for name in (roster_name, expansion_name, graph_name, world_name,
        observations_path, *canonical_names)]
    commands = {'schema': 're.bow.command-repertoire-r31/1', 'release': 'R31', 'inputs': inputs,
        'counts': {'catalogueIdentities': len(entries), 'prototypeProfiles': sum(row['hasPrototypeProfile'] for row in entries),
            'adaptedCommands': sum(row['adaptedCommandCount'] for row in entries),
            'identitiesWithNativeObservedScenes': sum(bool(row['nativeClipIds']) for row in entries),
            'documentaryMoveClaimLinks': sum(len(row['documentaryMoveClaims']) for row in entries),
            'completeOriginalCommandInventories': 0, 'originalGameActionAssignments': 0,
            'certifiedIntros': 0, 'certifiedOutros': 0, 'certifiedOriginalResultSequences': 0},
        'scope': 'Exact-UID audit of existing authored commands, documentary behavior claims and visually observed native source scenes. Commands are not the original enemies’ player inputs and no clip is assigned automatically.',
        'gameplayDataChanged': False, 'canonicalFidelityCertified': False, 'entries': entries}
    commands_name = 'modules/fidelity-r31/commands/manifest.json'
    save(commands_name, commands, check)
    counts = {**world['counts'], 'additionalRootFollowInspectionFrames': sum(len(row['frames']) for row in follow['entries']),
        'commandCatalogueIdentities': len(entries), 'existingAdaptedCommandsAudited': commands['counts']['adaptedCommands'],
        'documentaryMoveClaimLinks': commands['counts']['documentaryMoveClaimLinks']}
    task_updates = {
        'R20-09': {'advances': ['Huit scènes natives supplémentaires sont rendues intégralement à60Hz dans deux projections réelles :2016 images,16 références de fin. Les200 vues de contact ont été inspectées.',
            'Deux scènes à forte translation possèdent248 images d’inspection supplémentaires : seule la caméra suit la vraie racine, la trajectoire native et les vues fixes sont conservées.'],
            'remaining': ['Aucun nouveau cycle idle cible ni nouvelle action de combat attribuée ; l’édition PC/HD2013 reste distincte de3DS2012.',
                          'Les gestes complets de toutes les autres incarnations, objets et partenaires restent à sourcer.']},
        'G-COMMANDES': {'advances': [f'Le répertoire exact-UID couvre389 identités et distingue {commands["counts"]["adaptedCommands"]} commandes adaptées existantes, les comportements documentaires et huit gestes natifs observés.',
            'Les correspondances entre scènes sources et boutons officiels ne sont pas inventées.'],
            'remaining': ['Inventaires originaux exhaustifs, gestes et timings certifiés par incarnation ; liens aux commandes et répertoires dépassant dix slots si nécessaire.']},
        'G-CINEMATIQUES': {'advances': ['Les premiers et derniers instants des huit scènes sont conservés et comparables dans le lecteur ; les scènes aériennes gardent leur trajectoire source.',
            'Aucune scène n’est classée intro/outro depuis un nom BA/DM/UZ, ni raccord cinématique fabriqué.'],
            'remaining': ['Vidéos ou captures du jeu d’origine identifiant le rôle intro/outro, raccords, environnement, partenaires et bande sonore.']},
        'G-MANCHES': {'advances': ['Une scène Ooze montre un corps couché puis un aplatissement ; l’observation est distinguée d’une mort ou d’une défaite confirmée.',
            'Le répertoire garde victoire/défaite originales non certifiées ; les séquences ne modifient pas le calcul des résultats ni les replays.'],
            'remaining': ['Preuve causale de victoire/défaite/égalité, rôle exact des scènes et sons finaux par incarnation avant affectation aux résultats.']}
    }
    delivery = {'schema': 're.bow.fidelity-lot-r31/1', 'release': 'R31', 'id': 'motion', 'taskIds': list(TASKS),
        'summary': 'Huit scènes natives complètes et un répertoire exact-UID distinguant gestes observés, commandes adaptées et rôles originaux non prouvés.',
        'advances': ['2016 images natives et16 références de fin, deux côtés par scène ;248 images supplémentaires avec caméra suivie seulement pour inspection.',
                     '200 vues de contacts réellement inspectées ; huit gestes décrits sans déduire une action des codes.',
                     f'389 identités et{commands["counts"]["adaptedCommands"]} commandes adaptées existantes auditées.'],
        'remaining': ['Attribution originale des actions, introductions, conclusions et commandes exhaustives encore ouverte.',
                      'Aucune nouvelle animation de combat ni équivalence3DS implicitement certifiée.'],
        'taskUpdates': task_updates,
        'manifests': [proof(world_name), proof(follow_name), proof(commands_name), observation_proof],
        'resources': [{'path': 'modules/fidelity-r31/motion/index.html', 'label': 'Mouvements natifs complets et caméras'},
                      {'path': 'modules/fidelity-r31/commands/index.html', 'label': 'Répertoires par incarnation'},
                      {'path': 'modules/fidelity-r31/motion/review/observations.json', 'label': 'Observations des gestes et limites'}],
        'identities': [{'id': row['id'],
                        'summary': (str(row['adaptedCommandCount']) + ' commandes adaptées auditées ; répertoire original non certifié.'
                                    + (' Scènes natives PC/HD2013 observées séparément.' if row['nativeClipIds'] else '')),
                        'artifacts': [{'path': 'modules/fidelity-r31/commands/index.html', 'label': 'Examiner le répertoire',
                                       'kind': 'command-repertoire-audit', 'identityParameter': 'id'}]
                            + ([{'path': 'modules/fidelity-r31/motion/index.html', 'label': 'Lire les scènes sources',
                                 'kind': 'native-source-motion', 'sourceEdition': 'PC/HD2013',
                                 'identityParameter': 'id'}] if row['nativeClipIds'] else [])} for row in entries],
        'counts': counts, 'canonicalFidelityCertified': False}
    save('modules/fidelity-r31/motion/delivery.json', delivery, check)
    return counts


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    print(json.dumps(build(parser.parse_args().check)))
