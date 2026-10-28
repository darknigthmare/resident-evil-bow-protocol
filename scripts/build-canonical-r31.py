#!/usr/bin/env python3
"""Bind R31 conditional source facts without promoting phases, editions or aliases."""
import argparse
from collections import Counter
import copy
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
PACK = 'modules/fidelity-r31/canonical'
ALLOWED_HOSTS = {'www.evilresource.com', 'blackjackrants.blogspot.com', 'models.spriters-resource.com'}


def read(name):
    return json.loads((ROOT / name).read_text())


def normalized(text):
    return ' '.join(text.split())


def binding(name):
    raw = (ROOT / name).read_bytes()
    return {'path': name, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    value = importlib.util.module_from_spec(spec); spec.loader.exec_module(value)
    return value


TABLES = module('r31_canonical_tables', 'scripts/collect-catalog-sources-r21.py')
TEXT = module('r31_canonical_text', 'scripts/build-canonical-evidence-r24.py')


def source_text(record):
    name = record['snapshot']
    path = (ROOT / name).resolve()
    if not path.is_relative_to(ROOT / PACK / 'snapshots') or not name.endswith('.html.gz'):
        raise ValueError('Source snapshot leaves its release')
    raw = path.read_bytes()
    if len(raw) != record['snapshotBytes'] or hashlib.sha256(raw).hexdigest() != record['snapshotSha256']:
        raise ValueError('Changed packed source')
    raw = gzip.decompress(raw)
    if len(raw) > 4 * 1024 * 1024 or len(raw) != record['rawBytes'] or hashlib.sha256(raw).hexdigest() != record['rawSha256']:
        raise ValueError('Changed or oversized source response')
    url, final = urlparse(record['url']), urlparse(record['effectiveUrl'])
    if (record['httpStatus'] != 200 or record.get('challengePage') is not False or url.scheme != 'https'
            or url.hostname not in ALLOWED_HOSTS or final.hostname != url.hostname or final.scheme != 'https'
            or url.username or url.password):
        raise ValueError('Unverified source response or publisher')
    if url.hostname == 'www.evilresource.com':
        if '/' + record['gameKey'] + '/' not in url.path:
            raise ValueError('Source game path differs')
        value = TABLES.parse_page(raw, record['effectiveUrl'])
        if value['challenge_page_detected']:
            raise ValueError('A challenge page cannot supply evidence')
        return normalized(value['main_text'])
    parser = TEXT.VisibleText(); parser.feed(raw.decode('utf-8', 'replace'))
    return normalized(' '.join(parser.parts))


def previous_claims():
    previous, files = [], []
    for release in range(23, 29):
        name = f'modules/fidelity-r{release}/canonical/manifest.json'
        value = read(name); files.append(name); previous += value.get('claims', [])
        for entry in value.get('entries', []):
            previous += entry.get('claims', [])
    return {item['id']: item for item in previous}, files


def build():
    roster = {row['id']: row for row in read('data/roster.json')['catalog']}
    previous, historical = previous_claims()
    capture = read(PACK + '/captures.json'); curation = read(PACK + '/curation.json')
    if capture.get('schema') != 're.bow.canonical-captures-r31/1' or curation.get('schema') != 're.bow.canonical-curation-r31/1':
        raise ValueError('Unsupported canonical input schema')
    sources, pages = {}, {}
    for original in capture['sources']:
        record = copy.deepcopy(original)
        if record['id'] in sources:
            raise ValueError('Duplicate source id')
        record['directPrimaryCapture'] = False
        record['canonicalFidelityCertified'] = False
        sources[record['id']] = record; pages[record['id']] = source_text(record)
    claims = copy.deepcopy(curation['claims']); seen = set()
    for claim in claims:
        identity = roster.get(claim['uid'])
        if not identity or claim['id'] in seen or claim.get('canonicalFidelityCertified') is not False or claim.get('directPrimaryCapture') is not False:
            raise ValueError('Claim identity or certification differs')
        seen.add(claim['id']); claim['game'] = identity['game']; claim['gameKey'] = identity['gameKey']
        claim['sourceEdition'] = claim['sourceEdition'] or identity['game']
        if (not claim['phase'] or not claim['sourceEdition'] or type(claim['targetEditionMatched']) is not bool
                or not isinstance(claim['conditions'], list) or len(set(claim['conditions'])) != len(claim['conditions'])):
            raise ValueError('Claim conditions or edition are missing')
        for proof in claim['evidence']:
            source = sources[proof['sourceId']]
            quote = normalized(proof['excerpt'])
            if not quote or len(quote) > 600 or quote not in pages[source['id']] or source['gameKey'] != identity['gameKey']:
                raise ValueError('Claim quote/game differs: ' + claim['id'])
            proof['excerpt'] = quote
            proof['sourceLayer'] = source.get('layer', 'secondary-enemy-reference')
        matches = []
        quote = normalized(claim['evidence'][0]['excerpt']).casefold()
        for pid, old in previous.items():
            if old.get('uid') != claim['uid']:
                continue
            quotes = [old.get('excerpt', '')] + [item.get('excerpt', '') for item in old.get('evidence', [])]
            if any(normalized(text) and (quote in normalized(text).casefold() or normalized(text).casefold() in quote) for text in quotes):
                matches.append(pid)
        if claim['novelty'] == 'NEW_DOCUMENTARY_FACT':
            if matches or claim['reusesPriorClaimIds']:
                raise ValueError('A prior source fact cannot be counted as new: ' + claim['id'])
        elif claim['novelty'] == 'REUSED_SOURCE_FACT':
            if not matches or set(claim['reusesPriorClaimIds']) != set(matches):
                raise ValueError('Reused source facts must bind actual historical claims')
        else:
            raise ValueError('Unknown novelty scope')
    by_id = {claim['id']: claim for claim in claims}
    dimensions = copy.deepcopy(curation['sourceDimensions'])
    for value in dimensions:
        claim = by_id[value['claimId']]
        if claim['uid'] != value['uid'] or claim['type'] != 'dimension' or value.get('targetCollisionAdmitted') is not False or value.get('exactValueCertified') is not False:
            raise ValueError('Dimension subject, phase or collision scope differs')
        if value['operator'] == 'qualitative-order-of-magnitude':
            if value['value'] is not None or value['siValueMeters'] is not None:
                raise ValueError('A qualitative height is not an exact numeric scale')
        elif value['unit'] not in ('cm', 'm') or value['value'] <= 0 or value['siValueMeters'] != value['value'] * (.01 if value['unit'] == 'cm' else 1):
            raise ValueError('Source dimension units differ')
    aliases = copy.deepcopy(curation['aliasDecisions'])
    for decision in aliases:
        if decision['uid'] not in roster or decision.get('promoted') is not False or decision.get('targetEditionMatched') is not False:
            raise ValueError('A held source relation cannot become a certified alias')
        if not decision['sourceIds'] or any(sid not in sources for sid in decision['sourceIds']):
            raise ValueError('Alias decision lacks actual source pages')
    conclusions = copy.deepcopy(curation['conclusionRules'])
    for rule in conclusions:
        claim = by_id[rule['claimId']]
        if claim['uid'] != rule['uid'] or claim['gameKey'] != rule['gameKey'] or rule.get('sourceContextOnly') is not True:
            raise ValueError('Conclusion crosses subjects or original/remake games')
        rule['gameplayAdmitted'] = False; rule['canonicalFidelityCertified'] = False
    entries = []
    for uid in sorted({claim['uid'] for claim in claims} | {row['uid'] for row in aliases}):
        identity = roster[uid]
        entries.append({'id': uid, 'label': identity['name'], 'game': identity['game'], 'gameKey': identity['gameKey'],
            'claimIds': [row['id'] for row in claims if row['uid'] == uid],
            'dimensionIds': [row['id'] for row in dimensions if row['uid'] == uid],
            'aliasDecisionIds': [row['id'] for row in aliases if row['uid'] == uid],
            'conclusionRuleIds': [row['id'] for row in conclusions if row['uid'] == uid], 'canonicalFidelityCertified': False})
    inputs = ['scripts/build-canonical-r31.py', 'data/roster.json', PACK + '/captures.json', PACK + '/curation.json', *historical]
    return {'schema': 're.bow.canonical-conditional-r31/1', 'release': 'R31',
        'counts': {'identities': len(entries), 'sourceResponses': len(sources),
            'newDocumentaryFacts': sum(row['novelty'] == 'NEW_DOCUMENTARY_FACT' for row in claims),
            'reusedSourceFacts': sum(row['novelty'] == 'REUSED_SOURCE_FACT' for row in claims),
            'sourceDimensionConstraints': len(dimensions), 'conclusionRules': len(conclusions),
            'heldAliasOrEditionDecisions': len(aliases), 'certifiedBodyScales': 0,
            'sourceDimensionNewFacts': sum(by_id[row['claimId']]['novelty'] == 'NEW_DOCUMENTARY_FACT' for row in dimensions),
            'directPrimaryCaptures': 0, 'gameplayConclusionAssignments': 0},
        'inputs': [binding(name) for name in inputs], 'sources': list(sources.values()), 'claims': claims,
        'sourceDimensions': dimensions, 'aliasDecisions': aliases, 'conclusionRules': conclusions, 'entries': entries,
        'canonicalFidelityCertified': False, 'gameplayDataChanged': False,
        'scope': 'Conditional documentary facts, source dimensions by body phase, held source relations and explicit conclusion contexts. A secondary game-file transcription is not a direct primary capture; no source fact certifies original animation, timing, physical collision scale or arbitrary victim compatibility.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('--check', action='store_true'); args = parser.parse_args()
    value = build(); payload = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode(); path = ROOT / PACK / 'manifest.json'
    if args.check:
        if path.read_bytes() != payload:
            raise ValueError('Canonical manifest is stale')
    else:
        path.write_bytes(payload)
    print(json.dumps(value['counts']))


if __name__ == '__main__':
    main()
