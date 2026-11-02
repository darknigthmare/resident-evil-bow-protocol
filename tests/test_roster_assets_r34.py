"""Fault tests for R34 intake/copy/qualification; rectangle rasters are explicit unit fixtures."""
import copy
import concurrent.futures
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import threading
import unittest

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('r34_asset_import_test', ROOT / 'scripts/import-roster-asset-r34.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
compiler_spec = importlib.util.spec_from_file_location('r34_asset_compile_test', ROOT / 'scripts/build-roster-assets-r34.py')
compiler = importlib.util.module_from_spec(compiler_spec)
compiler_spec.loader.exec_module(compiler)


class InventoryTests(unittest.TestCase):
    def test_exact_fighter_scope_and_two_outputs(self):
        plan = json.loads((ROOT / 'modules/fidelity-r34/assets/jobs.json').read_text())
        roster = json.loads((ROOT / 'data/roster.json').read_text())
        expansion = json.loads((ROOT / 'data/catalog-expansion-v070.json').read_text())
        expected = {entry['uid'] for entry in roster['fighters'] + expansion['fighters']}
        self.assertEqual({entry['uid'] for entry in plan['jobs']}, expected)
        self.assertEqual(len(expected), 346)
        self.assertEqual(sum(entry['fighterCategory'] == 'main' for entry in plan['jobs']), 115)
        self.assertTrue(all(set(entry['outputs']) == {'portrait', 'idle'} for entry in plan['jobs']))

    def test_four_balanced_lots_and_context_exclusion(self):
        plan = json.loads((ROOT / 'modules/fidelity-r34/assets/jobs.json').read_text())
        expansion = json.loads((ROOT / 'data/catalog-expansion-v070.json').read_text())
        contexts = {entry['id'] for entry in expansion['records'] if entry.get('encounter')}
        self.assertEqual(len(contexts), 43)
        self.assertFalse(contexts & {entry['uid'] for entry in plan['jobs']})
        self.assertEqual([len(entry['jobs']) for entry in plan['lots']], [87, 87, 86, 86])
        self.assertEqual(len({uid for lot in plan['lots'] for uid in lot['jobs']}), 346)

    def test_prior_refusals_and_held_editions_are_not_promoted(self):
        plan = json.loads((ROOT / 'modules/fidelity-r34/assets/jobs.json').read_text())
        old = json.loads((ROOT / 'modules/fidelity-r31/sprites/manifest.json').read_text())
        blocked = {entry['id'] for entry in old['pending'] + old['revisionFailures']}
        self.assertEqual({entry['uid'] for entry in plan['jobs'] if entry['historicalRefusalPreserved']}, blocked)
        self.assertEqual(len(blocked), 23)
        for job in plan['jobs']:
            self.assertFalse(job['completeBodyReferenceVerifiedByR34'])
            self.assertTrue(all(ref['targetEditionAdmitted'] is False for ref in job['heldEditionReferences']))
            self.assertTrue(all(ref['targetEditionAdmitted'] is True for ref in job['references']))

    def test_source_curation_keeps_historical_tpose_admission_unchanged(self):
        decision = json.loads((ROOT / 'modules/fidelity-r34/assets/reference-admissions.json').read_text())
        native = json.loads((ROOT / 'modules/fidelity-r33/native/manifest.json').read_text())
        by_image = {entry['frames'][0]['path']: entry for entry in native['entries'] if entry['kind'] == 'native-static-pose'}
        positive = [source for source in decision['references'] if source['targetEditionReferenceMatched']]
        self.assertEqual(len(positive), 6)
        for source in positive:
            self.assertTrue(source['actuallyInspected'])
            self.assertTrue(source['targetEditionReferenceMatched'])
            self.assertFalse(source['sourceCombatAdmissionChanged'])
            self.assertFalse(by_image[source['path']]['admittedTargetEdition'])
            self.assertEqual(hashlib.sha256((ROOT / source['path']).read_bytes()).hexdigest(), source['sha256'])

    def test_unresolved_edition_cannot_reappear_through_retained_fallbacks(self):
        decision = json.loads((ROOT / 'modules/fidelity-r34/assets/reference-admissions.json').read_text())
        held = [source for source in decision['references'] if source.get('blockRetainedPresentationFallbacks') is True]
        self.assertEqual(len(held), 1); source = held[0]
        self.assertEqual(source['uid'], 'recv-mutated-steve')
        self.assertFalse(source['targetEditionReferenceMatched'])
        self.assertEqual(source['sourceEditionConclusion'], 'UNRESOLVED_SOURCE_EDITION')
        self.assertFalse(source['sourceCombatAdmissionChanged'])
        self.assertTrue(source['actuallyInspected'])
        self.assertEqual(hashlib.sha256((ROOT / source['path']).read_bytes()).hexdigest(), source['sha256'])
        avatars = json.loads((ROOT / 'modules/fidelity-r33/selection/manifest.json').read_text())
        portrait = next(row for row in avatars['entries'] if row['id'] == source['uid'])
        original = copy.deepcopy(portrait)
        item = {'id': source['uid'], 'portrait': {'status': 'GENERATED', 'defaultAdmission': True}}
        compiler.attach_fallbacks(item, portrait, None, {'reason': source['reason']})
        self.assertEqual(item['fallbacks'], {'portrait': None, 'idle': None})
        self.assertEqual(item['retainedUnadmittedFallbacks']['portrait']['image'], source['path'])
        self.assertEqual(item['retainedUnadmittedFallbacks']['portrait']['status'], 'HELD_SOURCE_EDITION')
        self.assertFalse(item['retainedUnadmittedFallbacks']['portrait']['defaultAdmission'])
        self.assertEqual(portrait, original)
        self.assertTrue(item['portrait']['defaultAdmission'], 'A future independently qualified new output remains possible.')


class ReceiptTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix='r34-assets-unit-')
        self.root = Path(self.directory.name)
        self.old_root, self.old_jobs = module.ROOT, module.JOBS
        module.ROOT = self.root
        module.JOBS = self.root / 'jobs.json'
        self.uid = 'fixture-bow'
        self.image_name = 'modules/fidelity-r34/assets/generated/' + self.uid + '/portrait.png'
        self.idle_name = 'modules/fidelity-r34/assets/generated/' + self.uid + '/idle-right.png'
        self.job = {'uid': self.uid, 'lotId': 'lot_1', 'historicalRefusalPreserved': False,
                    'outputs': {'portrait': {'outputPath': self.image_name, 'receiptPath': 'modules/fidelity-r34/assets/lots/lot_1/fixture-bow/portrait.json'},
                                'idle': {'outputPath': self.idle_name, 'receiptPath': 'modules/fidelity-r34/assets/lots/lot_1/fixture-bow/idle.json'}}}
        module.JOBS.write_text(json.dumps({'jobs': [self.job]}))
        self.source_name = 'assets/unit-reference.png'
        image = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); image.paste((80, 100, 90, 255), (4, 4, 60, 60))
        raw = io.BytesIO(); image.save(raw, format='PNG'); self.raw = raw.getvalue()
        for name in [self.source_name, self.image_name, self.idle_name]:
            path = self.root / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(self.raw)
        self.reference = {**module.binding(self.source_name), 'exactIdentity': True, 'targetEditionAdmitted': True,
                          'sourceUrl': 'https://example.invalid/unit-fixture-not-production'}
        self.receipt = {'schema': module.SCHEMA, 'uid': self.uid, 'kind': 'portrait', 'lotId': 'lot_1',
                        'status': 'GENERATED', 'generator': 'image_gen', 'prompt': 'UNIT FIXTURE ONLY — no creature asset produced',
                        'references': [self.reference], 'image': self.image_name, 'generatedBytesEdited': False,
                        'bytes': len(self.raw), 'sha256': hashlib.sha256(self.raw).hexdigest(),
                        'review': {'visuallyReviewed': True, 'portraitIdentityReviewed': True, 'sourceFacing': 'front',
                                   'fullBodyVisible': False, 'completeBodyReferenceVerified': False, 'fightingPoseReviewed': False,
                                   'knownAppearanceGaps': [], 'observations': ['Explicit unit rectangle, not an artistic review.'],
                                   'canonicalFidelityCertified': False, 'originalIdleAnimationCertified': False}}

    def tearDown(self):
        module.ROOT, module.JOBS = self.old_root, self.old_jobs
        self.directory.cleanup()

    def test_actual_rgba_bytes_and_left_portrait_are_accepted(self):
        receipt = copy.deepcopy(self.receipt); receipt['review']['sourceFacing'] = 'left'
        module.validate_receipt(receipt)
        measure = module.measure(self.root / self.image_name)
        self.assertEqual(measure['bounds'], {'x': 4, 'y': 4, 'width': 56, 'height': 56})
        self.assertFalse(measure['silhouetteTouchesCanvasEdge'])
        self.assertEqual((self.root / self.image_name).read_bytes(), self.raw)

    def test_wrong_uid_lot_or_destination_is_rejected(self):
        for patch in [{'uid': 'other-fighter'}, {'lotId': 'lot_2'}, {'image': '../outside.png'}]:
            receipt = copy.deepcopy(self.receipt); receipt.update(patch)
            with self.assertRaises(ValueError): module.validate_receipt(receipt)

    def test_historical_refusal_cannot_be_retried(self):
        self.job['historicalRefusalPreserved'] = True
        module.JOBS.write_text(json.dumps({'jobs': [self.job]}))
        with self.assertRaisesRegex(ValueError, 'historical refusal'): module.validate_receipt(self.receipt)

    def test_changed_png_or_reference_digest_is_rejected(self):
        for location in ['output', 'reference']:
            receipt = copy.deepcopy(self.receipt)
            if location == 'output': receipt['sha256'] = '0' * 64
            else: receipt['references'][0]['sha256'] = '0' * 64
            with self.assertRaises(ValueError): module.validate_receipt(receipt)

    def test_actual_visual_review_and_nonempty_observations_are_required(self):
        for patch in [{'visuallyReviewed': False}, {'observations': []}, {'observations': ['   ']}, {'portraitIdentityReviewed': False}]:
            receipt = copy.deepcopy(self.receipt); receipt['review'].update(patch)
            with self.assertRaises(ValueError): module.validate_receipt(receipt)

    def test_failed_output_cannot_claim_bytes_and_a_held_reference_needs_research(self):
        refused = {key: value for key, value in self.receipt.items() if key not in {'image', 'bytes', 'sha256'}}
        refused.update(status='BLOCKED_BY_TOOL', reason='Actual unit tool refusal fixture')
        module.validate_receipt(refused)
        refused['bytes'] = 1
        with self.assertRaises(ValueError): module.validate_receipt(refused)
        held = {**refused, 'status': 'HELD_REFERENCE'}; held.pop('bytes')
        with self.assertRaisesRegex(ValueError, 'research'): module.validate_receipt(held)
        held['research'] = [{'sourceUrl': 'https://example.invalid/', 'outcome': 'Unit missing-reference fixture'}]
        module.validate_receipt(held)

    def test_portrait_crop_must_lie_within_the_original_raster(self):
        receipt = copy.deepcopy(self.receipt); receipt['review']['portraitCrop'] = {'x': 8, 'y': 8, 'width': 40, 'height': 40}
        module.validate_receipt(receipt)
        for crop in [{'x': -1, 'y': 0, 'width': 10, 'height': 10}, {'x': 60, 'y': 0, 'width': 10, 'height': 10},
                     {'x': 0, 'y': 0, 'width': True, 'height': 10}]:
            receipt['review']['portraitCrop'] = crop
            with self.assertRaisesRegex(ValueError, 'crop'): module.validate_receipt(receipt)

    def idle(self):
        receipt = copy.deepcopy(self.receipt); receipt.update(kind='idle', image=self.idle_name)
        receipt['review'].update(fullBodyVisible=True, fullBodyReviewed=True, completeBodyReferenceVerified=True, fightingPoseReviewed=True, sourceFacing='right')
        return receipt

    def test_only_reviewed_complete_right_body_can_be_a_default_idle(self):
        review = self.idle()['review']; technical = {'silhouetteTouchesCanvasEdge': False}
        self.assertEqual(compiler.body_qualification(review, technical, []), (True, True, True))
        for direction in ['left', 'front', 'unknown', None]:
            changed = {**review, 'sourceFacing': direction}
            self.assertEqual(compiler.body_qualification(changed, technical, []), (True, True, False))
        for flag in ['fullBodyVisible', 'fullBodyReviewed', 'completeBodyReferenceVerified', 'fightingPoseReviewed']:
            self.assertFalse(compiler.body_qualification({**review, flag: False}, technical, [])[2])
            missing = {key: value for key, value in review.items() if key != flag}
            self.assertFalse(compiler.body_qualification(missing, technical, [])[2])
            receipt = self.idle(); receipt['review'].pop(flag)
            with self.assertRaisesRegex(ValueError, 'explicit actual body review'): module.validate_receipt(receipt)
        self.assertFalse(compiler.body_qualification(review, {'silhouetteTouchesCanvasEdge': True}, [])[2])
        self.assertFalse(compiler.body_qualification(review, technical, ['Unsupported equipment remains visible.'])[2])

    def test_whole_body_boolean_needs_used_source_images_and_observations(self):
        receipt = self.idle()
        with self.assertRaisesRegex(ValueError, 'actually inspected'): module.validate_receipt(receipt)
        receipt['review']['completeBodyReferences'] = [{'path': self.source_name, 'sha256': self.reference['sha256'],
                                                       'observation': 'UNIT ONLY: all four rectangle edges visible.'}]
        module.validate_receipt(receipt)
        receipt['review']['completeBodyReferences'][0]['path'] = 'unused-reference.png'
        with self.assertRaisesRegex(ValueError, 'must be used'): module.validate_receipt(receipt)

    def test_new_portrait_refusal_blocks_later_body_generation(self):
        portrait = self.root / self.job['outputs']['portrait']['receiptPath']; portrait.parent.mkdir(parents=True, exist_ok=True)
        portrait.write_text(json.dumps({'status': 'BLOCKED_BY_TOOL'}))
        receipt = self.idle(); receipt['review']['completeBodyReferenceVerified'] = False
        with self.assertRaisesRegex(ValueError, 'portrait request'): module.validate_receipt(receipt)

    def test_generated_style_reference_cannot_become_original_full_body_proof(self):
        receipt = self.idle()
        generated = {**module.binding(self.image_name), 'exactIdentity': True}
        receipt['references'].append(generated)
        receipt['review']['completeBodyReferences'] = [{'path': self.image_name, 'sha256': generated['sha256'],
                                                       'observation': 'This is a generated fixture, not source anatomy.'}]
        with self.assertRaisesRegex(ValueError, 'Generated adaptations'): module.validate_receipt(receipt)

    def test_studies_revisions_and_recovered_generations_cannot_certify_original_anatomy(self):
        for name in ['modules/fidelity-r34/assets/studies/fixture.png',
                     'modules/fidelity-r34/assets/lots/lot_1/fixture-bow/revisions/old.png',
                     'modules/fidelity-r34/assets/lots/lot_1/fixture-bow/research/recovered-positive-1.png',
                     'modules/fidelity-r34/assets/lots/lot_1/fixture-bow/research/recovered-idle-initial.png',
                     'modules/fidelity-r34/assets/lots/lot_1/fixture-bow/research/resume-initial-positive.png']:
            path = self.root / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(self.raw)
            receipt = self.idle(); ref = {**module.binding(name), 'exactIdentity': True}
            receipt['references'].append(ref)
            receipt['review']['completeBodyReferences'] = [{'path': name, 'sha256': ref['sha256'], 'observation': 'Unit generated study, never original source anatomy.'}]
            with self.assertRaisesRegex(ValueError, 'Generated adaptations'): module.validate_receipt(receipt)

    def delivered(self, receipt=None):
        receipt = copy.deepcopy(receipt or self.receipt)
        path = self.root / self.job['outputs'][receipt['kind']]['receiptPath']; path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
        return path

    def changed_tool_fixture(self, colour=(120, 60, 40, 255)):
        path = self.root / 'new-tool-unit-fixture.png'
        image = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); image.paste(colour, (7, 7, 57, 57)); image.save(path, format='PNG')
        return path

    def tree_bytes(self):
        return {path.relative_to(self.root).as_posix(): path.read_bytes() if path.is_file() else None for path in self.root.rglob('*')}

    def test_explicit_positive_revision_archives_old_bytes_and_imports_untouched_new_png(self):
        old_path = self.delivered(); old_receipt = old_path.read_bytes(); source = self.changed_tool_fixture(); new_raw = source.read_bytes()
        corrected = copy.deepcopy(self.receipt); corrected['prompt'] = 'UNIT FIXTURE: explicit positive correction, no real creature generated.'
        corrected['references'].append({**module.binding(self.image_name), 'exactIdentity': True})
        result, destination = module.import_output(corrected, source, replace_sha256=hashlib.sha256(self.raw).hexdigest(), revision_reason='Unit correction of a documented orientation defect.')
        link = result['replacesGeneratedOutput']
        self.assertEqual((self.root / link['image']['path']).read_bytes(), self.raw)
        self.assertEqual((self.root / link['receipt']['path']).read_bytes(), old_receipt)
        self.assertEqual((self.root / self.image_name).read_bytes(), new_raw)
        self.assertEqual(source.read_bytes(), new_raw)
        self.assertEqual(link['image']['sha256'], hashlib.sha256(self.raw).hexdigest())
        self.assertEqual(link['receipt']['sha256'], hashlib.sha256(old_receipt).hexdigest())
        self.assertEqual(result['sha256'], hashlib.sha256(new_raw).hexdigest())
        self.assertEqual(result['references'][-1]['originalToolReferencePath'], self.image_name)
        self.assertEqual(result['references'][-1]['path'], link['image']['path'])
        self.assertEqual(json.loads(destination.read_bytes()), result)
        module.validate_receipt(result)
        self.assertEqual(len(list(module.revision_bindings(result))), 2)

    def test_revision_precondition_failures_leave_every_file_unchanged(self):
        old_path = self.delivered(); source = self.changed_tool_fixture()
        cases = [('wrong hash', {'replace_sha256': '0' * 64, 'revision_reason': 'Unit wrong hash'}),
                 ('missing reason', {'replace_sha256': self.receipt['sha256']}),
                 ('unannounced replacement', {})]
        for _, options in cases:
            before = self.tree_bytes()
            with self.assertRaises(ValueError): module.import_output(self.receipt, source, **options)
            self.assertEqual(self.tree_bytes(), before)
        changed = {**self.receipt, 'uid': 'other-fighter'}; before = self.tree_bytes()
        with self.assertRaises(ValueError): module.import_output(changed, source, replace_sha256=self.receipt['sha256'], revision_reason='Wrong owner fixture')
        self.assertEqual(self.tree_bytes(), before)
        old = json.loads(old_path.read_bytes()); old['lotId'] = 'lot_2'; old_path.write_text(json.dumps(old))
        before = self.tree_bytes()
        with self.assertRaises(ValueError): module.import_output(self.receipt, source, replace_sha256=self.receipt['sha256'], revision_reason='Wrong prior owner fixture')
        self.assertEqual(self.tree_bytes(), before)

    def test_discordant_archive_and_tampered_delivered_png_are_never_overwritten(self):
        old_path = self.delivered(); old_raw = old_path.read_bytes(); source = self.changed_tool_fixture()
        folder = old_path.parent / 'revisions' / ('portrait-' + self.receipt['sha256'] + '-' + hashlib.sha256(old_raw).hexdigest())
        folder.mkdir(parents=True); (folder / 'receipt.json').write_bytes(b'unit conflicting archive')
        before = self.tree_bytes()
        with self.assertRaisesRegex(ValueError, 'immutable revision archive'): module.import_output(self.receipt, source, replace_sha256=self.receipt['sha256'], revision_reason='Unit archive conflict')
        self.assertEqual(self.tree_bytes(), before)
        (folder / 'receipt.json').unlink(); (self.root / self.image_name).write_bytes(source.read_bytes())
        before = self.tree_bytes()
        with self.assertRaises(ValueError): module.import_output(self.receipt, source, replace_sha256=self.receipt['sha256'], revision_reason='Unit old PNG tamper')
        self.assertEqual(self.tree_bytes(), before)

    def test_historical_and_current_tool_refusals_cannot_be_promoted_by_revision(self):
        self.delivered(); source = self.changed_tool_fixture(); self.job['historicalRefusalPreserved'] = True
        module.JOBS.write_text(json.dumps({'jobs': [self.job]})); before = self.tree_bytes()
        with self.assertRaisesRegex(ValueError, 'historical refusal'): module.import_output(self.receipt, source, replace_sha256=self.receipt['sha256'], revision_reason='Unit forbidden historical revision')
        self.assertEqual(self.tree_bytes(), before)
        self.job['historicalRefusalPreserved'] = False; module.JOBS.write_text(json.dumps({'jobs': [self.job]}))
        refused = {key: value for key, value in self.receipt.items() if key not in {'image', 'bytes', 'sha256'}}
        refused.update(status='BLOCKED_BY_TOOL', reason='Unit actual refusal')
        path = self.delivered(refused); (self.root / self.image_name).unlink(); before = self.tree_bytes()
        with self.assertRaisesRegex(ValueError, 'refused|refusals'): module.import_output(self.receipt, source, replace_receipt_sha256=hashlib.sha256(path.read_bytes()).hexdigest(), revision_reason='Unit forbidden refusal promotion')
        self.assertEqual(self.tree_bytes(), before)

    def test_held_reference_promotion_archives_receipt_without_inventing_prior_png(self):
        held = {key: value for key, value in self.receipt.items() if key not in {'image', 'bytes', 'sha256'}}
        held.update(status='HELD_REFERENCE', reason='Unit missing source before later discovery', research=[{'path': self.source_name, 'outcome': 'Unit originally incomplete body source'}])
        path = self.delivered(held); old_raw = path.read_bytes(); (self.root / self.image_name).unlink(); source = self.changed_tool_fixture()
        before = self.tree_bytes()
        with self.assertRaises(ValueError): module.import_output(self.receipt, source, replace_receipt_sha256='0' * 64, revision_reason='Unit wrong held receipt hash')
        self.assertEqual(self.tree_bytes(), before)
        result, _ = module.import_output(self.receipt, source, replace_receipt_sha256=hashlib.sha256(old_raw).hexdigest(), revision_reason='Unit newly inspected complete original source')
        link = result['replacesHeldReference']; self.assertNotIn('image', link)
        self.assertEqual((self.root / link['receipt']['path']).read_bytes(), old_raw)
        self.assertEqual((self.root / self.image_name).read_bytes(), source.read_bytes())
        module.validate_receipt(result)

    def test_portrait_refusal_blocks_a_body_revision_before_any_write(self):
        idle = self.idle(); idle['review']['completeBodyReferences'] = [{'path': self.source_name, 'sha256': self.reference['sha256'], 'observation': 'Unit entire original rectangle'}]
        self.delivered(idle)
        portrait = self.root / self.job['outputs']['portrait']['receiptPath']; portrait.write_text(json.dumps({'status': 'BLOCKED_BY_TOOL'}))
        source = self.changed_tool_fixture(); before = self.tree_bytes()
        with self.assertRaisesRegex(ValueError, 'portrait request'): module.import_output(idle, source, replace_sha256=idle['sha256'], revision_reason='Unit forbidden body continuation')
        self.assertEqual(self.tree_bytes(), before)

    def test_successive_revision_keeps_the_previous_archive_chain_and_detects_tampering(self):
        self.delivered(); source = self.changed_tool_fixture()
        first, _ = module.import_output(self.receipt, source, replace_sha256=self.receipt['sha256'], revision_reason='Unit first positive correction')
        previous_raw = (self.root / self.image_name).read_bytes()
        self.changed_tool_fixture((30, 120, 80, 255))
        second, _ = module.import_output(first, source, replace_sha256=first['sha256'], revision_reason='Unit subsequent documented correction')
        prior = json.loads((self.root / second['replacesGeneratedOutput']['receipt']['path']).read_bytes())
        self.assertEqual(prior, first)
        self.assertEqual((self.root / second['replacesGeneratedOutput']['image']['path']).read_bytes(), previous_raw)
        self.assertEqual(len(list(module.revision_bindings(second))), 4)
        module.validate_receipt(second)
        archive = self.root / first['replacesGeneratedOutput']['image']['path']; archive.write_bytes(b'unit archive tamper')
        before = self.tree_bytes()
        with self.assertRaisesRegex(ValueError, 'Revision archive bytes'): module.validate_receipt(second)
        self.assertEqual(self.tree_bytes(), before)

    def test_body_refusal_also_blocks_later_portrait_revision_without_invalidating_old_portrait(self):
        portrait = self.delivered(); source = self.changed_tool_fixture()
        blocked = {'schema': module.SCHEMA, 'uid': self.uid, 'kind': 'idle', 'lotId': 'lot_1',
                   'generator': 'image_gen', 'status': 'BLOCKED_BY_TOOL', 'reason': 'Unit actual body refusal'}
        body = self.root / self.job['outputs']['idle']['receiptPath']; body.write_text(json.dumps(blocked))
        before = self.tree_bytes()
        with self.assertRaisesRegex(ValueError, 'body request'): module.import_output(self.receipt, source, replace_sha256=self.receipt['sha256'], revision_reason='Unit prohibited portrait retry')
        self.assertEqual(self.tree_bytes(), before)
        module.validate_receipt(json.loads(portrait.read_bytes()))  # Existing earlier art remains readable.

    def test_same_uid_concurrent_revisions_have_one_cas_winner_and_a_coherent_final_pair(self):
        destination = self.delivered(); image = self.root / self.image_name
        source_a = self.root / 'tool-a.png'; source_a.write_bytes(self.changed_tool_fixture((10, 60, 130, 255)).read_bytes())
        source_b = self.root / 'tool-b.png'; source_b.write_bytes(self.changed_tool_fixture((120, 20, 90, 255)).read_bytes())
        first_at_publication, release_first, second_started, second_at_publication = [threading.Event() for _ in range(4)]
        role = threading.local(); original = module.atomic_write

        def paused_write(path, raw):
            if path == image:
                if role.value == 'A':
                    first_at_publication.set()
                    if not release_first.wait(5): raise RuntimeError('Unit publication release timed out')
                else:
                    second_at_publication.set()
            return original(path, raw)

        def worker(label, source):
            role.value = label
            if label == 'B': second_started.set()
            try:
                result, _ = module.import_output(self.receipt, source, replace_sha256=self.receipt['sha256'], revision_reason='Unit concurrent correction ' + label)
                return {'success': True, 'sha256': result['sha256']}
            except ValueError as error:
                return {'success': False, 'error': str(error)}

        module.atomic_write = paused_write
        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                first = pool.submit(worker, 'A', source_a)
                try:
                    self.assertTrue(first_at_publication.wait(5))
                    second = pool.submit(worker, 'B', source_b); self.assertTrue(second_started.wait(5))
                    self.assertFalse(second_at_publication.wait(0.15), 'A second owner entered publication while the first still held the UID')
                finally:
                    release_first.set()
                results = [first.result(timeout=5), second.result(timeout=5)]
            self.assertEqual(sum(row['success'] for row in results), 1)
            self.assertIn('--replace-sha256', next(row['error'] for row in results if not row['success']))
            current = json.loads(destination.read_bytes())
            self.assertEqual(current['sha256'], hashlib.sha256(image.read_bytes()).hexdigest())
            self.assertEqual(image.read_bytes(), source_a.read_bytes())
            module.validate_receipt(current)
        finally:
            release_first.set(); module.atomic_write = original

    def test_opaque_or_blank_png_does_not_pass_transparency_validation(self):
        path = self.root / 'opaque.png'; Image.new('RGBA', (32, 32), (0, 0, 0, 255)).save(path)
        with self.assertRaisesRegex(ValueError, 'transparency'): module.measure(path)
        Image.new('RGBA', (32, 32), (0, 0, 0, 0)).save(path)
        with self.assertRaisesRegex(ValueError, 'transparency'): module.measure(path)

    def test_atomic_metadata_write_replaces_only_the_owned_file(self):
        path = self.root / 'owned/output.json'
        module.atomic_write(path, b'{"version":1}\n'); module.atomic_write(path, b'{"version":2}\n')
        self.assertEqual(path.read_bytes(), b'{"version":2}\n')
        self.assertEqual(list(path.parent.glob('*.tmp')), [])


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromModule(__import__(__name__))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    names = ['tests/test_roster_assets_r34.py', 'scripts/build-roster-jobs-r34.py', 'scripts/import-roster-asset-r34.py',
             'scripts/build-roster-assets-r34.py', 'modules/fidelity-r34/assets/jobs.json',
             'modules/fidelity-r34/assets/reference-admissions.json']
    report = {'schema': 're.bow.roster-assets-tests-r34/1', 'passed': result.testsRun - len(result.failures) - len(result.errors),
              'failed': len(result.failures) + len(result.errors),
              'sourceFiles': [{'path': name, 'sha256': hashlib.sha256((ROOT / name).read_bytes()).hexdigest()} for name in names],
              'scope': 'Actual346-fighter inventory plus explicit isolated rectangle fixtures for receipt ownership, refusal, raw bytes, crop, original-anatomy source gates and explicit immutable correction/held-promotion archives. Successful revision chains and rejected preconditions are exercised on real fixture files; fixtures are not generated creature media or artistic proof.'}
    (ROOT / 'docs/R34_ASSETS_TESTS.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    raise SystemExit(0 if result.wasSuccessful() else 1)
