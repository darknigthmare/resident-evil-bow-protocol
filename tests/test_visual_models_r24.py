"""Published model preservation, local paths and Collada structural evidence."""
import copy
import importlib.util
import io
import json
from pathlib import Path
import stat
import tempfile
import unittest
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / 'modules/fidelity-r24/visual'
spec = importlib.util.spec_from_file_location('visual_models', ROOT / 'scripts/import-visual-models-r24.py')
tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool)


class VisualModelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.request = json.loads((ROOT / 'docs/R24_VISUAL_IMPORT_REQUEST.json').read_text())
        cls.manifest = json.loads((MODULE / 'manifest.json').read_text())
        cls.roster = {x['id']: x for x in json.loads((ROOT / 'data/roster.json').read_text())['catalog']}
        cls.temporary = tempfile.TemporaryDirectory()
        cls.cache = Path(cls.temporary.name)
        sources = {x['assetId']: x for x in cls.manifest['sources']}
        for source in cls.request['sources']:
            for kind in ['page', 'archive', 'preview']:
                (cls.cache / source[kind]['cachePath']).write_bytes((MODULE / sources[source['assetId']][kind]['path']).read_bytes())

    @classmethod
    def tearDownClass(cls):
        cls.temporary.cleanup()

    def test_reproducible_import_preserves_every_published_file(self):
        output = tool.prepare(self.request, self.cache, self.roster)
        for path, data in output.items():
            self.assertEqual((MODULE / path).read_bytes(), data, path)
        self.assertEqual(len(self.manifest['entries']), 36)
        self.assertEqual(len(self.manifest['sources']), 21)
        self.assertLess(sum(len(data) for data in output.values()), 35_000_000)

    def test_models_materials_textures_and_rig_equal_archive_bytes(self):
        for item in self.manifest['entries']:
            with zipfile.ZipFile(MODULE / item['archivePath']) as archive:
                resources = [item['model'], item['materials'], *item['textures']]
                if item.get('publishedRig'):
                    resources.extend([item['publishedRig']['model'], *item['publishedRig']['textures']])
                for resource in resources:
                    prefix = 'models/asset-' + str(item['assetId']) + '/'
                    member = resource['path'].removeprefix(prefix)
                    data = (MODULE / resource['path']).read_bytes()
                    self.assertEqual(data, archive.read(member))
                    self.assertEqual(tool.digest(data), resource['sha256'])
                    self.assertEqual(len(data), resource['bytes'])

    def test_source_receipt_tampering_is_rejected(self):
        request = copy.deepcopy(self.request)
        request['sources'][0]['archive']['sha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'Source bytes changed'):
            tool.prepare(request, self.cache, self.roster)

    def test_unsafe_paths_and_archives_are_rejected(self):
        for path in ['../outside.obj', '/absolute.obj', 'https://example.invalid/image.png',
                     'file:///etc/passwd', 'folder\\image.png', '%2e%2e/image.png', 'image.png?x=1', 'image.png#x']:
            with self.subTest(path=path), self.assertRaises(ValueError):
                tool.safe_path(path)
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w') as archive:
            info = zipfile.ZipInfo('linked.png')
            info.external_attr = (stat.S_IFLNK | 0o777) << 16
            archive.writestr(info, '../outside')
        with self.assertRaisesRegex(ValueError, 'linked'):
            tool.validated_zip(buffer.getvalue())
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w') as archive:
            archive.writestr('folder/model.obj', b'first')
            archive.writestr('folder/./model.obj', b'different')
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            tool.validated_zip(buffer.getvalue())
        self.assertEqual(str(tool.safe_path('Hunter/Texture (1).png')), 'Hunter/Texture (1).png')

    def test_published_skin_has_34_joints_and_no_animation(self):
        entry = next(x for x in self.manifest['entries'] if 'publishedRig' in x)
        rig = entry['publishedRig']
        structure, images = tool.collada_structure((MODULE / rig['model']['path']).read_bytes())
        self.assertEqual(structure, rig['structure'])
        self.assertEqual(structure['jointNodes'], 34)
        self.assertEqual(structure['skinControllers'], 11)
        self.assertEqual(structure['weightedVertices'], 4319)
        self.assertEqual(structure['influences'], 5770)
        self.assertEqual(structure['maxInfluencesPerVertex'], 3)
        self.assertEqual(structure['animationChannels'], 0)
        self.assertEqual(structure['animationClips'], 0)
        self.assertEqual(len(images), 7)
        self.assertFalse(structure['sourceRigOriginCertified'])
        alternate = rig['alternateFormats'][0]
        self.assertEqual(alternate['format'], 'FBX')
        self.assertTrue(alternate['archiveMemberOnly'])
        with zipfile.ZipFile(MODULE / entry['archivePath']) as archive:
            data = archive.read(alternate['model']['member'])
        self.assertTrue(data.startswith(b'Kaydara FBX Binary  '))
        self.assertEqual(len(data), alternate['model']['bytes'])
        self.assertEqual(tool.digest(data), alternate['model']['sha256'])

    def test_altered_skin_weights_and_external_images_are_rejected(self):
        entry = next(x for x in self.manifest['entries'] if 'publishedRig' in x)
        data = (MODULE / entry['publishedRig']['model']['path']).read_bytes()
        ns = {'c': 'http://www.collada.org/2005/11/COLLADASchema'}
        root = ET.fromstring(data)
        skin = root.find('.//c:skin', ns)
        weights = skin.find('c:vertex_weights', ns)
        source = weights.find('c:input[@semantic="WEIGHT"]', ns).get('source').removeprefix('#')
        values = skin.find('c:source[@id="' + source + '"]/c:float_array', ns)
        array = values.text.split(); array[0] = '0.25'; values.text = ' '.join(array)
        with self.assertRaisesRegex(ValueError, 'not normalized'):
            tool.collada_structure(ET.tostring(root))
        root = ET.fromstring(data)
        root.find('.//c:library_images/c:image/c:init_from', ns).text = 'https://example.invalid/texture.png'
        with self.assertRaisesRegex(ValueError, 'Unsafe resource path'):
            tool.collada_structure(ET.tostring(root))

    def test_ports_variants_and_independent_parts_are_not_finalized(self):
        parts = [x for x in self.manifest['entries'] if x['geometryScope'] == 'static-mesh-part']
        self.assertEqual(len(parts), 7)
        for entry in self.manifest['entries']:
            self.assertFalse(entry['rigComplete'])
            self.assertFalse(entry['animationComplete'])
            self.assertFalse(entry['catalogueFidelityCertified'])
            if entry.get('candidateUid', '').startswith(('re2-', 're3-')):
                self.assertNotIn('subjectId', entry)
                self.assertTrue(any('PlayStation' in note for note in entry['limitations']))
            evidence = entry['visualReview']['reviewedAgainst']
            self.assertEqual(tool.digest((ROOT / evidence['file']).read_bytes()), evidence['sha256'])
        self.assertEqual(self.manifest['counts']['rigs'], 0)
        self.assertEqual(self.manifest['counts']['publishedRigReferences'], 1)


if __name__ == '__main__':
    unittest.main()
