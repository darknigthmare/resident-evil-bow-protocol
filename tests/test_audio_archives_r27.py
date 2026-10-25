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
SPEC = importlib.util.spec_from_file_location('audio_r27', ROOT / 'scripts/import-audio-archives-r27.py')
AUDIO = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(AUDIO)
MODULE = ROOT / 'modules/fidelity-r27/audio'


class AudioArchivesR27Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.request = json.loads((MODULE / 'import-request.json').read_text())
        cls.manifest = json.loads((MODULE / 'manifest.json').read_text())

    def test_source_reconstruction_and_every_published_wave_byte(self):
        actual = AUDIO.build(self.request, MODULE)
        self.assertEqual(actual, self.manifest)
        self.assertEqual(actual['counts']['documentary_clips'], 330)
        self.assertEqual(actual['counts']['publisher_assigned_identities'], 1)
        self.assertEqual(actual['counts']['distinct_published_file_contents_sha256'], 330)
        self.assertEqual(actual['counts']['duplicate_published_file_contents'], 0)
        by_asset = {x['publication_asset_id']: x for x in actual['sources']}
        for asset_id, source in by_asset.items():
            with ZipFile(MODULE / source['archive_path']) as archive:
                for entry in actual['entries']:
                    if entry['publication_asset_id'] == asset_id:
                        raw = (MODULE / entry['path']).read_bytes()
                        self.assertEqual(raw, archive.read(entry['archive_member']))
                        self.assertEqual(AUDIO.BASE.sha(raw), entry['sha256'])
                        self.assertEqual(AUDIO.inspect_wave(raw), entry['probe'])

    def test_mono_channels_and_decoded_frame_counts_are_preserved(self):
        stereo = [x for x in self.manifest['entries'] if x['probe']['channels'] == 2]
        self.assertEqual(len(stereo), 0)
        self.assertEqual(sum(x['probe']['channels'] == 1 for x in self.manifest['entries']), 330)
        for row in self.manifest['entries']:
            with wave.open(str(MODULE / row['path'])) as audio:
                self.assertEqual(audio.getnframes(), row['probe']['frames'])
                self.assertEqual(audio.getnchannels(), 1)

    def test_no_native_bank_or_independent_listening_is_inferred(self):
        for entry in self.manifest['entries']:
            self.assertFalse(entry['source_bytes_transformed'])
            for key in ['native_bank_certified', 'independent_listening_completed', 'canonical_fidelity_certified', 'combat_audio_final']:
                self.assertIs(entry[key], False)
            self.assertIn('WEM', entry['attribution_scope'])
        self.assertEqual(self.manifest['counts']['certified_native_clips'], 0)

    def test_wrong_subject_and_publication_sections_are_rejected(self):
        for key, value in [('identity_id', 're3-zombie-dog'), ('published_group', 'Nemesis'), ('published_section', 'Combat event')]:
            changed = copy.deepcopy(self.request); changed['sources'][0][key] = value
            with self.assertRaisesRegex(ValueError, 'Subject or source section'):
                AUDIO.build(changed, MODULE)

    def test_source_hash_and_game_boundaries_are_enforced(self):
        for key, value in [('page_sha256', '0' * 64), ('archive_sha256', '0' * 64), ('game', 'Resident Evil 3 (1999)'), ('platform', 'PlayStation')]:
            changed = copy.deepcopy(self.request); changed['sources'][0][key] = value
            with self.assertRaises(ValueError):
                AUDIO.build(changed, MODULE)

    def test_context_cannot_be_substituted_by_a_different_incarnation(self):
        changed = copy.deepcopy(self.request); changed['sources'][0]['identity_reference']['url'] = 'https://www.evilresource.com/resident-evil-3/enemies/zombie-dog'
        with self.assertRaisesRegex(ValueError, 'context'):
            AUDIO.build(changed, MODULE)

    def test_duplicate_missing_and_remote_source_sets_are_rejected(self):
        for mode in ['duplicate', 'missing', 'url']:
            changed = copy.deepcopy(self.request)
            if mode == 'duplicate': changed['sources'].append(changed['sources'][0])
            if mode == 'missing': changed['sources'].pop()
            if mode == 'url': changed['sources'][0]['page_url'] = 'https://example.com/other'
            with self.assertRaises(ValueError): AUDIO.build(changed, MODULE)

    def test_numeric_silence_and_truncated_or_unexpected_pcm_are_distinct(self):
        raw = io.BytesIO()
        with wave.open(raw, 'wb') as audio:
            audio.setnchannels(2); audio.setsampwidth(2); audio.setframerate(48000); audio.writeframes(b'\x00\x00' * 40)
        self.assertFalse(AUDIO.inspect_wave(raw.getvalue())['nonzero_pcm_samples_present'])
        self.assertEqual(AUDIO.inspect_wave(raw.getvalue())['frames'], 20)
        with self.assertRaises(ValueError): AUDIO.inspect_wave(raw.getvalue()[:-1])
        changed = bytearray(raw.getvalue()); changed[24:28] = (32000).to_bytes(4, 'little')
        with self.assertRaisesRegex(ValueError, 'format'): AUDIO.inspect_wave(changed)

    def test_exact_output_never_overwrites_different_source_bytes(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            AUDIO.BASE.write_exact(root, 'clips/source.wav', b'original')
            with self.assertRaisesRegex(ValueError, 'overwrite'):
                AUDIO.BASE.write_exact(root, 'clips/source.wav', b'replacement')
            self.assertEqual((root / 'clips/source.wav').read_bytes(), b'original')


if __name__ == '__main__': unittest.main()
