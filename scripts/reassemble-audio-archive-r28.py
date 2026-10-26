#!/usr/bin/env python3
"""Reconstruct one exact R28 publisher ZIP, refusing an existing output."""
import argparse
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('audio_r28', ROOT / 'scripts/import-audio-archives-r28.py')
AUDIO = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(AUDIO)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--asset', required=True, type=int)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    request = json.loads((AUDIO.MODULE / 'import-request.json').read_text())
    source = next((row for row in request['sources'] if row['publication_asset_id'] == args.asset), None)
    if source is None:
        parser.error('Unknown publisher asset in the frozen request')
    raw = AUDIO.read_source_archive(source, AUDIO.MODULE)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('xb') as output:
        output.write(raw)
    print(json.dumps({'asset': args.asset, 'bytes': len(raw), 'sha256': AUDIO.sha(raw)}))


if __name__ == '__main__': main()
