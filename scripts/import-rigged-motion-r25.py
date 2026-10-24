#!/usr/bin/env python3
"""Preserve additional original Revelations rig scenes and prove native materials.

Source scenes stay in their original ZIPs; this tool does not author poses,
retarget bones, mirror geometry, invent times or attribute BA/DM/SC actions.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path, PurePosixPath
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('rigged_motion_r24', ROOT/'scripts/import-rigged-motion-r24.py')
SOURCE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SOURCE)
MAX_ARCHIVE_BYTES = 80 * 1024 * 1024
MAX_SCENE_BYTES = 12 * 1024 * 1024


def sha(payload):
    return hashlib.sha256(payload).hexdigest()


def local_path(root, relative):
    name = PurePosixPath(relative)
    if not relative or name.is_absolute() or '..' in name.parts or '\\' in relative or ':' in relative:
        raise ValueError('Unsafe delivery path')
    path = Path(root).joinpath(*name.parts)
    if any(parent.is_symlink() for parent in [path, *path.parents]):
        raise ValueError('Symlinked delivery path')
    return path


def verify_material_transfer(body, clip):
    """Require exact object names/topology/UV, including original exporter suffixes."""
    if len(body['meshes']) != len(clip['meshes']):
        raise ValueError('Body/clip native mesh count differs')
    matches, used = [], set()
    for base in body['meshes']:
        allowed = re.compile(re.escape(base['name']) + r'(?: \((?:Single)?SkinnedCharacter[^()]*\))?\Z')
        candidates = [mesh for mesh in clip['meshes'] if allowed.fullmatch(mesh['name'])]
        if len(candidates) != 1 or candidates[0]['name'] in used:
            raise ValueError('Body/clip native mesh names do not match uniquely')
        mesh = candidates[0]
        for field in ('vertexCount', 'polygonVertexCount', 'topologySha256', 'expandedUvSha256'):
            if mesh[field] != base[field]:
                raise ValueError('Body/clip topology or polygon-corner UVs differ')
        if not base['materials'] or any(not material['textures'] for material in base['materials']):
            raise ValueError('Body has no explicit native texture assignment')
        used.add(mesh['name'])
        matches.append({'bodyMeshName': base['name'], 'clipMeshName': mesh['name'],
                        'topologySha256': base['topologySha256'], 'expandedUvSha256': base['expandedUvSha256'],
                        'nativeBodyMaterials': base['materials']})
    return {'bodySourceSha256': body['sourceSha256'], 'clipSourceSha256': clip['sourceSha256'],
            'matchedMeshes': matches, 'arbitraryTextureMapping': False, 'sourceFilesChanged': False}


def build(request, archive_dir, output, check=False):
    if request.get('schema') != 're.bow.rigged-motion-import-r25/1':
        raise ValueError('Unexpected import request schema')
    output, archive_dir = Path(output), Path(archive_dir)
    roster = {item['id'] for item in json.loads((ROOT/'data/roster.json').read_text())['catalog']}
    groups = [group for package in request['packages'] for group in package['groups']]
    if len({group['id'] for group in groups}) != len(groups):
        raise ValueError('Duplicate source model reference')
    for group in groups:
        if group['subjectId'] not in roster or group['modelRole'] not in ('body', 'body-variant', 'associated-object'):
            raise ValueError('Unknown catalogue subject or model role')
        if group['modelRole'] == 'body' and group['id'] != group['subjectId']:
            raise ValueError('A primary source body requires its exact catalogue subject')
        if group.get('canonicalFidelityCertified') or group.get('rigProductionFinalized'):
            raise ValueError('No final native-game fidelity is certified by this import')
    entries, pending, inventories = [], {}, {}
    def preserve(relative, payload):
        path = local_path(output, relative)
        if path in pending and pending[path] != payload:
            raise ValueError('Different source bytes target the same path')
        pending[path] = payload
        return {'path': relative, 'sha256': sha(payload), 'bytes': len(payload)}
    for package in request['packages']:
        SOURCE.https(package['archive']['url'])
        for record in package['sources']:
            SOURCE.https(record['url'])
            source = local_path(output, record['path'])
            compressed = source.read_bytes()
            if len(compressed) != record['bytes'] or sha(compressed) != record['sha256']:
                raise ValueError('Source snapshot SHA-256/length mismatch')
            with gzip.GzipFile(fileobj=io.BytesIO(compressed)) as stream:
                raw = stream.read(2*1024*1024+1)
            if len(raw) != record['rawBytes'] or len(raw) > 2*1024*1024 or sha(raw) != record['rawSha256']:
                raise ValueError('Raw source snapshot SHA-256/length mismatch')
        local = local_path(archive_dir, package['archiveFile'])
        if not local.is_file():
            local = local_path(output, package['archive']['path'])
        if not local.is_file() or local.is_symlink() or local.stat().st_size > MAX_ARCHIVE_BYTES:
            raise ValueError('Original archive unavailable or above the 80 MiB limit')
        archive_bytes = local.read_bytes()
        expected = package['archive']
        if len(archive_bytes) != expected['bytes'] or sha(archive_bytes) != expected['sha256']:
            raise ValueError('Original archive SHA-256/length mismatch')
        archive = {**preserve(expected['path'], archive_bytes), 'url': expected['url']}
        inventory = SOURCE.inspect_archive(local)
        inventories[package['key']] = inventory
        declared = {item['path']: item for item in inventory}
        with zipfile.ZipFile(local) as source:
            for group in package['groups']:
                selected = [declared[member] for member in group['clipMembers']]
                if len({item['path'] for item in selected}) != len(selected):
                    raise ValueError('Duplicate source clip member')
                body_record = declared[group['modelMember']]
                body_bytes = source.read(group['modelMember'])
                if not body_record.get('fbx', {}).get('hasWeightedRig'):
                    raise ValueError('Source body is not a valid weighted rig')
                body = SOURCE.mesh_material_evidence(body_bytes)
                model = {**body_record['fbx'], **preserve(group['deliveryBase']+'/model.fbx', body_bytes),
                         'member': group['modelMember']}
                textures = []
                model_folder = PurePosixPath(group['modelMember']).parent
                for item in inventory:
                    member = PurePosixPath(item['path'])
                    if member.parent == model_folder and member.suffix.lower() == '.png':
                        textures.append({**preserve(group['deliveryBase']+'/textures/'+member.name, source.read(item['path'])),
                                         'member': item['path'], 'name': member.name})
                texture_names = {item['name'] for item in textures}
                for mesh in body['meshes']:
                    for material in mesh['materials']:
                        for texture in material['textures']:
                            native_name = str(texture['relativeFilename']).replace('\\', '/').split('/')[-1]
                            if native_name not in texture_names:
                                raise ValueError('A native body texture is absent from its original package')
                clips, base_poses, clip_proofs = [], [], []
                for item in selected:
                    info = item.get('fbx', {})
                    if item['bytes'] > MAX_SCENE_BYTES or not info.get('hasWeightedRig'):
                        raise ValueError('Source scene must have a bounded weighted rig')
                    payload = source.read(item['path'])
                    proof = verify_material_transfer(body, SOURCE.mesh_material_evidence(payload))
                    clip_proofs.append(proof)
                    if not info.get('keyTimeCount'):
                        if info.get('animationCurveCount'):
                            raise ValueError('An unkeyed base scene must not claim animation curves')
                        base_poses.append({**info, 'id': PurePosixPath(item['path']).stem,
                                           'member': item['path'], 'classification': 'unkeyed-base-pose',
                                           'semanticActionVerified': False, 'generatedKeyframes': 0})
                        continue
                    start, end, rate = int(info['keyTimeStart']), int(info['keyTimeEnd']), info['ticksPerSecond']
                    clips.append({**info, 'id': PurePosixPath(item['path']).stem,
                                  'label': PurePosixPath(item['path']).stem, 'member': item['path'],
                                  'duration': max(0, end/rate), 'sourceTimeSpanSeconds': (end-start)/rate,
                                  'nativePreRollSeconds': max(0, -start/rate), 'lastNativeTimeSeconds': end/rate,
                                  'fullScene': True, 'semanticActionVerified': False, 'generatedKeyframes': 0})
                evidence = {'schema': 're.bow.native-material-bindings-r24/1',
                            'sourceArchiveSha256': archive['sha256'], 'body': body, 'clips': clip_proofs,
                            'limits': 'Exact native object-name, polygon topology, expanded UV and body material correspondences only; no arbitrary texture mapping.'}
                proof_bytes = (json.dumps(evidence, ensure_ascii=False, indent=2)+'\n').encode()
                material_record = {**preserve(group['deliveryBase']+'/source/material-bindings.json', proof_bytes),
                                   'bodyMember': group['modelMember'], 'verifiedClips': len(clips),
                                   'verifiedScenesIncludingUnkeyedBases': len(selected),
                                   'exactTopologyAndExpandedUvMatches': sum(len(item['matchedMeshes']) for item in clip_proofs),
                                   'arbitraryTextureMappings': False}
                entries.append({key: group[key] for key in ('id', 'subjectId', 'label', 'game', 'form', 'geometryScope', 'modelRole')}
                               | {'sourcePlatform': 'PC / Computer', 'sourceEdition': group['sourceEdition'],
                                  'sourceGameLabel': 'Resident Evil Revelations',
                                  'sourceClass': 'secondary-community-model-export', 'archive': archive, 'model': model,
                                  'textures': textures, 'clips': clips, 'basePoseReferences': base_poses,
                                  'sources': package['sources'],
                                  'materialBindings': material_record, 'limits': group['limits'],
                                  'rigSourcePresent': True, 'rigProductionFinalized': False,
                                  'canonicalFidelityCertified': False, 'combatIntegrated': False, 'generatedKeyframes': 0})
    all_clips = [clip for entry in entries for clip in entry['clips']]
    manifest = {'schema': 're.bow.rigged-motion-pack/1', 'release': 'R25',
                'summary': {'identities': len({entry['subjectId'] for entry in entries}),
                            'weightedSourceRigs': len(entries), 'sourceAnimationFiles': len(all_clips),
                            'directAnimationFiles': 0, 'sourceOriginalArchivePreserved': True,
                            'sourceBasePoseFiles': sum(len(entry['basePoseReferences']) for entry in entries),
                            'sourceFbxFilesInAnimationFolders': len(all_clips)+sum(len(entry['basePoseReferences']) for entry in entries),
                            'positiveTimeMotionFiles': sum(not clip['positiveTimePoseOnly'] for clip in all_clips),
                            'positiveTimePoseFiles': sum(clip['positiveTimePoseOnly'] for clip in all_clips),
                            'bodyMotionFiles': sum(not clip['positiveTimePoseOnly'] for entry in entries if entry['modelRole'] != 'associated-object' for clip in entry['clips']),
                            'associatedObjectMotionFiles': sum(not clip['positiveTimePoseOnly'] for entry in entries if entry['modelRole'] == 'associated-object' for clip in entry['clips']),
                            'generatedKeyframes': 0, 'canonicalFidelityCertified': 0}, 'entries': entries}
    preserve('manifest.json', (json.dumps(manifest, ensure_ascii=False, indent=2)+'\n').encode())
    for path, payload in pending.items():
        if path.exists() and (path.is_symlink() or path.read_bytes() != payload):
            raise ValueError('Refusing to replace different delivered bytes: '+str(path))
        if check and not path.is_file():
            raise ValueError('Missing delivered source: '+str(path))
    if not check:
        for path, payload in pending.items():
            SOURCE.write_preserving(path, payload)
    return manifest, inventories


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--request', type=Path, default=ROOT/'docs/R25_MOTION_IMPORT_REQUEST.json')
    parser.add_argument('--archive-dir', type=Path, default=ROOT/'modules/fidelity-r25/motion')
    parser.add_argument('--output', type=Path, default=ROOT/'modules/fidelity-r25/motion')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    manifest, _ = build(json.loads(args.request.read_text()), args.archive_dir, args.output, args.check)
    print(json.dumps(manifest['summary']))


if __name__ == '__main__':
    main()
