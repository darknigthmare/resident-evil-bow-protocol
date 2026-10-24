#!/usr/bin/env python3
"""Build a cumulative source viewer without altering published asset bytes."""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'modules/fidelity-r25/models/catalog.json'


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def local_path(base, value):
    if not isinstance(value, str) or not value or '\\' in value or value.startswith('/'):
        raise ValueError('Source path must be relative')
    if any(part in ('', '.', '..') for part in value.split('/')):
        raise ValueError('Source path traversal is forbidden')
    path = (base / value).resolve(strict=True)
    if not path.is_relative_to(base.resolve()) or not path.is_file():
        raise ValueError('Source resource leaves its pack')
    return path


def check(record, base):
    if not record:
        return
    path = local_path(base, record['path'])
    if path.stat().st_size != record['bytes'] or digest(path) != record['sha256']:
        raise ValueError('Source bytes differ: ' + str(path))


def visual_entries(pack, base, viewer_base):
    entries = []
    for item in pack['entries']:
        archive_path = local_path(base, item['archivePath'])
        archive = {'path': item['archivePath'], 'sha256': item['archiveSha'], 'bytes': archive_path.stat().st_size}
        entry = {key: item[key] for key in ('id', 'label', 'game', 'platform', 'model', 'textures', 'format', 'limitations', 'sourcePage', 'geometryScope')}
        entry.update(materials=item.get('materials'), base=viewer_base, archive=archive, clips=[])
        for key in ('subjectId', 'candidateUid', 'form', 'preview', 'viewCamera', 'sourceClass', 'sourceEdition', 'unresolvedTextureReferences'):
            if item.get(key) is not None:
                entry[key] = item[key]
        for record in [entry['model'], entry['materials'], entry['archive'], entry.get('preview'), *entry['textures']]:
            if record:
                check(record, base)
        entries.append(entry)
        rig = item.get('publishedRig')
        # An FBX already representing the rig must not become a duplicate view.
        if rig and entry['format'] == 'OBJ':
            check(rig['model'], base)
            for texture in rig['textures']:
                check(texture, base)
            alternate = next((row for row in rig.get('alternateFormats', []) if row.get('format') == 'FBX'), None)
            model = alternate.get('model', alternate) if alternate else rig['model']
            if alternate:
                with ZipFile(archive_path) as source:
                    raw = source.read(model['member'])
                if len(raw) != model['bytes'] or hashlib.sha256(raw).hexdigest() != model['sha256']:
                    raise ValueError('Alternate source rig differs from its archive')
            textures = list({t['path']: t for t in [*entry['textures'], *rig['textures']]}.values()) if alternate else rig['textures']
            entries.append({**entry, 'id': item['id'] + '-published-rig', 'label': item['label'] + ' — armature publiée',
                            'format': 'FBX' if alternate else 'COLLADA', 'model': model, 'textures': textures, 'materials': None,
                            'limitations': [*item['limitations'], rig.get('originCertification', 'Origine console de l’armature non certifiée.')],
                            'geometryScope': 'published-weighted-rig-reference'})
    return entries


def motion_entries(pack, base, viewer_base):
    entries = []
    for item in pack['entries']:
        for record in [item['model'], item['archive'], *item['textures'], *[c for c in item['clips'] if c.get('path')], item.get('materialBindings')]:
            if record:
                check(record, base)
        source_page = next((s['url'] for s in item.get('sources', []) if 'spriters-resource' in s.get('url', '')), '')
        entry = {'id': item['id'], 'subjectId': item.get('subjectId', item['id']), 'label': item['label'], 'game': item['game'],
                 'platform': item.get('sourcePlatform', ''), 'base': viewer_base, 'format': 'FBX', 'model': item['model'],
                 'materials': None, 'textures': item['textures'], 'archive': item['archive'], 'clips': item['clips'],
                 'sourcePage': source_page, 'limitations': item.get('limits', []),
                 'geometryScope': 'published-rig-and-motion-reference'}
        for key in ('materialBindings', 'preview', 'form', 'viewCamera', 'sourceClass', 'sourceEdition', 'modelRole', 'geometryScope', 'basePoseReferences'):
            if item.get(key) is not None:
                entry[key] = item[key]
        if entry.get('preview'):
            check(entry['preview'], base)
        entries.append(entry)
    return entries


def build():
    entries, inputs = [], []
    roster = {item['id'] for item in read(ROOT / 'data/roster.json')['catalog']}
    for release in ('r24', 'r25'):
        for kind, schema, loader in [('visual', 're.bow.native-model-reference-pack/1', visual_entries),
                                     ('motion', 're.bow.rigged-motion-pack/1', motion_entries)]:
            base = ROOT / f'modules/fidelity-{release}/{kind}'
            manifest = base / 'manifest.json'
            if not manifest.exists():
                if release == 'r24':
                    raise ValueError('Historical pack is missing')
                continue
            pack = read(manifest)
            if pack.get('schema') != schema:
                raise ValueError('Unexpected source pack schema: ' + str(manifest))
            viewer_base = f'../../fidelity-r24/{kind}/' if release == 'r24' else f'../{kind}/'
            entries.extend(loader(pack, base, viewer_base))
            inputs.append({'path': manifest.relative_to(ROOT).as_posix(), 'sha256': digest(manifest)})
    ids = [entry['id'] for entry in entries]
    if len(set(ids)) != len(ids):
        raise ValueError('Duplicate model identifiers')
    for entry in entries:
        if entry.get('subjectId') and entry['subjectId'] not in roster:
            raise ValueError('Unknown exact catalogue identity: ' + entry['subjectId'])
        if entry.get('subjectId') and entry.get('candidateUid'):
            raise ValueError('An exact identity cannot also be a candidate')
    return {'schema': 're.bow.model-view-catalog/1', 'sourceFilesRewritten': False,
            'canonicalFidelityCertified': False, 'inputs': inputs, 'entries': entries}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    catalog = build()
    if args.check:
        if read(TARGET) != catalog:
            raise ValueError('Viewer catalogue differs from source packs')
    else:
        TARGET.parent.mkdir(parents=True, exist_ok=True)
        TARGET.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'model_entries': len(catalog['entries']), 'source_clips': sum(len(e['clips']) for e in catalog['entries']),
                      'exact_subjects': len({e['subjectId'] for e in catalog['entries'] if e.get('subjectId')}),
                      'canonical_fidelity_certified': False}))


if __name__ == '__main__':
    main()
