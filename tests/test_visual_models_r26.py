"""Prove archive equality, literal material attribution and derived-sheet limits."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT/'modules/fidelity-r26/visual'
SPEC = importlib.util.spec_from_file_location('visual_r26', ROOT/'scripts/import-visual-models-r26.py')
IMPORT = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(IMPORT)
class VisualModelsR26(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.request = json.loads((ROOT/'docs/R26_VISUAL_IMPORT_REQUEST.json').read_text())
        cls.manifest = json.loads((BASE/'manifest.json').read_text())
        cls.roster = {item['id']: item for item in json.loads((ROOT/'data/roster.json').read_text())['catalog']}
    def test_all_published_bytes_match_receipts_and_original_archives(self):
        for row in self.manifest['files']:
            data = (BASE/row['path']).read_bytes()
            self.assertEqual(len(data), row['bytes']); self.assertEqual(hashlib.sha256(data).hexdigest(), row['sha256'])
        for entry in self.manifest['entries']:
            with zipfile.ZipFile(BASE/entry['archivePath']) as archive:
                for row in [entry['model'], entry['materials'], *entry['textures']]:
                    self.assertEqual((BASE/row['path']).read_bytes(), archive.read(row['member']))
    def test_source_folders_are_resolved_only_by_literal_names_and_equal_bytes(self):
        total = 0
        for entry in self.manifest['entries']:
            with zipfile.ZipFile(BASE/entry['archivePath']) as archive:
                original = archive.read(entry['materials']['member'])
                for alias in entry['nativeTextureReferenceAliases']:
                    self.assertIn(Path(alias['reference']).name.encode(), original)
                    self.assertNotIn(alias['reference'], archive.namelist())
                    self.assertEqual(Path(alias['reference']).name.casefold(), Path(alias['member']).name.casefold())
                    self.assertEqual(alias['resolution'], 'literal-basename-identical-source-bytes')
                    for name in alias['matchingMembers']:
                        self.assertEqual(hashlib.sha256(archive.read(name)).hexdigest(), alias['sha256'])
                    total += 1
        self.assertEqual(total, 9)
    def test_import_reproduces_every_output_without_changing_existing_publications(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = IMPORT.publish(self.request, BASE, Path(tmp), self.roster)
            self.assertEqual(result, self.manifest)
            for row in self.manifest['files']:
                self.assertEqual((Path(tmp)/row['path']).read_bytes(), (BASE/row['path']).read_bytes())
            IMPORT.publish(self.request, BASE, Path(tmp), self.roster)
            target = Path(tmp)/self.manifest['files'][0]['path']; target.write_bytes(b'tampered')
            with self.assertRaisesRegex(ValueError, 'overwrite'):
                IMPORT.publish(self.request, BASE, Path(tmp), self.roster)
    def test_unknown_identity_and_mismatched_game_are_rejected(self):
        for field, value in [('subjectId', 'invented-uid'), ('game', 'Resident Evil 2 (1998)')]:
            request = copy.deepcopy(self.request); request['entries'][0][field] = value
            with self.assertRaisesRegex(ValueError, 'identity|game'):
                IMPORT.prepare(request, BASE, self.roster)
    def test_tampered_receipts_and_unsafe_paths_are_rejected(self):
        for changes in [{'sha256':'0'*64}, {'bytes':1}, {'cachePath':'../outside'}]:
            request = copy.deepcopy(self.request); request['sources'][0]['archive'].update(changes)
            with self.assertRaises(ValueError): IMPORT.prepare(request, BASE, self.roster)
    def test_candidate_variant_and_static_pose_are_not_certified_as_combat_assets(self):
        self.assertEqual(self.manifest['counts']['modelViews'], 9)
        self.assertEqual(self.manifest['counts']['exactCatalogueIdentities'], 5)
        self.assertEqual(self.manifest['counts']['candidateCatalogueIdentities'], 1)
        for entry in self.manifest['entries']:
            self.assertFalse(entry['sourceFilesRewritten']); self.assertFalse(entry['catalogueFidelityCertified'])
            self.assertFalse(entry['rigComplete']); self.assertFalse(entry['animationComplete'])
            self.assertEqual(entry['playableMotionClips'], 0)
            self.assertEqual(entry['geometry']['bones'], 0)
        tyrant = next(item for item in self.manifest['entries'] if item['assetId']==287612)
        self.assertNotIn('subjectId', tyrant); self.assertEqual(tyrant['candidateUid'], 're0-proto-tyrant')
    def test_published_preview_is_not_silently_counted_as_generated_sprite(self):
        for entry in self.manifest['entries']:
            source = next(item for item in self.manifest['sources'] if item['assetId']==entry['assetId'])
            self.assertEqual(entry['preview'], source['preview'])
            self.assertIn(source['sourceGameLabel'], (BASE/source['page']['path']).read_text())
    def test_derived_sheets_have_eight_actual_unmirrored_views_without_cropping(self):
        base = ROOT/'modules/fidelity-r26/sprites'
        manifest = json.loads((base/'manifest.json').read_text())
        self.assertEqual(manifest['counts']['sheets'], 9); self.assertEqual(manifest['counts']['orientationViews'], 72)
        self.assertEqual(manifest['counts']['combatReadySprites'], 0); self.assertEqual(manifest['counts']['originalGameSprites'], 0)
        self.assertEqual(hashlib.sha256((BASE/'manifest.json').read_bytes()).hexdigest(), manifest['sourceManifest']['sha256'])
        self.assertEqual(hashlib.sha256((base/'renderer.js').read_bytes()).hexdigest(), manifest['recipe']['sha256'])
        entries = {entry['id']:entry for entry in self.manifest['entries']}
        for entry in manifest['entries']:
            self.assertEqual(entry['sourceModelSha256'], entries[entry['id']]['model']['sha256'])
            self.assertFalse(entry['modelTransformsChanged']); self.assertFalse(entry['mirroredViews'])
            self.assertFalse(entry['originalGameSprite']); self.assertFalse(entry['combatReady'])
            payload = (base/entry['sheet']['path']).read_bytes()
            self.assertEqual(len(payload), entry['sheet']['bytes']); self.assertEqual(hashlib.sha256(payload).hexdigest(), entry['sheet']['sha256'])
            with Image.open(base/entry['sheet']['path']) as image:
                self.assertEqual(image.size, (1024,512)); self.assertEqual(image.mode, 'RGBA')
                hashes = []
                for view in entry['views']:
                    x,y,w,h = view['rectangle']; cell = image.crop((x,y,x+w,y+h)); alpha = cell.getchannel('A')
                    occupied = sum(value>0 for value in alpha.tobytes())
                    self.assertEqual(occupied, view['occupiedPixels']); self.assertGreater(occupied,20)
                    self.assertEqual(alpha.crop((0,0,256,1)).getbbox(), None)
                    self.assertEqual(alpha.crop((0,255,256,256)).getbbox(), None)
                    self.assertEqual(alpha.crop((0,0,1,256)).getbbox(), None)
                    self.assertEqual(alpha.crop((255,0,256,256)).getbbox(), None)
                    hashes.append(hashlib.sha256(cell.tobytes()).hexdigest())
                self.assertEqual(len(set(hashes)), 8, entry['id'])
if __name__ == '__main__': unittest.main()
