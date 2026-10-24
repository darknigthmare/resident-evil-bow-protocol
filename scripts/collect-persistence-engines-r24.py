#!/usr/bin/env python3
"""Freeze the actual pre-R13 engine from this repository, without changing it.

All engine scripts are copied verbatim so that a future current-engine change
cannot silently alter the historical reconstruction.
"""
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / 'modules/fidelity-r24/persistence'
COMMIT = '31671fecf53a26d81f77d2cb13a5ff61f15ef363'


def historical(path):
    return subprocess.check_output(['git', 'show', COMMIT + ':' + path], cwd=ROOT)


def sha(body):
    return hashlib.sha256(body).hexdigest()


def contract(body):
    found = re.search(rb'"digest":"([0-9a-f]{64})"', body)
    if not found:
        raise ValueError('Repository contract digest missing')
    return found.group(1).decode('ascii')


def main():
    folder = MODULE / 'historical/pre-r13'
    folder.mkdir(parents=True, exist_ok=True)
    html = historical('modules/versus.html')
    (folder / 'versus.html').write_bytes(html)
    scripts = []
    for source in re.findall(r'<script[^>]*src="([^"]+)"[^>]*>', html.decode('utf-8')):
        path = 'src/' + Path(source).name
        body = historical(path)
        reused = (ROOT / path).read_bytes() == body
        relative = path
        output = folder / relative
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(body)
        scripts.append({'original_src': source, 'source_path': path, 'sha256': sha(body), 'bytes': len(body), 'byte_identical_to_current_at_collection': reused, 'snapshot_path': relative})
    manifest = {'schema': 're.bow.historical-engine-snapshot/1', 'id': 'main-pre-r13', 'label': 'Versus principal avant R13', 'source_commit': COMMIT, 'runtime_contract': contract(historical('src/runtime-contract.js')), 'original_html': {'source_path': 'modules/versus.html', 'path': 'versus.html', 'sha256': sha(html), 'bytes': len(html)}, 'scripts': scripts, 'limits': ['One actual repository revision, not all historical game versions.', 'Images and sound remain references to existing repository assets; replay verification does not certify their rendering.']}
    (folder / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    index = {'schema': 're.bow.replay-engine-index/1', 'current_main': {'id': 'main-current', 'label': 'Versus principal actuel', 'runtime_contract': contract((ROOT / 'src/runtime-contract.js').read_bytes())}, 'historical_main': [{'id': manifest['id'], 'label': manifest['label'], 'runtime_contract': manifest['runtime_contract'], 'source_commit': COMMIT, 'manifest': 'historical/pre-r13/manifest.json'}]}
    (MODULE / 'engines.json').write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'snapshot': str(folder.relative_to(ROOT)), 'source_commit': COMMIT, 'script_count': len(scripts), 'byte_identical_current_scripts': sum(row['byte_identical_to_current_at_collection'] for row in scripts), 'copied_scripts': len(scripts)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
