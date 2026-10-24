#!/usr/bin/env python3
"""Inspect and preserve bounded original rig/animation members from a source ZIP.

Downloaded FBX is parsed as data, never executed. No skeleton, timing, pose or
animation curve is authored, retargeted or mirrored by this tool.
"""
from __future__ import annotations
import argparse
from collections import Counter
import hashlib
import io
import json
import math
from pathlib import Path, PurePosixPath
import re
import stat
import struct
from urllib.parse import urlsplit
import zipfile
import zlib

MAX_ARCHIVE_BYTES = 150 * 1024 * 1024
MAX_MEMBER_BYTES = 24 * 1024 * 1024
MAX_DECLARED_BYTES = 1024 * 1024 * 1024
MAX_ARRAY_BYTES = 32 * 1024 * 1024
FBX_TICKS_PER_SECOND = 46186158000


def sha(data):
    return hashlib.sha256(data).hexdigest()


def https(value):
    parsed = urlsplit(value)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError('Expected a credential-free HTTPS source URL')
    return value


class BinaryFBX:
    def __init__(self, payload):
        if not payload.startswith(b'Kaydara FBX Binary  \x00\x1a\x00') or len(payload) < 27:
            raise ValueError('Expected binary FBX data')
        self.payload, self.position, self.nodes = payload, 27, 0
        self.decoded_array_bytes = 0
        self.version = struct.unpack_from('<I', payload, 23)[0]
        if not 7000 <= self.version <= 7700:
            raise ValueError('Unsupported binary FBX version')
        self.large = self.version >= 7500

    def take(self, count):
        if count < 0 or self.position + count > len(self.payload):
            raise ValueError('Truncated FBX data')
        result = self.payload[self.position:self.position + count]
        self.position += count
        return result

    def unpack(self, code):
        return struct.unpack('<' + code, self.take(struct.calcsize('<' + code)))[0]

    def property(self):
        kind = self.take(1).decode('ascii')
        scalar = {'Y':'h', 'C':'?', 'I':'i', 'F':'f', 'D':'d', 'L':'q'}
        if kind in scalar:
            return self.unpack(scalar[kind])
        if kind in ('S', 'R'):
            size = self.unpack('I')
            if size > MAX_ARRAY_BYTES:
                raise ValueError('FBX byte property exceeds limit')
            value = self.take(size)
            return value.decode('utf-8', 'replace') if kind == 'S' else {'rawBytes':size,'sha256':sha(value)}
        arrays = {'f':'f', 'd':'d', 'l':'q', 'i':'i', 'b':'?', 'c':'b'}
        if kind not in arrays:
            raise ValueError('Unsupported FBX property type')
        count, encoding, compressed = self.unpack('I'), self.unpack('I'), self.unpack('I')
        code = arrays[kind]
        expected = count * struct.calcsize('<' + code)
        self.decoded_array_bytes += expected
        if expected > MAX_ARRAY_BYTES or compressed > MAX_ARRAY_BYTES or encoding not in (0, 1):
            raise ValueError('FBX array exceeds limits or uses unsupported encoding')
        if self.decoded_array_bytes > 64 * 1024 * 1024:
            raise ValueError('FBX cumulative decoded array limit exceeded')
        encoded = self.take(compressed)
        if encoding:
            decoder = zlib.decompressobj()
            decoded = decoder.decompress(encoded, expected + 1)
            if not decoder.eof or decoder.unused_data or decoder.unconsumed_tail:
                raise ValueError('FBX compressed array is incomplete or exceeds its declared size')
        else:
            decoded = encoded
        if len(decoded) != expected:
            raise ValueError('FBX array length mismatch')
        return list(struct.unpack('<' + str(count) + code, decoded))

    def node(self, depth=0):
        if depth > 64 or self.nodes > 200_000:
            raise ValueError('FBX tree exceeds its depth/node limit')
        header = 'Q' if self.large else 'I'
        end, count, properties_size = self.unpack(header), self.unpack(header), self.unpack(header)
        name_size = self.unpack('B')
        if end == count == properties_size == name_size == 0:
            return None
        if not self.position <= end <= len(self.payload) or count > 200_000:
            raise ValueError('Invalid FBX node bounds')
        self.nodes += 1
        name = self.take(name_size).decode('utf-8', 'strict')
        property_start = self.position
        properties = [self.property() for _ in range(count)]
        if self.position - property_start != properties_size:
            raise ValueError('FBX property byte count mismatch')
        children = []
        null_size = 25 if self.large else 13
        while self.position < end:
            if end - self.position < null_size:
                raise ValueError('FBX child header crosses its parent')
            child = self.node(depth + 1)
            if child is None:
                if self.position != end:
                    raise ValueError('FBX null child does not terminate its parent')
                break
            children.append(child)
        if self.position != end:
            raise ValueError('FBX node end mismatch')
        return {'name':name,'properties':properties,'children':children}

    def parse(self):
        result = []
        while self.position + (25 if self.large else 13) <= len(self.payload):
            node = self.node()
            if node is None:
                break
            result.append(node)
        return result


