"""SHA-bound review overlays cannot invent complete anatomy, states, pixels or targets."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location('overlay',ROOT/'scripts/build-sprite-overlay-r28.py')
MOD=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(MOD)
BASE=json.loads((ROOT/MOD.BASE).read_text())
ENTRIES={entry['id']:entry for entry in BASE['sprites']}
INDEX=json.loads((ROOT/MOD.REVIEWS).read_text())
PROOFS={entry['uid']:entry for entry in INDEX['entries']}


def observation(uid):
    proof=PROOFS[uid]
    return MOD.verified(proof), {'path':proof['path'],'sha256':proof['sha256']}


class SpriteOverlayTests(unittest.TestCase):
    def test_all171actual_observations_preserve363target_pngs_and22refusals(self):
        result=MOD.build(validate_pixels=False)
        self.assertEqual(result['counts']['visuallyReviewedSprites'],363)
        self.assertEqual(result['counts']['newVisualReviews'],171)
        self.assertEqual(len(result['sprites']),363)
        self.assertEqual(result['pending'],BASE['pending'])
        self.assertEqual(result['failures'],BASE['failures'])
        self.assertEqual(result['counts']['newTargetIdentities'],0)
        for entry in result['sprites']:
            if entry['id'] in result['replacements']:
                continue
            for key in ('image','sha256','bytes','decodedRgbaSha256','provenance','incarnation','scope'):
                self.assertEqual(entry[key],ENTRIES[entry['id']][key],entry['id']+': '+key)
        self.assertEqual(result['counts']['canonicalFidelityCertified'],0)
        self.assertEqual(result['counts']['completeCombatAnimationSets'],0)

    def test_captured_request_paths_remain_portable_to_a_different_checkout(self):
        ref=ENTRIES['rerev2-orthrus']['provenance']['references'][0]['path']
        receipt={'capturedRepositoryRoot':'/old-generation-machine/checkout',
            'referenced_image_paths':['/old-generation-machine/checkout/'+ref]}
        self.assertEqual(MOD.generation_reference_paths(receipt,{ref:'unused'}),[ref])
        receipt['referenced_image_paths']=['/different-root/'+ref]
        with self.assertRaises(ValueError):MOD.generation_reference_paths(receipt,{ref:'unused'})

    def test_actual_replacements_bind_new_whole_body_proofs_without_new_idle_claims(self):
        manifest=MOD.build(validate_pixels=False)
        self.assertGreaterEqual(len(manifest['replacements']),4)
        self.assertEqual(len(set(manifest['replacements'])),len(manifest['replacements']))
        for uid in manifest['replacements']:
            entry=next(e for e in manifest['sprites'] if e['id']==uid)
            self.assertEqual(entry['supersedesSha256'],ENTRIES[uid]['sha256'])
            self.assertTrue(entry['fullBodyReviewed'])
            self.assertEqual(entry['availableStates'],[])
            proof=MOD.verified(entry['sourceCompletenessEvidence'])
            self.assertEqual(proof['imageSha256'],entry['sha256'])
            self.assertFalse(proof['originalGamePoseCertified'])

    def test_completion_queue_keeps_partial_bodies_and_refusals_separate(self):
        manifest=MOD.build(validate_pixels=False);queue=MOD.body_queue(manifest)
        pending={entry['id']:entry for entry in queue['entries']}
        self.assertIn('re2-brad-vickers-zombie',pending)
        self.assertFalse(pending['re2-brad-vickers-zombie']['completeBodyReferenceVerified'])
        self.assertNotIn('reoutbreak-giant-spider',pending)
        self.assertEqual(set(queue['blockedIdentities']),{entry['id'] for entry in BASE['pending']})
        self.assertFalse(set(queue['blockedIdentities'])&set(pending))
        self.assertEqual(queue['preservedToolRefusals'],22)
        self.assertFalse(queue['fidelityCertified'])

    def test_generated_whole_legs_from_a_bust_are_not_admitted(self):
        data,proof=observation('re2-brad-vickers-zombie')
        self.assertTrue(data['generatedCompleteBodyObserved'])
        self.assertFalse(data['sourceCompleteBodyObserved'])
        result=MOD.apply_review(ENTRIES[data['uid']],data,proof)
        self.assertFalse(result['fullBodyReviewed'])
        self.assertEqual(result['availableStates'],[])
        self.assertIn('extrapolated',result['limitations'][-1])

    def test_neutral_body_and_actual_direction_are_independent_of_bind_or_flight(self):
        for uid in ('re5-chainsaw-majini','reoutbreak-giant-wasp','re4-colmillos'):
            data,proof=observation(uid); result=MOD.apply_review(ENTRIES[uid],data,proof)
            self.assertEqual(result['availableStates'],[],uid)
        data,proof=observation('reoutbreak-giant-spider')
        result=MOD.apply_review(ENTRIES[data['uid']],data,proof)
        self.assertEqual(result['sourceFacing'],'left')
        self.assertEqual(result['availableStates'],['idle'])

    def test_partial_source_cannot_be_promoted_to_whole_combat_body(self):
        data,proof=observation('re7-lucas-baker')
        data.update(fullBodyReviewed=True,generatedCompleteBodyObserved=True)
        with self.assertRaisesRegex(ValueError,'Complete-body admission'):
            MOD.apply_review(ENTRIES[data['uid']],data,proof)

    def test_contact_source_uid_and_source_hash_tampering_fail_closed(self):
        for mutation in ('contact','source','uid'):
            data,proof=observation('rerev2-orthrus')
            if mutation=='contact': data['visualEvidence']['sha256']='0'*64
            elif mutation=='source':data['references'][0]['sha256']='0'*64
            else:data['uid']='re7-lucas-baker'
            with self.assertRaises(ValueError):
                MOD.apply_review(ENTRIES['rerev2-orthrus'],data,proof)

    def test_changed_observation_receipt_is_rejected(self):
        proof=copy.deepcopy(PROOFS['rerev2-orthrus']);proof['sha256']='0'*64
        with self.assertRaisesRegex(ValueError,'Changed evidence'):
            MOD.verified(proof)

    def test_foreign_and_missing_evidence_paths_cannot_be_imported(self):
        for value in ('/tmp/non-repository-file','../outside','modules/missing.json','http://outside.invalid/x.json'):
            with self.assertRaises(ValueError):MOD.local(value)

    def test_replacement_cannot_change_identity_or_reuse_same_png(self):
        old=ENTRIES['rerev2-orthrus']
        entry=copy.deepcopy(old);entry['supersedesSha256']='0'*64
        with self.assertRaisesRegex(ValueError,'supersede exactly'):MOD.validate_replacement(entry,old)
        entry['supersedesSha256']=old['sha256']
        with self.assertRaisesRegex(ValueError,'new exact-UID'):MOD.validate_replacement(entry,old)

    def test_observation_does_not_alter_source_bytes_or_certify_original_pose(self):
        for proof in INDEX['entries']:
            data=MOD.verified(proof)
            self.assertFalse(data['manualPngEdits'])
            self.assertFalse(data['canonicalFidelityCertified'])
            self.assertFalse(data['originalGamePoseCertified'])
            self.assertFalse(data['oppositeViewReviewed'])
            self.assertFalse(data['combatAnimationSetReviewed'])


if __name__=='__main__':
    suite=unittest.defaultTestLoader.loadTestsFromTestCase(SpriteOverlayTests)
    result=unittest.TextTestRunner(verbosity=2).run(suite)
    report={'schema':'re.bow.sprite-overlay-tests-r28/1','passed':result.testsRun-len(result.failures)-len(result.errors),'failed':len(result.failures)+len(result.errors),'run':result.testsRun,'observedBaselineIdentities':171,'scope':'SHA-bound source/output visual observations and unchanged historical production/refusals; no official-game pose or full animation certification.'}
    (ROOT/'docs/R28_SPRITES_TESTS.json').write_text(json.dumps(report,indent=2)+'\n')
    raise SystemExit(not result.wasSuccessful())
