"""Transport and curation guards use synthetic pixels, never game artwork."""
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('reviewed_import_r22', ROOT / 'scripts/import-reviewed-references-r22.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ReviewedReferenceImportTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.cache = self.root / 'cache'
        self.cache.mkdir()
        self.output = self.root / 'output'
        self.identity = MODULE.BASE.catalogue(ROOT)['re7-mia-winters-infected']
        self.declared = 'https://blogger.googleusercontent.com/img/b/id/asset/w80-h80/mia.png'
        self.requested = self.declared.replace('/w80-h80/', '/s0/')
        self.page_url = self.identity['sourcePage']
        self.heading = 'Mia Winters infected'
        self.adjacent = 'The infected Mia has visible pale eyes in this portrait.'
        self.html = ('<html><title>Reviewing Resident Evil 7</title><h2>Previous Jack section</h2>'
                     '<img src="' + self.declared + '"><h2>' + self.heading + '</h2><p>' + self.adjacent + '</p></html>')
        self.page = self.record('page', self.html.encode(), self.page_url, {'usable_document': True})
        image = Image.new('RGBA', (12, 16), (29, 48, 67, 255))
        image.putpixel((2, 4), (91, 72, 13, 0))
        stream = io.BytesIO()
        image.save(stream, format='PNG')
        self.image_bytes = stream.getvalue()
        self.image = self.record('image', self.image_bytes, self.requested, {
            'declared_url': self.declared, 'source_rendition': 'blogger-original-size',
            'decoded_verified': True, 'response_bytes_preserved': True, 'pixels_transformed': False,
            'width': 12, 'height': 16, 'decoded_rgba_sha256': MODULE.BASE.digest(image.tobytes())})
        self.review = {'reviewed': True, 'review_method': 'visual-and-adjacent-source-text',
                       'source_game': self.identity['game'], 'specific_form': 'Infected Mia portrait',
                       'source_heading': self.heading, 'adjacent_text': self.adjacent,
                       'visual_review_note': 'Portrait only; pale infected eyes visible.',
                       'limitations': ['Synthetic transport fixture; no character art certification.'],
                       'image_scope': 'portrait-reference', 'phase_ambiguity': False,
                       'reviewed_image_sha256': self.image['body_sha256'],
                       'reviewed_page_sha256': self.page['body_sha256']}
        self.request = {'schema': 're.bow.reviewed-source-import/1', 'entries': [
            {'id': self.identity['id'], 'page_metadata': 'page.json', 'image_metadata': 'image.json', 'curation': self.review}]}

    def record(self, name, body, source, extra):
        (self.cache / (name + '.bin')).write_bytes(body)
        record = {'requested_url': source, 'effective_url': source, 'http_status': 200,
                  'observed_at_utc': '2026-10-23T01:00:00+00:00', 'body_path': name + '.bin',
                  'body_sha256': MODULE.BASE.digest(body), 'body_bytes': len(body), 'body_truncated': False, **extra}
        (self.cache / (name + '.json')).write_text(json.dumps(record))
        return record

    def run_import(self):
        (self.cache / 'page.json').write_text(json.dumps(self.page))
        (self.cache / 'image.json').write_text(json.dumps(self.image))
        request_path = self.root / 'request.json'
        request_path.write_text(json.dumps(self.request))
        return MODULE.import_references(request_path, self.cache, self.output)

    def test_image_before_its_heading_is_bound_explicitly_and_png_bytes_are_preserved(self):
        result = self.run_import()
        record = json.loads((self.output / 'manifest.json').read_text())['entries'][0]
        self.assertEqual((self.output / record['image']).read_bytes(), self.image_bytes)
        self.assertEqual(record['curation']['source_heading'], self.heading)
        self.assertEqual(record['view_scope'], 'portrait')
        self.assertEqual(result['portrait_views'], 1)
        self.assertFalse(record['canonical_fidelity_certified'])
        self.assertFalse(record['final_art'])
        self.assertEqual(self.run_import(), result)

    def test_same_asset_original_size_is_allowed_but_other_asset_and_crop_are_not(self):
        self.assertTrue(MODULE.original_rendition(self.declared, self.requested, 'blogger-original-size'))
        self.assertFalse(MODULE.original_rendition(self.declared, self.requested.replace('/asset/', '/another/'), 'blogger-original-size'))
        self.assertFalse(MODULE.original_rendition(self.declared, self.requested.replace('/s0/', '/w10-h10/'), 'blogger-original-size'))
        self.image['requested_url'] = self.requested.replace('/asset/', '/another/')
        self.image['effective_url'] = self.image['requested_url']
        with self.assertRaisesRegex(ValueError, 'same-asset'):
            self.run_import()
        self.assertFalse(self.output.exists())

    def test_page_cover_is_rejected_even_with_a_manually_accepted_named_review(self):
        covered = self.html.replace('<html>', '<html><meta property="og:image" content="' + self.declared + '">')
        self.page = self.record('page', covered.encode(), self.page_url, {'usable_document': True})
        self.review['reviewed_page_sha256'] = self.page['body_sha256']
        with self.assertRaisesRegex(ValueError, 'page cover'):
            self.run_import()
        self.assertFalse(self.output.exists())

    def test_unknown_phase_and_wrong_game_cannot_be_approved(self):
        self.review['phase_ambiguity'] = True
        with self.assertRaisesRegex(ValueError, 'ambiguous phases'):
            self.run_import()
        self.review['phase_ambiguity'] = False
        self.review['source_game'] = 'Resident Evil remake (2002)'
        with self.assertRaisesRegex(ValueError, 'source game'):
            self.run_import()
        self.assertFalse(self.output.exists())

    def test_stale_image_review_and_false_nearby_text_are_rejected(self):
        self.review['reviewed_image_sha256'] = 'f' * 64
        with self.assertRaisesRegex(ValueError, 'Visual review'):
            self.run_import()
        self.review['reviewed_image_sha256'] = self.image['body_sha256']
        self.review['adjacent_text'] = 'A scissor weapon phase never shown on this page.'
        with self.assertRaisesRegex(ValueError, 'near this exact image'):
            self.run_import()
        self.assertFalse(self.output.exists())

    def test_import_does_not_infer_complete_body_geometry_from_named_body_scope(self):
        self.review['image_scope'] = 'named-body-reference'
        self.review['visual_review_note'] = 'Body composition extends beyond the source frame.'
        self.review['limitations'] = ['Right and lower body edges are cropped in the source.']
        self.run_import()
        record = json.loads((self.output / 'manifest.json').read_text())['entries'][0]
        self.assertEqual(record['view_scope'], 'body')
        self.assertEqual(record['visible_review']['limitations'], self.review['limitations'])
        self.assertFalse(record['modular_parts'])

    def test_canonical_claim_and_existing_distinct_output_are_refused(self):
        self.review['canonical_fidelity_certified'] = True
        with self.assertRaisesRegex(ValueError, 'final canonical'):
            self.run_import()
        self.review.pop('canonical_fidelity_certified')
        target = self.output / self.identity['id']
        target.mkdir(parents=True)
        (target / 'reference.png').write_bytes(b'existing-user-output')
        with self.assertRaisesRegex(ValueError, 'overwrite'):
            self.run_import()
        self.assertEqual((target / 'reference.png').read_bytes(), b'existing-user-output')


if __name__ == '__main__':
    unittest.main()
