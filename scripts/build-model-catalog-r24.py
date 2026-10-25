#!/usr/bin/env python3
"""Bind published model packs to a viewer without rewriting their source files."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads(path.read_text())


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check(record, base):
    path = (base / record['path']).resolve(strict=True)
    if not path.is_relative_to(base.resolve()) or digest(path) != record['sha256'] or path.stat().st_size != record['bytes']:
        raise ValueError('Source resource differs: ' + str(path))


def build():
    visual_base = ROOT / 'modules/fidelity-r24/visual'
    motion_base = ROOT / 'modules/fidelity-r24/motion'
    visual, motion = read(visual_base / 'manifest.json'), read(motion_base / 'manifest.json')
    if visual['schema'] != 're.bow.native-model-reference-pack/1' or motion['schema'] != 're.bow.rigged-motion-pack/1':
        raise ValueError('Unexpected source pack schema')
    entries = []
    for item in visual['entries']:
        files = {row['path']: row for row in visual['files']}
        archive = {'path': item['archivePath'], 'sha256': item['archiveSha'], 'bytes': files[item['archivePath']]['bytes']}
        entry = {key: item[key] for key in ('id', 'label', 'game', 'platform', 'model', 'materials', 'textures', 'format', 'limitations', 'sourcePage', 'geometryScope')}
        if item.get('viewCamera'):
            entry['viewCamera'] = item['viewCamera']
        entry.update(base='../visual/', archive=archive, clips=[])
        for record in [entry['model'], entry['materials'], entry['archive'], *entry['textures']]:
            if record:
                check(record, visual_base)
        entries.append(entry)
        rig = item.get('publishedRig')
        if rig:
            check(rig['model'], visual_base)
            for texture in rig['textures']:
                check(texture, visual_base)
            alternate = next((row for row in rig.get('alternateFormats', []) if row.get('format') == 'FBX'), None)
            rig_model = alternate.get('model', alternate) if alternate else rig['model']
            rig_textures = list({texture['path']: texture for texture in [*entry['textures'], *rig['textures']]}.values()) if alternate else rig['textures']
            entries.append({**entry, 'id': item['id'] + '-published-rig', 'label': item['label'] + ' — armature publiée',
                            'format': 'FBX' if alternate else 'COLLADA', 'model': rig_model, 'textures': rig_textures, 'materials': None,
                            'limitations': list(item['limitations']) + [rig.get('originCertification', 'Origine console de l’armature non certifiée.')],
                            'geometryScope': 'published-weighted-rig-reference'})
    for item in motion['entries']:
        for record in [item['model'], item['archive'], *item['textures'], *[clip for clip in item['clips'] if clip.get('path')]]:
            check(record, motion_base)
        if item.get('materialBindings'):
            check(item['materialBindings'], motion_base)
        sources = item.get('sources', [])
        source_page = next((s.get('url', '') for s in sources if 'spriters-resource' in s.get('url', '')), '')
        entries.append({'id': item['id'], 'label': item['label'], 'game': item['game'], 'platform': item.get('sourcePlatform', ''),
                        'base': '../motion/', 'format': 'FBX', 'model': item['model'], 'materials': None,
                        'textures': item['textures'], 'archive': item['archive'], 'clips': item['clips'],
                        'sourcePage': source_page, 'limitations': item.get('limits', []), 'geometryScope': 'published-rig-and-motion-reference',
                        **({'materialBindings': item['materialBindings']} if item.get('materialBindings') else {})})
    if len({entry['id'] for entry in entries}) != len(entries):
        raise ValueError('Duplicate model identifier')
    return {'schema': 're.bow.model-view-catalog/1', 'sourceFilesRewritten': False,
            'canonicalFidelityCertified': False, 'inputs': [
                {'path': 'modules/fidelity-r24/visual/manifest.json', 'sha256': digest(visual_base / 'manifest.json')},
                {'path': 'modules/fidelity-r24/motion/manifest.json', 'sha256': digest(motion_base / 'manifest.json')}],
            'entries': entries}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    target = ROOT / 'modules/fidelity-r24/models/catalog.json'
    catalog = build()
    if args.check:
        if read(target) != catalog:
            raise ValueError('Viewer catalogue differs from the source packs')
    else:
        target.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'model_entries': len(catalog['entries']), 'source_clips': sum(len(item['clips']) for item in catalog['entries']),
                      'canonical_fidelity_certified': False}))


if __name__ == '__main__':
    main()
