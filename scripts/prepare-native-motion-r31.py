#!/usr/bin/env python3
"""Select complete native source scenes for observed gestures, without action-name inference."""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r31/motion'
CHOICES = (
    ('rerev-ooze', '_BA_20'), ('rerev-ooze', '_DM_94'),
    ('rerev-tricorne-ooze', '_BA_101'), ('rerev-pincer-ooze', '_UZm_8'),
    ('rerev-farfarello', '_BA_101'), ('rerev-farfarello', '_DM_24'),
    ('rerev-wall-blister', '_BA_102'), ('rerev-chunk-ooze', '_BA_101'),
)
CATALOGS = ('modules/fidelity-r26/models/catalog.json', 'modules/fidelity-r27/motion/catalog.json')


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def checked(path, record):
    raw = path.read_bytes()
    if digest(raw) != record['sha256'] or len(raw) != record['bytes']:
        raise ValueError('Native source bytes changed: ' + str(path))
    return raw


def prepare(check=False):
    entries = {}
    for name in CATALOGS:
        raw = (ROOT / name).read_bytes()
        for entry in json.loads(raw)['entries']:
            entries[entry['id']] = (name, digest(raw), entry)
    jobs = []
    for uid, suffix in CHOICES:
        catalog, catalog_sha, entry = entries[uid]
        source_base = ((ROOT / catalog).parent / entry['base']).resolve()
        clip = next(item for item in entry['clips'] if item['id'].endswith(suffix))
        checked(source_base / entry['model']['path'], entry['model'])
        checked(source_base / entry['materialBindings']['path'], entry['materialBindings'])
        for texture in entry['textures']:
            checked(source_base / texture['path'], texture)
        ticks = [value for value in clip['nativeKeyTimesTicks'] if int(value) >= 0]
        if ticks[0] != '0' or len(ticks) < 61:
            raise ValueError('This selection requires a complete native scene of at least one second')
        step = int(ticks[1])
        if any(int(tick) != index * step for index, tick in enumerate(ticks)) or step * 60 != clip['ticksPerSecond']:
            raise ValueError('Native scene cadence is not exactly sixtyHz')
        if clip.get('path'):
            raw = checked(source_base / clip['path'], clip)
        else:
            checked(source_base / entry['archive']['path'], entry['archive'])
            with ZipFile(source_base / entry['archive']['path']) as archive:
                raw = archive.read(clip['member'])
            if len(raw) != clip['bytes'] or digest(raw) != clip['sha256']:
                raise ValueError('Archive scene differs from its retained member proof')
        target = PACK / 'source-clips' / uid / (clip['id'] + '.FBX')
        if check:
            if target.read_bytes() != raw:
                raise ValueError('Delivered scene differs from the original scene bytes')
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(raw)
        jobs.append({'id': uid + '--' + clip['id'], 'subjectId': uid,
                     'entry': {key: value for key, value in entry.items() if key != 'clips'},
                     'sourceCatalog': {'path': catalog, 'sha256': catalog_sha}, 'sourceClip': clip,
                     'clipFile': {'path': target.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': digest(raw)},
                     'nativeSampleTicks': ticks[:-1], 'actionIdentity': 'unassigned', 'availableCombatStates': []})
    value = {'schema': 're.bow.native-motion-inputs-r31/1', 'release': 'R31', 'jobs': jobs,
             'sourceAnimationModified': False,
             'scope': 'Complete sixtyHz native source-body scenes. Gesture/action labels, original game timing and cinematic roles require separate evidence and review.'}
    payload = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
    target = PACK / 'inputs.json'
    if check:
        if target.read_bytes() != payload:
            raise ValueError('Native motion selection is not reproducible from its frozen catalogues')
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(payload)
    return {'subjects': len({uid for uid, _ in CHOICES}), 'nativeClips': len(jobs),
            'orientedSequences': len(jobs) * 2, 'plannedNativeFrames': sum(len(job['nativeSampleTicks']) * 2 for job in jobs)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    print(json.dumps(prepare(parser.parse_args().check)))
