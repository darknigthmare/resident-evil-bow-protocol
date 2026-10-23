#!/usr/bin/env python3
"""Publish reviewed OBJ exports with original archives and validated local files."""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import math
from pathlib import Path, PurePosixPath
import stat
import tempfile
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
MAX_ZIP = 25 * 1024 * 1024
MAX_EXPANDED = 150 * 1024 * 1024


def digest(data):
    return hashlib.sha256(data).hexdigest()


def safe_path(value):
    if not isinstance(value, str) or not value or '\\' in value or ':' in value or any(c in value for c in '%?#'):
        raise ValueError('Unsafe resource path')
    path = PurePosixPath(value)
    if path.is_absolute() or path == PurePosixPath('.') or '..' in path.parts or any(ord(c) < 32 for c in value):
        raise ValueError('Unsafe resource path')
    return path


def validated_zip(data):
    if len(data) > MAX_ZIP:
        raise ValueError('Archive exceeds byte limit')
    archive = zipfile.ZipFile(io.BytesIO(data))
    members = archive.infolist()
    if len(members) > 2048 or sum(x.file_size for x in members) > MAX_EXPANDED:
        raise ValueError('Expanded archive exceeds limits')
    seen = set()
    for member in members:
        normalized = str(safe_path(member.filename))
        if normalized in seen or stat.S_ISLNK(member.external_attr >> 16) or member.flag_bits & 1:
            raise ValueError('Duplicate, linked or encrypted archive member')
        seen.add(normalized)
    return archive


def object_stats(data):
    vertices, faces, uvs, normals = [], 0, 0, 0
    for line in data.decode('utf-8', 'strict').splitlines():
        parts = line.split()
        if not parts:
            continue
        if parts[0] == 'v':
            xyz = list(map(float, parts[1:4]))
            if len(xyz) != 3 or any(not math.isfinite(v) or abs(v) > 1e9 for v in xyz):
                raise ValueError('Invalid OBJ coordinate')
            vertices.append(xyz)
        elif parts[0] == 'f':
            faces += 1
        elif parts[0] == 'vt':
            uvs += 1
        elif parts[0] == 'vn':
            normals += 1
    if not vertices or not faces or len(vertices) > 500000 or faces > 500000:
        raise ValueError('OBJ geometry count outside bounds')
    return {'vertices': len(vertices), 'faces': faces, 'uvs': uvs, 'normals': normals,
            'boundsMin': [min(v[i] for v in vertices) for i in range(3)],
            'boundsMax': [max(v[i] for v in vertices) for i in range(3)],
            'bones': 0, 'skinWeights': 0, 'animationClips': 0}


def collada_structure(data):
    if len(data) > 8 * 1024 * 1024 or b'<!DOCTYPE' in data or b'<!ENTITY' in data:
        raise ValueError('Unsafe or oversized Collada document')
    root = ET.fromstring(data)
    ns = {'c': 'http://www.collada.org/2005/11/COLLADASchema'}
    for item in root.findall('.//c:float_array', ns) + root.findall('.//c:matrix', ns):
        values = list(map(float, (item.text or '').split()))
        if any(not math.isfinite(value) for value in values):
            raise ValueError('Non-finite Collada numeric data')
    joints = root.findall('.//c:node[@type="JOINT"]', ns)
    known_joints = {item.get('sid') for item in joints}
    controllers = root.findall('.//c:controller/c:skin', ns)
    weighted_vertices, influences, max_influences = 0, 0, 0
    for skin in controllers:
        sources = {item.get('id'): item for item in skin.findall('c:source', ns)}
        weights = skin.find('c:vertex_weights', ns)
        inputs = {item.get('semantic'): item for item in weights.findall('c:input', ns)}
        joint_input, weight_input = inputs['JOINT'], inputs['WEIGHT']
        joint_names = sources[joint_input.get('source').removeprefix('#')].find('c:Name_array', ns).text.split()
        if not set(joint_names).issubset(known_joints):
            raise ValueError('Skin refers to unknown joint')
        weight_values = list(map(float, sources[weight_input.get('source').removeprefix('#')].find('c:float_array', ns).text.split()))
        if any(not math.isfinite(value) or not 0 <= value <= 1 for value in weight_values):
            raise ValueError('Invalid Collada skin weight')
        counts = list(map(int, weights.find('c:vcount', ns).text.split()))
        indices = list(map(int, weights.find('c:v', ns).text.split()))
        stride = max(int(item.get('offset')) for item in inputs.values()) + 1
        if len(counts) != int(weights.get('count')) or len(indices) != sum(counts) * stride:
            raise ValueError('Skin influence counts do not match')
        offset = 0
        for count in counts:
            if count < 1 or count > 16:
                raise ValueError('Skin influence count outside bounds')
            total = 0
            for _ in range(count):
                joint_index = indices[offset + int(joint_input.get('offset'))]
                weight_index = indices[offset + int(weight_input.get('offset'))]
                if not 0 <= joint_index < len(joint_names) or not 0 <= weight_index < len(weight_values):
                    raise ValueError('Skin influence index outside bounds')
                total += weight_values[weight_index]
                offset += stride
            if abs(total - 1) > 0.001:
                raise ValueError('Skin weights not normalized')
        weighted_vertices += len(counts)
        influences += sum(counts)
        max_influences = max(max_influences, max(counts))
    image_paths = []
    for item in root.findall('.//c:library_images/c:image/c:init_from', ns):
        image = str(safe_path(item.text.strip()))
        if PurePosixPath(image).suffix.lower() != '.png':
            raise ValueError('Only preserved local PNG Collada textures accepted')
        if image not in image_paths:
            image_paths.append(image)
    return {'jointNodes': len(joints), 'skinControllers': len(controllers),
            'weightedVertices': weighted_vertices, 'influences': influences,
            'maxInfluencesPerVertex': max_influences,
            'animationChannels': len(root.findall('.//c:channel', ns)),
            'animationClips': len(root.findall('.//c:library_animation_clips/c:animation_clip', ns)),
            'upAxis': root.findtext('c:asset/c:up_axis', namespaces=ns),
            'authoringTool': root.findtext('c:asset/c:contributor/c:authoring_tool', namespaces=ns),
            'sourceRigOriginCertified': False}, image_paths


