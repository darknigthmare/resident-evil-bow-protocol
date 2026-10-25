"""Native source packing tests; fixture pixels are not character artwork."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('native_motion', ROOT / 'scripts/extract-source-motion-r22.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class SourceMotionExtractionTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.source = self.root / 'source.gif'
        self.output = self.root / 'pack'
        images = []
        for index, color in enumerate([(240, 30, 20, 255), (20, 220, 30, 255),
                                        (30, 40, 230, 255), (230, 220, 20, 255)]):
            frame = Image.new('RGBA', (9, 12), (0, 0, 0, 0))
            for x in range(2 + index, 7):
                for y in range(2, 10 - index):
                    frame.putpixel((x, y), color)
            images.append(frame)
        images[0].save(self.source, format='GIF', save_all=True, append_images=images[1:],
                       duration=[20, 40, 60, 80], loop=0, disposal=[1, 2, 1, 2], optimize=False)

    def run_extract(self, **kwargs):
        options = {'columns': 2, 'max_frames_per_atlas': 2}
        options.update(kwargs)
        return MODULE.extract_motion(self.source, self.output,
            'https://static.wikia.nocookie.net/residentevil/images/example.gif',
            MODULE.sha(self.source.read_bytes()), sequence_id='native-test',
            subject_id='test-subject', game='Synthetic transport fixture', label='No character art',
            **options)

    def test_composited_disposal_frames_roundtrip_and_cross_atlas_boundaries(self):
        manifest = self.run_extract()
        self.assertEqual(manifest['frameCount'], 4)
        self.assertEqual(manifest['totalDurationMs'], 200)
        self.assertEqual(len(manifest['atlases']), 2)
        self.assertEqual([f['atlas'] for f in manifest['frames']], [0, 0, 1, 1])
        with Image.open(self.source) as native:
            for index, frame in enumerate(ImageSequence.Iterator(native)):
                expected = frame.convert('RGBA')
                record = manifest['frames'][index]
                atlas = manifest['atlases'][record['atlas']]
                with Image.open(self.output / atlas['path']) as packed:
                    x, y, w, h = record['crop']
                    actual = packed.crop((x, y, x + w, y + h))
                    self.assertEqual(actual.size, expected.size)
                    self.assertEqual(actual.tobytes(), expected.tobytes())
                    self.assertEqual(record['rgbaSha256'], MODULE.sha(expected.tobytes()))
                self.assertEqual(record['durationMs'], frame.info['duration'])
                self.assertEqual(record['sourceFrame'], index)
        self.assertEqual((self.output / 'original.gif').read_bytes(), self.source.read_bytes())
        self.assertEqual(self.run_extract(), manifest)
        for atlas in manifest['atlases']:
            self.assertLessEqual(atlas['frameCount'], 32)
            self.assertLessEqual(max(atlas['width'], atlas['height']), 4096)
            self.assertLessEqual(atlas['width'] * atlas['height'], 8_000_000)
            self.assertEqual(MODULE.sha((self.output / atlas['path']).read_bytes()), atlas['sha256'])

    def test_explicit_zero_frame_delay_is_retained_without_clamping(self):
        encoded = bytearray(self.source.read_bytes())
        marker = encoded.index(b'\x21\xf9\x04')
        encoded[marker + 4:marker + 6] = b'\x00\x00'
        self.source.write_bytes(encoded)
        with Image.open(self.source) as original:
            self.assertEqual(original.info['duration'], 0)
        manifest = self.run_extract()
        self.assertEqual([f['durationMs'] for f in manifest['frames']], [0, 40, 60, 80])
        self.assertEqual(manifest['totalDurationMs'], 180)

    def test_corrupt_source_hash_and_static_image_are_rejected_without_output(self):
        with self.assertRaisesRegex(ValueError, 'SHA-256'):
            MODULE.extract_motion(self.source, self.output, 'https://example.com/source.gif', '0' * 64)
        self.assertFalse(self.output.exists())
        Image.new('RGBA', (5, 5), (1, 2, 3, 255)).save(self.source, format='PNG')
        with self.assertRaisesRegex(ValueError, 'animated'):
            self.run_extract()
        self.assertFalse(self.output.exists())

    def test_an_existing_different_asset_is_never_overwritten(self):
        self.output.mkdir()
        (self.output / 'atlas-01.png').write_bytes(b'user-owned-output')
        with self.assertRaisesRegex(ValueError, 'overwrite'):
            self.run_extract()
        self.assertEqual((self.output / 'atlas-01.png').read_bytes(), b'user-owned-output')
        self.assertFalse((self.output / 'atlas-00.png').exists())
        self.assertFalse((self.output / 'manifest.json').exists())

    def test_single_frame_batches_keep_exact_order_dimensions_and_durations(self):
        manifest = self.run_extract(columns=1, max_frames_per_atlas=1)
        self.assertEqual(len(manifest['atlases']), 4)
        self.assertEqual([frame['atlas'] for frame in manifest['frames']], list(range(4)))
        self.assertTrue(all(frame['crop'] == [0, 0, 9, 12] for frame in manifest['frames']))
        self.assertEqual([frame['durationMs'] for frame in manifest['frames']], [20, 40, 60, 80])

    def test_source_sequence_does_not_claim_authored_combat_geometry_or_audio(self):
        manifest = self.run_extract()
        self.assertEqual(manifest['availableStates'], ['source-sequence'])
        self.assertEqual(manifest['generatedFrames'], 0)
        for flag in ['canonicalFidelityCertified', 'nativeGameGeometryCertified', 'combatIntegrated', 'modularRig']:
            self.assertFalse(manifest[flag])
        self.assertTrue(manifest['silent'])
        self.assertEqual(manifest['source']['loopCount'], 0)
        with self.assertRaises(ValueError):
            self.run_extract(max_frames_per_atlas=33)


if __name__ == '__main__':
    unittest.main()
