"""ZIP provenance and traversal checks; fixtures never become product audio."""
import hashlib
import importlib.util
import json
from pathlib import Path
import stat
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('audio_archive_r24', ROOT / 'scripts/import-audio-archive-r24.py')
archive_audio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(archive_audio)


class AudioArchiveSafety(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.folder = Path(self.temporary.name)
        self.archive = self.folder / 'fixture.zip'

    def write(self, items, compression=zipfile.ZIP_DEFLATED):
        with zipfile.ZipFile(self.archive, 'w', compression=compression) as stream:
            for name, body in items:
                stream.writestr(name, body)
        return hashlib.sha256(self.archive.read_bytes()).hexdigest()

    def test_changed_archive_is_refused_before_inspection(self):
        self.write([('safe/file.txt', b'fixture')])
        with self.assertRaisesRegex(ValueError, 'SHA-256 mismatch'):
            archive_audio.inspect_archive(self.archive, '0' * 64)

    def test_traversal_absolute_and_windows_paths_are_refused(self):
        for path in ('../escape.mp3', '/absolute.mp3', 'drive:C.mp3', 'folder\\escape.mp3'):
            with self.subTest(path=path):
                checksum = self.write([(path, b'fixture')])
                with self.assertRaisesRegex(ValueError, 'Unsafe ZIP member path'):
                    archive_audio.inspect_archive(self.archive, checksum)

    def test_symlinks_and_case_collisions_are_refused(self):
        member = zipfile.ZipInfo('link.mp3')
        member.create_system = 3
        member.external_attr = (stat.S_IFLNK | 0o777) << 16
        checksum = self.write([(member, b'/outside')])
        with self.assertRaisesRegex(ValueError, 'Symlink'):
            archive_audio.inspect_archive(self.archive, checksum)
        checksum = self.write([('Clip.mp3', b'one'), ('clip.mp3', b'two')])
        with self.assertRaisesRegex(ValueError, 'case-colliding'):
            archive_audio.inspect_archive(self.archive, checksum)

    def test_zip_bomb_ratio_is_refused(self):
        checksum = self.write([('large.mp3', bytes(200000))])
        with self.assertRaisesRegex(ValueError, 'compression ratio'):
            archive_audio.inspect_archive(self.archive, checksum)

    def request(self, checksum):
        return {'schema': 're.bow.audio-archive-request/1',
                'source': {'archive_url': 'https://example.test/source.zip', 'page_url': 'https://example.test/source',
                           'archive_sha256': checksum, 'game': 'Fixture game', 'family': 'Fixture family',
                           'publication_commit': 'f' * 40, 'language': 'Fixture label', 'limitations': ['Provenance test only']},
                'audio_prefix': 'fixture/res/raw/', 'labels_member': 'fixture/res/values/strings.xml'}

    def test_external_entities_are_refused(self):
        checksum = self.write([('fixture/res/values/strings.xml', b'<!DOCTYPE x [<!ENTITY ext SYSTEM "file:///etc/passwd">]><resources/>')])
        with self.assertRaisesRegex(ValueError, 'external entities'):
            archive_audio.import_candidates(self.request(checksum), self.archive, self.folder / 'output')

    def test_real_source_bytes_copy_without_identity_certification(self):
        manifest = json.loads((ROOT / 'modules/fidelity-r24/audio/manifest.json').read_text())
        clip = manifest['entries'][0]
        data = (ROOT / 'modules/fidelity-r24/audio' / clip['path']).read_bytes()
        checksum = self.write([('fixture/res/raw/sample.mp3', data),
                               ('fixture/res/values/strings.xml', b'<resources><string name="sample">Fixture label only</string></resources>')])
        result = archive_audio.import_candidates(self.request(checksum), self.archive, self.folder / 'output')
        self.assertEqual(result['counts']['documentary_clips'], 1)
        row = result['entries'][0]
        self.assertEqual((self.folder / 'output' / row['path']).read_bytes(), data)
        self.assertIsNone(row['identity_id'])
        self.assertFalse(row['independent_listening_completed'])
        self.assertFalse(row['canonical_fidelity_certified'])
        self.assertFalse(row['combat_audio_final'])

    def test_wrong_pinned_commit_is_refused(self):
        checksum = self.write([('safe/file.txt', b'fixture')])
        metadata = self.folder / 'commit.json'
        metadata.write_text(json.dumps({'sha': '0' * 40}))
        with self.assertRaisesRegex(ValueError, 'pinned publication'):
            archive_audio.import_candidates(self.request(checksum), self.archive, self.folder / 'output', metadata)

    def test_audio_must_match_the_published_git_object(self):
        sample = json.loads((ROOT / 'modules/fidelity-r24/audio/manifest.json').read_text())['entries'][0]
        data = (ROOT / 'modules/fidelity-r24/audio' / sample['path']).read_bytes()
        checksum = self.write([('fixture/res/raw/sample.mp3', data),
                               ('fixture/res/values/strings.xml', b'<resources><string name="sample">Fixture label only</string></resources>')])
        metadata = self.folder / 'commit.json'
        metadata.write_text(json.dumps({'sha': 'f' * 40, 'files': [{'filename': 'res/raw/sample.mp3', 'sha': '0' * 40}]}))
        request = self.request(checksum)
        request['source']['commit_metadata_response_sha256'] = hashlib.sha256(metadata.read_bytes()).hexdigest()
        with self.assertRaisesRegex(ValueError, 'pinned Git blob'):
            archive_audio.import_candidates(request, self.archive, self.folder / 'output', metadata)


if __name__ == '__main__':
    unittest.main()
