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
PACK = ROOT / 'modules/fidelity-r27/motion'


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


IMPORT = module('motion_r27', 'scripts/import-rigged-motion-r27.py')
ASSEMBLE = module('assemble_r27', 'scripts/reassemble-motion-archive-r27.py')


class RiggedMotionR27Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((PACK / 'manifest.json').read_text())
        cls.request = json.loads((ROOT / 'docs/R27_MOTION_IMPORT_REQUEST.json').read_text())
        cls.temporary = tempfile.TemporaryDirectory()
        cls.archive = Path(cls.temporary.name) / 'ooze.zip'
        cls.assembled = ASSEMBLE.reassemble(PACK / 'ooze/source/original.zip.parts.json', PACK, cls.archive)

    @classmethod
    def tearDownClass(cls):
        cls.temporary.cleanup()

    def test_original_archive_reassembles_to_the_exact_published_bytes(self):
        expected = self.request['packages'][0]['archive']
        self.assertEqual(self.assembled['sha256'], expected['sha256'])
        self.assertEqual(self.archive.stat().st_size, expected['bytes'])
        self.assertEqual(len(self.manifest['archiveSegmentation']['parts']), 3)
        self.assertTrue(all(part['bytes'] <= 48 * 1024 * 1024 for part in self.manifest['archiveSegmentation']['parts']))
        with zipfile.ZipFile(self.archive) as source:
            self.assertEqual(source.testzip(), None)
        with self.assertRaisesRegex(ValueError, 'overwrite'):
            ASSEMBLE.reassemble(PACK / 'ooze/source/original.zip.parts.json', PACK, self.archive)

    def test_native_import_reproduces_every_delivered_scene_and_material_proof(self):
        before = (PACK / 'manifest.json').read_bytes()
        actual, _ = IMPORT.build(self.request, self.archive, PACK, check=True)
        self.assertEqual(actual, self.manifest)
        self.assertEqual((PACK / 'manifest.json').read_bytes(), before)

    def test_all_direct_clips_and_bases_are_exact_original_zip_members(self):
        with zipfile.ZipFile(self.archive) as source:
            for entry in self.manifest['entries']:
                for record in [entry['model'], *entry['clips'], *entry['basePoseReferences']]:
                    original = source.read(record['member'])
                    delivered = (PACK / record['path']).read_bytes()
                    self.assertEqual(delivered, original)
                    self.assertEqual(hashlib.sha256(delivered).hexdigest(), record['sha256'])
                for clip in entry['clips']:
                    self.assertEqual(clip['generatedKeyframes'], 0)
                    self.assertFalse(clip['semanticActionVerified'])
                    self.assertLess(clip['bytes'], 12 * 1024 * 1024)

    def test_one_body_and_object_do_not_inflate_subject_or_motion_totals(self):
        manifest = self.manifest
        self.assertEqual({entry['subjectId'] for entry in manifest['entries']}, {'rerev-ooze'})
        self.assertEqual([entry['modelRole'] for entry in manifest['entries']], ['body', 'associated-object'])
        self.assertEqual(manifest['summary']['sourceAnimationFiles'], 120)
        self.assertEqual(manifest['summary']['bodyMotionFiles'], 117)
        self.assertEqual(manifest['summary']['associatedObjectMotionFiles'], 1)
        self.assertEqual(manifest['summary']['positiveTimePoseFiles'], 2)
        self.assertEqual(manifest['summary']['sourceBasePoseFiles'], 2)
        self.assertEqual(manifest['summary']['directAnimationFiles'], 120)
        self.assertFalse(manifest['browserArchiveLimitRaised'])

    def test_published_pc_hd_scope_and_native_clock_are_retained(self):
        for entry in self.manifest['entries']:
            self.assertIn('HD/PC', entry['game'])
            self.assertIn('2013', entry['sourceEdition'])
            self.assertIn('3DS', ' '.join(entry['limits']))
            self.assertFalse(entry['canonicalFidelityCertified'])
            self.assertFalse(entry['rigProductionFinalized'])
            for record in entry['sources']:
                compressed = (PACK / record['path']).read_bytes()
                self.assertEqual(hashlib.sha256(compressed).hexdigest(), record['sha256'])
                raw = gzip.decompress(compressed)
                self.assertEqual(hashlib.sha256(raw).hexdigest(), record['rawSha256'])
            for clip in entry['clips']:
                start, end, rate = int(clip['keyTimeStart']), int(clip['keyTimeEnd']), clip['ticksPerSecond']
                self.assertAlmostEqual(clip['sourceTimeSpanSeconds'], (end-start)/rate)
                self.assertAlmostEqual(clip['nativePreRollSeconds'], max(0, -start/rate))
                self.assertAlmostEqual(clip['duration'], max(0, end/rate))

    def test_changed_archive_and_unknown_subject_are_rejected_before_output(self):
        altered = copy.deepcopy(self.request)
        altered['packages'][0]['archive']['sha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'Original archive bytes'):
            IMPORT.build(altered, self.archive, Path(self.temporary.name) / 'refused')
        altered = copy.deepcopy(self.request)
        altered['packages'][0]['groups'][0]['subjectId'] = 'unproven-other-game'
        with self.assertRaisesRegex(ValueError, 'Unknown catalogue subject'):
            IMPORT.build(altered, self.archive, PACK, check=True)

    def test_segment_order_offsets_tampering_and_outside_paths_fail_closed(self):
        with tempfile.TemporaryDirectory() as folder:
            folder = Path(folder)
            raw = b'original source bytes'
            (folder / 'part').write_bytes(raw)
            descriptor = {'schema': 're.bow.exact-segmented-archive/1', 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
                          'parts': [{'path': 'part', 'index': 1, 'byteOffset': 0, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}]}
            for key, value in [('index', 2), ('byteOffset', 1), ('sha256', '0'*64), ('path', '../part')]:
                changed = copy.deepcopy(descriptor)
                changed['parts'][0][key] = value
                (folder / 'descriptor.json').write_text(json.dumps(changed))
                output = folder / ('refused-' + key + '.zip')
                with self.assertRaises(ValueError):
                    ASSEMBLE.reassemble(folder / 'descriptor.json', folder, output)
                self.assertFalse(output.exists())

    def test_material_bindings_keep_the_full_original_archive_hash(self):
        full_hash = self.manifest['archiveSegmentation']['sha256']
        for entry in self.manifest['entries']:
            proof = json.loads((PACK / entry['materialBindings']['path']).read_text())
            self.assertEqual(proof['sourceArchiveSha256'], full_hash)
            self.assertEqual(proof['body']['sourceSha256'], entry['model']['sha256'])
            self.assertEqual(entry['archive']['sha256'], full_hash)
            self.assertEqual(len(proof['clips']), len(entry['clips']) + len(entry['basePoseReferences']))
            self.assertFalse(proof['clips'][0]['arbitraryTextureMapping'])


if __name__ == '__main__':
    unittest.main()
