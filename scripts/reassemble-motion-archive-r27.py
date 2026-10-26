#!/usr/bin/env python3
"""Reassemble source ZIP byte ranges with bounded memory and mandatory hashes."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import tempfile

ROOT = Path(__file__).resolve().parents[1]
PART_BYTES = 48 * 1024 * 1024
MAX_ARCHIVE_BYTES = 160 * 1024 * 1024


def reassemble(descriptor_path, pack_root, output):
    descriptor_path, pack_root, output = Path(descriptor_path), Path(pack_root).resolve(), Path(output)
    data = json.loads(descriptor_path.read_text())
    if data.get('schema') != 're.bow.exact-segmented-archive/1' or not 1 <= data.get('bytes', 0) <= MAX_ARCHIVE_BYTES:
        raise ValueError('Invalid segmented source archive descriptor')
    if output.exists():
        raise ValueError('Refusing to overwrite an existing file')
    output.parent.mkdir(parents=True, exist_ok=True)
    archive_hash, total = hashlib.sha256(), 0
    with tempfile.NamedTemporaryFile(dir=output.parent, delete=False) as target:
        temporary = Path(target.name)
        try:
            for index, part in enumerate(data['parts'], 1):
                name = PurePosixPath(part['path'])
                if name.is_absolute() or '..' in name.parts or '\\' in part['path'] or ':' in part['path']:
                    raise ValueError('Archive segment path leaves the source pack')
                path = pack_root.joinpath(*name.parts)
                if not path.resolve().is_relative_to(pack_root) or any(p.is_symlink() for p in (path, *path.parents)):
                    raise ValueError('Archive segments must be regular local source files')
                if part['index'] != index or part['byteOffset'] != total or not 1 <= part['bytes'] <= PART_BYTES:
                    raise ValueError('Archive segment order, offset or size is invalid')
                part_hash, size = hashlib.sha256(), 0
                with path.open('rb') as source:
                    while chunk := source.read(1024 * 1024):
                        size += len(chunk)
                        if size > part['bytes'] or total + size > data['bytes']:
                            raise ValueError('Archive segment exceeds declared bounds')
                        part_hash.update(chunk)
                        archive_hash.update(chunk)
                        target.write(chunk)
                if size != part['bytes'] or part_hash.hexdigest() != part['sha256']:
                    raise ValueError('Archive segment bytes differ from the publication')
                total += size
            if total != data['bytes'] or archive_hash.hexdigest() != data['sha256']:
                raise ValueError('Reassembled archive differs from the original ZIP')
            target.flush()
            os.fsync(target.fileno())
        except BaseException:
            target.close()
            temporary.unlink(missing_ok=True)
            raise
    try:
        os.replace(temporary, output)
    finally:
        temporary.unlink(missing_ok=True)
    return {'bytes': total, 'sha256': archive_hash.hexdigest(), 'parts': len(data['parts']), 'originalBytesPreserved': True}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--descriptor', type=Path, default=ROOT / 'modules/fidelity-r27/motion/ooze/source/original.zip.parts.json')
    parser.add_argument('--pack', type=Path, default=ROOT / 'modules/fidelity-r27/motion')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(reassemble(args.descriptor, args.pack, args.output)))


if __name__ == '__main__':
    main()
