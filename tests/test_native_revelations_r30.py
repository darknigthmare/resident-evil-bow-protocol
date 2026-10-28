"""Native full-duration frame, atlas and visual-admission checks for the R30 source lot."""
import copy
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r30/native/revelations'
MANIFEST = PACK / 'manifest.json'
SPEC = importlib.util.spec_from_file_location('native_review_r30', ROOT / 'scripts/review-native-revelations-r30.py')
REVIEW = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(REVIEW)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def checked(record):
    path = (ROOT / record['path']).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file():
        raise AssertionError('Source path absent/external')
    raw = path.read_bytes()
    if 'bytes' in record and len(raw) != record['bytes']:
        raise AssertionError('Changed source size')
    if sha(raw) != record['sha256']:
        raise AssertionError('Changed source digest: ' + record['path'])
    return path


class NativeRevelations(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads(MANIFEST.read_text())

    def test_counts_and_exact_source_times(self):
        manifest = self.manifest
        self.assertEqual(manifest['schema'], 're.bow.native-2d-lot-r30/1')
        self.assertEqual(manifest['counts']['subjects'], 6)
        self.assertEqual(manifest['counts']['nativeRenderedFrames'], 2532)
        self.assertEqual(manifest['counts']['endpointReferenceFrames'], 12)
        self.assertEqual(manifest['counts']['orientedSequences'], 12)
        self.assertEqual(manifest['counts']['atlases'], 104)
        inputs = json.loads(checked(manifest['inputs']).read_text())
        old_inputs = json.loads(checked(inputs['sourceInput']).read_text())
        for job in inputs['jobs']:
            original = next(item for item in old_inputs['jobs'] if item['id'] == job['id'])
            expected = [t for t in original['sourceClip']['nativeKeyTimesTicks'] if int(t) >= 0][:-1]
            self.assertEqual(job['nativeSampleTicks'], expected)
            self.assertEqual(len(expected), round(int(job['sourceClip']['keyTimeEnd']) / job['sourceClip']['ticksPerSecond'] * 60))
        checked(manifest['renderer'])
        self.assertFalse(manifest['sourceFilesRewritten'])

    def test_original_model_clip_material_and_texture_bytes(self):
        for entry in self.manifest['entries'][::2]:
            native = entry['nativeSource']
            for key in ['catalog', 'model', 'clip', 'bindings']:
                checked(native[key])
            for texture in native['textures']:
                checked(texture)
            self.assertEqual(native['clip']['sha256'], native['publishedClip']['sha256'])
            proof = json.loads(checked(native['bindings']).read_text())
            self.assertEqual(proof['body']['sourceSha256'], native['model']['sha256'])
            self.assertEqual(proof['sourceArchiveSha256'], native['archive']['sha256'])
        context = json.loads((PACK / 'research/sources.json').read_text())
        captures = [item for item in context if item.get('path')]
        self.assertEqual(len(captures), 6)
        for capture in captures:
            self.assertEqual(capture['status'], 200)
            self.assertFalse(capture['supportsActionIdentity'])
            self.assertEqual(sha(gzip.decompress((ROOT / capture['path']).read_bytes())), capture['sha256'])

    def test_every_native_png_decodes_and_is_wholly_framed(self):
        count = 0
        for entry in self.manifest['entries']:
            boxes = []
            for frame in entry['frames'] + [entry['endpoint']]:
                with Image.open(checked(frame)) as im:
                    im.load()
                    self.assertEqual(im.mode, 'RGBA')
                    self.assertEqual(im.size, (384, 384))
                    alpha = im.getchannel('A')
                    self.assertEqual(alpha.getbbox(), (frame['bounds']['x'], frame['bounds']['y'],
                        frame['bounds']['x'] + frame['bounds']['width'], frame['bounds']['y'] + frame['bounds']['height']))
                    self.assertIsNone(alpha.crop((0, 0, 384, 1)).getbbox())
                    self.assertIsNone(alpha.crop((0, 383, 384, 384)).getbbox())
                    self.assertIsNone(alpha.crop((0, 0, 1, 384)).getbbox())
                    self.assertIsNone(alpha.crop((383, 0, 384, 384)).getbbox())
                    self.assertEqual(sha(im.tobytes()), frame['rgbaSha256'])
                    self.assertGreater(sum(1 for value in alpha.tobytes() if value), 40)
                    boxes.append(alpha.getbbox())
                self.assertEqual(frame['pivot'], entry['pivot'])
                count += 1
            union = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
            b = entry['referenceBounds']
            self.assertEqual(union, (b['x'], b['y'], b['x'] + b['width'], b['y'] + b['height']))
        self.assertEqual(count, 2544)

    def test_every_atlas_cell_preserves_all_native_rgba_pixels(self):
        atlas_path = None
        atlas = None
        atlas_count = set()
        count = 0
        for entry in self.manifest['entries']:
            for frame in entry['frames']:
                descriptor = frame['atlas']
                if descriptor['path'] != atlas_path:
                    if atlas:
                        atlas.close()
                    atlas_path = descriptor['path']
                    atlas = Image.open(checked(descriptor))
                    atlas.load()
                    self.assertEqual(atlas.mode, 'RGBA')
                    self.assertEqual(atlas.size, (descriptor['width'], descriptor['height']))
                    self.assertLessEqual(max(atlas.size), 1920)
                    atlas_count.add(atlas_path)
                rect = frame['rect']
                self.assertEqual((rect['width'], rect['height']), (384, 384))
                with Image.open(ROOT / frame['path']) as im:
                    self.assertEqual(atlas.crop((rect['x'], rect['y'], rect['x'] + 384, rect['y'] + 384)).tobytes(), im.tobytes())
                count += 1
        if atlas:
            atlas.close()
        self.assertEqual(count, 2532)
        self.assertEqual(len(atlas_count), 104)
        checked(self.manifest['atlasRecipe']['script'])
        self.assertFalse(self.manifest['atlasRecipe']['rgbaPixelsChanged'])

    def test_source_cadence_camera_and_multibone_motion(self):
        for entry in self.manifest['entries']:
            self.assertEqual(entry['sampleRate'], 60)
            self.assertTrue(entry['fullNativeDuration'])
            self.assertAlmostEqual(entry['durationSeconds'], entry['frameCount'] / 60)
            self.assertEqual(entry['frameCount'], len(entry['frames']))
            self.assertEqual(len({f['quantizedSkinnedVertexSha256'] for f in entry['frames']}), len(entry['frames']))
            self.assertTrue(entry['recipe']['animationCameraFixed'])
            self.assertTrue(entry['recipe']['nativeSourceKeySamples'])
            self.assertFalse(entry['recipe']['geometryMirrored'])
            self.assertFalse(entry['recipe']['sourceGeometryEdited'])
            self.assertFalse(entry['recipe']['framesInterpolatedFromPng'])
            self.assertFalse(entry['canMirror'])
            self.assertEqual(entry['sourceFacing'], 'left' if entry['recipe']['cameraAngle'] == 90 else 'right')
            for i, frame in enumerate(entry['frames']):
                self.assertAlmostEqual(frame['seconds'], i / 60, places=12)
                self.assertEqual(frame['ticks'], entry['sourceNativeSampleTicks'][i])
            self.assertAlmostEqual(entry['endpoint']['seconds'], entry['durationSeconds'])

    def test_observed_neutral_variants_remain_distinct_from_original_idle(self):
        neutral_subjects = set()
        for entry in self.manifest['entries']:
            self.assertFalse(entry['admittedTargetEdition'])
            self.assertEqual(entry['admittedCombatStates'], [])
            self.assertFalse(entry['actionVerified'])
            self.assertFalse(entry['sourceActionCertified'])
            self.assertFalse(entry['originalIdleActionCertified'])
            self.assertFalse(entry['canonicalFidelityCertified'])
            self.assertFalse(entry['originalGameFrames'])
            checked(entry['visualReview'])
            if entry['selectablePresentationVariant']:
                neutral_subjects.add(entry['subjectId'])
                self.assertEqual(entry['actionIdentity'], 'observed-neutral-loop')
                self.assertTrue(entry['observedNeutralLoopReviewed'])
                self.assertTrue(entry['fightingPoseReviewed'])
                self.assertTrue(entry['fullBodyReviewed'])
                self.assertTrue(entry['continuityVerified'])
                self.assertEqual(entry['variantCombatStates'], ['idle'])
                self.assertEqual(entry['variantFamilyId'], entry['subjectId'] + '--pc-hd2013-neutral')
                self.assertEqual(entry['knownAppearanceGaps'], [])
                self.assertLessEqual(entry['continuityMeasurements']['playbackSeamBodyHeightRatio'], .01)
                self.assertLessEqual(entry['continuityMeasurements']['playbackSeamToMaximumAdjacentRatio'], 1.05)
                self.assertGreaterEqual(entry['continuityMeasurements']['nativeMovingBoneCount'], 3)
            else:
                self.assertEqual(entry['subjectId'], 'rerev-wall-blister')
                self.assertEqual(entry['actionIdentity'], 'unassigned')
                self.assertEqual(entry['variantCombatStates'], [])
                self.assertFalse(entry['fightingPoseReviewed'])
        self.assertEqual(len(neutral_subjects), 5)
        self.assertEqual(self.manifest['counts']['admittedIdleSequences'], 0)

    def test_manual_contact_bindings_and_review_reproduction(self):
        self.assertEqual(REVIEW.apply(copy.deepcopy(self.manifest)), self.manifest)
        index = json.loads((PACK / 'review/contacts.json').read_text())
        self.assertEqual(len(index['contacts']), 6)
        for contact in index['contacts']:
            checked(contact['contact'])
            self.assertEqual(len(contact['samples']), 20)
            for sample in contact['samples']:
                checked(sample['image'])
        review = json.loads((PACK / 'review/observations.json').read_text())
        self.assertEqual(len(review['observations']), 6)
        for observation in review['observations']:
            self.assertFalse(observation['sourceActionCertified'])
            self.assertFalse(observation['originalIdleActionCertified'])
            self.assertGreaterEqual(len(observation['notes']), 150)

    def test_forged_target_edition_or_changed_clip_cannot_reuse_reviews(self):
        data = copy.deepcopy(self.manifest)
        data['entries'][0]['admittedTargetEdition'] = True
        with self.assertRaises(ValueError):
            REVIEW.apply(data)
        data = copy.deepcopy(self.manifest)
        data['entries'][0]['nativeSource']['clip']['sha256'] = '0' * 64
        with self.assertRaises(ValueError):
            REVIEW.apply(data)


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(NativeRevelations)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    paths = ['tests/test_native_revelations_r30.py', 'scripts/render-native-revelations-r30.mjs',
             'scripts/pack-native-revelations-r30.py', 'scripts/review-native-revelations-r30.py',
             'modules/fidelity-r30/native/revelations/manifest.json',
             'modules/fidelity-r30/native/revelations/review/observations.json',
             'modules/fidelity-r30/native/revelations/research/sources.json']
    report = {'schema': 're.bow.native-revelations-tests-r30/1',
              'passed': result.testsRun - len(result.failures) - len(result.errors),
              'failed': len(result.failures) + len(result.errors),
              'decodedNativePngs': 2544, 'exactAtlasCells': 2532, 'losslessAtlases': 104,
              'sourceFiles': [{'path': p, 'sha256': sha((ROOT / p).read_bytes())} for p in paths],
              'scope': 'Full native sixty-Hz sampling, original bytes and complete framing of all native PNGs, every lossless atlas cell, explicit source edition and optional observed-loop admission. Original game action certification remains excluded.'}
    (ROOT / 'docs/R30_NATIVE_REVELATIONS_TESTS.json').write_text(json.dumps(report, indent=2) + '\n')
    raise SystemExit(0 if result.wasSuccessful() else 1)
