"""Verify native lot E source preservation, image evidence and conservative admission."""
import hashlib
import importlib.util
import json
import unittest
from pathlib import Path
from zipfile import ZipFile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r30/native/new-sources'


def read(name):
    return json.loads((PACK / name).read_bytes())


def bound(record):
    path = (ROOT / record['path']).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file():
        raise AssertionError('Missing or external source')
    raw = path.read_bytes()
    if 'bytes' in record and len(raw) != record['bytes']:
        raise AssertionError('Changed source byte count: ' + record['path'])
    if hashlib.sha256(raw).hexdigest() != record['sha256']:
        raise AssertionError('Changed source digest: ' + record['path'])
    return raw


class NativeNewSources(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = read('catalog.json')
        cls.manifest = read('manifest.json')
        cls.renders = read('renders.json')
        cls.receipts = read('acquisition/receipts.json')

    def test_actual_acquisition_and_edition_pages(self):
        self.assertEqual(len(self.receipts['entries']), 11)
        for entry in self.receipts['entries']:
            with self.subTest(uid=entry['uid']):
                page = bound(entry['page']).decode()
                self.assertIn('/asset/' + str(entry['assetId']) + '/', entry['page']['url'])
                self.assertIn('Resident Evil', page)
                self.assertIn(str(entry['assetId']) + '.zip', page)
                self.assertEqual(entry['page']['status'], 200)
                self.assertEqual(entry['archive']['status'], 200)
                archive = bound(entry['archive'])
                self.assertTrue(archive.startswith(b'PK'))
                self.assertEqual(len(ZipFile(ROOT / entry['archive']['path']).infolist()), len(entry['contents']) + sum(1 for row in ZipFile(ROOT / entry['archive']['path']).infolist() if row.is_dir()))

    def test_exact_native_archive_members_unchanged(self):
        self.assertEqual(len(self.catalog['entries']), 38)
        for entry in self.catalog['entries']:
            with self.subTest(model=entry['id']):
                archive_bytes = bound(entry['archive'])
                with ZipFile(ROOT / entry['archive']['path']) as archive:
                    for source in [entry['model'], entry['materials'], *entry['textures']]:
                        raw = bound(source)
                        member = source.get('member')
                        if member is None:
                            matches = [name for name in archive.namelist() if name.endswith('/' + Path(source['path']).name) or name == Path(source['path']).name]
                            matches = [name for name in matches if hashlib.sha256(archive.read(name)).hexdigest() == source['sha256']]
                            self.assertTrue(matches)
                            member = matches[0]
                        self.assertEqual(archive.read(member), raw)
                self.assertGreater(len(archive_bytes), 100)

    def test_native_inputs_not_guessed_or_rewritten(self):
        baseline = ROOT / 'modules/fidelity-r26/models/catalog.json'
        originals = {entry['id']: entry for entry in json.loads(baseline.read_bytes())['entries']}
        for entry in self.catalog['entries']:
            if not entry['newNativeArchive']:
                bound(entry['sourceCatalog'])
                original = originals[entry['sourceEntryId']]
                self.assertEqual(entry['subjectId'], original['candidateUid'])
                self.assertEqual(entry['model']['sha256'], original['model']['sha256'])
                self.assertEqual(entry['materials']['sha256'], original['materials']['sha256'])
                self.assertEqual([row['sha256'] for row in entry['textures']], [row['sha256'] for row in original['textures']])

    def test_gamma_real_weighted_fbx_has_no_native_idle(self):
        inspection = read('gamma-fbx-inspection.json')
        spec = importlib.util.spec_from_file_location('fbx_r24_test', ROOT / 'scripts/import-rigged-motion-r24.py')
        parser = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(parser)
        actual = parser.inspect_fbx(bound(inspection['source']))
        for key in actual:
            self.assertEqual(inspection[key], actual[key])
        self.assertEqual(actual['boneCount'], 99)
        self.assertEqual(actual['skinWeightCount'], 129896)
        self.assertEqual(actual['animationCurveCount'], 0)
        self.assertEqual(actual['durationSeconds'], 0)

    def test_all_152_pngs_decode_and_match_actual_alpha(self):
        self.assertEqual(len(self.manifest['entries']), 152)
        for entry in self.manifest['entries']:
            frame = entry['frames'][0]
            with self.subTest(id=entry['id']):
                bound(frame)
                with Image.open(ROOT / frame['path']) as image:
                    self.assertEqual(image.format, 'PNG')
                    self.assertEqual(image.size, (512, 512))
                    self.assertEqual(image.mode, 'RGBA')
                    alpha = image.getchannel('A')
                    bbox = alpha.getbbox()
                    self.assertIsNotNone(bbox)
                    self.assertGreater(bbox[0], 0)
                    self.assertGreater(bbox[1], 0)
                    self.assertLess(bbox[2], 512)
                    self.assertLess(bbox[3], 512)
                    self.assertEqual(frame['bounds'], {'x': bbox[0], 'y': bbox[1], 'width': bbox[2]-bbox[0], 'height': bbox[3]-bbox[1]})
                    self.assertEqual(entry['referenceBounds'], frame['bounds'])
                    for value in entry['pivot'].values():
                        self.assertGreaterEqual(value, 0)
                        self.assertLessEqual(value, 512)

    def test_four_real_camera_views_without_model_edits(self):
        self.assertEqual(len(self.renders['entries']), 38)
        for rendered in self.renders['entries']:
            bound(rendered['sourceCatalog'])
            recipe = rendered['recipe']
            self.assertEqual(recipe['angles'], [0, 90, 180, 270])
            self.assertTrue(recipe['cameraOrbitOnly'])
            for key in ('geometryMirrored', 'modelTransformsChanged', 'poseChanged', 'sourceMaterialsBytesRewritten', 'originalGameMaterialCertified'):
                self.assertFalse(recipe[key])
            views = rendered['views']
            self.assertEqual([row['angle'] for row in views], [0, 90, 180, 270])
            self.assertEqual(len({tuple(row['cameraPosition']) for row in views}), 4)
            self.assertEqual(len({tuple(row['cameraTarget']) for row in views}), 1)
            for row in views:
                self.assertEqual(row['edgePixels'], 0)
                self.assertGreater(row['occupiedPixels'], 20)

    def test_review_contacts_bind_every_actual_view(self):
        contacts = read('review/contacts.json')
        observations = read('review/observations.json')
        self.assertEqual(len(contacts), 8)
        self.assertEqual(len(observations['entries']), 38)
        self.assertEqual(observations['reviewedImages'], 152)
        self.assertEqual(sum(len(row['models']) for row in contacts), 38)
        for contact in contacts:
            bound(contact)
            self.assertTrue(contact['reviewed'])
        for observation in observations['entries']:
            bound(observation['contact'])
            self.assertTrue(observation['allFourViewsInspected'])
            self.assertFalse(observation['fightingPoseReviewed'])
            self.assertEqual(len(observation['images']), 4)
            for frame in observation['images']:
                bound(frame)

    def test_no_port_or_static_pose_silently_admitted_as_idle(self):
        self.assertEqual(self.manifest['schema'], 're.bow.native-2d-lot-r30/1')
        exact = [row for row in self.manifest['entries'] if row['admittedTargetEdition']]
        self.assertEqual(len(exact), 4)
        self.assertEqual({row['subjectId'] for row in exact}, {'re3r-hunter-gamma'})
        for entry in self.manifest['entries']:
            self.assertEqual(entry['kind'], 'native-static-pose')
            self.assertEqual(entry['admittedCombatStates'], [])
            self.assertFalse(entry['actionVerified'])
            self.assertFalse(entry['fightingPoseReviewed'])
            self.assertFalse(entry['continuityVerified'])
            self.assertFalse(entry['animated'])
            self.assertFalse(entry['canonicalFidelityCertified'])
            self.assertFalse(entry['canMirror'])
            self.assertFalse(entry['originalGameFrames'])
            self.assertTrue(entry['knownAppearanceGaps'])
            if not entry['admittedTargetEdition']:
                self.assertIn('GameCube', entry['sourceEdition'])
        for key in ('nativeAnimationClips', 'admittedCombatPoses', 'admittedIdleAnimations', 'originalGameFrames'):
            self.assertEqual(self.manifest['counts'][key], 0)

    def test_corroboration_remains_identity_only(self):
        evidence = read('acquisition/corroboration.json')
        self.assertEqual(len(evidence['entries']), 2)
        self.assertIn('head crop', evidence['scope'])
        for item in evidence['entries']:
            bound(item)
            self.assertEqual(item['status'], 200)


if __name__ == '__main__':
    unittest.main()
