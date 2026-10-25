#!/usr/bin/env python3
"""Prepare source-guided image-generation jobs for the exact 385 missing UID."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'modules/fidelity-r27/sprites/jobs.json'
OPEN_STATES = ['idle-cycle', 'walk', 'run', 'light', 'heavy', 'special', 'super',
               'hurt', 'guard', 'knockdown', 'intro', 'victory', 'defeat', 'left-view']


def read(path):
    return json.loads((ROOT / path).read_text())


def reference(path, role, **metadata):
    path = (ROOT / path).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file():
        raise ValueError('Reference must be an existing local file')
    return {'path': path.relative_to(ROOT).as_posix(), 'role': role,
            'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            **metadata}


def build():
    roster = read('data/roster.json')
    old = read('assets/sprites/bow/manifest.json')
    covered = {entry['id'] for entry in old['sprites']}
    if len(covered) != 4 or len(roster['catalog']) != 389:
        raise ValueError('Expected the historical four sprite identities and 389 catalogue UID')
    expansion = read('data/catalog-expansion-v070.json')
    fighters = {entry['uid']: entry for entry in [*roster['fighters'], *expansion['fighters']]}
    contexts = {entry['id']: entry for entry in expansion['records'] if entry.get('encounter')}
    source_index = ROOT / 'modules/fidelity-r27/sources/manifest.json'
    source_entries = {}
    if source_index.exists():
        source_entries = {entry['id']: entry for entry in json.loads(source_index.read_text())['entries']}
    catalog = read('modules/fidelity-r26/models/catalog.json')
    models = {}
    for entry in catalog['entries']:
        if entry.get('subjectId') and entry.get('preview') and entry.get('modelRole', 'body') == 'body':
            models.setdefault(entry['subjectId'], []).append(entry)
    jobs = []
    for entry in roster['catalog']:
        uid = entry['id']
        if uid in covered:
            continue
        refs = []
        for item in source_entries.get(uid, {}).get('references', []):
            if item.get('exactIdentity') is True and not item.get('candidate'):
                path = ROOT / item['path']
                # Models and metadata are evidence, not images for the image generation tool.
                if path.suffix.lower() in ('.png', '.webp', '.jpg', '.jpeg'):
                    actual = reference(item['path'], item.get('role', 'portrait'),
                                       bodyCoverage=item.get('bodyCoverage', 'unknown'),
                                       sourceUrl=item.get('sourceUrl', entry['sourcePage']),
                                       exactIdentity=True)
                    if item.get('sha256') and actual['sha256'] != item['sha256']:
                        raise ValueError('Appearance reference hash mismatch: ' + uid)
                    refs.append(actual)
        fighter = fighters.get(uid, {})
        if fighter.get('visual', {}).get('fullBody') is True:
            refs.append(reference(fighter['sprite'], 'full-body-reference', bodyCoverage='complete',
                                  sourceUrl=fighter.get('spriteSource', entry['sourcePage']), exactIdentity=True))
        refs.append(reference(entry['portrait'], 'portrait', bodyCoverage='unknown',
                              sourceUrl=entry['sourcePage'], exactIdentity=True))
        for model in models.get(uid, []):
            base = ROOT / 'modules/fidelity-r26/models' / model['base']
            path = (base / model['preview']['path']).resolve()
            refs.append(reference(path, 'model-preview', bodyCoverage='unknown',
                                  sourceUrl=model['sourcePage'], exactIdentity=True))
        refs = list({item['path']: item for item in refs}.values())
        refs.sort(key=lambda item: (item['bodyCoverage'] != 'complete', item['role'] == 'portrait', item['path']))
        full = any(item['bodyCoverage'] == 'complete' for item in refs)
        context = uid in contexts
        limits = [
            'Generated interpretation, not an original game frame; geometric 1:1 remains unverified.',
            'One neutral source-guided pose; no authored attack, opposite view or full animation cycle.',
        ]
        if not full:
            limits.append('No complete body reference has been verified; do not certify unseen anatomy or cropped regions.')
        if context:
            limits.append('Contextual encounter: preserve its rooted/structural nature; no free humanoid combat actor.')
        prompt = (
            f'Create one independent transparent-background sprite for {entry["name"]}, exact incarnation: {entry["game"]}. '
            'Use only the attached local references for appearance. Preserve the documented anatomy, proportions, '
            'clothing, equipment, damage, materials and silhouette of this incarnation. Do not mix other games or forms. '
            'A single neutral idle/presentation pose, no text, labels, frame, floor, shadow backdrop, montage or duplicate bodies. '
            'Use a right-facing three-quarter view only where supported by the references; never mirror asymmetric details. '
            'Preserve the visible source crop if the full body is undocumented rather than inventing missing limbs or equipment. '
            'Faithful survival-horror pre-rendered appearance, with a clean alpha edge; no new stylization, decoration or generic monster substitution. '
            + ('This subject is an immobile/contextual encounter: keep its actual plant, structure, organism or environmental form; do not turn it into a walking fighter. ' if context else '')
            + 'This is a generated project asset, not a claim of being an official or geometrically exact original-game frame.'
        )
        jobs.append({'id': uid, 'label': entry['name'], 'incarnation': entry['game'], 'gameKey': entry['gameKey'],
                     'scope': 'context-encounter' if context else 'combatant-neutral-pose',
                     'references': refs, 'completeBodyReferenceVerified': full,
                     'generationPrompt': prompt, 'transparentBackground': True,
                     'outputPath': f'modules/fidelity-r27/sprites/generated/{uid}/idle-right.png',
                     'requestedState': 'idle', 'sourceFacingRequested': 'right', 'canMirror': False,
                     'openStates': OPEN_STATES, 'limitations': limits,
                     'canonicalFidelityCertified': False})
    if len(jobs) != 385 or len({entry['id'] for entry in jobs}) != 385:
        raise ValueError('Expected exactly 385 independent missing sprite identities')
    return {'schema': 're.bow.sprite-generation-jobs/1', 'release': 'R27',
            'generator': 'image_gen', 'sourceIndexUsed': source_index.exists(),
            'historicalSpriteIds': sorted(covered), 'counts': {'targetIdentities': 385,
            'completeBodyReferences': sum(entry['completeBodyReferenceVerified'] for entry in jobs),
            'contextEncounters': sum(entry['scope'] == 'context-encounter' for entry in jobs)}, 'jobs': jobs}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--freeze', action='store_true', help='Lock job prompts and reference hashes before the generation queue runs')
    args = parser.parse_args()
    result = build()
    raw = (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode()
    lock_path = TARGET.parent / 'generation-lock.json'
    digest = hashlib.sha256(raw).hexdigest()
    if lock_path.exists() and json.loads(lock_path.read_text())['jobsSha256'] != digest:
        raise ValueError('Generation jobs are frozen; prompts and references cannot change underneath the queue')
    if args.check:
        if TARGET.read_bytes() != raw:
            raise ValueError('Sprite generation jobs differ from their exact source inputs')
    else:
        TARGET.parent.mkdir(parents=True, exist_ok=True)
        TARGET.write_bytes(raw)
    if args.freeze:
        lock = {'schema': 're.bow.sprite-generation-lock/1', 'jobsSha256': digest,
                'targetIdentities': len(result['jobs']),
                'scope': 'Frozen requests and local reference hashes; not a generation-completion or visual-review claim.'}
        lock_path.write_text(json.dumps(lock, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result['counts']))


if __name__ == '__main__':
    main()
