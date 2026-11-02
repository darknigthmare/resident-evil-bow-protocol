#!/usr/bin/env python3
"""Execute local workflow parsing and compilation; never infer a remote CI result."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

import yaml

ROOT = Path(__file__).resolve().parents[1]
SELF_BYTES = Path(__file__).read_bytes()
BASELINE = '6c2d0d91f4dd79eff1190cd50a352feb2a05dfe5'
R31 = '413b89bfafc18abc55be1404ff77bdaf573b1334'
FILES = ['.github/workflows/' + name for name in [
    'source-fidelity-r34.yml', 'source-fidelity-r33.yml', 'ci.yml', 'gamedev-r32.yml',
    'source-fidelity-r31.yml', 'source-fidelity-r25.yml', 'source-fidelity-r26.yml',
]]
SOURCE_REPORTS = ['CURRENT_GUARD_TESTS', 'ASSETS_TESTS', 'ROSTER_RUNTIME_TESTS']
BROWSERS = [
    ('tests/browser-selection-r34.mjs', 'docs/R34_SELECTION_BROWSER.json'),
    ('tests/browser-roster-assets-r34.mjs', 'docs/R34_ASSETS_BROWSER.json'),
    ('tests/browser-roster-runtime-r34.mjs', 'docs/R34_ROSTER_RUNTIME_BROWSER.json'),
]
SCRIPT = r'(?<![\w/])((?:scripts|tests)/[A-Za-z0-9_./-]+\.(?:py|mjs|cjs|js))(?![A-Za-z0-9_.-])'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def run():
    checks, workflows, source_inputs, historical_inputs, compiled = [], {}, {'scripts/validate-fidelity-ci-r34.py': SELF_BYTES}, {}, set()
    counts = {'workflows': 0, 'jobs': 0, 'bash_blocks': 0, 'python_blocks': 0,
              'javascript_blocks': 0, 'compiled_scripts': 0, 'current_script_bindings': 0,
              'historical_script_bindings': 0, 'r34_source_reports': 3, 'r34_browser_recipes': 3,
              'preserved_current_engine_commands': 38, 'preserved_input_assertions': 1,
              'unchanged_r32_compatibility_recipes': 9, 'unchanged_r33_compatibility_recipes': 6}

    def read(name, revision=None):
        if revision is None or revision == '${{ github.sha }}':
            raw = (ROOT / name).read_bytes()
            previous = source_inputs.setdefault(name, raw)
            assert previous == raw, 'A local input changed during validation: ' + name
        else:
            key = (revision, name)
            if key in historical_inputs:
                return historical_inputs[key]
            raw = subprocess.check_output(['git', 'show', revision + ':' + name], cwd=ROOT)
            historical_inputs[key] = raw
        return raw

    def check(name, action):
        try:
            detail = action()
            checks.append({'name': name, 'pass': True, 'detail': detail})
        except Exception as error:
            checks.append({'name': name, 'pass': False, 'error': str(error)})

    def checkout(job):
        steps = [step for step in job['steps'] if step.get('uses', '').startswith('actions/checkout@')]
        assert len(steps) == 1, 'Exactly one explicit checkout is required.'
        return steps[0].get('with', {})

    def commands(job):
        return '\n'.join(step.get('run', '') for step in job['steps'])

    def compile_process(command, code, label):
        result = subprocess.run(command, input=code, text=True, capture_output=True, cwd=ROOT)
        assert result.returncode == 0, label + ': ' + (result.stderr or result.stdout)

    def parse():
        for name in FILES:
            workflow = yaml.load(read(name), Loader=yaml.BaseLoader)
            assert {'push', 'pull_request', 'workflow_dispatch'} <= set(workflow['on']), name
            assert workflow['permissions'] == {'contents': 'read'}, name
            assert workflow['concurrency']['cancel-in-progress'] == 'true', name
            assert workflow.get('defaults', {}).get('run', {}).get('shell', 'bash') == 'bash', name
            assert isinstance(workflow['jobs'], dict) and workflow['jobs'], name
            for job in workflow['jobs'].values():
                assert 0 < int(job['timeout-minutes']) <= 40, name
                assert checkout(job).get('persist-credentials') == 'false', name
                for step in job['steps']:
                    if 'uses' in step:
                        assert re.fullmatch(r'[\w.-]+/[\w.-]+@[a-f0-9]{40}', step['uses']), step['uses']
                counts['jobs'] += 1
            workflows[name] = workflow
            counts['workflows'] += 1
        return {'parsed': len(workflows), 'allActionsPinned': True, 'contents': 'read', 'boundedTimeouts': True}

    check('Seven relevant workflow definitions parse with pinned actions, read-only permissions and bounded jobs', parse)

    def compile_script(name, revision):
        raw = read(name, revision)
        key = (revision, name, sha(raw))
        if key in compiled:
            return
        compiled.add(key)
        label = (revision or 'current') + ':' + name
        if name.endswith('.py'):
            compile(raw, label, 'exec')
        else:
            mode = 'commonjs' if name.endswith('.cjs') else 'module'
            compile_process(['node', '--input-type=' + mode, '--check'], raw.decode(), label)
        counts['compiled_scripts'] += 1

    def command_compilation():
        for name, workflow in workflows.items():
            for job_name, job in workflow['jobs'].items():
                ref = checkout(job).get('ref')
                if ref == '${{ github.sha }}':
                    ref = None
                assert ref is None or re.fullmatch(r'[a-f0-9]{40}', ref), str(ref)
                for row in job.get('strategy', {}).get('matrix', {}).get('include', []):
                    if 'script' in row:
                        compile_script(row['script'], ref)
                for step in job['steps']:
                    if 'run' not in step:
                        continue
                    original = step['run']
                    code = re.sub(r'\$\{\{.*?\}\}', 'fixture', original)
                    label = name + ':' + job_name + ':' + step.get('name', 'run')
                    compile_process(['bash', '-n'], code, label)
                    counts['bash_blocks'] += 1
                    # Referenced commands run at their actual checkout. Explicit archival
                    # wrappers and temporary worktrees have their own pinned source ref.
                    worktrees = re.findall(r'git worktree add[^\n]*\s([a-f0-9]{40})(?:\n|$)', original)
                    for line in original.splitlines():
                        archived = re.search(r'run-published-release-r29\.py --commit ([a-f0-9]{40}).*? -- ', line)
                        boundary = archived.end() if archived else None
                        for match in re.finditer(SCRIPT, line):
                            script_ref = ref
                            if archived and match.start() >= boundary:
                                script_ref = archived.group(1)
                            if re.search(r'\$[A-Z0-9_]+_TREE(?:/|[\"\'])', line[:match.start()]):
                                assert len(worktrees) == 1, label + ': ambiguous historical worktree'
                                script_ref = worktrees[0]
                            compile_script(match.group(1), script_ref)
                    for language, body in re.findall(r"<<'(PY|JS|NODE)'\n(.*?)\n\1(?:\n|$)", code, flags=re.S):
                        if language == 'PY':
                            compile(body, label + ':python', 'exec')
                            counts['python_blocks'] += 1
                        else:
                            compile_process(['node', '--input-type=module', '--check'], body, label + ':javascript')
                            counts['javascript_blocks'] += 1
        package = json.loads(read('package.json'))
        for key in ['verify', 'verify:current', 'verify:historical:r31', 'verify:r32', 'verify:r32:http', 'verify:r33:http', 'verify:r34', 'verify:r34:http', 'build']:
            assert package['scripts'][key], key
            for match in re.finditer(SCRIPT, package['scripts'][key]):
                compile_script(match.group(1), None)
        counts['current_script_bindings'] = sum(key[0] is None for key in compiled)
        counts['historical_script_bindings'] = len(compiled) - counts['current_script_bindings']
        return {'bashBlocks': counts['bash_blocks'], 'pythonHeredocs': counts['python_blocks'],
                'javascriptHeredocs': counts['javascript_blocks'], 'actualScriptsCompiled': len(compiled),
                'historicalPathsResolvedAtTheirPinnedRevision': True}

    check('Actual Bash, Python and JavaScript commands compile with delivered paths resolved at their execution revision', command_compilation)

    new = FILES[0]

    def current_source():
        workflow = workflows[new]
        assert set(workflow['jobs']) == {'source', 'browser'}
        for job in workflow['jobs'].values():
            assert checkout(job).get('ref', '${{ github.sha }}') == '${{ github.sha }}'
            assert checkout(job)['fetch-depth'] == '0'
            assert all(step.get('continue-on-error') not in ['true', True] for step in job['steps'])
        source = commands(workflow['jobs']['source'])
        preflight = ['node scripts/verify-current-r34.mjs', 'python3 scripts/build-roster-jobs-r34.py --check',
                     'python3 scripts/build-roster-assets-r34.py --check', 'python3 scripts/build-roster-runtime-r34.py --check',
                     'python3 scripts/build-selection-r34.py --check', 'python3 scripts/fidelity-progress-r34.py check',
                     'python3 scripts/fidelity-progress-r34.py reproduce', 'python3 scripts/audit-delivery-r34.py --check',
                     'node tests/verify-r34-integration.mjs']
        refresh = source.index('rm -f docs/R34_CURRENT_GUARD_TESTS.json')
        positions = [source.index(command) for command in preflight]
        assert positions == sorted(positions) and max(positions) < refresh
        assert source.index('node tests/verify-roster-runtime-r34.mjs') < source.index('npm run verify >') < source.index('npm run build >')
        assert source.index('npm run build >') < source.index('python3 scripts/verify-build-r34.py')
        assert '--commit' not in source and 'run-published-release-r29.py' not in source
        build_helper = read('scripts/verify-build-r34.py').decode()
        assert "'modules/fidelity-r34'" in build_helper and "'dist' / name" in build_helper
        assert 'read_bytes() == raw' in build_helper
        for name in ['scripts/verify-current-r34.mjs', 'scripts/build-roster-jobs-r34.py', 'scripts/build-roster-assets-r34.py',
                     'scripts/build-roster-runtime-r34.py', 'scripts/build-selection-r34.py', 'scripts/fidelity-progress-r34.py', 'tests/verify-r34-integration.mjs']:
            read(name)
        return {'submittedHead': True, 'deliveredChecksBeforeRefresh': len(preflight), 'currentEngineAssertions': True, 'currentBuildByteComparison': True}

    check('R34 source preflight protects delivered bindings before refresh and builds the submitted current tree', current_source)

    def fresh_sources():
        source = workflows[new]['jobs']['source']
        execute = next(step['run'] for step in source['steps'] if 'rm -f docs/R34_CURRENT_GUARD_TESTS.json' in step.get('run', ''))
        removed = re.findall(r'docs/(R34_[A-Z_]+\.json)', execute.split('node tests/verify-current-guard-r34.mjs')[0])
        assert removed == ['R34_' + name + '.json' for name in SOURCE_REPORTS]
        assert execute.index('touch qa-fidelity-r34-ci/tests-started') < execute.index('rm -f')
        for command in ['node tests/verify-current-guard-r34.mjs --report=docs/R34_CURRENT_GUARD_TESTS.json',
                        'python3 tests/test_roster_assets_r34.py', 'node tests/verify-roster-runtime-r34.mjs']:
            assert execute.index(command) > execute.index('rm -f')
        for name in SOURCE_REPORTS:
            assert "'" + name + "'" in execute
        for evidence in ['report.passed>0', 'report.failed,0', 'report.skipped??0,0', 'report.sourceFiles', "createHash('sha256')", 'source.sha256', "'qa-fidelity-r34-ci/'+name+'.json'"]:
            assert evidence in execute, evidence
        artifacts = [step for step in source['steps'] if step.get('uses', '').startswith('actions/upload-artifact@')]
        assert len(artifacts) == 1 and artifacts[0]['if'] == 'always()'
        paths = artifacts[0]['with']['path'].splitlines()
        assert paths and all(re.fullmatch(r'qa-[a-z0-9-]+/', value) for value in paths)
        assert not subprocess.check_output(['git', 'ls-files', '--', *paths], cwd=ROOT).strip(), 'Only ignored execution artifacts may be uploaded.'
        return {'freshReports': 3, 'successfulChecksRequired': True, 'zeroSkipsRequired': True, 'sourceSha256Checked': True, 'uploadedPaths': paths}

    check('Three new source reports are deleted, recreated and SHA-checked with zero failures/skips before QA-only collection', fresh_sources)

    def current_browsers():
        browser = workflows[new]['jobs']['browser']
        rows = browser['strategy']['matrix']['include']
        assert [(row['script'], row['report']) for row in rows] == BROWSERS
        assert len({row['suite'] for row in rows}) == 3
        code = commands(browser)
        for pin in ['playwright@1.64.1', '@napi-rs/canvas@0.1.80', '@puppeteer/browsers@2.10.10', 'axe-core@4.14.0', "buildId:'154.0.8037.57'"]:
            assert pin in code, pin
        assert 'CHROME_BIN=' in code and 'AXE_CORE_PATH=' in code
        assert code.index('touch qa-fidelity-r34-browser/started') < code.index('rm -f') < code.index("node '${{ matrix.script }}'")
        assert 'browser-compat-r34.mjs' not in code and '--preview' not in code
        for evidence in ['report.passed>0', 'report.failed,0', 'report.skipped??0,0', 'report.sourceFiles', 'source.sha256', "'qa-fidelity-r34-browser/report.json'"]:
            assert evidence in code, evidence
        artifact = next(step for step in browser['steps'] if step.get('uses', '').startswith('actions/upload-artifact@'))
        assert artifact['if'] == 'always()' and artifact['with']['path'] == 'qa-*r34*/'
        for script, _ in BROWSERS:
            raw = read(script).decode()
            assert not re.search(r"import\s+(?:[^\n]*from\s*)?['\"][^'\"]*browser-compat-r34", raw)
        return {'defaultPlayerRecipes': 3, 'compatibilityBootstrapUsed': False, 'toolsPinned': True, 'freshSourceBoundReports': True}

    check('Three R34 browser jobs exercise the default current views with pinned tools and fresh source-bound reports', current_browsers)

    def inherited():
        package = json.loads(read('package.json'))['scripts']
        previous = json.loads(read('package.json', BASELINE))['scripts']
        assert package['verify'] == previous['verify']
        assert package['verify:historical:r31'] == previous['verify:historical:r31']
        tail = package['verify:current'].split(' && ')[2:]
        assert tail == previous['verify:current'].split(' && ')[2:] and len(tail) == 39
        assert tail[-1] == 'node tests/verify-input-r32.mjs'
        assert package['verify:current'].split(' && ')[:2] == ['node scripts/verify-current-r34.mjs', 'node tests/verify-current-guard-r34.mjs']
        assert package['verify:r32'].endswith(' && node tests/verify-input-r32.mjs')
        wrapper = read('scripts/run-browser-compat-r34.mjs').decode()
        bootstrap = read('tests/browser-compat-r34.mjs').decode()
        assert "const baseline = '" + BASELINE + "'" in wrapper
        assert "execFileSync('git', ['show', baseline + ':package.json']" in wrapper
        assert "['--import=' + path.join(root, 'tests/browser-compat-r34.mjs'), command[1]]" in wrapper
        assert "original.split(' && ')" in wrapper
        assert "url.searchParams.set('dev', '1'); url.searchParams.set('selection', 'direct')" in bootstrap
        assert 'This isolates the former input/presentation contracts' in wrapper
        recipe_counts = {}
        for suite, expected in [('r32', 9), ('r33', 6)]:
            assert package['verify:' + suite + ':http'] == 'node scripts/run-browser-compat-r34.mjs --suite=' + suite
            original = previous['verify:' + suite + ':http'].split(' && ')
            assert len(original) == expected
            for command in original:
                assert re.fullmatch(r'node tests/[a-z0-9-]+\.mjs', command), command
                name = command.split(' ')[1]
                assert read(name) == read(name, BASELINE), 'An inherited browser assertion changed: ' + name
            recipe_counts[suite] = len(original)
        r32 = workflows['.github/workflows/gamedev-r32.yml']['jobs']['current']
        assert checkout(r32).get('ref', '${{ github.sha }}') == '${{ github.sha }}'
        assert any(step.get('run') == 'npm run verify:r32:http' for step in r32['steps'])
        r33 = workflows['.github/workflows/source-fidelity-r33.yml']['jobs']
        assert checkout(r33['source'])['ref'] == BASELINE
        assert 'Published R33' in r33['source']['name']
        assert checkout(r33['browser']).get('ref', '${{ github.sha }}') == '${{ github.sha }}'
        assert r33['browser']['needs'] == 'source'
        assert len(r33['browser']['strategy']['matrix']['include']) == 6
        assert "node --import=./tests/browser-compat-r34.mjs '${{ matrix.script }}'" in commands(r33['browser'])
        r31 = workflows['.github/workflows/source-fidelity-r31.yml']['jobs']
        for name, job in r31.items():
            assert checkout(job)['ref'] == ('${{ github.sha }}' if name == 'browser' else R31)
        assert len(r31['browser']['strategy']['matrix']['include']) == 7
        assert "node --import=./tests/browser-compat-r34.mjs '${{ matrix.script }}'" in commands(r31['browser'])
        for release in [25, 26]:
            code = commands(workflows[f'.github/workflows/source-fidelity-r{release}.yml']['jobs']['provenance'])
            assert 'node scripts/verify-current-r34.mjs' in code
            assert 'run-published-release-r29.py --commit ' + R31 in code
        return {'preservedCurrentEngineCommands': 38, 'preservedR32InputAssertion': True, 'unchangedBrowserRecipes': recipe_counts,
                'compatibilityPresentation': 'dev=1&selection=direct', 'publishedR33SourceRef': BASELINE,
                'publishedR31SourceAndBuildRef': R31, 'r31AndR33BrowserControllers': 'current submitted HEAD with explicit legacy presentation'}

    check('Original engine/input assertions remain current and unchanged legacy browser assertions use explicit published-derived compatibility', inherited)

    read('scripts/validate-fidelity-ci-r34.py')
    report = {'schema': 're.bow.ci-validation-r34/1', 'baseline': BASELINE,
              'passed': sum(item['pass'] for item in checks), 'failed': sum(not item['pass'] for item in checks), 'skipped': 0,
              'counts': counts, 'checks': checks,
              'sourceFiles': [{'path': name, 'bytes': len(raw), 'sha256': sha(raw)} for name, raw in sorted(source_inputs.items())],
              'historicalInputs': [{'ref': revision, 'path': name, 'bytes': len(raw), 'sha256': sha(raw)}
                                   for (revision, name), raw in sorted(historical_inputs.items())],
              'scope': 'Actually executed local parsing of seven CI definitions, Bash/Python/JavaScript compilation and execution-ref-aware source-path checks. Definition coverage and preserved recipe contracts are verified locally; no remote CI, gameplay, new media, original-animation or global1:1 result is inferred.'}
    (ROOT / 'docs/R34_CI_VALIDATION.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({key: report[key] for key in ['passed', 'failed', 'counts']}))
    return int(bool(report['failed']))


if __name__ == '__main__':
    raise SystemExit(run())
