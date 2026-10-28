"""Check real native source/image contracts without manufacturing missing animation data."""
import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import unittest

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
LOT = 'modules/fidelity-r30/native/other-games'


def read(path):
    return json.loads((ROOT / path).read_text())


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def verified(record):
    path = (ROOT / record['path']).resolve()
    if not path.is_relative_to(ROOT):
        raise AssertionError('Source path leaves the checkout.')
    raw = path.read_bytes()
    if sha(raw) != record['sha256'] or record.get('bytes', len(raw)) != len(raw):
        raise AssertionError('Source evidence changed: ' + str(path))
    return raw


class NativeOtherR30(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = read(LOT + '/manifest.json')
        cls.renders = read(LOT + '/renders.json')
        cls.portraits = read(LOT + '/portrait-renders.json')
        cls.motion = read(LOT + '/motion-manifest.json')

    def test_source_meshes_materials_and_textures_are_retained(self):
        for source in self.renders['entries'] + self.portraits['entries']:
            verified(source['sourceCatalog'])
            verified(source['model'])
            if source['materials']:
                verified(source['materials'])
            for texture in source['textures']:
                verified(texture)
            self.assertEqual(source['nativeClipCount'], 0)
            self.assertTrue(source['sourcePoseRetained'])
            self.assertTrue(source['sourceTransformsRetained'])
            self.assertFalse(source['sourceBytesRewritten'])
            self.assertFalse(source['recipe']['geometryMirrored'])
            self.assertFalse(source['recipe']['poseChanged'])
            self.assertFalse(source['recipe']['modelTransformsChanged'])

    def test_every_native_png_decodes_and_has_uncropped_alpha_bounds(self):
        records = [view for source in self.renders['entries'] + self.portraits['entries'] for view in source['views']]
        records += [frame for entry in self.motion['entries'] for frame in entry['frames'] + [entry['endpoint']]]
        self.assertEqual(len(records), 640)
        for record in records:
            image = Image.open(io.BytesIO(verified(record))).convert('RGBA')
            self.assertEqual(image.size, (record['width'], record['height']))
            alpha = image.getchannel('A')
            bounds = alpha.getbbox()
            self.assertIsNotNone(bounds)
            self.assertGreater(bounds[0], 0)
            self.assertGreater(bounds[1], 0)
            self.assertLess(bounds[2], image.width)
            self.assertLess(bounds[3], image.height)
            observed = dict(x=bounds[0], y=bounds[1], width=bounds[2]-bounds[0], height=bounds[3]-bounds[1])
            self.assertEqual(observed, record['bounds'])
            self.assertEqual(record['edgePixels'], 0)

    def test_two_real_opposing_static_stances_do_not_become_animated_idles(self):
        playable = [entry for entry in self.manifest['entries'] if entry['admittedCombatStates']]
        self.assertEqual({entry['subjectId'] for entry in playable}, {'re0-stinger', 're1-zombie'})
        self.assertEqual(len(playable), 4)
        for uid in ('re0-stinger', 're1-zombie'):
            pair = [entry for entry in playable if entry['subjectId'] == uid]
            self.assertEqual({entry['sourceFacing'] for entry in pair}, {'left', 'right'})
            self.assertNotEqual(pair[0]['frames'][0]['sha256'], pair[1]['frames'][0]['sha256'])
            for entry in pair:
                self.assertEqual(entry['kind'], 'native-static-pose')
                self.assertEqual(entry['actionIdentity'], 'neutral-stance')
                self.assertEqual(entry['frameCount'], 1)
                self.assertFalse(entry['animated'])
                self.assertFalse(entry['continuityVerified'])
                self.assertTrue(entry['admittedTargetEdition'])
                self.assertTrue(entry['fullBodyReviewed'])
                self.assertTrue(entry['fightingPoseReviewed'])
                self.assertEqual(entry['knownAppearanceGaps'], [])
                self.assertFalse(entry['canMirror'])
                self.assertFalse(entry['canonicalFidelityCertified'])
        zombie = next(entry for entry in playable if entry['subjectId'] == 're1-zombie')
        self.assertIn('manteau vert', zombie['sourceVariantLabel'])
        self.assertTrue(zombie['identityCuration']['retainedCatalogCandidate'])
        self.assertTrue(zombie['identityCuration']['exactSourceVariantReviewed'])

    def test_t_poses_detached_equipment_and_candidate_ports_remain_held(self):
        for entry in self.manifest['entries']:
            if entry['kind'] != 'native-static-pose' or entry['subjectId'] in ('re0-stinger', 're1-zombie'):
                continue
            self.assertEqual(entry['admittedCombatStates'], [])
            self.assertFalse(entry['fightingPoseReviewed'])
            self.assertTrue(entry['knownAppearanceGaps'])
            self.assertEqual(entry['frameCount'], 1)
        cross_edition = [entry for entry in self.manifest['entries'] if entry.get('modelId', '').startswith('re4-')]
        self.assertEqual(len(cross_edition), 12)
        self.assertTrue(all(entry['admittedTargetEdition'] is False for entry in cross_edition))
        proto = [entry for entry in self.manifest['entries'] if entry['subjectId'] == 're0-proto-tyrant']
        self.assertTrue(all(entry['admittedTargetEdition'] is False for entry in proto))

    def test_motion_is_every_native_sixty_hz_sample_for_the_full_duration(self):
        jobs = read(LOT + '/motion-inputs.json')['jobs']
        self.assertEqual(len(jobs), 2)
        self.assertEqual(len(self.motion['entries']), 4)
        total = 0
        for entry in self.motion['entries']:
            source = next(job for job in jobs if job['subjectId'] == entry['subjectId'])
            ticks = [tick for tick in source['sourceClip']['nativeKeyTimesTicks'] if int(tick) >= 0]
            self.assertEqual([frame['ticks'] for frame in entry['frames']], ticks[:-1])
            self.assertEqual(entry['endpoint']['ticks'], ticks[-1])
            self.assertGreaterEqual(entry['frameCount'], 120)
            self.assertEqual(entry['sampleRate'], 60)
            self.assertTrue(entry['fullNativeDuration'])
            self.assertAlmostEqual(entry['durationSeconds'] * 60, entry['frameCount'], places=9)
            self.assertEqual(entry['frameCount'], len(entry['frames']))
            self.assertEqual(len({frame['sha256'] for frame in entry['frames']}), entry['frameCount'])
            for index, frame in enumerate(entry['frames']):
                self.assertAlmostEqual(frame['seconds'], index / 60, places=12)
                self.assertEqual(frame['pivot'], entry['pivot'])
            total += len(entry['frames'])
        self.assertEqual(total, 578)

    def test_motion_source_studies_are_not_promoted_to_grounded_idle(self):
        motion = [entry for entry in self.manifest['entries'] if entry['kind'] == 'native-sequence']
        self.assertEqual(len(motion), 4)
        for entry in motion:
            self.assertFalse(entry['admittedTargetEdition'])
            self.assertFalse(entry['actionVerified'])
            self.assertFalse(entry['fightingPoseReviewed'])
            self.assertFalse(entry['continuityVerified'])
            self.assertEqual(entry['actionIdentity'], 'unassigned')
            self.assertEqual(entry['admittedCombatStates'], [])
            self.assertTrue(entry['knownAppearanceGaps'])
            self.assertTrue(entry['fullBodyReviewed'])
            self.assertFalse(entry['originalGameFrames'])
            self.assertFalse(entry['canonicalFidelityCertified'])

    def test_independent_full_mesh_reconstruction_covers_all_native_motion(self):
        report = read('docs/R30_NATIVE_OTHER_MOTION_RIG_TESTS.json')
        self.assertEqual((report['passed'], report['failed']), (2, 0))
        for record in report['sourceFiles']:
            verified(record)
        self.assertEqual(sum(check['orientedPngs'] for check in report['checks']), 582)
        for check in report['checks']:
            measured = check['measurements']
            self.assertGreaterEqual(measured['nativeMovingBoneCount'], 30)
            self.assertGreater(measured['maximumAdjacentRms'], 0)
            self.assertLess(measured['playbackSeamToMaximumAdjacentRatio'], 1)
            self.assertIn('not bone semantics', measured['bottomSliceDriftScope'])

    def test_thirty_source_pages_are_actual_sha_bound_successful_captures(self):
        pages = read(LOT + '/sources.json')['entries'] + read(LOT + '/motion-sources.json')['entries']
        self.assertEqual(len(pages), 30)
        for page in pages:
            self.assertEqual(page['httpStatus'], 200)
            raw = gzip.decompress(verified(page))
            self.assertEqual(sha(raw), page['rawSha256'])
            self.assertEqual(len(raw), page['rawBytes'])
            self.assertTrue(page['title'])
        for source in self.renders['entries']:
            self.assertIn(source['sourcePage'], {page['url'] for page in pages})

    def test_missing_native_texture_has_no_fabricated_replacement(self):
        failures = read(LOT + '/render-failures.json')['entries']
        self.assertEqual(len(failures), 1)
        self.assertEqual(failures[0]['modelId'], 're5-uroboros-pc-published')
        self.assertIn('unknownmaterial', failures[0]['reason'])
        self.assertFalse(failures[0]['inventedTextureReplacement'])
        self.assertFalse(failures[0]['generatedOutput'])
        self.assertFalse(failures[0]['combatReady'])
        self.assertNotIn('re5-uroboros', {entry['subjectId'] for entry in self.manifest['entries']})

    def test_elevated_portraits_are_distinct_from_flat_combat_cameras(self):
        self.assertEqual(len(self.portraits['entries']), 3)
        for source in self.portraits['entries']:
            self.assertEqual(source['recipe']['cameraElevation'], 45)
            self.assertTrue(source['recipe']['portraitOnly'])
            static = next(entry for entry in self.renders['entries'] if entry['modelId'] == source['modelId'])
            self.assertEqual(source['model'], static['model'])
            self.assertEqual(source['textures'], static['textures'])
            self.assertEqual(static['recipe']['cameraElevation'], 0)
            self.assertTrue(all(view['angle'] in (45, 315) for view in source['views']))
        all_combat_frames = {frame['path'] for entry in self.manifest['entries'] for frame in entry['frames']}
        self.assertTrue(all(view['path'] not in all_combat_frames for source in self.portraits['entries'] for view in source['views']))

    def test_binary_fbx_axis_declarations_match_retained_sources(self):
        spec = importlib.util.spec_from_file_location('r24_fbx', ROOT / 'scripts/import-rigged-motion-r24.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        for subject in read(LOT + '/review/fbx-global-axes.json')['entries']:
            for record in subject['sources']:
                tree = module.BinaryFBX(verified(record)).parse()
                global_settings = next(node for node in tree if node['name'] == 'GlobalSettings')
                properties = next(node for node in global_settings['children'] if node['name'] == 'Properties70')
                observed = {node['properties'][0]: node['properties'][4:] for node in properties['children'] if node['name'] == 'P'}
                self.assertEqual(observed, record['properties'])
                self.assertEqual(observed['UpAxis'], [1] if record['kind'] == 'clip' else [2])

    def test_manifest_reproduces_from_actual_reviewed_source_inputs(self):
        for record in self.manifest['inputs']:
            verified(record)
        result = subprocess.run([sys.executable, 'scripts/pack-native-other-r30.py', '--check'], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(NativeOtherR30)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    files = ['tests/test_native_other_r30.py', 'scripts/pack-native-other-r30.py',
             'scripts/render-native-other-r30.mjs', 'scripts/render-native-other-motion-r30.mjs',
             'scripts/render-native-other-portraits-r30.mjs', LOT + '/manifest.json',
             LOT + '/renders.json', LOT + '/motion-manifest.json', LOT + '/portrait-renders.json',
             LOT + '/renderer.js', LOT + '/portrait-renderer.js',
             'modules/fidelity-r30/native/revelations/renderer.js']
    report = {'schema': 're.bow.native-other-tests-r30/1', 'passed': result.testsRun-len(result.failures)-len(result.errors),
              'failed': len(result.failures)+len(result.errors), 'counts': read(LOT + '/manifest.json')['counts'],
              'checks': [{'name': str(case), 'error': error} for case, error in result.failures + result.errors],
              'sourceFiles': [{'path': path, 'sha256': sha((ROOT / path).read_bytes())} for path in files]}
    (ROOT / 'docs/R30_NATIVE_OTHER_TESTS.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    raise SystemExit(0 if result.wasSuccessful() else 1)
