#!/usr/bin/env python3
"""Aggregate executed R27 reports; draft mode retains failures and missing reports."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPECS = [
    ('Export et frontières du classeur', 'R27_EXPORT_TESTS.json', 'python', None,
     'Feuilles historiques, compteurs généré/en attente/revu, contextes et horloges natives.'),
    ('Fichiers des sprites', 'R27_SPRITES_TESTS.json', 'python', None,
     'Jobs, octets PNG, alpha, provenance et refus des statuts inventés.'),
    ('Galerie des sprites', 'R27_SPRITES_BROWSER.json', 'browser', None,
     'Une seule image chargée, sélection, erreurs, clavier et texte agrandi.'),
    ('Contrats du rendu idle', 'R27_COMBAT_TESTS.json', 'node', None,
     'Corps complet revu, pose neutral-base, état et orientation exacts ; aucune pose de liaison ou partielle substituée au combat.'),
    ('Rendu idle en navigateur', 'R27_COMBAT_BROWSER.json', 'browser', None,
     'Intégration réelle de la pose disponible, retrait et repli ; pas de cycle complet certifié.'),
    ('Ajouts sourcés des Dossiers', 'R27_DOSSIER_ADDITIONS_TESTS.json', 'python', None,
     '389 UID, nouveaux sons et citations liés à leurs manifestes ; index R26 conservé et totaux refusés si inventés.'),
    ('Borne mesurée du registre de sprites', 'R27_COMBAT_BOUNDS_FOLLOWUP.json', 'followup', None,
     'Suivi ciblé du plafond 4 MiB : transport réel de 3 MiB accepté et 5 MiB refusé ; limites d’image et cache conservées.'),
    ('Index des références d’apparence', 'R27_SOURCES_TESTS.json', 'python', None,
     '389 identités, images attribuées, corps et candidats séparés ; dérives historiques explicites.'),
    ('Références dans le navigateur', 'R27_SOURCES_BROWSER.json', 'browser', None,
     'Sources par incarnation, preuves locales, reflow et aucun remplacement inventé.'),
    ('Vues de référence géométriques séparées', 'R27_SOURCE_BODY_RASTERS_TESTS.json', 'python', None,
     '16 rendus natifs de référence pour quatre UID ; zéro sprite image_gen, original ou final de combat.'),
    ('Import des mouvements', 'R27_MOTION_EVIDENCE.json', 'python', 'validation.python',
     'Scènes et archives originales, parties de ZIP liées au SHA global, bases séparées.'),
    ('Déformation des mouvements', 'R27_MOTION_SKELETON_TESTS.json', 'node', None,
     'Clés, matrices et sommets pondérés natifs ; gestes non attribués par leurs noms.'),
    ('Lecteur des mouvements', 'R27_MOTION_BROWSER.json', 'browser', None,
     'Clips directs bornés ; pas de relèvement du plafond du lecteur historique.'),
    ('Fichiers audio publiés', 'R27_AUDIO_TESTS.json', 'python', None,
     'WAV et archive exacts ; contenus SHA distincts et absence de réattribution sémantique.'),
    ('Lecteur audio', 'R27_AUDIO_BROWSER.json', 'browser', None,
     'Décodage, refus, changement de sélection et absence de lecture automatique.'),
    ('Citations documentaires', 'R27_CANONICAL_VALIDATION.json', 'python', None,
     'Nouvelles incarnations, citations, formes et acteurs ; zéro capture primaire inventée.'),
    ('Parcours des citations', 'R27_CANONICAL_BROWSER.json', 'browser', None,
     'Catalogue, filtre et portée des assertions citées.'),
    ('Contrats du pont de restauration', 'R27_PERSISTENCE_TESTS.json', 'node', None,
     'Lecture exacte et révision de la base isolée ; aucune écriture du stockage du jeu.'),
    ('Pont de restauration en navigateur', 'R27_PERSISTENCE_BROWSER_TESTS.json', 'browser', None,
     'IndexedDB réel, refus des réponses périmées et vérification par le moteur correspondant.'),
    ('Matchs et conclusions de prototype', 'R27_MATCH_TESTS.json', 'node', None,
     '12 matchs, 24 reconstructions ; deux anciennes tentatives débloquées, scènes artistiques hors certification.'),
    ('Suivi des chantiers', 'R27_DASHBOARD_BROWSER.json', 'browser', None,
     '17 chantiers, compteurs des manifestes, filtres, textes inertes et preuves locales.'),
    ('Accessibilité des sept ateliers', 'R27_ACCESS_BROWSER.json', 'browser', None,
     'Clavier, reflow et audits automatisés ; appareils physiques et lecteurs d’écran non certifiés.'),
    ('Présentation historique R20', 'R27_LEGACY_R20_SPRITES.json', 'legacy', None,
     'Copie isolée ; adaptateur R27 de présentation explicitement exclu, assertions R20 intactes.'),
    ('Accessibilité historique R25', 'R27_LEGACY_R25_ACCESS.json', 'legacy', None,
     'Copie isolée ; anciens adaptateurs figés et contrôles stricts des Dossiers R25.'),
    ('Accessibilité historique R26', 'R27_LEGACY_R26_ACCESS.json', 'legacy', None,
     'Copie isolée ; R27 exclu de la seule fixture historique, lecteur R26 contrôlé intégralement.'),
    ('Contrôles historiques', 'R27_HISTORICAL_TESTS.json', 'historical', None,
     'Contrats et assertions historiques exécutés avec les adaptateurs R27 installés.'),
]


def build(allow_pending=False):
    checks, pending, failed, totals = [], [], [], {'python_tests': 0, 'targeted_node_checks': 0, 'browser_groups': 0, 'targeted_browser_followup_groups': 0, 'historical_assertions': 0, 'isolated_legacy_browser_groups': 0}
    kind_key = {'python': 'python_tests', 'node': 'targeted_node_checks', 'browser': 'browser_groups', 'followup': 'targeted_browser_followup_groups', 'historical': 'historical_assertions', 'legacy': 'isolated_legacy_browser_groups'}
    for label, name, kind, selector, scope in SPECS:
        path = ROOT / 'docs' / name
        if not path.is_file():
            pending.append('docs/' + name)
            continue
        report = json.loads(path.read_text())
        if selector:
            for key in selector.split('.'):
                report = report[key]
        passed, failures = report.get('passed'), report.get('failed')
        if type(passed) is not int or type(failures) is not int or passed + failures <= 0:
            raise ValueError('An executed result is missing: ' + name)
        if failures:
            failed.append('docs/' + name)
        checks.append({'label': label, 'result': f'{passed} réussis, {failures} échec(s)', 'scope': scope, 'path': 'docs/' + name})
        totals[kind_key[kind]] += passed
    sprite_path = ROOT / 'modules/fidelity-r27/sprites/manifest.json'
    sprite_pack = json.loads(sprite_path.read_text())
    generation = {key: sprite_pack['counts'][key] for key in ('targetIdentities', 'generatedSprites', 'pendingSprites')}
    generation['generationBlockedSprites'] = sum(item.get('generationStatus') == 'BLOCKED_BY_TOOL' for item in sprite_pack['pending'])
    generation['attemptedIdentities'] = generation['generatedSprites'] + generation['generationBlockedSprites']
    generation['awaitingOutputIdentities'] = generation['pendingSprites'] - generation['generationBlockedSprites']
    generation['fullBodyReviewedSprites'] = sum(item.get('fullBodyReviewed') is True for item in sprite_pack['sprites'])
    generation['neutralBaseCombatEligibleSprites'] = sum(
        item.get('reviewStatus') == 'visually-reviewed' and item.get('fullBodyReviewed') is True
        and item.get('poseKind') == 'neutral-base' and item.get('scope') == 'combatant-neutral-pose'
        and item.get('sourceFacing') in ('left', 'right') and item.get('availableStates') == ['idle']
        for item in sprite_pack['sprites'])
    gallery_path = ROOT / 'docs/R27_SPRITES_BROWSER.json'
    if gallery_path.is_file():
        gallery = json.loads(gallery_path.read_text())
        if (gallery.get('generatedFilesInExecutedManifest') != generation['generatedSprites']
                or gallery.get('pendingInExecutedManifest') != generation['pendingSprites']):
            failed.append('docs/R27_SPRITES_BROWSER.json: executed generation snapshot differs from the current manifest')
    dashboard_path = ROOT / 'docs/R27_DASHBOARD_BROWSER.json'
    if dashboard_path.is_file():
        dashboard = json.loads(dashboard_path.read_text())
        audio = json.loads((ROOT / 'modules/fidelity-r27/audio/manifest.json').read_text())
        canonical = json.loads((ROOT / 'modules/fidelity-r27/canonical/manifest.json').read_text())
        expected_counters = [generation['generatedSprites'], generation['fullBodyReviewedSprites'], generation['neutralBaseCombatEligibleSprites'],
                             len(audio['entries']), canonical['summary']['cumulative_reviewed_identities']]
        executed = [item.get('detail', {}).get('sourceStatistics') for item in dashboard.get('checks', [])
                    if item.get('detail', {}).get('sourceStatistics') is not None]
        if len(executed) != 2 or any(values != expected_counters for values in executed):
            failed.append('docs/R27_DASHBOARD_BROWSER.json: executed counters differ from the current generation snapshot')
    historical_path = ROOT / 'docs/R27_HISTORICAL_TESTS.json'
    if historical_path.is_file():
        historical = json.loads(historical_path.read_text())
        if any(hashlib.sha256((ROOT / item['path']).read_bytes()).hexdigest() != item['sha256']
               for item in historical.get('executedAdapterInputs', [])):
            failed.append('docs/R27_HISTORICAL_TESTS.json: adapter code changed after the isolated historical execution')
    if not allow_pending and (pending or failed):
        raise ValueError('R27 validation is unfinished: ' + ', '.join(pending + failed))
    return {'schema': 're.bow.validation-r27/1', 'complete': not allow_pending and not pending and not failed,
            'provisional': allow_pending,
            'generation_snapshot': generation, 'target_generation_complete': generation['pendingSprites'] == 0,
            'target_generation_attempts_complete': generation['attemptedIdentities'] == generation['targetIdentities'],
            'generation_preference': 'Conserver les refus, fidélité prioritaire',
            'checks': checks, 'totals': totals, 'pending_reports': pending, 'failed_reports': failed,
            'post_export_evidence': ['docs/R27_INTEGRATION_TESTS.json', 'docs/R27_REPRODUCTION.json', 'docs/R27_SOURCE_ADDITIONS.json'],
            'scope': 'Résultats effectivement exécutés ; les rapports absents restent en attente. Exécution cloud sans certification des appareils physiques, cycles complets ou fidélité 1:1 globale.',
            'canonical_fidelity_certified': 0}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--allow-pending', action='store_true', help='Produce an explicitly unfinished progress snapshot')
    args = parser.parse_args()
    result = build(args.allow_pending)
    payload = (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode()
    path = ROOT / 'docs/R27_VALIDATION.json'
    if args.check:
        if path.read_bytes() != payload:
            raise ValueError('Validation summary differs from the executed reports')
    else:
        path.write_bytes(payload)
    print(json.dumps({'complete': result['complete'], 'totals': result['totals'], 'pending_reports': len(result['pending_reports']), 'failed_reports': len(result['failed_reports'])}))


if __name__ == '__main__':
    main()
