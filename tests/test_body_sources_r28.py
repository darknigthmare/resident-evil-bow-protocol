import hashlib
import importlib.util
import json
import unittest
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r28'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    return json.loads(path.read_text())


class SourceBodiesR28(unittest.TestCase):
    def test_32_camera_views_bind_unchanged_attributed_models(self):
        manifest = read(PACK / 'sources/body-rasters/manifest.json')
        catalog = read(ROOT / manifest['sourceCatalog']['path'])
        self.assertEqual(sha(ROOT / manifest['sourceCatalog']['path']), manifest['sourceCatalog']['sha256'])
        self.assertEqual(sha(PACK / 'sources/body-rasters/renderer.js'), manifest['renderRecipe']['sha256'])
        self.assertEqual(manifest['counts']['identities'], 6)
        self.assertEqual(manifest['counts']['sourceBodyModels'], 8)
        self.assertEqual(manifest['counts']['renderedReferenceImages'], 32)
        for entry in manifest['entries']:
            source = next(record for record in catalog['entries'] if record['id'] == entry['modelId'])
            self.assertEqual(entry['id'], source['subjectId'])
            self.assertEqual(entry['model'], source['model'])
            self.assertEqual(entry['textures'], source['textures'])
            source_base = (ROOT / 'modules/fidelity-r26/models' / entry['sourceBase']).resolve()
            for asset in [entry['model'], *entry['textures'], *([entry['materials']] if entry.get('materials') else [])]:
                source_file = source_base / asset['path']
                self.assertEqual(sha(source_file), asset['sha256'])
                self.assertEqual(source_file.stat().st_size, asset['bytes'])
            self.assertNotIn('candidateUid', source)
            recipe = entry['recipe']
            self.assertTrue(recipe['cameraOrbitOnly'])
            self.assertFalse(recipe['modelTransformsChanged'])
            self.assertFalse(recipe['poseChanged'])
            self.assertFalse(recipe['geometryMirrored'])
            self.assertEqual([view['angle'] for view in entry['views']], [0, 90, 180, 270])
            if entry['id'] in ('rerev-wall-blister', 'rerev-scagdead'):
                self.assertEqual(recipe['cameraUp'], [0, 0, 1])

    def test_every_reference_png_is_real_transparent_and_unclipped(self):
        manifest = read(PACK / 'sources/body-rasters/manifest.json')
        for entry in manifest['entries']:
            for view in entry['views']:
                path = PACK / 'sources/body-rasters' / view['path']
                self.assertEqual(sha(path), view['sha256'])
                self.assertEqual(path.stat().st_size, view['bytes'])
                with Image.open(path) as image:
                    self.assertEqual(image.size, (512, 512))
                    rgba = image.convert('RGBA')
                    self.assertEqual(hashlib.sha256(rgba.tobytes()).hexdigest(), view['rgbaSha256'])
                    alpha = rgba.getchannel('A')
                    self.assertEqual(alpha.getextrema(), (0, 255))
                    self.assertGreater(view['occupiedPixels'], 20)
                    self.assertEqual(view['edgePixels'], 0)
                    x0, y0, x1, y1 = alpha.getbbox()
                    self.assertGreater(x0, 0)
                    self.assertGreater(y0, 0)
                    self.assertLess(x1, image.width)
                    self.assertLess(y1, image.height)

    def test_fresh_publisher_evidence_bytes_are_retained(self):
        evidence = read(PACK / 'sources/online-evidence.json')
        self.assertEqual(len(evidence['entries']), 6)
        self.assertEqual(len({entry['url'] for entry in evidence['entries']}), 6)
        for entry in evidence['entries']:
            path = ROOT / entry['path']
            self.assertEqual(entry['status'], 200)
            self.assertTrue(entry['finalUrl'].startswith('https://models.spriters-resource.com/'))
            self.assertEqual(sha(path), entry['sha256'])
            self.assertEqual(path.stat().st_size, entry['bytes'])
            self.assertIn(b'<!DOCTYPE', path.read_bytes().upper())

    def test_four_actual_outputs_have_source_bound_complete_body_reviews(self):
        spec = importlib.util.spec_from_file_location('r28_overlay', ROOT / 'scripts/build-sprite-overlay-r28.py')
        overlay = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(overlay)
        records = sorted((PACK / 'sprites/records').glob('*.json'))
        self.assertEqual(len(records), 4)
        for path in records:
            record = read(path)
            old = read(ROOT / 'modules/fidelity-r27/sprites/records' / path.name)
            overlay.validate_replacement(record, old)
            self.assertNotEqual(record['sha256'], old['sha256'])
            self.assertEqual(record['provenance']['toolArtifactSha256'], record['sha256'])
            self.assertFalse(record['provenance']['manualPngEdits'])
            proof = read(ROOT / record['sourceCompletenessEvidence']['path'])
            self.assertEqual(proof['imageSha256'], record['sha256'])
            self.assertEqual(len(proof['references']), 4)
            self.assertTrue(proof['sourceCompleteBodyObserved'])
            self.assertTrue(proof['generatedCompleteBodyObserved'])
            self.assertFalse(proof['canonicalFidelityCertified'])
            self.assertFalse(proof['originalGamePoseCertified'])
            self.assertFalse(proof['oppositeViewReviewed'])
            self.assertEqual(record['availableStates'], [])
            self.assertFalse(record['combatIntegrated'])
            with Image.open(ROOT / proof['visualEvidence']['path']) as contact:
                self.assertEqual(contact.width, 1280)
                self.assertGreaterEqual(contact.height, 1000)

    def test_phase_and_equipment_limits_cannot_be_admitted_as_idle(self):
        lisa = read(PACK / 'sprites/records/re1r-lisa-trevor.json')
        dog = read(PACK / 'sprites/records/re1r-cerberus.json')
        self.assertIn('separate tentacle-reveal phase', ' '.join(lisa['limitations']))
        self.assertIn('detached lateral', ' '.join(lisa['limitations']))
        self.assertEqual(len(lisa['knownAppearanceGaps']), 2)
        self.assertFalse(lisa['equipmentCompletenessReviewed'])
        self.assertEqual(lisa['poseKind'], 'source-bind-pose')
        self.assertIn('detached source objects', ' '.join(dog['limitations']))
        self.assertEqual(dog['poseKind'], 'source-presentation')
        self.assertTrue(all(not record['selected'] for record in read(PACK / 'sources/auxiliary-image-attempts.json')['entries']))
        failures = read(ROOT / 'modules/fidelity-r27/sprites/manifest.json')['pending']
        failed_uids = {entry['id'] for entry in failures}
        self.assertEqual(len(failed_uids), 22)
        self.assertTrue(failed_uids.isdisjoint(path.stem for path in (PACK / 'sprites/records').glob('*.json')))


if __name__ == '__main__':
    unittest.main()
