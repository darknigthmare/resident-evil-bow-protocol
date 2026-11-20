#!/usr/bin/env python3
"""Reconstruct the byte-identical archive using Python's standard library."""
from pathlib import Path
import argparse, hashlib, io, json, zipfile

def digest(data):
    return hashlib.sha256(data).hexdigest()

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path)
    args=parser.parse_args()
    here=Path(__file__).resolve().parent
    manifest=json.loads((here/'V10_ARCHIVE_PARTS.json').read_text())
    chunks=[]
    offset=0
    for index,part in enumerate(manifest['parts'],1):
        if part['index']!=index or part['offset']!=offset:
            raise SystemExit('Invalid part order/offset')
        name=part['filename']
        if Path(name).name!=name:
            raise SystemExit('Part name must be a basename')
        data=(here/name).read_bytes()
        if len(data)!=part['bytes'] or digest(data)!=part['sha256']:
            raise SystemExit('Part integrity failure: '+name)
        chunks.append(data)
        offset+=len(data)
    data=b''.join(chunks)
    if len(data)!=manifest['archive_bytes'] or digest(data)!=manifest['archive_sha256']:
        raise SystemExit('Reconstructed archive size/SHA256 mismatch')
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        bad=z.testzip()
        if bad is not None or len(z.namelist())!=manifest['zip_members']:
            raise SystemExit('ZIP CRC/member verification failed: '+str(bad))
    output=args.output or here/manifest['archive_filename']
    if output.exists():
        if output.read_bytes()!=data:
            raise SystemExit('Refusing to overwrite a different existing file: '+str(output))
    else:
        output.parent.mkdir(parents=True,exist_ok=True)
        with output.open('xb') as stream:
            stream.write(data)
    print('Verified SHA256 and ZIP CRC:',manifest['archive_sha256'])
    print(output)

if __name__=='__main__':
    main()
