#!/usr/bin/env python3
"""Bind the implemented real restore and frozen replay gateway to their executed proofs."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = 'modules/fidelity-r31/persistence'


def file(path):
    raw = (ROOT / path).read_bytes()
    return {'path': path, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def raw(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def build():
    own = sorted(path.relative_to(ROOT).as_posix() for folder in ('persistence', 'replay')
                 for path in (ROOT / 'modules/fidelity-r31' / folder).rglob('*')
                 if path.is_file() and path.suffix in ('.html', '.js', '.css'))
    reports = []
    for name, script in [('R31_PERSISTENCE_TESTS.json', 'tests/verify-persistence-r31.mjs'),
                         ('R31_PERSISTENCE_BROWSER.json', 'tests/browser-persistence-r31.mjs')]:
        path = 'docs/' + name
        report = json.loads((ROOT / path).read_text())
        if not isinstance(report.get('passed'), int) or report['passed'] <= 0 or report.get('failed') != 0:
            raise ValueError('Missing or failed executed persistence report: ' + path)
        for source in report.get('sourceFiles', []):
            if file(source['path'])['sha256'] != source['sha256']:
                raise ValueError('Stale executed persistence proof: ' + source['path'])
        reports.append({**file(path), 'script': script, 'passed': report['passed'], 'failed': 0})
    legacy = json.loads((ROOT / 'modules/fidelity-r24/persistence/engines.json').read_text())
    evolution = json.loads((ROOT / 'modules/fidelity-r28/evolutions/contract.json').read_text())
    manifest = {'schema': 're.bow.persistence-contract-r31/1', 'release': 'R31',
        'taskIds': ['G-REPLAYS', 'G-SAUVES'], 'storage': {
            'realGameValuesRestored': True, 'allowlistContract': file('src/save-center-r19.js'),
            'originalBackupFormat': 're.bow.backup/1', 'allowlistedKeys': 18,
            'journal': {'schema': 're.bow.real-restore-journal-r31/1', 'database': 're.bow.real-restore.r31',
                'stores': ['payload', 'meta'], 'history': 1, 'checksum': 'SHA-256',
                'durableBeforeFirstGameWrite': True, 'automaticResume': False,
                'gameLocalStorageAtomic': False, 'explicitResumeAndUndo': True,
                'interTabLock': 'Web Locks, exclusive and ifAvailable', 'outsideWriterValuesOverwritten': False}},
        'replay': {'schemas': ['R13 main replay', 're.bow.catalog-duel-replay/1', 're.bow.evolution-duel-replay/1'],
            'mainContracts': [legacy['current_main']['runtime_contract']] + [row['runtime_contract'] for row in legacy['historical_main']],
            'legacyRoutes': file('modules/fidelity-r24/persistence/engines.json'),
            'evolutionRuntimeContract': evolution['digest'], 'evolutionSourceManifest': file('modules/fidelity-r28/evolutions/contract.json'),
            'evolutionNativeSourceFiles': len(evolution['files']), 'passes': 2,
            'opaqueOrigin': True, 'sharedGameStorageAccess': False, 'engineMigration': False},
        'files': [file(path) for path in own], 'validation': reports,
        'limits': {'backupFileBytes': 33554432, 'evolutionReplayBytes': 4194304, 'journalPayloadBytes': 71303168,
            'cloudSyncConfigured': False, 'physicalDiskCrashCertified': False,
            'allHistoricalReplayContractsCertified': False, 'nativeGameFidelityCertified': False},
        'canonicalFidelityCertified': False}
    delivery = {'schema': 're.bow.fidelity-lot-r31/1', 'release': 'R31', 'id': 'persistence',
        'taskIds': ['G-REPLAYS', 'G-SAUVES'],
        'summary': 'Restauration des vraies clés du jeu avec journal de reprise/retour et lecture des replays R28 dans leur moteur source exact.',
        'advances': [
            'Restauration sélective du stockage réel reconnu par R19, aperçu, copie préalable et confirmation explicites.',
            'Journal IndexedDB avant/après lié par SHA-256 avant la première écriture, reprise idempotente et retour exact après interruption ou rechargement.',
            'Verrou inter-onglets, valeurs extérieures conservées, refus des quotas, journaux altérés et aperçus périmés.',
            'Replays avec évolutions R28 : neuf fichiers du contrat original vérifiés par SHA, origine opaque sans stockage partagé, résultat validé et deux reconstructions identiques.',
            'Routes principales actuelle et avant R13, et duel R7, conservées sans conversion du moteur.'],
        'remaining': [
            'Synchronisation ou restauration cloud : aucun service distant ni compte configuré.',
            'Pannes physiques, interruptions du système d’exploitation et appareils physiques hors du navigateur cloud restent non certifiés.',
            'Autres contrats historiques non publiés, reprises de campagne et conclusions artistiques ne sont pas validés par la relecture de commandes.',
            'Le localStorage du jeu ne fournit pas de transaction globale entre onglets non coopérants ; fermer les autres onglets et conserver le fichier avant restauration.'],
        'manifests': [],
        'resources': [{'path': PACK + '/index.html', 'label': 'Restaurer le jeu avec reprise et retour'},
            {'path': 'modules/fidelity-r31/replay/index.html', 'label': 'Relecture R13, R7 et évolutions R28'},
            {'path': 'docs/R31_PERSISTENCE.md', 'label': 'Fonctions, reprise et limites'},
            {'path': reports[0]['path'], 'label': 'Tests de stockage et de contrats'},
            {'path': reports[1]['path'], 'label': 'Recette navigateur réelle et rechargement'}],
        'identities': [], 'counts': {'allowlistedGameKeys': 18, 'retainedUndoJournals': 1,
            'originalReplayRoutes': 4, 'newEvolutionReplayRoutes': 1,
            'nodeTestGroups': reports[0]['passed'], 'browserGroups': reports[1]['passed'],
            'cloudEndpoints': 0, 'nativeOriginalGameFidelityCertified': 0}, 'canonicalFidelityCertified': False}
    return manifest, delivery


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    manifest, delivery = build()
    manifest_path = PACK + '/manifest.json'
    payload = raw(manifest)
    delivery['manifests'] = [{'path': manifest_path, 'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest()}]
    for path, data in [(manifest_path, payload), (PACK + '/delivery.json', raw(delivery))]:
        target = ROOT / path
        if args.check:
            if not target.is_file() or target.read_bytes() != data:
                raise ValueError('Persistence output not reproduced: ' + path)
        else:
            target.write_bytes(data)
    print(json.dumps(delivery['counts']))


if __name__ == '__main__':
    main()
