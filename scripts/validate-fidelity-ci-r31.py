#!/usr/bin/env python3
"""Validate current and published CI scopes and compile their actual command blocks."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

import yaml

ROOT = Path(__file__).resolve().parents[1]
FILES = [f'.github/workflows/source-fidelity-r{number}.yml' for number in range(25, 32)] + ['.github/workflows/interface-r20-browser.yml']
PUBLISHED = {25: '300dc0169d83382189cd6c8889cb4f7368f1e8a5',
             26: '826f7ed1811c48adc0609f97699eb32f629fc78a',
             27: '0317da5f79e40af1b6b0e82b1ef9f311900ee76a',
             28: '9bcb3535189ffa7b21f08f733be2f1afeb73b984',
             29: '06910922109445ef387414874d09add2839e70a8',
             30: '12cdd7e38b5785cb9fbbb3fe3dff8d0f7f41fa24'}


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
            workflows[20 if name.endswith('interface-r20-browser.yml') else int(re.search(r'r(\d+)\.yml$', name)[1])] = workflow
            counts['workflows'] += 1
        checks.append({'name': 'All eight workflows parse with pinned actions, read-only permissions and existing script paths', 'pass': True})
        checks.append({'name': 'All actual Bash, Python and JavaScript workflow blocks compile', 'pass': True})
        for release, commit in PUBLISHED.items():
            jobs = ('provenance', 'browser', 'build') if release in (29, 30) else ('browser', 'build') if release in (27, 28) else ('browser',)
            for job in jobs:
                checkout = next(step for step in workflows[release]['jobs'][job]['steps'] if step.get('uses', '').startswith('actions/checkout@'))
                assert checkout['with']['ref'] == commit, (release, job)
        checks.append({'name': 'Historical link, source-hash and conservation assertions retain their exact published snapshots', 'pass': True})
        old_browser = next(step for step in workflows[20]['jobs']['browser']['steps'] if step.get('uses', '').startswith('actions/checkout@'))
        assert old_browser['with']['ref'] == '545b10d17c49fcca47a03281bf1099a26c7b1ce1'
        r30 = '\n'.join(step.get('run', '') for step in workflows[30]['jobs']['provenance']['steps'])
        assert r30.index('node tests/verify-native-other-motion-r30.mjs') < r30.index('python" tests/test_native_other_r30.py')
        assert "pattern='test_fidelity_r30.py'" in r30 and 'R30_EXPORT_TESTS.json' in r30
        current = workflows[31]
        for job in current['jobs'].values():
            checkout = next(step for step in job['steps'] if step.get('uses', '').startswith('actions/checkout@'))
            assert 'ref' not in checkout.get('with', {}), 'R31 must test the actual submitted head'
        commands = '\n'.join(step.get('run', '') for step in current['jobs']['provenance']['steps'])
        for script in ('tests/test_fidelity_r31.py', 'tests/test_generated_sprites_r31.py',
                       'tests/test_motion_commands_r31.py', 'tests/test_canonical_r31.py',
                       'tests/test_audio_sources_r31.py', 'tests/verify-generated-sprites-r31.mjs',
                       'tests/verify-native-motion-r31.mjs', 'tests/verify-canonical-r31.mjs',
                       'tests/verify-persistence-r31.mjs', 'tests/verify-audio-listening-r31.mjs',
                       'tests/verify-native-runtime-r31.mjs', 'tests/verify-performance-access-r31.mjs',
                       'tests/verify-r31-integration.mjs'):
            assert script in commands, script
        assert 'lxml==6.1.1' in commands and 'npm run verify' in commands
        checks.append({'name': 'Current R31 provenance executes all source, generation, persistence, performance, access and original engine assertions', 'pass': True})
        matrix = current['jobs']['browser']['strategy']['matrix']['include']
        assert len(matrix) == 7 and len({row['script'] for row in matrix}) == 7
        assert 'ffmpeg' in commands and 'ffprobe' in commands
        browser_commands = '\n'.join(step.get('run', '') for step in current['jobs']['browser']['steps'])
        assert "buildId:'154.0.8037.57'" in browser_commands and '@puppeteer/browsers@2.10.10' in browser_commands
        assert 'google-chrome' not in browser_commands, 'Host browser updates must not choose the rerender version'
        checks.append({'name': 'Current head has seven independently executed current browser suites', 'pass': True})
    except Exception as error:
        checks.append({'name': 'Current CI validation', 'pass': False, 'error': str(error)})
    inputs.append({'path': 'scripts/validate-fidelity-ci-r31.py', 'sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()})
    result = {'schema': 're.bow.ci-validation-r31/1', 'passed': sum(item['pass'] for item in checks),
              'failed': sum(not item['pass'] for item in checks), 'counts': counts, 'checks': checks,
              'sourceFiles': inputs, 'scope': 'Actual local workflow parsing and command compilation. Remote Actions execution is separate.'}
    (ROOT / 'docs/R31_CI_VALIDATION.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'passed': result['passed'], 'failed': result['failed'], 'counts': counts}))
    return int(bool(result['failed']))


if __name__ == '__main__':
    raise SystemExit(main())
