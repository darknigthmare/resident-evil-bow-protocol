#!/usr/bin/env python3
"""Validate current and published CI scopes and compile their actual command blocks."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

import yaml

ROOT = Path(__file__).resolve().parents[1]
FILES = [f'.github/workflows/source-fidelity-r{number}.yml' for number in range(25, 31)]
PUBLISHED = {25: '300dc0169d83382189cd6c8889cb4f7368f1e8a5',
             26: '826f7ed1811c48adc0609f97699eb32f629fc78a',
             27: '0317da5f79e40af1b6b0e82b1ef9f311900ee76a',
             28: '9bcb3535189ffa7b21f08f733be2f1afeb73b984',
             29: '06910922109445ef387414874d09add2839e70a8'}


def main():
    checks, workflows, inputs = [], {}, []
    counts = {'workflows': 0, 'bash_blocks': 0, 'python_blocks': 0, 'javascript_blocks': 0}
    try:
        for name in FILES:
            data = (ROOT / name).read_bytes()
            workflow = yaml.load(data, Loader=yaml.BaseLoader)
            assert {'push', 'pull_request', 'workflow_dispatch'} <= set(workflow['on']), name
            assert workflow['permissions'] == {'contents': 'read'}, name
            assert workflow['concurrency']['cancel-in-progress'] == 'true', name
            for job in workflow['jobs'].values():
                for row in job.get('strategy', {}).get('matrix', {}).get('include', []):
                    assert (ROOT / row['script']).is_file(), row['script']
                for step in job['steps']:
                    if 'uses' in step:
                        assert re.fullmatch(r'[\w.-]+/[\w.-]+@[a-f0-9]{40}', step['uses']), step['uses']
                    if 'run' not in step:
                        continue
                    code = re.sub(r'\$\{\{.*?\}\}', 'fixture', step['run'])
                    subprocess.run(['bash', '-n'], input=code, text=True, capture_output=True, check=True)
                    counts['bash_blocks'] += 1
                    for script in re.findall(r'(?<![\w/])((?:scripts|tests)/[\w./-]+\.(?:py|mjs|cjs))', code):
                        assert (ROOT / script).is_file(), script
                    for language, body in re.findall(r"<<'(PY|JS)'\n(.*?)\n\1(?:\n|$)", code, flags=re.S):
                        if language == 'PY':
                            compile(body, name + ':python', 'exec'); counts['python_blocks'] += 1
                        else:
                            subprocess.run(['node', '--input-type=module', '--check'], input=body, text=True, capture_output=True, check=True)
                            counts['javascript_blocks'] += 1
            inputs.append({'path': name, 'sha256': hashlib.sha256(data).hexdigest()})
            workflows[int(re.search(r'r(\d+)\.yml$', name)[1])] = workflow
            counts['workflows'] += 1
        checks.append({'name': 'All six workflows parse with pinned actions, read-only permissions and existing script paths', 'pass': True})
        checks.append({'name': 'All actual Bash, Python and JavaScript workflow blocks compile', 'pass': True})
        for release, commit in PUBLISHED.items():
            jobs = ('provenance', 'browser', 'build') if release == 29 else ('browser', 'build') if release in (27, 28) else ('browser',)
            for job in jobs:
                checkout = next(step for step in workflows[release]['jobs'][job]['steps'] if step.get('uses', '').startswith('actions/checkout@'))
                assert checkout['with']['ref'] == commit, (release, job)
        checks.append({'name': 'Historical link, source-hash and conservation assertions retain their exact published snapshots', 'pass': True})
        current = workflows[30]
        for job in current['jobs'].values():
            checkout = next(step for step in job['steps'] if step.get('uses', '').startswith('actions/checkout@'))
            assert 'ref' not in checkout.get('with', {}), 'R30 must test the actual submitted head'
        commands = '\n'.join(step.get('run', '') for step in current['jobs']['provenance']['steps'])
        for script in ('tests/test_fidelity_r30.py', 'tests/test_native_revelations_r30.py',
                       'tests/test_native_other_r30.py', 'scripts/verify-new-native-sources-r30.py',
                       'scripts/verify-selection-avatars-r30.py', 'tests/verify-native-runtime-r30.mjs',
                       'tests/verify-native-revelations-r30.mjs', 'tests/verify-native-other-motion-r30.mjs',
                       'tests/verify-r30-integration.mjs'):
            assert script in commands, script
        assert 'lxml==6.1.1' in commands and 'npm run verify' in commands
        checks.append({'name': 'Current R30 provenance executes all three source lots, avatars, runtime, integration and original engine assertions', 'pass': True})
        matrix = current['jobs']['browser']['strategy']['matrix']['include']
        assert len(matrix) == 4 and len({row['script'] for row in matrix}) == 4
        assert any(row['argument'] == '--verify' for row in matrix)
        browser_commands = '\n'.join(step.get('run', '') for step in current['jobs']['browser']['steps'])
        assert "buildId:'154.0.8037.57'" in browser_commands and '@puppeteer/browsers@2.10.10' in browser_commands
        assert 'google-chrome' not in browser_commands, 'Host browser updates must not choose the rerender version'
        checks.append({'name': 'Current head has four independently executed browser suites including actual native rerenders', 'pass': True})
    except Exception as error:
        checks.append({'name': 'Current CI validation', 'pass': False, 'error': str(error)})
    inputs.append({'path': 'scripts/validate-fidelity-ci-r30.py', 'sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()})
    result = {'schema': 're.bow.ci-validation-r30/1', 'passed': sum(item['pass'] for item in checks),
              'failed': sum(not item['pass'] for item in checks), 'counts': counts, 'checks': checks,
              'sourceFiles': inputs, 'scope': 'Actual local workflow parsing and command compilation. Remote Actions execution is separate.'}
    (ROOT / 'docs/R30_CI_VALIDATION.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'passed': result['passed'], 'failed': result['failed'], 'counts': counts}))
    return int(bool(result['failed']))


if __name__ == '__main__':
    raise SystemExit(main())
