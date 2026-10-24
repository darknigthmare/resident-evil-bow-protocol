#!/usr/bin/env python3
"""Publish exact model archives and reviewed OBJ/FBX members without repairing them."""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import io
import json
from pathlib import Path, PurePosixPath
import stat
from urllib.parse import urlsplit
import zipfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MAX_ARCHIVE = 40 * 1024 * 1024
MAX_EXPANDED = 180 * 1024 * 1024
MAX_MEMBER = 24 * 1024 * 1024


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


MOTION = module('motion_source_r25_visual', 'import-rigged-motion-r24.py')
VISUAL = module('visual_source_r25_visual', 'import-visual-models-r24.py')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def safe_path(value):
    if not isinstance(value, str) or not value or '\\' in value or ':' in value or any(c in value for c in '%?#'):
        raise ValueError('Unsafe resource path')
    path = PurePosixPath(value)
    if path.is_absolute() or '..' in path.parts or str(path) == '.' or any(ord(c) < 32 for c in value):
        raise ValueError('Unsafe resource path')
    return str(path)


def archive(data):
    if len(data) > MAX_ARCHIVE:
        raise ValueError('Archive exceeds byte limit')
    result = zipfile.ZipFile(io.BytesIO(data))
    infos = result.infolist()
    if len(infos) > 512 or sum(i.file_size for i in infos) > MAX_EXPANDED:
        raise ValueError('Expanded archive exceeds bounds')
    seen = set()
    for item in infos:
        name = safe_path(item.filename).casefold()
        if name in seen or stat.S_ISLNK(item.external_attr >> 16) or item.flag_bits & 1 or item.file_size > MAX_MEMBER:
            raise ValueError('Duplicate, linked, encrypted or oversized archive member')
        seen.add(name)
        if item.file_size > max(2048, item.compress_size) * 1000:
            raise ValueError('Archive compression ratio exceeds bounds')
    return result


def checked_input(cache, metadata):
    path = cache / safe_path(metadata['cachePath'])
    if path.is_symlink() or not path.resolve(strict=True).is_relative_to(cache.resolve()):
        raise ValueError('Source cache path leaves its input directory')
    if type(metadata['bytes']) is not int or not 0 <= metadata['bytes'] <= MAX_ARCHIVE or path.stat().st_size != metadata['bytes']:
        raise ValueError('Source byte length exceeds bounds or differs from its receipt')
    payload = path.read_bytes()
    if len(payload) != metadata['bytes'] or sha(payload) != metadata['sha256']:
        raise ValueError('Source bytes differ from their recorded receipt')
    return payload


def png(payload):
    with Image.open(io.BytesIO(payload)) as image:
        if image.format != 'PNG' or image.width * image.height > 32 * 1024 * 1024:
            raise ValueError('Texture is not a bounded original PNG')
        image.verify()


