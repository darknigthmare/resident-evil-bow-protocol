import copy
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('motion_r26', ROOT/'scripts/import-rigged-motion-r26.py')
IMPORTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(IMPORTER)
PACK = ROOT/'modules/fidelity-r26/motion'


class RiggedMotionR26Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((PACK/'manifest.json').read_text())
        cls.request = json.loads((ROOT/'docs/R26_MOTION_IMPORT_REQUEST.json').read_text())

    def test_exact_import_is_reproducible_without_changing_any_delivered_byte(self):
        before = hashlib.sha256((PACK/'manifest.json').read_bytes()).hexdigest()
        generated, _ = IMPORTER.build(self.request, PACK, PACK, check=True)
        self.assertEqual(generated, self.manifest)
        self.assertEqual(hashlib.sha256((PACK/'manifest.json').read_bytes()).hexdigest(), before)

    def test_keyed_poses_unkeyed_bases_and_body_motion_counts_are_separate(self):
        entries = self.manifest['entries']
        clips = [clip for entry in entries for clip in entry['clips']]
        bases = [pose for entry in entries for pose in entry['basePoseReferences']]
        self.assertEqual(len(clips), 359)
        self.assertEqual(len(bases), 6)
        self.assertEqual(sum(not clip['positiveTimePoseOnly'] for clip in clips), 352)
        self.assertEqual(sum(clip['positiveTimePoseOnly'] for clip in clips), 7)
        self.assertEqual(self.manifest['summary']['bodyMotionFiles'], 350)
        self.assertEqual(self.manifest['summary']['associatedObjectMotionFiles'], 2)
        for base in bases:
            self.assertEqual(base['keyTimeCount'], 0)
            self.assertEqual(base['animationCurveCount'], 0)
            self.assertIsNone(base['keyTimeStart'])
            self.assertIsNone(base['keyTimeEnd'])
            self.assertEqual(base['classification'], 'unkeyed-base-pose')

    def test_three_objects_are_not_another_incarnation_or_a_body_movement(self):
        entries = self.manifest['entries']
        self.assertEqual(len(entries), 6)
        self.assertEqual(len({entry['subjectId'] for entry in entries}), 3)
        self.assertEqual({entry['subjectId'] for entry in entries},
                         {'rerev-chunk-ooze', 'rerev-tricorne-ooze', 'rerev-pincer-ooze'})
        objects = [entry for entry in entries if entry['modelRole'] == 'associated-object']
        self.assertEqual(len(objects), 3)
        self.assertEqual(sum(len(entry['clips']) for entry in objects), 2)
        static = next(entry for entry in objects if 'wp1c00' in entry['id'])
        self.assertEqual(static['clips'], [])
        self.assertEqual(len(static['basePoseReferences']), 1)
        for entry in entries:
            self.assertFalse(entry['canonicalFidelityCertified'])
            self.assertFalse(entry['rigProductionFinalized'])
            self.assertFalse(entry['combatIntegrated'])
            self.assertTrue(all(not clip['semanticActionVerified'] for clip in entry['clips']))

    def test_native_pre_roll_and_key_times_are_not_replaced_by_synthetic_fps(self):
        for entry in self.manifest['entries']:
            for clip in entry['clips']:
                start, end, rate = int(clip['keyTimeStart']), int(clip['keyTimeEnd']), clip['ticksPerSecond']
                times = list(map(int, clip['nativeKeyTimesTicks']))
                self.assertEqual((min(times), max(times)), (start, end))
                self.assertAlmostEqual(clip['sourceTimeSpanSeconds'], (end-start)/rate)
                self.assertAlmostEqual(clip['nativePreRollSeconds'], max(0, -start/rate))
                self.assertAlmostEqual(clip['duration'], max(0, end/rate))
                self.assertEqual(clip['generatedKeyframes'], 0)

    def test_all_three_sources_keep_pc_hd_edition_instead_of_claiming_3ds(self):
        for entry in self.manifest['entries']:
            self.assertIn('2013', entry['game'])
            self.assertIn('HD/PC', entry['sourceEdition'])
            self.assertIn('3DS', ' '.join(entry['limits']))
            self.assertEqual(len(entry['sources']), 2)
            self.assertIn('/pc_computer/residentevilrevelations/', entry['sources'][0]['url'])
            self.assertIn('/resident-evil-revelations/enemies/', entry['sources'][1]['url'])
            source = gzip.decompress((PACK/entry['sources'][0]['path']).read_bytes()).decode()
            self.assertIn(entry['archive']['url'].split('.com', 1)[1], source)

    def test_native_topology_uv_and_exact_unique_object_names_are_required(self):
        entry = self.manifest['entries'][0]
        proof = json.loads((PACK/entry['materialBindings']['path']).read_text())
        body, first = proof['body'], proof['clips'][0]
        matches = {item['bodyMeshName']: item for item in first['matchedMeshes']}
        clip = {'sourceSha256': first['clipSourceSha256'], 'meshes': []}
        for mesh in body['meshes']:
            clip['meshes'].append({**copy.deepcopy(mesh), 'name': matches[mesh['name']]['clipMeshName']})
        self.assertEqual(IMPORTER.verify_material_transfer(body, clip), first)
        altered = copy.deepcopy(clip)
        altered['meshes'][0]['expandedUvSha256'] = '0'*64
        with self.assertRaisesRegex(ValueError, 'UVs differ'):
            IMPORTER.verify_material_transfer(body, altered)
        altered = copy.deepcopy(clip)
        altered['meshes'][0]['name'] = body['meshes'][0]['name']+' (GuessedCharacter)'
        with self.assertRaisesRegex(ValueError, 'names do not match uniquely'):
            IMPORTER.verify_material_transfer(body, altered)

    def test_unknown_subject_role_and_final_fidelity_claims_are_refused_before_output(self):
        for key, value in [('subjectId', 'unverified-creature'), ('modelRole', 'final-fighter'),
                           ('canonicalFidelityCertified', True), ('rigProductionFinalized', True)]:
            altered = copy.deepcopy(self.request)
            altered['packages'][0]['groups'][0][key] = value
            with tempfile.TemporaryDirectory() as tmp:
                with self.assertRaises(ValueError):
                    IMPORTER.build(altered, Path(tmp), Path(tmp))
                self.assertEqual(list(Path(tmp).iterdir()), [])

    def test_tampered_archive_is_rejected_without_replacing_delivered_files(self):
        request = copy.deepcopy(self.request)
        request['packages'] = request['packages'][:1]
        before = (PACK/'manifest.json').read_bytes()
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp)/request['packages'][0]['archiveFile']).write_bytes(b'PK-tampered')
            with self.assertRaisesRegex(ValueError, 'SHA-256/length mismatch'):
                IMPORTER.build(request, Path(tmp), PACK)
        self.assertEqual((PACK/'manifest.json').read_bytes(), before)

    def test_paths_cannot_escape_and_snapshot_raw_digests_are_preserved(self):
        with tempfile.TemporaryDirectory() as tmp:
            for value in ['../escape', '/absolute', 'C:\\escape', 'child/../../escape']:
                with self.assertRaises(ValueError):
                    IMPORTER.local_path(tmp, value)
            (Path(tmp)/'alias').symlink_to('/tmp')
            with self.assertRaises(ValueError):
                IMPORTER.local_path(tmp, 'alias/output')
        for package in self.request['packages']:
            self.assertLess(package['archive']['bytes'], IMPORTER.MAX_ARCHIVE_BYTES)
            for record in package['sources']:
                raw = gzip.decompress((PACK/record['path']).read_bytes())
                self.assertEqual(hashlib.sha256(raw).hexdigest(), record['rawSha256'])
                self.assertEqual(len(raw), record['rawBytes'])

    def test_delivered_textures_are_exactly_the_explicit_native_bindings(self):
        for entry in self.manifest['entries']:
            proof = json.loads((PACK/entry['materialBindings']['path']).read_text())
            expected = {str(texture['relativeFilename']).replace('\\', '/').split('/')[-1]
                        for mesh in proof['body']['meshes'] for material in mesh['materials']
                        for texture in material['textures']}
            self.assertEqual({item['name'] for item in entry['textures']}, expected)
            self.assertFalse(entry['materialBindings']['arbitraryTextureMappings'])


if __name__ == '__main__':
    unittest.main()
