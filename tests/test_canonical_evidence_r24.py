"""Check actual R24 evidence bytes, transcript layers, phases and narrow corroboration."""
import copy
import gzip
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / 'modules/fidelity-r24/canonical'
spec = importlib.util.spec_from_file_location('canonical_r24', ROOT / 'scripts/build-canonical-evidence-r24.py')
canonical = importlib.util.module_from_spec(spec)
spec.loader.exec_module(canonical)


class CanonicalEvidenceR24Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((MODULE / 'manifest.json').read_text())
        cls.sources = {row['id']: row for row in cls.manifest['sources']}
        cls.roster = {row['id']: row for row in json.loads((ROOT / 'data/roster.json').read_text())['catalog']}
        parser_spec = importlib.util.spec_from_file_location('page_parser_r24', ROOT / 'scripts/collect-catalog-sources-r21.py')
        cls.parser = importlib.util.module_from_spec(parser_spec)
        parser_spec.loader.exec_module(cls.parser)

    def test_sources_and_every_quotation_verify_without_ignored_caches(self):
        pages = {}
        for source_id, source in self.sources.items():
            path = (MODULE / source['snapshot']).resolve(strict=True)
            self.assertTrue(path.is_relative_to((ROOT / 'modules').resolve()))
            packed = path.read_bytes()
            self.assertEqual(canonical.sha(packed), source['snapshot_sha256'])
            raw = gzip.decompress(packed)
            self.assertEqual(canonical.sha(raw), source['raw_sha256'])
            pages[source_id] = canonical.parse_document(self.parser, raw, source)
        for claim in self.manifest['claims']:
            canonical.validate_claim(claim, self.sources, pages, self.roster)
        for gap in self.manifest['scope_gaps']:
            for evidence in gap['evidence']:
                canonical.verify_quote(evidence, self.sources[evidence['source_id']], pages[evidence['source_id']])

    def test_new_review_coverage_really_extends_the_preserved_r23_subset(self):
        previous = ROOT / 'modules/fidelity-r23/canonical/manifest.json'
        self.assertEqual(canonical.sha(previous.read_bytes()), self.manifest['previous_r23_manifest']['sha256'])
        old = json.loads(previous.read_text())
        old_ids = {item['id'] for item in old['entries'] if item['claims']}
        new_ids = {claim['uid'] for claim in self.manifest['claims']}
        self.assertEqual(len(new_ids - old_ids), self.manifest['summary']['newly_reviewed_identities'])
        self.assertGreater(len(new_ids - old_ids), 60)
        self.assertEqual(self.manifest['summary']['previous_r23_claims_preserved'], 38)

    def test_original_and_remake_evidence_cannot_be_interchanged(self):
        claim = copy.deepcopy(next(item for item in self.manifest['claims'] if item['uid'] == 're4-regenerator'))
        claim['evidence'][0]['game_key'] = 'resident-evil-4-remake'
        with self.assertRaisesRegex(ValueError, 'another original/remake'):
            canonical.validate_claim(claim, self.sources, {}, self.roster)

    def test_editorial_intro_is_not_accepted_as_an_in_game_transcript(self):
        evidence = {'source_id': 'fixture', 'game_key': 'resident-evil-4', 'phase': 'RE4 file', 'scope': 'Example', 'layer': 'transcribed-in-game-file', 'excerpt': 'Editorial introduction.'}
        source = {'game_keys': ['resident-evil-4']}
        page = {'article_text': 'Editorial introduction.', 'main_text': 'Editorial introduction.\nTranscript\nOnly this is the in-game text.\nLocation\nRoom'}
        with self.assertRaisesRegex(ValueError, 'Quotation not found'):
            canonical.verify_quote(evidence, source, page)

    def test_two_pages_from_one_publisher_are_not_independent_corroboration(self):
        claim = copy.deepcopy(next(item for item in self.manifest['claims'] if item['independently_corroborated']))
        fake_sources = copy.deepcopy(self.sources)
        first_publisher = fake_sources[claim['evidence'][0]['source_id']]['publisher']
        pages = {}
        for evidence in claim['evidence']:
            source = fake_sources[evidence['source_id']]
            source['publisher'] = first_publisher
            pages[evidence['source_id']] = {'article_text': evidence['excerpt'], 'main_text': ''}
        with self.assertRaisesRegex(ValueError, 'distinct publishers'):
            canonical.validate_claim(claim, fake_sources, pages, self.roster)

    def test_action_height_and_vague_dimensions_cannot_become_exact_body_sizes(self):
        claim = copy.deepcopy(next(item for item in self.manifest['claims'] if item['type'] == 'dimension'))
        evidence = claim['evidence'][0]
        pages = {evidence['source_id']: {'article_text': evidence['excerpt'], 'main_text': ''}}
        claim['quantity']['kind'] = 'jump_height'
        with self.assertRaisesRegex(ValueError, 'Action distance'):
            canonical.validate_claim(claim, self.sources, pages, self.roster)
        claim['quantity']['kind'] = 'body_length'
        claim['quantity']['exact'] = True
        with self.assertRaisesRegex(ValueError, 'vague measurement'):
            canonical.validate_claim(claim, self.sources, pages, self.roster)

    def test_phase_and_variant_limits_survive_the_export(self):
        yawn = next(item for item in self.manifest['claims'] if item['uid'] == 're1r-yawn')
        self.assertEqual(yawn['polarity'], 'NEGATED')
        self.assertIn('Second encounter only', yawn['phase'])
        u8 = next(item for item in self.manifest['claims'] if item['label'] == 'U8 File: B.O.W. volants indépendants')
        self.assertEqual(u8['polarity'], 'NEGATED_IDENTITY')
        prime = next(item for item in self.manifest['scope_gaps'] if item['name'] == 'U-8 Prime')
        self.assertIsNone(prime['catalogue_uid'])
        self.assertIn('NOT_PLAYABLE_COVERAGE', prime['status'])

    def test_transcribed_game_content_does_not_claim_a_direct_primary_capture(self):
        self.assertGreater(self.manifest['summary']['claims_with_transcribed_in_game_evidence'], 10)
        self.assertEqual(self.manifest['summary']['direct_primary_captures'], 0)
        self.assertTrue(all(not item['direct_primary_capture'] for item in self.sources.values()))
        followup = self.manifest['conflict_followup']
        self.assertTrue(followup['previous_r23_conflict_preserved'])
        self.assertIn('NATIVE_COMPARISON_PENDING', followup['status'])


if __name__ == '__main__':
    unittest.main()
