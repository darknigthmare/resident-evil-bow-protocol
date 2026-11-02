#!/usr/bin/env python3
"""Check preserved native inputs, complete source timelines and lossless R33 media."""
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r33/native'
manifest = json.loads((PACK / 'manifest.json').read_bytes())
review = json.loads((PACK / 'review/observations.json').read_bytes())


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def checked(record):
    path = (ROOT / record['path']).resolve()
    if not path.is_relative_to(ROOT):
        raise AssertionError('Source path leaves repository')
    raw = path.read_bytes()
    if sha(raw) != record['sha256'] or record.get('bytes', len(raw)) != len(raw):
        raise AssertionError('Source bytes differ: ' + record['path'])
    return raw


def load_script(filename, name):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class NativeR33(unittest.TestCase):
    def test_01_inputs_reproduce_exact_native_members(self):
        result = load_script('prepare-native-r33.py', 'native_inputs_r33').prepare(check=True)
        self.assertEqual(result, {'newBodyIdentities': 3, 'sourceBodyVariants': 4, 'plannedBodyViews': 16,
                                  'newFullSourceClips': 6, 'plannedNativeFrames': 1270})

    def test_02_three_body_identities_are_new_to_library(self):
        old = set()
        for item in json.loads((ROOT / 'modules/fidelity-r30/native/manifest.json').read_bytes())['lots']:
            old.update(entry['subjectId'] for entry in json.loads(checked(item))['entries'])
        new = {entry['subjectId'] for entry in manifest['entries'] if entry['kind'] == 'native-static-pose'}
        self.assertEqual(new, {'re0-zombie', 're5-chainsaw-majini', 're5-executioner'})
        self.assertTrue(new.isdisjoint(old))

    def test_03_every_native_source_has_unchanged_bytes(self):
        records = {}
        for entry in manifest['entries']:
            for value in entry['nativeSource'].values():
                values = value if isinstance(value, list) else [value]
                for item in values:
                    if isinstance(item, dict) and item.get('path'):
                        records[item['path']] = item
        for record in records.values():
            checked(record)
        self.assertGreater(len(records), 35)

    def test_04_all_rendered_pngs_alpha_framed_and_bound(self):
        for entry in manifest['entries']:
            for frame in entry['frames'] + ([entry['endpoint']] if entry.get('endpoint') else []):
                checked(frame)
                with Image.open(ROOT / frame['path']) as image:
                    self.assertEqual(image.mode, 'RGBA')
                    self.assertEqual(image.size, (frame['width'], frame['height']))
                    bounds = image.getchannel('A').getbbox()
                    self.assertIsNotNone(bounds)
                    self.assertGreater(bounds[0], 0)
                    self.assertGreater(bounds[1], 0)
                    self.assertLess(bounds[2], image.width)
                    self.assertLess(bounds[3], image.height)
                    self.assertGreater(frame.get('visiblePixels', frame.get('occupiedPixels')), 40)

    def test_05_all_new_motion_timeline_keys_complete(self):
        sequences = [entry for entry in manifest['entries'] if entry['kind'] == 'native-sequence' and not entry.get('reusedPublishedFrames')]
        self.assertEqual(sum(entry['frameCount'] for entry in sequences), 1270)
        self.assertEqual(len(sequences), 12)
        for entry in sequences:
            self.assertEqual(entry['sampleRate'], 60)
            self.assertTrue(entry['fullNativeDuration'])
            self.assertEqual(len(entry['sourceNativeSampleTicks']), entry['frameCount'])
            self.assertAlmostEqual(entry['durationSeconds'] * 60, entry['frameCount'])
            self.assertEqual(entry['endpoint']['seconds'], entry['durationSeconds'])
            for index, frame in enumerate(entry['frames']):
                self.assertEqual(frame['ticks'], entry['sourceNativeSampleTicks'][index])
                self.assertAlmostEqual(frame['seconds'], index / 60)

    def test_06_opposing_cameras_are_actual_distinct_views(self):
        sequences = [entry for entry in manifest['entries'] if entry['kind'] == 'native-sequence']
        for clip in {entry['clipId'] for entry in sequences}:
            pair = [entry for entry in sequences if entry['clipId'] == clip]
            self.assertEqual({entry['sourceFacing'] for entry in pair}, {'left', 'right'})
            self.assertEqual({entry['recipe']['cameraAngle'] for entry in pair}, {90, 270})
            self.assertTrue(all(entry['canMirror'] is False for entry in pair))
            self.assertNotEqual(pair[0]['frames'][0]['rgbaSha256'], pair[1]['frames'][0]['rgbaSha256'])

    def test_07_lossless_atlases_and_contacts_reproduce(self):
        result = load_script('pack-native-r33.py', 'native_pack_r33').pack(check=True)
        self.assertEqual(result, {'newAtlasCount': 58, 'contacts': 10, 'reviewSampleImages': 136})

    def test_08_review_has_actual_body_and_scene_samples(self):
        self.assertEqual(len(review['bodies']), 4)
        self.assertEqual(len(review['nativeScenes']), 6)
        self.assertEqual(review['reviewedContactSamplesTotal'], 156)
        for observation in review['bodies'] + review['nativeScenes'] + [review['neutralReview']]:
            checked(observation['contact'])
            self.assertEqual(len(observation['samples']), observation['reviewedContactSamples'])
            for sample in observation['samples']:
                checked(sample)

    def test_09_reused_marine_loop_is_not_counted_as_new_media(self):
        rows = [entry for entry in manifest['entries'] if entry.get('reusedPublishedFrames')]
        self.assertEqual(len(rows), 2)
        self.assertEqual(sum(entry['frameCount'] for entry in rows), 300)
        original = json.loads(checked(review['neutralReview']['sourceManifest']))
        for row in rows:
            previous = next(entry for entry in original['entries'] if entry['id'] == row['publishedSourceEntryId'])
            self.assertEqual(row['frames'], previous['frames'])
            self.assertEqual(row['endpoint'], previous['endpoint'])
            self.assertEqual(row['nativeSource'], previous['nativeSource'])
            self.assertEqual(row['variantFamilyId'], 'r33-sea-creeper-pc-2013-observed-swimming-loop')
            self.assertEqual(row['variantHabitat'], 'aquatic')
            self.assertFalse(row['sourceActionCertified'])
            self.assertFalse(row['originalIdleActionCertified'])

    def test_10_reviewed_metadata_applied_reproducibly(self):
        result = load_script('build-native-r33.py', 'native_build_r33').applied(manifest)
        self.assertEqual(result, manifest)
        policy = review['neutralReview']['continuityPolicy']
        measures = review['neutralReview']['measurements']
        self.assertLessEqual(measures['playbackSeamBodyHeightRatio'], policy['maximumLastToFirstBodyHeightRatio'])
        self.assertLessEqual(measures['playbackSeamToMaximumAdjacentRatio'], policy['maximumLastToFirstToAdjacentRatio'])

    def test_11_actions_cinematic_roles_and_target_admission_held(self):
        self.assertFalse(manifest['canonicalFidelityCertified'])
        self.assertFalse(manifest['sourceFilesRewritten'])
        for entry in manifest['entries']:
            self.assertFalse(entry['admittedTargetEdition'])
            self.assertEqual(entry['admittedCombatStates'], [])
            self.assertFalse(entry['originalGameFrames'])
            self.assertFalse(entry['canonicalFidelityCertified'])
            self.assertFalse(entry['actionVerified'])
            if not entry.get('reusedPublishedFrames'):
                self.assertFalse(entry['fightingPoseReviewed'])
                self.assertIn(entry['actionIdentity'], ['unassigned', 'unassigned-source-pose'])
            self.assertFalse(entry['recipe']['geometryMirrored'])
            self.assertFalse(entry['recipe'].get('sourceGeometryEdited', entry['recipe'].get('modelTransformsChanged', True)))

    def test_12_static_body_material_and_weapon_gaps_retained(self):
        poses = [entry for entry in manifest['entries'] if entry['kind'] == 'native-static-pose']
        for entry in poses:
            self.assertEqual(entry['frameCount'], 1)
            self.assertEqual(entry['sampleRate'], 0)
            self.assertEqual(entry['durationSeconds'], 0)
            self.assertTrue(entry['knownAppearanceGaps'])
            self.assertTrue(entry['sourcePoseRetained'])
            self.assertFalse(entry['recipe']['poseChanged'])
            self.assertTrue(entry['recipe']['cameraOrbitOnly'])
        self.assertEqual(len({entry['modelId'] for entry in poses}), 4)
        self.assertEqual(len(poses), 16)


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(NativeR33)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    paths = ['tests/test_native_r33.py', 'scripts/prepare-native-r33.py', 'scripts/render-native-r33.mjs',
             'scripts/pack-native-r33.py', 'scripts/build-native-r33.py',
             'modules/fidelity-r33/native/manifest.json', 'modules/fidelity-r33/native/inputs.json',
             'modules/fidelity-r33/native/review/observations.json', 'modules/fidelity-r33/native/review/contacts.json']
    report = {'schema': 're.bow.native-tests-r33/1', 'passed': result.testsRun - len(result.failures) - len(result.errors),
              'failed': len(result.failures) + len(result.errors),
              'checks': [{'name': name.id(), 'pass': False, 'error': detail} for name, detail in result.failures + result.errors],
              'sourceFiles': [{'path': path, 'sha256': sha((ROOT / path).read_bytes())} for path in paths],
              'scope': 'Actual native source/archive bytes, complete sixtyHz key timelines, every rendered alpha PNG, exact lossless atlas/contact pixels, reviewed marine reuse and held original-action/edition claims.'}
    (ROOT / 'docs/R33_NATIVE_TESTS.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    raise SystemExit(0 if result.wasSuccessful() else 1)
