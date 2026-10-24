import copy
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('canonical_r25', ROOT / 'scripts/build-canonical-evidence-r25.py')
BUILD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILD)
MODULE = ROOT / 'modules/fidelity-r25/canonical'


class CanonicalEvidenceR25Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((MODULE / 'manifest.json').read_text())
        cls.roster = {r['id']: r for r in json.loads((ROOT / 'data/roster.json').read_text())['catalog']}
        cls.sources = {s['id']: s for s in cls.manifest['sources']}
        cls.pages = {}
        for source in cls.sources.values():
            packed = (MODULE / source['snapshot']).read_bytes()
            assert hashlib.sha256(packed).hexdigest() == source['snapshot_sha256']
            raw = gzip.decompress(packed)
            assert hashlib.sha256(raw).hexdigest() == source['raw_sha256']
            if source['publisher'] == 'Evil Resource':
                cls.pages[source['id']] = BUILD.TABLES.parse_page(raw, source['effective_url'])['article_text']
            else:
                visible = BUILD.RULES.VisibleText(); visible.feed(raw.decode('utf-8', 'replace'))
                cls.pages[source['id']] = BUILD.normalized(' '.join(visible.parts))

    def check_claim(self, claim, sources=None):
        BUILD.verify_claim(claim, sources or self.sources, self.pages, self.roster)

    def test_committed_curation_reproduces_every_source_checked_assertion(self):
        self.assertEqual(BUILD.build(), self.manifest)
        self.assertEqual(len(self.manifest['claims']), 109)
        self.assertEqual(len(self.manifest['sources']), 84)
        for claim in self.manifest['claims']:
            self.check_claim(claim)

    def test_all_eighty_identities_extend_the_preserved_r23_r24_subset(self):
        r23 = json.loads((ROOT / 'modules/fidelity-r23/canonical/manifest.json').read_text())
        r24 = json.loads((ROOT / 'modules/fidelity-r24/canonical/manifest.json').read_text())
        previous = {e['id'] for e in r23['entries'] if e['claims']} | {c['uid'] for c in r24['claims']}
        current = {c['uid'] for c in self.manifest['claims']}
        self.assertEqual(len(previous), 96)
        self.assertEqual(len(current), 80)
        self.assertEqual(current & previous, set())
        self.assertEqual(self.manifest['summary']['cumulative_reviewed_identities'], len(previous | current))
        self.assertEqual({e['id'] for e in self.manifest['entries']}, set(self.roster))

    def test_original_remake_and_source_game_boundaries_are_enforced(self):
        claim = copy.deepcopy(next(c for c in self.manifest['claims'] if c['uid'] == 're1-hunter'))
        claim['game_key'] = 'resident-evil-remake'
        with self.assertRaisesRegex(ValueError, 'original/remake'):
            self.check_claim(claim)
        claim = copy.deepcopy(self.manifest['claims'][0])
        claim['evidence'][0]['game_key'] = 'resident-evil-4'
        with self.assertRaisesRegex(ValueError, 'boundary'):
            self.check_claim(claim)

    def test_unquoted_text_and_false_complete_fidelity_are_rejected(self):
        claim = copy.deepcopy(self.manifest['claims'][0]); claim['evidence'][0]['excerpt'] = 'This actor has an undocumented laser attack.'
        with self.assertRaisesRegex(ValueError, 'Quotation missing'):
            self.check_claim(claim)
        claim = copy.deepcopy(self.manifest['claims'][0]); claim['canonical_fidelity_certified'] = True
        with self.assertRaisesRegex(ValueError, 'cannot certify'):
            self.check_claim(claim)

    def test_cross_checks_require_distinct_publishers_and_a_limited_shared_assertion(self):
        claim = copy.deepcopy(next(c for c in self.manifest['claims'] if c['independently_corroborated']))
        sources = copy.deepcopy(self.sources)
        for evidence in claim['evidence']:
            sources[evidence['source_id']]['publisher'] = 'Same publisher'
        with self.assertRaisesRegex(ValueError, 'distinct publications'):
            self.check_claim(claim, sources)
        claim['corroborated_scope'] = ''
        with self.assertRaisesRegex(ValueError, 'shared assertion'):
            self.check_claim(claim)
        self.assertEqual(self.manifest['summary']['distinct_publisher_cross_checks'], 10)
        self.assertEqual(self.manifest['summary']['independent_primary_corroborations'], 0)

    def test_hd_only_and_directors_cut_modes_cannot_be_generalized(self):
        for uid in ('rerev-wall-blister', 're1-forest-speyer-zombie'):
            claim = copy.deepcopy(next(c for c in self.manifest['claims'] if c['uid'] == uid))
            claim['phase'] = 'All versions and modes'
            with self.assertRaisesRegex(ValueError, 'HD/PC|Director Cut'):
                self.check_claim(claim)

    def test_negative_predicates_remain_separate_from_other_phases(self):
        yawn = [c for c in self.manifest['claims'] if c['uid'] == 're1-yawn']
        self.assertEqual({c['polarity'] for c in yawn}, {'AFFIRMED', 'NEGATED'})
        denied = next(c for c in yawn if c['polarity'] == 'NEGATED')
        self.assertIn('Second combat', denied['phase'])
        self.assertIn('lost its ability to poison', denied['evidence'][0]['excerpt'])
        negative = [c for c in self.manifest['claims'] if c['polarity'] == 'NEGATED']
        self.assertEqual(len(negative), 3)

    def test_jump_distance_and_vague_growth_never_become_body_dimensions(self):
        jump = copy.deepcopy(next(c for c in self.manifest['claims'] if c['uid'] == 're1-hunter' and 'Saut décrit' in c['label']))
        self.assertEqual(jump['type'], 'move')
        jump['type'] = 'dimension'
        with self.assertRaisesRegex(ValueError, 'body dimensions'):
            self.check_claim(jump)
        growth = next(c for c in self.manifest['claims'] if c['uid'] == 're1-wasp' and c['type'] == 'scope')
        self.assertIn('roughly four times', growth['evidence'][0]['excerpt'])
        self.assertEqual(self.manifest['summary']['certified_body_scales'], 0)

    def test_the_spotter_detection_does_not_become_the_hunters_command(self):
        claim = next(c for c in self.manifest['claims'] if c['uid'] == 'recv-hunter')
        self.assertNotEqual(claim['actor_uid'], claim['uid'])
        self.assertEqual(claim['actor_role'], 'source_named_actor_not_in_catalogue')
        changed = copy.deepcopy(claim); changed['actor_role'] = 'enemy_behaviour_or_property'
        with self.assertRaisesRegex(ValueError, 'another actor'):
            self.check_claim(changed)


if __name__ == '__main__':
    unittest.main()
