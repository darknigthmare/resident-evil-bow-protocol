#!/usr/bin/env python3
"""Reproduce the R26 workbook input from reviewed workstreams and frozen packs."""
from collections import Counter, defaultdict
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads((ROOT / path).read_text())


def digest(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


def build():
    packs = {kind: read(f'modules/fidelity-r26/{kind}/manifest.json')
             for kind in ('visual', 'motion', 'audio', 'canonical')}
    visual, motion, audio, canonical = (packs[kind] for kind in ('visual', 'motion', 'audio', 'canonical'))
    catalog = read('modules/fidelity-r26/models/catalog.json')
    review = read('docs/R26_WORKSTREAMS.json')
    validation = read('docs/R26_VALIDATION.json')
    roster = read('data/roster.json')['catalog']
    ids = {entry['id'] for entry in roster}
    models = defaultdict(list)
    rigs = defaultdict(list)
    for entry in visual['entries']:
        models[entry.get('subjectId') or entry.get('candidateUid')].append(entry)
    for entry in motion['entries']:
        rigs[entry.get('subjectId') or entry['id']].append(entry)
    assigned_audio = Counter(entry.get('identity_id') for entry in audio['entries'] if entry.get('identity_id') in ids)
    claims = Counter(entry['uid'] for entry in canonical['claims'])
    clips = motion['summary']['sourceAnimationFiles']
    motions = motion['summary']['positiveTimeMotionFiles']
    poses = motion['summary']['positiveTimePoseFiles']
    values = {
        'visual_entries': len(visual['entries']), 'model_entries': len(catalog['entries']),
        'motion_entries': len(motion['entries']), 'clips': clips, 'motions': motions, 'poses': poses,
        'audio_files': len(audio['entries']), 'audio_assigned': sum(assigned_audio.values()),
        'audio_subjects': len(assigned_audio), 'audio_distinct': len({entry['sha256'] for entry in audio['entries']}), 'claims': len(canonical['claims']),
        'reviewed_subjects': len(claims),
    }
    tasks = []
    old_tasks = {entry['id']: entry for entry in read('docs/R25_TRACKING.json')['tasks']}
    if set(old_tasks) != {entry['id'] for entry in review['tasks']}:
        raise ValueError('The reviewed R26 workstreams must cover every historical task')
    for entry in review['tasks']:
        task = {**old_tasks[entry['id']], **entry, 'status': 'EN COURS'}
        task['advances'] = [line.format_map(values) for line in task['advances']]
        tasks.append(task)
    updates = []
    for entry in roster:
        uid = entry['id']
        updates.append({
            'id': uid,
            'visual': '; '.join(('CANDIDAT — ' if item.get('candidateUid') else '') + item['id'] for item in models[uid]),
            'rig': '; '.join(item['id'] for item in rigs[uid]),
            'motion_clips': sum(len(item['clips']) for item in rigs[uid]),
            'audio': assigned_audio[uid], 'claims': claims[uid],
            'limitations': 'Attribution documentaire et édition conservées ; gestes, rendu de combat et fidélité globale non certifiés.',
        })
    rows = []
    for entry in visual['entries']:
        rows.append(['R20-10', entry.get('subjectId') or entry.get('candidateUid') or entry['id'],
                     'Modèle publié', entry['model']['path'],
                     'Candidat, édition et géométrie à consulter dans le manifeste ; pas un sprite de combat final.',
                     entry['model']['sha256']])
    for entry in motion['entries']:
        uid = entry.get('subjectId') or entry['id']
        for clip in entry['clips']:
            rows.append(['R20-09', uid, 'Pose après zéro' if clip['positiveTimePoseOnly'] else 'Mouvement après zéro',
                         clip.get('path') or clip['member'],
                         'Action non attribuée ; rôle ' + entry.get('modelRole', 'body'), clip['sha256']])
    for entry in audio['entries']:
        uid = entry.get('identity_id') or ', '.join(entry.get('candidate_identity_ids', [])) or 'HORS CATALOGUE'
        rows.append(['G-AUDIO', uid, 'Fichier sonore publié', entry.get('path') or entry.get('file', ''),
                     'Groupe publié ; zéro certification de banque native ou affectation au combat.', entry['sha256']])
    for claim in canonical['claims']:
        for proof in claim['evidence']:
            rows.append(['G-PREUVES', claim['uid'], claim.get('type', claim.get('category', 'Assertion documentaire')),
                         proof['source_id'], proof.get('scope', ''), proof['excerpt']])
    input_paths = ['docs/BOW_FIDELITE_R25.xlsx', 'docs/R25_TRACKING.json', 'docs/R26_WORKSTREAMS.json',
                   'docs/R26_VALIDATION.json', 'modules/fidelity-r26/models/catalog.json']
    input_paths += [f'modules/fidelity-r26/{kind}/manifest.json' for kind in packs]
    input_paths += [item['path'] for item in validation['checks']]
    input_paths += review.get('additional_inputs', [])
    result = {
        'schema': 're.bow.parallel-workstreams/2', 'release': 'R26', 'canonical_fidelity_certified': 0,
        'summary': 'Les 17 chantiers restent ouverts ; les ajouts R26 et leurs preuves sont distincts de la fidélité finale.',
        'statistics': [
            {'label': 'chantiers toujours ouverts', 'value': 17, 'scope': 'Aucune clôture sans preuve complète.'},
            {'label': 'nouvelles références visuelles', 'value': values['visual_entries'], 'scope': 'Modèles documentaires ; sprites de combat finaux non certifiés.'},
            {'label': 'nouveaux fichiers réellement mobiles', 'value': motions, 'scope': f'{poses} pose(s) à clés séparée(s), action non attribuée.'},
            {'label': 'fichiers audio classés par publication', 'value': values['audio_assigned'], 'scope': f"{values['audio_subjects']} UID, {values['audio_distinct']} contenus distincts ; zéro banque native certifiée."},
        ],
        'resources': review['resources'], 'tasks': tasks, 'identity_updates': updates,
        'source_rows': rows, 'validation': validation['checks'],
        'inputs': [{'path': path, 'sha256': digest(path)} for path in dict.fromkeys(input_paths)],
        'motion_manifest': 'modules/fidelity-r26/motion/manifest.json',
    }
    return (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    output = ROOT / 'docs/R26_TRACKING.json'
    expected = build()
    if args.check:
        if output.read_bytes() != expected:
            raise ValueError('R26 tracking differs from its reviewed inputs')
    else:
        output.write_bytes(expected)
    result = json.loads(expected)
    print(json.dumps({'check': args.check, 'tasks': len(result['tasks']),
                      'identities': len(result['identity_updates']), 'source_rows': len(result['source_rows'])}))


if __name__ == '__main__':
    main()
