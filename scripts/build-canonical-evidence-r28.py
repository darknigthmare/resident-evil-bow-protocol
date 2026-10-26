#!/usr/bin/env python3
"""Reproduce R28 encounter-scoped quotations from exact stored website bytes."""
from __future__ import annotations
import argparse
from collections import Counter
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / 'modules/fidelity-r28/canonical'
for alias, relative in [('TABLES', 'scripts/collect-catalog-sources-r21.py'), ('TEXT', 'scripts/build-canonical-evidence-r24.py')]:
    spec = importlib.util.spec_from_file_location(alias.lower() + '_r28', ROOT / relative)
    loaded = importlib.util.module_from_spec(spec); spec.loader.exec_module(loaded)
    globals()[alias] = loaded


def read(path):
    return json.loads(Path(path).read_text())


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def normalized(value):
    return ' '.join(value.split())


def load_sources(captures=None):
    captures = captures or read(MODULE / 'captures.json')
    if captures.get('schema') != 're.bow.canonical-source-captures/1' or captures.get('failures'):
        raise ValueError('Source capture batch is incomplete')
    sources, pages = {}, {}
    for source in captures['sources']:
        sid = source['id']; url = urlparse(source['url']); effective = urlparse(source['effective_url'])
        if (sid in sources or url.scheme != 'https' or effective.scheme != 'https'
                or url.hostname != effective.hostname or url.hostname not in ['www.evilresource.com', 'blackjackrants.blogspot.com']
                or url.username or url.password or source.get('http_status') != 200
                or source.get('canonical_fidelity_certified') is not False or source.get('direct_primary_capture') is not False):
            raise ValueError('Unknown, duplicate or over-certified source')
        path = (MODULE / source['snapshot']).resolve()
        allowed = (MODULE / 'snapshots').resolve() if source['snapshot_release'] == 'R28' else (ROOT / 'modules/fidelity-r23/canonical/snapshots').resolve()
        if not path.is_relative_to(allowed):
            raise ValueError('Snapshot leaves its preserved release')
        packed = path.read_bytes()
        if len(packed) > 4 * 1024 * 1024 or sha(packed) != source['snapshot_sha256']:
            raise ValueError('Snapshot hash or size differs')
        raw = gzip.decompress(packed)
        if len(raw) > 4 * 1024 * 1024 or sha(raw) != source['raw_sha256'] or len(raw) != source['raw_bytes']:
            raise ValueError('Raw source hash or size differs')
        if url.hostname == 'www.evilresource.com':
            if source['publisher'] != 'Evil Resource' or len(source['game_keys']) != 1 or '/' + source['game_keys'][0] + '/' not in url.path:
                raise ValueError('Enemy page belongs to another game edition')
            parsed = TABLES.parse_page(raw, source['effective_url'])
            if parsed['challenge_page_detected']:
                raise ValueError('Challenge page is not evidence')
            page = parsed['main_text']
        else:
            if source['publisher'] != 'Blackjack Rants':
                raise ValueError('Commentary publisher differs')
            visible = TEXT.VisibleText(); visible.feed(raw.decode('utf-8', 'replace')); page = ' '.join(visible.parts)
        sources[sid] = source; pages[sid] = normalized(page)
    return sources, pages


def verify_claim(claim, sources, pages, roster):
    identity = roster.get(claim['uid'])
    if not identity or (claim['game'], claim['game_key']) != (identity['game'], identity['gameKey']):
        raise ValueError('Unknown subject or original/remake edition differs')
    if claim.get('subject_uid') != claim['uid'] or claim.get('actor_uid') != claim['uid']:
        raise ValueError('A subject cannot inherit another actor')
    if (claim.get('canonical_fidelity_certified') is not False or not claim.get('phase')
            or claim.get('polarity') not in ['AFFIRMED', 'NEGATED'] or claim.get('type') not in ['move', 'form', 'scope', 'weakpoint', 'alias']):
        raise ValueError('Claim scope, polarity or certification is invalid')
    if not claim.get('evidence') or not claim.get('limitation'):
        raise ValueError('A bounded quotation is required')
    for evidence in claim['evidence']:
        source = sources[evidence['source_id']]
        if evidence['game_key'] != claim['game_key'] or claim['game_key'] not in source['game_keys']:
            raise ValueError('Citation crosses a game edition boundary')
        if source['publisher'] == 'Evil Resource' and source['url'] != identity['sourcePage']:
            raise ValueError('Enemy or Strong Threat variant differs from its source page')
        quote = normalized(evidence['excerpt'])
        if not quote or quote not in pages[source['id']]:
            raise ValueError('Quotation is missing from its visible source')
        if evidence['phase'] != claim['phase'] or not evidence['scope']:
            raise ValueError('Citation phase or scope differs')
        if evidence['layer'] == 'secondary-location-reference':
            if source['publisher'] != 'Evil Resource' or not evidence.get('location') or not evidence.get('game_mode'):
                raise ValueError('Location and game mode are mandatory for encounter tables')
            prefix = normalized(evidence['location'] + ' ' + evidence['game_mode']) + ' '
            if not quote.startswith(prefix) or evidence['location'] not in claim['phase'] or evidence['game_mode'] not in claim['phase']:
                raise ValueError('Encounter room/mode was detached from the quotation')
        elif evidence['layer'] == 'secondary-commentary':
            if source['publisher'] != 'Blackjack Rants':
                raise ValueError('Commentary cannot be attributed to a location table')
        else:
            raise ValueError('Unsupported documentary layer')
    if claim.get('independently_corroborated') is not False:
        raise ValueError('This batch establishes no independent primary corroboration')


