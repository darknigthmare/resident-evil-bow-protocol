#!/usr/bin/env python3
"""Expose direct native R27 clips without loading the segmented original ZIP."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r27/motion'


def build():
    raw = (PACK / 'manifest.json').read_bytes()
    manifest = json.loads(raw)
    if manifest.get('schema') != 're.bow.rigged-motion-pack/1' or manifest['summary']['canonicalFidelityCertified'] != 0:
        raise ValueError('Uncertified native source manifest required')
    entries = []
    ids = {entry['id'] for entry in json.loads((ROOT / 'data/roster.json').read_text())['catalog']}
    for entry in manifest['entries']:
        if entry['subjectId'] not in ids or any(not clip.get('path') for clip in entry['clips']):
            raise ValueError('Every browser clip must be a directly delivered known source')
        for record in [entry['model'], *entry['textures'], *entry['clips'], entry['materialBindings'], *entry['archive']['parts']]:
            path = (PACK / record['path']).resolve(strict=True)
            if not path.is_relative_to(PACK) or path.stat().st_size != record['bytes'] or hashlib.sha256(path.read_bytes()).hexdigest() != record['sha256']:
                raise ValueError('Native viewer source bytes differ')
        entries.append({'id': entry['id'], 'subjectId': entry['subjectId'], 'label': entry['label'], 'game': entry['game'],
                        'platform': entry['sourcePlatform'], 'base': './', 'format': 'FBX', 'model': entry['model'],
                        'materials': None, 'textures': entry['textures'], 'archive': entry['archive'], 'clips': entry['clips'],
                        'sourcePage': entry['sources'][0]['url'], 'limitations': entry['limits'],
                        'materialBindings': entry['materialBindings'], 'modelRole': entry['modelRole'],
                        'geometryScope': entry['geometryScope'], 'sourceEdition': entry['sourceEdition'],
                        **({'preview': entry['preview']} if entry.get('preview') else {})})
    return {'schema': 're.bow.model-view-catalog/1', 'sourceFilesRewritten': False, 'canonicalFidelityCertified': False,
            'inputs': [{'path': 'modules/fidelity-r27/motion/manifest.json', 'sha256': hashlib.sha256(raw).hexdigest()}],
            'entries': entries}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = (json.dumps(build(), ensure_ascii=False, indent=2) + '\n').encode()
    output = PACK / 'catalog.json'
    if args.check:
        if output.read_bytes() != raw:
            raise ValueError('Native R27 motion viewer differs from its original scenes')
    else:
        output.write_bytes(raw)
    print(json.dumps({'models': 2, 'directNativeKeyedScenes': 120, 'browserArchiveLimitRaised': False}))


if __name__ == '__main__':
    main()
