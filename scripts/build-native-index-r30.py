#!/usr/bin/env python3
"""Bind the three separately reviewed R30 native asset lots without editing them."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = 'modules/fidelity-r30/native/manifest.json'
LOTS = tuple('modules/fidelity-r30/native/' + name + '/manifest.json'
             for name in ('revelations', 'other-games', 'new-sources'))


def build(allow_pending=False):
    subjects, seen, lots, missing, counts = set(), set(), [], [], Counter()
    known = {item['id'] for item in json.loads((ROOT / 'data/roster.json').read_text())['catalog']}
    for name in LOTS:
        path = ROOT / name
        if not path.is_file():
            missing.append(name)
            continue
        raw = path.read_bytes()
        value = json.loads(raw)
        if (value.get('schema') != 're.bow.native-2d-lot-r30/1' or value.get('release') != 'R30'
                or value.get('canonicalFidelityCertified') is not False or not value.get('entries')):
            raise ValueError('Missing or invalid native lot: ' + name)
        for entry in value['entries']:
            if entry.get('id') in seen or entry.get('subjectId') not in known:
                raise ValueError('Duplicate native entry or unknown exact catalogue identity')
            if entry.get('kind') not in ('native-static-pose', 'native-sequence'):
                raise ValueError('Unknown native observation kind')
            if (entry.get('canMirror') is not False or entry.get('canonicalFidelityCertified') is not False
                    or entry.get('originalGameFrames') is not False):
                raise ValueError('Native source renders cannot become original game frames or certified1:1')
            if not entry.get('frames') or entry.get('frameCount', len(entry['frames'])) != len(entry['frames']):
                raise ValueError('Native entry frame count differs')
            for frame in entry['frames']:
                local = frame.get('path', '')
                target = (ROOT / local).resolve()
                if not local.startswith('modules/fidelity-r30/native/') or not target.is_relative_to(ROOT):
                    raise ValueError('Native frame leaves its release')
                data = target.read_bytes()
                if len(data) != frame['bytes'] or hashlib.sha256(data).hexdigest() != frame['sha256']:
                    raise ValueError('Native frame bytes differ: ' + local)
            seen.add(entry['id'])
            subjects.add(entry['subjectId'])
            counts['entries'] += 1
            counts['nativeRenderedFrames'] += len(entry['frames'])
            counts['staticPoseEntries' if entry['kind'] == 'native-static-pose' else 'sequenceEntries'] += 1
        lots.append({'path': name, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})
    if missing and not allow_pending:
        raise ValueError('Native lots are still missing: ' + ', '.join(missing))
    return {'schema': 're.bow.native-2d-index-r30/1', 'release': 'R30', 'lots': lots,
            'counts': {'subjects': len(subjects), **dict(counts)}, 'pendingLots': missing,
            'canonicalFidelityCertified': False,
            'scope': 'Separately reviewed native-source 2D renders; exact target combat admission, optional edition variants and unassigned source studies stay explicit in each lot.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--allow-pending', action='store_true')
    args = parser.parse_args()
    value = build(args.allow_pending)
    raw = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
    target = ROOT / PATH
    if args.check:
        if not target.is_file() or target.read_bytes() != raw:
            raise ValueError('Native index differs from the delivered source lots')
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(raw)
    print(json.dumps(value['counts']))


if __name__ == '__main__':
    main()
