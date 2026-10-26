"""New source links keep real attribution/counts and do not replace historical data."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('dossier_additions_r27', ROOT / 'scripts/build-dossier-additions-r27.py')
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)


class DossierAdditionsR27Tests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.values = {}
        for name in BUILDER.PATHS:
            path = self.root / name; path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes((ROOT / name).read_bytes())
            self.values[name] = json.loads(path.read_text())

    def write(self, name, value):
        (self.root / name).write_text(json.dumps(value))

    def test_real_additions_are_complete_read_only_and_scoped(self):
        before = {name: (self.root / name).read_bytes() for name in BUILDER.PATHS}
        index = BUILDER.build(self.root)
        self.assertEqual(index['summary'], {'identities': 389, 'newAudioClips': 330, 'newAudioIdentities': 1,
                         'newClaims': 84, 'newClaimIdentities': 81, 'cumulativeAudioIdentities': 21,
                         'cumulativeClaimIdentities': 356})
        self.assertEqual(len(index['identities']), 389)
        self.assertFalse(index['canonicalFidelityCertified'])
        zombie = next(item for item in index['identities'] if item['id'] == 're3r-zombie')
        self.assertEqual(zombie['audio']['href'], 'audio/index.html?identity=re3r-zombie')
        self.assertFalse(zombie['audio']['nativeBankCertified'])
        for name in BUILDER.PATHS:
            self.assertEqual((self.root / name).read_bytes(), before[name], name)

    def test_unknown_subjects_and_unsupported_certification_are_rejected(self):
        audio_name, canonical_name = BUILDER.PATHS[2:]
        audio = copy.deepcopy(self.values[audio_name]); audio['entries'][0]['identity_id'] = 'not-a-real-catalogue-identity'
        self.write(audio_name, audio)
        with self.assertRaisesRegex(ValueError, 'attribution'):
            BUILDER.build(self.root)
        self.write(audio_name, self.values[audio_name])
        for field, value in [('subject_uid', 'not-the-subject'), ('canonical_fidelity_certified', True)]:
            canonical = copy.deepcopy(self.values[canonical_name]); canonical['claims'][0][field] = value
            self.write(canonical_name, canonical)
            with self.assertRaisesRegex(ValueError, 'claim'):
                BUILDER.build(self.root)

    def test_duplicate_entries_and_false_aggregate_totals_are_rejected(self):
        previous_name, audio_name, canonical_name = BUILDER.PATHS[1:]
        for name, field, mutate in [
            (audio_name, 'entries', lambda entries: entries[1].update(clip_id=entries[0]['clip_id'])),
            (canonical_name, 'claims', lambda entries: entries[1].update(id=entries[0]['id']))]:
            changed = copy.deepcopy(self.values[name]); mutate(changed[field]); self.write(name, changed)
            with self.assertRaises(ValueError):
                BUILDER.build(self.root)
            self.write(name, self.values[name])
        audio = copy.deepcopy(self.values[audio_name]); audio['counts']['documentary_clips'] += 1; self.write(audio_name, audio)
        with self.assertRaisesRegex(ValueError, 'counts'):
            BUILDER.build(self.root)
        self.write(audio_name, self.values[audio_name])
        previous = copy.deepcopy(self.values[previous_name]); previous['identities'].append(previous['identities'][0]); self.write(previous_name, previous)
        with self.assertRaisesRegex(ValueError, 'index'):
            BUILDER.build(self.root)


if __name__ == '__main__':
    unittest.main()
