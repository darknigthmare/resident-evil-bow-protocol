"""Provenance and admission checks on actual R31 generated source-body outputs."""
import copy
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import unittest
from zipfile import ZipFile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r31/sprites'
SPEC = importlib.util.spec_from_file_location('r31_sprites', ROOT / 'scripts/build-sprites-r31.py')
BUILDER = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(BUILDER)
BASE = json.loads((ROOT / 'modules/fidelity-r29/sprites/manifest.json').read_text())
MANIFEST = json.loads((PACK / 'manifest.json').read_text())
BASE_BY_ID = {entry['id']: entry for entry in BASE['sprites']}
NEW = [entry for entry in MANIFEST['sprites'] if entry['id'] in MANIFEST['replacements']] + MANIFEST['sameEditionVariants']
sha = lambda raw: hashlib.sha256(raw).hexdigest()


class GeneratedSpritesR31(unittest.TestCase):
    def test_all_original_targets_and_refusals_remain_disjoint_unchanged(self):
        self.assertEqual(len(MANIFEST['sprites']), 363); self.assertEqual(len(MANIFEST['pending']), 22)
        self.assertEqual(MANIFEST['pending'], BASE['pending']); self.assertEqual(MANIFEST['revisionFailures'], BASE['revisionFailures'])
        self.assertEqual(len({entry['id'] for entry in MANIFEST['sprites'] + MANIFEST['pending']}), 385)
        self.assertEqual(MANIFEST['documentaryVariants'], BASE['documentaryVariants'])

    def test_all_untouched_active_records_match_the_frozen_registry(self):
        for entry in MANIFEST['sprites']:
            if entry['id'] not in MANIFEST['replacements']:
                self.assertEqual(entry, BASE_BY_ID[entry['id']], entry['id'])
        self.assertEqual(set(MANIFEST['replacements']), {'re7-lucas-baker-mutated', 'revillage-donna-angie'})

    def test_two_actual_pixel_revisions_bind_the_prior_target(self):
        for entry in NEW[:2]:
            self.assertEqual(entry['supersedesSha256'], BASE_BY_ID[entry['id']]['sha256'])
            self.assertNotEqual(entry['sha256'], entry['supersedesSha256'])
            self.assertTrue(entry['image'].startswith('modules/fidelity-r31/sprites/generated/' + entry['id'] + '/'))

    def test_actual_tool_pngs_match_receipts_without_pixel_edits(self):
        self.assertEqual(len(NEW), 3)
        for entry in NEW:
            raw = (ROOT / entry['image']).read_bytes(); self.assertEqual(sha(raw), entry['sha256']); self.assertEqual(len(raw), entry['bytes'])
            receipt = json.loads(BUILDER.checked(entry['provenance']['generationRecord']))
            self.assertEqual(receipt['toolArtifactSha256'], sha(raw)); self.assertFalse(receipt['manualPngEdits'])
            self.assertTrue(receipt['transparent_background']); self.assertTrue(receipt['tool_output'].startswith('/workspace/generated_images/exec-'))
            for key, value in BUILDER.MEASURE.measure(raw).items():self.assertEqual(entry[key], value)

    def test_visible_full_silhouettes_have_real_alpha_and_no_clipped_visible_edges(self):
        for entry in NEW:
            im = Image.open(ROOT / entry['image']).convert('RGBA'); alpha = im.getchannel('A')
            self.assertEqual(alpha.getextrema()[0], 0)
            edges = [alpha.getpixel((x,y)) for x in range(im.width) for y in (0,im.height-1)] + [alpha.getpixel((x,y)) for y in range(im.height) for x in (0,im.width-1)]
            self.assertEqual(sum(value >= 16 for value in edges), 0)
            self.assertTrue(entry['fullBodyReviewed']); self.assertFalse(entry['canonicalFidelityCertified'])

    def test_source_and_output_observations_bind_the_exact_actual_references(self):
        for entry in NEW:
            observation = json.loads(BUILDER.checked(entry['sourceCompletenessEvidence']))
            self.assertTrue(observation['sourceCompleteVisibleBodyObserved']); self.assertTrue(observation['generatedCompleteVisibleBodyObserved'])
            self.assertEqual(observation['imageSha256'], entry['sha256']); self.assertEqual(observation['referenceImages'], entry['provenance']['references'])
            BUILDER.checked(observation['comparisonContact'])
            for reference in observation['referenceImages']:BUILDER.checked(reference)
            self.assertFalse(observation['originalGamePoseCertified']); self.assertFalse(observation['oppositeViewReviewed'])

    def test_frontal_presentations_cannot_become_side_idle_animations(self):
        for entry in NEW[:2]:
            self.assertEqual(entry['sourceFacing'], 'front'); self.assertEqual(entry['poseKind'], 'source-presentation')
            self.assertEqual(entry['availableStates'], []); self.assertFalse(entry['animated']); self.assertEqual(entry['animationFrames'], 1)
        self.assertEqual(MANIFEST['counts']['newNativeIdleAnimations'], 0)

    def test_same_edition_variant_keeps_the_default_costume_and_admission_separate(self):
        variant = MANIFEST['sameEditionVariants'][0]; old = BASE_BY_ID['re1r-zombie']
        current = next(entry for entry in MANIFEST['sprites'] if entry['id'] == 're1r-zombie')
        self.assertEqual(current, old); self.assertFalse(current['fullBodyReviewed'])
        self.assertEqual(variant['comparesAgainstSha256'], old['sha256']); self.assertFalse(variant['defaultAdmission'])
        self.assertEqual(variant['targetIncarnation'], old['incarnation']); self.assertFalse(variant['targetFullBodyReviewed'])
        self.assertTrue(variant['sameEditionVariant']); self.assertTrue(variant['admittedTargetEdition'])
        self.assertEqual(variant['sourceFacing'], 'right'); self.assertEqual(variant['availableStates'], ['idle'])
        self.assertFalse(variant['animated']); self.assertEqual(variant['animationFrames'], 1)

    def test_source_authenticity_distinguishes_secondary_renders_from_native_geometry(self):
        for entry in NEW[:2]:self.assertIn('secondary-publisher', entry['provenance']['sourceAuthenticity'])
        self.assertIn('native-static-OBJ', NEW[2]['provenance']['sourceAuthenticity'])
        for entry in NEW:self.assertEqual(entry['provenance']['generator'], 'image_gen'); self.assertFalse(entry['originalGameSprite'])

    def test_original_native_archive_members_are_preserved_byte_exact(self):
        acquisition = json.loads((PACK / 'sources/new-native-acquisition.json').read_text())
        archive = BUILDER.checked(acquisition['archive']); self.assertEqual(acquisition['page']['status'], 200)
        BUILDER.checked(acquisition['page'])
        with ZipFile(io.BytesIO(archive)) as zipped:
            files = [item for item in zipped.infolist() if not item.is_dir()]
            self.assertEqual(len(files), 6)
            for member in files:
                self.assertNotIn('..', Path(member.filename).parts)
                self.assertEqual((PACK / 'sources/models/asset-287624' / member.filename).read_bytes(), zipped.read(member))

    def test_four_native_views_keep_geometry_pose_and_material_bytes_unchanged(self):
        source = json.loads((PACK / 'sources/renders.json').read_text()); BUILDER.checked(source['renderer'])
        self.assertEqual(len(source['entries']), 1); entry = source['entries'][0]
        self.assertEqual(entry['id'], 're1r-zombie'); self.assertEqual(len(entry['views']), 4)
        self.assertFalse(entry['recipe']['modelTransformsChanged']); self.assertFalse(entry['recipe']['poseChanged'])
        self.assertFalse(entry['recipe']['sourceMaterialsBytesRewritten']); self.assertFalse(entry['recipe']['geometryMirrored'])
        for view in entry['views']:
            raw = BUILDER.checked(view); image = Image.open(io.BytesIO(raw)); self.assertEqual(image.size, (768,768)); self.assertEqual(view['edgePixels'],0)

    def test_rebuild_is_reproducible_and_stale_proofs_are_rejected(self):
        BUILDER.build(check=True)
        proof = copy.deepcopy(NEW[0]['sourceCompletenessEvidence']); proof['sha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'Changed evidence'):BUILDER.checked(proof)
        self.assertEqual(MANIFEST['counts']['fullBodyReviewedSprites'], 114)
        self.assertEqual(MANIFEST['counts']['neutralBaseCombatEligibleSprites'], BASE['counts']['neutralBaseCombatEligibleSprites'])


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(GeneratedSpritesR31)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    names = ['tests/test_generated_sprites_r31.py','scripts/build-sprites-r31.py', 'scripts/render-sprite-sources-r31.mjs',
        'modules/fidelity-r31/sprites/manifest.json','modules/fidelity-r31/sprites/sources/catalog.json',
        'modules/fidelity-r31/sprites/sources/renders.json','modules/fidelity-r31/sprites/sources/new-native-acquisition.json']
    names += ['modules/fidelity-r31/sprites/review/' + uid + '.json' for uid in BUILDER.TARGETS]
    report = {'schema':'re.bow.generated-source-body-tests-r31/1','passed':result.testsRun-len(result.failures)-len(result.errors),
        'failed':len(result.failures)+len(result.errors),'sourceFiles':[{'path':name,'sha256':sha((ROOT/name).read_bytes())} for name in names],
        'scope':'Actual3image_gen outputs, unchanged source archive members, complete visible source/output observations, separate static variant and preserved target refusals. No native-animation or global1:1 certification.'}
    (ROOT/'docs/R31_SPRITES_TESTS.json').write_text(json.dumps(report,indent=2)+'\n')
    raise SystemExit(0 if result.wasSuccessful() else 1)
