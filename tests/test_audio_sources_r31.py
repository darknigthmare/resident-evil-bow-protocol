"""Actual published audio bytes, source boundaries and archive hostile-input tests."""
import copy
import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile
import unittest
from zipfile import ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('audio_r31', ROOT / 'scripts/import-audio-sources-r31.py')
AUDIO = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(AUDIO)
PACK = ROOT / 'modules/fidelity-r31/audio'
MANIFEST = json.loads((PACK / 'manifest.json').read_text())


class AudioSourceTests(unittest.TestCase):
    def test_01_all_audio_is_byte_identical_to_published_archive_members(self):
        clips = {(row['assetId'], row['archiveMember']): row for row in MANIFEST['entries']}
        count = 0
        for source in MANIFEST['sources']:
            raw = AUDIO.checked(source['archive'])
            with ZipFile(io.BytesIO(raw)) as archive:
                for info in AUDIO.inspect_archive(archive):
                    if info.is_dir():
                        continue
                    clip = clips[(source['assetId'], info.filename)]
                    self.assertEqual((ROOT / clip['path']).read_bytes(), archive.read(info)); count += 1
        self.assertEqual(count, 218)

    def test_02_all_pcm_sources_decode_completely_without_silence_placeholders(self):
        waves = [clip for clip in MANIFEST['entries'] if clip['probe']['format'] == 'wav']
        self.assertEqual(len(waves), 201)
        for clip in waves:
            measured = AUDIO.inspect_wave((ROOT / clip['path']).read_bytes())
            self.assertEqual(measured, clip['probe']); self.assertTrue(measured['nonzeroSamples'])
        self.assertEqual({row['probe']['sampleRate'] for row in waves}, {22050, 48000})

    def test_03_actual_vorbis_streams_decode_with_retained_source_parameters(self):
        oggs = [clip for clip in MANIFEST['entries'] if clip['probe']['format'] == 'ogg']
        self.assertEqual(len(oggs), 17)
        for clip in oggs:
            path = ROOT / clip['path']; measured = AUDIO.inspect_ogg(path.read_bytes(), path)
            for key in ('codec', 'channels', 'sampleRate', 'frames', 'nonzeroSamples'):
                self.assertEqual(measured[key], clip['probe'][key])
            self.assertAlmostEqual(measured['durationSeconds'], clip['probe']['durationSeconds'], places=9)
            # A decoder receipt is not a cross-version bit-exact semantic audio proof.
            self.assertTrue(measured['measurementOnly']); self.assertFalse(measured['sourceFileConverted'])

    def test_04_file_and_pcm_dedup_are_distinct_and_never_semantic_counts(self):
        raw_hashes = {clip['sha256'] for clip in MANIFEST['entries']}
        pcm_hashes = {clip['probe']['decodedPcmSha256'] for clip in MANIFEST['entries']}
        self.assertEqual(len(raw_hashes), 218); self.assertEqual(len(pcm_hashes), 216)
        prior = set()
        for release in range(24, 29):
            prior.update(row['sha256'] for row in json.loads((ROOT / f'modules/fidelity-r{release}/audio/manifest.json').read_text())['entries'])
        self.assertFalse(raw_hashes & prior)
        self.assertEqual(MANIFEST['counts']['newPublishedFileHashesVsR24R28'], len(raw_hashes))

    def test_05_publisher_pages_bind_actual_group_game_and_member_names(self):
        self.assertEqual(len(MANIFEST['sources']), 4)
        for source in MANIFEST['sources']:
            page = gzip.decompress(AUDIO.checked(source['page']))
            self.assertEqual(AUDIO.digest(page), source['pageRawSha256'])
            self.assertIn(('<h1>' + source['title'] + '</h1>').encode(), page)
            self.assertIn(source['game'].encode(), page)
            for row in source['members']:
                self.assertIn(('<li>' + row['member'] + '</li>').encode(), page)

    def test_06_original_edition_and_phase_uncertainties_do_not_become_combat_audio(self):
        self.assertEqual(len(MANIFEST['identities']), 7)
        for clip in MANIFEST['entries']:
            self.assertIsNone(clip['identityId']); self.assertFalse(clip['targetEditionEquivalenceVerified'])
            self.assertFalse(clip['independentListeningCompleted']); self.assertFalse(clip['combatAudioAssigned'])
            self.assertFalse(clip['nativeGameBankCertified']); self.assertFalse(clip['canonicalFidelityCertified'])
            self.assertIsNone(clip['action']); self.assertIsNone(clip['phase']); self.assertIsNone(clip['language'])
        self.assertEqual(MANIFEST['counts']['exactTargetEditionAttributedFiles'], 0)

    def test_07_identity_context_is_separate_from_sound_action_proof(self):
        contexts = {row['id']: row for row in MANIFEST['identities']}
        for uid, context in contexts.items():
            raw = gzip.decompress(AUDIO.checked(context['page']))
            self.assertEqual(AUDIO.digest(raw), context['rawSha256'])
            self.assertEqual(context['httpStatus'], 200)
        self.assertIn(b'Alexander Ashford', gzip.decompress(AUDIO.checked(contexts['recv-nosferatu']['page'])))
        self.assertIn(b'Steve Burnside', gzip.decompress(AUDIO.checked(contexts['recv-mutated-steve']['page'])))

    def test_08_empty_publication_listings_are_retained_without_claiming_game_audio_absence(self):
        self.assertEqual(len(MANIFEST['screening']), 10)
        for row in MANIFEST['screening']:
            raw = gzip.decompress(AUDIO.checked(row['snapshot']))
            self.assertEqual(AUDIO.digest(raw), row['rawSha256']); self.assertEqual(row['httpStatus'], 200)
            self.assertIn(b'There are currently no assets available for this game on The Sounds Resource.', raw)
            self.assertIn('does not establish absence', row['scope'])

    def test_09_archive_traversal_absolute_and_case_collision_are_rejected(self):
        for name in ('../voice.wav', '/voice.wav', 'voice/../clip.wav', 'C:/voice.wav', 'voice\\clip.wav'):
            buffer = io.BytesIO()
            with ZipFile(buffer, 'w') as archive:
                archive.writestr(name, b'RIFF')
            with ZipFile(io.BytesIO(buffer.getvalue())) as archive:
                with self.assertRaises(ValueError): AUDIO.inspect_archive(archive)
        buffer = io.BytesIO()
        with ZipFile(buffer, 'w') as archive:
            archive.writestr('voice.wav', b'a'); archive.writestr('VOICE.wav', b'b')
        with ZipFile(io.BytesIO(buffer.getvalue())) as archive:
            with self.assertRaises(ValueError): AUDIO.inspect_archive(archive)

    def test_10_symlinks_and_declared_expansion_bombs_are_rejected(self):
        buffer = io.BytesIO(); info = ZipInfo('voice.wav'); info.create_system = 3; info.external_attr = (stat.S_IFLNK | 0o777) << 16
        with ZipFile(buffer, 'w') as archive: archive.writestr(info, '../outside')
        with ZipFile(io.BytesIO(buffer.getvalue())) as archive:
            with self.assertRaises(ValueError): AUDIO.inspect_archive(archive)
        class FakeArchive:
            def infolist(self):
                item = ZipInfo('voice.wav'); item.file_size = AUDIO.MAX_MEMBER + 1; item.compress_size = item.file_size
                return [item]
        with self.assertRaises(ValueError): AUDIO.inspect_archive(FakeArchive())

    def test_11_truncated_pcm_and_wrong_riff_extents_fail_closed(self):
        clip = next(row for row in MANIFEST['entries'] if row['probe']['format'] == 'wav')
        raw = (ROOT / clip['path']).read_bytes()
        with self.assertRaises(ValueError): AUDIO.inspect_wave(raw[:-1])
        changed = bytearray(raw); changed[4:8] = (len(raw) + 100).to_bytes(4, 'little')
        with self.assertRaises(ValueError): AUDIO.inspect_wave(bytes(changed))

    def test_12_manifest_rebuild_uses_only_pinned_evidence_and_matches_exactly(self):
        expected = (PACK / 'manifest.json').read_bytes()
        self.assertEqual(AUDIO.payload(AUDIO.build()), expected)
        request = json.loads((PACK / 'import-request.json').read_text())
        bad = dict(request['sources'][0]['archive']); bad['sha256'] = '0' * 64
        with self.assertRaises(ValueError): AUDIO.checked(bad)