def inspect_fbx(payload):
    reader = BinaryFBX(payload)
    roots = reader.parse()
    def walk(nodes):
        for node in nodes:
            yield node
            yield from walk(node['children'])
    all_nodes = list(walk(roots))
    counts = Counter(node['name'] for node in all_nodes)
    objects = next((node for node in roots if node['name'] == 'Objects'), {'children':[]})['children']
    models = {node['properties'][0]:node for node in objects if node['name'] == 'Model' and len(node['properties']) >= 3}
    def clean_name(node):
        return node['properties'][1].split('\x00')[0]
    bones = [clean_name(node) for node in models.values() if node['properties'][2] in ('LimbNode', 'Limb', 'Root')]
    deformers = [node for node in objects if node['name'] == 'Deformer' and len(node['properties']) >= 3]
    clusters = [node for node in deformers if node['properties'][2] == 'Cluster']
    skin_count = sum(node['properties'][2] == 'Skin' for node in deformers)
    weights_count, invalid_weights, invalid_assignments = 0, 0, 0
    for cluster in clusters:
        indices = next((child['properties'][0] for child in cluster['children'] if child['name']=='Indexes' and child['properties']), [])
        weights = next((child['properties'][0] for child in cluster['children'] if child['name']=='Weights' and child['properties']), [])
        invalid_assignments += int(len(indices)!=len(weights)) + sum(type(value) is not int or value<0 for value in indices)
        for child in cluster['children']:
            if child['name'] == 'Weights' and child['properties']:
                weights = child['properties'][0]
                weights_count += len(weights)
                invalid_weights += sum(not isinstance(value, (int,float)) or not math.isfinite(value) or value < 0 for value in weights)
    key_times = [value for node in all_nodes if node['name'] == 'KeyTime' and node['properties'] for value in node['properties'][0]]
    keys = sorted(set(key_times))
    stacks = [clean_name(node) for node in objects if node['name'] == 'AnimationStack' and len(node['properties']) >= 2]
    curves = [node for node in objects if node['name'] == 'AnimationCurve']
    varying_curves = 0
    varying_nonnegative_curves = 0
    nonnegative_curves_above_1e4 = 0
    invalid_curve_values = 0
    for curve in curves:
        values = next((child['properties'][0] for child in curve['children'] if child['name']=='KeyValueFloat' and child['properties']), [])
        times = next((child['properties'][0] for child in curve['children'] if child['name']=='KeyTime' and child['properties']), [])
        if len(times)!=len(values):
            raise ValueError('FBX curve times and values differ in length')
        nonnegative=[value for tick,value in zip(times,values) if tick>=0]
        delta=max(nonnegative)-min(nonnegative) if nonnegative else 0
        varying_nonnegative_curves += int(delta>0)
        nonnegative_curves_above_1e4 += int(delta>1e-4)
        invalid_curve_values += sum(not isinstance(value,(int,float)) or not math.isfinite(value) for value in values)
        varying_curves += int(len(set(values))>1)
    connections = next((node for node in roots if node['name'] == 'Connections'), {'children':[]})['children']
    animated_models = set()
    curve_nodes = {node['properties'][0] for node in objects if node['name'] == 'AnimationCurveNode'}
    for connection in connections:
        values = connection['properties']
        if connection['name'] == 'C' and len(values) >= 3 and values[1] in curve_nodes and values[2] in models:
            animated_models.add(clean_name(models[values[2]]))
    return {'format':'FBX-binary','version':reader.version,'sha256':sha(payload),'bytes':len(payload),
            'boneCount':len(bones),'boneNames':bones,'skinCount':skin_count,'skinClusterCount':len(clusters),
            'skinWeightCount':weights_count,'invalidSkinWeights':invalid_weights,'invalidSkinAssignments':invalid_assignments,
            'animationStacks':stacks,'animationCurveCount':len(curves),'varyingAnimationCurveCount':varying_curves,
            'varyingNonnegativeAnimationCurveCount':varying_nonnegative_curves,
            'varyingNonnegativeAnimationCurveCountAbove1eMinus4':nonnegative_curves_above_1e4,
            'positiveTimePoseOnly':bool(curves and key_times) and varying_nonnegative_curves==0,
            'playbackVariationScope':'nonnegative-time-motion' if varying_nonnegative_curves else 'pose-only-after-time-zero' if curves and key_times else 'no-keyed-animation',
            'invalidCurveValues':invalid_curve_values,'keyTimeCount':len(key_times),
            'uniqueKeyTimeCount':len(keys),'keyTimeStart':str(keys[0]) if keys else None,
            'keyTimeEnd':str(keys[-1]) if keys else None,'ticksPerSecond':FBX_TICKS_PER_SECOND,
            'nativeKeyTimesTicks':[str(value) for value in keys],
            'durationSeconds':(keys[-1]-keys[0])/FBX_TICKS_PER_SECOND if len(keys)>1 else 0,
            'animatedModelNames':sorted(animated_models),'geometryCount':counts['Geometry'],
            'hasWeightedRig':len(bones)>0 and skin_count>0 and len(clusters)>0 and weights_count>0 and invalid_weights==0 and invalid_assignments==0,
            'hasNativeAnimationCurves':len(curves)>0 and varying_curves>0 and len(keys)>1 and invalid_curve_values==0,
            'canonicalFidelityCertified':False}


