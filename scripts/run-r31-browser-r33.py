#!/usr/bin/env python3
"""Execute unchanged R31 browsers on the current checkout and restore old reports."""
import concurrent.futures
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import threading

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'qa-r33-r31-current'
NODE = os.environ.get('BOW_R33_NODE', '/workspace/.tools/node-v22.16.0-linux-x64/bin/node')
BASELINE = 'adb733b9faf10a041c0b4ef5aa115f43ec67dd34'
SUITES = (
    ('sprites', 'tests/browser-generated-sprites-r31.mjs', ('docs/R31_SPRITES_BROWSER.json',)),
    ('motion-commands', 'tests/browser-motion-commands-r31.mjs', ('docs/R31_MOTION_BROWSER.json',)),
    ('canonical', 'tests/browser-canonical-r31.mjs', ('docs/R31_CANONICAL_BROWSER.json',)),
    ('restore-replays', 'tests/browser-persistence-r31.mjs', ('docs/R31_PERSISTENCE_BROWSER.json',)),
    ('audio', 'tests/browser-audio-r31.mjs', ('docs/R31_AUDIO_BROWSER.json',)),
    ('performance-access', 'tests/browser-performance-access-r31.mjs', ('docs/R31_PERFORMANCE_ACCESS_BROWSER.json',)),
    ('tracking-dossiers', 'tests/browser-fidelity-r31.mjs', ('docs/R31_DASHBOARD_BROWSER.json', 'docs/R31_DOSSIER_BROWSER.json')),
)
LOCK = threading.Lock()


