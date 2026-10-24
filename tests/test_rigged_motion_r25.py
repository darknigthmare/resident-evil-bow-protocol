import copy
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('motion_r25', ROOT/'scripts/import-rigged-motion-r25.py')
IMPORTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(IMPORTER)
PACK = ROOT/'modules/fidelity-r25/motion'


class RiggedMotionR25Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((PACK/'manifest.json').read_text())
        cls.request = json.loads((ROOT/'docs/R25_MOTION_IMPORT_REQUEST.json').read_text())

    def test_exact_import_is_reproducible_without_changing_a_source_byte(self):
        before = hashlib.sha256((PACK/'manifest.json').read_bytes()).hexdigest()
        generated, _ = IMPORTER.build(self.request, PACK, PACK, check=True)
        self.assertEqual(generated, self.manifest)
        self.assertEqual(hashlib.sha256((PACK/'manifest.json').read_bytes()).hexdigest(), before)

    def test_keyed_poses_and_unkeyed_bases_remain_different_from_actual_movements(self):
        entries = self.manifest['entries']
        clips = [clip for entry in entries for clip in entry['clips']]
        bases = [pose for entry in entries for pose in entry['basePoseReferences']]
        self.assertEqual(len(clips), 180)
        self.assertEqual(len(bases), 5)
        self.assertEqual(sum(not clip['positiveTimePoseOnly'] for clip in clips), 179)
        self.assertEqual([clip['id'] for clip in clips if clip['positiveTimePoseOnly']], ['om1706_om1706_2'])
        for base in bases:
            self.assertEqual(base['keyTimeCount'], 0)
            self.assertEqual(base['animationCurveCount'], 0)
            self.assertIsNone(base['keyTimeStart'])
            self.assertIsNone(base['keyTimeEnd'])
            self.assertEqual(base['classification'], 'unkeyed-base-pose')

    def test_associated_object_and_unattributed_variant_are_not_another_incarnation(self):
        entries = self.manifest['entries']
        self.assertEqual(len(entries), 5)
        self.assertEqual(len({entry['subjectId'] for entry in entries}), 3)
        objects = [entry for entry in entries if entry['modelRole'] == 'associated-object']
        self.assertEqual(len(objects), 1)
        self.assertEqual(objects[0]['subjectId'], 'rerev-scagdead')
        self.assertEqual(sum(not clip['positiveTimePoseOnly'] for clip in objects[0]['clips']), 9)
        variants = [entry for entry in entries if entry['modelRole'] == 'body-variant']
        self.assertEqual(variants[0]['clips'], [])
        for entry in entries:
            self.assertFalse(entry['canonicalFidelityCertified'])
            self.assertFalse(entry['rigProductionFinalized'])
            self.assertFalse(entry['combatIntegrated'])
            self.assertTrue(all(not clip['semanticActionVerified'] for clip in entry['clips']))

    def test_native_pre_roll_and_key_times_are_not_replaced_by_a_synthetic_frame_rate(self):
        for entry in self.manifest['entries']:
            for clip in entry['clips']:
                start, end, rate = int(clip['keyTimeStart']), int(clip['keyTimeEnd']), clip['ticksPerSecond']
                times = list(map(int, clip['nativeKeyTimesTicks']))
                self.assertEqual((min(times), max(times)), (start, end))
                self.assertAlmostEqual(clip['sourceTimeSpanSeconds'], (end-start)/rate)
                self.assertAlmostEqual(clip['nativePreRollSeconds'], max(0, -start/rate))
                self.assertAlmostEqual(clip['duration'], max(0, end/rate))
                self.assertEqual(clip['generatedKeyframes'], 0)

    def test_wall_blister_keeps_its_hd_pc_scope_without_certifying_the_3ds_release(self):
        entry = next(item for item in self.manifest['entries'] if item['id'] == 'rerev-wall-blister')
        self.assertIn('2013', entry['game'])
        self.assertIn('HD/PC', entry['sourceEdition'])
        self.assertIn('3DS', ' '.join(entry['limits']))
        scoped = [source for source in entry['sources'] if source.get('snapshotRelease') == 'R23']
        self.assertEqual(len(scoped), 1)
        text = gzip.decompress((PACK/scoped[0]['path']).read_bytes()).decode()
        self.assertIn("Only showing up in the 'HD' versions", text)

    def test_exporter_suffixes_require_unique_exact_topology_and_uvs(self):
        entry = next(item for item in self.manifest['entries'] if item['id'] == 'rerev-wall-blister')
        proof = json.loads((PACK/entry['materialBindings']['path']).read_text())
        body = proof['body']
        first = proof['clips'][0]
        matches = {item['bodyMeshName']: item for item in first['matchedMeshes']}
        clip = {'sourceSha256': first['clipSourceSha256'], 'meshes': []}
        for mesh in body['meshes']:
            clip['meshes'].append({**copy.deepcopy(mesh), 'name': matches[mesh['name']]['clipMeshName']})
        self.assertTrue(any('(SingleSkinnedCharacter' in mesh['name'] for mesh in clip['meshes']))
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
        for key, value in [('subjectId', 'unverified-creature'), ('modelRole', 'final-fighter'), ('canonicalFidelityCertified', True)]:
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
            (Path(tmp)/'farfarello.zip').write_bytes(b'PK-tampered')
            with self.assertRaisesRegex(ValueError, 'SHA-256/length mismatch'):
                IMPORTER.build(request, Path(tmp), PACK)
        self.assertEqual((PACK/'manifest.json').read_bytes(), before)

    def test_paths_cannot_escape_and_source_snapshots_match_their_raw_digests(self):
        with tempfile.TemporaryDirectory() as tmp:
            for value in ['../escape', '/absolute', 'C:\\escape', 'child/../../escape']:
                with self.assertRaises(ValueError):
                    IMPORTER.local_path(tmp, value)
            (Path(tmp)/'alias').symlink_to('/tmp')
            with self.assertRaises(ValueError):
                IMPORTER.local_path(tmp, 'alias/output')
        for package in self.request['packages']:
            for record in package['sources']:
                raw = gzip.decompress((PACK/record['path']).read_bytes())
                self.assertEqual(hashlib.sha256(raw).hexdigest(), record['rawSha256'])
                self.assertEqual(len(raw), record['rawBytes'])


if __name__ == '__main__':
    unittest.main()
