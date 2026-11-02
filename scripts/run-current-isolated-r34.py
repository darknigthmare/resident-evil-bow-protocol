#!/usr/bin/env python3
"""Execute the exact current npm verification in an isolated overlay checkpoint."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
BASE_COMMIT = '6c2d0d91f4dd79eff1190cd50a352feb2a05dfe5'
R31_COMMIT = '413b89bfafc18abc55be1404ff77bdaf573b1334'
NODE = Path('/workspace/.tools/node-v22.16.0-linux-x64/bin/node')


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
            not name.startswith(('modules/fidelity-r34/tracking/', 'modules/fidelity-r34/validation/'))
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


def checkpoint_commits(checkpoint_ref):
    parent = git('rev-parse', 'HEAD').decode().strip()
    if checkpoint_ref is None and parent != BASE_COMMIT:
        raise ValueError('A later parent needs an explicit full --checkpoint-ref; the default remains the reviewed R33 checkpoint')
    checkpoint = BASE_COMMIT if checkpoint_ref is None else checkpoint_ref
    if not re.fullmatch(r'[0-9a-f]{40}', checkpoint):
        raise ValueError('The checkpoint reference must be a full lowercase commit SHA')
    try:
        resolved = git('rev-parse', '--verify', checkpoint + '^{commit}').decode().strip()
        if resolved != checkpoint:
            raise ValueError('The checkpoint reference must name the exact commit object')
        git('merge-base', '--is-ancestor', BASE_COMMIT, checkpoint)
        git('merge-base', '--is-ancestor', checkpoint, parent)
    except subprocess.CalledProcessError as error:
        raise ValueError('The checkpoint must descend from the published R33 baseline and belong to HEAD history') from error
    return parent, checkpoint


def reviewed_boundary():
    # Use the same authoritative transformation checks as the npm pipeline,
    # including its evolving workflow list, without refreshing any report.
    script = """
