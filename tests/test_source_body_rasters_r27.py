import hashlib
import json
from pathlib import Path
import unittest

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r27/sources/body-rasters'


class SourceBodyRasterR27Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((PACK / 'manifest.json').read_text())
        cls.catalog = {entry['id']: entry for entry in json.loads((ROOT / 'modules/fidelity-r26/models/catalog.json').read_text())['entries']}

    def test_all_sixteen_separate_pngs_preserve_the_recorded_rendered_pixels(self):
        count = 0
        for entry in self.manifest['entries']:
            self.assertEqual([view['angle'] for view in entry['views']], [0, 90, 180, 270])
            for view in entry['views']:
                raw = (PACK / view['path']).read_bytes()
                self.assertEqual(hashlib.sha256(raw).hexdigest(), view['sha256'])
                self.assertEqual(len(raw), view['bytes'])
                with Image.open(PACK / view['path']) as image:
                    self.assertEqual(image.size, (512, 512))
                    self.assertEqual(image.mode, 'RGBA')
                    self.assertEqual(hashlib.sha256(image.tobytes()).hexdigest(), view['rgbaSha256'])
                count += 1
        self.assertEqual(count, 16)

    def test_complete_geometry_is_framed_with_real_transparency_without_edge_clipping(self):
        for entry in self.manifest['entries']:
            self.assertEqual(len({view['rgbaSha256'] for view in entry['views']}), 4)
            for view in entry['views']:
                with Image.open(PACK / view['path']) as image:
                    alpha = image.getchannel('A')
                    histogram = alpha.histogram()
                    self.assertGreater(histogram[0], 0)
                    self.assertEqual(image.width * image.height - histogram[0], view['occupiedPixels'])
                    self.assertEqual(max(alpha.crop((0, 0, 512, 1)).getextrema()), 0)
                    self.assertEqual(max(alpha.crop((0, 511, 512, 512)).getextrema()), 0)
                    self.assertEqual(max(alpha.crop((0, 0, 1, 512)).getextrema()), 0)
                    self.assertEqual(max(alpha.crop((511, 0, 512, 512)).getextrema()), 0)
                self.assertEqual(view['edgePixels'], 0)

    def test_each_body_and_native_material_record_is_bound_to_its_actual_attributed_model(self):
        self.assertEqual({entry['id'] for entry in self.manifest['entries']}, {'re1r-lisa-trevor', 're1r-cerberus', 're5-chainsaw-majini', 're5-executioner'})
        for entry in self.manifest['entries']:
            source = self.catalog[entry['modelId']]
            self.assertEqual(source['subjectId'], entry['id'])
            self.assertFalse(source.get('candidateUid'))
            self.assertEqual(entry['model'], source['model'])
            self.assertEqual(entry['materials'], source.get('materials'))
            self.assertEqual(entry['textures'], source['textures'])
            self.assertNotEqual(source.get('modelRole'), 'associated-object')
            base = ROOT / 'modules/fidelity-r26/models' / source['base']
            for record in [source['model'], *source['textures'], *([source['materials']] if source.get('materials') else [])]:
                self.assertEqual(hashlib.sha256((base / record['path']).read_bytes()).hexdigest(), record['sha256'])
        recipe = self.manifest['renderRecipe']
        self.assertEqual(hashlib.sha256((PACK / recipe['path']).read_bytes()).hexdigest(), recipe['sha256'])

    def test_addendum_is_not_inserted_into_frozen_jobs_or_counted_as_generated_combat_art(self):
        jobs = json.loads((ROOT / 'modules/fidelity-r27/sprites/jobs.json').read_text())['jobs']
        references = {reference['path'] for job in jobs for reference in job['references']}
        self.assertFalse(any(path.startswith('modules/fidelity-r27/sources/body-rasters/') for path in references))
        self.assertFalse(self.manifest['frozenJobsChanged'])
        self.assertFalse(self.manifest['frozenAppearanceIndexChanged'])
        for key in ('imageGenSprites', 'originalGameSprites', 'combatReadySprites'):
            self.assertEqual(self.manifest['counts'][key], 0)
        for entry in self.manifest['entries']:
            self.assertFalse(entry['canonicalFidelityCertified'])
            self.assertFalse(entry['anatomicalCompletenessIndependentlyCertified'])
            self.assertFalse(entry['recipe']['modelTransformsChanged'])
            self.assertFalse(entry['recipe']['poseChanged'])
            self.assertFalse(entry['recipe']['geometryMirrored'])
            self.assertFalse(entry['recipe']['sourceUnitsConvertedToMeters'])
            self.assertTrue(entry['sourcePoseScope'])
            self.assertTrue(entry['equipmentScope'])


if __name__ == '__main__':
    unittest.main()
