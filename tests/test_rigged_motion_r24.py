"""Actual source rig inspection and defensive archive transport checks."""
import hashlib
import importlib.util
import json
import copy
from pathlib import Path
import struct
import tempfile
import unittest
import warnings
import zipfile
import zlib

ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location('rigged_motion_r24',ROOT/'scripts/import-rigged-motion-r24.py')
MODULE=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class RiggedMotionTests(unittest.TestCase):
    def setUp(self):
        temporary=tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root=Path(temporary.name)
        self.archive=self.root/'source.zip'
        self.output=self.root/'output'

    def fixture(self,names=None):
        with zipfile.ZipFile(self.archive,'w') as source:
            for name,content in (names or [('first.png',b'first source bytes'),('second.png',b'second source bytes')]):
                source.writestr(name,content)
        return hashlib.sha256(self.archive.read_bytes()).hexdigest()

    def test_original_archive_47_motions_and_one_preroll_pose_preserve_all48_keyed_files(self):
        folder=ROOT/'modules/fidelity-r24/motion'
        manifest=json.loads((folder/'manifest.json').read_text())
        entry=manifest['entries'][0]
        archive=folder/entry['archive']['path']
        self.assertEqual(hashlib.sha256(archive.read_bytes()).hexdigest(),entry['archive']['sha256'])
        inventory=MODULE.inspect_archive(archive)
        by_name={item['path']:item for item in inventory}
        animated=[item for item in inventory if item.get('fbx',{}).get('hasNativeAnimationCurves')]
        self.assertEqual(len(animated),48)
        self.assertEqual(len(entry['clips']),48)
        self.assertEqual(manifest['summary']['sourceAnimationFiles'],48)
        self.assertEqual(manifest['summary']['positiveTimeMotionFiles'],47)
        self.assertEqual(manifest['summary']['positiveTimePoseFiles'],1)
        with zipfile.ZipFile(archive) as source:
            for clip in entry['clips']:
                actual=by_name[clip['member']]['fbx']
                self.assertTrue(actual['hasWeightedRig'])
                self.assertTrue(actual['hasNativeAnimationCurves'])
                self.assertGreater(actual['varyingAnimationCurveCount'],0)
                self.assertEqual(actual['sha256'],clip['sha256'])
                self.assertEqual(actual['nativeKeyTimesTicks'],clip['nativeKeyTimesTicks'])
                self.assertEqual(actual['durationSeconds'],clip['duration'])
                self.assertEqual(actual['varyingNonnegativeAnimationCurveCount'],clip['varyingNonnegativeAnimationCurveCount'])
                self.assertEqual(actual['positiveTimePoseOnly'],clip['positiveTimePoseOnly'])
                self.assertEqual(actual['playbackVariationScope'],clip['playbackVariationScope'])
                if clip['id']=='em1200_em1201_BA_1':
                    self.assertGreater(actual['varyingAnimationCurveCount'],0)
                    self.assertEqual(actual['varyingNonnegativeAnimationCurveCount'],0)
                    self.assertEqual(actual['nativeKeyTimesTicks'],['-9622116','0','769769300'])
                    self.assertTrue(actual['positiveTimePoseOnly'])
                    self.assertEqual(actual['playbackVariationScope'],'pose-only-after-time-zero')
                else:
                    self.assertGreaterEqual(actual['varyingNonnegativeAnimationCurveCountAbove1eMinus4'],33)
                    self.assertFalse(actual['positiveTimePoseOnly'])
                self.assertEqual(actual['skinWeightCount'],10144)
                self.assertEqual(actual['skinCount'],9)
                self.assertEqual(actual['geometryCount'],9)
                self.assertEqual(actual['invalidSkinAssignments'],0)
                if clip.get('path'):
                    self.assertEqual((folder/clip['path']).read_bytes(),source.read(clip['member']))
            for item in [entry['model'],*entry['textures']]:
                actual=(folder/item['path']).read_bytes()
                self.assertEqual(actual,source.read(item['member']))
                self.assertEqual(hashlib.sha256(actual).hexdigest(),item['sha256'])
        self.assertFalse(entry['canonicalFidelityCertified'])
        self.assertFalse(entry['rigProductionFinalized'])
        self.assertEqual(entry['generatedKeyframes'],0)

    def test_selected_source_bytes_are_idempotent_and_existing_differences_are_refused(self):
        expected=self.fixture()
        selection={'first.png':'textures/original.png'}
        result=MODULE.import_members(self.archive,self.output,selection,expected)
        self.assertEqual((self.output/'textures/original.png').read_bytes(),b'first source bytes')
        self.assertEqual(result,MODULE.import_members(self.archive,self.output,selection,expected))
        (self.output/'textures/original.png').write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError,'different selected output'):
            MODULE.import_members(self.archive,self.output,selection,expected)
        self.assertEqual((self.output/'textures/original.png').read_bytes(),b'changed')

    def test_traversal_duplicate_and_symlink_zip_members_are_rejected(self):
        for name in ['../outside.png','/absolute.png','folder\\outside.png','C:/outside.png']:
            self.fixture([(name,b'data')])
            with self.assertRaisesRegex(ValueError,'Unsafe'):
                MODULE.inspect_archive(self.archive)
        with warnings.catch_warnings():
            warnings.simplefilter('ignore',UserWarning)
            self.fixture([('same.png',b'one'),('same.png',b'two')])
        with self.assertRaisesRegex(ValueError,'duplicate'):
            MODULE.inspect_archive(self.archive)
        with zipfile.ZipFile(self.archive,'w') as source:
            member=zipfile.ZipInfo('symlink.png');member.create_system=3;member.external_attr=0o120777<<16
            source.writestr(member,b'/outside')
        with self.assertRaisesRegex(ValueError,'Unsafe'):
            MODULE.inspect_archive(self.archive)

    def test_hash_destination_collisions_and_symlink_destinations_fail_before_writing(self):
        expected=self.fixture()
        with self.assertRaisesRegex(ValueError,'SHA-256'):
            MODULE.import_members(self.archive,self.output,{'first.png':'first.png'},'0'*64)
        self.assertFalse(self.output.exists())
        with self.assertRaisesRegex(ValueError,'Duplicate selected destination'):
            MODULE.import_members(self.archive,self.output,{'first.png':'same.png','second.png':'same.png'},expected)
        self.assertFalse(self.output.exists())
        self.output.symlink_to(self.root,target_is_directory=True)
        with self.assertRaisesRegex(ValueError,'Symlinked destination'):
            MODULE.import_members(self.archive,self.output,{'first.png':'first.png'},expected)

    def test_truncated_binary_fbx_and_invalid_node_offsets_are_rejected(self):
        with self.assertRaisesRegex(ValueError,'binary FBX'):
            MODULE.inspect_fbx(b'an unsupported file')
        folder=ROOT/'modules/fidelity-r24/motion'
        native=bytearray((folder/'sea-creeper/model.fbx').read_bytes())
        native[27:31]=struct.pack('<I',1)
        with self.assertRaisesRegex(ValueError,'bounds'):
            MODULE.inspect_fbx(native)
        header=b'Kaydara FBX Binary  \x00\x1a\x00'+struct.pack('<I',7400)
        with self.assertRaisesRegex(ValueError,'Truncated'):
            MODULE.inspect_fbx(header+struct.pack('<IIIB',40,0,0,1))

    def test_compressed_fbx_array_cannot_expand_beyond_declared_limit(self):
        header=b'Kaydara FBX Binary  \x00\x1a\x00'+struct.pack('<I',7400)
        compressed=zlib.compress(b'0'*100_000)
        parser=MODULE.BinaryFBX(header+b'f'+struct.pack('<III',1,1,len(compressed))+compressed)
        with self.assertRaisesRegex(ValueError,'exceeds its declared size'):
            parser.property()
        too_big=MODULE.BinaryFBX(header+b'd'+struct.pack('<III',MODULE.MAX_ARRAY_BYTES,0,0))
        with self.assertRaisesRegex(ValueError,'exceeds limits'):
            too_big.property()
        cumulative=MODULE.BinaryFBX(header+b'f'+struct.pack('<III',1,0,4)+struct.pack('<f',1))
        cumulative.decoded_array_bytes=64*1024*1024
        with self.assertRaisesRegex(ValueError,'cumulative'):
            cumulative.property()

    def test_same_package_materials_require_exact_native_topology_and_corner_uvs(self):
        folder=ROOT/'modules/fidelity-r24/motion'
        entry=json.loads((folder/'manifest.json').read_text())['entries'][0]
        with zipfile.ZipFile(folder/entry['archive']['path']) as source:
            body=MODULE.mesh_material_evidence(source.read(entry['model']['member']))
            clip=MODULE.mesh_material_evidence(source.read(entry['clips'][0]['member']))
        proof=MODULE.verify_material_transfer(body,clip)
        self.assertEqual(len(proof['matchedMeshes']),9)
        for mesh in proof['matchedMeshes']:
            links=mesh['nativeBodyMaterials'][0]['textures']
            self.assertIn({'property':'DiffuseColor','relativeFilename':'em1200_BM.png'},links)
            self.assertIn({'property':'NormalMap','relativeFilename':'em1200_NM.png'},links)
        wrong_uv=copy.deepcopy(clip)
        wrong_uv['meshes'][0]['expandedUvSha256']='0'*64
        with self.assertRaisesRegex(ValueError,'topology or polygon-corner UVs differ'):
            MODULE.verify_material_transfer(body,wrong_uv)
        wrong_name=copy.deepcopy(clip)
        wrong_name['meshes'][0]['name']='Another incarnation'
        with self.assertRaisesRegex(ValueError,'names do not match uniquely'):
            MODULE.verify_material_transfer(body,wrong_name)
        no_mapping=copy.deepcopy(body)
        no_mapping['meshes'][0]['materials'][0]['textures']=[]
        with self.assertRaisesRegex(ValueError,'explicit native texture assignment'):
            MODULE.verify_material_transfer(no_mapping,clip)


if __name__=='__main__':
    unittest.main()
