#!/usr/bin/env python3
"""Assemble executed R26 reports without counting repeated followups twice."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(name):
    return json.loads((ROOT / 'docs' / name).read_text())


def build():
    specs = [
        ('Contrôles historiques', 'R26_HISTORICAL_TESTS.json', '605 assertions du dépôt avec le nouvel adaptateur de Dossier.'),
        ('Export du classeur', 'R26_EXPORT_TESTS.json', 'Historique, injections, chemins, empreintes et horloges natives.'),
        ('Mouvements natifs', 'R26_MOTION_SKELETON_TESTS.json', '359 scènes à clés, dont sept poses ; matrices et sommets à cinq instants.'),
        ('Audio publié', 'R26_AUDIO_TESTS.json', '1 031 fichiers, 646 contenus SHA distincts ; aucune écoute sémantique indépendante.'),
        ('Lecteur audio', 'R26_AUDIO_BROWSER.json', 'Décodage, absence de lecture automatique, erreurs et changement de sélection.'),
        ('Citations documentaires', 'R26_CANONICAL_VALIDATION.json', '110 assertions / 99 nouveaux UID ; copies R23 et négations conservées.'),
        ('Lecteur des citations', 'R26_CANONICAL_BROWSER.json', '389 entrées, filtres et citations ; aucune capture primaire certifiée.'),
        ('Contrats de restauration', 'R26_PERSISTENCE_TESTS.json', 'Base isolée, valeurs exactes, contrat R19 et validation des plans.'),
        ('Transactions de restauration', 'R26_PERSISTENCE_BROWSER_TESTS.json', 'IndexedDB réel, interruption partielle, concurrence et nouvel aperçu après refus.'),
        ('Chargement des modèles', 'R26_READER_ASSET_TESTS.json', 'Bornes, intégrité et extraction avant décodage.'),
        ('Lecteur cumulatif', 'R26_READER_BROWSER.json', 'Tous les 359 nouveaux fichiers à clés ; contexte graphique, poses et comparaison.'),
        ('Suivi ciblé du lecteur', 'R26_READER_FOLLOWUP.json', '17 fichiers après corrections de revue ; non ajouté une seconde fois au total navigateur principal.'),
        ('Accessibilité des parcours', 'R26_ACCESS_BROWSER.json', 'Sept pages, Dossiers, clavier, reflow et manette simulée ; aucun appareil physique certifié.'),
        ('Planches dérivées', 'R26_SPRITES_BROWSER.json', 'Neuf planches / 72 orientations ; zéro sprite original ou final de combat.'),
        ('Suivi des 17 chantiers', 'R26_DASHBOARD_BROWSER.json', 'Filtres, liens locaux, erreurs, textes inertes et lien actuel du Bestiaire.'),
        ('Matchs et replays', 'R26_MATCH_TESTS.json', '131 matchs complets / 262 reconstructions ; deux tentatives bornées conservées séparément.'),
        ('Régression du suivi R24', 'R26_LEGACY_R24_DASHBOARD.json', 'Copie isolée ; tableau historique et lien vers la livraison actuelle.'),
        ('Régression du suivi R25', 'R26_LEGACY_R25_DASHBOARD.json', 'Copie isolée ; tableau historique et lien vers la livraison actuelle.'),
        ('Régression des Dossiers R25', 'R26_LEGACY_R25_ACCESS.json', 'Copie isolée, adaptateur R25 explicitement figé ; adaptateur R26 éprouvé séparément.'),
    ]
    checks = []
    reports = {}
    for label, name, scope in specs:
        report = reports[name] = read(name)
        if report.get('failed') != 0 or type(report.get('passed')) is not int or report['passed'] <= 0:
            raise ValueError('A report is missing a successful execution: ' + name)
        checks.append({'label': label, 'result': f"{report['passed']} réussis, zéro échec", 'scope': scope, 'path': 'docs/' + name})
    visual, motion = read('R26_VISUAL_TESTS.json'), read('R26_MOTION_EVIDENCE.json')
    for report in [visual['pythonTests'], visual['nodeTests'], visual['browserTests'], motion['validation']['python']]:
        if report['failed'] != 0:
            raise ValueError('Source import validation failed')
    checks += [
        {'label': 'Ressources visuelles', 'result': '8 Python, 9 Node et 8 navigateur réussis',
         'scope': 'Neuf modèles, huit archives et leurs textures exactes ; le navigateur est déjà compté dans les planches.', 'path': 'docs/R26_VISUAL_TESTS.json'},
        {'label': 'Reproduction des mouvements', 'result': '10 tests Python réussis',
         'scope': '365 scènes originales : 359 à clés et six bases sans clés, 2 154 correspondances de maillage.', 'path': 'docs/R26_MOTION_EVIDENCE.json'},
    ]
    python_count = sum(reports[name]['passed'] for name in ['R26_EXPORT_TESTS.json', 'R26_AUDIO_TESTS.json', 'R26_CANONICAL_VALIDATION.json']) + visual['pythonTests']['passed'] + motion['validation']['python']['passed']
    node_count = sum(reports[name]['passed'] for name in ['R26_MOTION_SKELETON_TESTS.json', 'R26_PERSISTENCE_TESTS.json', 'R26_READER_ASSET_TESTS.json', 'R26_MATCH_TESTS.json']) + visual['nodeTests']['passed']
    browser_count = sum(reports[name]['passed'] for name in ['R26_AUDIO_BROWSER.json', 'R26_CANONICAL_BROWSER.json', 'R26_PERSISTENCE_BROWSER_TESTS.json', 'R26_READER_BROWSER.json', 'R26_ACCESS_BROWSER.json', 'R26_SPRITES_BROWSER.json', 'R26_DASHBOARD_BROWSER.json'])
    return {'schema': 're.bow.validation-r26/1', 'checks': checks,
            'totals': {'historical_assertions': reports['R26_HISTORICAL_TESTS.json']['passed'],
                       'python_tests': python_count, 'targeted_node_checks': node_count,
                       'browser_groups': browser_count, 'focused_reader_followup_groups': reports['R26_READER_FOLLOWUP.json']['passed'],
                       'isolated_legacy_browser_groups': sum(reports[name]['passed'] for name in ['R26_LEGACY_R24_DASHBOARD.json', 'R26_LEGACY_R25_DASHBOARD.json', 'R26_LEGACY_R25_ACCESS.json'])},
            'post_export_evidence': ['docs/R26_INTEGRATION_TESTS.json', 'docs/R26_REPRODUCTION.json', 'docs/R26_SOURCE_ADDITIONS.json'],
            'scope': 'Exécutions locales sur environnement cloud et rendu logiciel ; ni appareils physiques ni fidélité globale 1:1 certifiés.',
            'canonical_fidelity_certified': 0}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    output = ROOT / 'docs/R26_VALIDATION.json'
    result = build()
    raw = (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode()
    if args.check:
        if output.read_bytes() != raw:
            raise ValueError('Validation summary differs from executed reports')
    else:
        output.write_bytes(raw)
    print(json.dumps(result['totals']))


if __name__ == '__main__':
    main()
