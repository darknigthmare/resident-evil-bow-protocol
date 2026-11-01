#!/usr/bin/env python3
"""Bind the R33 selected-recovery/batch delivery to actual runtime and executed reports."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE = 'modules/fidelity-r33'
BASELINE = 'adb733b9faf10a041c0b4ef5aa115f43ec67dd34'


def record(path: str) -> dict:
    raw = (ROOT / path).read_bytes()
    return {'path': path, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def encoded(value: dict) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    runtime = [f'{MODULE}/{path}' for path in [
        'persistence/index.html', 'persistence/page.js', 'persistence/restore.js', 'persistence/link.js',
        'replay/index.html', 'replay/page.js', 'replay/batch.js']]
    inherited = ['src/save-center-r19.js', 'modules/fidelity-r31/persistence/journal.js',
                 'modules/fidelity-r31/persistence/restore.js', 'modules/fidelity-r31/persistence/style.css',
                 'modules/fidelity-r31/replay/verify.js', 'modules/fidelity-r28/evolutions/contract.json',
                 'modules/fidelity-r24/persistence/engines.json']
    validations = []
    for path, command in [('docs/R33_PERSISTENCE_TESTS.json', 'node tests/verify-persistence-r33.mjs'),
                          ('docs/R33_PERSISTENCE_BROWSER.json', 'node tests/browser-persistence-r33.mjs')]:
        report = json.loads((ROOT / path).read_text())
        assert isinstance(report.get('passed'), int) and report['passed'] > 0, path
        assert report.get('failed') == 0, path
        assert report.get('sourceFiles'), path
        for source in report['sourceFiles']:
            assert record(source['path'])['sha256'] == source['sha256'], f'Stale proof: {path} -> {source["path"]}'
        validations.append({**record(path), 'command': command, 'passed': report['passed'], 'failed': report['failed']})
    counts = {'allowlistedGameKeys': 18, 'gameStorageGroups': 8, 'newCatalogueIdentities': 0,
              'mixedReplayInputSchemas': 3, 'originalEngineRoutesVerified': 4,
              'maximumReplayFiles': 16, 'maximumReplayBatchBytes': 33554432,
              'nodeGroups': validations[0]['passed'], 'browserGroups': validations[1]['passed']}
    manifest = {
        'schema': 're.bow.persistence-contract-r33/1', 'release': 'R33', 'baselineCommit': BASELINE,
        'taskIds': ['G-SAUVES', 'G-REPLAYS'], 'counts': counts,
        'restore': {'selectedGroupsOnlyDuringRecovery': True, 'unselectedProgressPreserved': True,
                    'selectedOutsideWriterConflictsRefused': True, 'initialFullBackupStalenessCheckRetained': True,
                    'publishedR31JournalSchema': 're.bow.real-restore-journal-r31/1',
                    'databaseAndLock': 're.bow.real-restore.r31', 'automaticResume': False,
                    'multiKeyLocalStorageAtomic': False},
        'replay': {'individualSchemas': ['R13 main replay', 're.bow.catalog-duel-replay/1', 're.bow.evolution-duel-replay/1'],
                   'inputSha256Bound': True, 'exactDuplicateSkipped': True, 'originalEngineMigration': False,
                   'sequential': True, 'passes': 2, 'opaqueOrigin': True,
                   'cancellationCleansLatePreparedTask': True, 'reportsExportable': True},
        'files': [record(path) for path in runtime], 'inheritedContracts': [record(path) for path in inherited],
        'guide': record('docs/R33_PERSISTENCE.md'), 'builder': record('scripts/build-persistence-r33.py'),
        'validation': validations,
        'limits': {'cloudBackendConfigured': False, 'physicalPowerLossCertified': False,
                   'physicalDevicesOrScreenReadersCertified': False, 'allHistoricalReplayContractsCertified': False,
                   'artisticFidelityCertified': False}}
    manifest_path = f'{MODULE}/persistence/manifest.json'
    if args.check:
        assert (ROOT / manifest_path).read_bytes() == encoded(manifest), manifest_path
    else:
        (ROOT / manifest_path).write_bytes(encoded(manifest))
    delivery = {
        'schema': 're.bow.fidelity-lot-r33/1', 'release': 'R33', 'lotId': 'persistence',
        'owner': 'r33_saves_replays', 'workstreams': ['G-SAUVES', 'G-REPLAYS'],
        'summary': 'Reprise/retour des groupes choisis en préservant les progrès extérieurs non choisis ; lots individuels R13/R7/R28 isolés et vérifiés.',
        'advances': [
            'Le blocage R31 après modification d’un groupe non choisi est reproduit ; R33 reprend ou annule uniquement les groupes sélectionnés.',
            'Les anciens journaux R31 restent lisibles, sans migration ; les conflits sur groupes choisis, aperçus périmés, quotas et verrous restent protégés.',
            'Un lot accepte jusqu’à 16 fichiers individuels R13/R7/R28, 32 Mio au total, avec SHA-256 de chaque source, doublons et refus explicites.',
            'Quatre routes originales sont reconstruites séquentiellement deux fois : Versus actuel, avant R13, catalogue R7 et évolutions R28 ; aucune sauvegarde du parent n’est modifiée.',
            'Le constat exportable garde les fichiers annulés/non lancés ; le nettoyage couvre la source préparée tardivement et le retour de page sans relance automatique.'],
        'remaining': [
            'Aucun backend cloud ou compte distant configuré ; aucune synchronisation certifiée.',
            'LocalStorage ne rend pas les écritures de plusieurs clés atomiques ; fermer les autres onglets reste nécessaire.',
            'Pannes physiques, coupures électriques, appareils physiques et lecteurs d’écran réels restent non certifiés.',
            'Les contrats historiques inconnus, reprises de campagnes, conclusions artistiques, images et sons ne sont pas validés par la relecture.',
            'Les collections principales et sauvegardes R19 restent dans le lecteur historique ; ce lot traite les fichiers individuels sélectionnés.'],
        'canonicalFidelityCertified': False, 'identities': [], 'counts': counts,
        'sourceFiles': [record(manifest_path), *[record(path) for path in runtime], *[record(row['path']) for row in validations]],
        'resources': [
            {'path': f'{MODULE}/persistence/index.html', 'label': 'Restaurer les groupes choisis avec reprise'},
            {'path': f'{MODULE}/replay/index.html', 'label': 'Vérifier plusieurs replays, dont les évolutions'},
            {'path': 'docs/R33_PERSISTENCE.md', 'label': 'Portée, protection des groupes et reproduction'},
            {'path': 'docs/R33_PERSISTENCE_TESTS.json', 'label': 'Reproduction avant/après et garde des lots'},
            {'path': 'docs/R33_PERSISTENCE_BROWSER.json', 'label': 'Stockage et moteurs réels dans Chromium'}]}
    delivery_path = f'{MODULE}/persistence/delivery.json'
    if args.check:
        assert (ROOT / delivery_path).read_bytes() == encoded(delivery), delivery_path
    else:
        (ROOT / delivery_path).write_bytes(encoded(delivery))
    print(json.dumps({'complete': True, 'check': args.check, 'counts': counts}, ensure_ascii=False))


if __name__ == '__main__':
    main()
