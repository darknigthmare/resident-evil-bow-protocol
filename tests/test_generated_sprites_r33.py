#!/usr/bin/env python3
"""Check actual image_gen bytes, documentary edition holds and the complete visible silhouettes."""
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r33/sprites'
SPEC = importlib.util.spec_from_file_location('sprites_r33', ROOT / 'scripts/build-sprites-r33.py')
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)
MANIFEST = json.loads((PACK / 'manifest.json').read_text())


class SpritesR33(unittest.TestCase):
    def test_actual_tool_output_digests_are_preserved(self):
        digests = json.loads((PACK / 'output-digests.json').read_text())
        self.assertEqual(len(MANIFEST['variants']), 8)
        for entry in MANIFEST['variants']:
            raw = (ROOT / entry['image']).read_bytes()
            self.assertEqual(hashlib.sha256(raw).hexdigest(), entry['sha256'])
            self.assertEqual(digests[entry['id']][entry['sourceFacing']], {'bytes': len(raw), 'sha256': entry['sha256']})
            receipt = json.loads(BUILDER.checked(entry['provenance']['generationRecord']))
            tool_output = Path(receipt['outputSource'])
            if tool_output.is_file():
                self.assertEqual(raw, tool_output.read_bytes())

    def test_each_side_has_a_separate_real_generation_receipt(self):
        receipts = [json.loads(BUILDER.checked(entry['provenance']['generationRecord'])) for entry in MANIFEST['variants']]
        self.assertEqual(len({item['outputSource'] for item in receipts}), 8)
        self.assertEqual(len({entry['sha256'] for entry in MANIFEST['variants']}), 8)
        for item in receipts:
            self.assertEqual(item['tool'], 'image_gen')
            self.assertTrue(item['transparent_background'])
            self.assertEqual(len(item['references']), 4)
            self.assertIn('FACING ' + item['facing'].upper(), item['prompt'])

    def test_rgba_and_visible_silhouettes_have_clearance(self):
        for entry in MANIFEST['variants']:
            measured = BUILDER.measure(entry['image'])
            self.assertEqual(measured['bounds'], entry['bounds'])
            self.assertEqual(measured['decodedRgbaSha256'], entry['decodedRgbaSha256'])
            self.assertEqual(measured['alpha']['min'], 0)
            self.assertGreater(measured['alpha']['max'], 200)
            self.assertEqual(measured['visibleEdgePixelsAtAlpha16'], 0)
            self.assertTrue(all(measured['visiblePadding'][side] > 0 for side in ('left', 'right', 'top', 'bottom')))

    def test_two_physical_sides_are_bound_to_each_family(self):
        self.assertEqual(len(MANIFEST['families']), 4)
        for family in MANIFEST['families']:
            pair = [entry for entry in MANIFEST['variants'] if entry['variantFamilyId'] == family['id']]
            self.assertEqual({entry['sourceFacing'] for entry in pair}, {'left', 'right'})
            self.assertEqual({entry['sourceVariantLabel'] for entry in pair}, {family['label']})
            self.assertTrue(all(entry['canMirror'] is False for entry in pair))

    def test_contextual_alligator_is_not_admitted_as_a_fighter(self):
        entries = [entry for entry in MANIFEST['variants'] if entry['id'] == 're2-giant-alligator']
        self.assertEqual(len(entries), 2)
        for entry in entries:
            self.assertEqual(entry['scope'], 'context-encounter')
            self.assertEqual(entry['availableStates'], [])
            self.assertFalse(entry['defaultAdmission'])

    def test_gamecube_never_silently_replaces_playstation(self):
        for entry in MANIFEST['variants']:
            self.assertIn('GameCube', entry['sourceEdition'])
            for field in ('defaultAdmission', 'admittedTargetEdition', 'targetEditionAdmitted', 'targetEditionMatched', 'sameEditionVariant'):
                self.assertIs(entry[field], False)
        self.assertEqual(MANIFEST['counts']['newDefaultSpriteReplacements'], 0)

    def test_only_the_two_reviewed_static_pose_families_expose_idle(self):
        eligible = {entry['id'] for entry in MANIFEST['variants'] if entry['availableStates']}
        self.assertEqual(eligible, {'re2-zombie-dog', 're3-zombie'})
        for entry in MANIFEST['variants']:
            self.assertEqual(entry['animationFrames'], 1)
            self.assertFalse(entry['animated'])
            self.assertFalse(entry['originalIdleAnimationCertified'])
            self.assertFalse(entry['canonicalFidelityCertified'])
        self.assertEqual(MANIFEST['counts']['newOriginalIdleAnimations'], 0)

    def test_every_source_file_is_bound_by_size_and_sha(self):
        for binding in MANIFEST['sourceFiles']:
            raw = BUILDER.checked(binding)
            self.assertEqual(len(raw), binding['bytes'])
        self.assertEqual(len({binding['path'] for family in MANIFEST['families'] for binding in family['sourceFiles']}), 16)

    def test_historical_refusals_are_retained_and_never_targeted(self):
        baseline = json.loads(BUILDER.checked(MANIFEST['baseline']))
        blocked = {entry['id'] for entry in baseline['pending']} | {'re1r-tyrant'}
        self.assertEqual(len(blocked), 23)
        self.assertFalse(blocked & {entry['id'] for entry in MANIFEST['variants']})
        self.assertEqual(MANIFEST['counts']['preservedInitialTargetRefusals'], 22)
        self.assertEqual(MANIFEST['counts']['preservedFailedRevisions'], 1)

    def test_low_alpha_fringe_does_not_change_the_visible_anchor(self):
        for entry in MANIFEST['variants']:
            bounds, pivot = entry['bounds'], entry['pivot']
            self.assertEqual(pivot['x'], bounds['x'] + bounds['width'] / 2)
            self.assertEqual(pivot['y'], bounds['y'] + bounds['height'])
        moth = next(entry for entry in MANIFEST['variants'] if entry['id'] == 're2-giant-moth' and entry['sourceFacing'] == 'right')
        self.assertEqual(moth['lowAlphaBounds'][0], 0)
        self.assertGreater(moth['bounds']['x'], 0)

    def test_generated_pairs_are_not_exact_raster_mirrors(self):
        for family in MANIFEST['families']:
            pair = {entry['sourceFacing']: entry for entry in MANIFEST['variants'] if entry['variantFamilyId'] == family['id']}
            right = Image.open(ROOT / pair['right']['image'])
            left = Image.open(ROOT / pair['left']['image'])
            self.assertEqual(right.size, left.size)
            raw, row_bytes = right.tobytes(), right.width * 4
            mirrored_rows = []
            for y in range(right.height):
                row = raw[y * row_bytes:(y + 1) * row_bytes]
                mirrored_rows.append(b''.join(row[x:x + 4] for x in range(row_bytes - 4, -1, -4)))
            self.assertNotEqual(hashlib.sha256(b''.join(mirrored_rows)).hexdigest(), pair['left']['decodedRgbaSha256'])

    def test_deterministic_builder_checks_without_rewriting(self):
        path = PACK / 'manifest.json'
        before = path.read_bytes()
        self.assertEqual(BUILDER.build(check=True), MANIFEST)
        self.assertEqual(path.read_bytes(), before)


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(SpritesR33)
    test_names = [case.id() for case in suite]
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    failures = {case.id(): error for case, error in result.failures + result.errors}
    names = [__file__, str(ROOT / 'scripts/build-sprites-r33.py'), str(PACK / 'manifest.json'), str(PACK / 'output-digests.json')]
    report = {'schema': 're.bow.generated-sprites-tests-r33/1', 'passed': result.testsRun - len(result.failures) - len(result.errors),
              'failed': len(result.failures) + len(result.errors),
              'checks': [{'name': name, 'pass': name not in failures, **({'error': failures[name]} if name in failures else {})} for name in test_names],
              'sourceFiles': [BUILDER.ref(Path(name).relative_to(ROOT).as_posix()) for name in names],
              'scope': 'Actual untouched PNG output digests, 16 native references, separately generated sides, source-edition holds, contextual encounter preserved and no original idle claim. Raster mirror comparison is analysis only; no pixels are written.'}
    (ROOT / 'docs/R33_SPRITES_TESTS.json').write_text(json.dumps(report, indent=2) + '\n')
    raise SystemExit(not result.wasSuccessful())
