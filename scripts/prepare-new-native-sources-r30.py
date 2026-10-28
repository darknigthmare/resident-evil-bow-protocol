#!/usr/bin/env python3
"""Prepare a source-preserving, edition-separated native RE2/RE3 reference lot."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path, PurePosixPath
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r30/native/new-sources'
sha = lambda value: hashlib.sha256(value).hexdigest()


def record(path, **extra):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': sha(raw), **extra}


def main():
    baseline_path = ROOT / 'modules/fidelity-r26/models/catalog.json'
    baseline = json.loads(baseline_path.read_bytes())
    entries = []
    for original in baseline['entries']:
        if not original['id'].startswith(('re2-', 're3-')) or any(part in original['id'] for part in ('hands', 'only', 'tentacle', 'arm-', 'white', 'alternate')):
            continue
        entry = copy.deepcopy(original)
        source_base = (baseline_path.parent / entry['base']).resolve()
        for kind in ('model', 'materials', 'archive'):
            if entry.get(kind):
                old = entry[kind]
                entry[kind] = record((source_base / old['path']).resolve())
        entry['textures'] = [record((source_base / item['path']).resolve()) for item in entry['textures']]
        entry['base'] = '../../../../'
        entry['subjectId'] = entry['candidateUid']
        entry['sourceEdition'] = entry['game'] + ' — export communautaire statique, équivalence PlayStation non vérifiée'
        entry['sourceCatalog'] = record(baseline_path)
        entry['sourceEntryId'] = original['id']
        entry['newNativeArchive'] = False
        entry['cameraUpAxis'] = '-Y'
        entries.append(entry)

    receipts_path = PACK / 'acquisition/receipts.json'
    receipts = json.loads(receipts_path.read_bytes())
    for item in receipts['entries']:
        archive_path = ROOT / item['archive']['path']
        if record(archive_path)['sha256'] != item['archive']['sha256']:
            raise ValueError('Acquisition archive changed')
        with ZipFile(archive_path) as archive:
            names = [row.filename for row in archive.infolist() if not row.is_dir()]
            models = [name for name in names if name.endswith('_emdui.obj')]
            if item['assetId'] == 540001:
                models = ['Hunter γ.obj']
            # Seven female source variants remain distinct, as do both Ivy textures.
            for number, member in enumerate(models):
                raw = archive.read(member)
                libraries = [line.split(None, 1)[1].strip() for line in raw.decode().splitlines() if line.startswith('mtllib ')]
                if len(libraries) != 1:
                    raise ValueError('Expected exactly one native material library')
                material_member = str(PurePosixPath(member).parent / libraries[0])
                material_raw = archive.read(material_member)
                texture_members = []
                for line in material_raw.decode().splitlines():
                    if not line.startswith('map_'):
                        continue
                    literal = line.split(None, 1)[1].strip().replace('\\', '/')
                    basename = literal.split('/')[-1].casefold()
                    matches = [name for name in names if PurePosixPath(name).name.casefold() == basename]
                    if not matches or len({sha(archive.read(name)) for name in matches}) != 1:
                        raise ValueError('Ambiguous or missing native texture')
                    if matches[0] not in texture_members:
                        texture_members.append(matches[0])

                def publish(name):
                    source = PurePosixPath(name)
                    if source.is_absolute() or '..' in source.parts:
                        raise ValueError('Unsafe archive member')
                    path = PACK / 'models' / ('asset-' + str(item['assetId'])) / name
                    path.parent.mkdir(parents=True, exist_ok=True)
                    data = archive.read(name)
                    if path.exists() and path.read_bytes() != data:
                        raise ValueError('Refusing to replace native source bytes')
                    path.write_bytes(data)
                    return record(path, member=name)

                is_remake = item['assetId'] == 540001
                uid = item['uid']
                if item['assetId'] == 466503 and '/EM039/' in member:
                    uid = 're2-poison-ivy'
                model_id = uid + ('-pc-r30' if is_remake else '-gamecube-r30') + ('-' + str(number + 1) if len(models) > 1 else '')
                entries.append({'id': model_id, 'subjectId': uid, 'label': uid + ' / ' + member,
                    'game': 'Resident Evil 3 remake (2020)' if is_remake else 'Resident Evil 3: Nemesis — port GameCube' if uid.startswith('re3-') else 'Resident Evil 2 — port GameCube',
                    'platform': 'PC / Computer' if is_remake else 'GameCube',
                    'sourceEdition': 'PC (2020), export publié de Hunter γ ; pose et matériaux du jeu non certifiés' if is_remake else 'Port GameCube — équivalence avec la version PlayStation non vérifiée',
                    'base': '../../../../', 'format': 'OBJ', 'model': publish(member), 'materials': publish(material_member),
                    'textures': [publish(name) for name in texture_members], 'archive': item['archive'],
                    'sourcePage': item['page']['url'], 'publisherPage': item['page'], 'newNativeArchive': True,
                    'geometryScope': 'static-mesh-export', 'clips': [], 'sourceFilesRewritten': False,
                    'cameraUpAxis': 'Y' if is_remake else '-Y', 'canonicalFidelityCertified': False,
                    'limitations': ['Export statique de la publication source, aucune animation native dans cet OBJ.',
                        'Aucun assemblage, redressement, rotation de membre ou changement de texture appliqué.',
                        'La géométrie complète de ce fichier ne certifie pas une posture de combat ni la complétude anatomique.']})

    # Preserve and inspect the only new weighted FBX; a rig alone does not imply animation.
    gamma = next(item for item in receipts['entries'] if item['assetId'] == 540001)
    spec = importlib.util.spec_from_file_location('fbx_r24', ROOT / 'scripts/import-rigged-motion-r24.py')
    inspector = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(inspector)
    with ZipFile(ROOT / gamma['archive']['path']) as archive:
        raw = archive.read('Hunter γ.fbx')
        target = PACK / 'models/asset-540001/Hunter γ.fbx'
        target.write_bytes(raw)
        inspection = {'source': record(target, member='Hunter γ.fbx'), **inspector.inspect_fbx(raw)}
    (PACK / 'gamma-fbx-inspection.json').write_text(json.dumps(inspection, ensure_ascii=False, indent=2) + '\n')
    catalog = {'schema': 're.bow.native-model-lot-r30/1', 'release': 'R30',
        'sourceFilesRewritten': False, 'canonicalFidelityCertified': False,
        'inputs': [record(baseline_path), record(receipts_path)],
        'counts': {'newArchives': len(receipts['entries']), 'sourceModelVariants': len(entries),
            'reusedModelVariants': sum(not item['newNativeArchive'] for item in entries),
            'newModelVariants': sum(item['newNativeArchive'] for item in entries), 'nativeAnimationClips': 0},
        'entries': entries}
    (PACK / 'catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(catalog['counts']))


if __name__ == '__main__':
    main()
