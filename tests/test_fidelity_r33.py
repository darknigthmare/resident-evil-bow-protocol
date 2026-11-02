"""Actual lot ownership, fresh proof boundaries and preserved63-sheet R31 workbook."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile

from openpyxl import Workbook, load_workbook

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('r33_export_test', ROOT / 'scripts/fidelity-progress-r33.py')
EXPORT = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(EXPORT)


class FidelityR33Tests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(); self.addCleanup(temporary.cleanup); self.root = Path(temporary.name)
        self.put('data/roster.json', {'catalog': [{'id': 'fixture-' + str(n)} for n in range(389)]})
        self.put('docs/R31_VALIDATION.json', {'historical': True})
        self.task_ids = [task for lot, owner, ids in EXPORT.LOTS for task in ids] + list(EXPORT.TRACKING_TASKS)
        self.put(EXPORT.PRIOR, {'identity_updates': [{'id': 'fixture-' + str(n), 'sprite_generation_status': 'BLOCKED_BY_TOOL' if n < 22 else 'GENERATED'} for n in range(389)],
            'tasks': [{'id': task, 'title': 'Historical criterion ' + task, 'category': 'sources',
                       'remaining': ['Unverified original criterion'], 'evidence': [{'href': 'index.html', 'label': 'History'}]} for task in self.task_ids],
            'generation_preference': 'Preserve refusals; fidelity first'})
        self.put('modules/fidelity-r31/retained.json', {'frozen': True})
        self.root.joinpath('modules/fidelity-r31/index.html').write_text('Frozen historical overview')
        for name in ('scripts/fidelity-progress-r33.py', 'modules/fidelity-r33/index.html', 'modules/fidelity-r33/dashboard.js', 'modules/fidelity-r33/dossier-link.js'):
            target = self.root / name; target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes((ROOT / name).read_bytes())
        self.lots = {}
        for index, (lot, owner, ids) in enumerate(EXPORT.LOTS):
            proof = 'modules/fidelity-r33/' + lot + '/fixture-proof.json'; self.put(proof, {'actualSyntheticIntegrityFixture': lot})
            value = {'schema': 're.bow.fidelity-lot-r33/1', 'release': 'R33', 'id': lot, 'taskIds': list(ids),
                'summary': 'Synthetic test lot; no actual canonical qualification.', 'advances': ['Delivered source integrity fixture'],
                'remaining': ['Original1:1 certification still unverified'], 'manifests': [self.binding(proof)],
                'resources': [{'path': proof, 'label': 'Fixture evidence'}],
                'identities': [{'id': 'fixture-' + str(index), 'summary': 'Integrity proof only', 'artifacts': [{**self.binding(proof),
                    'label': 'Fixture document', 'kind': 'documentary-fixture', 'sourceEdition': 'Exact fixture edition'}]}],
                'counts': {'fixtureProofs': 1}, 'canonicalFidelityCertified': False}
            self.lots[lot] = ((EXPORT.MODULE / lot / 'delivery.json').as_posix(), value); self.put(self.lots[lot][0], value)
        self.report = 'docs/R33_FIXTURE_TEST.json'; self.put(self.report, {'passed': 2, 'failed': 0, 'inputs': [self.binding('data/roster.json')]})
        self.put(EXPORT.REPORT_INDEX, {'reports': [{'path': self.report, 'kind': 'fixture_checks', 'label': 'Executed fixture checks'}]})
        book = Workbook(); book.remove(book.active)
        for index in range(63):
            page = book.create_sheet('Catalogue R31' if index == 0 else 'History ' + str(index))
            if not index:
                page.append(['UID', 'Historical value'])
                for n in range(389): page.append(['fixture-' + str(n), 'Keep historical detail'])
            elif index == 1:
                page['A1'] = 'Keep hyperlink'; page['A1'].hyperlink = 'https://example.invalid/history'; page['B1'] = '=2+2'; page['B1'].data_type = 's'
        book.properties.creator = 'BOW fidelity progress R31'; book.save(self.root / EXPORT.BASELINE); book.close()

    def put(self, name, value):
        path = self.root / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_text(json.dumps(value, ensure_ascii=False) + '\n')

    def binding(self, name):
        path = self.root / name
        return {'path': name, 'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}

    def build(self, pending=False):
        return EXPORT.build(self.root, allow_pending=pending)

    def change(self, lot, mutate):
        name, value = self.lots[lot]; value = copy.deepcopy(value); mutate(value); self.put(name, value)

    def test_all17_workstreams_have_separate_lot_owner_and_remain_open(self):
        checks, value = self.build()
        self.assertTrue(checks['complete']); self.assertEqual(len(value['tasks']), 17); self.assertEqual(len(value['lot_rows']), 6)
        self.assertEqual({row['id'] for row in value['tasks']}, set(self.task_ids))
        for row in value['tasks']:
            self.assertTrue(row['owner']); self.assertTrue(row['lotId']); self.assertEqual(row['status'], 'EN COURS')
            self.assertIn('Unverified original criterion', row['remaining'])
        self.assertEqual(value['canonical_fidelity_certified'], 0)

    def test_missing_lot_cannot_be_silently_counted_as_delivered(self):
        (self.root / self.lots['evidence'][0]).unlink()
        with self.assertRaisesRegex(ValueError, 'lots are unfinished'): self.build()
        checks, value = self.build(True)
        self.assertFalse(checks['complete']); task = next(row for row in value['tasks'] if row['id'] == 'G-AUDIO')
        self.assertEqual(task['deliveryState'], 'EN ATTENTE'); self.assertFalse(task['r33_new_implementation'])

    def test_task_claims_cannot_escape_the_assigned_lot(self):
        self.change('sprites', lambda row: row['taskIds'].append('G-AUDIO'))
        with self.assertRaisesRegex(ValueError, 'owner scope'): self.build()

    def test_changed_manifest_and_artifact_bytes_are_rejected(self):
        proof = self.lots['native'][1]['manifests'][0]['path']; self.put(proof, {'changed': True})
        with self.assertRaisesRegex(ValueError, 'hash or size mismatch'): self.build()
        self.change('native', lambda row: row.update(manifests=[self.binding(proof)]))
        with self.assertRaisesRegex(ValueError, 'artifact bytes differ'): self.build()

    def test_unknown_and_duplicate_uid_do_not_acquire_evidence(self):
        self.change('evidence', lambda row: row['identities'][0].update(id='another-incarnation'))
        with self.assertRaisesRegex(ValueError, 'exact catalogue identities'): self.build()
        self.put(*self.lots['evidence']); self.change('evidence', lambda row: row['identities'].append(copy.deepcopy(row['identities'][0])))
        with self.assertRaisesRegex(ValueError, 'exact catalogue identities'): self.build()

    def test_external_and_traversing_resource_links_are_rejected(self):
        for path in ('https://example.invalid/collect', 'modules/fidelity-r33/../outside.json'):
            self.put(*self.lots['evidence']); self.change('evidence', lambda row: row['resources'][0].update(path=path))
            with self.assertRaisesRegex(ValueError, 'local checkout path'): self.build()

    def test_false_global_fidelity_or_original_frame_claim_is_rejected(self):
        self.change('native', lambda row: row.update(canonicalFidelityCertified=True))
        with self.assertRaisesRegex(ValueError, 'certification'): self.build()
        self.put(*self.lots['native']); self.change('native', lambda row: row['identities'][0]['artifacts'][0].update(originalGameFrameCertified=True))
        with self.assertRaisesRegex(ValueError, 'cannot certify'): self.build()

    def test_identity_route_keeps_uid_and_cannot_substitute_a_remote_or_other_file(self):
        source = self.lots['evidence'][1]['identities'][0]['artifacts'][0]['path']
        self.change('evidence', lambda row: row['identities'][0]['artifacts'][0].update(href=source + '?id=fixture-2'))
        _, value = self.build(); proof = value['identity_updates'][2]['r33_artifacts'][0]
        self.assertEqual(proof['href'], source + '?id=fixture-2')
        self.put(*self.lots['evidence']); self.change('evidence', lambda row: row['identities'][0]['artifacts'][0].update(identityParameter='id'))
        _, parameter_value = self.build()
        self.assertEqual(parameter_value['identity_updates'][2]['r33_artifacts'][0]['href'], source + '?id=fixture-2')
        for route in (source + '?id=fixture-3', source + '?id=', 'https://example.invalid/' + source, 'modules/fidelity-r31/index.html?id=fixture-2'):
            self.put(*self.lots['evidence']); self.change('evidence', lambda row: row['identities'][0]['artifacts'][0].update(href=route))
            with self.assertRaisesRegex(ValueError, 'cannot substitute'): self.build()

    def test_source_additions_preserve_initial_refusal_statuses(self):
        _, value = self.build(); rows = value['identity_updates']
        self.assertEqual(len(rows), 389); self.assertEqual(sum(row['sprite_generation_status'] == 'BLOCKED_BY_TOOL' for row in rows), 22)
        self.assertTrue(rows[0]['r33_has_additions']); self.assertEqual(rows[0]['sprite_generation_status'], 'BLOCKED_BY_TOOL')
        self.assertEqual(value['generation_preference'], 'Preserve refusals; fidelity first')

    def test_reports_must_be_current_and_cannot_be_counted_twice(self):
        self.put('data/roster.json', {'catalog': [{'id': 'fixture-' + str(n)} for n in range(389)], 'changed': True})
        with self.assertRaisesRegex(ValueError, 'validation is unfinished'): self.build()
        checks, value = self.build(True); self.assertEqual(checks['totals']['fixture_checks'], 0); self.assertFalse(checks['complete'])
        self.put(EXPORT.REPORT_INDEX, {'reports': [{'path': self.report}, {'path': self.report}]})
        with self.assertRaisesRegex(ValueError, 'counted twice'): self.build(True)

    def test_63_historical_sheets_and_relationships_remain_byte_exact(self):
        _, value = self.build(); baseline = (self.root / EXPORT.BASELINE).read_bytes()
        # The exporter must sanitize evidence strings before spreadsheet evaluation.
        value['source_rows'].append(['tracking', 'G-PREUVES', 'fixture-0', 'Test', ' \t=2+2', '@name', 'literal'])
        # Appended data cannot bypass the validated projection.
        with self.assertRaisesRegex(ValueError, 'projection differs'): EXPORT.export(value, self.root)
        _, value = self.build(); output = EXPORT.export(value, self.root)
        self.assertEqual(output['worksheets'], 70); self.assertEqual((self.root / EXPORT.BASELINE).read_bytes(), baseline)
        with ZipFile(self.root / EXPORT.BASELINE) as old, ZipFile(self.root / output['workbook']) as new:
            for name in old.namelist():
                if name.startswith('xl/worksheets/'): self.assertEqual(old.read(name), new.read(name), name)
        book = load_workbook(self.root / output['workbook'])
        self.assertEqual(book['Catalogue R33'].max_row, 390); self.assertEqual(book['Chantiers R33'].max_row, 18)
        self.assertEqual(book['History 1']['A1'].hyperlink.target, 'https://example.invalid/history'); self.assertEqual(book['History 1']['B1'].value, '=2+2'); book.close()

    def test_independent_exports_reproduce_and_forged_closed_tasks_fail(self):
        _, value = self.build()
        first = EXPORT.export(value, self.root, self.root / 'docs/first.xlsx', self.root / 'docs/first.json')
        second = EXPORT.export(value, self.root, self.root / 'docs/second.xlsx', self.root / 'docs/second.json')
        self.assertEqual(first['sha256'], second['sha256'])
        forged = copy.deepcopy(value); forged['tasks'][0]['status'] = 'CLOS'
        with self.assertRaisesRegex(ValueError, 'projection differs'): EXPORT.export(forged, self.root)

    def test_source_strings_remain_literal_in_new_evidence_sheets(self):
        def hostile(row):
            row['identities'][0]['artifacts'][0].update(label=' \t=2+2', kind='@external', sourceEdition='+SUM(1,2)')
        self.change('sprites', hostile); _, value = self.build(); result = EXPORT.export(value, self.root)
        book = load_workbook(self.root / result['workbook'])
        self.assertTrue(book['Ajouts R33'].cell(2, 4).value.startswith("'@"))
        self.assertTrue(book['Ajouts R33'].cell(2, 5).value.startswith("' \t="))
        self.assertTrue(book['Ajouts R33'].cell(2, 6).value.startswith("'+"))
        self.assertTrue(all(cell.data_type != 'f' for name in EXPORT.SHEETS for row in book[name] for cell in row)); book.close()

    def test_zero_pass_failed_execution_is_recorded_without_current_credit(self):
        self.put(self.report, {'passed': 0, 'failed': 1})
        checks, value = self.build(True)
        self.assertFalse(checks['complete']); self.assertEqual(checks['totals']['fixture_checks'], 0)
        self.assertEqual(checks['failed_reports'], [self.report]); self.assertEqual(checks['checks'][0]['failed'], 1)

    def test_export_cannot_overwrite_history_or_another_authors_workbook(self):
        _, value = self.build()
        with self.assertRaisesRegex(ValueError, 'historical inputs'): EXPORT.export(value, self.root, self.root / EXPORT.BASELINE)
        book = Workbook(); book.properties.creator = 'Other author'; book.save(self.root / 'docs/other.xlsx'); book.close()
        with self.assertRaisesRegex(ValueError, 'another author'): EXPORT.export(value, self.root, self.root / 'docs/other.xlsx')

    def test_progress_output_cannot_replace_frozen_inputs_or_source_evidence(self):
        _, value = self.build()
        protected = [EXPORT.PRIOR, 'data/roster.json', self.lots['evidence'][1]['manifests'][0]['path']]
        for name in protected:
            before = (self.root / name).read_bytes()
            with self.assertRaisesRegex(ValueError, 'historical inputs|unrelated progress|another release'):
                EXPORT.export(value, self.root, self.root / 'docs/guarded.xlsx', self.root / name)
            self.assertEqual((self.root / name).read_bytes(), before)
        with self.assertRaisesRegex(ValueError, 'isolated QA locations'):
            EXPORT.export(value, self.root, self.root / 'docs/guarded.xlsx', self.root / 'modules/fidelity-r31/new-output.json')

    def test_progress_output_respects_ownership_and_allows_owned_updates(self):
        _, value = self.build(); name = 'docs/another-progress.json'
        self.put(name, {'schema': 're.bow.fidelity-progress/1', 'release': 'R31', 'tasks': [{}] * 17})
        before = (self.root / name).read_bytes()
        with self.assertRaisesRegex(ValueError, 'another release'): EXPORT.export(value, self.root, self.root / 'docs/guarded.xlsx', self.root / name)
        self.assertEqual((self.root / name).read_bytes(), before)
        self.put(name, EXPORT.progress(value))
        result = EXPORT.export(value, self.root, self.root / 'docs/owned.xlsx', self.root / name)
        self.assertEqual(result['worksheets'], 70); self.assertEqual(json.loads((self.root / name).read_text()), EXPORT.progress(value))

    def test_flat_exact_uid_artifacts_are_linked_without_changing_historical_qualification(self):
        def flat(row):
            proof = row.pop('identities')[0]['artifacts'][0]
            row['artifacts'] = [{**proof, 'uid': 'fixture-7', 'identityParameter': 'uid'}]
            row['lotId'] = row.pop('id')
            row['workstreams'] = row.pop('taskIds')
            row['sourceFiles'] = row.pop('manifests')
        self.change('sprites', flat)
        _, value = self.build()
        row = value['identity_updates'][7]
        self.assertEqual(row['r33_lots'], ['sprites'])
        self.assertEqual(row['sprite_generation_status'], 'BLOCKED_BY_TOOL')
        self.assertTrue(row['r33_artifacts'][0]['href'].endswith('?uid=fixture-7'))

    def test_duplicate_proof_objects_cannot_inflate_the_total(self):
        def duplicate(row):
            row['identities'][0]['artifacts'].append(copy.deepcopy(row['identities'][0]['artifacts'][0]))
        self.change('native', duplicate)
        with self.assertRaisesRegex(ValueError, 'unique and bounded'):
            self.build()

    def test_external_symlink_and_encoded_paths_cannot_enter_public_proof_routes(self):
        with tempfile.TemporaryDirectory() as name:
            outside = Path(name) / 'outside.json'; outside.write_text('{}')
            target = self.root / 'modules/fidelity-r33/external.json'; target.symlink_to(outside)
            self.change('evidence', lambda row: row['resources'][0].update(path='modules/fidelity-r33/external.json'))
            with self.assertRaisesRegex(ValueError, 'external evidence'):
                self.build()
        self.put(*self.lots['evidence'])
        self.change('evidence', lambda row: row['resources'][0].update(path='modules/fidelity-r33/%2e%2e/history.json'))
        with self.assertRaisesRegex(ValueError, 'local checkout path'):
            self.build()

    def test_boolean_certification_and_misleading_per_identity_aggregate_are_rejected(self):
        _, value = self.build()
        statistics = value['statistics']
        aggregate = next(row for row in statistics if row['label'] == 'objets de preuve ou d’audit au total')
        self.assertEqual(aggregate['value'], len(value['artifact_rows']))
        self.assertNotIn('par incarnation', aggregate['label'])
        value['canonical_fidelity_certified'] = False
        with self.assertRaisesRegex(ValueError, 'Uncertified R33'):
            EXPORT.validate(value, self.root)


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(FidelityR33Tests)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    names = ['tests/test_fidelity_r33.py', 'scripts/fidelity-progress-r33.py', 'modules/fidelity-r33/index.html',
             'modules/fidelity-r33/dashboard.js', 'modules/fidelity-r33/dossier-link.js']
    report = {'schema': 're.bow.fidelity-export-tests-r33/1', 'passed': result.testsRun - len(result.failures) - len(result.errors),
              'failed': len(result.failures) + len(result.errors), 'skipped': len(result.skipped),
              'sourceFiles': [{'path': name, 'sha256': hashlib.sha256((ROOT / name).read_bytes()).hexdigest()} for name in names],
              'scope': 'Actual ownership, freshness, path, exact UID, refusal-status preservation and63-sheet export assertions with explicit synthetic proof fixtures.'}
    (ROOT / 'docs/R33_EXPORT_TESTS.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'passed': report['passed'], 'failed': report['failed']})); raise SystemExit(int(not result.wasSuccessful()))