def stamp():
    return datetime.now(timezone.utc).isoformat()


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def record(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': sha(raw)}


def unchanged_script(name):
    published = subprocess.check_output(['git', 'show', BASELINE + ':' + name], cwd=ROOT)
    if (ROOT / name).read_bytes() != published:
        raise ValueError('Existing R31 browser assertions were changed: ' + name)


def execute(spec):
    name, script, reports = spec
    unchanged_script(script)
    folder = OUTPUT / name
    folder.mkdir(parents=True, exist_ok=True)
    backups = {report: (ROOT / report).read_bytes() for report in reports}
    started = stamp()
    command = [NODE, script]
    env = dict(os.environ)
    env.update(CHROME_BIN='/usr/bin/chromium', AXE_CORE_PATH='/workspace/.cache/bow-r24-access-tools/node_modules/axe-core/axe.min.js')
    exit_code, execution_error, collected = None, None, []
    log_path = folder / 'execution.log'
    try:
        for report in reports:
            (ROOT / report).unlink()
        with log_path.open('w') as log:
            try:
                process = subprocess.run(command, cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=1000, check=False)
                exit_code = process.returncode
            except Exception as error:
                execution_error = repr(error)
        for report in reports:
            path = ROOT / report
            if not path.is_file():
                collected.append({'originalPath': report, 'fresh': False, 'passed': 0, 'failed': 1, 'error': 'Execution did not create the required report'})
                continue
            raw = path.read_bytes()
            target = folder / path.name
            target.write_bytes(raw)
            value = json.loads(raw)
            inputs = value.get('sourceFiles', value.get('inputs', []))
            stale = [item['path'] for item in inputs if item.get('sha256') and sha((ROOT / item['path']).read_bytes()) != item['sha256']]
            collected.append({'originalPath': report, 'executionReport': record(target), 'fresh': True,
                              'passed': value.get('passed', 0), 'failed': value.get('failed', 0), 'sourceCurrent': not stale,
                              'staleSources': stale, 'sourceFiles': inputs})
    finally:
        for report, raw in backups.items():
            (ROOT / report).write_bytes(raw)
        for report, raw in backups.items():
            if (ROOT / report).read_bytes() != raw:
                raise ValueError('Historical report restoration failed: ' + report)
        unchanged_script(script)
    row = {'name': name, 'command': command, 'startedAt': started, 'finishedAt': stamp(), 'exitCode': exit_code,
           'executionError': execution_error, 'log': record(log_path), 'reports': collected,
           'historicalReportsRestored': [{'path': report, 'sha256': sha(raw), 'bytes': len(raw)} for report, raw in backups.items()],
           'passed': sum(item['passed'] for item in collected), 'failed': sum(item['failed'] for item in collected)}
    row['complete'] = exit_code == 0 and execution_error is None and all(item.get('fresh') and item.get('sourceCurrent') and item['passed'] > 0 and item['failed'] == 0 for item in collected)
    with LOCK:
        print(json.dumps({'suite': name, 'exitCode': exit_code, 'passed': row['passed'], 'failed': row['failed'], 'complete': row['complete']}), flush=True)
    (folder / 'execution.json').write_text(json.dumps(row, ensure_ascii=False, indent=2) + '\n')
    return row


def main():
    OUTPUT.mkdir(exist_ok=True)
    started = stamp()
    original = {report: (ROOT / report).read_bytes() for _, _, reports in SUITES for report in reports}
    backup_folder = Path('/workspace/scratch/r33-r31-browser-original-reports')
    backup_folder.mkdir(exist_ok=True)
    for report, raw in original.items():
        (backup_folder / Path(report).name).write_bytes(raw)
    rows = []
    try:
        # The tracking suite follows every proof route. Run it only after all other
        # historical reports have been restored; never expose another suite's temporary report.
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            futures = {executor.submit(execute, spec): spec for spec in SUITES[:-1]}
            for future in concurrent.futures.as_completed(futures):
                rows.append(future.result())
        rows.append(execute(SUITES[-1]))
    finally:
        for report, raw in original.items():
            (ROOT / report).write_bytes(raw)
    for report, raw in original.items():
        if (ROOT / report).read_bytes() != raw:
            raise ValueError('Historical output was not restored exactly: ' + report)
    rows.sort(key=lambda row: next(index for index, spec in enumerate(SUITES) if spec[0] == row['name']))
    sources = {'scripts/run-r31-browser-r33.py', '.github/workflows/source-fidelity-r31.yml', 'modules/versus.html',
               'catalog-duel.html', 'codex.html', 'saves.html', 'modules/fidelity-r33/evolutions/index.html',
               'modules/fidelity-r33/combat/generated-runtime.js', 'modules/fidelity-r33/combat/native-runtime.js',
               'modules/fidelity-r33/combat/native-adapter.js', 'modules/fidelity-r33/selection/avatars.js'}
    for row in rows:
        for report in row['reports']:
            sources.update(item['path'] for item in report.get('sourceFiles', []))
    result = {'schema': 're.bow.current-r31-browser-r33/1', 'release': 'R33', 'startedAt': started, 'finishedAt': stamp(),
              'checkoutBase': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
              'currentSource': True, 'originalAssertionsUnchanged': True, 'complete': all(row['complete'] for row in rows),
              'passed': sum(row['passed'] for row in rows), 'failed': sum(row['failed'] for row in rows),
              'executedSuites': len(rows), 'successfulSuites': sum(row['complete'] for row in rows),
              'checks': rows, 'sourceFiles': [record(ROOT / name) for name in sorted(sources)],
              'historicalReportsRestored': [record(ROOT / name) for name in sorted(original)],
              'scope': 'The seven unchanged R31 browser suites were actually executed on the current R33 checkout, using real current HTML and active mounts. Fresh results and logs are separate from the byte-restored historical reports. No archive simulation, assertion removal, fabricated old-report reuse, data rebuild or global fidelity certification.'}
    (ROOT / 'docs/R33_R31_BROWSER.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'passed': result['passed'], 'failed': result['failed'], 'successfulSuites': result['successfulSuites'], 'complete': result['complete']}), flush=True)
    raise SystemExit(0 if result['complete'] else 1)


if __name__ == '__main__':
    main()
