#!/usr/bin/env python3
"""Import a reviewed archive without inventing pixels or extracting unsafe files."""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import stat
import zipfile

from PIL import Image

MAX_ARCHIVE_BYTES = 20 * 1024 * 1024
MAX_EXPANDED_BYTES = 64 * 1024 * 1024
MAX_MEMBERS = 1024
MAX_PIXELS = 25_000_000


def sha(data):
    return hashlib.sha256(data).hexdigest()


def validate_archive(data):
    """Read members in memory; never unpack untrusted names to the filesystem."""
    if len(data) > MAX_ARCHIVE_BYTES:
        raise ValueError('Archive too large')
    archive = zipfile.ZipFile(io.BytesIO(data))
    members = archive.infolist()
    if len(members) > MAX_MEMBERS or sum(x.file_size for x in members) > MAX_EXPANDED_BYTES:
        raise ValueError('Expanded archive exceeds limits')
    names = set()
    for item in members:
        path = PurePosixPath(item.filename)
        mode = item.external_attr >> 16
        if (path.is_absolute() or '..' in path.parts or '\\' in item.filename
                or ':' in item.filename or item.filename in names or stat.S_ISLNK(mode)):
            raise ValueError('Unsafe or duplicated archive member')
        if item.flag_bits & 1:
            raise ValueError('Encrypted archive member')
        names.add(item.filename)
    return archive


def decode(data):
    with Image.open(io.BytesIO(data)) as image:
        if image.width * image.height > MAX_PIXELS:
            raise ValueError('Image exceeds pixel limit')
        if getattr(image, 'n_frames', 1) != 1:
            raise ValueError('Static images required')
        image.load()
        return image.convert('RGBA')


def prepare(request, archive_data, page_data, roster):
    if request['schema'] != 're.bow.visual-archive-import/1':
        raise ValueError('Unexpected request schema')
    if sha(page_data) != request['page']['sha256'] or sha(archive_data) != request['archive']['sha256']:
        raise ValueError('Source bytes changed')
    if request['archive']['declared_href'].encode() not in page_data:
        raise ValueError('Archive URL absent from source page')
    archive = validate_archive(archive_data)
    original_name = request['atlas']['member']
    original_data = archive.read(original_name)
    if sha(original_data) != request['atlas']['sha256']:
        raise ValueError('Atlas bytes changed')
    atlas = decode(original_data)
    output, entries, seen = {}, [], set()
    for item in request['entries']:
        uid = item['id']
        if uid in seen or uid not in roster:
            raise ValueError('Unknown or duplicated identity')
        seen.add(uid)
        if item['game'] != roster[uid]['game'] or item['reviewed'] is not True:
            raise ValueError('Unreviewed identity or different game')
        crop = item['crop']
        if (len(crop) != 4 or any(type(x) is not int for x in crop)
                or crop[0] < 0 or crop[1] < 0 or crop[2] <= 0 or crop[3] <= 0
                or crop[0] + crop[2] > atlas.width or crop[1] + crop[3] > atlas.height):
            raise ValueError('Crop outside atlas')
        image = atlas.crop((crop[0], crop[1], crop[0] + crop[2], crop[1] + crop[3]))
        encoded = io.BytesIO()
        image.save(encoded, format='PNG')
        data = encoded.getvalue()
        if decode(data).tobytes() != image.tobytes():
            raise ValueError('Crop pixels changed during encoding')
        rel = 'portraits/' + uid + '.png'
        output[rel] = data
        entries.append({**item, 'image': rel, 'sha256': sha(data),
                        'rgba_sha256': sha(image.tobytes()), 'width': image.width,
                        'height': image.height, 'source_scope': 'native-menu-thumbnail',
                        'source_archive': request['archive']['url'],
                        'source_page': request['page']['url'],
                        'source_atlas': 'source/' + original_name,
                        'source_member': original_name,
                        'source_atlas_sha256': sha(original_data),
                        'full_body_sprite': False, 'rig_complete': False,
                        'combat_animation_complete': False, 'canonical_fidelity_certified': False})
    output['source/original.zip'] = archive_data
    # A captured third-party HTML document must never execute on the app origin.
    output['source/page.html.txt'] = page_data
    for item in archive.infolist():
        if not item.is_dir():
            if PurePosixPath(item.filename).suffix.lower() != '.png':
                raise ValueError('Only PNG members may be published beside this module')
            # Validated archive: store original files only under a new fixed root.
            member_data = archive.read(item)
            decode(member_data)
            output['source/' + item.filename] = member_data
    manifest = {'schema': 're.bow.visual-source-index/1',
                'source_classification': 'community-archive-of-game-origin-menu-textures',
                'observed_at_utc': request['observed_at_utc'],
                'page': request['page'], 'archive': request['archive'],
                'atlas': {**request['atlas'], 'width': atlas.width, 'height': atlas.height},
                'entries': entries, 'exclusions': request.get('exclusions', []),
                'counts': {'reviewed_menu_portraits': len(entries), 'rigs': 0,
                           'combat_clips': 0, 'complete_fidelity_certified': 0},
                'files': [{'path': path, 'bytes': len(data), 'sha256': sha(data)}
                          for path, data in output.items()]}
    output['manifest.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--request', type=Path, required=True)
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--page', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    roster = {x['id']: x for x in json.loads((root / 'data/roster.json').read_text())['catalog']}
    request = json.loads(args.request.read_text())
    output = prepare(request, args.archive.read_bytes(), args.page.read_bytes(), roster)
    for relative, data in output.items():
        target = args.output / relative
        if target.exists() and target.read_bytes() != data:
            raise ValueError('Refusing to replace different existing output: ' + str(target))
    for relative, data in output.items():
        target = args.output / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    print(json.dumps({'files': len(output), 'output': str(args.output),
                      'reviewed_portraits': len(request['entries']), 'rigs': 0}))


if __name__ == '__main__':
    main()