import {BASE_COMMIT, REVIEWED_MODIFIED_PATHS, collectSnapshot, validateSnapshot} from './scripts/verify-current-r34.mjs';
const checked = validateSnapshot(collectSnapshot());
console.log(JSON.stringify({baseline: BASE_COMMIT, declared: REVIEWED_MODIFIED_PATHS, modified: checked.modified}));
"""
    result = json.loads(subprocess.check_output([str(NODE), '--input-type=module', '-e', script], cwd=ROOT))
    declared = result['declared']
    if (result['baseline'] != BASE_COMMIT or not isinstance(declared, list)
            or len(declared) != len(set(declared)) or set(result['modified']) != set(declared)):
        raise ValueError('The inherited delta must match the current guard declarations exactly')
    return set(declared)


def prepare(checkpoint_ref=None):
    parent_commit, checkpoint_commit = checkpoint_commits(checkpoint_ref)
    modified = reviewed_boundary()
    values = git('diff', '--name-status', '--no-renames', '-z', BASE_COMMIT, '--').decode().split('\0')
    values = list(filter(None, values))
    delta = [{'status': values[index], 'path': values[index + 1]} for index in range(0, len(values), 2)]
    changed = [item for item in delta if item['status'] == 'M']
    if any(item['status'] not in {'M', 'A'} for item in delta) or {item['path'] for item in changed} != modified:
        raise ValueError('The inherited delta is not exactly the current guard-reviewed R34 integration files')
    overlay_values = list(filter(None, git('diff', '--name-status', '--no-renames', '-z', checkpoint_commit, '--').decode().split('\0')))
    overlay_delta = [{'status': overlay_values[index], 'path': overlay_values[index + 1]}
                     for index in range(0, len(overlay_values), 2)]
    if any(item['status'] not in {'M', 'A'} for item in overlay_delta):
        raise ValueError('A checkpoint overlay cannot delete, rename or change the type of a source')
    all_paths = paths()
    before = inventory(selected=all_paths)
    output = Path(tempfile.mkdtemp(prefix='r34-current-verify-', dir='/workspace/scratch'))
    snapshot = output / 'checkout'
    cloning = subprocess.run(['git', 'clone', '--shared', '--no-checkout', str(ROOT), str(snapshot)],
                             text=True, capture_output=True)
    (output / 'clone.log').write_text(cloning.stdout + cloning.stderr)
    if cloning.returncode:
        raise RuntimeError('Isolated clone failed; see ' + str(output / 'clone.log'))
    checkout = subprocess.run(['git', 'checkout', '--detach', checkpoint_commit], cwd=snapshot,
                              text=True, capture_output=True)
    (output / 'checkout.log').write_text(checkout.stdout + checkout.stderr)
    if checkout.returncode:
        raise RuntimeError('Published checkpoint checkout failed')
    additions = git('ls-files', '--others', '--exclude-standard', '-z').decode().split('\0')
    overlay = sorted({item['path'] for item in overlay_delta} | set(filter(None, additions)))
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
    if git('rev-parse', 'HEAD').decode().strip() != parent_commit or check_rows(before, ROOT) or check_rows(before, snapshot):
        raise ValueError('A functional source changed while creating the checkpoint')
    source_rows = inventory(root=snapshot, selected=all_paths)
    package = json.loads((snapshot / 'package.json').read_bytes())
    current = package['scripts']['verify:current'].split(' && ')
    if len(current) != 41:
        raise ValueError('Expected two current guards,38 original functional commands and R32 input assertions')
    if package['scripts']['verify'] != 'npm run verify:current && npm run verify:historical:r31':
        raise ValueError('The exact current/published command split changed')
    checkpoint = {
        'schema': 're.bow.isolated-current-checkpoint-r34/1', 'preparedAt': stamp(),
        'parent': str(ROOT), 'snapshot': str(snapshot), 'base': BASE_COMMIT,
        'parentCommit': parent_commit, 'checkpointCommit': checkpoint_commit,
        'reviewedModifiedPaths': sorted(modified),
        'modified': changed, 'overlay': overlay_rows, 'sourceInputs': source_rows,
        'node': str(NODE), 'command': ['npm', 'run', 'verify'],
        'verifyCurrent': current, 'historicalCommand': package['scripts']['verify:historical:r31'],
        'verifyScript': package['scripts']['verify'],
        'nodeModulesOnlySymlink': True,
        'scope': 'Isolated current-code checkpoint; copied tracking outputs do not certify their later final export.',
    }
    target = output / 'checkpoint.json'
    target.write_text(json.dumps(checkpoint, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps({'checkpoint': str(target), 'base': BASE_COMMIT,
                      'parentCommit': parent_commit, 'checkpointCommit': checkpoint_commit, 'modified': len(changed),
                      'overlayFiles': len(overlay_rows), 'sourceInputs': len(source_rows),
                      'sourceInventorySha256': sha(json.dumps(source_rows, sort_keys=True).encode()),
                      'currentCommands': len(current), 'runtimeFilesMatchedParent': True}), flush=True)


def execute(name):
    checkpoint_path = Path(name).resolve()
    if not checkpoint_path.is_relative_to(Path('/workspace/scratch')):
        raise ValueError('Only a prepared scratch checkpoint may execute')
    checkpoint = json.loads(checkpoint_path.read_bytes())
    if checkpoint.get('schema') != 're.bow.isolated-current-checkpoint-r34/1' or checkpoint['parent'] != str(ROOT):
        raise ValueError('This runner does not own the supplied checkpoint')
    if checkpoint.get('base') != BASE_COMMIT:
        raise ValueError('The published R33 conservation baseline cannot change')
    snapshot = Path(checkpoint['snapshot'])
    if snapshot.parent != checkpoint_path.parent or not (snapshot / '.git').is_dir():
        raise ValueError('The prepared isolated Git checkout is missing')
    parent_commit = checkpoint.get('parentCommit', BASE_COMMIT)
    checkpoint_commit = checkpoint.get('checkpointCommit', BASE_COMMIT)
    if (git('rev-parse', 'HEAD').decode().strip() != parent_commit
            or git('rev-parse', 'HEAD', root=snapshot).decode().strip() != checkpoint_commit):
        raise ValueError('A prepared parent or isolated checkpoint commit changed')
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
    (ROOT / 'docs/R34_CURRENT_TESTS.log').write_bytes(raw)
    parent_differences = check_rows(checkpoint['sourceInputs'], ROOT)
    executed_differences = check_rows(checkpoint['sourceInputs'], snapshot)
    parent_commit_unchanged = git('rev-parse', 'HEAD').decode().strip() == parent_commit
    checkpoint_commit_unchanged = git('rev-parse', 'HEAD', root=snapshot).decode().strip() == checkpoint_commit
    # Original verification may compile source deterministically, but no code
    # difference is silently reclassified as a report-only mutation.
    published_path = snapshot / 'qa-gamedev-r32/historical-r31/report.json'
    published = json.loads(published_path.read_bytes()) if published_path.is_file() else None
    original_plan = json.loads((snapshot / 'tests/r32-historical-plan.json').read_bytes())
    if completed.returncode == 0:
        assert published and published['published_commit'] == R31_COMMIT and published['exit_code'] == 0
        assert [row['command'] for row in published['executions']] == original_plan['commands']
        assert all(row['exit_code'] == 0 for row in published['executions'])
    guards_path = snapshot / 'qa-fidelity-r34/current-guard.json'
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
    evidence_folder = ROOT / 'docs/R34_CURRENT_TESTS_EVIDENCE'
    evidence_folder.mkdir(parents=True, exist_ok=True)
    captured = []
    for folder in [snapshot / 'qa-fidelity-r34', snapshot / 'qa-fidelity-r34-ci', snapshot / 'qa-gamedev-r32']:
        if not folder.is_dir():
            continue
        for source in sorted(folder.rglob('*')):
            if source.is_file() and source.suffix in {'.json', '.log'}:
                relative = source.relative_to(snapshot)
                target = evidence_folder / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(source.read_bytes())
                captured.append(record(ROOT, target.relative_to(ROOT).as_posix()))
    source_report = {'schema': 're.bow.current-tests-r34/1', 'startedAt': started, 'finishedAt': stamp(),
        'durationSeconds': round(time.monotonic() - started_clock, 3),
        'baseline': BASE_COMMIT, 'parentCommit': parent_commit, 'checkpointCommit': checkpoint_commit,
        'parentCommitUnchanged': parent_commit_unchanged, 'checkpointCommitUnchanged': checkpoint_commit_unchanged,
        'isolatedCurrentCheckout': True, 'sourceSymlinks': False,
        'nodeModulesOnlySymlink': True, 'nodeVersion': node_version,
        'command': ['npm', 'run', 'verify'], 'executedNpmScript': checkpoint['verifyScript'],
        'exitCode': completed.returncode, 'passed': int(completed.returncode == 0 and not parent_differences and not executed_differences and parent_commit_unchanged and checkpoint_commit_unchanged),
        'failed': int(completed.returncode != 0 or bool(parent_differences) or bool(executed_differences) or not parent_commit_unchanged or not checkpoint_commit_unchanged),
        'originalCurrentFunctionalCommands': 38, 'currentR32InputCommands': 1,
        'currentGuardCommands': 2, 'currentCommands': current_rows,
        'guardNewPassed': guards.get('passed') if guards else None,
        'guardInheritedR33Passed': guards.get('inheritedR33Passed') if guards else None,
        'guardInheritedR32Passed': guards.get('inheritedR32Passed') if guards else None,
        'publishedR31Commit': R31_COMMIT, 'publishedPreservationCommands': historical_rows,
        'sourceInputs': source_rows, 'sourceInventorySha256': sha(json.dumps(source_rows, sort_keys=True).encode()),
        'executedSourceDifferencesAfterRun': executed_differences,
        'parentSourceDifferencesAfterRun': parent_differences,
        'parentFrozenCheckpointUnchanged': not parent_differences,
        'executedFrozenCheckpointUnchanged': not executed_differences,
        'log': record(ROOT, 'docs/R34_CURRENT_TESTS.log'), 'executionEvidence': captured,
        'sourceFiles': [record(ROOT, 'scripts/run-current-isolated-r34.py')],
        'scope': 'One actually executed original npm verification pipeline on an isolated copy of current R34 sources.38 original functional commands and R32 input assertions remain current; only the two original preservation commands use exact published R31. The source inventory describes copied verified inputs, not a claim that every file was evaluated. This does not certify the new R34 media or default browser flow, which have separate recipes, or global artistic fidelity.',
    }
    (ROOT / 'docs/R34_CURRENT_TESTS.json').write_text(json.dumps(source_report, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps({'exitCode': completed.returncode, 'passed': source_report['passed'], 'failed': source_report['failed'],
        'sourceInputs': len(source_rows), 'parentSourceDifferences': len(parent_differences),
        'executedSourceDifferences': len(executed_differences), 'logBytes': len(raw),
        'guardNewPassed': source_report['guardNewPassed'], 'guardInheritedR33Passed': source_report['guardInheritedR33Passed'],
        'guardInheritedR32Passed': source_report['guardInheritedR32Passed'],
        'publishedCommands': len(historical_rows), 'evidenceFiles': len(captured)}), flush=True)
    raise SystemExit(int(source_report['failed']))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--prepare', action='store_true')
    group.add_argument('--run', metavar='CHECKPOINT')
    parser.add_argument('--checkpoint-ref', metavar='FULL_SHA', help='Explicit ancestor commit to clone for preparation; published R33 remains the conservation baseline.')
    arguments = parser.parse_args()
    if arguments.checkpoint_ref is not None and not arguments.prepare:
        parser.error('--checkpoint-ref applies only to --prepare')
    prepare(arguments.checkpoint_ref) if arguments.prepare else execute(arguments.run)
