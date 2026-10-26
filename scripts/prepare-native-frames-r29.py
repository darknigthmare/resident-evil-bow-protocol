#!/usr/bin/env python3
"""Select published native FBX scenes without assigning their opaque action codes."""
import hashlib
import json
import argparse
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'modules/fidelity-r29/motion'
IDS = ('rerev-ooze', 'rerev-chunk-ooze', 'rerev-tricorne-ooze', 'rerev-pincer-ooze', 'rerev-farfarello', 'rerev-wall-blister')


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def check(path, record):
    raw = path.read_bytes()
    if len(raw) != record['bytes'] or sha(raw) != record['sha256']:
        raise ValueError('Published bytes differ: ' + str(path))
    return raw


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    entries = {}
    for catalog in ('modules/fidelity-r26/models/catalog.json', 'modules/fidelity-r27/motion/catalog.json'):
        raw = (ROOT / catalog).read_bytes()
        for entry in json.loads(raw)['entries']:
            if entry['id'] in IDS:
                entries[entry['id']] = (catalog, sha(raw), entry)
    jobs = []
    for uid in IDS:
        catalog, catalog_sha, entry = entries[uid]
        base = (ROOT / catalog).parent.joinpath(entry['base']).resolve()
        check(base / entry['model']['path'], entry['model'])
        check(base / entry['materialBindings']['path'], entry['materialBindings'])
        for texture in entry['textures']:
            check(base / texture['path'], texture)
        moving = [clip for clip in entry['clips'] if not clip.get('positiveTimePoseOnly') and clip.get('varyingNonnegativeAnimationCurveCount', 1) > 0]
        first = next(clip for clip in moving if clip['id'].endswith('_BA_1') or clip['id'].endswith('_BA_0'))
        selected = [first]
        # Select native codes for variety, never infer a game action from BA/DM.
        for code in ('_BA_20', '_DM_24', '_UZm_1', '_BA_101', '_BA_102', '_DM_1'):
            clip = next((clip for clip in moving if clip['id'].endswith(code)), None)
            if clip and clip not in selected:
                selected.append(clip)
            if len(selected) == 4:
                break
        if len(selected) != 4:
            raise ValueError('Four actual moving native scenes required: ' + uid)
        archive = None
        if any(not clip.get('path') for clip in selected):
            check(base / entry['archive']['path'], entry['archive'])
            archive = ZipFile(base / entry['archive']['path'])
        try:
            for clip in selected:
                if clip.get('path'):
                    raw = check(base / clip['path'], clip)
                else:
                    raw = archive.read(clip['member'])
                    if len(raw) != clip['bytes'] or sha(raw) != clip['sha256']:
                        raise ValueError('Extracted scene differs from published member')
                folder = OUT / 'source-clips' / uid
                target = folder / (clip['id'] + '.FBX')
                if args.check:
                    if target.read_bytes() != raw:
                        raise ValueError('Delivered native scene differs from source archive: ' + str(target))
                else:
                    folder.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(raw)
                ticks = [tick for tick in clip['nativeKeyTimesTicks'] if int(tick) >= 0]
                sampled = [ticks[round(index * (len(ticks) - 1) / 15)] for index in range(16)]
                if len(set(sampled)) != 16:
                    raise ValueError('Sixteen distinct native sample times required')
                body_entry = {key: value for key, value in entry.items() if key != 'clips'}
                jobs.append({'id': uid + '--' + clip['id'], 'subjectId': entry['subjectId'], 'entry': body_entry,
                             'sourceCatalog': {'path': catalog, 'sha256': catalog_sha},
                             'sourceClip': clip, 'clipFile': {'path': target.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': sha(raw)},
                             'nativeSampleTicks': sampled, 'sourcePoseViews': clip is first,
                             'actionIdentity': 'unassigned', 'availableCombatStates': []})
        finally:
            if archive:
                archive.close()
    result = {'schema': 're.bow.native-frame-render-inputs-r29/1', 'release': 'R29', 'jobs': jobs,
              'scope': 'Opaque published scenes, exact native-key times, no inferred idle/attack or game-frame certification.'}
    payload = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    if args.check:
        if (OUT / 'inputs.json').read_text() != payload:
            raise ValueError('Native rendering inputs differ from their preserved catalogue/scene sources')
    else:
        (OUT / 'inputs.json').write_text(payload)
    print(json.dumps({'subjects': len(IDS), 'nativeScenes': len(jobs), 'sourceFramesPlanned': len(jobs) * 16, 'poseViewsPlanned': len(IDS) * 4}))


if __name__ == '__main__':
    main()
