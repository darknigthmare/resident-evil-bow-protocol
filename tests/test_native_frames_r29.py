"""Validate actual native-frame PNGs, fixed pivots, bounds and source scope."""
import hashlib
import json
from pathlib import Path
import unittest
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r29/motion'


class NativeFrameTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((PACK / 'manifest.json').read_text())

    def test_six_subjects_and_actual_scene_counts_do_not_become_combat_states(self):
        data = self.manifest
        self.assertEqual(data['counts'], {'subjects': 6, 'nativeScenes': 24, 'nativeRenderedFrames': 384, 'nativePoseReferenceViews': 24, 'actionAssignedScenes': 0, 'admittedCombatCycles': 0, 'originalGameFrames': 0})
        self.assertEqual(len({entry['subjectId'] for entry in data['entries']}), 6)
        for entry in data['entries']:
            self.assertEqual(entry['modelRole'], 'body')
            self.assertEqual(entry['actionIdentity'], 'unassigned')
            self.assertEqual(entry['availableCombatStates'], [])
            self.assertFalse(entry['originalGameFrames'])
            self.assertFalse(entry['canonicalFidelityCertified'])

    def test_every_png_matches_its_raw_hash_alpha_and_entire_visible_bounds(self):
        count = 0
        for entry in self.manifest['entries']:
            for frame in entry['frames'] + entry['poseViews']:
                raw = (PACK / frame['path']).read_bytes()
                self.assertEqual(len(raw), frame['bytes'])
                self.assertEqual(hashlib.sha256(raw).hexdigest(), frame['sha256'])
                with Image.open(PACK / frame['path']) as image:
                    self.assertEqual(image.mode, 'RGBA')
                    self.assertEqual(image.size, (384, 384))
                    self.assertEqual(hashlib.sha256(image.tobytes()).hexdigest(), frame['rgbaSha256'])
                    box = image.getchannel('A').getbbox()
                    self.assertEqual({'x': box[0], 'y': box[1], 'width': box[2] - box[0], 'height': box[3] - box[1]}, frame['alphaBounds'])
                    self.assertTrue(0 < box[0] < box[2] < 384)
                    self.assertTrue(0 < box[1] < box[3] < 384)
                    self.assertEqual(frame['edgePixels'], 0)
                count += 1
        self.assertEqual(count, 408)

    def test_fixed_camera_and_pivot_do_not_recenter_or_rescale_each_frame(self):
        for entry in self.manifest['entries']:
            recipe = entry['recipe']
            self.assertTrue(recipe['animationCameraFixed'])
            self.assertEqual(recipe['cameraUp'], [0, 1, 0])
            self.assertFalse(recipe['geometryMirrored'])
            self.assertFalse(recipe['bonesAdded'])
            self.assertFalse(recipe['sourceGeometryEdited'])
            self.assertFalse(recipe['sourceUnitsConvertedToMeters'])
            self.assertEqual(len({json.dumps(frame['pivot'], sort_keys=True) for frame in entry['frames']}), 1)
            self.assertEqual(entry['frames'][0]['pivot'], recipe['sourceOriginPivot'])

    def test_samples_keep_exact_native_ticks_and_nonrigid_source_measurements(self):
        for entry in self.manifest['entries']:
            self.assertEqual(entry['ticksPerSecond'], 46186158000)
            self.assertEqual(len(entry['sourceNativeSampleTicks']), 16)
            self.assertTrue(entry['measurements']['nonrigidDeformationProven'])
            self.assertGreater(entry['measurements']['maximumPairwiseDistanceDelta'], 1e-5)
            for index, frame in enumerate(entry['frames']):
                self.assertEqual(frame['ticks'], entry['sourceNativeSampleTicks'][index])
                self.assertEqual(frame['seconds'], int(frame['ticks']) / entry['ticksPerSecond'])
            self.assertFalse(entry['sourceGameFpsCertified'])

    def test_all_published_sources_are_sha_bound_local_files(self):
        for entry in self.manifest['entries']:
            source = entry['nativeSource']
            for record in [source['model'], source['clip'], source['bindings'], *source['textures']]:
                path = (ROOT / record['path']).resolve()
                self.assertTrue(path.is_relative_to(ROOT))
                raw = path.read_bytes()
                self.assertEqual(len(raw), record['bytes'])
                self.assertEqual(hashlib.sha256(raw).hexdigest(), record['sha256'])
            self.assertEqual(source['clip']['sha256'], source['publishedClip']['sha256'])
            self.assertIn('/pc_computer/residentevilrevelations/', entry['sourcePage'])

    def test_viewer_assets_and_renderer_are_locally_available(self):
        for file in ['index.html', 'page.js', 'style.css', 'renderer.js', 'inputs.json']:
            self.assertTrue((PACK / file).is_file())
        for key in ['inputs', 'renderer']:
            record = self.manifest[key]
            self.assertEqual(hashlib.sha256((PACK / record['path']).read_bytes()).hexdigest(), record['sha256'])
        folder = ROOT / 'docs/R29_NATIVE_FRAME_REVIEW'
        index = json.loads((folder / 'index.json').read_text())
        observations = json.loads((folder / 'observations.json').read_text())
        self.assertEqual(hashlib.sha256((PACK / 'manifest.json').read_bytes()).hexdigest(), index['manifest']['sha256'])
        self.assertEqual(hashlib.sha256((folder / 'index.json').read_bytes()).hexdigest(), observations['reviewIndex']['sha256'])
        self.assertEqual(observations['reviewedNativeFrameSamples'], 96)
        self.assertEqual(observations['completeAnimationCyclesReviewed'], 0)
        for sheet in index['sheets']:
            self.assertEqual(hashlib.sha256((ROOT / sheet['path']).read_bytes()).hexdigest(), sheet['sha256'])


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(NativeFrameTests)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    paths = ['tests/test_native_frames_r29.py', 'modules/fidelity-r29/motion/manifest.json', 'modules/fidelity-r29/motion/renderer.js', 'docs/R29_NATIVE_FRAME_REVIEW/index.json', 'docs/R29_NATIVE_FRAME_REVIEW/observations.json']
    report = {'schema': 're.bow.native-frame-python-tests-r29/1', 'passed': result.testsRun - len(result.failures) - len(result.errors), 'failed': len(result.failures) + len(result.errors), 'scope': '408 actual PNGs and their source hashes, alpha bounds, native ticks, fixed camera/pivot and separate visual-review receipts; no original-game action certification.', 'sourceFiles': [{'path': path, 'sha256': hashlib.sha256((ROOT / path).read_bytes()).hexdigest()} for path in paths]}
    (ROOT / 'docs/R29_NATIVE_FRAMES_TESTS.json').write_text(json.dumps(report, indent=2) + '\n')
    raise SystemExit(0 if result.wasSuccessful() else 1)
