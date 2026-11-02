#!/usr/bin/env python3
"""Inventory every actual fighter, while keeping held references and refusals explicit."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = 'modules/fidelity-r34/assets/jobs.json'
INPUTS = ['data/roster.json', 'data/catalog-expansion-v070.json',
          'modules/fidelity-r27/sprites/jobs.json', 'modules/fidelity-r27/sources/manifest.json',
          'modules/fidelity-r31/sprites/manifest.json', 'assets/sprites/bow/manifest.json',
          'modules/fidelity-r33/selection/manifest.json', 'modules/fidelity-r33/combat/native-index.json']


def read(name):
    return json.loads((ROOT / name).read_text())


def ref(name, **meta):
    path = (ROOT / name).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file() or path.is_symlink():
        raise ValueError('Reference must be an ordinary local source file: ' + name)
    raw = path.read_bytes()
    return {'path': name, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(), **meta}


def build():
    roster, expansion = read(INPUTS[0]), read(INPUTS[1])
    fighters = {entry['uid']: entry for entry in [*roster['fighters'], *expansion['fighters']]}
    main = {entry['uid'] for entry in roster['fighters']}
    contexts = {entry['id'] for entry in expansion['records'] if entry.get('encounter')}
    assert len(main) == 115 and len(fighters) == 346 and len(contexts) == 43
    assert not (contexts & set(fighters))
    catalogue = {entry['id']: entry for entry in roster['catalog']}
    old_jobs = {entry['id']: entry for entry in read(INPUTS[2])['jobs']}
    sources = {entry['id']: entry for entry in read(INPUTS[3])['entries']}
    prior = read(INPUTS[4])
    refusals = {entry['id']: entry for entry in prior['pending']}
    revision_refusals = {entry['id']: entry for entry in prior.get('revisionFailures', [])}
    assert len(refusals) == 22 and len(revision_refusals) == 1
    historical = {entry['id']: entry for entry in read(INPUTS[5])['sprites']}
    avatars = read(INPUTS[6])
    missing_exact = {entry['id']: entry for entry in avatars['missing']}
    native = []
    index = read(INPUTS[7])
    input_refs = [ref(name) for name in INPUTS]
    for lot in index['lots']:
        input_refs.append(ref(lot['path']))
        native.extend(read(lot['path'])['entries'])
    native_by_uid = {}
    for entry in native:
        native_by_uid.setdefault(entry['subjectId'], []).append(entry)
    jobs = []
    ordered = sorted(fighters, key=lambda uid: (uid not in main, uid))
    for sequence, uid in enumerate(ordered):
        target = catalogue[uid]
        old = old_jobs.get(uid, {})
        references, held = {}, {}
        native_entries = native_by_uid.get(uid, [])
        all_native_held = bool(native_entries) and not any(entry['admittedTargetEdition'] for entry in native_entries)

        def add(value, force_held=False):
            name = value['path']
            if Path(name).suffix.lower() not in {'.png', '.jpg', '.jpeg', '.webp'}:
                return
            item = ref(name, role=value.get('role', 'source-reference'),
                       bodyCoverage=value.get('bodyCoverage', 'unknown'),
                       exactIdentity=True, sourceUrl=value.get('sourceUrl', value.get('sourcePage', target['sourcePage'])),
                       sourceEdition=value.get('sourceEdition', target['game']),
                       targetEditionAdmitted=not force_held,
                       bodyCompletenessIndependentReviewRequired=True)
            if force_held:
                item['heldReason'] = 'Source edition/model is not admitted as the target incarnation; do not silently promote a port.'
                held[name] = item
            else:
                references[name] = item

        for entry in old.get('references', []):
            is_model = entry.get('role') in {'source-model-render', 'model-preview', 'native-model-render'}
            add(entry, all_native_held and is_model)
        for entry in sources.get(uid, {}).get('references', []):
            if entry.get('exactIdentity') is True and not entry.get('candidate'):
                is_model = 'model' in entry.get('role', '')
                add(entry, all_native_held and is_model)
        for entry in historical.get(uid, {}).get('provenance', {}).get('references', []):
            name = entry.get('local', entry.get('path'))
            if name:
                add({'path': name, 'role': 'historical-source-reference', 'sourceUrl': entry.get('sourcePage', target['sourcePage'])})
        # Catalogue references are UID-bound secondary sources, never complete-body certificates.
        if uid not in missing_exact:
            add({'path': target['portrait'], 'role': 'catalogue-reference', 'sourceUrl': target['sourcePage']})
        for entry in native_entries:
            if entry['sourceFacing'] not in {'front', 'right', 'left'} or not entry['frames']:
                continue
            frame = entry['frames'][0]
            complete = entry.get('fullBodyReviewed') and not entry.get('knownAppearanceGaps')
            add({'path': frame['path'], 'role': 'native-source-body-view',
                 'sourceEdition': entry['sourceEdition'], 'sourceUrl': entry.get('sourcePage', target['sourcePage']),
                 'bodyCoverage': 'complete' if complete else 'unknown'}, not entry['admittedTargetEdition'])
        blocked = uid in refusals or uid in revision_refusals
        exact_missing = uid in missing_exact
        if exact_missing:
            # The prior audit found a provisional composite for this exact form.
            for name, item in references.items():
                held[name] = {**item, 'targetEditionAdmitted': False,
                              'heldReason': missing_exact[uid]['reason']}
            references = {}
        refs = sorted(references.values(), key=lambda item: (item['bodyCoverage'] != 'complete', 'catalogue' in item['role'], item['path']))
        full = any(item['bodyCoverage'] == 'complete' for item in refs)
        status = 'BLOCKED_HISTORICAL_REFUSAL' if blocked else 'HELD_EXACT_REFERENCE' if exact_missing or not refs else 'READY_FOR_SOURCE_REVIEW'
        lot = 'lot_' + str(sequence % 4 + 1)
        destination = 'modules/fidelity-r34/assets/generated/' + uid
        prompt_base = ('Create a faithful generated game asset for ' + target['name'] + ', exact incarnation ' + target['game'] + '. '
                       'Use the attached verified references only. Preserve the precise head, anatomy, proportions, costume, equipment, '
                       'material colours and asymmetric details. Do not mix games, phases or editions. '
                       'Match the source appearance without added cartoon outlines, coloured halos or decoration. '
                       'One subject only, no text, labels, scenery, floor, montage or frame. Clean transparent alpha. '
                       'This remains a generated adaptation, not an original Capcom frame or a geometric 1:1 certificate. ')
        jobs.append({'id': uid, 'uid': uid, 'label': target['name'], 'incarnation': target['game'],
                     'gameKey': target['gameKey'], 'fighterCategory': 'main' if uid in main else 'experimental',
                     'lotId': lot, 'sequence': sequence, 'scope': 'combatant', 'status': status,
                     'references': refs, 'heldEditionReferences': sorted(held.values(), key=lambda item: item['path']),
                     'inheritedCompleteBodyReference': full,
                     'completeBodyReferenceVerifiedByR34': False,
                     'bodyGenerationGate': 'INDEPENDENT_COMPLETE_SOURCE_REVIEW_REQUIRED',
                     'blockedReason': (refusals.get(uid) or revision_refusals.get(uid) or missing_exact.get(uid) or {}).get('reason'),
                     'outputs': {
                         'portrait': {'kind': 'portrait', 'outputPath': destination + '/portrait.png',
                                      'receiptPath': 'modules/fidelity-r34/assets/lots/' + lot + '/' + uid + '/portrait.json',
                                      'prompt': prompt_base + 'A square selection portrait showing the head and upper body, with the characteristic face and equipment readable at thumbnail size. Keep the visible identity complete inside this portrait crop; do not invent undocumented features.'},
                         'idle': {'kind': 'idle', 'outputPath': destination + '/idle-right.png',
                                  'receiptPath': 'modules/fidelity-r34/assets/lots/' + lot + '/' + uid + '/idle.json',
                                  'prompt': prompt_base + 'One complete full-body static combat idle base pose, facing right in a side/three-quarter fighting-game view. Keep every source-documented limb, foot, tail, wing, tentacle, horn and equipment inside the image with generous transparent padding. Preserve actual locomotion and support points; do not turn a quadruped or aquatic creature into a humanoid. Produce the entire body in this one image, not separate pieces. No motion blur, duplicate bodies or animation-frame grid. Only proceed after actually reviewing a complete source body reference.'}},
                     'canonicalFidelityCertified': False, 'originalIdleAnimationCertified': False,
                     'historicalRefusalPreserved': blocked})
    counts = {'catalogueIdentities': 389, 'combatantIdentities': 346, 'mainFighters': 115,
              'experimentalFighters': 231, 'excludedContextualEncounters': 43,
              'requestedPortraits': 346, 'requestedWholeBodyIdlePoses': 346,
              'historicalInitialRefusalsInCatalogue': 22, 'historicalRevisionRefusalsInCatalogue': 1,
              'blockedCombatants': sum(item['historicalRefusalPreserved'] for item in jobs),
              'heldExactReferenceCombatants': sum(item['status'] == 'HELD_EXACT_REFERENCE' for item in jobs),
              'sourceReviewReadyCombatants': sum(item['status'] == 'READY_FOR_SOURCE_REVIEW' for item in jobs),
              'inheritedCompleteBodyReferenceCombatants': sum(item['inheritedCompleteBodyReference'] for item in jobs),
              'newMediaGeneratedByInventory': 0, 'canonicalFidelityCertified': 0}
    return {'schema': 're.bow.fighter-asset-jobs-r34/1', 'release': 'R34', 'baselineCommit': '6c2d0d91f4dd79eff1190cd50a352feb2a05dfe5',
            'counts': counts, 'lots': [{'id': 'lot_' + str(i), 'jobs': [job['uid'] for job in jobs if job['lotId'] == 'lot_' + str(i)]} for i in range(1, 5)],
            'sourceFiles': input_refs, 'phaseOrder': ['portrait', 'idle'],
            'policy': {'historicalRefusalRetries': False, 'contextualActorsPromoted': False, 'generatedPngBytesEdited': False,
                       'completeBodyNeedsActualSourceReview': True, 'oneSubjectPerOutputRecommended': True,
                       'existingMediaMustBeMarkedReused': True}, 'jobs': jobs}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    value = build()
    raw = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
    target = ROOT / TARGET
    if args.check:
        assert target.read_bytes() == raw, 'R34 fighter asset jobs are stale.'
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(raw)
    print(json.dumps(value['counts']))


if __name__ == '__main__':
    main()
