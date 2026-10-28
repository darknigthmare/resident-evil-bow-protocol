"""Identity, source-byte and reproducibility boundaries for selection portraits."""
import gzip
import hashlib
import importlib.util
import io
import json
import unittest
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('avatars_r30', ROOT / 'scripts/build-selection-avatars-r30.py')
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)
MANIFEST_PATH = ROOT / 'modules/fidelity-r30/selection/manifest.json'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


class SelectionAvatarTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads(MANIFEST_PATH.read_text())
        cls.catalog = {row['id']: row for row in json.loads((ROOT / 'data/catalog-portraits.json').read_text())['catalog']}

    def test_manifest_reproduces_from_retained_sources(self):
        self.assertEqual(self.manifest, BUILDER.build())

    def test_full_catalogue_partition_and_no_generated_fallback(self):
        entries, missing = self.manifest['entries'], self.manifest['missing']
        self.assertEqual(len(entries), 388)
        self.assertEqual([row['id'] for row in missing], ['re7-jack-baker-scissor'])
        self.assertEqual(set(self.catalog), {row['id'] for row in entries + missing})
        for row in entries:
            self.assertEqual(row['game'], self.catalog[row['id']]['game'])
            self.assertEqual(row['targetIncarnation'], row['game'])
            self.assertNotIn('/generated/', row['image'])
            self.assertNotIn('/documentary-variants/', row['image'])
            self.assertTrue(row['selectionOnly'])
            self.assertFalse(row['combatAnimationAssigned'])
            self.assertFalse(row['canonicalFidelityCertified'])
        self.assertEqual(self.manifest['counts']['generatedAvatars'], 0)

    def test_all_actual_images_are_sha_bound_decoded_and_unedited(self):
        for row in self.manifest['entries']:
            with self.subTest(uid=row['id']):
                path = (ROOT / row['image']).resolve()
                self.assertTrue(path.is_relative_to(ROOT))
                raw = path.read_bytes()
                self.assertEqual(sha(raw), row['sha256'])
                self.assertEqual(len(raw), row['bytes'])
                self.assertFalse(row['imageEditedByR30'])
                with Image.open(io.BytesIO(raw)) as image:
                    image.load()
                    self.assertEqual(image.size, (row['width'], row['height']))
                    self.assertEqual(image.format, row['format'])

    def test_all_builder_inputs_are_current(self):
        for record in self.manifest['inputs']:
            raw = (ROOT / record['path']).read_bytes()
            self.assertEqual(len(raw), record['bytes'])
            self.assertEqual(sha(raw), record['sha256'])

    def test_native_2d_thumbnails_are_separate_from_derived_model_views(self):
        native = [row for row in self.manifest['entries'] if row['nativeAssetCertified']]
        models = [row for row in self.manifest['entries'] if row['derivedNativeModelRender']]
        self.assertEqual(len(native), 7)
        self.assertTrue(all(row['sourceKind'] == 'native-menu-thumbnail' and row['originalGame2DFrame'] for row in native))
        self.assertEqual({row['id'] for row in models}, set(BUILDER.MODEL_CHOICES))
        self.assertEqual(len(models), 7)
        for row in models:
            self.assertEqual(row['sourceKind'], 'native-model-render')
            self.assertFalse(row['originalGame2DFrame'])
            self.assertFalse(row['nativeAssetCertified'])
            self.assertTrue(row['targetEditionMatched'])
            self.assertNotIn(row['id'], ('re2-g', 're3-nemesis', 're1-zombie', 'reoutbreak-zombie'))
            self.assertTrue(row['provenance'][0]['targetGameMatched'])
            self.assertFalse(row['provenance'][0]['poseUsedAsCombatIdle'])

    def test_named_index_only_portraits_have_35_actual_page_captures(self):
        evidence = json.loads((ROOT / 'modules/fidelity-r30/selection/source-pages.json').read_text())
        self.assertEqual(len(evidence['sources']), 35)
        for row in evidence['sources']:
            self.assertEqual(row['httpStatus'], 200)
            self.assertTrue(row['exactImageUrlOnPage'])
            packed = (ROOT / row['snapshot']['path']).read_bytes()
            self.assertEqual(sha(packed), row['snapshot']['sha256'])
            raw = gzip.decompress(packed)
            self.assertEqual(sha(raw), row['rawSha256'])
            self.assertEqual(len(raw), row['rawBytes'])
            self.assertIn(row['sourceImageUrl'].split('?', 1)[0], raw.decode('utf-8'))
            self.assertIn('Evil Resource', row['title'])


if __name__ == '__main__':
    unittest.main()
