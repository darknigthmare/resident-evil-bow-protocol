"""Verify untimed documentary source transport; fixtures are not character artwork."""
import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('manual_motion_r23', ROOT / 'scripts/extract-manual-motion-r23.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ManualMotionTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.source, self.output = self.root / 'source.gif', self.root / 'output'
        images = [Image.new('RGB', (7, 9), color) for color in ['red', 'green', 'blue']]
        images[0].save(self.source, save_all=True, append_images=images[1:], duration=0, loop=0)

    def extract(self, **changes):
        options = dict(sequence_id='test-source', subject_id='test-subject', game='Synthetic transport fixture',
                       label='No character artwork', source_page_url='https://example.com/source', max_frames_per_atlas=2)
        options.update(changes)
        return MODULE.extract_manual(self.source, self.output, 'https://example.com/source.gif',
                                     hashlib.sha256(self.source.read_bytes()).hexdigest(), **options)

    def test_zero_delays_and_native_pixels_remain_unchanged(self):
        manifest = self.extract()
        self.assertFalse(manifest['timingDefined'])
        self.assertEqual(manifest['playbackMode'], 'manual-only')
        self.assertEqual(manifest['totalDurationMs'], 0)
        self.assertEqual(manifest['generatedFrames'], 0)
        self.assertEqual(manifest['frameCount'], 3)
        self.assertEqual(len(manifest['atlases']), 2)
        self.assertEqual((self.output / 'original.gif').read_bytes(), self.source.read_bytes())
        with Image.open(self.source) as native:
            for index, frame in enumerate(manifest['frames']):
                native.seek(index)
                self.assertEqual(frame['durationMs'], 0)
                atlas = manifest['atlases'][frame['atlas']]
                with Image.open(self.output / atlas['path']) as packed:
                    x, y, w, h = frame['crop']
                    self.assertEqual(packed.crop((x, y, x + w, y + h)).tobytes(), native.convert('RGBA').tobytes())
        self.assertEqual(manifest, self.extract())

    def test_defined_cadence_is_rejected_without_clamping(self):
        images = [Image.new('RGB', (7, 9), c) for c in ['red', 'green']]
        images[0].save(self.source, save_all=True, append_images=images[1:], duration=[0, 40])
        with self.assertRaisesRegex(ValueError, 'no defined frame delays'):
            self.extract()
        self.assertFalse(self.output.exists())

    def test_static_wrong_hash_and_unsafe_paths_are_rejected(self):
        with self.assertRaisesRegex(ValueError, 'SHA-256'):
            MODULE.extract_manual(self.source, self.output, 'https://example.com/a.gif', '0' * 64,
                                  sequence_id='source', subject_id='subject', game='Fixture', label='Fixture',
                                  source_page_url='https://example.com/source')
        with self.assertRaisesRegex(ValueError, 'HTTPS'):
            self.extract(source_page_url='http://example.com/source')
        with self.assertRaisesRegex(ValueError, 'Invalid'):
            self.extract(subject_id='../other')
        Image.new('RGB', (7, 9)).save(self.source)
        with self.assertRaisesRegex(ValueError, 'multi-frame'):
            self.extract()
        self.assertFalse(self.output.exists())

    def test_different_output_and_symlink_are_refused(self):
        self.extract()
        target = self.output / 'atlas-00.png'
        target.write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError, 'replace different'):
            self.extract()
        self.assertEqual(target.read_bytes(), b'changed')
        self.source.unlink()
        self.source.symlink_to(target)
        with self.assertRaisesRegex(ValueError, 'regular source'):
            self.extract()

    def test_delivered_malacoda_all_218_frames_and_delays_match_source(self):
        import json
        folder = ROOT / 'modules/fidelity-r23/motion/malacoda'
        manifest = json.loads((folder / 'manifest.json').read_text())
        self.assertEqual(manifest['frameCount'], 218)
        self.assertEqual(manifest['totalDurationMs'], 0)
        self.assertFalse(manifest['timingDefined'])
        with Image.open(folder / manifest['source']['path']) as source:
            self.assertEqual(hashlib.sha256((folder / 'original.gif').read_bytes()).hexdigest(), manifest['source']['sha256'])
            for atlas_index, record in enumerate(manifest['atlases']):
                path = folder / record['path']
                self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), record['sha256'])
                self.assertLessEqual(record['width'] * record['height'], 2_800_000)
                with Image.open(path) as atlas:
                    for frame in [f for f in manifest['frames'] if f['atlas'] == atlas_index]:
                        source.seek(frame['sourceFrame'])
                        self.assertEqual(source.info.get('duration', 0), 0)
                        x, y, w, h = frame['crop']
                        actual, expected = atlas.crop((x, y, x + w, y + h)).tobytes(), source.convert('RGBA').tobytes()
                        self.assertEqual(actual, expected)
                        self.assertEqual(hashlib.sha256(actual).hexdigest(), frame['rgbaSha256'])


if __name__ == '__main__':
    unittest.main()
