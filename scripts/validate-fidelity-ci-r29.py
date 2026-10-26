#!/usr/bin/env python3
"""Parse the actual release workflows and compile their embedded commands."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

import yaml

ROOT = Path(__file__).resolve().parents[1]
FILES = [f'.github/workflows/source-fidelity-r{release}.yml' for release in range(25, 30)]


def main():
    counts = {'workflows': 0, 'bash_blocks': 0, 'python_blocks': 0, 'javascript_blocks': 0}
    inputs, workflows, checks = [], [], []
    try:
        for file in FILES:
            path = ROOT / file
            raw = path.read_bytes()
            value = yaml.load(raw, Loader=yaml.BaseLoader)
            assert {'push', 'pull_request', 'workflow_dispatch'} <= set(value['on']), file
            assert value['permissions']['contents'] == 'read', file
            assert value['concurrency']['cancel-in-progress'] == 'true', file
            scripts, actions, blocks = set(), [], 0
            for job in value['jobs'].values():
                for row in job.get('strategy', {}).get('matrix', {}).get('include', []):
                    scripts.add(row['script'])
                    assert (ROOT / row['script']).is_file(), row['script']
                    if file.endswith(('r27.yml', 'r28.yml', 'r29.yml')):
                        assert row['report'].startswith('docs/R') and row['report'].endswith('.json')
                    if row.get('secondary_report'):
                        assert row['secondary_report'].startswith('docs/R') and row['secondary_report'].endswith('.json')
                for step in job['steps']:
                    if 'uses' in step:
                        assert re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+@[a-f0-9]{40}', step['uses']), step['uses']
                        actions.append(step['uses'])
                    if 'run' not in step:
                        continue
                    code = re.sub(r'\$\{\{.*?\}\}', 'literal_fixture', step['run'])
                    subprocess.run(['bash', '-n'], input=code, text=True, capture_output=True, check=True)
                    blocks += 1; counts['bash_blocks'] += 1
                    for script in re.findall(r'(?<![\w/])((?:scripts|tests)/[\w./-]+\.(?:py|mjs|cjs))', code):
                        assert (ROOT / script).is_file(), script
                        scripts.add(script)
                    for language, body in re.findall(r"<<'(PY|JS)'\n(.*?)\n\1(?:\n|$)", code, flags=re.S):
                        if language == 'PY':
                            compile(body, file + ':python', 'exec'); counts['python_blocks'] += 1
                        else:
                            subprocess.run(['node', '--input-type=module', '--check'], input=body, text=True, capture_output=True, check=True)
                            counts['javascript_blocks'] += 1
            counts['workflows'] += 1
            inputs.append({'path': file, 'sha256': hashlib.sha256(raw).hexdigest()})
            workflows.append({'path': file, 'jobs': len(value['jobs']), 'bash_blocks': blocks,
                              'literal_script_paths': sorted(scripts), 'all_actions_pinned': True})
        checks.append({'name': 'All actual workflows parse with required events and read-only permissions', 'pass': True})
        checks.append({'name': 'All embedded Bash, Python and JavaScript blocks compile without executing tests', 'pass': True})
        checks.append({'name': 'Every literal test, source-check and matrix script path exists', 'pass': True})
        for release, commit in [('27', '0317da5f79e40af1b6b0e82b1ef9f311900ee76a'),
                                ('28', '9bcb3535189ffa7b21f08f733be2f1afeb73b984')]:
            value = yaml.load((ROOT / f'.github/workflows/source-fidelity-r{release}.yml').read_text(), Loader=yaml.BaseLoader)
            for name in ['browser', 'build']:
                checkout = next(step for step in value['jobs'][name]['steps'] if step.get('uses', '').startswith('actions/checkout@'))
                assert checkout['with']['ref'] == commit
            install = '\n'.join(step.get('run', '') for step in value['jobs']['provenance']['steps'])
            assert 'lxml==6.1.1' in install
            assert 'run-published-release-r29.py' in install
        checks.append({'name': 'Frozen R27/R28 browser/build sources and XML writer toolchain are explicit', 'pass': True})
        for release, expected in [('27', 14), ('28', 10)]:
            file = f'scripts/ci-r29/plans/r{release}-publication.json'; raw = (ROOT / file).read_bytes(); plan = json.loads(raw)
            assert plan['schema'] == 're.bow.published-check-plan-r29/1' and len(plan['commands']) == expected
            for command in plan['commands']:
                assert command and all(isinstance(item, str) for item in command)
                if command[:2] == ['{python}', '-c']:
                    compile(command[2], file, 'exec')
            inputs.append({'path': file, 'sha256': hashlib.sha256(raw).hexdigest()})
        checks.append({'name': 'All 24 explicit historical publication commands remain present', 'pass': True})
    except Exception as error:
        checks.append({'name': 'Actual CI definition validation', 'pass': False, 'error': str(error)})
    for file in ['scripts/run-published-release-r29.py', 'scripts/validate-fidelity-ci-r29.py']:
        inputs.append({'path': file, 'sha256': hashlib.sha256((ROOT / file).read_bytes()).hexdigest()})
    report = {'schema': 're.bow.ci-definition-validation-r29/1',
              'passed': sum(check['pass'] for check in checks), 'failed': sum(not check['pass'] for check in checks),
              'counts': counts, 'checks': checks, 'workflows': workflows, 'sourceFiles': inputs,
              'scope': 'Parsed workflow definitions and compiled command blocks; remote Actions execution is not claimed.'}
    (ROOT / 'docs/R29_CI_VALIDATION.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'passed': report['passed'], 'failed': report['failed'], 'counts': counts}))
    return 1 if report['failed'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
