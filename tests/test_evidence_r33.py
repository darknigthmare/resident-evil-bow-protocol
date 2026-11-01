#!/usr/bin/env python3
"""Independent source/novelty checks for the R33 documentary package."""
from __future__ import annotations

import copy
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
PACK = 'modules/fidelity-r33/evidence'
spec = importlib.util.spec_from_file_location('r33_evidence_builder', ROOT / 'scripts/build-evidence-r33.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
MANIFEST = builder.read(PACK + '/manifest.json')


class EvidenceTests(unittest.TestCase):
    def test_twenty_real_sources_preserve_raw_bytes_and_visible_content(self):
        self.assertEqual(len(MANIFEST['sources']), 20)
        for source in MANIFEST['sources']:
            self.assertEqual(source['httpStatus'], 200)
            raw = gzip.decompress((ROOT / source['snapshot']).read_bytes())
            self.assertEqual(hashlib.sha256(raw).hexdigest(), source['rawSha256'])
            self.assertEqual(len(raw), source['rawBytes'])
            self.assertIn('<main', raw.decode())
            self.assertFalse(source['directPrimaryCapture'])
        self.assertEqual(sum('/files/' in s['url'] for s in MANIFEST['sources']), 10)

    def test_quotes_exist_in_visible_same_game_body_and_exact_catalogue_uid(self):
        catalogue = {x['id']: x for x in builder.read('data/roster.json')['catalog']}
        texts = {s['id']: builder.source_text(gzip.decompress((ROOT / s['snapshot']).read_bytes())) for s in MANIFEST['sources']}
        sources = {s['id']: s for s in MANIFEST['sources']}
        for claim in MANIFEST['claims']:
            self.assertIn(claim['excerpt'], texts[claim['sourceId']])
            self.assertEqual(claim['gameKey'], catalogue[claim['uid']]['gameKey'])
            self.assertEqual(claim['gameKey'], sources[claim['sourceId']]['gameKey'])
            self.assertFalse(claim['targetEditionEquivalenceVerified'])
        self.assertEqual(len({c['uid'] for c in MANIFEST['claims']}), 13)

    def test_new_excerpts_do_not_overlap_any_previous_canonical_excerpt_for_that_uid(self):
        previous = []
        for path in builder.HISTORICAL:
            for claim in builder.read(path).get('claims', []):
                previous.extend((claim['uid'], builder.normalized(p['excerpt']).casefold()) for p in claim.get('evidence', []) if p.get('excerpt'))
        for claim in MANIFEST['claims']:
            current = builder.normalized(claim['excerpt']).casefold()
            for uid, quote in previous:
                if uid == claim['uid']:
                    self.assertFalse(current in quote or quote in current)
            self.assertEqual(claim['novelty'], 'NEW_CURATED_DOCUMENTARY_EXCERPT')
        self.assertEqual(MANIFEST['counts']['newCuratedDocumentaryExcerpts'], 35)

    def test_stinger_dimension_is_upper_bound_including_pincers_not_height_or_collision(self):
        constraint, = MANIFEST['dimensionConstraints']
        self.assertEqual((constraint['uid'], constraint['value'], constraint['unit']), ('re0-stinger', 3, 'm'))
        self.assertEqual(constraint['operator'], 'less-than-or-equal')
        self.assertEqual(constraint['bodyRegion'], 'body-including-pincers')
        self.assertFalse(constraint['exactValueCertified'])
        self.assertFalse(constraint['targetCollisionAdmitted'])

    def test_two_outcomes_bind_own_body_anatomy_and_every_condition(self):
        claims = {c['id']: c for c in MANIFEST['claims']}
        self.assertEqual(len(MANIFEST['conclusionRestrictions']), 2)
        for rule in MANIFEST['conclusionRestrictions']:
            claim = claims[rule['claimId']]
            self.assertEqual(rule['uid'], claim['uid'])
            self.assertEqual(rule['requiredConditions'], claim['requiredConditions'])
            self.assertEqual(rule['bodyRegion'], claim['bodyRegion'])
            self.assertEqual(claim['actorRole'], 'own-body-damage-reported')
            self.assertFalse(rule['gameplayAdmitted'])

    def test_contextual_exceptions_and_right_side_remain_explicit(self):
        claims = {c['id']: c for c in MANIFEST['claims']}
        self.assertIn('right hand', claims['R33-EVID-026']['excerpt'])
        self.assertEqual(claims['R33-EVID-026']['bodyRegion'], 'right-hand')
        self.assertEqual(claims['R33-EVID-016']['phase'], 'mirror-corridor-fixed-corpse')
        self.assertIn('collar-not-acquired', claims['R33-EVID-016']['requiredConditions'])
        self.assertEqual(claims['R33-EVID-028']['type'], 'encounter-restriction')
        self.assertEqual(claims['R33-EVID-024']['phase'], 'excited')
        self.assertIn('pas un idle', claims['R33-EVID-024']['limitation'])

    def test_unidentified_growl_is_not_assigned_to_a_sound_file_or_actor(self):
        growl = next(c for c in MANIFEST['claims'] if c['id'] == 'R33-EVID-021')
        self.assertEqual(growl['actorRole'], 'unidentified-heard-source')
        self.assertEqual(growl['phase'], 'underground-confinement')
        self.assertIn('At midnight', growl['excerpt'])
        self.assertFalse(growl['gameplayAdmitted'])
        for clip in MANIFEST['audioReviewQueue']:
            self.assertIsNone(clip['action'])
            self.assertIsNone(clip['speaker'])

    def test_all_audio_references_are_exact_old_files_and_are_not_counted_as_new(self):
        original = {e['clipId']: e for e in builder.read(builder.AUDIO)['entries']}
        self.assertEqual(len(MANIFEST['audioReviewQueue']), 218)
        for clip in MANIFEST['audioReviewQueue']:
            raw = (ROOT / clip['path']).read_bytes()
            self.assertEqual(hashlib.sha256(raw).hexdigest(), clip['sha256'])
            self.assertEqual(len(raw), clip['bytes'])
            self.assertEqual(clip['sha256'], original[clip['clipId']]['sha256'])
            self.assertFalse(clip['newMedia'])
            self.assertFalse(clip['combatAudioAssigned'])
            self.assertFalse(clip['independentlyListened'])
        self.assertEqual(MANIFEST['counts']['newAudioFiles'], 0)

    def test_primary_failures_and_missing_exact_jack_are_not_false_successes(self):
        self.assertEqual(len(MANIFEST['failedPrimaryAttempts']), 3)
        self.assertTrue(all('403' in x['error'] for x in MANIFEST['failedPrimaryAttempts']))
        missing, = MANIFEST['missingExactReferences']
        self.assertEqual(missing['uid'], 're7-jack-baker-scissor')
        self.assertEqual(missing['status'], 'EXACT_PHASE_IMAGE_STILL_MISSING')
        blob = (ROOT / missing['blogCapture']['path']).read_bytes()
        self.assertEqual(hashlib.sha256(blob).hexdigest(), missing['blogCapture']['sha256'])
        self.assertIn('chainsaw duel', gzip.decompress(blob).decode())
        self.assertFalse(missing['blogCapture']['admittedAsExactPhaseReference'])
        self.assertNotIn('re7-jack-baker-scissor', {e['id'] for e in MANIFEST['entries']})
        self.assertEqual(MANIFEST['counts']['newSelectionAvatars'], 0)

    def test_all_input_hashes_are_current_and_generator_reproduces_both_outputs(self):
        for item in MANIFEST['inputs']:
            self.assertEqual(builder.fingerprint(item['path']), item)
        for path, raw in builder.outputs().items():
            self.assertEqual((ROOT / path).read_bytes(), raw)

    def test_builder_rejects_fabricated_quote_and_cross_game_reassignment(self):
        real_read = builder.read
        for change in ('quote', 'uid'):
            curation = copy.deepcopy(real_read(PACK + '/curation.json'))
            if change == 'quote':
                curation['claims'][0]['excerpt'] = 'This sentence was never published in the source.'
            else:
                curation['claims'][0]['uid'] = 're6-napad'
            with patch.object(builder, 'read', side_effect=lambda path: curation if path == PACK + '/curation.json' else real_read(path)):
                with self.assertRaises(ValueError):
                    builder.outputs()

    def test_builder_rejects_primary_promotion_and_changed_source_byte_hash(self):
        real_read = builder.read
        for change in ('primary', 'hash'):
            capture = copy.deepcopy(real_read(PACK + '/captures.json'))
            capture['sources'][0]['directPrimaryCapture' if change == 'primary' else 'rawSha256'] = True if change == 'primary' else '0' * 64
            with patch.object(builder, 'read', side_effect=lambda path: capture if path == PACK + '/captures.json' else real_read(path)):
                with self.assertRaises(ValueError):
                    builder.outputs()


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(EvidenceTests)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    paths = ['tests/test_evidence_r33.py', 'scripts/build-evidence-r33.py', PACK + '/manifest.json',
             PACK + '/curation.json', PACK + '/captures.json', *builder.UI]
    report = {'schema': 're.bow.evidence-tests-r33/1', 'passed': result.testsRun - len(result.failures) - len(result.errors),
              'failed': len(result.failures) + len(result.errors), 'skipped': len(result.skipped),
              'sourceFiles': [builder.fingerprint(p) for p in paths],
              'scope': 'Actual offline source bytes, visible quotations, strict incarnation context, novelty ledger, reused audio and negative-input verification.'}
    (ROOT / 'docs/R33_EVIDENCE_TESTS.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    raise SystemExit(not result.wasSuccessful())