def main():
    checks = []
    class EvidenceResult(unittest.TextTestResult):
        def addSuccess(self, test):
            super().addSuccess(test); checks.append({'name': test.id(), 'pass': True})
        def addFailure(self, test, error):
            super().addFailure(test, error); checks.append({'name': test.id(), 'pass': False, 'error': self._exc_info_to_string(error, test)})
        def addError(self, test, error):
            super().addError(test, error); checks.append({'name': test.id(), 'pass': False, 'error': self._exc_info_to_string(error, test)})
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(AudioSourceTests)
    result = unittest.TextTestRunner(verbosity=2, resultclass=EvidenceResult).run(suite)
    names = ['tests/test_audio_sources_r31.py', 'scripts/import-audio-sources-r31.py',
        'modules/fidelity-r31/audio/manifest.json', 'modules/fidelity-r31/audio/import-request.json',
        'modules/fidelity-r31/audio/decoded-probes.json']
    report = {'schema': 're.bow.audio-source-tests-r31/1', 'passed': result.testsRun - len(result.failures) - len(result.errors),
        'failed': len(result.failures) + len(result.errors), 'skipped': len(result.skipped), 'checks': checks,
        'inputs': [AUDIO.binding(name) for name in names],
        'scope': '218original archive members,201PCMfiles,17actualVorbis decodes,sourceedition/phase gates,dedup,screening and hostile archive boundaries. No semantic listening certification.'}
    (ROOT / 'docs/R31_AUDIO_SOURCE_TESTS.json').write_bytes(AUDIO.payload(report))
    print(json.dumps({'passed': report['passed'], 'failed': report['failed']}))
    return int(not result.wasSuccessful())


if __name__ == '__main__':
    raise SystemExit(main())
