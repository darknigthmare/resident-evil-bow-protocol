#!/usr/bin/env python3
"""Parse and compile the delivered CI definitions; remote results stay separate."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

import yaml

ROOT = Path(__file__).resolve().parents[1]
BASE_COMMIT = 'adb733b9faf10a041c0b4ef5aa115f43ec67dd34'
R31_COMMIT = '413b89bfafc18abc55be1404ff77bdaf573b1334'
FILES = [
    '.github/workflows/source-fidelity-r33.yml',
    '.github/workflows/ci.yml',
    '.github/workflows/gamedev-r32.yml',
    '.github/workflows/source-fidelity-r31.yml',
    '.github/workflows/source-fidelity-r25.yml',
    '.github/workflows/source-fidelity-r26.yml',
]
SOURCE_REPORTS = [
    'CURRENT_GUARD_TESTS', 'CI_VALIDATION', 'NATIVE_TESTS', 'SPRITES_TESTS',
    'EVIDENCE_TESTS', 'EXPORT_TESTS', 'NATIVE_RIG_TESTS',
    'GENERATED_RUNTIME_TESTS', 'EVIDENCE_QUERY_TESTS', 'PERSISTENCE_TESTS',
    'RUNTIME_TESTS',
]
BROWSER_SCRIPTS = [
    'tests/browser-native-r33.mjs', 'tests/browser-generated-sprites-r33.mjs',
    'tests/browser-evidence-r33.mjs', 'tests/browser-persistence-r33.mjs',
    'tests/browser-runtime-r33.mjs', 'tests/browser-fidelity-r33.mjs',
]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def run():
    checks, workflows, inputs = [], {}, []
    counts = {'workflows': 0, 'bash_blocks': 0, 'python_blocks': 0, 'javascript_blocks': 0}

    def check(name, action):
        try:
            action()
            checks.append({'name': name, 'pass': True})
        except Exception as error:
            checks.append({'name': name, 'pass': False, 'error': str(error)})

    def parse_workflows():
        for name in FILES:
            raw = (ROOT / name).read_bytes()
            workflow = yaml.load(raw, Loader=yaml.BaseLoader)
            assert {'push', 'pull_request', 'workflow_dispatch'} <= set(workflow['on']), name
            assert workflow['permissions'] == {'contents': 'read'}, name
            assert workflow['concurrency']['cancel-in-progress'] == 'true', name
            assert isinstance(workflow['jobs'], dict) and workflow['jobs'], name
            for job in workflow['jobs'].values():
                assert 0 < int(job['timeout-minutes']) <= 40, name
                for step in job['steps']:
                    if 'uses' in step:
                        assert re.fullmatch(r'[\w.-]+/[\w.-]+@[a-f0-9]{40}', step['uses']), step['uses']
            workflows[name] = workflow
            counts['workflows'] += 1
            inputs.append({'path': name, 'sha256': sha(raw)})

    check('Six current and inherited workflows parse with pinned actions and read-only permissions', parse_workflows)

    def compile_commands():
        for name, workflow in workflows.items():
            for job in workflow['jobs'].values():
                for row in job.get('strategy', {}).get('matrix', {}).get('include', []):
                    assert (ROOT / row['script']).is_file(), row['script']
                for step in job['steps']:
                    if 'run' not in step:
                        continue
                    code = re.sub(r'\$\{\{.*?\}\}', 'fixture', step['run'])
                    subprocess.run(['bash', '-n'], input=code, text=True, capture_output=True, check=True)
                    counts['bash_blocks'] += 1
                    for script in re.findall(r'(?<![\w/])((?:scripts|tests)/[\w./-]+\.(?:py|mjs|cjs))', code):
                        assert (ROOT / script).is_file(), script
                    for language, body in re.findall(r"<<'(PY|JS|NODE)'\n(.*?)\n\1(?:\n|$)", code, flags=re.S):
                        if language == 'PY':
                            compile(body, name + ':python', 'exec')
                            counts['python_blocks'] += 1
                        else:
                            subprocess.run(['node', '--input-type=module', '--check'], input=body,
                                           text=True, capture_output=True, check=True)
                            counts['javascript_blocks'] += 1
        package = json.loads((ROOT / 'package.json').read_bytes())
        for command in ['verify:r33:delivered', 'verify:r33', 'verify:r33:http']:
            assert package['scripts'][command], command
            for script in re.findall(r'(?<![\w/])((?:scripts|tests)/[\w./-]+\.(?:py|mjs))', package['scripts'][command]):
                assert (ROOT / script).is_file(), script

    check('Actual Bash, Python and JavaScript command blocks compile and reference delivered tools', compile_commands)

    new_workflow_name = FILES[0]

    def current_scope():
        workflow = workflows[new_workflow_name]
        assert set(workflow['jobs']) == {'source', 'browser'}
        for job in workflow['jobs'].values():
            checkout = [step for step in job['steps'] if step.get('uses', '').startswith('actions/checkout@')]
            assert len(checkout) == 1
            assert checkout[0]['with'].get('ref', '${{ github.sha }}') == '${{ github.sha }}'
            assert checkout[0]['with']['fetch-depth'] == '0'
            for step in job['steps']:
                assert step.get('continue-on-error') not in ['true', True], 'Assertions must remain blocking'
        assert workflow['jobs']['browser']['needs'] == 'source'
        code = '\n'.join(step.get('run', '') for step in workflow['jobs']['source']['steps'])
        assert 'npm run verify:r33:delivered' in code
        assert 'npm run verify:r33' in code
        assert 'npm run verify >' in code
        assert 'npm run build >' in code
        assert 'python3 scripts/verify-build-r33.py' in code
        assert '--commit' not in code and 'run-published-release-r29.py' not in code
        assert code.index('npm run verify:r33:delivered') < code.index('fresh-tests-started')
        assert code.index('node tests/verify-r33-integration.mjs') < code.index('fresh-tests-started')
        assert code.index('npm run verify:r33\n') < code.index('npm run verify >')

    check('New R33 assertions and build execute submitted source, with delivered-report checks before refresh', current_scope)

    def fresh_source_reports():
        source = workflows[new_workflow_name]['jobs']['source']
        run_steps = [step for step in source['steps'] if 'run' in step]
        refresh = next(step['run'] for step in run_steps if 'rm -f docs/R33_CURRENT_GUARD_TESTS.json' in step['run'])
        removed = re.findall(r'docs/(R\d+_[A-Z_]+\.json)', refresh)
        assert set(removed) == {'R33_' + name + '.json' for name in SOURCE_REPORTS}
        assert len(removed) == len(SOURCE_REPORTS)
        verification = next(step['run'] for step in run_steps if 'source bindings' in step['run'])
        assert 'report.passed>0' in verification and 'report.failed,0' in verification
        assert 'report.skipped??0,0' in verification and 'report.sourceFiles' in verification
        assert 'createHash' in verification and 'source.sha256' in verification
        for report in SOURCE_REPORTS:
            assert "'" + report + "'" in verification
        collect = next(step for step in run_steps if step.get('if') == 'always()')
        assert 'if [[ -f qa-fidelity-r33-ci/fresh-tests-started ]]' in collect['run']
        assert 'integration-started && -f docs/R33_INTEGRATION_TESTS.json' in collect['run']

    check('Eleven source reports are invalidated, recreated and checked against current source SHA values', fresh_source_reports)

    def current_browsers():
        browser = workflows[new_workflow_name]['jobs']['browser']
        assert browser['env']['AXE_CORE_PATH'] == '${{ github.workspace }}/node_modules/axe-core/axe.min.js'
        matrix = browser['strategy']['matrix']['include']
        assert len(matrix) == 6 and [row['script'] for row in matrix] == BROWSER_SCRIPTS
        assert len({row['script'] for row in matrix}) == 6
        code = '\n'.join(step.get('run', '') for step in browser['steps'])
        for pin in ['playwright@1.64.1', '@napi-rs/canvas@0.1.80', '@puppeteer/browsers@2.10.10', 'axe-core@4.14.0',
                    "buildId:'154.0.8037.57'"]:
            assert pin in code, pin
        assert code.index('rm -f') < code.index("node '${{ matrix.script }}'")
        assert 'source.sha256' in code and 'report.skipped??0,0' in code
        assert 'if [[ -f qa-fidelity-r33-browser/started ]]' in code
        artifact = next(step for step in browser['steps'] if step.get('uses', '').startswith('actions/upload-artifact@'))
        assert artifact['with']['path'].strip() == 'qa-*r33*/', 'Tracked reports must not be uploaded after setup failure'

    check('Six current browser recipes use pinned tools and upload only reports from started test stages', current_browsers)

    def inherited_tests():
        package = json.loads((ROOT / 'package.json').read_bytes())
        published = json.loads(subprocess.check_output(['git', 'show', BASE_COMMIT + ':package.json'], cwd=ROOT))
        assert package['scripts']['verify:r32:http'] == published['scripts']['verify:r32:http']
        assert len(package['scripts']['verify:r32:http'].split(' && ')) == 9
        assert package['scripts']['verify:historical:r31'] == published['scripts']['verify:historical:r31']
        commands = package['scripts']['verify:current'].split(' && ')[2:]
        assert commands == published['scripts']['verify:current'].split(' && ')[2:]
        assert len(commands) == 39, '38 original current commands plus R32 input assertions'
        assert package['scripts']['verify'] == published['scripts']['verify']
        r32 = workflows['.github/workflows/gamedev-r32.yml']['jobs']['current']
        assert any(step.get('run') == 'npm run verify:r32:http' for step in r32['steps'])
        r31 = workflows['.github/workflows/source-fidelity-r31.yml']
        for name, job in r31['jobs'].items():
            checkout = next(step for step in job['steps'] if step.get('uses', '').startswith('actions/checkout@'))
            assert checkout['with']['ref'] == ('${{ github.sha }}' if name == 'browser' else R31_COMMIT)
        assert len(r31['jobs']['browser']['strategy']['matrix']['include']) == 7
        for number in [25, 26]:
            job = workflows[f'.github/workflows/source-fidelity-r{number}.yml']['jobs']['provenance']
            commands = '\n'.join(step.get('run', '') for step in job['steps'])
            assert 'run-published-release-r29.py --commit ' + R31_COMMIT in commands
            assert 'node scripts/verify-current-r33.mjs' in commands

    check('All inherited functional recipes remain current while only original frozen preservation assertions use published R31', inherited_tests)

    for name in ['package.json', 'scripts/verify-current-r33.mjs', 'tests/verify-current-guard-r33.mjs',
                 'scripts/validate-fidelity-ci-r33.py']:
        inputs.append({'path': name, 'sha256': sha((ROOT / name).read_bytes())})
    report = {
        'schema': 're.bow.ci-validation-r33/1', 'baseline': BASE_COMMIT,
        'passed': sum(item['pass'] for item in checks), 'failed': sum(not item['pass'] for item in checks),
        'skipped': 0, 'counts': counts, 'checks': checks, 'sourceFiles': inputs,
        'scope': 'Executed local definition parsing and command compilation. No remote R33 result or gameplay result is inferred.',
    }
    (ROOT / 'docs/R33_CI_VALIDATION.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps({key: report[key] for key in ['passed', 'failed', 'counts']}))
    return int(bool(report['failed']))


if __name__ == '__main__':
    raise SystemExit(run())
