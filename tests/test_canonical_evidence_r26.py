import copy
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('canonical_r26', ROOT / 'scripts/build-canonical-evidence-r26.py')
BUILD = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(BUILD)
MODULE = ROOT / 'modules/fidelity-r26/canonical'


class CanonicalEvidenceR26Tests(unittest.TestCase):
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
            cls.pages[source['id']] = BUILD.TABLES.parse_page(raw, source['effective_url'])['article_text']

    def verify(self, claim): BUILD.verify_claim(claim, self.sources, self.pages, self.roster)

    def test_every_manual_assertion_and_source_hash_reproduces(self):
        self.assertEqual(BUILD.build(), self.manifest)
        self.assertEqual(len(self.manifest['claims']), 110)
        self.assertEqual(len(self.manifest['sources']), 99)
        for claim in self.manifest['claims']: self.verify(claim)

    def test_all_ninety_nine_identities_extend_prior_reviewed_subjects(self):
        reviewed = set()
        for release in ['r23', 'r24', 'r25']:
            value = json.loads((ROOT / f'modules/fidelity-{release}/canonical/manifest.json').read_text())
            reviewed.update(e['id'] for e in value['entries'] if e['claims']) if release == 'r23' else reviewed.update(c['uid'] for c in value['claims'])
        current = {c['uid'] for c in self.manifest['claims']}
        self.assertEqual(len(reviewed), 176); self.assertEqual(len(current), 99)
        self.assertEqual(reviewed & current, set())
        self.assertEqual(self.manifest['summary']['cumulative_reviewed_identities'], 275)
        self.assertEqual({x['id'] for x in self.manifest['entries']}, set(self.roster))

    def test_original_and_remake_alligator_mechanisms_remain_separate(self):
        old = next(c for c in self.manifest['claims'] if c['uid'] == 're2-giant-alligator')
        new = next(c for c in self.manifest['claims'] if c['uid'] == 're2r-alligator')
        self.assertIn('canister', old['evidence'][0]['excerpt'])
        self.assertIn('gas pipe', new['evidence'][0]['excerpt'])
        changed = copy.deepcopy(old); changed['game_key'] = new['game_key']
        with self.assertRaisesRegex(ValueError, 'original/remake'): self.verify(changed)
        changed = copy.deepcopy(old); changed['evidence'][0]['game_key'] = new['game_key']
        with self.assertRaisesRegex(ValueError, 'boundary'): self.verify(changed)

    def test_infant_does_not_inherit_adult_field_but_can_still_shock(self):
        infant = [c for c in self.manifest['claims'] if c['uid'] == 'recv-albinoid-infant']
        denied = next(c for c in infant if c['polarity'] == 'NEGATED')
        affirmed = next(c for c in infant if c['polarity'] == 'AFFIRMED')
        self.assertIn('does not possess this power until its fully grown', denied['evidence'][0]['excerpt'])
        self.assertIn('ability to shock you', affirmed['evidence'][0]['excerpt'])
        self.assertIn('grand champ adulte', denied['phase'])

    def test_conditional_difficulty_lioness_and_temporary_knockout_keep_scope(self):
        for uid, quote, phase in [('reoutbreak-scissor-worm', 'Hard and Very Hard', 'Hard et Very Hard'),
                                  ('reoutbreak2-zombie-lioness', 'weak enough', 'assez affaibli'),
                                  ('reoutbreak-thanatos', 'knock the monster out', 'pas mort certifiée')]:
            claim = next(c for c in self.manifest['claims'] if c['uid'] == uid)
            self.assertIn(quote, claim['evidence'][0]['excerpt']); self.assertIn(phase, claim['phase'])

    def test_gestures_and_relative_growth_are_not_body_measurements(self):
        growth = next(c for c in self.manifest['claims'] if c['uid'] == 'reoutbreak2-giga-bite' and c['type'] == 'form')
        self.assertIn('pas une mesure anatomique', growth['phase'])
        changed = copy.deepcopy(growth); changed['type'] = 'dimension'
        with self.assertRaisesRegex(ValueError, 'body dimensions'): self.verify(changed)
        self.assertEqual(self.manifest['summary']['certified_body_scales'], 0)

    def test_source_quotes_cannot_be_replaced_or_certified(self):
        for key, value in [('canonical_fidelity_certified', True), ('phase', '')]:
            changed = copy.deepcopy(self.manifest['claims'][0]); changed[key] = value
            with self.assertRaises(ValueError): self.verify(changed)
        changed = copy.deepcopy(self.manifest['claims'][0]); changed['evidence'][0]['excerpt'] = 'Undocumented laser beam attack.'
        with self.assertRaisesRegex(ValueError, 'Quotation missing'): self.verify(changed)

    def test_asymmetric_and_actor_specific_properties_are_preserved(self):
        thanatos = next(c for c in self.manifest['claims'] if c['uid'] == 'reoutbreak-thanatos-r')
        self.assertIn('right arm completely', thanatos['evidence'][0]['excerpt'])
        helicopter = next(c for c in self.manifest['claims'] if c['uid'] == 're3-nicholai-ginovaef-helicopter')
        self.assertIn('pas un corps de B.O.W.', helicopter['phase'])
        changed = copy.deepcopy(helicopter); changed['actor_uid'] = 're3-nemesis'
        with self.assertRaisesRegex(ValueError, 'another actor'): self.verify(changed)

    def test_prior_reviews_and_primary_capture_counts_are_not_relabelled(self):
        self.assertEqual(len(self.manifest['previous_manifests']), 3)
        for row in self.manifest['previous_manifests']:
            self.assertEqual(hashlib.sha256((MODULE / row['path']).read_bytes()).hexdigest(), row['sha256'])
        for key in ['direct_primary_captures', 'independent_primary_corroborations', 'complete_move_sets', 'canonical_fidelity_certified']:
            self.assertEqual(self.manifest['summary'][key], 0)


if __name__ == '__main__': unittest.main()
