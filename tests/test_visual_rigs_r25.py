"""Original member equality and trust boundaries for the R25 static references."""
import copy
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import stat
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('visual_rigs_r25', ROOT / 'scripts/import-visual-rigs-r25.py')
IMPORT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(IMPORT)
BASE = ROOT / 'modules/fidelity-r25/visual'


class VisualRigsR25Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.request = json.loads((ROOT / 'docs/R25_VISUAL_IMPORT_REQUEST.json').read_text())
        cls.manifest = json.loads((BASE / 'manifest.json').read_text())
        cls.roster = {r['id']: r for r in json.loads((ROOT / 'data/roster.json').read_text())['catalog']}

    def test_every_published_member_is_the_exact_original_archive_byte_sequence(self):
        for row in self.manifest['files']:
            payload = (BASE / row['path']).read_bytes()
            self.assertEqual(len(payload), row['bytes'])
            self.assertEqual(hashlib.sha256(payload).hexdigest(), row['sha256'])
        for entry in self.manifest['entries']:
            with zipfile.ZipFile(BASE / entry['archivePath']) as archive:
                for row in [entry['model'], entry.get('materials'), *entry['textures']]:
                    if row:
                        self.assertEqual((BASE / row['path']).read_bytes(), archive.read(row['member']))
                for alternate in entry.get('alternateFormats', []):
                    row = alternate['model']
                    self.assertTrue(alternate['archiveMemberOnly'])
                    self.assertEqual(hashlib.sha256(archive.read(row['member'])).hexdigest(), row['sha256'])

    def test_published_rigs_keep_their_real_bones_weights_and_constant_source_takes(self):
        expected = {'re5-chainsaw-majini-pc-published': (87, 11, 10561),
                    're5-executioner-pc-published': (112, 12, 12955),
                    're5-plaga-c-pc-published': (63, 5, 16003),
                    're5-uroboros-pc-published': (196, 13, 67769),
                    're5-uroboros-tale-pc-published': (13, 1, 836)}
        entries = {row['id']: row for row in self.manifest['entries']}
        for uid, counts in expected.items():
            entry = entries[uid]
            actual = IMPORT.MOTION.inspect_fbx((BASE / entry['model']['path']).read_bytes())
            self.assertEqual((actual['boneCount'], actual['skinCount'], actual['skinWeightCount']), counts)
            self.assertEqual(actual['varyingAnimationCurveCount'], 0)
            self.assertEqual(actual['invalidSkinWeights'], 0)
            self.assertEqual(actual['invalidSkinAssignments'], 0)
            if uid == 're5-plaga-c-pc-published':
                self.assertEqual(actual['keyTimeCount'], 0)
                self.assertIsNone(actual['keyTimeStart'])
                self.assertIsNone(actual['keyTimeEnd'])
            else:
                self.assertEqual(actual['keyTimeStart'], '0')
                self.assertEqual(actual['keyTimeEnd'], '0')
            self.assertEqual(entry['playableMotionClips'], 0)
            self.assertFalse(entry['sourceRigOriginCertified'])
        self.assertEqual(self.manifest['counts']['animationClips'], 0)

    def test_unresolved_and_untextured_source_materials_do_not_gain_guessed_images(self):
        all_missing, all_untextured = [], []
        for entry in self.manifest['entries']:
            if entry['format'] != 'FBX':
                continue
            actual = IMPORT.MOTION.mesh_material_evidence((BASE / entry['model']['path']).read_bytes())
            proof = json.loads((BASE / entry['nativeMaterialEvidence']['path']).read_text())
            self.assertEqual(actual, proof)
            all_missing.extend(entry['unresolvedTextureReferences'])
            all_untextured.extend(entry['untexturedSourceMeshes'])
            for missing in entry['unresolvedTextureReferences']:
                self.assertEqual(missing['sourceModelSha256'], entry['model']['sha256'])
                self.assertEqual(missing['rawReference'], 'unknownmaterial')
                self.assertEqual(missing['rawFileName'], 'unknownmaterial')
                self.assertTrue(missing['archiveMemberMissing'])
                with zipfile.ZipFile(BASE / entry['archivePath']) as archive:
                    self.assertNotIn(missing['rawReference'], archive.namelist())
                    self.assertFalse(any(Path(name).name == missing['rawReference'] for name in archive.namelist()))
            self.assertFalse(any(row['path'].endswith('unknownmaterial') for row in entry['textures']))
        self.assertEqual(len(all_missing), 2)
        self.assertEqual({row['mesh'] for row in all_missing}, {'mesh0', 'mesh6'})
        self.assertEqual(len(all_untextured), 9)

    def test_case_only_obj_texture_references_preserve_both_original_mtl_and_png_names(self):
        aliases = []
        for entry in self.manifest['entries']:
            if entry['format'] != 'OBJ':
                continue
            with zipfile.ZipFile(BASE / entry['archivePath']) as archive:
                original = archive.read(entry['materials']['member'])
                self.assertEqual(original, (BASE / entry['materials']['path']).read_bytes())
                for binding in entry['nativeTextureReferenceAliases']:
                    self.assertEqual(binding['reference'].casefold(), binding['member'].casefold())
                    self.assertNotEqual(binding['reference'], binding['member'])
                    self.assertIn(binding['reference'].encode(), original)
                    self.assertIn(binding['member'], archive.namelist())
                    aliases.append(binding)
        self.assertEqual(len(aliases), 8)

    def test_ports_uncertain_aliases_and_independent_parts_do_not_become_final_combat_assets(self):
        entries = self.manifest['entries']
        self.assertEqual(len(entries), 8)
        self.assertEqual(self.manifest['counts']['exactCatalogueIdentities'], 3)
        for entry in entries:
            self.assertFalse(entry['catalogueFidelityCertified'])
            self.assertFalse(entry['animationComplete'])
            self.assertFalse(entry['rigComplete'])
            self.assertFalse(entry['sourceFilesRewritten'])
            if entry['id'].startswith('re4-'):
                self.assertNotIn('subjectId', entry)
                self.assertIn('2007', entry['game'])
            if entry['id'] == 're5-plaga-c-pc-published':
                self.assertNotIn('subjectId', entry)
                self.assertEqual(entry['candidateUid'], 're5-duvalia')
                self.assertTrue(any('non certifiés' in limit for limit in entry['limitations']))
        part = next(e for e in entries if e['id'] == 're5-uroboros-tale-pc-published')
        self.assertTrue(part['geometryScope'].endswith('-part'))
        self.assertTrue(any('assemblage' in limit for limit in part['limitations']))

    def test_import_is_reproducible_and_refuses_any_differing_destination_before_writing(self):
        with tempfile.TemporaryDirectory() as tmp:
            destination = Path(tmp) / 'published'
            result = IMPORT.publish(self.request, BASE, destination, self.roster)
            self.assertEqual(result, self.manifest)
            self.assertEqual((destination / 'manifest.json').read_bytes(), (BASE / 'manifest.json').read_bytes())
            IMPORT.publish(self.request, BASE, destination, self.roster)
            before = {p.relative_to(destination).as_posix(): p.read_bytes() for p in destination.rglob('*') if p.is_file()}
            first = destination / self.manifest['files'][0]['path']
            first.write_bytes(b'changed')
            with self.assertRaisesRegex(ValueError, 'Refusing to overwrite'):
                IMPORT.publish(self.request, BASE, destination, self.roster)
            after = {p.relative_to(destination).as_posix(): p.read_bytes() for p in destination.rglob('*') if p.is_file()}
            self.assertEqual(set(before), set(after))
            for name, payload in before.items():
                self.assertEqual(after[name], b'changed' if destination / name == first else payload)

    def test_archive_paths_case_collisions_and_symlinks_are_refused(self):
        for name in ['../escape', '/absolute', 'C:/drive', 'dir\\escape', 'bad%2fpath']:
            with self.subTest(name=name):
                out = io.BytesIO()
                with zipfile.ZipFile(out, 'w') as archive:
                    archive.writestr(name, b'payload')
                with self.assertRaisesRegex(ValueError, 'Unsafe resource path'):
                    IMPORT.archive(out.getvalue())
        out = io.BytesIO()
        with zipfile.ZipFile(out, 'w') as archive:
            archive.writestr('Texture.PNG', b'a')
            archive.writestr('texture.png', b'b')
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            IMPORT.archive(out.getvalue())
        out = io.BytesIO()
        with zipfile.ZipFile(out, 'w') as archive:
            info = zipfile.ZipInfo('linked')
            info.create_system = 3
            info.external_attr = (stat.S_IFLNK | 0o777) << 16
            archive.writestr(info, b'outside')
        with self.assertRaisesRegex(ValueError, 'linked'):
            IMPORT.archive(out.getvalue())

    def test_changed_receipts_and_symlinked_destinations_fail_before_any_publication(self):
        altered = copy.deepcopy(self.request)
        altered['sources'][0]['archive']['sha256'] = '0' * 64
        with tempfile.TemporaryDirectory() as tmp:
            destination = Path(tmp) / 'published'
            with self.assertRaisesRegex(ValueError, 'Source bytes differ'):
                IMPORT.publish(altered, BASE, destination, self.roster)
            self.assertFalse(destination.exists())
            oversized = copy.deepcopy(self.request)
            oversized['sources'][0]['archive']['bytes'] = IMPORT.MAX_ARCHIVE + 1
            with self.assertRaisesRegex(ValueError, 'Source byte length exceeds'):
                IMPORT.publish(oversized, BASE, destination, self.roster)
            self.assertFalse(destination.exists())
            destination.mkdir()
            outside = Path(tmp) / 'outside'
            outside.mkdir()
            (destination / 'sources').symlink_to(outside, target_is_directory=True)
            with self.assertRaisesRegex(ValueError, 'Destination leaves'):
                IMPORT.publish(self.request, BASE, destination, self.roster)
            self.assertEqual(list(outside.iterdir()), [])


if __name__ == '__main__':
    unittest.main()
