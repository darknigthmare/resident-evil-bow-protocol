#!/usr/bin/env python3
"""Bind the executed character/arena flow proof without rewriting historical controllers."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = '6c2d0d91f4dd79eff1190cd50a352feb2a05dfe5'
REPORT = 'docs/R34_SELECTION_BROWSER.json'
OUTPUT = ROOT / 'docs/R34_SELECTION.json'
CONTROLLERS = ['src/unified-engine-v060.js', 'src/catalog-duel-v070.js', 'modules/fidelity-r28/evolutions/duel.js']


def record(name):
    raw = (ROOT / name).read_bytes()
    return {'path': name, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def build():
    report = json.loads((ROOT / REPORT).read_text())
    assert report['passed'] == 16 and report['failed'] == 0, 'A complete executed browser proof is required.'
    assert not report['staleExecutedSources'], 'A test run with changing sources cannot be delivered.'
    for source in report['sourceFiles']:
        assert record(source['path'])['sha256'] == source['sha256'], 'Stale selection proof: ' + source['path']
    for name in CONTROLLERS:
        previous = subprocess.check_output(['git', 'show', BASE + ':' + name], cwd=ROOT)
        assert previous == (ROOT / name).read_bytes(), 'The original controller was edited: ' + name
    names = ['modules/fidelity-r34/selection/prepare.js', 'modules/fidelity-r34/selection/flow.js',
             'modules/fidelity-r34/selection/flow.css', 'tests/browser-selection-r34.mjs',
             'scripts/build-selection-r34.py', 'docs/R34_SELECTION.md', REPORT] + CONTROLLERS
    return {'schema': 're.bow.match-selection-r34/1', 'release': 'R34', 'baselineCommit': BASE,
            'counts': {'browserGroups': report['passed'], 'currentPlayerDocuments': 3, 'stages': 52,
                       'originalControllersPreserved': 3, 'newArtisticAssets': 0, 'newSimulationRules': 0},
            'playerPhases': ['characters', 'stages', 'combat'],
            'initialInputPreparation': True, 'arenaConfirmationStartsCombat': True,
            'stagePreviewChangesSimulation': False, 'selectionWritesProgress': False,
            'gamepadMenuConfirmRequiresReleaseBeforeCombat': True,
            'reversibleBrowserPadTransportMask': True,
            'legacyFixtureQuery': {'dev': '1', 'selection': 'direct'},
            'legacyFixtureIsDefaultFlowProof': False,
            'sourceFiles': [record(name) for name in names],
            'limits': ['Les manettes standard sont des fixtures explicites ; aucun périphérique physique ou lecteur d’écran réel n’est certifié.',
                       'Les API publiques de simulation et de replay conservent leurs fonctions existantes ; la séparation demandée concerne le parcours joueur.',
                       'Les aperçus sont issus du renderer et des 52 données d’arènes existants ; aucune fidélité originale Capcom supplémentaire n’est revendiquée.',
                       'Le mode DEV direct sert seulement aux anciennes recettes d’interface et n’atteste pas le nouveau parcours par défaut.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    value = build()
    raw = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
    if args.check:
        assert OUTPUT.read_bytes() == raw, 'Selection delivery metadata is stale.'
    else:
        OUTPUT.write_bytes(raw)
    print(json.dumps({'complete': True, 'check': args.check, 'counts': value['counts']}))


if __name__ == '__main__':
    main()
