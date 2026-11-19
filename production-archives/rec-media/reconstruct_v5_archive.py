#!/usr/bin/env python3
"""Reconstruct the unmodified V5 ZIP from its three checked binary parts.

Python standard library only. Existing files are never overwritten.
The extracted snapshot in v5/ is not modified or extracted again.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import tempfile
import zipfile


HERE = Path(__file__).resolve().parent
MANIFEST = HERE / 'V5_ARCHIVE_PARTS.json'
BLOCK = 1024 * 1024


def sha256_file(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(BLOCK), b''):
            digest.update(chunk)
    return digest.hexdigest()


def verify_archive(path, expected):
    if path.stat().st_size != expected['bytes']:
        raise ValueError('Reconstructed archive size mismatch')
    if sha256_file(path) != expected['sha256']:
        raise ValueError('Reconstructed archive SHA-256 mismatch')
    with zipfile.ZipFile(path) as archive:
        if archive.namelist() != expected['members']:
            raise ValueError('Archive members differ from the frozen snapshot')
        bad_member = archive.testzip()
        if bad_member is not None:
            raise ValueError('Archive CRC failure: ' + bad_member)


def reconstruct(output=None):
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    if manifest['schema'] != 'rec-media-binary-parts-v1':
        raise ValueError('Unsupported parts manifest')
    archive_info = manifest['archive']
    filename = archive_info['filename']
    if Path(filename).name != filename:
        raise ValueError('Archive filename must be a basename')
    parts = manifest['parts']
    if len(parts) != 3 or [part['order'] for part in parts] != [1, 2, 3]:
        raise ValueError('Exactly three ordered parts are required')
    paths = []
    for part in parts:
        name = part['filename']
        if Path(name).name != name:
            raise ValueError('Part filename must be a basename')
        path = HERE / name
        if path.stat().st_size != part['bytes']:
            raise ValueError('Part size mismatch: ' + name)
        if sha256_file(path) != part['sha256']:
            raise ValueError('Part SHA-256 mismatch: ' + name)
        paths.append(path)
    if sum(part['bytes'] for part in parts) != archive_info['bytes']:
        raise ValueError('Part lengths do not sum to the archive length')

    destination = Path(output).resolve() if output else HERE / filename
    if destination.exists():
        verify_archive(destination, archive_info)
        return destination, 'already present and verified'
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=destination.parent, prefix='.rebuild_v5_',
                                         suffix='.tmp', delete=False) as out:
            temporary = Path(out.name)
            for path in paths:
                with path.open('rb') as stream:
                    for chunk in iter(lambda: stream.read(BLOCK), b''):
                        out.write(chunk)
        verify_archive(temporary, archive_info)
        # Exclusive creation also prevents overwriting a concurrently created file.
        os.link(temporary, destination)
        return destination, 'reconstructed and verified'
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, help='Destination ZIP; no overwriting')
    args = parser.parse_args()
    try:
        path, status = reconstruct(args.output)
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as error:
        parser.exit(1, 'V5 archive verification failed: ' + str(error) + '\n')
    print(json.dumps({'archive': str(path), 'status': status,
                      'sha256': sha256_file(path), 'bytes': path.stat().st_size,
                      'members': 22, 'crc': 'passed'}, ensure_ascii=False))


if __name__ == '__main__':
    main()