def prepare(request, cache_root, roster):
    if request['schema'] != 're.bow.visual-model-import/1':
        raise ValueError('Unknown import request schema')
    output, sources, archives = {}, [], {}
    cache_root = cache_root.resolve()
    for source in request['sources']:
        asset_id = source['assetId']
        if type(asset_id) is not int or asset_id in archives:
            raise ValueError('Invalid or duplicate asset ID')
        paths = {}
        for kind in ['page', 'archive', 'preview']:
            metadata = source[kind]
            path = (cache_root / safe_path(metadata['cachePath'])).resolve(strict=True)
            if not path.is_relative_to(cache_root):
                raise ValueError('Cache path escapes input directory')
            data = path.read_bytes()
            if digest(data) != metadata['sha256'] or len(data) != metadata['bytes']:
                raise ValueError('Source bytes changed')
            rel = {'page': f'sources/asset-{asset_id}.html.txt', 'archive': f'archives/asset-{asset_id}.zip',
                   'preview': f'previews/asset-{asset_id}.png'}[kind]
            output[rel] = data
            paths[kind] = {**metadata, 'path': rel}
            del paths[kind]['cachePath']
        if source['archive']['declaredHref'].encode() not in output[paths['page']['path']]:
            raise ValueError('Archive href missing from captured source page')
        archives[asset_id] = validated_zip(output[paths['archive']['path']])
        sources.append({'assetId': asset_id, **paths})
    entries, seen = [], set()
    source_map = {s['assetId']: s for s in sources}
    for item in request['entries']:
        if item['id'] in seen:
            raise ValueError('Duplicate model entry')
        seen.add(item['id'])
        uid = item.get('subjectId') or item.get('candidateUid')
        if uid not in roster or (item.get('subjectId') and item['game'] != roster[uid]['game']):
            raise ValueError('Unknown catalogue relation or mismatched certified game')
        archive = archives[item['assetId']]
        model_name = str(safe_path(item['modelMember']))
        if PurePosixPath(model_name).suffix.lower() != '.obj':
            raise ValueError('Only static OBJ exports accepted')
        model_data = archive.read(model_name)
        parent = PurePosixPath(model_name).parent
        mtls = [line.partition(' ')[2].strip() for line in model_data.decode().splitlines() if line.startswith('mtllib ')]
        if len(mtls) != 1:
            raise ValueError('Exactly one local material library required')
        material_name = str(parent / safe_path(mtls[0]))
        material_data = archive.read(material_name)
        maps = []
        for line in material_data.decode().splitlines():
            parts = line.strip().split(None, 1)
            if parts and parts[0].startswith('map_'):
                if len(parts) != 2 or parts[1].startswith('-'):
                    raise ValueError('Unreviewed texture map options')
                texture = str(PurePosixPath(material_name).parent / safe_path(parts[1]))
                if PurePosixPath(texture).suffix.lower() != '.png':
                    raise ValueError('Only preserved PNG textures accepted')
                if texture not in maps:
                    maps.append(texture)
        if not maps:
            raise ValueError('No texture map in selected material')
        def publish(member):
            data = archive.read(member)
            rel = 'models/asset-' + str(item['assetId']) + '/' + member
            output[rel] = data
            return {'path': rel, 'sha256': digest(data), 'bytes': len(data)}
        source = source_map[item['assetId']]
        entry = {**item, 'model': publish(model_name), 'materials': publish(material_name),
                        'textures': [publish(name) for name in maps], 'format': 'OBJ',
                        'geometry': object_stats(model_data), 'sourcePage': source['page']['url'],
                        'archivePath': source['archive']['path'], 'archiveSha': source['archive']['sha256'],
                        'preview': source['preview'], 'rigComplete': False, 'animationComplete': False,
                        'catalogueFidelityCertified': False}
        if item.get('rigMember'):
            rig_member = str(safe_path(item['rigMember']))
            structure, image_paths = collada_structure(archive.read(rig_member))
            entry['publishedRig'] = {'format': 'COLLADA', 'model': publish(rig_member),
                                     'textures': [publish(str(PurePosixPath(rig_member).parent / image)) for image in image_paths],
                                     'structure': structure, 'referenceOnly': True,
                                     'originCertification': 'Published export; console bone provenance not documented.'}
            if item.get('rigFbxMember'):
                fbx_member = str(safe_path(item['rigFbxMember']))
                fbx_data = archive.read(fbx_member)
                if not fbx_data.startswith(b'Kaydara FBX Binary  '):
                    raise ValueError('Published FBX signature absent')
                entry['publishedRig']['alternateFormats'] = [{
                    'format': 'FBX',
                    'model': {'member': fbx_member, 'sha256': digest(fbx_data), 'bytes': len(fbx_data)},
                    'textures': entry['textures'] + entry['publishedRig']['textures'],
                    'archiveMemberOnly': True,
                    'geometryRewritten': False,
                    'sourceRigOriginCertified': False}]
        entries.append(entry)
    for source in request['sources']:
        archive = archives[source['assetId']]
        for member in archive.infolist():
            if PurePosixPath(member.filename).name.lower() == 'readme.txt':
                output['models/asset-' + str(source['assetId']) + '/' + member.filename] = archive.read(member)
    manifest = {'schema': 're.bow.native-model-reference-pack/1',
                'observedAtUtc': request['observedAtUtc'], 'sources': sources, 'entries': entries,
                'counts': {'archives': len(sources), 'modelViews': len(entries), 'rigs': 0,
                           'publishedRigReferences': sum('publishedRig' in entry for entry in entries),
                           'animationClips': 0, 'catalogueFidelityCertified': 0},
                'files': [{'path': path, 'bytes': len(data), 'sha256': digest(data)} for path, data in output.items()]}
    output['manifest.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--request', type=Path, required=True)
    inputs = parser.add_mutually_exclusive_group(required=True)
    inputs.add_argument('--cache-root', type=Path)
    inputs.add_argument('--verify-published', type=Path)
    parser.add_argument('--output', type=Path, default=ROOT / 'modules/fidelity-r24/visual')
    args = parser.parse_args()
    request = json.loads(args.request.read_text())
    roster = {x['id']: x for x in json.loads((ROOT / 'data/roster.json').read_text())['catalog']}
    if args.verify_published:
        published = args.verify_published.resolve(strict=True)
        manifest = json.loads((published / 'manifest.json').read_text())
        source_map = {s['assetId']: s for s in manifest['sources']}
        with tempfile.TemporaryDirectory() as temporary:
            cache = Path(temporary)
            for source in request['sources']:
                for kind in ['page', 'archive', 'preview']:
                    path = (published / safe_path(source_map[source['assetId']][kind]['path'])).resolve(strict=True)
                    if not path.is_relative_to(published):
                        raise ValueError('Published source escapes module directory')
                    target = cache / safe_path(source[kind]['cachePath'])
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(path.read_bytes())
            expected = prepare(request, cache, roster)
        for relative, data in expected.items():
            if (published / relative).read_bytes() != data:
                raise ValueError('Published resource differs from reviewed import: ' + relative)
        print(json.dumps({'verifiedFiles': len(expected), 'modelViews': len(manifest['entries']),
                          'publishedRigReferences': manifest['counts']['publishedRigReferences']}))
        return
    output = prepare(request, args.cache_root, roster)
    for relative, data in output.items():
        path = args.output / relative
        if relative != 'manifest.json' and path.exists() and path.read_bytes() != data:
            raise ValueError('Refusing to overwrite different existing resource: ' + str(path))
    for relative, data in output.items():
        path = args.output / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    print(json.dumps({'files': len(output), 'bytes': sum(len(x) for x in output.values()), 'output': str(args.output)}))


if __name__ == '__main__':
    main()
