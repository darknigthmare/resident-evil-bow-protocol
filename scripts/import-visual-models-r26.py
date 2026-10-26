#!/usr/bin/env python3
"""Import exact R26 OBJ members with the already validated bounded source importer."""
import argparse
import importlib.util
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('r26_bounded_visual_base', ROOT/'scripts/import-visual-rigs-r25.py')
SOURCE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SOURCE)

def prepare(request, cache, roster):
    from pathlib import PurePosixPath
    if request.get('schema') != 're.bow.visual-rig-import/1':
        raise ValueError('Unknown source import contract')
    cache = Path(cache)
    payloads, sources, archives = {}, [], {}
    for source in request['sources']:
        asset = source['assetId']
        if type(asset) is not int or asset in archives:
            raise ValueError('Source IDs must be unique integers')
        records = {}
        for kind in ('page', 'archive', 'preview', 'corroboration'):
            receipt = source[kind]
            data = SOURCE.checked_input(cache, receipt)
            output = SOURCE.safe_path(receipt['outputPath'])
            if output in payloads or not receipt['url'].startswith('https://'):
                raise ValueError('Output collision or missing HTTPS provenance')
            payloads[output] = data
            records[kind] = {k: v for k, v in receipt.items() if k not in ('cachePath', 'outputPath')}
            records[kind]['path'] = output
        page = payloads[records['page']['path']].decode('utf-8', 'strict')
        if source['declaredDownloadHref'] not in page or source['name'] not in page or source['sourceGameLabel'] not in page:
            raise ValueError('Source page does not bind model, game and archive')
        from urllib.parse import urlsplit
        if urlsplit(records['preview']['url']).path not in page:
            raise ValueError('Preview absent from source page')
        SOURCE.png(payloads[records['preview']['path']])
        archives[asset] = SOURCE.archive(payloads[records['archive']['path']])
        sources.append({k: source[k] for k in ('assetId', 'name', 'sourceGameLabel')} | records)
    by_id = {row['assetId']: row for row in sources}
    entries, ids = [], set()
    for item in request['entries']:
        if item['id'] in ids: raise ValueError('Duplicate model ID')
        ids.add(item['id'])
        uid = item.get('subjectId') or item.get('candidateUid')
        if uid not in roster or item.get('subjectId') and item['game'] != roster[uid]['game']:
            raise ValueError('Unknown identity or game mismatch')
        archive, source = archives[item['assetId']], by_id[item['assetId']]
        names = [row.filename for row in archive.infolist() if not row.is_dir()]
        name = SOURCE.safe_path(item['modelMember'])
        if not name.endswith('.obj'): raise ValueError('Only reviewed original OBJ sources accepted')
        data = archive.read(name)
        def publish(member):
            member = SOURCE.safe_path(member)
            content = archive.read(member)
            path = f'models/asset-{item["assetId"]}/' + member
            if path in payloads and payloads[path] != content: raise ValueError('Member collision')
            payloads[path] = content
            return {'path': path, 'member': member, 'bytes': len(content), 'sha256': SOURCE.sha(content)}
        libraries = [line.split(None, 1)[1].strip() for line in data.decode('utf-8', 'strict').splitlines() if line.startswith('mtllib ')]
        if len(libraries) != 1: raise ValueError('OBJ requires one exact material library')
        library = str(PurePosixPath(name).parent / SOURCE.safe_path(libraries[0]))
        material = archive.read(library)
        textures, aliases = [], []
        for line in material.decode('utf-8', 'strict').splitlines():
            fields = line.strip().split(None, 1)
            if not fields or not fields[0].startswith('map_'): continue
            if len(fields) != 2 or fields[1].startswith('-'): raise ValueError('Unreviewed material options')
            reference = str(PurePosixPath(library).parent / SOURCE.safe_path(fields[1]))
            member = reference
            if member not in names:
                # Preserve the MTL exactly. Some published folders are swapped.
                # Resolve only its literal PNG basename; all matching bytes must agree.
                matches = sorted(candidate for candidate in names if PurePosixPath(candidate).name.casefold() == PurePosixPath(reference).name.casefold())
                if not matches or len({SOURCE.sha(archive.read(candidate)) for candidate in matches}) != 1:
                    raise ValueError('Missing or ambiguous literal texture reference')
                member = matches[0]
                aliases.append({'reference': reference, 'member': member,
                                'resolution': 'literal-basename-identical-source-bytes',
                                'matchingMembers': matches, 'sha256': SOURCE.sha(archive.read(member))})
            SOURCE.png(archive.read(member))
            if member not in textures: textures.append(member)
        if not textures: raise ValueError('OBJ has no explicit published texture binding')
        entries.append({**item, 'format': 'OBJ', 'model': publish(name), 'materials': publish(library),
                        'textures': [publish(member) for member in textures], 'geometry': SOURCE.VISUAL.object_stats(data),
                        'nativeTextureReferenceAliases': aliases, 'sourcePage': source['page']['url'],
                        'archivePath': source['archive']['path'], 'archiveSha': source['archive']['sha256'],
                        'preview': source['preview'], 'rigComplete': False, 'animationComplete': False,
                        'catalogueFidelityCertified': False, 'sourceFilesRewritten': False, 'playableMotionClips': 0})
    manifest = {'schema': 're.bow.native-model-reference-pack/1', 'release': 'R26',
                'observedAtUtc': request['observedAtUtc'], 'sources': sources, 'entries': entries,
                'counts': {'archives': len(sources), 'modelViews': len(entries), 'objViews': len(entries),
                           'publishedRigReferences': 0, 'independentParts': 0,
                           'exactCatalogueIdentities': len({e['subjectId'] for e in entries if e.get('subjectId')}),
                           'candidateCatalogueIdentities': len({e['candidateUid'] for e in entries if e.get('candidateUid')}),
                           'literalTextureReferencesResolved': sum(len(e['nativeTextureReferenceAliases']) for e in entries),
                           'unresolvedTextureReferences': 0, 'untexturedSourceMeshes': 0,
                           'animationClips': 0, 'catalogueFidelityCertified': 0},
                'files': [{'path': name, 'bytes': len(data), 'sha256': SOURCE.sha(data)} for name, data in sorted(payloads.items())]}
    return payloads, manifest

def publish(request, cache, destination, roster):
    payloads, manifest = prepare(request, cache, roster)
    payloads['manifest.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2)+'\n').encode()
    destination = Path(destination)
    for name, data in payloads.items():
        target = destination/name
        if target.is_symlink() or target.exists() and target.read_bytes() != data:
            raise ValueError('Refusing to overwrite differing published bytes')
        if not target.resolve(strict=False).is_relative_to(destination.resolve(strict=False)):
            raise ValueError('Destination leaves its directory')
    for name, data in payloads.items():
        target = destination/name
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists(): target.write_bytes(data)
    return manifest

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--request', type=Path, default=ROOT/'docs/R26_VISUAL_IMPORT_REQUEST.json')
    parser.add_argument('--cache', type=Path, default=ROOT/'modules/fidelity-r26/visual')
    parser.add_argument('--output', type=Path, default=ROOT/'modules/fidelity-r26/visual')
    args = parser.parse_args()
    roster = {row['id']: row for row in json.loads((ROOT/'data/roster.json').read_text())['catalog']}
    manifest = publish(json.loads(args.request.read_text()), args.cache, args.output, roster)
    print(json.dumps(manifest['counts']))
if __name__ == '__main__': main()
