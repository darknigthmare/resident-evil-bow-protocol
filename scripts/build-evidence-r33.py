#!/usr/bin/env python3
"""Build/check the R33 documentary evidence package without network access."""
from __future__ import annotations

import argparse
import copy
import gzip
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PACK = 'modules/fidelity-r33/evidence'
HISTORICAL = [f'modules/fidelity-r{x}/canonical/manifest.json' for x in (24, 25, 26, 27, 28, 31)]
AUDIO = 'modules/fidelity-r31/audio/manifest.json'
UI = [PACK + '/' + name for name in ('index.html', 'query.js', 'page.js', 'style.css')]


def read(path):
    return json.loads((ROOT / path).read_text())


def fingerprint(path):
    raw = (ROOT / path).read_bytes()
    return {'path': path, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def normalized(text):
    return re.sub(r'\s+', ' ', text).strip()


class VisibleMain(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.active = False
        self.skip = 0
        self.data = []

    def handle_starttag(self, tag, attrs):
        if tag == 'main':
            self.active = True
        if tag in ('script', 'style', 'nav', 'footer'):
            self.skip += 1

    def handle_endtag(self, tag):
        if tag == 'main':
            self.active = False
        if tag in ('script', 'style', 'nav', 'footer'):
            self.skip = max(0, self.skip - 1)

    def handle_data(self, data):
        if self.active and not self.skip:
            self.data.append(data)


def source_text(raw):
    parser = VisibleMain()
    parser.feed(raw.decode('utf-8'))
    return normalized(' '.join(parser.data))


def outputs():
    curation = read(PACK + '/curation.json')
    captures = read(PACK + '/captures.json')
    if curation.get('schema') != 're.bow.evidence-curation-r33/1' or captures.get('schema') != 're.bow.evidence-captures-r33/1':
        raise ValueError('Unsupported R33 evidence input schema')
    search_capture = captures['jackScissorSearch']['blogCapture']
    if search_capture['path'] != PACK + '/snapshots/jack-scissor-research-blog.html.gz' or search_capture['admittedAsExactPhaseReference']:
        raise ValueError('Unreviewed exact-phase image promotion')
    stored_search = fingerprint(search_capture['path'])
    search_raw = gzip.decompress((ROOT / search_capture['path']).read_bytes())
    if (stored_search['bytes'], stored_search['sha256'], len(search_raw), hashlib.sha256(search_raw).hexdigest()) != (
            search_capture['bytes'], search_capture['sha256'], search_capture['rawBytes'], search_capture['rawSha256']):
        raise ValueError('Research capture bytes changed')
    catalogue = {x['id']: x for x in read('data/roster.json')['catalog']}
    old_claims = []
    for path in HISTORICAL:
        for claim in read(path).get('claims', []):
            for proof in claim.get('evidence', []):
                if proof.get('excerpt'):
                    old_claims.append((claim['id'], claim['uid'], normalized(proof['excerpt']).casefold()))
    sources = copy.deepcopy(captures['sources'])
    if len({x['id'] for x in sources}) != len(sources):
        raise ValueError('Duplicate source ID')
    source_map = {s['id']: s for s in sources}
    texts = {}
    for source in sources:
        expected_path = PACK + '/snapshots/' + source['id'] + '.html.gz'
        if source['snapshot'] != expected_path or source['httpStatus'] != 200:
            raise ValueError('Snapshot path/status mismatch')
        raw = gzip.decompress((ROOT / expected_path).read_bytes())
        snap = fingerprint(expected_path)
        if (snap['bytes'], snap['sha256'], len(raw), hashlib.sha256(raw).hexdigest()) != (
                source['snapshotBytes'], source['snapshotSha256'], source['rawBytes'], source['rawSha256']):
            raise ValueError('Source bytes changed: ' + source['id'])
        if not source['url'].startswith('https://www.evilresource.com/') or source['effectiveUrl'] != source['url']:
            raise ValueError('Unreviewed source origin/redirect')
        if source['directPrimaryCapture'] or source['sourceEditionEquivalenceVerified']:
            raise ValueError('This package contains secondary references, not primary comparison')
        text = source_text(raw)
        if len(text) < 300 or 'Category' not in text:
            raise ValueError('No visible reference content')
        source['gameKey'] = source['url'].split('/')[3]
        source['sourceLayer'] = 'transcribed-in-game-file' if '/files/' in source['url'] else 'secondary-enemy-reference'
        texts[source['id']] = text
    claims = copy.deepcopy(curation['claims'])
    if len({c['id'] for c in claims}) != len(claims):
        raise ValueError('Duplicate claim ID')
    for claim in claims:
        entry = catalogue[claim['uid']]
        source = source_map[claim['sourceId']]
        quote = normalized(claim['excerpt'])
        if not quote or len(quote) > 650 or quote not in texts[source['id']]:
            raise ValueError('Quote is not in visible source: ' + claim['id'])
        if entry['gameKey'] != source['gameKey']:
            raise ValueError('Source/target game mismatch')
        reuses = [cid for cid, uid, old in old_claims if uid == claim['uid'] and
                  (quote.casefold() in old or old in quote.casefold())]
        claim.update({'excerpt': quote, 'game': entry['game'], 'gameKey': entry['gameKey'],
                      'sourceLayer': source['sourceLayer'],
                      'sourceEdition': entry['game'] + ' — référence secondaire ; support et édition technique non comparés',
                      'targetGameKeyMatched': True, 'targetEditionEquivalenceVerified': False,
                      'novelty': 'REUSED_DOCUMENTARY_EXCERPT' if reuses else 'NEW_CURATED_DOCUMENTARY_EXCERPT',
                      'reusesPriorClaimIds': reuses, 'directPrimaryCapture': False,
                      'canonicalFidelityCertified': False, 'gameplayAdmitted': False})
        if len(set(claim['requiredConditions'])) != len(claim['requiredConditions']):
            raise ValueError('Duplicate claim condition')
    claim_map = {c['id']: c for c in claims}
    dimensions = copy.deepcopy(curation['dimensionConstraints'])
    for item in dimensions:
        claim = claim_map[item['claimId']]
        if claim['uid'] != item['uid'] or claim['type'] != 'dimension' or item['targetCollisionAdmitted']:
            raise ValueError('Dimension attribution changed')
        item['gameKey'] = claim['gameKey']
        if item['value'] != 3 or item['unit'] != 'm' or item['bodyRegion'] != 'body-including-pincers':
            raise ValueError('Unreviewed physical dimension')
    restrictions = copy.deepcopy(curation['conclusionRestrictions'])
    for item in restrictions:
        claim = claim_map[item['claimId']]
        if claim['uid'] != item['uid'] or claim['type'] != 'own-body-outcome' or item['gameplayAdmitted']:
            raise ValueError('Conclusion restriction attribution changed')
        item['gameKey'] = claim['gameKey']
        if claim['bodyRegion'] != item['bodyRegion'] or claim['requiredConditions'] != item['requiredConditions']:
            raise ValueError('Conclusion anatomy/conditions differ from claim')
    audio = read(AUDIO)
    audio_entries = []
    for entry in audio['entries']:
        if entry['combatAudioAssigned'] or entry['independentListeningCompleted'] or entry['action'] is not None:
            raise ValueError('R31 publication admission changed; review this importer')
        item = {key: copy.deepcopy(entry[key]) for key in (
            'clipId', 'assetId', 'publishedGroup', 'publishedLabel', 'archiveMember', 'path',
            'bytes', 'sha256', 'sourceEdition', 'sourcePage', 'candidateIdentityIds')}
        if not item['path'].startswith('modules/fidelity-r31/audio/clips/') or '..' in item['path'].split('/'):
            raise ValueError('Audio path outside preserved source library')
        if not 0 < item['bytes'] <= 2 * 1024 * 1024:
            raise ValueError('Audio file exceeds bounded review limit')
        item.update({'reusedFromR31': True, 'newMedia': False, 'action': None, 'phase': None,
                     'speaker': None, 'combatAudioAssigned': False, 'independentlyListened': False,
                     'targetEditionEquivalenceVerified': False,
                     'contextClaimIds': [c['id'] for c in claims if c['uid'] in item['candidateIdentityIds']]})
        audio_entries.append(item)
    uids = sorted({c['uid'] for c in claims} | {uid for c in audio_entries for uid in c['candidateIdentityIds']})
    entries = []
    for uid in uids:
        cat = catalogue[uid]
        entries.append({'id': uid, 'name': cat['name'], 'game': cat['game'], 'gameKey': cat['gameKey'],
                        'claimIds': [c['id'] for c in claims if c['uid'] == uid],
                        'audioClipIds': [c['clipId'] for c in audio_entries if uid in c['candidateIdentityIds']],
                        'sourceIds': sorted({c['sourceId'] for c in claims if c['uid'] == uid}),
                        'canonicalFidelityCertified': False})
    inputs = ['scripts/build-evidence-r33.py', 'data/roster.json', PACK + '/curation.json',
              PACK + '/captures.json', AUDIO, *HISTORICAL, *UI]
    counts = {'documentedIdentities': len({c['uid'] for c in claims}), 'sourceResponses': len(sources),
              'curatedClaims': len(claims), 'newCuratedDocumentaryExcerpts': sum(not c['reusesPriorClaimIds'] for c in claims),
              'reusedDocumentaryExcerpts': sum(bool(c['reusesPriorClaimIds']) for c in claims),
              'transcribedFileSources': sum(s['sourceLayer'] == 'transcribed-in-game-file' for s in sources),
              'dimensionConstraints': len(dimensions), 'ownBodyConclusionRestrictions': len(restrictions),
              'candidateAudioIdentities': len(audio['identities']), 'reusedR31AudioFiles': len(audio_entries),
              'newAudioFiles': 0, 'independentlyListenedAudioFiles': 0, 'combatAudioAssignments': 0,
              'directPrimaryCaptures': 0, 'physicalCollisionScalesCertified': 0, 'entries': len(entries),
              'failedPrimaryAttempts': len(captures['failedPrimaryAttempts']), 'retainedSearchResponses': 1, 'newSelectionAvatars': 0}
    manifest = {'schema': 're.bow.evidence-r33/1', 'release': 'R33', 'inputs': [fingerprint(p) for p in inputs],
                'counts': counts, 'sources': sources, 'claims': claims, 'dimensionConstraints': dimensions,
                'conclusionRestrictions': restrictions, 'entries': entries, 'audioReviewQueue': audio_entries,
                'missingExactReferences': [captures['jackScissorSearch']], 'failedPrimaryAttempts': captures['failedPrimaryAttempts'],
                'canonicalFidelityCertified': False, 'gameplayDataChanged': False,
                'scope': curation['scope'],
                'noveltyScope': 'Literal curated excerpts compared with all six earlier canonical manifests. This does not establish that a fact was unknown elsewhere, and no reused audio file is counted as new media.'}
    manifest_bytes = encode(manifest)
    deliver = {'schema': 're.bow.fidelity-lot-r33/1', 'release': 'R33', 'lotId': 'evidence',
               'workstreams': ['G-AUDIO', 'G-PERIMETRE', 'G-PREUVES', 'G-ECHELLE', 'G-VICTIMES'],
               'summary': f"{len(sources)} sources conservées, {counts['newCuratedDocumentaryExcerpts']} extraits nouvellement structurés pour {counts['documentedIdentities']} identités ; file d’écoute liée aux sources audio R31 sans nouvelle attribution.",
               'advances': [
                   'Corps, côtés anatomiques, phases, déclencheurs et restrictions sont reliés à des citations visibles et aux empreintes des captures.',
                   'La borne de longueur du Stinger comprend les pinces ; les deux conclusions documentaires restent limitées au propre corps décrit.',
                   'Une comparaison de contexte et une file d’écoute volontaire présentent ensemble les références, les éditions publiées et les 218 fichiers R31 conservés.',
                   'Le journal Code: Veronica décrit un grondement sous terre sans identifier avec certitude son émetteur ; aucun fichier Alexander n’est promu depuis ce récit.',
                   'La référence exacte du Jack à scie à ciseaux reste manquante après recherche : aucun avatar d’une autre phase n’est substitué.'
               ],
               'remaining': [
                   'Captures primaires directes, éditions natives comparées, vues complètes et gestes horodatés restent nécessaires.',
                   'Les faits ne certifient ni idle, animation, timing, commandes originales, échelle de collision ou fidélité globale 1:1.',
                   'Les 218 fichiers sont réutilisés de R31 ; écoute indépendante, locuteur, phase, action et mixage de chaque son restent non attribués.',
                   'Aucune conclusion contre une victime arbitraire du catalogue n’est déduite d’une faiblesse de l’organisme décrit.',
                   'Les trois accès primaires essayés ont été refusés ; les transcriptions tierces restent qualifiées comme secondaires.'
               ],
               'counts': counts, 'canonicalFidelityCertified': False,
               'sourceFiles': [{'path': PACK + '/manifest.json', 'bytes': len(manifest_bytes),
                                'sha256': hashlib.sha256(manifest_bytes).hexdigest()}],
               'resources': [{'path': PACK + '/index.html', 'label': 'Comparer les preuves et préparer une écoute'},
                             {'path': 'docs/R33_EVIDENCE.md', 'label': 'Qualification et limites du lot sources'}],
               'identities': [{'id': e['id'], 'summary': f"{len(e['claimIds'])} extrait(s) R33 ; {len(e['audioClipIds'])} fichier(s) R31 candidat(s), sans nouvelle attribution.",
                               'artifacts': [{'path': PACK + '/index.html', 'href': PACK + '/index.html?id=' + e['id'],
                                              'label': 'Dossier des preuves et contextes R33', 'kind': 'documentary-evidence-and-audio-context',
                                              'sourceEdition': e['game'] + ' — support et équivalence technique non certifiés'}]} for e in entries],
               'reports': [{'path': 'docs/R33_EVIDENCE_TESTS.json', 'kind': 'python_tests'},
                           {'path': 'docs/R33_EVIDENCE_QUERY_TESTS.json', 'kind': 'node_groups'},
                           {'path': 'docs/R33_EVIDENCE_BROWSER.json', 'kind': 'browser_groups'}]}
    return {PACK + '/manifest.json': manifest_bytes, PACK + '/delivery.json': encode(deliver)}


def encode(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--build', action='store_true')
    args = parser.parse_args()
    built = outputs()
    if args.check:
        mismatches = [path for path, raw in built.items() if not (ROOT / path).exists() or (ROOT / path).read_bytes() != raw]
        if mismatches:
            raise SystemExit('R33 evidence differs: ' + ', '.join(mismatches))
        print('R33 documentary source package is reproducible and current.')
    else:
        for path, raw in built.items():
            (ROOT / path).write_bytes(raw)
        print('R33 documentary source package built from preserved inputs.')


if __name__ == '__main__':
    main()
