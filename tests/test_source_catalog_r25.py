"""Cumulative source indices retain history and reject invented assignments."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CATALOG = load('model_catalog_r25', 'scripts/build-model-catalog-r25.py')
INDEX = load('dossier_index_r25', 'scripts/build-dossier-source-index-r25.py')


class SourceCatalogR25Tests(unittest.TestCase):
    def test_cumulative_model_index_keeps_every_historical_model_and_source_clip(self):
        path = ROOT / 'modules/fidelity-r24/models/catalog.json'
        before = path.read_bytes()
        historical = json.loads(before)
        result = CATALOG.build()
        self.assertEqual(path.read_bytes(), before)
        entries = {entry['id']: entry for entry in result['entries']}
        for original in historical['entries']:
            current = entries[original['id']]
            for key in ('model', 'textures', 'archive', 'clips'):
                self.assertEqual(current[key], original[key], (original['id'], key))
            self.assertTrue(current['base'].startswith('../../fidelity-r24/'))
        self.assertIs(result['sourceFilesRewritten'], False)
        self.assertIs(result['canonicalFidelityCertified'], False)

    def test_changed_source_size_hash_and_path_escape_are_refused(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            base = root / 'pack'
            base.mkdir()
            (base / 'source.bin').write_bytes(b'preserved source')
            raw = (base / 'source.bin').read_bytes()
            record = {'path': 'source.bin', 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
            CATALOG.check(record, base)
            for bad in ({**record, 'bytes': len(raw) + 1}, {**record, 'sha256': '0' * 64}):
                with self.assertRaises(ValueError):
                    CATALOG.check(bad, base)
            (root / 'outside.bin').write_bytes(b'outside')
            (base / 'escape.bin').symlink_to(root / 'outside.bin')
            for value in ('../outside.bin', '/outside.bin', 'a/../source.bin', 'escape.bin', r'a\source.bin'):
                with self.assertRaises(ValueError):
                    CATALOG.local_path(base, value)

    def test_audio_and_candidate_links_never_become_exact_native_claims(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            def write(path, data):
                target = root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(json.dumps(data))
            write('data/roster.json', {'catalog': [{'id': 'subject'}]})
            write('modules/fidelity-r25/models/catalog.json', {'entries': [
                {'id': 'port-candidate', 'candidateUid': 'subject', 'label': 'Different port'}]})
            clip = {'identity_id': 'subject', 'assignment_status': 'PUBLISHED_SUBJECT_GROUP_WITH_GAME_CONTEXT',
                    'native_bank_certified': False, 'canonical_fidelity_certified': False}
            audio = {'entries': [clip], 'counts': {'documentary_clips': 1}}
            write('modules/fidelity-r25/audio/manifest.json', audio)
            original = INDEX.ROOT
            INDEX.ROOT = root
            try:
                result = INDEX.build()
                row = result['identities'][0]
                self.assertEqual(row['models'][0]['relation'], 'candidate')
                self.assertEqual(row['audio']['clips'], 1)
                self.assertIs(row['audio']['independentListeningCompleted'], False)
                for update in ({'identity_id': 'unknown'}, {'assignment_status': 'FAMILY_REFERENCE_ONLY'},
                               {'native_bank_certified': True}, {'canonical_fidelity_certified': True}):
                    write('modules/fidelity-r25/audio/manifest.json', {**audio, 'entries': [{**clip, **update}]})
                    with self.assertRaises(ValueError):
                        INDEX.build()
            finally:
                INDEX.ROOT = original


if __name__ == '__main__':
    unittest.main()
