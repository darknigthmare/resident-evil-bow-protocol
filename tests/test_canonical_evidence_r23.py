"""Verify source integrity and reject evidence that changes meaning or identity."""
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / 'modules/fidelity-r23/canonical'
spec = importlib.util.spec_from_file_location('canonical_r23', ROOT / 'scripts/build-canonical-evidence-r23.py')
canonical = importlib.util.module_from_spec(spec)
spec.loader.exec_module(canonical)


class CanonicalEvidenceTests(unittest.TestCase):
    def test_preserved_sources_and_quotes_survive_a_clean_checkout(self):
        manifest = json.loads((MODULE / 'manifest.json').read_text())
        roster = json.loads((ROOT / 'data/roster.json').read_text())['catalog']
        self.assertEqual({row['id'] for row in manifest['entries']}, {row['id'] for row in roster})
        sources = {row['id']: row for row in manifest['sources']}
        raw_pages = {}
        for source_id, source in sources.items():
            path = (MODULE / source['snapshot']).resolve(strict=True)
            self.assertTrue(path.is_relative_to(MODULE.resolve()))
            raw = path.read_bytes()
            self.assertEqual(hashlib.sha256(raw).hexdigest(), source['snapshot_sha256'])
            body = gzip.decompress(raw)
            self.assertEqual(hashlib.sha256(body).hexdigest(), source['raw_sha256'])
            self.assertEqual(len(body), source['raw_bytes'])
            raw_pages[source_id] = body
        parser_spec = importlib.util.spec_from_file_location('page_parser', ROOT / 'scripts/collect-catalog-sources-r21.py')
        parser_module = importlib.util.module_from_spec(parser_spec)
        parser_spec.loader.exec_module(parser_module)
        for entry in manifest['entries']:
            self.assertFalse(entry['canonical_fidelity_certified'])
            for claim in entry['claims']:
                source = sources[claim['source_id']]
                page = parser_module.parse_page(raw_pages[source['id']], source['effective_url'])
                canonical.check_claim(claim, {'game': entry['game'], 'sourcePage': entry['page_url']}, page)
                self.assertEqual(claim['page_sha256'], source['raw_sha256'])
            for mention in entry['additional_documentary_mentions']:
                self.assertIn(mention['source_id'], sources)
                self.assertFalse(mention['exact_game_and_form_verified'])

    def test_tampered_response_bytes_are_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / 'page.html').write_bytes(b'changed')
            with self.assertRaisesRegex(ValueError, 'bytes changed'):
                canonical.cache_body(root, {'body_path': 'page.html', 'body_sha256': hashlib.sha256(b'original').hexdigest(), 'http_status': 200, 'requested_url': 'https://example.invalid/'})

    def test_cache_path_cannot_escape_its_root(self):
        with tempfile.TemporaryDirectory() as temporary:
            outer = Path(temporary)
            (outer / 'cache').mkdir()
            (outer / 'outside').write_bytes(b'text')
            with self.assertRaisesRegex(ValueError, 'escapes'):
                canonical.cache_body(outer / 'cache', {'body_path': '../outside'})

    def test_a_quote_cannot_be_transferred_to_a_different_game(self):
        claim = {'game': 'RE2 original', 'page_url': 'https://example.invalid/re2', 'type': 'move', 'excerpt': 'It attacks.', 'canonical_fidelity_certified': False}
        with self.assertRaisesRegex(ValueError, 'different game'):
            canonical.check_claim(claim, {'game': 'RE2 remake', 'sourcePage': claim['page_url']}, {'title': '', 'article_text': claim['excerpt']})

    def test_absent_quotes_and_movement_heights_cannot_become_body_dimensions(self):
        identity = {'game': 'RE4', 'sourcePage': 'https://example.invalid/re4'}
        claim = {'game': 'RE4', 'page_url': identity['sourcePage'], 'type': 'dimension', 'quantity_kind': 'jump_height', 'excerpt': 'leap 20 metres', 'canonical_fidelity_certified': False}
        with self.assertRaisesRegex(ValueError, 'not body dimensions'):
            canonical.check_claim(claim, identity, {'title': '', 'article_text': claim['excerpt']})
        claim['type'] = 'move'
        with self.assertRaisesRegex(ValueError, 'absent'):
            canonical.check_claim(claim, identity, {'title': '', 'article_text': 'No actions are documented.'})

    def test_negated_weakpoints_and_source_disagreements_stay_explicit(self):
        manifest = json.loads((MODULE / 'manifest.json').read_text())
        entries = {row['id']: row for row in manifest['entries']}
        for uid in ('re1-tyrant', 're1r-tyrant'):
            claim = next(row for row in entries[uid]['claims'] if row['type'] == 'weakpoint')
            self.assertEqual(claim['polarity'], 'NEGATED')
            self.assertIn("doesn't make it vulnerable", claim['excerpt'])
        conflict = next(item for item in manifest['conflicts'] if item['uid'] == 're5-licker-beta')
        self.assertFalse(conflict['gameplay_changed'])
        self.assertIn('Progenitor', conflict['sources'][0]['excerpt'])
        self.assertIn('Uroboros', conflict['sources'][1]['excerpt'])
        self.assertEqual(manifest['summary']['certified_body_scales'], 0)
        creation = next(item for item in entries['re3r-ne-alpha-parasite']['claims'] if item['label'] == 'Parasitage par Nemesis')
        self.assertEqual(creation['actor_uid'], 're3r-nemesis')
        self.assertEqual(creation['subject_role'], 'creation_context_not_host_command')


if __name__ == '__main__':
    unittest.main()
