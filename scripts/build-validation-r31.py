#!/usr/bin/env python3
"""Bind the actual shared-image and accessible-match features to executed proofs."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = 'modules/fidelity-r31/validation'
REPORTS = ('R31_PERFORMANCE_ACCESS_TESTS.json', 'R31_NATIVE_RUNTIME_TESTS.json', 'R31_PERFORMANCE_ACCESS_BROWSER.json')
CODE = ('performance/image-budget.js', 'performance/monitor.js', 'performance/index.html', 'performance/page.js',
        'performance/style.css', 'access/match-summary.js', 'combat/native-runtime.js', 'combat/native-adapter.js', 'selection/avatars.js')


def file(name):
    path = (ROOT / name).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file():
        raise ValueError('Missing local proof: ' + name)
    raw = path.read_bytes()
    return {'path': name, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def payload(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def build():
    proofs = []
    for name in REPORTS:
        path = 'docs/' + name; value = json.loads((ROOT / path).read_text())
        if not isinstance(value.get('passed'), int) or value['passed'] <= 0 or value.get('failed') != 0:
            raise ValueError('Missing successful actual report: ' + path)
        for key in ('inputs', 'sourceFiles'):
            for binding in value.get(key, []):
                if file(binding['path'])['sha256'] != binding['sha256']:
                    raise ValueError('Stale actual proof: ' + binding['path'])
        proofs.append({**file(path), 'passed': value['passed'], 'failed': 0})
    manifest = {'schema': 're.bow.performance-access-r31/1', 'release': 'R31', 'taskIds': ['G-PERF', 'G-ACCESS'],
        'managedImages': {'pixelLimit': 33554432, 'assetLimit': 64, 'pendingLimit': 12,
            'readers': ['native', 'avatars', 'generated'], 'pendingDecodesIncluded': True,
            'existingSourceFilesRewritten': False, 'corruptionNegativeCacheSeparatedFromBudgetWait': True,
            'releaseNotifiesWaitingReaders': True, 'invisibleAndPendingImagesReleasedOnPagehide': True,
            'totalBrowserOrGpuMemoryMeasured': False},
        'timing': {'voluntary': True, 'maximumDurationMs': 60000, 'callbackSampleLimit': 7200,
            'longTaskSampleLimit': 256, 'interruptedWhenHidden': True, 'physicalDisplayFpsCertified': False},
        'matchSummary': {'userRequestedOnly': True, 'usesExistingPauseAndFocusDialog': True,
            'fields': ['phase', 'round', 'life', 'guard', 'meter', 'resource', 'wins', 'evolution reasons'],
            'automaticAnnouncements': False, 'actorOrReplayWrites': False},
        'validation': proofs, 'files': [file('modules/fidelity-r31/' + name) for name in CODE],
        'scope': 'Participating image readers, measured browser callbacks and keyboard/automated accessibility of the current interface.',
        'physicalDeviceCertified': False, 'screenReaderHardwareCertified': False, 'canonicalFidelityCertified': False}
    manifest_bytes = payload(manifest)
    counts = {'managedPixelLimit': 33554432, 'participatingReaderFamilies': 3,
              'unitTestGroups': sum(row['passed'] for row in proofs[:2]), 'actualBrowserGroups': proofs[2]['passed'],
              'physicalDevicesCertified': 0, 'screenReaderHardwareCertified': 0, 'globalGpuMemoryCertified': 0}
    delivery = {'schema': 're.bow.fidelity-lot-r31/1', 'release': 'R31', 'id': 'validation',
        'taskIds': ['G-PERF', 'G-ACCESS'],
        'summary': 'Budget commun des lecteurs d’images, mesures volontaires et bilan textuel exact du combat dans le dialogue existant.',
        'advances': ['Un budget de32millions de pixels inclut les réservations en décodage des lecteurs natifs, portraits et poses générées.',
            'Les évictions et refus de budget reprennent au retour de capacité ; la corruption reste refusée et tous les chargements se libèrent au changement de page.',
            'Une mesure volontaire exporte les intervalles de callbacks et tâches longues observés dans cette session, avec échantillons bornés.',
            'Le bilan demandé par le joueur lit les vies, ressources, furie et conditions d’évolution dans le vrai acteur ; pause, focus et replays restent gérés par le dialogue existant.',
            'Trois montages réels, pression/libération, interruption, annulations, clavier, axe et320px avec texte doublé sont exercés par les tests.'],
        'remaining': ['Appareils physiques et lecteurs d’écran réels non exercés ; conformité WCAG globale non certifiée.',
            'Mémoire des autres rendus, du navigateur et du GPU non mesurée ; longues sessions sur appareils cibles encore à tester.'],
        'manifests': [{'path': PACK + '/manifest.json', 'bytes': len(manifest_bytes), 'sha256': hashlib.sha256(manifest_bytes).hexdigest()}],
        'resources': [{'path': 'modules/fidelity-r31/performance/index.html', 'label': 'Mesurer et exporter une session de navigateur'},
            {'path': 'docs/R31_PERFORMANCE_ACCESS_BROWSER.json', 'label': 'Recette réelle des trois montages'},
            {'path': 'docs/R31_PERFORMANCE_ACCESS_TESTS.json', 'label': 'Bornes, interruptions et lecture des acteurs'}],
        'identities': [], 'counts': counts, 'canonicalFidelityCertified': False}
    return {PACK + '/manifest.json': manifest_bytes, PACK + '/delivery.json': payload(delivery)}


def main():
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('--check', action='store_true'); args = parser.parse_args()
    for name, raw in build().items():
        path = ROOT / name
        if args.check:
            if not path.is_file() or path.read_bytes() != raw:
                raise ValueError('Validation lot is stale: ' + name)
        else:
            path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(raw)
    print(json.dumps({'verifiedReports': len(REPORTS), 'managedPixelLimit': 33554432, 'physicalDeviceCertification': False}))


if __name__ == '__main__':
    main()
