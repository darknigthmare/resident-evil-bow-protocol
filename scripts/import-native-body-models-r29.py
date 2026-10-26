#!/usr/bin/env python3
"""Retain bounded original OBJ/material/texture members without editing source bytes."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('bounded_native_r26', ROOT / 'scripts/import-visual-models-r26.py')
BOUNDED = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BOUNDED)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--request', default='docs/R29_NATIVE_BODY_IMPORT_REQUEST.json')
    args = parser.parse_args()
    request_path = ROOT / args.request
    request = json.loads(request_path.read_text())
    if request.get('schema') != 're.bow.native-body-import-r29/1':
        raise ValueError('Unknown native-body source import request')
    destination = (ROOT / request['output']).resolve()
    if not destination.is_relative_to(ROOT / 'modules/fidelity-r29/sources'):
        raise ValueError('Source model output leaves the R29 source pack')
    roster = {row['id']:row for row in json.loads((ROOT / 'data/roster.json').read_text())['catalog']}
    entries = []
    for item in request['entries']:
        if item['subjectId'] not in roster or item['game'] != roster[item['subjectId']]['game']:
            raise ValueError('Source body requires an exact roster incarnation')
        inputs = {}
        for kind in ('archive', 'publisherPage', 'corroboration'):
            record = item[kind]
            path = (ROOT / record['path']).resolve()
            if not path.is_relative_to(destination):
                raise ValueError('Imported source input must already be retained inside its source pack')
            raw = path.read_bytes()
            if len(raw) != record['bytes'] or sha(raw) != record['sha256']:
                raise ValueError('Source input changed: ' + record['path'])
            inputs[kind] = raw
        if any(text not in inputs['publisherPage'].decode('utf-8') for text in item['publisherPageText']):
            raise ValueError('Publisher page does not bind the declared game and body subject')
        if item['corroborationText'] not in inputs['corroboration'].decode('utf-8'):
            raise ValueError('Independent retained subject page does not support the specified label')
        archive = BOUNDED.SOURCE.archive(inputs['archive'])
        names = [entry.filename for entry in archive.infolist() if not entry.is_dir()]
        member = BOUNDED.SOURCE.safe_path(item['modelMember'])
        obj = archive.read(member)
        libraries = [line.split(None, 1)[1].strip() for line in obj.decode('utf-8').splitlines() if line.startswith('mtllib ')]
        if len(libraries) != 1 or not member.endswith('.obj'):
            raise ValueError('Only one explicit original OBJ material library is admitted')
        mtl_member = str(PurePosixPath(member).parent / BOUNDED.SOURCE.safe_path(libraries[0]))
        mtl = archive.read(mtl_member)
        aliases, texture_members = [], []
        for line in mtl.decode('utf-8').splitlines():
            fields = line.split(None, 1)
            if not fields or not fields[0].startswith('map_'):
                continue
            if len(fields) != 2 or fields[1].startswith('-'):
                raise ValueError('Unreviewed source material texture option')
            literal = fields[1].strip()
            basename = literal.replace('\\', '/').split('/')[-1]
            matches = [name for name in names if PurePosixPath(name).name.casefold() == basename.casefold()]
            if not matches or len({sha(archive.read(name)) for name in matches}) != 1:
                raise ValueError('Missing or ambiguous exact texture basename in retained source archive')
            selected = sorted(matches)[0]
            BOUNDED.SOURCE.png(archive.read(selected))
            aliases.append({'literalMtlReference':literal, 'sourceMember':selected, 'resolution':'literal-basename-identical-source-bytes', 'sha256':sha(archive.read(selected))})
            if selected not in texture_members:
                texture_members.append(selected)

        def publish(name):
            name = BOUNDED.SOURCE.safe_path(name)
            raw = archive.read(name)
            relative = 'models/asset-' + str(item['assetId']) + '/' + name
            path = destination / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            if path.exists() and path.read_bytes() != raw:
                raise ValueError('Refusing to rewrite differing retained source bytes')
            if not path.exists():
                path.write_bytes(raw)
            return {'path':relative, 'member':name, 'bytes':len(raw), 'sha256':sha(raw)}

        entries.append({'id':item['id'], 'subjectId':item['subjectId'], 'label':item['label'], 'game':item['game'],
                        'platform':item['platform'], 'sourceEdition':item['sourceEdition'], 'base':'./', 'format':'OBJ',
                        'model':publish(member), 'materials':publish(mtl_member), 'textures':[publish(name) for name in texture_members],
                        'archive':{**item['archive'], 'path':str((ROOT / item['archive']['path']).relative_to(destination))},
                        'sourcePage':item['publisherPage']['url'], 'sourceSubjectEvidence':item['subjectQualification'],
                        'geometryScope':'published-body-reference', 'sourceFilesRewritten':False,
                        'nativeTextureReferenceAliases':aliases, 'canonicalFidelityCertified':False,
                        'limitations':item['limitations']})
    catalog = {'schema':'re.bow.native-body-reference-catalog-r29/1', 'release':'R29',
               'request':{'path':request_path.relative_to(ROOT).as_posix(), 'sha256':sha(request_path.read_bytes())},
               'sourceFilesRewritten':False, 'canonicalFidelityCertified':False, 'entries':entries}
    (destination / 'catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'sourceModels':len(entries), 'sourceIdentities':len({entry['subjectId'] for entry in entries}), 'originalGameSprites':0}))


if __name__ == '__main__':
    main()
