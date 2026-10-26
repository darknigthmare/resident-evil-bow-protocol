#!/usr/bin/env python3
"""Run unchanged historical assertions in their exact published Git snapshot."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT).decode().strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--commit', required=True)
    parser.add_argument('--evidence', required=True, help='Ignored QA directory inside the calling checkout')
    parser.add_argument('--plan', help='Local JSON plan of unchanged published assertion commands')
    parser.add_argument('command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    if not re.fullmatch(r'[a-f0-9]{40}', args.commit):
        raise ValueError('A full published commit SHA is required')
    if git('rev-parse', '--verify', args.commit + '^{commit}') != args.commit:
        raise ValueError('Published commit does not resolve exactly')
    command = args.command[1:] if args.command[:1] == ['--'] else args.command
    if bool(command) == bool(args.plan):
        raise ValueError('Choose an explicit assertion command or one local plan')
    prepare, plan_record = [], None
    if args.plan:
        plan_path = (ROOT / args.plan).resolve()
        if not plan_path.is_relative_to(ROOT):
            raise ValueError('Assertion plan must stay in the calling checkout')
        raw = plan_path.read_bytes()
        plan = json.loads(raw)
        if plan.get('schema') != 're.bow.published-check-plan-r29/1' or not plan.get('commands'):
            raise ValueError('Missing nonempty published assertion plan')
        commands = plan['commands']
        prepare = plan.get('directories', [])
        plan_record = {'path': args.plan, 'sha256': hashlib.sha256(raw).hexdigest()}
    else:
        commands = [command]
    for value in commands:
        if not isinstance(value, list) or not value or any(not isinstance(item, str) for item in value):
            raise ValueError('An assertion command must be a nonempty argv list')
    commands = [[sys.executable if item == '{python}' else item for item in value] for value in commands]
    evidence = (ROOT / args.evidence).resolve()
    if not evidence.is_relative_to(ROOT) or not evidence.relative_to(ROOT).parts[0].startswith('qa-'):
        raise ValueError('Evidence must stay in an ignored local QA directory')
    evidence.mkdir(parents=True, exist_ok=True)
    objects = git('rev-parse', '--path-format=absolute', '--git-path', 'objects')
    started = time.monotonic()
    with tempfile.TemporaryDirectory(prefix='bow-published-r29-', dir=os.environ.get('RUNNER_TEMP')) as name:
        snapshot = Path(name)
        archive = subprocess.Popen(['git', 'archive', args.commit], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        extraction = subprocess.run(['tar', '--no-same-owner', '-xf', '-', '-C', str(snapshot)],
                                    stdin=archive.stdout, capture_output=True)
        archive.stdout.close()
        archive_error = archive.stderr.read()
        archive_code = archive.wait()
        if archive_code or extraction.returncode:
            raise RuntimeError('Published archive extraction failed: ' + (archive_error + extraction.stderr).decode(errors='replace'))
        subprocess.run(['git', 'init', '--quiet', str(snapshot)], check=True, capture_output=True)
        (snapshot / '.git/objects/info/alternates').write_text(objects + '\n')
        for operation in (['update-ref', 'HEAD', args.commit], ['read-tree', args.commit]):
            subprocess.run(['git', '-C', str(snapshot), *operation], check=True, capture_output=True)
        if (ROOT / 'node_modules').is_dir():
            (snapshot / 'node_modules').symlink_to(ROOT / 'node_modules', target_is_directory=True)
        for directory in prepare:
            folder = (snapshot / directory).resolve()
            if not folder.is_relative_to(snapshot):
                raise ValueError('Prepared directory escapes the published snapshot')
            folder.mkdir(parents=True, exist_ok=True)
        executions, logs, exit_code = [], [], 0
        for number, command in enumerate(commands):
            completed = subprocess.run(command, cwd=snapshot, text=True, capture_output=True)
            output = completed.stdout + completed.stderr
            log_name = f'command-{number:02d}.log'
            (evidence / log_name).write_text(output)
            logs.append(output)
            parsed = None
            for line in reversed(completed.stdout.splitlines()):
                try:
                    candidate = json.loads(line)
                except (json.JSONDecodeError, ValueError):
                    continue
                if isinstance(candidate, dict) and isinstance(candidate.get('passed'), int) and isinstance(candidate.get('failed'), int):
                    parsed = {'passed': candidate['passed'], 'failed': candidate['failed']}
                    break
            executions.append({'command': command, 'exit_code': completed.returncode,
                               'executed_assertions': parsed, 'log': log_name,
                               'log_sha256': hashlib.sha256(output.encode()).hexdigest()})
            print('PUBLISHED CHECK', number + 1, 'exit=' + str(completed.returncode), ' '.join(command[:2]), flush=True)
            if completed.returncode:
                print(output[-16000:], flush=True)
                exit_code = completed.returncode
                break
        output = ''.join(logs)
        (evidence / 'execution.log').write_text(output)
        report = {'schema': 're.bow.published-assertions-r29/1', 'published_commit': args.commit,
                  'plan': plan_record, 'executions': executions, 'exit_code': exit_code,
                  'duration_seconds': round(time.monotonic() - started, 3),
                  'log_sha256': hashlib.sha256(output.encode()).hexdigest(),
                  'runner_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                  'git_archive_with_original_head_and_index': True,
                  'historical_assertions_modified': False,
                  'calling_checkout_sources_modified': False,
                  'scope': 'The published release and its recorded source hashes; current release tests remain separate.'}
        (evidence / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report))
        return exit_code


if __name__ == '__main__':
    raise SystemExit(main())
