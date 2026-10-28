"""Exercise the actual source scenes, native images, atlas cells and repertoire limits."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from zipfile import ZipFile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r31/motion'


def read(name):
    return json.loads((ROOT / name).read_text())


def checked(record):
    target = (ROOT / record['path']).resolve()
    if not target.is_relative_to(ROOT) or not target.is_file():
        raise AssertionError('Missing/external proof')
    raw = target.read_bytes()
    if record.get('bytes') is not None:
        assert len(raw) == record['bytes'], record['path']
    assert hashlib.sha256(raw).hexdigest() == record['sha256'], record['path']
    return raw


class MotionCommands(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.world = read('modules/fidelity-r31/motion/manifest.json')
        cls.follow = read('modules/fidelity-r31/motion/root-follow-manifest.json')
        cls.commands = read('modules/fidelity-r31/commands/manifest.json')
        cls.all_entries = cls.world['entries'] + cls.follow['entries']

    def test_original_archive_members_and_full_native_time_cadence(self):
        inputs = read('modules/fidelity-r31/motion/inputs.json')
        self.assertEqual(len(inputs['jobs']), 8)
        with tempfile.TemporaryDirectory(prefix='bow-r31-native-archive-') as folder:
            archives = {}
            for job in inputs['jobs']:
                source = checked(job['clipFile'])
                entry, clip = job['entry'], job['sourceClip']
                source_base = (ROOT / job['sourceCatalog']['path']).parent / entry['base']
                record = entry['archive']
                if record['sha256'] not in archives:
                    if record.get('path'):
                        archive_path = source_base / record['path']
                        data = archive_path.read_bytes()
                        self.assertEqual(hashlib.sha256(data).hexdigest(), record['sha256'])
                        self.assertEqual(len(data), record['bytes'])
                    else:
                        archive_path = Path(folder) / (record['sha256'] + '.zip')
                        total, combined = 0, hashlib.sha256()
                        with archive_path.open('wb') as output:
                            for index, part in enumerate(record['parts'], 1):
                                self.assertEqual(part['index'], index)
                                self.assertEqual(part['byteOffset'], total)
                                part_hash, size = hashlib.sha256(), 0
                                with (source_base / part['path']).open('rb') as stream:
                                    while block := stream.read(1024 * 1024):
                                        output.write(block); part_hash.update(block); combined.update(block); size += len(block)
                                self.assertEqual(size, part['bytes'])
                                self.assertEqual(part_hash.hexdigest(), part['sha256'])
                                total += size
                        self.assertEqual(total, record['bytes'])
                        self.assertEqual(combined.hexdigest(), record['sha256'])
                    archives[record['sha256']] = archive_path
                with ZipFile(archives[record['sha256']]) as archive:
                    self.assertEqual(archive.read(clip['member']), source)
                ticks = [int(value) for value in job['nativeSampleTicks']]
                self.assertEqual(ticks, [index * clip['ticksPerSecond'] // 60 for index in range(len(ticks))])
                self.assertEqual(int(clip['keyTimeEnd']), len(ticks) * clip['ticksPerSecond'] // 60)

    def test_every_production_png_decodes_with_bound_dimensions_alpha_and_no_crop(self):
        count = 0
        for entry in self.all_entries:
            for frame in entry['frames'] + [entry['endpoint']]:
                raw = checked(frame)
                with Image.open(ROOT / frame['path']) as image:
                    image.load()
                    self.assertEqual(image.mode, 'RGBA')
                    self.assertEqual(image.size, (384, 384))
                    alpha = image.getchannel('A')
                    bounds = alpha.getbbox()
                    self.assertIsNotNone(bounds)
                    self.assertGreater(sum(value > 0 for value in alpha.getdata()), 40)
                    self.assertGreater(bounds[0], 0); self.assertGreater(bounds[1], 0)
                    self.assertLess(bounds[2], 384); self.assertLess(bounds[3], 384)
                    self.assertEqual(hashlib.sha256(image.tobytes()).hexdigest(), frame['rgbaSha256'])
                    self.assertEqual(frame['edgePixels'], 0)
                    count += 1
        self.assertEqual(count, 2284)

    def test_all_lossless_atlas_cells_equal_their_original_rgba_pixels(self):
        cells = 0
        for entry in self.all_entries:
            groups = {}
            for frame in entry['frames']:
                groups.setdefault(frame['atlas']['path'], []).append(frame)
            for name, frames in groups.items():
                checked(frames[0]['atlas'])
                with Image.open(ROOT / name) as atlas:
                    atlas.load(); self.assertLessEqual(max(atlas.size), 1920)
                    for frame in frames:
                        rect = frame['rect']
                        cell = atlas.crop((rect['x'], rect['y'], rect['x'] + 384, rect['y'] + 384))
                        with Image.open(ROOT / frame['path']) as original:
                            self.assertEqual(cell.tobytes(), original.tobytes())
                        cells += 1
        self.assertEqual(cells, 2264)

    def test_two_real_camera_sides_and_no_sparse_scene_or_idle_promotion(self):
        groups = {}
        for entry in self.world['entries']:
            groups.setdefault(entry['subjectId'] + entry['clipId'], []).append(entry)
            self.assertEqual(entry['sampleRate'], 60)
            self.assertAlmostEqual(entry['durationSeconds'] * 60, entry['frameCount'])
            self.assertTrue(entry['fullNativeDuration'])
            self.assertFalse(entry['canMirror'])
            self.assertFalse(entry['recipe']['geometryMirrored'])
            self.assertFalse(entry['recipe']['framesInterpolatedFromPng'])
            self.assertFalse(entry['recipe']['sourceGeometryEdited'])
            self.assertTrue(entry['recipe']['animationCameraFixed'])
            self.assertFalse(entry['admittedTargetEdition'])
            self.assertEqual(entry['admittedCombatStates'], [])
            self.assertFalse(entry['originalGameFrames'])
            self.assertFalse(entry['sourceActionCertified'])
            self.assertEqual(entry['actionIdentity'], 'unassigned')
        self.assertEqual(len(groups), 8)
        for sides in groups.values():
            self.assertEqual({row['sourceFacing'] for row in sides}, {'left', 'right'})
            self.assertNotEqual(sides[0]['frames'][0]['rgbaSha256'], sides[1]['frames'][0]['rgbaSha256'])
            self.assertEqual({row['recipe']['cameraAngle'] for row in sides}, {90, 270})

    def test_root_follow_only_tracks_real_root_and_keeps_world_geometry_measurements(self):
        by_id = {row['id']: row for row in self.world['entries']}
        self.assertEqual(len(self.follow['entries']), 4)
        for entry in self.follow['entries']:
            source = by_id[entry['sourceWorldEntryId']]
            self.assertFalse(entry['rootFollow']['nativeRootMotionRemovedFromSource'])
            self.assertFalse(entry['rootFollow']['sourceGeometryChanged'])
            self.assertFalse(entry['recipe']['animationCameraFixed'])
            self.assertTrue(entry['recipe']['cameraTracksNativeRootTranslation'])
            self.assertTrue(entry['recipe']['cameraScaleFixed'])
            self.assertTrue(entry['recipe']['frustumCullingDisabledForAnimatedSkin'])
            self.assertEqual(len(entry['rootFollow']['trajectory']), entry['frameCount'] + 1)
            for index, frame in enumerate(entry['frames'] + [entry['endpoint']]):
                original = source['frames'][index] if index < source['frameCount'] else source['endpoint']
                self.assertEqual(frame['quantizedSkinnedVertexSha256'], original['quantizedSkinnedVertexSha256'])
                self.assertEqual(frame['nativeRootPosition'], entry['rootFollow']['trajectory'][index]['position'])
                delta = [value - first for value, first in zip(frame['nativeRootPosition'], entry['rootFollow']['sourceRootAtStart'])]
                for axis in range(3):
                    self.assertAlmostEqual(frame['cameraPosition'][axis], entry['recipe']['cameraPosition'][axis] + delta[axis], places=9)
            self.assertGreater(entry['frames'][0]['bounds']['width'], source['frames'][0]['bounds']['width'])

    def test_actual_observation_contacts_bind_two_hundred_reviewed_views(self):
        observations = read('modules/fidelity-r31/motion/review/observations.json')
        self.assertEqual(observations['worldContactViewsInspected'], 160)
        self.assertEqual(observations['rootFollowContactViewsInspected'], 40)
        total = 0
        for row in observations['observations']:
            checked(row['worldContact'])
            if row['rootFollowContact']:
                checked(row['rootFollowContact'])
            for sample in row['worldSamples'] + row['rootFollowSamples']:
                checked(sample); total += 1
            self.assertFalse(row['originalGameActionAssigned'])
            self.assertFalse(row['originalGameCinematicAssigned'])
            self.assertFalse(row['combatStateAssigned'])
        self.assertEqual(total, 200)
        for entry in self.all_entries:
            checked(entry['observationEvidence'])

    def test_all_389_uids_and_3460_existing_adapted_commands_are_audited(self):
        roster = read('data/roster.json')
        profiles = {row['uid']: row for row in roster['fighters']}
        profiles.update({row['uid']: row for row in read('data/catalog-expansion-v070.json')['fighters']})
        self.assertEqual({row['id'] for row in self.commands['entries']}, {row['id'] for row in roster['catalog']})
        self.assertEqual(len(self.commands['entries']), 389)
        self.assertEqual(self.commands['counts']['adaptedCommands'], 3460)
        for row in self.commands['entries']:
            source = profiles.get(row['id'], {}).get('combat', {}).get('moves', {})
            self.assertEqual(len(source), row['adaptedCommandCount'])
            for adapted in row['adaptedCommands']:
                original = source[adapted['slot']]
                raw = (json.dumps(original, ensure_ascii=False, indent=2) + '\n').encode()
                self.assertEqual(hashlib.sha256(raw).hexdigest(), adapted['sourceRecordSha256'])
                self.assertTrue(adapted['authoredPrototypeCommand'])
                self.assertFalse(adapted['originalInputCommandVerified'])
                self.assertFalse(adapted['animationAssignedFromObservedClip'])

    def test_documentary_claims_are_linked_to_the_exact_retained_manifest(self):
        total = 0
        for input_ in self.commands['inputs']:
            checked(input_)
        for row in self.commands['entries']:
            for claim in row['documentaryMoveClaims']:
                source = read(claim['manifest'])
                original = next(item for item in source['claims'] if item['id'] == claim['claimId'])
                self.assertEqual(claim['label'], original['label'])
                self.assertEqual(claim['polarity'], original.get('polarity', 'DOCUMENTED_WITH_SCOPE'))
                self.assertEqual(claim['conditions'], original.get('conditions', []))
                self.assertEqual(claim['limitation'], original.get('limitation', ''))
                self.assertFalse(claim['originalInputCommandVerified'])
                total += 1
        self.assertEqual(total, self.commands['counts']['documentaryMoveClaimLinks'])

    def test_intros_outros_outcomes_and_contexts_remain_unpromoted(self):
        for row in self.commands['entries']:
            for key in ('officialCommandInventoryComplete', 'certifiedIntro', 'certifiedOutro', 'certifiedVictory', 'certifiedDefeat'):
                self.assertFalse(row[key])
            self.assertEqual(row['originalGameClipAssignments'], [])
        chunk = next(row for row in self.commands['entries'] if row['id'] == 'rerev-chunk-ooze')
        self.assertTrue(chunk['contextOnlyEvolutionIdentity'])
        delivery = read('modules/fidelity-r31/motion/delivery.json')
        self.assertEqual(set(delivery['taskIds']), {'R20-09', 'G-COMMANDES', 'G-CINEMATIQUES', 'G-MANCHES'})
        self.assertEqual({row['id'] for row in delivery['identities']}, {row['id'] for row in self.commands['entries']})
        for task in delivery['taskIds']:
            self.assertTrue(delivery['taskUpdates'][task]['remaining'])
        self.assertFalse(delivery['canonicalFidelityCertified'])

    def test_builders_reproduce_current_source_and_documentary_outputs(self):
        for command in ([sys.executable, 'scripts/prepare-native-motion-r31.py', '--check'],
                        [sys.executable, 'scripts/build-motion-repertoire-r31.py', '--check'],
                        [sys.executable, 'scripts/pack-native-motion-r31.py', '--check'],
                        [sys.executable, 'scripts/pack-native-motion-r31.py', '--check', '--root-follow']):
            result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(MotionCommands)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    names = ['tests/test_motion_commands_r31.py', 'scripts/prepare-native-motion-r31.py',
        'scripts/render-native-motion-r31.mjs', 'scripts/render-motion-root-follow-r31.mjs',
        'scripts/pack-native-motion-r31.py', 'scripts/build-motion-repertoire-r31.py',
        'modules/fidelity-r31/motion/manifest.json', 'modules/fidelity-r31/motion/root-follow-manifest.json',
        'modules/fidelity-r31/motion/renderer.js', 'modules/fidelity-r31/motion/root-follow-renderer.js',
        'modules/fidelity-r31/motion/review/observations.json', 'modules/fidelity-r31/commands/manifest.json']
    report = {'schema': 're.bow.motion-command-tests-r31/1',
        'passed': result.testsRun - len(result.errors) - len(result.failures), 'failed': len(result.errors) + len(result.failures),
        'nativePngsDecoded': 2284, 'nativeAtlasCellsComparedExactly': 2264,
        'sourceFiles': [{'path': name, 'sha256': hashlib.sha256((ROOT / name).read_bytes()).hexdigest()} for name in names],
        'scope': 'Actual archive members, complete sixtyHz native frames, every decodedPNG/exactatlas cell, camera-only root following, all389 identities and existing3460 authored commands; no original-game action/cinematic certification.'}
    (ROOT / 'docs/R31_MOTION_TESTS.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'passed': report['passed'], 'failed': report['failed']}))
    raise SystemExit(0 if result.wasSuccessful() else 1)
