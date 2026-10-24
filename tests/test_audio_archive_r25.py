import copy
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import stat
import tempfile
import unittest
import wave
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('audio_import_r25', ROOT / 'scripts/import-audio-archive-r25.py')
IMPORT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(IMPORT)
MODULE = ROOT / 'modules/fidelity-r25/audio'


class AudioArchiveR25Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.request = json.loads((MODULE / 'import-request.json').read_text())
        cls.manifest = json.loads((MODULE / 'manifest.json').read_text())
        cls.archive = MODULE / 'archives/revelations-enemies.zip'
        cls.page = MODULE / 'evidence/source-page.html.txt'

    def test_all_selected_wave_members_and_archive_remain_exact_and_reproducible(self):
        with tempfile.TemporaryDirectory() as temporary:
            generated = IMPORT.build(self.archive, self.page, self.request, temporary)
            self.assertEqual(generated, self.manifest)
            self.assertEqual(generated['counts']['documentary_clips'], 708)
            self.assertEqual(generated['counts']['publisher_assigned_identities'], 16)
            self.assertEqual((Path(temporary) / 'archives/revelations-enemies.zip').read_bytes(), self.archive.read_bytes())
            with ZipFile(self.archive) as original:
                for entry in generated['entries']:
                    raw = original.read(entry['archive_member'])
                    self.assertEqual(raw, (MODULE / entry['path']).read_bytes())
                    self.assertEqual(hashlib.sha256(raw).hexdigest(), entry['sha256'])
                    self.assertFalse(entry['independent_listening_completed'])
                    self.assertFalse(entry['native_bank_certified'])
                    self.assertFalse(entry['canonical_fidelity_certified'])
                    self.assertFalse(entry['combat_audio_final'])

    def test_numeric_silence_is_not_counted_as_another_sound(self):
        with ZipFile(self.archive) as original:
            probe = IMPORT.inspect_wave(original.read('Ooze/em1000_dummy.wav'))
        self.assertFalse(probe['nonzero_pcm_samples_present'])
        excluded = self.manifest['archive_audit']['excluded_members']
        self.assertEqual(sum('zero-valued' in item['reason'] for item in excluded), 4)
        self.assertFalse(any('dummy' in entry['archive_member'].lower() for entry in self.manifest['entries']))

    def test_same_game_group_cannot_be_reassigned_to_a_different_creature(self):
        request = copy.deepcopy(self.request)
        request['groups'][0]['identity_id'] = 'rerev-sea-creeper'
        with tempfile.TemporaryDirectory() as temporary:
            with self.assertRaisesRegex(ValueError, 'does not name'):
                IMPORT.build(self.archive, self.page, request, temporary)
            self.assertEqual(list(Path(temporary).iterdir()), [])

    def test_identity_context_url_and_snapshot_hash_are_not_interchangeable(self):
        for field, value in [('url', 'https://www.evilresource.com/resident-evil-revelations/enemies/sea-creeper'), ('raw_sha256', '0' * 64)]:
            request = copy.deepcopy(self.request)
            request['groups'][0]['identity_reference'][field] = value
            with tempfile.TemporaryDirectory() as temporary:
                with self.assertRaisesRegex(ValueError, 'context'):
                    IMPORT.build(self.archive, self.page, request, temporary)
                self.assertEqual(list(Path(temporary).iterdir()), [])

    def test_wrong_game_and_unsupported_listening_or_certification_are_refused(self):
        for mutation in ('wrong_game', 'native_bank_certified', 'independently_listened'):
            request = copy.deepcopy(self.request)
            if mutation == 'wrong_game':
                request['groups'][0]['identity_id'] = 're1-zombie'
            else:
                request['groups'][0][mutation] = True
            with tempfile.TemporaryDirectory() as temporary:
                with self.assertRaises(ValueError):
                    IMPORT.build(self.archive, self.page, request, temporary)
                self.assertEqual(list(Path(temporary).iterdir()), [])

    def test_changed_archive_or_page_fails_before_delivery(self):
        for field in ('archive_sha256', 'page_sha256'):
            request = copy.deepcopy(self.request)
            request['source'][field] = '0' * 64
            with tempfile.TemporaryDirectory() as temporary:
                with self.assertRaisesRegex(ValueError, 'hash'):
                    IMPORT.build(self.archive, self.page, request, temporary)
                self.assertEqual(list(Path(temporary).iterdir()), [])

    def test_archive_paths_symlinks_case_collisions_and_compression_bombs_are_refused(self):
        cases = [('../outside.wav', b'x'), ('C:/outside.wav', b'x'), ('x\\outside.wav', b'x'), ('/outside.wav', b'x')]
        for name, raw in cases:
            data = io.BytesIO()
            with ZipFile(data, 'w') as archive:
                archive.writestr(name, raw)
            with ZipFile(data) as archive, self.assertRaises(ValueError):
                IMPORT.inspect_archive(archive)
        for names in [('same.wav', 'SAME.wav'), ('same.wav', 'same.wav')]:
            data = io.BytesIO()
            with ZipFile(data, 'w') as archive:
                for name in names:
                    archive.writestr(name, b'x')
            with ZipFile(data) as archive, self.assertRaises(ValueError):
                IMPORT.inspect_archive(archive)
        data = io.BytesIO()
        with ZipFile(data, 'w') as archive:
            link = ZipInfo('link.wav'); link.create_system = 3; link.external_attr = (stat.S_IFLNK | 0o777) << 16
            archive.writestr(link, '../outside')
        with ZipFile(data) as archive, self.assertRaises(ValueError):
            IMPORT.inspect_archive(archive)
        data = io.BytesIO()
        with ZipFile(data, 'w', compression=ZIP_DEFLATED) as archive:
            archive.writestr('bomb.wav', b'0' * (4 * 1024 * 1024))
        with ZipFile(data) as archive, self.assertRaises(ValueError):
            IMPORT.inspect_archive(archive)

    def test_wave_format_and_riff_bounds_are_enforced_without_conversion(self):
        raw = io.BytesIO()
        with wave.open(raw, 'wb') as audio:
            audio.setnchannels(1); audio.setsampwidth(2); audio.setframerate(32000); audio.writeframes(b'\x01\x00' * 20)
        with self.assertRaisesRegex(ValueError, 'format'):
            IMPORT.inspect_wave(raw.getvalue())
        with ZipFile(self.archive) as original:
            published = original.read(self.manifest['entries'][0]['archive_member'])
        with self.assertRaisesRegex(ValueError, 'extent'):
            IMPORT.inspect_wave(published[:-1])

    def test_outputs_refuse_symlinks_and_preserve_existing_different_files(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            IMPORT.write_exact(root, 'clips/example.wav', b'original')
            with self.assertRaisesRegex(ValueError, 'overwrite'):
                IMPORT.write_exact(root, 'clips/example.wav', b'changed')
            self.assertEqual((root / 'clips/example.wav').read_bytes(), b'original')
            (root / 'linked').symlink_to(root / 'clips', target_is_directory=True)
            with self.assertRaisesRegex(ValueError, 'Symlink'):
                IMPORT.write_exact(root / 'linked', 'another.wav', b'x')


if __name__ == '__main__':
    unittest.main()
