#!/usr/bin/env python3
"""Retain actual legacy-view executions separately from the R34 default recipes."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'docs/R34_BROWSER_COMPAT_EVIDENCE'
BASE = '6c2d0d91f4dd79eff1190cd50a352feb2a05dfe5'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def record(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': sha(raw)}


def main():
    source_files = {'scripts/retain-browser-evidence-r34.py'}
    mappings = []

    def keep(source, relative):
        target = DEST / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        mappings.append({'originalPath': str(source.relative_to(ROOT)) if source.is_relative_to(ROOT) else str(source),
                         'retained': record(target)})
        return record(target)

    def verify_sources(report):
        for item in report['sourceFiles']:
            assert sha((ROOT / item['path']).read_bytes()) == item['sha256'], 'Stale execution source: ' + item['path']
            source_files.add(item['path'])

    reports = {}
    for suite, name in [('r31', 'docs/R34_R31_BROWSER.json'), ('r32', 'qa-browser-compat-r34/r32.json'),
                        ('r33', 'qa-browser-compat-r34/r33.json')]:
        report = json.loads((ROOT / name).read_bytes())
        assert report['complete'] is True and report['failed'] == 0, name
        verify_sources(report)
        reports[suite] = report
        keep(ROOT / name, suite + '/execution.json')

    r31 = reports['r31']
    assert r31['executedSuites'] == 7 and r31['successfulSuites'] == 7
    for row in r31['checks']:
        assert row['complete'] is True and row['exitCode'] == 0
        for item in [row['log'], *(entry['executionReport'] for entry in row['reports'])]:
            source = ROOT / item['path']
            assert sha(source.read_bytes()) == item['sha256']
            keep(source, 'r31/' + row['name'] + '/' + source.name)

    r32_names = ['browser-input', 'catalog-controls', 'browser-catalog-focus', 'menu-input',
                 'performance-lifecycle', 'reflow', 'motion-input', 'evolution-input', 'sprite-gallery']
    r32_checks = []
    for name in r32_names:
        source = ROOT / 'qa-gamedev-r32' / (name + '.json')
        report = json.loads(source.read_bytes())
        assert report['passed'] > 0 and report['failed'] == 0, name
        inputs = report.get('inputs', report.get('sourceFiles', []))
        if isinstance(inputs, dict):
            inputs = inputs.get('after', [])
        for item in inputs:
            if item.get('sha256') and item.get('phase') != 'before' and item.get('fixture') is not True:
                assert sha((ROOT / item['path']).read_bytes()) == item['sha256'], item['path']
                source_files.add(item['path'])
        r32_checks.append({'name': name, 'passed': report['passed'], 'failed': report['failed'],
                           'retained': keep(source, 'r32/' + source.name)})
    existing = ROOT / 'qa-gamedev-r32/evolutions-existing/browser-evolutions-r28.json'
    existing_report = json.loads(existing.read_bytes())
    assert existing_report['passed'] == 16 and existing_report['failed'] == 0
    keep(existing, 'r32/existing-r28.json')
    r33_checks = []
    assert len(reports['r33']['freshExecutionReports']) == 7
    for item in reports['r33']['freshExecutionReports']:
        source = ROOT / item['path']
        assert sha(source.read_bytes()) == item['sha256'] and item['fresh'] is True
        report = json.loads(source.read_bytes())
        assert report['passed'] > 0 and report['failed'] == 0
        r33_checks.append({'name': source.name, 'passed': report['passed'], 'failed': report['failed'],
                          'retained': keep(source, 'r33/' + source.name)})

    logs = [('/workspace/scratch/r34-r31-compat-final.log', 'r31/command.log'),
            ('/workspace/scratch/r34-r32-compat-final.log', 'r32/command.log'),
            ('/workspace/scratch/r34-r33-compat.log', 'r33/command.log'),
            ('/workspace/scratch/r34-r32-compat.log', 'diagnostics/r32-initial.log'),
            ('/workspace/scratch/r34-lifecycle-recheck.log', 'diagnostics/lifecycle-targeted.log'),
            ('/workspace/scratch/r34-r32-compat-recheck.log', 'diagnostics/r32-before-nested-fix.log'),
            ('/workspace/scratch/r34-evolution-compat-fix.log', 'diagnostics/evolution-targeted-after-fix.log')]
    for name, target in logs:
        keep(Path(name), target)
    restored = []
    for release, keys in [(31, ['SPRITES', 'MOTION', 'CANONICAL', 'PERSISTENCE', 'AUDIO', 'PERFORMANCE_ACCESS', 'DASHBOARD', 'DOSSIER']),
                          (33, ['NATIVE', 'SPRITES', 'EVIDENCE', 'PERSISTENCE', 'RUNTIME', 'DASHBOARD', 'DOSSIER']),
                          (28, ['EVOLUTIONS'])]:
        for key in keys:
            name = f'docs/R{release}_{key}_BROWSER.json'
            original = subprocess.check_output(['git', 'show', BASE + ':' + name], cwd=ROOT)
            assert (ROOT / name).read_bytes() == original, 'Published report was not restored: ' + name
            restored.append(record(ROOT / name))
    result = {'schema': 're.bow.browser-compatibility-evidence-r34/1', 'passed': 3, 'failed': 0,
              'compatibilityView': 'dev=1&selection=direct; R33 media dialect; current controllers',
              'r31': {'recipes': 7, 'groupsPassed': r31['passed'], 'groupsFailed': 0},
              'r32': {'recipes': 9, 'groupsPassed': sum(item['passed'] for item in r32_checks), 'groupsFailed': 0,
                      'existingR28GroupsPassedSeparately': 16, 'checks': r32_checks},
              'r33': {'recipes': 6, 'groupsPassed': sum(item['passed'] for item in r33_checks), 'groupsFailed': 0, 'checks': r33_checks},
              'diagnostics': 'The first R32 execution exposed a transient iframe-load sampling failure; the unchanged lifecycle recipe passed on targeted recheck. The next run exposed a nested R28 process missing the declared compatibility view. The bootstrap now passes its import through NODE_OPTIONS; the unchanged complete R32 suite was rerun. Diagnostic logs are retained separately from the final positive recipes.',
              'retainedExecutions': mappings, 'publishedReportsRestored': restored,
              'sourceFiles': [record(ROOT / name) for name in sorted(source_files)],
              'scope': 'Actual unchanged legacy browser assertions on current source, in their explicitly declared legacy presentation view. Retained raw executions and their original relative paths are mapped to delivered copies. This is separate from R34 default-flow and new-media validation; no global artistic or original-animation certification.'}
    (ROOT / 'docs/R34_BROWSER_COMPAT.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'passed': 3, 'failed': 0, 'r31Groups': r31['passed'], 'r32Groups': result['r32']['groupsPassed'],
                      'r33Groups': result['r33']['groupsPassed'], 'retainedFiles': len(mappings)}))


if __name__ == '__main__':
    main()