def prepare(request, cache, roster):
    if request.get('schema') != 're.bow.visual-rig-import/1':
        raise ValueError('Unknown visual import contract')
    output, sources, archives = {}, [], {}
    for item in request['sources']:
        asset_id = item['assetId']
        if type(asset_id) is not int or asset_id in archives:
            raise ValueError('Source asset IDs must be unique integers')
        records = {}
        for kind in ('page', 'archive', 'preview', 'corroboration'):
            receipt = item[kind]
            payload = checked_input(cache, receipt)
            path = safe_path(receipt['outputPath'])
            if path in output:
                raise ValueError('Output path collision')
            if not receipt['url'].startswith('https://'):
                raise ValueError('Source provenance requires HTTPS')
            output[path] = payload
            records[kind] = {key: value for key, value in receipt.items() if key not in ('cachePath', 'outputPath')}
            records[kind]['path'] = path
        if item['declaredDownloadHref'].encode() not in output[records['page']['path']]:
            raise ValueError('Archive link is absent from the captured model page')
        page = output[records['page']['path']].decode('utf-8', 'strict')
        if item['name'] not in page or item['sourceGameLabel'] not in page:
            raise ValueError('Source page does not bind this model name and game')
        if urlsplit(records['preview']['url']).path not in page:
            raise ValueError('Preview image is not linked from the source page')
        png(output[records['preview']['path']])
        archives[asset_id] = archive(output[records['archive']['path']])
        sources.append({'assetId': asset_id, 'name': item['name'], 'sourceGameLabel': item['sourceGameLabel'], **records})
    by_id = {s['assetId']: s for s in sources}
    entries, identities = [], set()
    for item in request['entries']:
        if item['id'] in identities:
            raise ValueError('Duplicate model identifier')
        identities.add(item['id'])
        uid = item.get('subjectId') or item.get('candidateUid')
        if uid not in roster or item.get('subjectId') and item['game'] != roster[uid]['game']:
            raise ValueError('Unknown identity or mismatched game attribution')
        source = by_id[item['assetId']]
        model_archive = archives[item['assetId']]
        name = safe_path(item['modelMember'])
        data = model_archive.read(name)
        names = {entry.filename for entry in model_archive.infolist() if not entry.is_dir()}

        def publish(member):
            member = safe_path(member)
            payload = model_archive.read(member)
            path = f'models/asset-{item["assetId"]}/' + member
            if path in output and output[path] != payload:
                raise ValueError('Member output collision')
            output[path] = payload
            return {'path': path, 'member': member, 'bytes': len(payload), 'sha256': sha(payload)}

        entry = {**item, 'model': publish(name), 'sourcePage': source['page']['url'],
                 'archivePath': source['archive']['path'], 'archiveSha': source['archive']['sha256'],
                 'preview': source['preview'], 'materials': None, 'textures': [],
                 'rigComplete': False, 'animationComplete': False, 'catalogueFidelityCertified': False,
                 'sourceFilesRewritten': False}
        suffix = PurePosixPath(name).suffix.casefold()
        if suffix == '.fbx':
            structure = MOTION.inspect_fbx(data)
            if not structure['hasWeightedRig'] or structure['invalidSkinWeights'] or structure['invalidSkinAssignments']:
                raise ValueError('Source FBX does not contain a valid weighted rig')
            if structure['varyingAnimationCurveCount']:
                raise ValueError('Animated FBX belongs in a motion pack, not this static rig reference pack')
            binding = MOTION.mesh_material_evidence(data)
            known = {PurePosixPath(member).name: member for member in names if member.lower().endswith('.png')}
            texture_members, unresolved, untextured = [], [], []
            for mesh in binding['meshes']:
                if not any(material['textures'] for material in mesh['materials']):
                    untextured.append(mesh['name'])
                for material in mesh['materials']:
                    for texture in material['textures']:
                        filename = texture['relativeFilename']
                        # A filename with no matching archive member remains explicitly unresolved.
                        # It never becomes a guessed mapping to a similarly named image.
                        member = known.get(filename)
                        if member is None:
                            unresolved.append({'mesh': mesh['name'], 'meshNames': [mesh['name']],
                                               'material': material['name'], **texture,
                                               'rawReference': filename, 'rawFileName': filename,
                                               'sourceModelSha256': sha(data), 'archiveMemberMissing': True})
                        elif member not in texture_members:
                            texture_members.append(member)
            for member in texture_members:
                png(model_archive.read(member))
            proof_path = f'evidence/asset-{item["assetId"]}-{sha(name.encode())[:10]}-materials.json'
            proof_bytes = (json.dumps(binding, ensure_ascii=False, indent=2) + '\n').encode()
            output[proof_path] = proof_bytes
            entry.update(format='FBX', geometry=structure, nativeMaterialEvidence={
                'path': proof_path, 'bytes': len(proof_bytes), 'sha256': sha(proof_bytes)},
                textures=[publish(member) for member in texture_members],
                unresolvedTextureReferences=unresolved, untexturedSourceMeshes=untextured,
                sourceRigPresent=True, sourceRigOriginCertified=False,
                sourceAnimationStacks=structure['animationStacks'], playableMotionClips=0)
            if item.get('colladaMember'):
                member = safe_path(item['colladaMember'])
                alternate = model_archive.read(member)
                if b'<!DOCTYPE' in alternate or b'<!ENTITY' in alternate:
                    raise ValueError('Unsafe Collada source document')
                entry['alternateFormats'] = [{'format': 'COLLADA', 'model': {
                    'member': member, 'bytes': len(alternate), 'sha256': sha(alternate)}, 'archiveMemberOnly': True,
                    'externalReferencesNeverResolved': True}]
        elif suffix == '.obj':
            text = data.decode('utf-8', 'strict')
            libraries = [line.split(None, 1)[1].strip() for line in text.splitlines() if line.startswith('mtllib ')]
            if len(libraries) != 1:
                raise ValueError('OBJ requires its exact one material library')
            library = str(PurePosixPath(name).parent / safe_path(libraries[0]))
            material = model_archive.read(library)
            texture_members, reference_aliases = [], []
            for line in material.decode('utf-8', 'strict').splitlines():
                fields = line.strip().split(None, 1)
                if fields and fields[0].startswith('map_'):
                    if len(fields) != 2 or fields[1].startswith('-'):
                        raise ValueError('Unreviewed material options')
                    reference = str(PurePosixPath(library).parent / safe_path(fields[1]))
                    member = reference
                    if member not in names:
                        matches = [name for name in names if name.casefold() == reference.casefold()]
                        if len(matches) != 1:
                            raise ValueError('Material texture has no unambiguous archive member')
                        member = matches[0]
                        reference_aliases.append({'reference': reference, 'member': member,
                                                  'resolution': 'unique-case-insensitive-reference'})
                    png(model_archive.read(member))
                    if member not in texture_members:
                        texture_members.append(member)
            if not texture_members:
                raise ValueError('OBJ source has no published texture binding')
            entry.update(format='OBJ', geometry=VISUAL.object_stats(data), materials=publish(library),
                         textures=[publish(member) for member in texture_members], playableMotionClips=0,
                         nativeTextureReferenceAliases=reference_aliases)
        else:
            raise ValueError('Only original OBJ or FBX references are accepted')
        entries.append(entry)
    files = [{'path': path, 'bytes': len(data), 'sha256': sha(data)} for path, data in sorted(output.items())]
    counts = {'archives': len(sources), 'modelViews': len(entries),
              'objViews': sum(e['format'] == 'OBJ' for e in entries),
              'publishedRigReferences': sum(e['format'] == 'FBX' for e in entries),
              'independentParts': sum(e['geometryScope'].endswith('-part') for e in entries),
              'exactCatalogueIdentities': len({e['subjectId'] for e in entries if e.get('subjectId')}),
              'candidateCatalogueIdentities': len({e['candidateUid'] for e in entries if e.get('candidateUid')}),
              'unresolvedTextureReferences': sum(len(e.get('unresolvedTextureReferences', [])) for e in entries),
              'untexturedSourceMeshes': sum(len(e.get('untexturedSourceMeshes', [])) for e in entries),
              'animationClips': 0, 'catalogueFidelityCertified': 0}
    return output, {'schema': 're.bow.native-model-reference-pack/1', 'release': 'R25',
                    'observedAtUtc': request['observedAtUtc'], 'sources': sources, 'entries': entries,
                    'counts': counts, 'files': files}


def publish(request, cache, destination, roster):
    output, manifest = prepare(request, Path(cache), roster)
    destination = Path(destination)
    output['manifest.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
    for name, payload in output.items():
        target = destination / name
        if target.is_symlink() or target.exists() and target.read_bytes() != payload:
            raise ValueError('Refusing to overwrite differing published bytes')
        if not target.resolve(strict=False).is_relative_to(destination.resolve(strict=False)):
            raise ValueError('Destination leaves its directory')
    for name, payload in output.items():
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            target.write_bytes(payload)
    return manifest


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--request', type=Path, default=ROOT / 'docs/R25_VISUAL_IMPORT_REQUEST.json')
    ap.add_argument('--cache', type=Path, default=ROOT / 'modules/fidelity-r25/visual')
    ap.add_argument('--output', type=Path, default=ROOT / 'modules/fidelity-r25/visual')
    args = ap.parse_args()
    roster = {item['id']: item for item in json.loads((ROOT / 'data/roster.json').read_text())['catalog']}
    result = publish(json.loads(args.request.read_text()), args.cache, args.output, roster)
    print(json.dumps(result['counts']))


if __name__ == '__main__':
    main()
