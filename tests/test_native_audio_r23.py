"""Audio provenance fixtures are synthetic and never production character audio."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import wave

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('audio_r23', ROOT / 'scripts/collect-native-audio-r23.py')
audio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audio)


class SourceAudioImport(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.cache = Path(self.temporary.name) / 'cache'
        self.cache.mkdir()
        self.output = Path(self.temporary.name) / 'output'
        self.uid = 'fixture-only'
        self.catalogue = {self.uid: {'name': 'Synthetic provenance fixture', 'game': 'Fixture game'}}
        self.page = self.cache / 'page.html'
        self.page.write_text('<audio src="https://example.test/native.wav"></audio>')
        self.sound = self.cache / 'native.wav'
        with wave.open(str(self.sound), 'wb') as stream:
            stream.setnchannels(1)
            stream.setsampwidth(2)
            stream.setframerate(8000)
            stream.writeframes(bytes(800))
        self.entry = {
            'id': self.uid, 'game': 'Fixture game', 'source_bytes_transformed': False,
            'source_page': {'url': 'https://example.test/subject', 'path': 'page.html', 'sha256': audio.digest(self.page.read_bytes())},
            'source_audio': {'url': 'https://example.test/native.wav', 'path': 'native.wav', 'sha256': audio.digest(self.sound.read_bytes())},
            'review': {'accepted': True, 'phase_ambiguity': False, 'specific_form': 'Synthetic fixture', 'audible_observation': 'Silent test input only', 'language': 'None', 'limitations': ['Not character audio']},
        }

    def test_import_preserves_bytes_and_never_certifies(self):
        row = audio.import_entry(self.entry, self.cache, self.catalogue, self.output)
        self.assertEqual((self.output / row['path']).read_bytes(), self.sound.read_bytes())
        self.assertEqual(row['probe']['duration_seconds'], 0.05)
        self.assertFalse(row['canonical_fidelity_certified'])
        self.assertFalse(row['combat_audio_final'])

    def test_wrong_game_does_not_write(self):
        self.entry['game'] = 'Different game'
        with self.assertRaisesRegex(ValueError, 'wrong source game'):
            audio.import_entry(self.entry, self.cache, self.catalogue, self.output)
        self.assertFalse(self.output.exists())

    def test_changed_sound_is_refused(self):
        self.sound.write_bytes(self.sound.read_bytes() + b'changed')
        with self.assertRaisesRegex(ValueError, 'SHA-256 mismatch'):
            audio.import_entry(self.entry, self.cache, self.catalogue, self.output)

    def test_link_not_on_source_page_is_refused(self):
        self.entry['source_audio']['url'] = 'https://example.test/other.wav'
        with self.assertRaisesRegex(ValueError, 'not advertised'):
            audio.import_entry(self.entry, self.cache, self.catalogue, self.output)

    def test_uncertain_phase_and_transformed_bytes_are_refused(self):
        self.entry['review']['phase_ambiguity'] = True
        with self.assertRaisesRegex(ValueError, 'exact-form review'):
            audio.import_entry(self.entry, self.cache, self.catalogue, self.output)
        self.entry['review']['phase_ambiguity'] = False
        self.entry['source_bytes_transformed'] = True
        with self.assertRaisesRegex(ValueError, 'unchanged source bytes'):
            audio.import_entry(self.entry, self.cache, self.catalogue, self.output)

    def test_evidence_escape_is_refused(self):
        outside = self.cache.parent / 'outside.wav'
        outside.write_bytes(self.sound.read_bytes())
        self.entry['source_audio']['path'] = '../outside.wav'
        with self.assertRaisesRegex(ValueError, 'leaves its cache root'):
            audio.import_entry(self.entry, self.cache, self.catalogue, self.output)


if __name__ == '__main__':
    unittest.main()
