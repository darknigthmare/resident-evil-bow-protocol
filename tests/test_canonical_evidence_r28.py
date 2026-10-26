"""Exact source bytes, encounter boundaries and conservative R28 assertions."""
import copy
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / 'modules/fidelity-r28/canonical'
spec = importlib.util.spec_from_file_location('canonical_r28', ROOT / 'scripts/build-canonical-evidence-r28.py')
BUILD = importlib.util.module_from_spec(spec); spec.loader.exec_module(BUILD)


class CanonicalEvidenceR28Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((MODULE / 'manifest.json').read_text())
        cls.roster = {row['id']: row for row in json.loads((ROOT / 'data/roster.json').read_text())['catalog']}
        cls.sources, cls.pages = BUILD.load_sources()

    def claim(self, uid):
        return next(claim for claim in self.manifest['claims'] if claim['uid'] == uid)

    def verify(self, claim):
        return BUILD.verify_claim(claim, self.sources, self.pages, self.roster)

    def test_all_forty_two_claims_reproduce_the_manifest(self):
        self.assertEqual(BUILD.build(), self.manifest)
        self.assertEqual(len(self.manifest['claims']), 42)
        for claim in self.manifest['claims']:
            self.verify(claim)

    def test_thirty_three_new_uid_finish_only_documentary_review(self):
        pending = {row['id'] for row in json.loads((ROOT / 'modules/fidelity-r27/canonical/curation.json').read_text())['unreviewed_after_batch']}
        self.assertEqual({claim['uid'] for claim in self.manifest['claims']}, pending)
        self.assertEqual(len(pending), 33)
        summary = self.manifest['summary']
        self.assertEqual(summary['cumulative_reviewed_identities'], 389)
        self.assertEqual(summary['cumulative_reviewed_identities_r23_r24_r25_r26_r27'], 356)
        for field in ['complete_move_sets', 'certified_body_scales', 'canonical_fidelity_certified', 'direct_primary_captures']:
            self.assertEqual(summary[field], 0)

    def test_all_fresh_http_snapshots_and_preserved_manifests_keep_their_bytes(self):
        self.assertEqual(len(self.sources), 34)
        self.assertEqual(sum(source['snapshot_release'] == 'R28' for source in self.sources.values()), 33)
        self.assertTrue(all(source['http_status'] == 200 for source in self.sources.values()))
        self.assertEqual(len(self.manifest['previous_manifests']), 5)
        for previous in self.manifest['previous_manifests']:
            self.assertEqual(hashlib.sha256((MODULE / previous['path']).read_bytes()).hexdigest(), previous['sha256'])

    def test_location_room_and_game_mode_cannot_be_removed_or_swapped(self):
        base = self.claim('re3r-licker')
        self.assertIn('Nightmare', base['phase'])
        for key, value in [('game_mode', 'Standard'), ('location', ''), ('phase', 'All scenes')]:
            bad = copy.deepcopy(base); bad['evidence'][0][key] = value
            with self.assertRaises(ValueError):
                self.verify(bad)

    def test_original_remake_or_actor_cannot_share_a_claim(self):
        for key, value in [('game_key', 'resident-evil-3'), ('actor_uid', 're3-nemesis'), ('subject_uid', 're3r-zombie')]:
            bad = copy.deepcopy(self.claim('re3r-stage-2-nemesis')); bad[key] = value
            with self.assertRaises(ValueError):
                self.verify(bad)

    def test_strong_threat_claims_are_bound_to_the_exact_variant_page(self):
        for uid in ['re4r-colmillos-strong-threat', 're4r-armadura-strong-threat', 're4r-regenerador-strong-threat']:
            claim = self.claim(uid); source = self.sources[claim['evidence'][0]['source_id']]
            self.assertEqual(source['url'], self.roster[uid]['sourcePage'])
            self.assertIn('strong-threat', source['url'])
        bad = copy.deepcopy(self.claim('re4r-colmillos-strong-threat'))
        bad['evidence'][0]['source_id'] = self.claim('re4r-armadura-strong-threat')['evidence'][0]['source_id']
        with self.assertRaisesRegex(ValueError, 'variant'):
            self.verify(bad)

    def test_two_negations_keep_their_local_encounter_meaning(self):
        zealot, tyrant = self.claim('re4r-zealot'), self.claim('rerequiem-tyrant-t-501')
        self.assertEqual(zealot['polarity'], 'NEGATED'); self.assertIn("They don't attack you", zealot['evidence'][0]['excerpt'])
        self.assertIn('Passageway - Castle Entry', zealot['phase'])
        self.assertEqual(tyrant['polarity'], 'NEGATED'); self.assertIn('It will not follow you up the stairs however.', tyrant['evidence'][0]['excerpt'])
        self.assertIn('East Stairway 1F', tyrant['phase'])

    def test_specific_mutation_and_glass_break_triggers_are_not_authored_conditions(self):
        mendez = self.claim('re4r-bitores-mendez-second-mutation')
        self.assertIn('after a certain amount of damage', mendez['evidence'][0]['excerpt'])
        self.assertIn('pas chiffré', mendez['limitation'])
        self.assertIn('If the glass is broken', self.claim('rerequiem-licker-beta2')['evidence'][0]['excerpt'])
        self.assertIn('If the glass is broken', self.claim('rerequiem-ark-zombie')['evidence'][0]['excerpt'])

    def test_counterfeit_quote_dimension_or_full_fidelity_is_rejected(self):
        for key, value in [('canonical_fidelity_certified', True), ('type', 'dimension'), ('phase', '')]:
            bad = copy.deepcopy(self.manifest['claims'][0]); bad[key] = value
            with self.assertRaises(ValueError):
                self.verify(bad)
        bad = copy.deepcopy(self.manifest['claims'][0]); bad['evidence'][0]['excerpt'] += ' Undocumented laser attack.'
        with self.assertRaisesRegex(ValueError, 'missing'):
            self.verify(bad)

    def test_snapshot_hash_mismatch_is_rejected_before_reading_claims(self):
        bad = json.loads((MODULE / 'captures.json').read_text()); bad['sources'][0]['snapshot_sha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'hash'):
            BUILD.load_sources(bad)


if __name__ == '__main__':
    started = datetime.now(timezone.utc).isoformat()
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(CanonicalEvidenceR28Tests))
    paths = ['scripts/build-canonical-evidence-r28.py', 'tests/test_canonical_evidence_r28.py', 'modules/fidelity-r28/canonical/manifest.json', 'modules/fidelity-r28/canonical/captures.json', 'modules/fidelity-r28/canonical/curation.json']
    report = {'schema': 're.bow.canonical-validation-r28/1', 'started_at_utc': started, 'finished_at_utc': datetime.now(timezone.utc).isoformat(),
              'tests_run': result.testsRun, 'passed': result.testsRun - len(result.failures) - len(result.errors) - len(result.skipped),
              'failed': len(result.failures) + len(result.errors), 'skipped': len(result.skipped), 'summary': BUILD.build()['summary'],
              'sources': [{'path': path, 'sha256': hashlib.sha256((ROOT / path).read_bytes()).hexdigest()} for path in paths],
              'failures': [{'test': str(test), 'trace': trace} for test, trace in result.failures + result.errors]}
    (ROOT / 'docs/R28_CANONICAL_VALIDATION.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    raise SystemExit(not result.wasSuccessful())