def build(curation=None):
    curation = curation or read(MODULE / 'curation.json')
    if curation.get('schema') != 're.bow.curated-documentary-claims/1' or curation.get('release') != 'R28':
        raise ValueError('Unexpected curation schema')
    roster = {row['id']: row for row in read(ROOT / 'data/roster.json')['catalog']}
    sources, pages = load_sources()
    previous, prior_manifests = Counter(), []
    for release in ['r23', 'r24', 'r25', 'r26', 'r27']:
        path = ROOT / f'modules/fidelity-{release}/canonical/manifest.json'; value = read(path)
        if release == 'r23':
            previous.update({entry['id']: len(entry['claims']) for entry in value['entries']})
        else:
            previous.update(claim['uid'] for claim in value['claims'])
        prior_manifests.append({'path': f'../../fidelity-{release}/canonical/manifest.json', 'sha256': sha(path.read_bytes())})
    previous_ids = {uid for uid, count in previous.items() if count}
    claims = []
    for row in curation['claims']:
        identity = roster[row['uid']]
        evidence = {'source_id': row['source_id'], 'game_key': identity['gameKey'], 'excerpt': row['excerpt'],
                    'phase': row['phase'], 'layer': row['layer'], 'scope': row['limitation']}
        if row['layer'] == 'secondary-location-reference':
            evidence.update(location=row['location'], game_mode=row['game_mode'])
        claim = {'id': 'R28-CANON-' + str(len(claims) + 1).zfill(3), 'uid': row['uid'], 'subject_uid': row['uid'],
                 'game': identity['game'], 'game_key': identity['gameKey'], 'actor_uid': row['uid'],
                 'actor_role': 'enemy_behaviour_or_property', 'phase': row['phase'], 'type': row['type'], 'label': row['label'],
                 'polarity': row['polarity'], 'canonical_fidelity_certified': False, 'evidence': [evidence],
                 'limitation': row['limitation'], 'independently_corroborated': False}
        verify_claim(claim, sources, pages, roster); claims.append(claim)
    new_ids = {claim['uid'] for claim in claims}
    if new_ids & previous_ids or len({(c['uid'], c['label'], c['evidence'][0]['excerpt']) for c in claims}) != len(claims):
        raise ValueError('Repeated identity review or duplicate assertion')
    expected = {row['id'] for row in read(ROOT / 'modules/fidelity-r27/canonical/curation.json')['unreviewed_after_batch']}
    if new_ids != expected or set(roster) != previous_ids | new_ids or curation.get('unreviewed_after_batch') != []:
        raise ValueError('The final thirty-three documentary reviews are incomplete')
    entries = [{'id': uid, 'name': row['name'], 'game': row['game'], 'game_key': row['gameKey'], 'source_page': row['sourcePage'], 'new_claim_ids': [c['id'] for c in claims if c['uid'] == uid],
                'previous_reviewed_claim_count': previous[uid], 'previous_page': '../../fidelity-r27/canonical/index.html#' + uid,
                'canonical_fidelity_certified': False} for uid, row in roster.items()]
    gaps = [{'id': claim['id'] + '-SCOPE', 'catalogue_uid': claim['uid'], 'name': claim['label'],
             'limitation': claim['phase'] + ' ; ' + claim['limitation'], 'evidence': claim['evidence']}
            for claim in claims if claim['type'] == 'scope']
    return {'schema': 're.bow.canonical-evidence-index/2', 'release': 'R28', 'generated_at_utc': curation['curated_at_utc'],
            'summary': {'catalogue_identities': len(roster), 'new_reviewed_claims': len(claims), 'identities_with_new_claims': len(new_ids),
                        'newly_reviewed_identities': len(new_ids), 'cumulative_reviewed_identities': len(previous_ids | new_ids),
                        'cumulative_reviewed_identities_r23_r24_r25_r26_r27': len(previous_ids),
                        'remaining_without_reviewed_documentary_claims': len(set(roster) - previous_ids - new_ids),
                        'claim_type_counts': dict(Counter(claim['type'] for claim in claims)),
                        'encounter_scoped_location_claims': sum(c['evidence'][0]['layer'] == 'secondary-location-reference' for c in claims),
                        'commentary_form_claims': sum(c['evidence'][0]['layer'] == 'secondary-commentary' for c in claims),
                        'negated_claims': sum(c['polarity'] == 'NEGATED' for c in claims),
                        'sources_used': len({e['source_id'] for c in claims for e in c['evidence']}),
                        'new_source_snapshots': sum(source['snapshot_release'] == 'R28' for source in sources.values()),
                        'reused_source_snapshots': sum(source['snapshot_release'] != 'R28' for source in sources.values()),
                        'scope_gaps_documented': len(gaps), 'independently_corroborated_claims': 0, 'distinct_publisher_cross_checks': 0,
                        'independent_primary_corroborations': 0, 'claims_with_transcribed_in_game_evidence': 0, 'direct_primary_captures': 0,
                        'complete_move_sets': 0, 'certified_body_scales': 0, 'canonical_fidelity_certified': 0},
            'previous_manifests': prior_manifests, 'sources': list(sources.values()), 'claims': claims, 'entries': entries, 'scope_gaps': gaps,
            'limits': ['389 documentary reviews do not certify 389 complete move sets or animations.',
                       'Location quotations retain the exact room, scenario and game mode; their predicates are not universal abilities.',
                       'Strong Threat, original/remake and human/mutated variants remain separate identities.',
                       'Sources are secondary websites; this batch adds no primary capture or game parameter change.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('--check', action='store_true'); args = parser.parse_args()
    value = build(); raw = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode(); path = MODULE / 'manifest.json'
    if args.check:
        if path.read_bytes() != raw:
            raise ValueError('R28 canonical manifest differs from verified curation')
    else:
        path.write_bytes(raw)
    print(json.dumps(value['summary']))


if __name__ == '__main__':
    main()