def inspect_archive(archive):
    archive = Path(archive)
    if archive.is_symlink() or not archive.is_file() or archive.stat().st_size > MAX_ARCHIVE_BYTES:
        raise ValueError('Expected a bounded regular source ZIP')
    with zipfile.ZipFile(archive) as source:
        items = source.infolist()
        if len(items) > 4000 or sum(item.file_size for item in items) > MAX_DECLARED_BYTES:
            raise ValueError('ZIP member count or expanded size exceeds the limit')
        names = set()
        result = []
        for item in items:
            name = PurePosixPath(item.filename)
            mode = item.external_attr >> 16
            if name.is_absolute() or '..' in name.parts or '\\' in item.filename or ':' in item.filename or item.filename in names or stat.S_ISLNK(mode):
                raise ValueError('Unsafe or duplicate ZIP member')
            names.add(item.filename)
            if item.file_size > MAX_MEMBER_BYTES or item.flag_bits & 1:
                raise ValueError('ZIP member is oversized or encrypted')
            record = {'path':item.filename,'bytes':item.file_size,'compressedBytes':item.compress_size}
            if item.filename.lower().endswith('.fbx'):
                record['fbx'] = inspect_fbx(source.read(item))
            result.append(record)
    return result


def mesh_material_evidence(payload):
    """Read explicit source texture connections and polygon-corner UV bindings."""
    roots=BinaryFBX(payload).parse()
    objects=next(node for node in roots if node['name']=='Objects')['children']
    connections=next(node for node in roots if node['name']=='Connections')['children']
    by_id={node['properties'][0]:node for node in objects if node['properties']}
    links=[node['properties'] for node in connections if node['name']=='C' and len(node['properties'])>=3]
    meshes=[]
    for model in objects:
        if model['name']!='Model' or len(model['properties'])<3 or model['properties'][2]!='Mesh':
            continue
        model_id=model['properties'][0]
        geometry_ids=[link[1] for link in links if link[0]=='OO' and link[2]==model_id and by_id.get(link[1],{}).get('name')=='Geometry']
        if len(geometry_ids)!=1:
            raise ValueError('A mesh must have exactly one native geometry')
        geometry=by_id[geometry_ids[0]]
        indices=next(node['properties'][0] for node in geometry['children'] if node['name']=='PolygonVertexIndex')
        vertices=next(node['properties'][0] for node in geometry['children'] if node['name']=='Vertices')
        uv_layer=next(node for node in geometry['children'] if node['name']=='LayerElementUV')
        uv=next(node['properties'][0] for node in uv_layer['children'] if node['name']=='UV')
        uv_indices=next(node['properties'][0] for node in uv_layer['children'] if node['name']=='UVIndex')
        if len(uv_indices)!=len(indices) or any(type(index)is not int or index<0 or index*2+1>=len(uv) for index in uv_indices):
            raise ValueError('Invalid native polygon-corner UV indices')
        expanded=[component for index in uv_indices for component in uv[index*2:index*2+2]]
        materials=[]
        for link in links:
            material=by_id.get(link[1])
            if link[0]!='OO' or link[2]!=model_id or not material or material['name']!='Material':
                continue
            texture_links=[]
            for texture_link in links:
                texture=by_id.get(texture_link[1])
                if texture_link[0]!='OP' or texture_link[2]!=link[1] or not texture or texture['name']!='Texture':
                    continue
                relative=next((node['properties'][0] for node in texture['children'] if node['name']=='RelativeFilename'),None)
                texture_links.append({'property':texture_link[3],'relativeFilename':relative})
            materials.append({'name':material['properties'][1].split('\x00')[0],'textures':texture_links})
        meshes.append({'name':model['properties'][1].split('\x00')[0],'vertexCount':len(vertices)//3,
          'polygonVertexCount':len(indices),'topologySha256':sha(struct.pack('<'+str(len(indices))+'i',*indices)),
          'expandedUvSha256':sha(struct.pack('<'+str(len(expanded))+'d',*expanded)),
          'materials':materials})
    return {'sourceSha256':sha(payload),'meshes':meshes}


