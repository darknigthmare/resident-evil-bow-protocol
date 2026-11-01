#!/usr/bin/env python3
"""Bind additional bodies and full source scenes to preserved R26 native bytes."""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r33/native'
CATALOG = ROOT / 'modules/fidelity-r26/models/catalog.json'
BODIES = ('re0-zombie-gc-r26-1', 're0-zombie-gc-r26-2',
          're5-chainsaw-majini-pc-published', 're5-executioner-pc-published')
SCENES = (
    ('rerev-sea-creeper', 'em1200_em1200_BA_17'),
    ('rerev-sea-creeper', 'em1200_em1200_BA_7'),
    ('rerev-sea-creeper', 'em1200_em1200_DM_61'),
    ('rerev-scagdead', 'em1400_em1400_BA_105'),
    ('rerev-scagdead', 'em1400_em1400_BA_7'),
    ('rerev-scagdead', 'em1400_em1400_DM_91'),
)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def proof(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': digest(raw)}


def checked(path, record):
    raw = path.read_bytes()
    if len(raw) != record['bytes'] or digest(raw) != record['sha256']:
        raise ValueError('Preserved native source changed: ' + str(path))
    return raw


def publish(path, payload, check):
    if check:
        if path.read_bytes() != payload:
            raise ValueError('Native R33 input is not reproduced by preserved sources: ' + str(path))
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(payload)


def prepare(check=False):
    catalog = json.loads(CATALOG.read_bytes())
    entries = {entry['id']: entry for entry in catalog['entries']}
    catalog_proof = proof(CATALOG)
    bodies = []
    for identifier in BODIES:
        entry = entries[identifier]
        source_base = (CATALOG.parent / entry['base']).resolve()
        for item in [entry['model'], entry['archive'], entry.get('materials'), *entry['textures']]:
            if item:
                checked(source_base / item['path'], item)
        bodies.append({'id': identifier, 'subjectId': entry['subjectId'], 'entry': entry,
                       'sourceCatalog': catalog_proof, 'cameraUpAxis': 'Y', 'cellSize': 512,
                       'materialMode': 'unlit-source-albedo'})
    jobs = []
    previous = set()
    for path in (ROOT / 'modules/fidelity-r30/native/other-games/motion-manifest.json',
                 ROOT / 'modules/fidelity-r31/motion/manifest.json'):
        previous.update((entry['subjectId'], entry['clipId']) for entry in json.loads(path.read_text())['entries'])
    for uid, clip_id in SCENES:
        if (uid, clip_id) in previous:
            raise ValueError('A previously rendered scene must not be counted as new')
        entry = entries[uid]
        base = (CATALOG.parent / entry['base']).resolve()
        clip = next(item for item in entry['clips'] if item['id'] == clip_id)
        for item in [entry['model'], entry['archive'], entry['materialBindings'], *entry['textures']]:
            checked(base / item['path'], item)
        ticks = [tick for tick in clip['nativeKeyTimesTicks'] if int(tick) >= 0]
        if not ticks or ticks[0] != '0' or len(ticks) < 61:
            raise ValueError('A complete moving source scene of at least one second is required')
        step = int(ticks[1])
        if step * 60 != clip['ticksPerSecond'] or any(int(value) != index * step for index, value in enumerate(ticks)):
            raise ValueError('Source cadence is not exactly sixty native key samples per second')
        if ticks[-1] != clip['keyTimeEnd'] or clip.get('positiveTimePoseOnly'):
            raise ValueError('The complete native endpoint and actual nonnegative deformation are required')
        if clip.get('path'):
            raw = checked(base / clip['path'], clip)
        else:
            with ZipFile(base / entry['archive']['path']) as archive:
                raw = archive.read(clip['member'])
            if len(raw) != clip['bytes'] or digest(raw) != clip['sha256']:
                raise ValueError('Native archive member proof differs')
        target = PACK / 'source-clips' / uid / (clip_id + '.FBX')
        publish(target, raw, check)
        jobs.append({'id': uid + '--' + clip_id, 'subjectId': uid,
                     'entry': {key: value for key, value in entry.items() if key != 'clips'},
                     'sourceCatalog': catalog_proof, 'sourceClip': clip, 'clipFile': proof(target),
                     'nativeSampleTicks': ticks[:-1], 'actionIdentity': 'unassigned', 'availableCombatStates': []})
    value = {'schema': 're.bow.native-inputs-r33/1', 'release': 'R33', 'catalog': catalog_proof,
             'bodies': bodies, 'jobs': jobs, 'sourceFilesRewritten': False,
             'scope': 'New derived body views and full native source scenes; original action names, idle roles, target edition equivalence and original game rendering remain unproved.'}
    publish(PACK / 'inputs.json', (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode(), check)
    return {'newBodyIdentities': len({entry['subjectId'] for entry in bodies}), 'sourceBodyVariants': len(bodies),
            'plannedBodyViews': len(bodies) * 4, 'newFullSourceClips': len(jobs),
            'plannedNativeFrames': sum(len(job['nativeSampleTicks']) * 2 for job in jobs)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    print(json.dumps(prepare(parser.parse_args().check)))
