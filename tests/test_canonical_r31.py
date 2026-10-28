import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('canonical_r31_builder', ROOT / 'scripts/build-canonical-r31.py')
BUILD = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(BUILD)
PACK = 'modules/fidelity-r31/canonical'


class CanonicalTests(unittest.TestCase):
    def setUp(self):
        self.curation = BUILD.read(PACK + '/curation.json')

    def changed(self, value):
        original = BUILD.read
        return patch.object(BUILD, 'read', side_effect=lambda name: copy.deepcopy(value) if name == PACK + '/curation.json' else original(name))

    def test_actual_sources_and_complete_bound_manifest(self):
        value = BUILD.build()
        self.assertEqual(value['counts']['identities'], 17)
        self.assertEqual(value['counts']['sourceResponses'], 29)
        self.assertEqual(value['counts']['newDocumentaryFacts'], 20)
        self.assertEqual(value['counts']['reusedSourceFacts'], 10)
        self.assertEqual(len(value['claims']), 30)
        self.assertEqual(value['counts']['gameplayConclusionAssignments'], 0)

    def test_actual_manifest_reproduces_exactly(self):
        raw = (json.dumps(BUILD.build(), ensure_ascii=False, indent=2) + '\n').encode()
        self.assertEqual(raw, (ROOT / PACK / 'manifest.json').read_bytes())

    def test_every_actual_quote_is_in_retained_game_specific_source(self):
        value = BUILD.build(); sources = {source['id']: source for source in value['sources']}
        for claim in value['claims']:
            for evidence in claim['evidence']:
                source = sources[evidence['sourceId']]
                self.assertIn(evidence['excerpt'], BUILD.source_text(source))
                self.assertEqual(source['gameKey'], claim['gameKey'])

    def test_reused_source_facts_bind_real_historical_claims(self):
        previous, _ = BUILD.previous_claims()
        for claim in BUILD.build()['claims']:
            if claim['novelty'] == 'REUSED_SOURCE_FACT':
                self.assertTrue(claim['reusesPriorClaimIds'])
                self.assertTrue(all(previous[pid]['uid'] == claim['uid'] for pid in claim['reusesPriorClaimIds']))

    def test_old_fact_cannot_be_recounted_as_new(self):
        value = self.curation; value['claims'][20]['novelty'] = 'NEW_DOCUMENTARY_FACT'; value['claims'][20]['reusesPriorClaimIds'] = []
        with self.changed(value), self.assertRaisesRegex(ValueError, 'prior source fact'):
            BUILD.build()

    def test_original_gamma_quote_cannot_be_attached_to_remake(self):
        value = self.curation; value['claims'][7]['evidence'] = copy.deepcopy(value['claims'][6]['evidence'])
        with self.changed(value), self.assertRaisesRegex(ValueError, 'quote/game'):
            BUILD.build()

    def test_qualitative_u8_height_cannot_become_exact_number(self):
        value = self.curation; value['sourceDimensions'][2]['value'] = 30; value['sourceDimensions'][2]['siValueMeters'] = 30
        with self.changed(value), self.assertRaisesRegex(ValueError, 'qualitative height'):
            BUILD.build()

    def test_larval_centimetres_cannot_become_metres(self):
        value = self.curation; value['sourceDimensions'][0]['siValueMeters'] = 1
        with self.changed(value), self.assertRaisesRegex(ValueError, 'units'):
            BUILD.build()

    def test_source_measure_cannot_acquire_collision_admission(self):
        value = self.curation; value['sourceDimensions'][0]['targetCollisionAdmitted'] = True
        with self.changed(value), self.assertRaisesRegex(ValueError, 'collision'):
            BUILD.build()

    def test_changed_source_snapshot_fails_hash_check(self):
        source = copy.deepcopy(BUILD.read(PACK + '/captures.json')['sources'][0]); source['snapshotSha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'Changed packed'):
            BUILD.source_text(source)

    def test_external_source_snapshot_path_is_refused(self):
        source = copy.deepcopy(BUILD.read(PACK + '/captures.json')['sources'][0]); source['snapshot'] = '../outside.html.gz'
        with self.assertRaisesRegex(ValueError, 'leaves its release'):
            BUILD.source_text(source)

    def test_unproved_alias_cannot_promote_native_asset(self):
        value = self.curation; value['aliasDecisions'][0]['promoted'] = True
        with self.changed(value), self.assertRaisesRegex(ValueError, 'certified alias'):
            BUILD.build()

    def test_conclusion_subject_cannot_inherit_another_subject_claim(self):
        value = self.curation; value['conclusionRules'][0]['uid'] = 're3-hunter-gamma'
        with self.changed(value), self.assertRaisesRegex(ValueError, 'crosses subjects'):
            BUILD.build()

    def test_old_canonical_manifests_are_unchanged(self):
        for release in range(23, 29):
            name = f'modules/fidelity-r{release}/canonical/manifest.json'
            original = subprocess.check_output(['git', 'show', '12cdd7e38b5785cb9fbbb3fe3dff8d0f7f41fa24:' + name], cwd=ROOT)
            self.assertEqual(original, (ROOT / name).read_bytes())


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(CanonicalTests)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    names = ['scripts/build-canonical-r31.py', 'tests/test_canonical_r31.py', PACK + '/manifest.json', PACK + '/curation.json', PACK + '/captures.json']
    report = {'schema': 're.bow.canonical-python-r31/1', 'passed': result.testsRun - len(result.failures) - len(result.errors),
              'failed': len(result.failures) + len(result.errors), 'skipped': len(result.skipped),
              'sourceFiles': [{'path': name, 'sha256': hashlib.sha256((ROOT / name).read_bytes()).hexdigest()} for name in names],
              'scope': 'Actual29 captured responses,30 game/phase-bound facts, novelty exclusion, dimensions, source tampering, alias and conclusion scope, preserved historical manifests.'}
    (ROOT / 'docs/R31_CANONICAL_TESTS.json').write_text(json.dumps(report, indent=2) + '\n')
    raise SystemExit(0 if result.wasSuccessful() else 1)
