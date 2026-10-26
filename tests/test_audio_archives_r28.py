import copy
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
import wave
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('audio_r28', ROOT / 'scripts/import-audio-archives-r28.py')
AUDIO = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(AUDIO)
MODULE = ROOT / 'modules/fidelity-r28/audio'


class AudioArchivesR28Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.request = json.loads((MODULE / 'import-request.json').read_text())
        cls.manifest = json.loads((MODULE / 'manifest.json').read_text())

    def test_reconstruct_and_compare_all1450_extracted_wave_bytes(self):
        actual = AUDIO.build(self.request, MODULE)
        self.assertEqual(actual, self.manifest)
        self.assertEqual(actual['counts']['documentary_clips'], 1450)
        self.assertEqual(actual['counts']['distinct_published_file_contents_sha256'], 1105)
        self.assertEqual(actual['counts']['duplicate_published_file_contents'], 345)
        self.assertEqual(actual['counts']['contents_already_present_r24_r27'], 50)
        for source in actual['sources']:
            with ZipFile(io.BytesIO(AUDIO.read_source_archive(source, MODULE))) as archive:
                for row in actual['entries']:
                    if row['publication_asset_id'] != source['publication_asset_id']:
                        continue
                    raw = (MODULE / row['path']).read_bytes()
                    self.assertEqual(raw, archive.read(row['archive_member']))
                    self.assertEqual(AUDIO.sha(raw), row['sha256'])
                    self.assertEqual(AUDIO.inspect_wave(raw), row['probe'])

    def test_multiform_nemesis_and_host_parasite_are_not_exact_identity_assignments(self):
        counts = self.manifest['counts']
        self.assertEqual((counts['publisher_assigned_identities'], counts['exact_subject_clips'], counts['candidate_only_clips']), (1, 301, 1149))
        for row in self.manifest['entries']:
            if row['publication_asset_id'] == 475786:
                self.assertEqual(row['identity_id'], 're3r-licker')
                self.assertEqual(row['candidate_identity_ids'], [])
            else:
                self.assertIsNone(row['identity_id'])
                self.assertTrue(row['candidate_identity_ids'])
            for key in ['source_bytes_transformed', 'independent_listening_completed', 'native_bank_certified', 'canonical_fidelity_certified', 'combat_audio_final']:
                self.assertIs(row[key], False)

    def test_sample_rates_and_channels_are_preserved_without_resampling(self):
        self.assertEqual(self.manifest['counts']['sample_rate_counts'], {'48000': 1446, '44100': 4})
        self.assertEqual(sum(row['probe']['channels'] == 2 for row in self.manifest['entries']), 62)
        for row in self.manifest['entries']:
            with wave.open(str(MODULE / row['path'])) as audio:
                self.assertEqual((audio.getframerate(), audio.getnframes(), audio.getnchannels()),
                                 (row['probe']['sample_rate'], row['probe']['frames'], row['probe']['channels']))

    def test_segment_order_hashes_and_descriptors_reassemble_exact_original_zip(self):
        source = next(x for x in self.request['sources'] if 'archive_parts' in x)
        raw = AUDIO.read_source_archive(source, MODULE)
        self.assertEqual((len(raw), AUDIO.sha(raw)), (81547052, source['archive_sha256']))
        for mode in ['order', 'hash', 'offset', 'descriptor', 'traversal']:
            changed = copy.deepcopy(source)
            if mode == 'order': changed['archive_parts'].reverse()
            if mode == 'hash': changed['archive_parts'][0]['sha256'] = '0' * 64
            if mode == 'offset': changed['archive_parts'][1]['byteOffset'] += 1
            if mode == 'descriptor': changed['archive_bytes'] += 1
            if mode == 'traversal': changed['archive_descriptor'] = '../outside.json'
            with self.assertRaises(ValueError): AUDIO.read_source_archive(changed, MODULE)

    def test_wrong_group_game_platform_and_unsupported_exact_forms_are_rejected(self):
        for key, value in [('identity_id', 're3r-nemesis'), ('candidate_identity_ids', ['re3-nemesis']),
                           ('published_group', 'Nemesis'), ('published_section', 'Attack'),
                           ('game', 'Resident Evil 3 (1999)'), ('platform', 'PlayStation')]:
            request = copy.deepcopy(self.request); request['sources'][0][key] = value
            with self.assertRaises(ValueError): AUDIO.build(request, MODULE)

    def test_source_hash_context_and_source_set_cannot_be_substituted(self):
        for mode in ['page', 'archive', 'context', 'duplicate', 'missing', 'url']:
            request = copy.deepcopy(self.request)
            if mode == 'page': request['sources'][0]['page_sha256'] = '0' * 64
            if mode == 'archive': request['sources'][0]['archive_sha256'] = '0' * 64
            if mode == 'context': request['sources'][0]['identity_references'][0]['identity_id'] = 're2-licker'
            if mode == 'duplicate': request['sources'].append(request['sources'][0])
            if mode == 'missing': request['sources'].pop()
            if mode == 'url': request['sources'][0]['page_url'] = 'https://example.com/other'
            with self.assertRaises(ValueError): AUDIO.build(request, MODULE)

    def test_silence_truncation_and_unexpected_pcm_are_distinct(self):
        raw = io.BytesIO()
        with wave.open(raw, 'wb') as audio:
            audio.setnchannels(2); audio.setsampwidth(2); audio.setframerate(44100); audio.writeframes(b'\x00\x00' * 40)
        self.assertFalse(AUDIO.inspect_wave(raw.getvalue())['nonzero_pcm_samples_present'])
        self.assertEqual(AUDIO.inspect_wave(raw.getvalue())['frames'], 20)
        with self.assertRaises(ValueError): AUDIO.inspect_wave(raw.getvalue()[:-1])
        changed = bytearray(raw.getvalue()); changed[24:28] = (32000).to_bytes(4, 'little')
        with self.assertRaises(ValueError): AUDIO.inspect_wave(changed)

    def test_archive_traversal_and_duplicate_members_rejected(self):
        for names in [['../unsafe.wav'], ['a.wav', 'A.wav']]:
            raw = io.BytesIO()
            with ZipFile(raw, 'w') as archive:
                for name in names: archive.writestr(name, b'x')
            with ZipFile(io.BytesIO(raw.getvalue())) as archive:
                with self.assertRaises(ValueError): AUDIO.BASE.inspect_archive(archive)

    def test_conservation_refuses_overwriting_different_bytes(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            AUDIO.BASE.write_exact(root, 'clips/source.wav', b'original')
            with self.assertRaises(ValueError): AUDIO.BASE.write_exact(root, 'clips/source.wav', b'replacement')
            self.assertEqual((root / 'clips/source.wav').read_bytes(), b'original')


if __name__ == '__main__': unittest.main()
