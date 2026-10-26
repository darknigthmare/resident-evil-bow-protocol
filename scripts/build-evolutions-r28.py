#!/usr/bin/env python3
"""Rebuild source-checked R28 graph script and isolated replay compatibility seal."""
import argparse
import gzip
import hashlib
import html
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = ROOT / 'modules/fidelity-r28/evolutions'
INPUTS = [
    'src/re-data.js', 'src/catalog-expansion-data.js', 'src/catalog-trial-adapter.js',
    'src/spatial-weakpoints-v072.js', 'src/combat-foundation-v060.js',
    'modules/fidelity-r28/evolutions/graph.json',
    'modules/fidelity-r28/evolutions/data.js',
    'modules/fidelity-r28/evolutions/engine.js',
    'modules/fidelity-r28/evolutions/replay.js',
]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def build(check=False):
    graph = json.loads((BASE / 'graph.json').read_text())
    source_ids = set()
    for source in graph['sources']:
        assert source['id'] not in source_ids
        source_ids.add(source['id'])
        path = (ROOT / source['snapshot']).resolve()
        assert path.is_relative_to(ROOT)
        compressed = path.read_bytes()
        assert sha(compressed) == source['snapshotSha256']
        raw = gzip.decompress(compressed)
        assert sha(raw) == source['rawSha256']
        text = re.sub(r'<(script|style).*?</\1>', '', raw.decode(), flags=re.S)
        text = re.sub(r'\s+', ' ', html.unescape(re.sub('<[^>]*>', ' ', text)))
        assert source['excerpt'] in text, source['id']
    seen = set()
    for family in graph['families']:
        assert family['baseUid'] == family['forms'][0]
        assert not (seen & set(family['forms']))
        seen.update(family['forms'])
    for edge in graph['edges']:
        assert edge['from'] != edge['to']
        assert set(edge['sourceIds']) <= source_ids
        family = next(f for f in graph['families'] if f['id'] == edge['familyId'])
        assert edge['from'] in family['forms'] and edge['to'] in family['forms']
        assert family['forms'].index(edge['from']) < family['forms'].index(edge['to'])
        if edge['playable']:
            assert edge['from'] not in graph['contextOnlyUids']
            assert edge['to'] not in graph['contextOnlyUids']
    script = '/* Generated from graph.json; do not merge incarnations. */\n'
    script += "(function(root){'use strict';const data="
    script += json.dumps(graph, ensure_ascii=False, separators=(',', ':'))
    script += ";function freeze(v){if(v&&typeof v==='object'){Object.freeze(v);Object.values(v).forEach(freeze);}return v;}root.RE_EVOLUTION_DATA_R28=freeze(data);})(globalThis);\n"
    if check:
        assert (BASE / 'data.js').read_text() == script
    else:
        (BASE / 'data.js').write_text(script)
    files = [{'path': p, 'sha256': sha((ROOT / p).read_bytes())} for p in INPUTS]
    digest = sha(json.dumps(files, sort_keys=True, separators=(',', ':')).encode())
    contract = {'schema': 're.bow.evolution-runtime-contract/1', 'digest': digest, 'files': files}
    contract_text = json.dumps(contract, ensure_ascii=False, indent=2) + '\n'
    contract_js = "/* R28 compatibility only; preserved R7/R13 records keep their engines. */\n(function(root){'use strict';root.RE_EVOLUTION_CONTRACT_R28=Object.freeze("
    contract_js += json.dumps({'schema': contract['schema'], 'digest': digest}, separators=(',', ':'))
    contract_js += ');})(globalThis);\n'
    for name, data in [('contract.json', contract_text), ('contract.js', contract_js)]:
        if check:
            assert (BASE / name).read_text() == data
        else:
            (BASE / name).write_text(data)
    print(json.dumps({'pass': True, 'families': len(graph['families']), 'forms': len(seen),
                      'edges': len(graph['edges']), 'playableEdges': sum(e['playable'] for e in graph['edges']),
                      'sources': len(source_ids), 'contract': digest}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    build(parser.parse_args().check)
