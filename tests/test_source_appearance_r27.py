import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('appearance_r27', ROOT / 'scripts/build-source-appearance-index-r27.py')
INDEX = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(INDEX)


class AppearanceSourceR27Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = INDEX.read('modules/fidelity-r27/sources/manifest.json')
        cls.roster = INDEX.read('data/roster.json')
        cls.entries = {entry['id']: entry for entry in cls.manifest['entries']}

    def test_reproduction_is_exact_without_rewriting_source_assets(self):
        before = (ROOT / 'modules/fidelity-r27/sources/manifest.json').read_bytes()
        self.assertEqual(INDEX.build(), self.manifest)
        self.assertEqual((ROOT / 'modules/fidelity-r27/sources/manifest.json').read_bytes(), before)

    def test_every_record_matches_the_actual_image_and_input_bytes(self):
        for record in self.manifest['inputs']:
            self.assertEqual(INDEX.sha(ROOT / record['path']), record['sha256'])
        count = 0
        for entry in self.manifest['entries']:
            for record in entry['references']:
                path = INDEX.local(record['path'])
                self.assertEqual(path.stat().st_size, record['bytes'])
                self.assertEqual(INDEX.sha(path), record['sha256'])
                self.assertGreater(record['width'], 0)
                self.assertGreater(record['height'], 0)
                count += 1
        self.assertEqual(count, 570)

    def test_all_catalogue_identities_and_only_the_real_contexts_are_indexed(self):
        ids = {entry['id'] for entry in self.roster['catalog']}
        self.assertEqual(len(ids), 389)
        self.assertEqual(set(self.entries), ids)
        contexts = {entry['id'] for entry in INDEX.read('data/catalog-expansion-v070.json')['records'] if entry.get('encounter')}
        self.assertEqual({entry['id'] for entry in self.entries.values() if entry['encounter']}, contexts)
        self.assertEqual(len(contexts), 43)

    def test_historical_body_flags_do_not_promote_portraits_or_scenes(self):
        for entry in self.entries.values():
            for record in entry['references']:
                if record['role'] in ('portrait', 'scene-reference', 'partial-body-reference', 'model-preview'):
                    self.assertNotEqual(record['bodyCoverage'], 'complete')
                if record['bodyCoverage'] == 'complete':
                    self.assertIn(record['role'], ('full-body-reference', 'source-model-render'))
                    self.assertTrue(record['bodyCoverageBasis'])
        mia = self.entries['re7-mia-winters-infected']
        self.assertTrue(any(ref.get('sourceReviewRecorded') and ref['role'] == 'portrait' for ref in mia['references']))
        self.assertFalse(any(ref.get('sourceReviewRecorded') and ref['bodyCoverage'] == 'complete' for ref in mia['references']))

    def test_candidates_and_associated_objects_are_not_assigned_as_exact_bodies(self):
        for entry in self.entries.values():
            self.assertTrue(all(model['exactIdentity'] and not model['candidate'] for model in entry['exactModels']))
            self.assertTrue(all(model['candidate'] and not model['exactIdentity'] for model in entry['candidateModels']))
            for ref in entry['references']:
                self.assertFalse(ref['exactIdentity'] and ref['candidate'])
                if ref.get('derived'):
                    self.assertTrue(ref['exactIdentity'])
                    self.assertFalse(ref['originalGameSprite'])
                    self.assertFalse(ref['combatReady'])
        catalog = INDEX.read('modules/fidelity-r26/models/catalog.json')
        objects = {model['id'] for model in catalog['entries'] if model.get('modelRole') == 'associated-object' or 'part' in model.get('geometryScope', '').lower()}
        self.assertFalse(objects & {ref.get('modelId') for entry in self.entries.values() for ref in entry['references']})

    def test_stale_historical_hashes_are_reported_without_normalizing_either_value(self):
        drifts, absent = [], []
        for entry in self.roster['catalog']:
            ref = self.entries[entry['id']]['references'][0]
            self.assertEqual(ref['historicalRecordedSha256'], entry.get('sha256'))
            self.assertEqual(ref['historicalRecordedBytes'], entry.get('bytes'))
            actual = INDEX.sha(ROOT / ref['path'])
            self.assertEqual(ref['sha256'], actual)
            if ref['historicalMetadataMatchesCurrentFile'] is False:
                drifts.append(entry['id'])
                self.assertTrue(actual != entry.get('sha256') or ref['bytes'] != entry.get('bytes'))
            elif ref['historicalMetadataMatchesCurrentFile'] is None:
                absent.append(entry['id'])
                self.assertTrue(not entry.get('sha256') or not entry.get('bytes'))
        self.assertEqual(len(drifts), 18)
        self.assertEqual(len(absent), 7)

    def test_outside_paths_and_symlinked_evidence_are_refused(self):
        for value in ('../outside.png', '/tmp/outside.png', 'assets\\catalog\\sample.png'):
            with self.assertRaises(ValueError):
                INDEX.local(value)
        with tempfile.TemporaryDirectory(dir=ROOT) as folder:
            symlink = Path(folder) / 'alias.png'
            symlink.symlink_to(ROOT / 'assets/catalog/re3r-zombie.png')
            with self.assertRaises(ValueError):
                INDEX.local(symlink.relative_to(ROOT).as_posix())

    def test_reference_index_does_not_certify_or_count_generated_sprites(self):
        self.assertFalse(self.manifest['canonicalFidelityCertified'])
        self.assertFalse(self.manifest['sourceFilesRewritten'])
        self.assertEqual(self.manifest['counts']['generatedSprites'], 0)
        self.assertEqual(self.manifest['counts']['bodyCompletenessIndependentlyCertified'], 0)
        generated = {entry['id'] for entry in INDEX.read('assets/sprites/bow/manifest.json')['sprites']}
        self.assertEqual(len(set(self.entries) - generated), 385)


if __name__ == '__main__':
    unittest.main()
