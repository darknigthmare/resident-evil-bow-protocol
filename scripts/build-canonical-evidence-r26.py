#!/usr/bin/env python3
"""Validate curated R26 assertions against their exact game-specific snapshots."""
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
MODULE = ROOT / 'modules/fidelity-r26/canonical'
R23 = ROOT / 'modules/fidelity-r23/canonical'
R24 = ROOT / 'modules/fidelity-r24/canonical'
R25 = ROOT / 'modules/fidelity-r25/canonical'
PUBLISHERS = {'www.evilresource.com': 'Evil Resource', 'blackjackrants.blogspot.com': 'Blackjack Rants'}
for alias, path in [('TABLES', 'scripts/collect-catalog-sources-r21.py'), ('RULES', 'scripts/build-canonical-evidence-r24.py')]:
    spec = importlib.util.spec_from_file_location(alias.lower() + '_r26', ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    globals()[alias] = module

def read(path):
    return json.loads(Path(path).read_text())

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def normalized(text):
    return ' '.join(text.split())

def verify_claim(claim, sources, pages, roster):
    identity = roster.get(claim['uid'])
    if not identity or (claim['game'], claim['game_key']) != (identity['game'], identity['gameKey']):
        raise ValueError('Unknown subject or different original/remake game')
    if claim.get('actor_uid') != claim['uid'] and claim.get('actor_role') != 'source_named_actor_not_in_catalogue':
        raise ValueError('Subject cannot inherit another actor action')
    if not claim.get('phase') or claim.get('polarity') not in ('AFFIRMED', 'NEGATED'):
        raise ValueError('Phase and explicit polarity are required')
    if claim.get('canonical_fidelity_certified') is not False:
        raise ValueError('A quotation cannot certify complete fidelity')
    if claim['type'] == 'dimension':
        raise ValueError('This batch has no independently established body dimensions')
    if claim['type'] not in ('move', 'form', 'scope', 'weakpoint', 'alias'):
        raise ValueError('Unknown assertion type')
    for evidence in claim['evidence']:
        source = sources[evidence['source_id']]
        if evidence['game_key'] != identity['gameKey'] or evidence['game_key'] not in source['game_keys']:
            raise ValueError('Citation crosses a game or edition boundary')
        if not evidence.get('phase') or not evidence.get('scope'):
            raise ValueError('Citation phase and scope are required')
        if normalized(evidence['excerpt']) not in normalized(pages[source['id']]):
            raise ValueError('Quotation missing from the claimed visible content: ' + claim['id'])
        if evidence['layer'] not in ('secondary-enemy-reference', 'secondary-commentary'):
            raise ValueError('No primary capture or new transcript is delivered by this batch')
    if claim['independently_corroborated']:
        publishers = {sources[e['source_id']]['publisher'] for e in claim['evidence']}
        if len(publishers) < 2 or not claim.get('corroborated_scope'):
            raise ValueError('Cross-check needs distinct publications and an explicit shared assertion')
    if claim['uid'] == 'rerev-wall-blister' and not any(term in claim['phase'].lower() for term in ('hd', 'pc')):
        raise ValueError('Wall Blister evidence must retain its HD/PC edition boundary')
    if claim['uid'] == 're1-forest-speyer-zombie' and not all(term in claim['phase'].lower() for term in ('director', 'arranged')):
        raise ValueError('Forest evidence must retain its Director Cut Arranged/Advanced mode')

def build(curation=None):
    curation = curation or read(MODULE / 'curation.json')
    if curation.get('schema') != 're.bow.curated-documentary-claims/1':
        raise ValueError('Unexpected curation schema')
    prior23, prior24, prior25 = read(R23 / 'manifest.json'), read(R24 / 'manifest.json'), read(R25 / 'manifest.json')
    roster = {r['id']: r for r in read(ROOT / 'data/roster.json')['catalog']}
    old_entries = {r['id']: r for r in prior23['entries']}
    old_sources = {r['id']: r for r in prior23['sources']}
    sources, source_keys, pages = {}, {}, {}

    def source_for(old_id, game_key):
        source_key = (old_id, game_key)
        if source_key in source_keys:
            return source_keys[source_key]
        previous = old_sources[old_id]
        publisher = PUBLISHERS[urlparse(previous['url']).hostname]
        path = (R23 / previous['snapshot']).resolve()
        if not path.is_relative_to(R23.resolve()):
            raise ValueError('Snapshot leaves the preserved source tree')
        packed = path.read_bytes(); raw = gzip.decompress(packed)
        if sha(packed) != previous['snapshot_sha256'] or sha(raw) != previous['raw_sha256']:
            raise ValueError('Preserved snapshot hash differs')
        if publisher == 'Evil Resource':
            if '/' + game_key + '/' not in previous['url']:
                raise ValueError('Enemy page belongs to another original/remake')
            text = TABLES.parse_page(raw, previous['effective_url'])['article_text']
        else:
            visible = RULES.VisibleText(); visible.feed(raw.decode('utf-8', 'replace'))
            text = normalized(' '.join(visible.parts))
        source_id = 'R26-S' + str(len(sources) + 1).zfill(3)
        source = {**previous, 'id': source_id, 'snapshot': '../../fidelity-r23/canonical/' + previous['snapshot'],
                  'snapshot_release': 'R23', 'publisher': publisher, 'hosting': 'secondary-website',
                  'game_keys': [game_key], 'direct_primary_capture': False, 'canonical_fidelity_certified': False}
        sources[source_id] = source; pages[source_id] = text; source_keys[source_key] = source_id
        return source_id

    claims = []
    for row in curation['claims']:
        identity = roster[row['uid']]
        old_source_id = row.get('source_r23_id', old_entries[row['uid']]['source_id'])
        source_id = source_for(old_source_id, identity['gameKey'])
        layer = 'secondary-enemy-reference' if sources[source_id]['publisher'] == 'Evil Resource' else 'secondary-commentary'
        claim = {'id': 'R26-CANON-' + str(len(claims) + 1).zfill(3), 'uid': row['uid'], 'subject_uid': row['uid'],
                 'game': identity['game'], 'game_key': identity['gameKey'], 'actor_uid': row.get('actor_uid', row['uid']),
                 'actor_role': row.get('actor_role', 'enemy_behaviour_or_property'), 'phase': row['phase'], 'type': row['type'],
                 'label': row['label'], 'polarity': row['polarity'], 'canonical_fidelity_certified': False,
                 'evidence': [{'source_id': source_id, 'game_key': identity['gameKey'], 'excerpt': row['excerpt'],
                               'phase': row['phase'], 'layer': layer, 'scope': 'Only this quoted behaviour/property; no full repertoire, body scale, game timing or source-bank trigger is established.'}],
                 'limitation': row.get('limitation', 'Assertion documentaire de cette incarnation seulement. Aucun timing, paramètre de combat, métrique corporelle ou répertoire complet n’est certifié.'),
                 'independently_corroborated': False}
        for other in row.get('cross_checks', []):
            extra_id = source_for(other['source_r23_id'], identity['gameKey'])
            claim['evidence'].append({'source_id': extra_id, 'game_key': identity['gameKey'], 'excerpt': other['excerpt'],
                                      'phase': other.get('phase', row['phase']), 'layer': 'secondary-commentary', 'scope': other['shared_scope']})
            claim['independently_corroborated'] = True
            claim['corroborated_scope'] = other['shared_scope'] + ' L’indépendance des observations primaires des deux publications n’est pas établie.'
        verify_claim(claim, sources, pages, roster)
        claims.append(claim)
    if len({(c['uid'], c['label'], c['evidence'][0]['excerpt']) for c in claims}) != len(claims):
        raise ValueError('Duplicate curated assertion')
    previous_claims = Counter({row['id']: len(row['claims']) for row in prior23['entries']})
    previous_claims.update(c['uid'] for c in prior24['claims'])
    previous_claims.update(c['uid'] for c in prior25['claims'])
    previous_ids = {uid for uid, count in previous_claims.items() if count}
    new_ids = {c['uid'] for c in claims}
    entries = [{'id': uid, 'name': row['name'], 'game': row['game'], 'new_claim_ids': [c['id'] for c in claims if c['uid'] == uid],
                'previous_reviewed_claim_count': previous_claims[uid], 'previous_page': '../../fidelity-r25/canonical/index.html#' + uid,
                'canonical_fidelity_certified': False} for uid, row in roster.items()]
    types = Counter(c['type'] for c in claims)
    if new_ids & previous_ids:
        raise ValueError('This batch must extend previously unreviewed subjects only')
    gaps = [{'id': c['id'] + '-SCOPE', 'catalogue_uid': c['uid'], 'name': c['label'],
             'limitation': c['phase'] + ' ; ' + c['limitation'], 'evidence': c['evidence']}
            for c in claims if c['type'] == 'scope']
    return {'schema': 're.bow.canonical-evidence-index/2', 'release': 'R26', 'generated_at_utc': curation['curated_at_utc'],
            'summary': {'catalogue_identities': len(roster), 'new_reviewed_claims': len(claims), 'identities_with_new_claims': len(new_ids),
                        'newly_reviewed_identities': len(new_ids - previous_ids), 'cumulative_reviewed_identities': len(new_ids | previous_ids),
                        'cumulative_reviewed_identities_r23_r24_r25': len(previous_ids), 'previous_r23_claims_preserved': sum(len(e['claims']) for e in prior23['entries']),
                        'previous_r24_claims_preserved': len(prior24['claims']), 'previous_r25_claims_preserved': len(prior25['claims']), 'claim_type_counts': dict(types),
                        'independently_corroborated_claims': sum(c['independently_corroborated'] for c in claims),
                        'distinct_publisher_cross_checks': sum(c['independently_corroborated'] for c in claims),
                        'independent_primary_corroborations': 0, 'claims_with_transcribed_in_game_evidence': 0, 'direct_primary_captures': 0,
                        'sources_used': len(sources), 'new_source_snapshots': 0, 'scope_gaps_documented': len(gaps),
                        'complete_move_sets': 0, 'certified_body_scales': 0, 'canonical_fidelity_certified': 0},
            'previous_manifests': [{'path': '../../fidelity-r23/canonical/manifest.json', 'sha256': sha((R23 / 'manifest.json').read_bytes())},
                                   {'path': '../../fidelity-r24/canonical/manifest.json', 'sha256': sha((R24 / 'manifest.json').read_bytes())},
                                   {'path': '../../fidelity-r25/canonical/manifest.json', 'sha256': sha((R25 / 'manifest.json').read_bytes())}],
            'sources': list(sources.values()), 'claims': claims, 'entries': entries, 'scope_gaps': gaps,
            'limits': ['Reviewed quotations and distinct publishers do not certify independence of their primary observations.',
                       'Game editions, forms, actors and negative predicates remain explicit; no game parameters are changed.',
                       'This batch adds no primary capture, complete move set or certified body measurement.']}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--output', type=Path, default=MODULE / 'manifest.json')
    args = parser.parse_args(); result = build(); encoded = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    if args.check:
        if args.output.read_text() != encoded:
            raise SystemExit('The committed canonical manifest differs from its validated curation')
    else:
        args.output.parent.mkdir(parents=True, exist_ok=True); args.output.write_text(encoded)
    print(json.dumps(result['summary']))

if __name__ == '__main__':
    main()
