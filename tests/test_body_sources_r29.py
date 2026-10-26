import copy
import hashlib
import importlib.util
import json
import shutil
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r29'
PRIMARY = ('re0-zombie', 're0-mimicry-marcus')


def read(path):
    return json.loads(path.read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def module(name, relative):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


class SourceBodiesR29(unittest.TestCase):
    def test_native_catalogs_and_camera_recipe_bind_exact_source_bytes(self):
        manifest = read(PACK / 'sources/body-rasters/manifest.json')
        self.assertEqual(manifest['counts']['identities'], 3)
        self.assertEqual(manifest['counts']['sourceBodyModels'], 3)
        self.assertEqual(manifest['counts']['renderedReferenceImages'], 12)
        self.assertEqual(sha(ROOT / manifest['request']['path']), manifest['request']['sha256'])
        self.assertEqual(sha(ROOT / manifest['renderRecipe']['path']), manifest['renderRecipe']['sha256'])
        roster = {row['id']:row for row in read(ROOT / 'data/roster.json')['catalog']}
        for entry in manifest['entries']:
            catalog_path = ROOT / entry['sourceCatalog']['path']
            self.assertEqual(sha(catalog_path), entry['sourceCatalog']['sha256'])
            original = next(row for row in read(catalog_path)['entries'] if row['id'] == entry['modelId'])
            self.assertEqual(original['game'], roster[entry['id']]['game'])
            self.assertNotIn('candidateUid', original)
            source_base = (catalog_path.parent / entry['sourceBase']).resolve()
            for asset in [entry['model'], *entry['textures'], *([entry['materials']] if entry.get('materials') else [])]:
                path = source_base / asset['path']
                self.assertEqual(path.stat().st_size, asset['bytes'])
                self.assertEqual(sha(path), asset['sha256'])
            recipe = entry['recipe']
            self.assertTrue(recipe['cameraOrbitOnly'])
            self.assertFalse(recipe['geometryMirrored'])
            self.assertFalse(recipe['modelTransformsChanged'])
            self.assertFalse(recipe['poseChanged'])
            self.assertEqual(recipe['renderMaterialMode'], 'unlit-source-albedo')
            self.assertFalse(recipe['sourceMaterialsBytesRewritten'])
            self.assertFalse(recipe['originalGameMaterialCertified'])

    def test_twelve_reference_pngs_are_transparent_unclipped_real_views(self):
        manifest = read(PACK / 'sources/body-rasters/manifest.json')
        hashes = set()
        for entry in manifest['entries']:
            self.assertEqual([view['angle'] for view in entry['views']], [0, 90, 180, 270])
            for view in entry['views']:
                path = PACK / 'sources/body-rasters' / view['path']
                self.assertEqual(sha(path), view['sha256'])
                self.assertEqual(path.stat().st_size, view['bytes'])
                hashes.add(view['sha256'])
                with Image.open(path) as image:
                    self.assertEqual(image.size, (768, 768))
                    rgba = image.convert('RGBA')
                    self.assertEqual(hashlib.sha256(rgba.tobytes()).hexdigest(), view['rgbaSha256'])
                    alpha = rgba.getchannel('A')
                    self.assertEqual(alpha.getextrema(), (0, 255))
                    self.assertEqual(view['edgePixels'], 0)
                    x0, y0, x1, y1 = alpha.getbbox()
                    self.assertGreater(x0, 0)
                    self.assertGreater(y0, 0)
                    self.assertLess(x1, image.width)
                    self.assertLess(y1, image.height)
        self.assertEqual(len(hashes), 12)

    def test_new_leech_archive_and_virtual_texture_aliases_preserve_publisher_bytes(self):
        catalog_path = PACK / 'sources/native-models/catalog.json'
        catalog = read(catalog_path)
        self.assertFalse(catalog['sourceFilesRewritten'])
        self.assertEqual(len(catalog['entries']), 1)
        entry = catalog['entries'][0]
        archive_path = catalog_path.parent / entry['archive']['path']
        self.assertEqual(sha(archive_path), entry['archive']['sha256'])
        with zipfile.ZipFile(archive_path) as archive:
            for record in [entry['model'], entry['materials'], *entry['textures']]:
                self.assertEqual((catalog_path.parent / record['path']).read_bytes(), archive.read(record['member']))
            for alias in entry['nativeTextureReferenceAliases']:
                self.assertEqual(hashlib.sha256(archive.read(alias['sourceMember'])).hexdigest(), alias['sha256'])
                literal_name = alias['literalMtlReference'].replace('\\', '/').split('/')[-1]
                self.assertEqual(Path(alias['sourceMember']).name, literal_name)
        self.assertIn('leech-body variant', entry['sourceSubjectEvidence'])
        self.assertFalse(entry['canonicalFidelityCertified'])

    def test_six_fresh_online_captures_have_exact_retained_bytes(self):
        evidence = read(PACK / 'sources/body-rasters/online-evidence.json')
        self.assertEqual(len(evidence['entries']), 6)
        self.assertEqual(len({entry['path'] for entry in evidence['entries']}), 6)
        for entry in evidence['entries']:
            path = ROOT / entry['path']
            self.assertEqual(entry['status'], 200)
            self.assertEqual(path.stat().st_size, entry['bytes'])
            self.assertEqual(sha(path), entry['sha256'])
            self.assertIn(b'<!DOCTYPE', path.read_bytes().upper())

    def test_two_real_outputs_have_whole_body_source_bound_manual_reviews(self):
        importer = module('r29_import_measure', 'scripts/import-body-sprites-r29.py')
        baseline = {row['id']:row for row in read(ROOT / 'modules/fidelity-r28/sprites/manifest.json')['sprites']}
        for uid in PRIMARY:
            record = read(PACK / 'sprites/records' / (uid + '.json'))
            self.assertEqual(record['supersedesSha256'], baseline[uid]['sha256'])
            self.assertEqual(record['incarnation'], baseline[uid]['incarnation'])
            self.assertEqual(record['scope'], baseline[uid]['scope'])
            for key, value in importer.MEASURE.measure((ROOT / record['image']).read_bytes()).items():
                self.assertEqual(record[key], value)
            self.assertEqual(record['provenance']['toolArtifactSha256'], record['sha256'])
            self.assertEqual(sha(ROOT / record['image']), record['sha256'])
            self.assertEqual(record['poseKind'], 'source-bind-pose')
            self.assertEqual(record['sourceFacing'], 'front')
            self.assertEqual(record['availableStates'], [])
            self.assertTrue(record['admittedTargetEdition'])
            proof = read(ROOT / record['sourceCompletenessEvidence']['path'])
            self.assertEqual(sha(ROOT / record['sourceCompletenessEvidence']['path']), record['sourceCompletenessEvidence']['sha256'])
            self.assertEqual(proof['imageSha256'], record['sha256'])
            self.assertEqual(len(proof['references']), 4)
            self.assertEqual(proof['references'], record['provenance']['references'])
            for reference in proof['references']:
                self.assertEqual(sha(ROOT / reference['path']), reference['sha256'])
            self.assertEqual(sha(ROOT / proof['visualEvidence']['path']), proof['visualEvidence']['sha256'])
            self.assertTrue(proof['sourceCompleteBodyObserved'])
            self.assertTrue(proof['generatedCompleteBodyObserved'])
            self.assertFalse(proof['originalGamePoseCertified'])
            with Image.open(ROOT / proof['visualEvidence']['path']) as contact:
                self.assertEqual(contact.width, 1280)
                self.assertGreaterEqual(contact.height, 1000)
        zombie = read(PACK / 'sprites/records/re0-zombie.json')
        self.assertIn('manteau brun', zombie['sourceVariantLabel'])
        self.assertIn('blond short-sleeved', ' '.join(zombie['knownAppearanceGaps']))

    def test_actual_tyrant_revision_refusal_does_not_remove_existing_target(self):
        failure = read(PACK / 'sprites/revision-failures/re1r-tyrant.json')
        self.assertTrue(failure['revisionOnly'])
        self.assertTrue(failure['existingActiveSpritePreserved'])
        self.assertFalse(failure['retryPerformed'])
        message = failure['actualToolError']['message']
        self.assertIn('moderation_blocked', message)
        self.assertIn('output', message)
        self.assertIn('violence', message)
        self.assertIn('2c18d790-d180-4b85-88a2-6a0ff1823695', message)
        self.assertFalse((PACK / 'sprites/records/re1r-tyrant.json').exists())
        self.assertEqual(sha(ROOT / failure['preservedActiveSprite']['image']), failure['preservedActiveSprite']['sha256'])
        baseline = read(ROOT / 'modules/fidelity-r28/sprites/manifest.json')
        self.assertEqual(len(baseline['pending']), 22)
        self.assertNotIn('re1r-tyrant', {entry['id'] for entry in baseline['pending']})
        for reference in failure['references']:
            self.assertEqual(sha(ROOT / reference['path']), reference['sha256'])

    def test_importer_rejects_blocked_uid_wrong_capture_and_unreviewed_output(self):
        importer = module('r29_body_import_negative', 'scripts/import-body-sprites-r29.py')
        baseline = read(ROOT / 'modules/fidelity-r28/sprites/manifest.json')
        request = read(PACK / 'sources/generation-requests/re0-zombie.json')
        record_path = PACK / 'sprites/records/re0-zombie.json'
        proof_path = ROOT / 'docs/R29_BODY_VISUAL_EVIDENCE/re0-zombie.json'
        before = (sha(record_path), sha(proof_path))
        with tempfile.TemporaryDirectory(prefix='qa-body-pipeline-r29-', dir=ROOT) as temp:
            temp = Path(temp)
            receipt = temp / 'request.json'
            receipt.write_text(json.dumps({'uid':baseline['pending'][0]['id']}))
            with self.assertRaisesRegex(ValueError, 'preserved tool refusals'):
                importer.import_receipt(receipt.relative_to(ROOT).as_posix())
            wrong = copy.deepcopy(request)
            wrong['referenced_image_paths'][0] = '/tmp/not-in-the-captured-repository.png'
            receipt.write_text(json.dumps(wrong))
            with self.assertRaisesRegex(ValueError, 'captured repository root'):
                importer.import_receipt(receipt.relative_to(ROOT).as_posix())
            fixture = temp / 'exec-byte-exact-input-fixture.png'
            shutil.copyfile(ROOT / read(record_path)['image'], fixture)
            unreviewed = copy.deepcopy(request)
            unreviewed.update(tool_output=str(fixture), reviewed=False)
            receipt.write_text(json.dumps(unreviewed))
            with patch.object(importer, 'PACK', temp / 'unadmitted-output'):
                with self.assertRaisesRegex(ValueError, 'human observation'):
                    importer.import_receipt(receipt.relative_to(ROOT).as_posix())
        self.assertEqual((sha(record_path), sha(proof_path)), before)

    def test_documentary_routing_and_known_gaps_cannot_admit_target_idle(self):
        importer = module('r29_body_import_routing', 'scripts/import-body-sprites-r29.py')
        request = read(PACK / 'sources/generation-requests/re0-zombie.json')
        with tempfile.TemporaryDirectory(prefix='qa-body-pipeline-r29-', dir=ROOT) as temp:
            temp = Path(temp)
            fixture = temp / 'exec-byte-exact-routing-fixture.png'
            shutil.copyfile(PACK / 'sprites/generated/re0-zombie/full-body.png', fixture)
            request.update(tool_output=str(fixture), targetEditionAdmitted=False,
                           sourceEdition='Different-edition metadata routing fixture', documentaryVariantKey='fixture-edition')
            receipt = temp / 'request.json'
            receipt.write_text(json.dumps(request))
            writes = []
            with patch.object(importer, 'PACK', temp / 'routing-output'), patch.object(importer, 'write', side_effect=lambda path, data:writes.append((path, copy.deepcopy(data)))):
                variant = importer.import_receipt(receipt.relative_to(ROOT).as_posix())
                self.assertEqual(variant['availableStates'], [])
                self.assertFalse(variant['admittedTargetEdition'])
                self.assertFalse(variant['targetFullBodyReviewed'])
                self.assertEqual(variant['scope'], 'documentary-edition-variant')
                self.assertNotIn('supersedesSha256', variant)
                self.assertTrue(str(writes[-1][0]).endswith('/sprites/documentary-variants/records/re0-zombie.json'))
            request.update(targetEditionAdmitted=True, observedFacing='right', observedPoseKind='neutral-base', neutralPoseReviewed=True,
                           knownAppearanceGaps=['Explicit uncompleted garment fixture; no target idle may be admitted.'])
            receipt.write_text(json.dumps(request))
            with patch.object(importer, 'PACK', temp / 'gap-output'), patch.object(importer, 'write'):
                record = importer.import_receipt(receipt.relative_to(ROOT).as_posix())
                self.assertTrue(record['fullBodyReviewed'])
                self.assertEqual(record['poseKind'], 'neutral-base')
                self.assertEqual(record['availableStates'], [])


if __name__ == '__main__':
    unittest.main()
