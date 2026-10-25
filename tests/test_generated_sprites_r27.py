"""Sprite imports: actual files, immutable pixels, source attribution and truthful coverage."""
import copy
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

from PIL import Image, PngImagePlugin

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('sprite_import_r27', ROOT / 'scripts/import-generated-sprites-r27.py')
IMPORT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(IMPORT)


def png(color=(130, 60, 40, 255), transparent=True, compression=6):
    image = Image.new('RGBA', (128, 128), (0, 0, 0, 0) if transparent else color)
    image.paste(color, (24, 16, 96, 120))
    raw = io.BytesIO()
    image.save(raw, 'PNG', compress_level=compression)
    return raw.getvalue()


class GeneratedSpriteImportTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.pack = self.root / 'modules/fidelity-r27/sprites'
        self.pack.mkdir(parents=True)
        self.saved = IMPORT.ROOT, IMPORT.PACK
        IMPORT.ROOT, IMPORT.PACK = self.root, self.pack
        self.addCleanup(lambda: setattr(IMPORT, 'ROOT', self.saved[0]))
        self.addCleanup(lambda: setattr(IMPORT, 'PACK', self.saved[1]))
        self.reference = self.root / 'assets/reference.png'
        self.reference.parent.mkdir()
        self.reference.write_bytes(png((50, 90, 100, 255)))
        self.ref = {'path': 'assets/reference.png', 'role': 'full-body-reference', 'bodyCoverage': 'complete',
                    'sha256': hashlib.sha256(self.reference.read_bytes()).hexdigest()}
        self.jobs = []
        for i in range(385):
            uid = 'fixture-' + str(i)
            self.jobs.append({'id': uid, 'label': 'Synthetic fixture ' + str(i), 'incarnation': 'Unit test only',
                'references': [self.ref], 'completeBodyReferenceVerified': True,
                'scope': 'context-encounter' if i == 384 else 'combatant-neutral-pose',
                'outputPath': 'modules/fidelity-r27/sprites/generated/' + uid + '/idle-right.png',
                'openStates': ['walk', 'light', 'left-view'], 'limitations': ['Synthetic test; never published as generated art.']})
        (self.pack / 'jobs.json').write_text(json.dumps({'jobs': self.jobs}))
        self.source = self.root / 'tool-output.png'
        self.source.write_bytes(png())
        self.metadata = self.root / 'generation.json'
        self.record = {'id': 'fixture-0', 'generator': 'image_gen', 'prompt': 'Synthetic unit-test receipt only.',
                       'referenced_image_paths': ['assets/reference.png']}
        self.save_metadata()

    def save_metadata(self):
        self.metadata.write_text(json.dumps(self.record))

    def import_one(self, uid='fixture-0', **flags):
        return IMPORT.import_sprite(uid, self.source, self.metadata, **flags)

    def test_empty_manifest_does_not_count_requests_as_generated(self):
        actual = IMPORT.build()
        self.assertEqual(actual['counts']['generatedSprites'], 0)
        self.assertEqual(actual['counts']['pendingSprites'], 385)
        self.assertEqual(actual['counts']['completeCombatAnimationSets'], 0)
        self.assertEqual(len(actual['pending']), 385)

    def test_actual_import_preserves_tool_bytes_and_measures_alpha_bounds_pivot(self):
        raw = self.source.read_bytes()
        actual = self.import_one(reviewed=True, facing='right', full_body_reviewed=True, pose_kind='neutral-base')
        self.assertEqual((self.root / actual['image']).read_bytes(), raw)
        self.assertEqual(actual['bounds'], {'x': 24, 'y': 16, 'width': 72, 'height': 104})
        self.assertEqual(actual['pivot'], {'x': 60, 'y': 120})
        self.assertGreater(actual['alpha']['transparentPixels'], 0)
        self.assertEqual(actual['availableStates'], ['idle'])
        self.assertFalse(actual['canMirror'])
        self.assertFalse(actual['canonicalFidelityCertified'])
        result = IMPORT.build()
        self.assertEqual(result['counts']['generatedSprites'], 1)
        self.assertEqual(result['counts']['pendingSprites'], 384)
        self.assertEqual(result['counts']['fullBodyReviewedSprites'], 1)

    def test_opaque_empty_and_non_png_inputs_are_rejected(self):
        for raw in (png(transparent=False), b'not a PNG'):
            self.source.write_bytes(raw)
            with self.assertRaises(ValueError):
                self.import_one()
        image = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
        image.save(self.source)
        with self.assertRaisesRegex(ValueError, 'visible subject'):
            self.import_one()

    def test_unknown_uid_and_mismatched_generation_identity_are_rejected(self):
        with self.assertRaisesRegex(ValueError, 'identity'):
            self.import_one('not-in-jobs')
        self.record['id'] = 'fixture-1'
        self.save_metadata()
        with self.assertRaisesRegex(ValueError, 'same UID'):
            self.import_one()

    def test_missing_generator_prompt_or_reference_receipts_are_rejected(self):
        original = copy.deepcopy(self.record)
        for field in ('generator', 'prompt', 'referenced_image_paths'):
            self.record = copy.deepcopy(original)
            del self.record[field]
            self.save_metadata()
            with self.assertRaises(ValueError):
                self.import_one()

    def test_changed_or_unlisted_reference_cannot_be_claimed_as_generation_source(self):
        self.record['referenced_image_paths'] = ['assets/missing.png']
        self.save_metadata()
        with self.assertRaisesRegex(ValueError, 'Unreviewed or changed'):
            self.import_one()
        self.record['referenced_image_paths'] = ['assets/reference.png']
        self.save_metadata()
        self.reference.write_bytes(png((10, 20, 30, 255)))
        with self.assertRaisesRegex(ValueError, 'Unreviewed or changed'):
            self.import_one()

    def test_import_does_not_mark_unreviewed_or_context_image_as_complete_combat_body(self):
        with self.assertRaisesRegex(ValueError, 'Full-body admission'):
            self.import_one(full_body_reviewed=True)
        self.record['id'] = 'fixture-384'
        self.save_metadata()
        with self.assertRaisesRegex(ValueError, 'Full-body admission'):
            self.import_one('fixture-384', reviewed=True, full_body_reviewed=True)

    def test_reference_body_availability_is_not_manual_body_review(self):
        actual = self.import_one()
        self.assertTrue(actual['completeBodyReferenceVerified'])
        self.assertFalse(actual['fullBodyReviewed'])
        self.assertEqual(actual['reviewStatus'], 'needs-visual-review')
        self.assertEqual(actual['sourceFacing'], 'unknown')
        self.assertEqual(actual['poseKind'], 'unknown')
        self.assertEqual(actual['availableStates'], [])

    def test_same_visual_pixels_cannot_pad_the_identity_count_with_reencoded_png(self):
        self.import_one()
        self.source.write_bytes(png(compression=0))
        self.record['id'] = 'fixture-1'
        self.save_metadata()
        with self.assertRaisesRegex(ValueError, 'same generated pixels'):
            self.import_one('fixture-1')

    def test_existing_pixels_are_not_overwritten_by_a_different_generation(self):
        actual = self.import_one()
        before = (self.root / actual['image']).read_bytes()
        self.source.write_bytes(png((20, 160, 50, 255)))
        with self.assertRaisesRegex(ValueError, 'overwrite'):
            self.import_one()
        self.assertEqual((self.root / actual['image']).read_bytes(), before)

    def test_png_tampering_is_rejected_before_manifest_can_claim_completion(self):
        actual = self.import_one()
        target = self.root / actual['image']
        target.write_bytes(target.read_bytes() + b'changed')
        with self.assertRaisesRegex(ValueError, 'recorded bytes'):
            IMPORT.build()

    def test_non_idle_finalized_or_mirrored_claims_fail_closed(self):
        self.import_one()
        path = self.pack / 'records/fixture-0.json'
        original = json.loads(path.read_text())
        for field, value in [('canMirror', True), ('availableStates', ['idle', 'attack']), ('combatIntegrated', True), ('canonicalFidelityCertified', True)]:
            changed = {**original, field: value}
            path.write_text(json.dumps(changed))
            with self.assertRaises(ValueError):
                IMPORT.build()

    def test_actual_tool_failure_remains_pending_and_never_counts_as_generated(self):
        path = self.root / 'tool-failure.json'
        original = {'id': 'fixture-0', 'generator': 'image_gen', 'error': 'Synthetic tool error for the test only.', 'request_id': 'fixture-request'}
        path.write_text(json.dumps(original))
        IMPORT.record_failure(path)
        result = IMPORT.build()
        self.assertEqual(result['counts']['generatedSprites'], 0)
        self.assertEqual(result['counts']['pendingSprites'], 385)
        self.assertEqual(result['counts']['generationBlockedSprites'], 1)
        self.assertEqual(result['failures'][0]['originalFailureRecord'], original)
        self.import_one()
        result = IMPORT.build()
        self.assertEqual(result['counts']['generatedSprites'], 1)
        self.assertEqual(result['counts']['generationBlockedSprites'], 0)
        self.assertEqual(result['counts']['recordedGenerationFailures'], 1)

    def test_explicit_revision_preserves_previous_pixels_and_record_without_double_counting(self):
        original = self.import_one()
        old_png = (self.root / original['image']).read_bytes()
        old_record = (self.pack / 'records/fixture-0.json').read_bytes()
        self.source.write_bytes(png((20, 160, 50, 255)))
        with self.assertRaisesRegex(ValueError, 'revision SHA'):
            self.import_one(revision_of='0' * 64)
        corrected = self.import_one(revision_of=original['sha256'])
        archived = corrected['provenance']['revisionOf']
        self.assertEqual((self.root / archived['image']).read_bytes(), old_png)
        self.assertEqual((self.root / archived['record']).read_bytes(), old_record)
        self.assertEqual((self.root / corrected['image']).read_bytes(), self.source.read_bytes())
        self.assertEqual(IMPORT.build()['counts']['generatedSprites'], 1)
        self.assertEqual(IMPORT.build()['counts']['pendingSprites'], 384)

    def test_manual_whole_body_evidence_requires_exact_uid_source_output_side_and_visual_proof(self):
        self.jobs[0]['references'][0]['bodyCoverage'] = 'unknown'
        self.jobs[0]['completeBodyReferenceVerified'] = False
        (self.pack / 'jobs.json').write_text(json.dumps({'jobs': self.jobs}))
        visual = self.root / 'docs/visual.png'
        visual.parent.mkdir()
        visual.write_bytes(png((100, 110, 120, 255)))
        evidence = {'schema': 're.bow.source-body-observation-r27/1', 'uid': 'fixture-0',
                    'reference': {'path': self.ref['path'], 'sha256': self.ref['sha256']},
                    'image': self.jobs[0]['outputPath'], 'image_sha256': hashlib.sha256(self.source.read_bytes()).hexdigest(),
                    'source_complete_body_observed': True, 'generated_complete_body_observed': True,
                    'exact_identity_declared': True, 'observed_facing': 'left', 'notes': 'Synthetic manual observation test only.',
                    'canonical_fidelity_certified': False, 'opposite_view_reviewed': False, 'original_game_pose_certified': False,
                    'visual_evidence': {'path': 'docs/visual.png', 'sha256': hashlib.sha256(visual.read_bytes()).hexdigest()}}
        proof = self.root / 'docs/proof.json'
        for field, value in [('uid', 'fixture-1'), ('image_sha256', '0' * 64), ('source_complete_body_observed', False), ('observed_facing', 'right')]:
            proof.write_text(json.dumps({**evidence, field: value}))
            with self.assertRaisesRegex(ValueError, 'Source completeness evidence'):
                self.import_one(reviewed=True, facing='left', full_body_reviewed=True, source_completeness_path=proof)
        proof.write_text(json.dumps(evidence))
        actual = self.import_one(reviewed=True, facing='left', full_body_reviewed=True, source_completeness_path=proof)
        self.assertFalse(actual['completeBodyReferenceVerified'])
        self.assertTrue(actual['fullBodyReviewed'])
        self.assertEqual(actual['jobLimitations'], self.jobs[0]['limitations'])
        self.assertTrue(any('linked SHA-bound observation' in item for item in actual['limitations']))
        self.assertEqual(IMPORT.build()['counts']['fullBodyReviewedSprites'], 1)
        upgraded = self.import_one(pose_kind='neutral-base')
        self.assertEqual(upgraded['sourceCompletenessEvidence'], actual['sourceCompletenessEvidence'])
        self.assertEqual(upgraded['jobLimitations'], actual['jobLimitations'])
        self.assertEqual(upgraded['provenance'], actual['provenance'])
        self.assertEqual(upgraded['availableStates'], ['idle'])
        visual.write_bytes(png((4, 5, 6, 255)))
        with self.assertRaisesRegex(ValueError, 'unchanged visual evidence'):
            IMPORT.build()

    def test_pose_classification_is_explicit_and_bind_pose_never_advertises_idle(self):
        with self.assertRaisesRegex(ValueError, 'Pose kind'):
            self.import_one(pose_kind='neutral-base')
        with self.assertRaisesRegex(ValueError, 'Pose kind'):
            self.import_one(reviewed=True, pose_kind='imaginary-state')
        bind = self.import_one(reviewed=True, full_body_reviewed=True, facing='right', pose_kind='source-bind-pose')
        self.assertEqual(bind['availableStates'], [])
        self.assertEqual(bind['requestedState'], 'idle')
        neutral = self.import_one(reviewed=True, full_body_reviewed=True, facing='right', pose_kind='neutral-base')
        self.assertEqual(neutral['availableStates'], ['idle'])
        again = self.import_one()
        self.assertEqual(again['poseKind'], 'neutral-base')
        self.assertEqual(again['availableStates'], ['idle'])

    def test_contract_migration_changes_only_derived_metadata_and_never_infers_neutral(self):
        current = self.import_one(reviewed=True, full_body_reviewed=True, facing='right')
        path = self.pack / 'records/fixture-0.json'
        legacy = copy.deepcopy(current)
        legacy.pop('poseKind')
        legacy.pop('requestedState')
        legacy['availableStates'] = ['idle']
        path.write_text(json.dumps(legacy))
        png_before = (self.root / current['image']).read_bytes()
        changes = IMPORT.migrate_contract_fields()
        migrated = json.loads(path.read_text())
        self.assertEqual(set(changes[0]['changedFields']), {'poseKind', 'requestedState', 'availableStates'})
        self.assertEqual(migrated['poseKind'], 'unknown')
        self.assertEqual(migrated['availableStates'], [])
        self.assertEqual(migrated['provenance'], legacy['provenance'])
        self.assertEqual((self.root / current['image']).read_bytes(), png_before)
        self.assertEqual(IMPORT.build()['counts']['neutralBaseCombatEligibleSprites'], 0)

    def test_pose_metadata_review_preserves_prior_revision_and_reviewed_fields(self):
        original = self.import_one(reviewed=True, full_body_reviewed=True, facing='left', pose_kind='source-presentation')
        self.source.write_bytes(png((20, 160, 50, 255)))
        corrected = self.import_one(reviewed=True, full_body_reviewed=True, facing='left', revision_of=original['sha256'], pose_kind='source-presentation')
        current = self.import_one(pose_kind='neutral-base')
        self.assertEqual(current['sourceFacing'], 'left')
        self.assertTrue(current['fullBodyReviewed'])
        self.assertEqual(current['reviewStatus'], 'visually-reviewed')
        self.assertEqual(current['provenance'], corrected['provenance'])
        self.assertEqual(current['availableStates'], ['idle'])


if __name__ == '__main__':
    unittest.main()
