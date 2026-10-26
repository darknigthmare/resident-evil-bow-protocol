"""R29 pose/source overlays preserve targets and refuse explicit incomplete appearances."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location('overlay_r29',ROOT/'scripts/build-sprite-overlay-r29.py')
MOD=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(MOD)
BASE=json.loads((ROOT/MOD.BASE).read_text())
ENTRIES={entry['id']:entry for entry in BASE['sprites']}
INDEX=json.loads((ROOT/MOD.REVIEWS).read_text())
PROOFS={entry['uid']:entry for entry in INDEX['entries']}


def observation(uid):
    proof=PROOFS[uid]
    return MOD.verified(proof),{'path':proof['path'],'sha256':proof['sha256']}


class SpriteOverlayR29Tests(unittest.TestCase):
    def test_all106_unknown_poses_have_real_observations_without_new_targets(self):
        result=MOD.build(validate_pixels=False)
        self.assertEqual(len(result['sprites']),363)
        self.assertEqual(result['counts']['newPoseReviews'],106)
        self.assertEqual(result['counts']['unknownPoseSprites'],0)
        self.assertEqual(result['counts']['newTargetIdentities'],0)
        self.assertEqual(result['pending'],BASE['pending'])
        self.assertEqual(result['failures'],BASE['failures'])
        self.assertEqual(result['previousReplacements'],BASE['replacements'])
        self.assertEqual({e['uid'] for e in INDEX['entries']},{s['id'] for s in BASE['sprites'] if s['poseKind']=='unknown'})
        for entry in result['sprites']:
            if entry['id'] in result['replacements']:continue
            for key in ('image','sha256','bytes','decodedRgbaSha256','provenance','incarnation','scope'):
                self.assertEqual(entry[key],ENTRIES[entry['id']][key],entry['id']+': '+key)

    def test_anatomical_completeness_does_not_certify_cropped_equipment(self):
        data,proof=observation('revillage-alcina-dimitrescu')
        result=MOD.apply_review(ENTRIES[data['uid']],data,proof)
        self.assertTrue(result['fullBodyReviewed'])
        self.assertEqual(result['poseKind'],'neutral-base')
        self.assertEqual(result['sourceFacing'],'left')
        self.assertFalse(result['equipmentCompletenessReviewed'])
        self.assertTrue(result['knownAppearanceGaps'])
        self.assertEqual(result['availableStates'],[])

    def test_complete_neutral_ant_stays_a_context_encounter(self):
        data,proof=observation('recv-ant')
        result=MOD.apply_review(ENTRIES[data['uid']],data,proof)
        self.assertTrue(result['fullBodyReviewed'])
        self.assertEqual(result['poseKind'],'neutral-base')
        self.assertEqual(result['scope'],'context-encounter')
        self.assertEqual(result['availableStates'],[])

    def test_whole_shark_presentation_does_not_become_ground_idle(self):
        data,proof=observation('re1-neptune')
        result=MOD.apply_review(ENTRIES[data['uid']],data,proof)
        self.assertTrue(result['fullBodyReviewed'])
        self.assertEqual(result['poseKind'],'source-presentation')
        self.assertEqual(result['availableStates'],[])

    def test_generated_legs_from_swamp_jack_portraits_remain_held(self):
        data,proof=observation('re7-jack-baker-swamp-man')
        self.assertFalse(data['sourceCompleteBodyObserved'])
        self.assertTrue(data['generatedCompleteBodyObserved'])
        result=MOD.apply_review(ENTRIES[data['uid']],data,proof)
        self.assertFalse(result['fullBodyReviewed'])
        self.assertEqual(result['availableStates'],[])

    def test_observations_bind_exact_entry_source_image_and_contact(self):
        for mutation in ('entry','source','image','contact','bodytype'):
            data,proof=observation('recv-ant')
            if mutation=='entry':data['baseEntrySha256']='0'*64
            elif mutation=='source':data['references'][0]['sha256']='0'*64
            elif mutation=='image':data['imageSha256']='0'*64
            elif mutation=='contact':data['visualEvidence']['sha256']='0'*64
            else:data['sourceCompleteBodyObserved']='true'
            with self.assertRaises(ValueError):MOD.apply_review(ENTRIES['recv-ant'],data,proof)

    def test_partial_sources_cannot_claim_whole_body_with_one_flag(self):
        data,proof=observation('re4r-el-gigante');data['fullBodyReviewed']=True
        with self.assertRaisesRegex(ValueError,'Complete-body admission'):
            MOD.apply_review(ENTRIES[data['uid']],data,proof)

    def test_explicit_appearance_gap_removes_idle_while_undefined_legacy_gaps_remain_unchanged(self):
        entry=copy.deepcopy(next(e for e in BASE['sprites'] if e['availableStates']==['idle']))
        entry.pop('knownAppearanceGaps',None)
        self.assertEqual(MOD.admitted(entry),['idle'])
        entry['knownAppearanceGaps']=['A documented weapon end is absent.']
        self.assertEqual(MOD.admitted(entry),[])

    def test_actual_replacements_bind_the_active_r28_sha_and_do_not_duplicate_uid(self):
        result=MOD.build(validate_pixels=False)
        self.assertGreater(len(result['replacements']),0,'At least one actual R29 tool artifact must be published before delivery.')
        self.assertEqual(len({e['id'] for e in result['sprites']}),363)
        for uid in result['replacements']:
            entry=next(e for e in result['sprites'] if e['id']==uid)
            self.assertEqual(entry['supersedesSha256'],ENTRIES[uid]['sha256'])
            self.assertTrue(entry['fullBodyReviewed'])
            self.assertEqual(MOD.verified(entry['sourceCompletenessEvidence'])['imageSha256'],entry['sha256'])
            if entry.get('knownAppearanceGaps'):self.assertEqual(entry['availableStates'],[])

    def test_body_queue_keeps_whole_body_appearance_gaps_and_refusals_explicit(self):
        result=MOD.build(validate_pixels=False);queue=MOD.body_queue(result)
        gaps={e['id']:e for e in queue['entries']}
        self.assertIn('re7-jack-baker-swamp-man',gaps)
        self.assertNotIn('revillage-alcina-dimitrescu',gaps)
        self.assertIn('revillage-alcina-dimitrescu',{e['id'] for e in queue['knownAppearanceGaps']})
        self.assertFalse(set(queue['blockedIdentities'])&set(gaps))
        self.assertEqual(queue['preservedToolRefusals'],22)
        self.assertFalse(queue['fidelityCertified'])
        notes=json.loads((ROOT/MOD.SOURCE_NOTES).read_text())
        self.assertEqual(result['counts']['legacySourceEditionNotes'],2)
        self.assertEqual(result['counts']['explicitAppearanceGapSprites'],9)
        for note in notes['entries']:
            active=next(e for e in result['sprites'] if e['id']==note['id'])
            old=ENTRIES[note['id']]
            for key in ('image','sha256','provenance','fullBodyReviewed','poseKind','sourceFacing','sourceCompletenessEvidence','incarnation','scope'):
                self.assertEqual(active[key],old[key],key)
            self.assertIn('HD/PC (2013)',active['sourceEdition'])
            self.assertIn('3DS (2012)',active['sourceVariantLabel'])
            self.assertIn('3DS (2012)',active['knownAppearanceGaps'][0])
            self.assertEqual(active['availableStates'],[])
            self.assertNotIn('admittedTargetEdition',active)
            proof=active['r29LegacySourceNote']
            self.assertEqual(MOD.verified(proof)['entries'],notes['entries'])
            for field in ('baseEntrySha256','imageSha256','sourceEntrySha256','sourceEditionDeclaration'):
                tampered=copy.deepcopy(note);tampered[field]='tampered'
                with self.assertRaises(ValueError):MOD.apply_legacy_source_note(old,tampered,proof)

    def test_four_pc2013_documentary_bodies_never_close_3ds2012_targets(self):
        result=MOD.build(validate_pixels=False)
        self.assertEqual(len(result['documentaryVariants']),4)
        active={e['id']:e for e in result['sprites']}
        for entry in result['documentaryVariants']:
            self.assertFalse(entry['admittedTargetEdition'])
            self.assertEqual(entry['scope'],'documentary-edition-variant')
            self.assertFalse(entry['targetFullBodyReviewed'])
            self.assertEqual(entry['availableStates'],[])
            self.assertEqual(active[entry['id']]['sha256'],ENTRIES[entry['id']]['sha256'])
            self.assertEqual(active[entry['id']]['fullBodyReviewed'],ENTRIES[entry['id']]['fullBodyReviewed'])
            self.assertNotIn(entry['id'],result['replacements'])

    def test_a_refused_revision_preserves_its_active_image_without_becoming_a_23rd_target_failure(self):
        result=MOD.build(validate_pixels=False)
        self.assertEqual(len(result['revisionFailures']),1)
        failure=result['revisionFailures'][0]
        self.assertEqual(failure['id'],'re1r-tyrant')
        active=next(e for e in result['sprites'] if e['id']==failure['id'])
        self.assertEqual(active['sha256'],ENTRIES[failure['id']]['sha256'])
        self.assertEqual(failure['preservedActiveSha256'],active['sha256'])
        self.assertNotIn(failure['id'],{e['id'] for e in result['pending']})
        self.assertEqual(len(result['pending']),22)

    def test_lost_record_flags_cannot_promote_documentary_request_or_body_proof(self):
        result=MOD.build(validate_pixels=False)
        entry=next(e for e in result['sprites'] if e['id'] in result['replacements'])
        old=ENTRIES[entry['id']]
        with patch.object(MOD,'validate_source_body_receipt',return_value={'targetEditionAdmitted':False}):
            with self.assertRaisesRegex(ValueError,'provenance cannot be discarded'):
                MOD.validate_replacement(entry,old)
        with patch.object(MOD,'validate_source_body_receipt',return_value={'targetEditionAdmitted':True}),patch.object(MOD,'verified',return_value={'targetEditionAdmitted':False}):
            with self.assertRaisesRegex(ValueError,'provenance cannot be discarded'):
                MOD.validate_replacement(entry,old)

    def test_changed_receipts_or_outside_paths_are_rejected(self):
        proof=copy.deepcopy(PROOFS['recv-ant']);proof['sha256']='0'*64
        with self.assertRaises(ValueError):MOD.verified(proof)
        for path in ['/tmp/not-repository-evidence','../outside','https://outside.invalid/ref.png']:
            with self.assertRaises(ValueError):MOD.local(path)

    def test_captured_generation_paths_are_portable_but_cannot_change_sources(self):
        path=ENTRIES['recv-ant']['provenance']['references'][0]['path']
        receipt={'capturedRepositoryRoot':'/original/image-tool/checkout','referenced_image_paths':['/original/image-tool/checkout/'+path]}
        self.assertEqual(MOD.generation_reference_paths(receipt,{path:'unused'}),[path])
        receipt['referenced_image_paths']=['/another/checkout/'+path]
        with self.assertRaises(ValueError):MOD.generation_reference_paths(receipt,{path:'unused'})


if __name__=='__main__':
    checks=[]
    class EvidenceResult(unittest.TextTestResult):
        def addSuccess(self,test):
            super().addSuccess(test);checks.append({'name':test.id(),'pass':True})
        def addFailure(self,test,error):
            super().addFailure(test,error);checks.append({'name':test.id(),'pass':False,'error':self._exc_info_to_string(error,test)})
        def addError(self,test,error):
            super().addError(test,error);checks.append({'name':test.id(),'pass':False,'error':self._exc_info_to_string(error,test)})
    result=unittest.TextTestRunner(verbosity=2,resultclass=EvidenceResult).run(unittest.defaultTestLoader.loadTestsFromTestCase(SpriteOverlayR29Tests))
    failures=len(result.failures)+len(result.errors)
    paths=['scripts/build-sprite-overlay-r29.py','tests/test_sprite_overlay_r29.py',MOD.BASE,MOD.REVIEWS,MOD.SOURCE_NOTES,'modules/fidelity-r29/sprites/manifest.json']
    report={'schema':'re.bow.sprite-overlay-tests-r29/1','passed':result.testsRun-failures,'failed':failures,'run':result.testsRun,'checks':checks,
        'inputs':[{'path':path,'sha256':hashlib.sha256((ROOT/path).read_bytes()).hexdigest()}for path in paths],
        'scope':'Actual106 pose/source observations, immutable R28 lineage, explicit appearance gaps, edition variants and real R29 replacements; no geometric or full-animation certification.'}
    (ROOT/'docs/R29_SPRITES_TESTS.json').write_text(json.dumps(report,indent=2)+'\n')
    raise SystemExit(not result.wasSuccessful())
