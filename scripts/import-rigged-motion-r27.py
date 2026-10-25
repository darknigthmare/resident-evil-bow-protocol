#!/usr/bin/env python3
"""Preserve standard Ooze native scenes and an exact segmented original ZIP.

The original archive is never recompressed. Native FBX scenes are delivered
directly so the browser keeps its existing bounded resource loader.
"""
from __future__ import annotations
import argparse
import copy
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('motion_import_r26', ROOT / 'scripts/import-rigged-motion-r26.py')
BASE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BASE)
MAX_SOURCE_ARCHIVE_BYTES = 160 * 1024 * 1024
PART_BYTES = 48 * 1024 * 1024
BASE.MAX_ARCHIVE_BYTES = MAX_SOURCE_ARCHIVE_BYTES


def sha(payload):
    return hashlib.sha256(payload).hexdigest()


def build(request, archive_path, output, check=False):
    if request.get('schema') != 're.bow.rigged-motion-import-r27/1' or len(request.get('packages', [])) != 1:
        raise ValueError('Expected one explicitly scoped R27 source package')
    archive_path, output = Path(archive_path), Path(output)
    package = request['packages'][0]
    if archive_path.stat().st_size > MAX_SOURCE_ARCHIVE_BYTES:
        raise ValueError('Source archive exceeds the offline import bound')
    archive_bytes = archive_path.read_bytes()
    if len(archive_bytes) != package['archive']['bytes'] or sha(archive_bytes) != package['archive']['sha256']:
        raise ValueError('Original archive bytes do not match the frozen publication')
    native_request = copy.deepcopy(request)
    native_request['schema'] = 're.bow.rigged-motion-import-r26/1'
    native_request['packages'][0]['archiveFile'] = archive_path.name
    pending = {}
    def preserve(relative, raw):
        path = BASE.local_path(output, relative)
        if path in pending and pending[path] != raw:
            raise ValueError('Conflicting direct source bytes')
        pending[path] = raw
        return {'path': relative, 'sha256': sha(raw), 'bytes': len(raw)}
    with tempfile.TemporaryDirectory(prefix='bow-r27-native-') as temporary:
        temporary = Path(temporary)
        for source in package['sources']:
            path = BASE.local_path(output, source['path'])
            raw = path.read_bytes()
            target = BASE.local_path(temporary, source['path'])
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(raw)
        native, inventories = BASE.build(native_request, archive_path.parent, temporary)
        original_path = package['archive']['path']
        for path in sorted(temporary.rglob('*')):
            if not path.is_file():
                continue
            relative = path.relative_to(temporary).as_posix()
            if relative == 'manifest.json' or relative == original_path:
                continue
            preserve(relative, path.read_bytes())
        parts = []
        for index, start in enumerate(range(0, len(archive_bytes), PART_BYTES), 1):
            part = preserve(f'ooze/source/original.zip.part{index:02d}', archive_bytes[start:start + PART_BYTES])
            parts.append({**part, 'index': index, 'byteOffset': start})
        descriptor = {'schema': 're.bow.exact-segmented-archive/1', 'originalName': 'original.zip',
                      'url': package['archive']['url'], 'sha256': sha(archive_bytes), 'bytes': len(archive_bytes),
                      'segmentation': 'Ordered concatenation of unmodified source byte ranges; no decompression or recompression.',
                      'parts': parts}
        descriptor_record = preserve('ooze/source/original.zip.parts.json', (json.dumps(descriptor, indent=2) + '\n').encode())
        archive_record = {key: descriptor[key] for key in ('url', 'sha256', 'bytes')}
        archive_record.update(parts=parts, descriptor=descriptor_record, storage='exact-raw-byte-segments')
        with zipfile.ZipFile(archive_path) as archive:
            for entry in native['entries']:
                entry['archive'] = archive_record
                for clip in entry['clips']:
                    raw = archive.read(clip['member'])
                    if len(raw) != clip['bytes'] or sha(raw) != clip['sha256']:
                        raise ValueError('A direct scene differs from its original ZIP member')
                    clip.update(preserve(entry['model']['path'].rsplit('/', 1)[0] + '/clips/' + Path(clip['member']).name, raw))
                for pose in entry['basePoseReferences']:
                    pose.update(preserve(entry['model']['path'].rsplit('/', 1)[0] + '/source/base-poses/' + Path(pose['member']).name,
                                         archive.read(pose['member'])))
                if entry['modelRole'] == 'body' and package.get('preview'):
                    source = package['preview']
                    raw = BASE.local_path(output, source['path']).read_bytes()
                    if len(raw) != source['bytes'] or sha(raw) != source['sha256']:
                        raise ValueError('Published preview differs from its frozen source')
                    entry['preview'] = preserve(source['path'], raw)
        native['release'] = 'R27'
        native['summary']['directAnimationFiles'] = native['summary']['sourceAnimationFiles']
        native['summary']['originalArchiveParts'] = len(parts)
        native['summary']['originalArchiveStorage'] = 'exact-raw-byte-segments'
        native['archiveSegmentation'] = descriptor
        native['offlineImportArchiveBoundBytes'] = MAX_SOURCE_ARCHIVE_BYTES
        native['browserArchiveLimitRaised'] = False
        preserve('manifest.json', (json.dumps(native, ensure_ascii=False, indent=2) + '\n').encode())
    for path, raw in pending.items():
        if path.exists() and (path.is_symlink() or path.read_bytes() != raw):
            raise ValueError('Refusing to replace different delivered bytes: ' + str(path))
        if check and not path.is_file():
            raise ValueError('Missing delivered source: ' + str(path))
    if not check:
        for path, raw in pending.items():
            BASE.SOURCE.write_preserving(path, raw)
    return native, inventories


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--request', type=Path, default=ROOT / 'docs/R27_MOTION_IMPORT_REQUEST.json')
    parser.add_argument('--archive', type=Path, default=Path('/workspace/scratch/r27-motion/ooze.zip'))
    parser.add_argument('--output', type=Path, default=ROOT / 'modules/fidelity-r27/motion')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    request = json.loads(args.request.read_text())
    if args.archive.is_file():
        manifest, _ = build(request, args.archive, args.output, args.check)
    else:
        spec = importlib.util.spec_from_file_location('reassemble_r27', ROOT / 'scripts/reassemble-motion-archive-r27.py')
        assembler = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(assembler)
        with tempfile.TemporaryDirectory(prefix='bow-r27-archive-') as temporary:
            archive = Path(temporary) / 'ooze.zip'
            assembler.reassemble(args.output / 'ooze/source/original.zip.parts.json', args.output, archive)
            manifest, _ = build(request, archive, args.output, args.check)
    print(json.dumps(manifest['summary']))


if __name__ == '__main__':
    main()
