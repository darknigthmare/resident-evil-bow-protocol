#!/usr/bin/env python3
"""Execute the exact current npm verification in an isolated overlay checkpoint."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
BASE_COMMIT = 'adb733b9faf10a041c0b4ef5aa115f43ec67dd34'
R31_COMMIT = '413b89bfafc18abc55be1404ff77bdaf573b1334'
NODE = Path('/workspace/.tools/node-v22.16.0-linux-x64/bin/node')
MODIFIED = {
    '.github/workflows/source-fidelity-r25.yml', '.github/workflows/source-fidelity-r26.yml',
    'modules/versus.html', 'catalog-duel.html', 'codex.html', 'saves.html', 'package.json',
}


def stamp():
    return datetime.now(timezone.utc).isoformat()


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def git(*args, root=ROOT):
    return subprocess.check_output(['git', *args], cwd=root)


def record(root, name):
    raw = (root / name).read_bytes()
    return {'path': name, 'bytes': len(raw), 'sha256': sha(raw)}


def paths(root=ROOT):
    tracked = git('ls-files', '-z', root=root).decode().split('\0')
    added = git('ls-files', '--others', '--exclude-standard', '-z', root=root).decode().split('\0')
    return sorted(set(filter(None, tracked + added)))


def source_input(name):
    path = Path(name)
    if path.suffix in {'.js', '.mjs', '.cjs', '.py', '.html'}:
        return True
    if name == 'package.json' or name == 'tests/r32-historical-plan.json':
        return True
    if name.startswith('.github/workflows/') and path.suffix in {'.yml', '.yaml'}:
        return True
    if name.startswith(('data/', 'src/', 'assets/')) and path.suffix == '.json':
        return True
    if name.startswith('modules/') and path.suffix == '.json':
        # Closing task/export proofs may still be written by another agent.
        # Their bytes are copied into the checkpoint, but are not presented as
        # functional runtime inputs or compared with a later tracking export.
        return path.name not in {'progress.json', 'dossier-additions.json', 'delivery.json', 'source-additions.json'} and \
            not name.startswith(('modules/fidelity-r33/tracking/', 'modules/fidelity-r33/validation/'))
    return False


def inventory(root=ROOT, selected=None):
    return [record(root, name) for name in (selected if selected is not None else paths(root))
            if source_input(name)]


def check_rows(rows, root):
    changed = []
    for expected in rows:
        path = root / expected['path']
        if not path.is_file() or record(root, expected['path']) != expected:
            changed.append(expected['path'])
    return changed


def prepare():
    if git('rev-parse', 'HEAD').decode().strip() != BASE_COMMIT:
        raise ValueError('Prepare from the explicitly reviewed R32 checkpoint')
    values = git('diff', '--name-status', '--no-renames', '-z', BASE_COMMIT, '--').decode().split('\0')
    values = list(filter(None, values))
    delta = [{'status': values[index], 'path': values[index + 1]} for index in range(0, len(values), 2)]
    changed = [item for item in delta if item['status'] == 'M']
    if any(item['status'] not in {'M', 'A'} for item in delta) or {item['path'] for item in changed} != MODIFIED:
        raise ValueError('The inherited delta is not exactly the seven reviewed R33 integration files')
    all_paths = paths()
    before = inventory(selected=all_paths)
    output = Path(tempfile.mkdtemp(prefix='r33-current-verify-', dir='/workspace/scratch'))
    snapshot = output / 'checkout'
    cloning = subprocess.run(['git', 'clone', '--shared', '--no-checkout', str(ROOT), str(snapshot)],
                             text=True, capture_output=True)
    (output / 'clone.log').write_text(cloning.stdout + cloning.stderr)
    if cloning.returncode:
        raise RuntimeError('Isolated clone failed; see ' + str(output / 'clone.log'))
    checkout = subprocess.run(['git', 'checkout', '--detach', BASE_COMMIT], cwd=snapshot,
                              text=True, capture_output=True)
    (output / 'checkout.log').write_text(checkout.stdout + checkout.stderr)
    if checkout.returncode:
        raise RuntimeError('Published checkpoint checkout failed')
    additions = git('ls-files', '--others', '--exclude-standard', '-z').decode().split('\0')
    overlay = sorted({item['path'] for item in delta} | set(filter(None, additions)))
    overlay_rows = []
    for name in overlay:
        source = ROOT / name
        if source.is_symlink() or not source.is_file():
            raise ValueError('Overlay sources must be regular files: ' + name)
        target = snapshot / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        overlay_rows.append(record(snapshot, name))
    if not (ROOT / 'node_modules').is_dir():
        raise ValueError('Use the existing pinned tools; no installation is performed here')
    (snapshot / 'node_modules').symlink_to(ROOT / 'node_modules', target_is_directory=True)
    if check_rows(before, ROOT) or check_rows(before, snapshot):
        raise ValueError('A functional source changed while creating the checkpoint')
    source_rows = inventory(root=snapshot, selected=all_paths)
    package = json.loads((snapshot / 'package.json').read_bytes())
    current = package['scripts']['verify:current'].split(' && ')
    if len(current) != 41:
        raise ValueError('Expected two current guards,38 original functional commands and R32 input assertions')
    if package['scripts']['verify'] != 'npm run verify:current && npm run verify:historical:r31':
        raise ValueError('The exact current/published command split changed')
    checkpoint = {
        'schema': 're.bow.isolated-current-checkpoint-r33/1', 'preparedAt': stamp(),
        'parent': str(ROOT), 'snapshot': str(snapshot), 'base': BASE_COMMIT,
        'modified': changed, 'overlay': overlay_rows, 'sourceInputs': source_rows,
        'node': str(NODE), 'command': ['npm', 'run', 'verify'],
        'verifyCurrent': current, 'historicalCommand': package['scripts']['verify:historical:r31'],
        'verifyScript': package['scripts']['verify'],
        'nodeModulesOnlySymlink': True,
        'scope': 'Isolated current-code checkpoint; copied tracking outputs do not certify their later final export.',
    }
    target = output / 'checkpoint.json'
    target.write_text(json.dumps(checkpoint, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps({'checkpoint': str(target), 'base': BASE_COMMIT, 'modified': len(changed),
                      'overlayFiles': len(overlay_rows), 'sourceInputs': len(source_rows),
                      'sourceInventorySha256': sha(json.dumps(source_rows, sort_keys=True).encode()),
                      'currentCommands': len(current), 'runtimeFilesMatchedParent': True}), flush=True)


def execute(name):
    checkpoint_path = Path(name).resolve()
    if not checkpoint_path.is_relative_to(Path('/workspace/scratch')):
        raise ValueError('Only a prepared scratch checkpoint may execute')
    checkpoint = json.loads(checkpoint_path.read_bytes())
    if checkpoint.get('schema') != 're.bow.isolated-current-checkpoint-r33/1' or checkpoint['parent'] != str(ROOT):
        raise ValueError('This runner does not own the supplied checkpoint')
    snapshot = Path(checkpoint['snapshot'])
    if snapshot.parent != checkpoint_path.parent or not (snapshot / '.git').is_dir():
        raise ValueError('The prepared isolated Git checkout is missing')
    if check_rows(checkpoint['sourceInputs'], ROOT) or check_rows(checkpoint['sourceInputs'], snapshot):
        raise ValueError('Source fingerprints changed after preparation; prepare a new checkpoint')
    environment = dict(os.environ)
    environment['PATH'] = str(NODE.parent) + os.pathsep + environment.get('PATH', '')
    environment['npm_config_cache'] = '/workspace/.cache/npm'
    node_version = subprocess.check_output([str(NODE), '--version'], env=environment, text=True).strip()
    if node_version != 'v22.16.0':
        raise ValueError('The pinned Node version is required')
    npm = NODE.parent / 'npm'
    started = stamp()
    started_clock = time.monotonic()
    log = snapshot.parent / 'npm-verify.log'
    with log.open('wb') as stream:
        completed = subprocess.run([str(npm), 'run', 'verify'], cwd=snapshot, env=environment,
                                   stdout=stream, stderr=subprocess.STDOUT)
    raw = log.read_bytes()
    (ROOT / 'docs/R33_CURRENT_TESTS.log').write_bytes(raw)
    parent_differences = check_rows(checkpoint['sourceInputs'], ROOT)
    executed_differences = check_rows(checkpoint['sourceInputs'], snapshot)
    # Original verification may compile source deterministically, but no code
    # difference is silently reclassified as a report-only mutation.
    published_path = snapshot / 'qa-gamedev-r32/historical-r31/report.json'
    published = json.loads(published_path.read_bytes()) if published_path.is_file() else None
    original_plan = json.loads((snapshot / 'tests/r32-historical-plan.json').read_bytes())
    if completed.returncode == 0:
        assert published and published['published_commit'] == R31_COMMIT and published['exit_code'] == 0
        assert [row['command'] for row in published['executions']] == original_plan['commands']
        assert all(row['exit_code'] == 0 for row in published['executions'])
    guards_path = snapshot / 'qa-fidelity-r33-ci/current-guard.json'
    guards = json.loads(guards_path.read_bytes()) if guards_path.is_file() else None
    historical_rows = []
    if published:
        for execution in published['executions']:
            row = dict(execution)
            source = execution['command'][1]
            row['source'] = {'path': source, 'sha256': sha(git('show', R31_COMMIT + ':' + source)),
                             'publishedCommit': R31_COMMIT}
            historical_rows.append(row)
    source_rows = checkpoint['sourceInputs']
    current_rows = []
    for index, command in enumerate(checkpoint['verifyCurrent']):
        argv = command.split(' ')
        source = argv[1]
        current_rows.append({'command': command,
                             'role': 'source-guard' if index == 0 else 'guard-fault-injections' if index == 1 else
                             'current-r32-input' if source == 'tests/verify-input-r32.mjs' else 'original-current-functional',
                             'exitCode': 0 if completed.returncode == 0 else None,
                             'exitEvidence': 'All41 commands are joined by && in the unchanged executed npm pipeline' if completed.returncode == 0 else 'See exact execution log; commands after failure are not asserted executed',
                             'source': record(snapshot, source)})
    evidence_folder = ROOT / 'docs/R33_CURRENT_TESTS_EVIDENCE'
    evidence_folder.mkdir(parents=True, exist_ok=True)
    captured = []
    for folder in [snapshot / 'qa-fidelity-r33-ci', snapshot / 'qa-gamedev-r32']:
        if not folder.is_dir():
            continue
        for source in sorted(folder.rglob('*')):
            if source.is_file() and source.suffix in {'.json', '.log'}:
                relative = source.relative_to(snapshot)
                target = evidence_folder / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(source.read_bytes())
                captured.append(record(ROOT, target.relative_to(ROOT).as_posix()))
    source_report = {'schema': 're.bow.current-tests-r33/1', 'startedAt': started, 'finishedAt': stamp(),
        'durationSeconds': round(time.monotonic() - started_clock, 3),
        'baseline': BASE_COMMIT, 'isolatedCurrentCheckout': True, 'sourceSymlinks': False,
        'nodeModulesOnlySymlink': True, 'nodeVersion': node_version,
        'command': ['npm', 'run', 'verify'], 'executedNpmScript': checkpoint['verifyScript'],
        'exitCode': completed.returncode, 'passed': int(completed.returncode == 0 and not parent_differences and not executed_differences),
        'failed': int(completed.returncode != 0 or bool(parent_differences) or bool(executed_differences)),
        'originalCurrentFunctionalCommands': 38, 'currentR32InputCommands': 1,
        'currentGuardCommands': 2, 'currentCommands': current_rows,
        'guardNewPassed': guards.get('passed') if guards else None,
        'guardInheritedPassed': guards.get('historicalPassed') if guards else None,
        'publishedR31Commit': R31_COMMIT, 'publishedPreservationCommands': historical_rows,
        'sourceInputs': source_rows, 'sourceInventorySha256': sha(json.dumps(source_rows, sort_keys=True).encode()),
        'executedSourceDifferencesAfterRun': executed_differences,
        'parentSourceDifferencesAfterRun': parent_differences,
        'parentFrozenCheckpointUnchanged': not parent_differences,
        'executedFrozenCheckpointUnchanged': not executed_differences,
        'log': record(ROOT, 'docs/R33_CURRENT_TESTS.log'), 'executionEvidence': captured,
        'sourceFiles': [record(ROOT, 'scripts/run-current-isolated-r33.py')],
        'scope': 'One actually executed original npm verification pipeline on an isolated copy of current R33 sources.38 original functional commands and R32 input assertions remain current; only the two original preservation commands use exact published R31. The source inventory describes copied verified inputs, not a claim that every file was evaluated. Current code tests are not605 new R33 assertions or a global artistic certification.',
    }
    (ROOT / 'docs/R33_CURRENT_TESTS.json').write_text(json.dumps(source_report, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps({'exitCode': completed.returncode, 'passed': source_report['passed'], 'failed': source_report['failed'],
        'sourceInputs': len(source_rows), 'parentSourceDifferences': len(parent_differences),
        'executedSourceDifferences': len(executed_differences), 'logBytes': len(raw),
        'guardNewPassed': source_report['guardNewPassed'], 'guardInheritedPassed': source_report['guardInheritedPassed'],
        'publishedCommands': len(historical_rows), 'evidenceFiles': len(captured)}), flush=True)
    raise SystemExit(int(source_report['failed']))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--prepare', action='store_true')
    group.add_argument('--run', metavar='CHECKPOINT')
    arguments = parser.parse_args()
    prepare() if arguments.prepare else execute(arguments.run)
