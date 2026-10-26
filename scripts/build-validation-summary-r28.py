#!/usr/bin/env python3
"""Aggregate executed R28 evidence, keeping historical results and open work distinct."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPECS = [
    ('Export et conservation du classeur', 'R28_EXPORT_TESTS.json', 'python'),
    ('Revue et contrats des sprites', 'R28_SPRITES_TESTS.json', 'python'),
    ('Galerie des sprites', 'R28_SPRITES_BROWSER.json', 'browser'),
    ('Admission au rendu de combat', 'R28_COMBAT_SPRITE_TESTS.json', 'node'),
    ('Corps sources et références Internet', 'R28_BODY_SOURCES_TESTS.json', 'python'),
    ('Moteur et replays des évolutions', 'R28_EVOLUTIONS_ENGINE_TESTS.json', 'node'),
    ('Sélection et évolutions en navigateur', 'R28_EVOLUTIONS_BROWSER.json', 'browser'),
    ('Citations documentaires du catalogue', 'R28_CANONICAL_VALIDATION.json', 'python'),
    ('Parcours des citations documentaires', 'R28_CANONICAL_BROWSER.json', 'browser'),
    ('Archives et attributions audio', 'R28_AUDIO_TESTS.json', 'python'),
    ('Lecteur audio volontaire', 'R28_AUDIO_BROWSER.json', 'browser'),
    ('Suivi central des dix-sept chantiers', 'R28_DASHBOARD_BROWSER.json', 'browser'),
    ('Ajouts des Dossiers par incarnation', 'R28_DOSSIER_BROWSER.json', 'browser'),
]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build(root=ROOT, allow_pending=False):
    checks, pending, failed = [], [], []
    totals = {'python_tests': 0, 'targeted_node_groups': 0, 'browser_groups': 0}
    keys = {'python': 'python_tests', 'node': 'targeted_node_groups', 'browser': 'browser_groups'}
    for label, name, kind in SPECS:
        path = root / 'docs' / name
        if not path.is_file():
            pending.append('docs/' + name)
            continue
        value = json.loads(path.read_text())
        counts = value.get('counts', {})
        passed, failures = value.get('passed', counts.get('passed')), value.get('failed', counts.get('failed'))
        if type(passed) is not int or type(failures) is not int or passed + failures <= 0:
            raise ValueError('Missing executed test result: ' + name)
        if failures or value.get('pass') is False:
            failed.append('docs/' + name)
        bindings = []
        for key in ('sourceFiles', 'executedAdapterInputs', 'sources', 'inputs'):
            candidates = value.get(key, [])
            if isinstance(candidates, list):
                bindings.extend(item for item in candidates if isinstance(item, dict) and isinstance(item.get('path'), str) and isinstance(item.get('sha256'), str))
        for binding in bindings:
            target = (root / binding['path']).resolve()
            if not target.is_relative_to(root.resolve()) or not target.is_file() or digest(target) != binding['sha256']:
                failed.append('docs/' + name + ': stale executed source ' + binding['path'])
        checks.append({'label': label, 'kind': kind, 'passed': passed, 'failed': failures,
                       'result': f'{passed} réussis, {failures} échec(s)', 'path': 'docs/' + name,
                       'sha256': digest(path), 'scope': 'Exécution R28, dans la portée décrite par le rapport.'})
        totals[keys[kind]] += passed
    manifest_path = root / 'modules/fidelity-r28/sprites/manifest.json'
    manifest = json.loads(manifest_path.read_text())
    counts = manifest['counts']
    if counts['generatedSprites'] + counts['generationBlockedSprites'] != counts['targetIdentities']:
        failed.append('Generation attempts are unresolved or double-counted')
    gallery_path = root / 'docs/R28_SPRITES_BROWSER.json'
    if gallery_path.is_file():
        gallery = json.loads(gallery_path.read_text())
        if (gallery.get('generatedFilesInExecutedManifest') != counts['generatedSprites']
                or gallery.get('pendingInExecutedManifest') != counts['pendingSprites']):
            failed.append('R28 gallery executed a different sprite population')
    if not allow_pending and (pending or failed):
        raise ValueError('R28 validation is unfinished: ' + ', '.join(pending + failed))
    return {'schema': 're.bow.validation-r28/1', 'release': 'R28',
            'complete': not pending and not failed, 'provisional': bool(pending or failed),
            'checks': checks, 'totals': totals, 'pending_reports': pending, 'failed_reports': failed,
            'generation_snapshot': {key: counts[key] for key in (
                'targetIdentities', 'generatedSprites', 'generationBlockedSprites', 'visuallyReviewedSprites',
                'fullBodyReviewedSprites', 'neutralBaseCombatEligibleSprites', 'replacedSprites')},
            'target_generation_attempts_complete': counts['generatedSprites'] + counts['generationBlockedSprites'] == counts['targetIdentities'],
            'target_generation_complete': counts['pendingSprites'] == 0,
            'generation_preference': 'Conserver les refus, fidélité prioritaire',
            'post_export_evidence': ['docs/R28_EXPORT.json', 'docs/R28_REPRODUCTION.json'],
            'historical_results': {'path': 'docs/R27_VALIDATION.json', 'sha256': digest(root / 'docs/R27_VALIDATION.json'),
                'scope': 'Rapport historique conservé ; ses tests ne sont pas recomptés comme exécutés en R28.'},
            'scope': 'Résultats exécutés pour les ajouts R28. Les dix-sept chantiers, les cycles complets, les captures primaires et les appareils physiques restent distincts de cette recette.',
            'open_workstreams': 17, 'canonical_fidelity_certified': 0}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--allow-pending', action='store_true')
    args = parser.parse_args()
    result = build(allow_pending=args.allow_pending)
    content = (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode()
    path = ROOT / 'docs/R28_VALIDATION.json'
    if args.check:
        if path.read_bytes() != content:
            raise ValueError('R28 validation differs from its executed inputs')
    else:
        path.write_bytes(content)
    print(json.dumps({'complete': result['complete'], 'totals': result['totals'],
                      'pending': result['pending_reports'], 'failed': result['failed_reports']}))


if __name__ == '__main__':
    main()
