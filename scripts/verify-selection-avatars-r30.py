#!/usr/bin/env python3
"""Run the real avatar provenance tests and bind their report to current inputs."""
import datetime
import hashlib
import json
import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class RecordedResult(unittest.TextTestResult):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.checks = []

    def addSuccess(self, test):
        super().addSuccess(test)
        self.checks.append({'name': test.id(), 'pass': True})

    def addFailure(self, test, error):
        super().addFailure(test, error)
        self.checks.append({'name': test.id(), 'pass': False, 'error': self._exc_info_to_string(error, test)})

    def addError(self, test, error):
        super().addError(test, error)
        self.checks.append({'name': test.id(), 'pass': False, 'error': self._exc_info_to_string(error, test)})


def main():
    os.chdir(ROOT)
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    suite = unittest.defaultTestLoader.discover(str(ROOT / 'tests'), pattern='test_selection_avatars_r30.py')
    result = unittest.TextTestRunner(verbosity=2, resultclass=RecordedResult).run(suite)
    manifest = json.loads((ROOT / 'modules/fidelity-r30/selection/manifest.json').read_text())
    paths = {row['path'] for row in manifest['inputs']}
    paths.update(('scripts/build-selection-avatars-r30.py', 'scripts/verify-selection-avatars-r30.py',
                  'tests/test_selection_avatars_r30.py', 'modules/fidelity-r30/selection/manifest.json',
                  'modules/fidelity-r30/selection/avatars.js', 'modules/fidelity-r30/selection/avatars.css'))
    report = {'schema': 're.bow.selection-avatars-tests-r30/1', 'startedAt': started,
              'finishedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'scope': 'Actual retained portrait and source-model byte provenance, exact-UID partition and reproduction. Source reference portraits do not certify raw game asset authenticity, hidden anatomy or animation.',
              'testsRun': result.testsRun, 'passed': sum(row['pass'] for row in result.checks),
              'failed': len(result.failures) + len(result.errors), 'checks': result.checks,
              'counts': manifest['counts'],
              'inputs': [{'path': path, 'sha256': hashlib.sha256((ROOT / path).read_bytes()).hexdigest()}
                         for path in sorted(paths)]}
    (ROOT / 'docs/R30_AVATARS_TESTS.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    return 0 if result.wasSuccessful() else 1


if __name__ == '__main__':
    sys.exit(main())
