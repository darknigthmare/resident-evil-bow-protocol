"""Source transport/copy tests; synthetic pixels do not represent character art."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('source_import', ROOT / 'scripts/import-source-references-r21.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class SourceReferenceImportTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.cache = self.root / 'cache'
        self.cache.mkdir()
        self.output = self.root / 'out'
        self.page_url = 'https://www.evilresource.com/resident-evil/enemies/cerberus'
        self.image_url = 'https://www.evilresource.com/images/data/full/re1/cerberus.png'
        self.make_cache('PNG')

    def make_cache(self, image_format):
        page = ('<html><title>Cerberus (Resident Evil) | Evil Resource</title>'
                '<meta property="og:image" content="' + self.image_url + '"></html>').encode()
        self.page = self.record('page', page, self.page_url, {'usable_document': True})
        pixels = Image.new('RGBA', (9, 12), (15, 37, 65, 255))
        pixels.putpixel((4, 5), (82, 12, 15, 0))
        encoded = io.BytesIO()
        pixels.save(encoded, format=image_format, lossless=True)
        self.source_bytes = encoded.getvalue()
        with Image.open(io.BytesIO(self.source_bytes)) as decoded:
            rgba = decoded.convert('RGBA')
        self.image = self.record('image', self.source_bytes, self.image_url, {
            'usable_image': True, 'decoded_verified': True, 'response_bytes_preserved': True,
            'pixels_transformed': False, 'width': 9, 'height': 12,
            'decoded_rgba_sha256': MODULE.digest(rgba.tobytes()),
            'source_page_bindings': [{'page_requested_url': self.page_url, 'page_effective_url': self.page_url,
                                      'page_body_sha256': self.page['body_sha256'], 'identity_ids': ['re1-cerberus'],
                                      'automatic_identity_binding_allowed': True}]})
        self.request = {'schema': 're.bow.source-reference-import/1', 'entries': [
            {'id': 're1-cerberus', 'page_metadata': 'page.json', 'image_metadata': 'image.json'}]}

    def record(self, name, body, source_url, extra):
        (self.cache / (name + '.bin')).write_bytes(body)
        record = {'requested_url': source_url, 'effective_url': source_url, 'http_status': 200,
                  'observed_at_utc': '2026-10-23T01:00:00+00:00', 'body_path': name + '.bin',
                  'body_sha256': MODULE.digest(body), 'body_bytes': len(body), 'body_truncated': False, **extra}
        (self.cache / (name + '.json')).write_text(json.dumps(record))
        return record

    def run_import(self):
        request_path = self.root / 'request.json'
        request_path.write_text(json.dumps(self.request))
        return MODULE.import_references(request_path, self.cache, self.output)

    def test_png_source_bytes_are_preserved_and_repeatable_without_certification(self):
        result = self.run_import()
        self.assertEqual(result['imported_static_references'], 1)
        self.assertEqual((self.output / 're1-cerberus/reference.png').read_bytes(), self.source_bytes)
        manifest = json.loads((self.output / 're1-cerberus/source-reference.json').read_text())
        self.assertEqual(manifest['available_states'], ['reference'])
        for flag in ['canonical_fidelity_certified', 'final_art', 'animated', 'modular_parts', 'combat_integrated', 'can_mirror']:
            self.assertFalse(manifest[flag])
        self.assertEqual(self.run_import(), result)

    def test_webp_conversion_preserves_every_decoded_rgba_pixel(self):
        self.make_cache('WEBP')
        self.run_import()
        with Image.open(io.BytesIO(self.source_bytes)) as original, Image.open(self.output / 're1-cerberus/reference.png') as result:
            self.assertEqual(result.format, 'PNG')
            self.assertEqual(original.convert('RGBA').tobytes(), result.convert('RGBA').tobytes())
            self.assertEqual(original.size, result.size)

    def test_corrupted_cache_or_wrong_source_game_is_rejected_before_writing(self):
        for mutation in ['image-bytes', 'page-url', 'primary-image', 'page-binding', 'title-game', 'image-dimensions']:
            with self.subTest(mutation=mutation):
                self.make_cache('PNG')
                if mutation == 'image-bytes':
                    (self.cache / 'image.bin').write_bytes(b'changed')
                elif mutation == 'page-url':
                    self.page['effective_url'] = self.page_url.replace('/resident-evil/', '/resident-evil-remake/')
                elif mutation == 'primary-image':
                    self.image['requested_url'] = self.image_url.replace('cerberus', 'zombie')
                elif mutation == 'page-binding':
                    self.image['source_page_bindings'][0]['page_body_sha256'] = 'f' * 64
                elif mutation == 'title-game':
                    altered = (self.cache / 'page.bin').read_bytes().replace(b'(Resident Evil)', b'(Resident Evil Remake)')
                    # A page for a remake must not pass a classic-game cue merely via substring.
                    self.page = self.record('page', altered, self.page_url, {'usable_document': True})
                    self.image['source_page_bindings'][0]['page_body_sha256'] = self.page['body_sha256']
                elif mutation == 'image-dimensions':
                    self.image['width'] = 18
                (self.cache / 'page.json').write_text(json.dumps(self.page))
                (self.cache / 'image.json').write_text(json.dumps(self.image))
                with self.assertRaises(ValueError):
                    self.run_import()
                self.assertFalse(self.output.exists())

    def test_unknown_uid_generic_blog_generated_flags_and_mirroring_are_refused(self):
        for mutation in ['unknown', 'blog', 'generated', 'mirror']:
            with self.subTest(mutation=mutation):
                self.make_cache('PNG')
                if mutation == 'unknown':
                    self.request['entries'][0]['id'] = 'unknown-game-body'
                elif mutation == 'blog':
                    identities = MODULE.catalogue(ROOT)
                    self.request['entries'][0]['id'] = next(key for key, item in identities.items() if 'blogspot' in item['sourcePage'])
                elif mutation == 'generated':
                    self.image['generated'] = True
                    (self.cache / 'image.json').write_text(json.dumps(self.image))
                elif mutation == 'mirror':
                    self.request['entries'][0]['mirror'] = True
                with self.assertRaises(ValueError):
                    self.run_import()
                self.assertFalse(self.output.exists())

    def test_existing_distinct_output_is_preserved(self):
        self.output.mkdir()
        target = self.output / 're1-cerberus'
        target.mkdir()
        (target / 'reference.png').write_bytes(b'user-file')
        with self.assertRaises(ValueError):
            self.run_import()
        self.assertEqual((target / 'reference.png').read_bytes(), b'user-file')

    def test_all_catalogue_ids_keep_context_scenes_distinct_from_bodies(self):
        identities = MODULE.catalogue(ROOT)
        self.assertEqual(len(identities), 389)
        self.assertEqual(sum(item['reference_kind'] == 'context-scene' for item in identities.values()), 43)
        self.assertEqual(sum(item['reference_kind'] == 'fighter-body' for item in identities.values()), 346)

    def test_source_notation_and_canonical_routes_cannot_change_the_game(self):
        self.assertEqual(MODULE.route_subject('hunter-beta'), MODULE.normalized('Hunter β').replace(' ', ''))
        self.assertEqual(MODULE.route_subject('rpd-zombie'), MODULE.normalized('R.P.D.').replace(' ', ''))
        self.assertTrue(MODULE.same_subject_url(
            'https://www.evilresource.com/resident-evil-5/enemies/albert-wesker-enemy',
            'https://www.evilresource.com/resident-evil-5/enemies/albert-wesker'))
        self.assertFalse(MODULE.same_subject_url(
            'https://www.evilresource.com/resident-evil/enemies/cerberus',
            'https://www.evilresource.com/resident-evil-remake/enemies/cerberus'))
        self.assertFalse(MODULE.same_subject_url(
            'https://www.evilresource.com/resident-evil/enemies/cerberus',
            'https://www.evilresource.com/resident-evil/enemies/zombie'))


if __name__ == '__main__':
    unittest.main()
