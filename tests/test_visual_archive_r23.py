"""Native archive preservation and adversarial import checks."""
import copy
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import stat
import unittest
import zipfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / 'modules/fidelity-r23/visual'
spec = importlib.util.spec_from_file_location('visual_archive', ROOT / 'scripts/import-visual-archive-r23.py')
tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool)


class VisualArchiveTests(unittest.TestCase):
    def setUp(self):
        self.request = json.loads((ROOT / 'docs/R23_VISUAL_IMPORT_REQUEST.json').read_text())
        self.archive = (MODULE / 'source/original.zip').read_bytes()
        self.page = (MODULE / 'source/page.html.txt').read_bytes()
        self.roster = {x['id']: x for x in json.loads((ROOT / 'data/roster.json').read_text())['catalog']}

    def prepare(self, request=None, archive=None, page=None):
        return tool.prepare(request or self.request, archive or self.archive, page or self.page, self.roster)

    def test_all_published_pixels_and_sources_equal_archive(self):
        prepared = self.prepare()
        for path, expected in prepared.items():
            self.assertEqual((MODULE / path).read_bytes(), expected, path)
        manifest = json.loads(prepared['manifest.json'])
        self.assertEqual(len(manifest['entries']), 7)
        with zipfile.ZipFile(io.BytesIO(self.archive)) as archive:
            atlas = tool.decode(archive.read(self.request['atlas']['member']))
        for item in manifest['entries']:
            x, y, width, height = item['crop']
            expected = atlas.crop((x, y, x + width, y + height))
            actual = tool.decode(prepared[item['image']])
            self.assertEqual(expected.tobytes(), actual.tobytes())
            self.assertEqual(hashlib.sha256(actual.tobytes()).hexdigest(), item['rgba_sha256'])
            self.assertFalse(item['full_body_sprite'])
            self.assertFalse(item['canonical_fidelity_certified'])

    def test_changed_source_page_or_archive_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Source bytes changed'):
            self.prepare(page=self.page + b'x')
        with self.assertRaisesRegex(ValueError, 'Source bytes changed'):
            self.prepare(archive=self.archive + b'x')

    def test_game_and_review_must_match(self):
        request = copy.deepcopy(self.request)
        request['entries'][0]['game'] = 'Resident Evil 3: Nemesis (1999)'
        with self.assertRaisesRegex(ValueError, 'different game'):
            self.prepare(request=request)
        request = copy.deepcopy(self.request)
        request['entries'][0]['reviewed'] = False
        with self.assertRaisesRegex(ValueError, 'Unreviewed'):
            self.prepare(request=request)

    def test_crop_outside_atlas_is_rejected(self):
        for crop in [[-1, 0, 128, 128], [500, 1000, 128, 128], [0, 0, 0, 128], [0, 0, 128.0, 128]]:
            with self.subTest(crop=crop):
                request = copy.deepcopy(self.request)
                request['entries'][0]['crop'] = crop
                with self.assertRaisesRegex(ValueError, 'Crop outside'):
                    self.prepare(request=request)

    def test_unsafe_archives_are_rejected_without_extraction(self):
        for name in ['../outside.png', '/absolute.png', 'folder\\outside.png', 'C:/outside.png']:
            buffer = io.BytesIO()
            with zipfile.ZipFile(buffer, 'w') as archive:
                archive.writestr(name, b'untrusted')
            with self.subTest(name=name), self.assertRaisesRegex(ValueError, 'Unsafe'):
                tool.validate_archive(buffer.getvalue())
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w') as archive:
            info = zipfile.ZipInfo('link.png')
            info.external_attr = (stat.S_IFLNK | 0o777) << 16
            archive.writestr(info, '../outside')
        with self.assertRaisesRegex(ValueError, 'Unsafe'):
            tool.validate_archive(buffer.getvalue())

    def test_wrong_forms_remain_excluded(self):
        manifest = json.loads((MODULE / 'manifest.json').read_text())
        included = {x['id'] for x in manifest['entries']}
        self.assertTrue({'re3r-nemesis', 're3r-hunter-gamma', 're3r-licker'}.isdisjoint(included))
        self.assertEqual(manifest['counts']['rigs'], 0)
        self.assertEqual(manifest['counts']['combat_clips'], 0)

    def test_safe_nested_atlas_keeps_its_manifest_path(self):
        buffer = io.BytesIO()
        request = copy.deepcopy(self.request)
        with zipfile.ZipFile(io.BytesIO(self.archive)) as original, zipfile.ZipFile(buffer, 'w') as nested:
            for item in original.infolist():
                nested.writestr('nested/' + item.filename, original.read(item))
        archive_data = buffer.getvalue()
        request['archive']['sha256'] = hashlib.sha256(archive_data).hexdigest()
        request['atlas']['member'] = 'nested/' + request['atlas']['member']
        output = self.prepare(request=request, archive=archive_data)
        manifest = json.loads(output['manifest.json'])
        for entry in manifest['entries']:
            self.assertIn(entry['source_atlas'], output)

    def test_re5_mode_sources_preserve_bytes_without_campaign_binding(self):
        directory = MODULE / 'supplement/re5-mercenaries'
        manifest = json.loads((directory / 'manifest.json').read_text())
        archive_data = (directory / 'original.zip').read_bytes()
        self.assertEqual(tool.sha(archive_data), manifest['archive']['sha256'])
        self.assertEqual(tool.sha((directory / 'page.html.txt').read_bytes()), manifest['page']['sha256'])
        with tool.validate_archive(archive_data) as archive:
            for member in manifest['archive']['members']:
                self.assertEqual(tool.sha(archive.read(member['name'])), member['sha256'])
            for entry in manifest['entries']:
                published = (directory / entry['image']).read_bytes()
                self.assertEqual(published, archive.read(entry['name'] + '.png'))
                self.assertEqual(tool.sha(published), entry['sha256'])
                self.assertEqual(entry['dossier_binding'], 'EXCLUDED_MODE_VARIANT_NOT_CAMPAIGN_CERTIFIED')
                self.assertFalse(entry['canonical_fidelity_certified'])
        self.assertEqual(manifest['counts']['dossier_bindings'], 0)


if __name__ == '__main__':
    unittest.main()