def verify_material_transfer(body,clip):
    """Permit only exact topology/UV correspondence to an explicit same-package material."""
    if len(body['meshes'])!=len(clip['meshes']):
        raise ValueError('Body/clip native mesh count differs')
    matches=[]
    for base in body['meshes']:
        candidate=[mesh for mesh in clip['meshes'] if mesh['name']==base['name'] or mesh['name'].startswith(base['name']+' (SkinnedCharacter')]
        if len(candidate)!=1:
            raise ValueError('Body/clip native mesh names do not match uniquely')
        mesh=candidate[0]
        for field in ['vertexCount','polygonVertexCount','topologySha256','expandedUvSha256']:
            if mesh[field]!=base[field]:
                raise ValueError('Body/clip topology or polygon-corner UVs differ')
        if not base['materials'] or any(not material['textures'] for material in base['materials']):
            raise ValueError('Body has no explicit native texture assignment')
        matches.append({'bodyMeshName':base['name'],'clipMeshName':mesh['name'],
          'topologySha256':base['topologySha256'],'expandedUvSha256':base['expandedUvSha256'],
          'nativeBodyMaterials':base['materials']})
    return {'bodySourceSha256':body['sourceSha256'],'clipSourceSha256':clip['sourceSha256'],
      'matchedMeshes':matches,'arbitraryTextureMapping':False,'sourceFilesChanged':False}


def write_preserving(path, payload):
    if path.exists():
        if path.is_symlink() or path.read_bytes() != payload:
            raise ValueError('Refusing to replace different output')
        return
    path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('xb') as stream:
        stream.write(payload)


def import_members(archive, output, selection, expected_sha256):
    archive, output = Path(archive), Path(output).absolute()
    if archive.is_symlink() or archive.stat().st_size > MAX_ARCHIVE_BYTES or sha(archive.read_bytes()) != expected_sha256:
        raise ValueError('Original archive SHA-256 mismatch or unsafe source')
    for directory in [output,*output.parents]:
        if directory.is_symlink():
            raise ValueError('Symlinked destination is forbidden')
    inventory = inspect_archive(archive)
    declared = {item['path']:item for item in inventory}
    pending, result, destinations = [], [], set()
    with zipfile.ZipFile(archive) as source:
        for member, relative in selection.items():
            name = PurePosixPath(relative)
            if not relative or not name.parts or name.is_absolute() or '..' in name.parts or '\\' in relative or ':' in relative or not member in declared:
                raise ValueError('Unsafe destination or undeclared selected member')
            if str(name) in destinations:
                raise ValueError('Duplicate selected destination')
            destinations.add(str(name))
            payload = source.read(member)
            path = output.joinpath(*name.parts)
            for parent in [path.parent,*path.parent.parents]:
                if parent.is_symlink():
                    raise ValueError('Symlinked selected destination is forbidden')
            pending.append((path,payload))
            record = {**declared[member],'deliveredPath':relative,'sha256':sha(payload)}
            result.append(record)
    for path,payload in pending:
        if path.exists() and (path.is_symlink() or path.read_bytes()!=payload):
            raise ValueError('Refusing to replace a different selected output')
    for path,payload in pending:
        write_preserving(path,payload)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive',type=Path,required=True)
    parser.add_argument('--inventory',type=Path)
    parser.add_argument('--request',type=Path)
    parser.add_argument('--output',type=Path)
    args=parser.parse_args()
    if bool(args.request)!=bool(args.output) or not(args.inventory or args.request):
        parser.error('Use --inventory, or --request together with --output')
    inventory=inspect_archive(args.archive)
    if args.inventory:
        args.inventory.write_text(json.dumps({'schema':'re.bow.rigged-motion-inventory/1',
          'sourceArchiveSha256':sha(args.archive.read_bytes()),'entries':inventory},ensure_ascii=False,indent=2)+'\n')
    if args.request:
        request=json.loads(args.request.read_text())
        if request.get('schema')!='re.bow.rigged-motion-import/1':
            raise ValueError('Unexpected rigged source import request')
        https(request['archive']['url'])
        import_members(args.archive,args.output,request['selection'],request['archive']['sha256'])
    print(json.dumps({'fbxFiles':sum('fbx' in item for item in inventory),
      'weightedRigs':sum(item.get('fbx',{}).get('hasWeightedRig',False) for item in inventory),
      'animatedFiles':sum(item.get('fbx',{}).get('hasNativeAnimationCurves',False) for item in inventory)}))


if __name__=='__main__':
    main()
