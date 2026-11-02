"""Isolated export fault tests using the actual frozen 70-sheet R33 ZIP as history."""
import copy
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest

from openpyxl import Workbook, load_workbook

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('r34_export_test', ROOT / 'scripts/fidelity-progress-r34.py')
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)


class ExportTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory(prefix='r34-export-unit-')
        self.root = Path(self.folder.name)
        (self.root / 'docs').mkdir()
        shutil.copyfile(ROOT / module.BASELINE, self.root / module.BASELINE)
        tasks = json.loads((ROOT / module.PRIOR).read_text())['tasks']
        (self.root / module.PRIOR).write_text(json.dumps({'tasks': tasks}))
        jobs = json.loads((ROOT / 'modules/fidelity-r34/assets/jobs.json').read_text())['jobs']
        path = self.root / module.ASSETS; path.parent.mkdir(parents=True)
        path.write_text(json.dumps({'entries': [{'id': row['uid']} for row in jobs]}))
        self.value = {'schema': 're.bow.fidelity-tracking-r34/1', 'release': 'R34', 'projection': True,
                      'canonicalFidelityCertified': False, 'tasks': copy.deepcopy(tasks),
                      'inputs': [module.binding(name, self.root) for name in (module.BASELINE, module.PRIOR, module.ASSETS)],
                      'outputs': [{'uid': row['uid'], 'kind': kind, 'label': '=UNIT_FIXTURE_ONLY()',
                                   'newGenerated': False, 'admitted': False, 'status': 'PENDING'}
                                  for row in jobs for kind in ('portrait', 'idle')],
                      'objectives': [{'id': 'UNIT', 'title': '@UNIT_ONLY', 'status': 'OPEN', 'remaining': '-UNIT_ONLY'}],
                      'proofs': [{'uid': '', 'kind': 'fixture', 'nature': 'UNIT_ONLY', 'path': 'fixture-only', 'notes': '+UNIT_ONLY'}],
                      'validation': {'checks': [], 'pendingReports': ['UNIT_ONLY_NOT_AN_EXECUTED_RESULT']}}

    def tearDown(self):
        self.folder.cleanup()

    def test_actual_seventy_worksheets_relationships_and_ids_survive(self):
        output = self.root / 'docs/new.xlsx'
        baseline = module.binding(module.BASELINE, self.root)
        result = module.export(self.value, self.root, output)
        self.assertEqual(result['worksheets'], 74)
        self.assertEqual(module.binding(module.BASELINE, self.root), baseline)
        self.assertGreaterEqual(module.history_parts(self.root / module.BASELINE, output), 70)
        book = load_workbook(output, read_only=True)
        try:
            self.assertEqual(len(book.sheetnames), 74)
            self.assertEqual(book['Sorties R34'].max_row, 693)
            for name in module.SHEETS:
                self.assertFalse(any(cell.data_type == 'f' for row in book[name] for cell in row))
            self.assertEqual(book['Sorties R34']['B2'].value, "'=UNIT_FIXTURE_ONLY()")
            self.assertEqual(book['Synthèse R34']['B2'].value, "'@UNIT_ONLY")
        finally:
            book.close()

    def test_historical_workbook_input_cannot_be_output(self):
        before = module.binding(module.BASELINE, self.root)
        with self.assertRaisesRegex(ValueError, 'overwrite a bound input'):
            module.export(self.value, self.root, self.root / module.BASELINE)
        self.assertEqual(module.binding(module.BASELINE, self.root), before)

    def test_foreign_existing_workbook_is_never_overwritten(self):
        path = self.root / 'docs/foreign.xlsx'; book = Workbook(); book.properties.creator = 'User'; book.save(path); book.close()
        before = module.binding('docs/foreign.xlsx', self.root)
        with self.assertRaisesRegex(ValueError, 'another author'):
            module.export(self.value, self.root, path)
        self.assertEqual(module.binding('docs/foreign.xlsx', self.root), before)

    def test_changed_source_or_historical_task_is_rejected(self):
        altered = copy.deepcopy(self.value); altered['tasks'][0]['status'] = 'DONE'
        with self.assertRaisesRegex(ValueError, 'Historical workstreams'):
            module.validate(altered, self.root)
        (self.root / module.ASSETS).write_text('{"entries":[]}')
        with self.assertRaises(ValueError): module.validate(self.value, self.root)

    def test_unknown_duplicate_or_omitted_output_is_rejected(self):
        for change in ('omit', 'duplicate', 'unknown'):
            altered = copy.deepcopy(self.value)
            if change == 'omit': altered['outputs'].pop()
            if change == 'duplicate': altered['outputs'][0] = altered['outputs'][1]
            if change == 'unknown': altered['outputs'][0]['uid'] = 'unknown-unit-fixture'
            with self.assertRaises(ValueError): module.validate(altered, self.root)

    def test_paths_and_unrelated_json_outputs_are_guarded(self):
        for name in ('../outside.xlsx', 'data/not-an-export.xlsx', '/tmp/not-in-root.xlsx'):
            with self.assertRaises(ValueError): module.output_path(name, self.root)
        for name in ('../file', 'docs/../file', 'https://example.invalid/x', 'docs/a?x', 'docs/a\\b'):
            with self.assertRaises(ValueError): module.local(name, self.root)
        path = self.root / 'docs/owned.json'; path.write_text('{"release":"R33","schema":"unrelated"}')
        with self.assertRaisesRegex(ValueError, 'unrelated JSON'):
            module.write_json('docs/owned.json', {'release': 'R34', 'schema': 'test-r34'}, self.root)
        self.assertEqual(json.loads(path.read_text())['release'], 'R33')

    def test_only_current_source_bound_results_count_and_history_is_separate(self):
        (self.root / 'docs/R33_VALIDATION.json').write_text('{"fixture":"historical only"}')
        source = self.root / 'docs/unit-source.txt'; source.write_text('Unit report source, not artistic evidence.')
        name = module.REPORTS[0][0]
        report = {'passed': 17, 'failed': 0, 'sourceFiles': []}
        (self.root / name).write_text(json.dumps(report))
        result = module.validation(self.root, preview=True)
        self.assertFalse(result['checks'][0]['sourceCurrent'])
        self.assertEqual(result['totals'], {})
        report['sourceFiles'] = [module.binding('docs/unit-source.txt', self.root)]
        (self.root / name).write_text(json.dumps(report))
        guard = {'passed': 32, 'failed': 0, 'sourceFiles': report['sourceFiles'],
                 'historicalResultsExcludedFromR34': {'passed': 79, 'failed': 0}}
        (self.root / 'docs/R34_CURRENT_GUARD_TESTS.json').write_text(json.dumps(guard))
        result = module.validation(self.root, preview=True)
        self.assertEqual(result['totals'], {'unit': 17, 'guard': 32})
        self.assertFalse(result['historicalResults']['includedInR34Totals'])
        for patch in ({'preview': True}, {'skipped': 1}):
            (self.root / name).write_text(json.dumps({**report, **patch}))
            self.assertEqual(module.validation(self.root, preview=True)['totals'], {'guard': 32})
        (self.root / name).write_text(json.dumps(report))
        source.write_text('Changed unit report source.')
        self.assertEqual(module.validation(self.root, preview=True)['totals'], {})
        with self.assertRaisesRegex(ValueError, 'unfinished'):
            module.validation(self.root, preview=False)

    def test_actual_export_is_deterministic_and_new_sheets_do_not_close_history(self):
        first = module.export(self.value, self.root, self.root / 'docs/one.xlsx')
        second = module.export(self.value, self.root, self.root / 'docs/two.xlsx')
        self.assertEqual(first['sha256'], second['sha256'])
        old = load_workbook(self.root / module.BASELINE, read_only=True)
        new = load_workbook(self.root / 'docs/two.xlsx', read_only=True)
        try:
            self.assertEqual(list(old['Chantiers R33'].values), list(new['Chantiers R33'].values))
        finally:
            old.close(); new.close()


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromModule(__import__(__name__))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    report = {'schema': 're.bow.export-tests-r34/1', 'release': 'R34', 'passed': result.testsRun-len(result.failures)-len(result.errors),
              'failed': len(result.failures)+len(result.errors),
              'sourceFiles': [module.binding(name) for name in ('scripts/fidelity-progress-r34.py', 'tests/test_fidelity_r34.py', module.BASELINE)],
              'scope': 'Isolated export fault tests preserving the actual frozen 70-sheet R33 history; fixture rows are not delivered art or current production completions.',
              'includedInR34Aggregate': False}
    module.write_json('docs/R34_EXPORT_TESTS.json', report)
    raise SystemExit(0 if result.wasSuccessful() else 1)
