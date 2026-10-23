#!/usr/bin/env python3
"""Build a source-bound canonical research index; never edit gameplay data.

Remote HTML is data only. Snapshots are gzip files, not executable HTML pages.
The source pack is verified against its recorded bytes before any quote is used.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / 'modules/fidelity-r23/canonical'
SCHEMA = 're.bow.canonical-evidence-index/1'


def read(path):
    return json.loads(Path(path).read_text())


def digest(body):
    return hashlib.sha256(body).hexdigest()


def cache_body(root, record):
    root = Path(root).resolve()
    path = (root / record['body_path']).resolve(strict=True)
    if not path.is_relative_to(root):
        raise ValueError('Source cache path escapes root')
    raw = path.read_bytes()
    if digest(raw) != record['body_sha256']:
        raise ValueError('Source cache bytes changed: ' + record['requested_url'])
    if record.get('http_status') != 200 or record.get('body_truncated'):
        raise ValueError('Source is not a complete HTTP 200 response')
    return raw


def check_claim(claim, identity, source):
    if claim['game'] != identity['game']:
        raise ValueError('Claim assigned to a different game')
    if claim['page_url'] != identity['sourcePage']:
        raise ValueError('Claim assigned to a different catalogue source')
    if claim['type'] not in ('alias', 'move', 'weakpoint', 'dimension'):
        raise ValueError('Unknown claim type')
    # Only semantic article text or the exact title can support reviewed claims.
    if claim['excerpt'] not in source['article_text'] and claim['excerpt'] not in source['title']:
        raise ValueError('Reviewed quotation is absent from its source')
    if claim['type'] == 'dimension' and claim.get('quantity_kind') != 'body_length':
        raise ValueError('Gameplay range and jumping height are not body dimensions')
    if claim.get('canonical_fidelity_certified') is not False:
        raise ValueError('Documentary claims cannot certify final fidelity')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-cache', type=Path, default=Path('/workspace/scratch/bow-source-research'))
    parser.add_argument('--additional-cache', type=Path, default=Path('/workspace/scratch/bow-additional-research'))
    parser.add_argument('--output', type=Path, default=MODULE)
    parser.add_argument('--reviewed', type=Path, default=MODULE / 'reviewed-claims.json')
    parser.add_argument('--refresh-cache', type=Path, help='Optional fresh-pages.json and source bytes collected without changing R21')
    parser.add_argument('--official-checks', type=Path, help='Optional factual HTTP observations, never accepted as successful source evidence')
    args = parser.parse_args()
    source_pack = read(args.source_cache / 'catalog-source-evidence.json')
    refreshed = {item['requested_url']: item for item in read(args.refresh_cache / 'fresh-pages.json')} if args.refresh_cache else {}
    additional = read(args.additional_cache / 'additional-source-evidence.json')
    roster = read(ROOT / 'data/roster.json')['catalog']
    claims = read(args.reviewed)['claims']
    by_uid = {item['id']: item for item in roster}
    if len(by_uid) != len(roster):
        raise ValueError('Duplicate catalogue UID')
    # Use the existing HTML parser, not the untrusted HTML itself, as code.
    spec = importlib.util.spec_from_file_location('page_parser', ROOT / 'scripts/collect-catalog-sources-r21.py')
    parser_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(parser_module)
    destination = args.output
    (destination / 'snapshots').mkdir(parents=True, exist_ok=True)
    sources = {}
    parsed = {}
    for record in source_pack['documents']:
        fresh = refreshed.get(record['requested_url'])
        if fresh and fresh.get('http_status') == 200 and not fresh.get('body_truncated'):
            record = fresh
            raw = cache_body(args.refresh_cache, record)
        else:
            raw = cache_body(args.source_cache, record)
        url = record['requested_url']
        page = parser_module.parse_page(raw, record['effective_url'])
        parsed[url] = page
        key = digest(url.encode())[:24]
        compressed = gzip.compress(raw, mtime=0)
        relative = 'snapshots/' + key + '.html.gz'
        (destination / relative).write_bytes(compressed)
        sources[url] = {
            'id': key, 'url': url, 'effective_url': record['effective_url'],
            'title': page['title'], 'observed_at_utc': record['observed_at_utc'],
            'http_status': 200, 'raw_sha256': digest(raw), 'raw_bytes': len(raw),
            'snapshot': relative, 'snapshot_sha256': digest(compressed),
            'source_classification': 'secondary-community-reference',
            'canonical_fidelity_certified': False,
        }
    additional_sources = []
    additional_by_key = {}
    for record in additional['documents']:
        raw = cache_body(args.additional_cache, record)
        key = digest((record['requested_url'] + '\0' + digest(raw)).encode())[:24]
        compressed = gzip.compress(raw, mtime=0)
        relative = 'snapshots/' + key + '.html.gz'
        (destination / relative).write_bytes(compressed)
        item = {
            'id': key, 'url': record['requested_url'], 'effective_url': record['effective_url'],
            'title': record['title'], 'observed_at_utc': record['observed_at_utc'],
            'http_status': 200, 'raw_sha256': digest(raw), 'raw_bytes': len(raw),
            'snapshot': relative, 'snapshot_sha256': digest(compressed),
            'source_classification': 'secondary-commentary',
            'canonical_fidelity_certified': False,
        }
        additional_sources.append(item)
        additional_by_key[(record['requested_url'], digest(raw))] = item
    reviewed = {}
    for claim in claims:
        identity = by_uid[claim['uid']]
        page = parsed[claim['page_url']]
        check_claim(claim, identity, page)
        result = dict(claim)
        result['page_sha256'] = sources[claim['page_url']]['raw_sha256']
        result['source_id'] = sources[claim['page_url']]['id']
        result['review_status'] = 'DOCUMENTARY_QUOTE_REVIEWED'
        reviewed.setdefault(claim['uid'], []).append(result)
    joins = {item['id']: item for item in additional['identities']}
    identities = {item['id']: item for item in source_pack['identities']}
    entries = []
    for identity in roster:
        uid, url = identity['id'], identity['sourcePage']
        page = parsed[url]
        source = sources[url]
        original = identities[uid]
        extras = []
        for item in joins.get(uid, {}).get('additional_candidates', []):
            # A name mention in a mixed original/remake article is not a form proof.
            extras.append({
                'url': item['url'], 'title': item['title'],
                'page_sha256': item['body_sha256'],
                'source_id': additional_by_key[(item['url'], item['body_sha256'])]['id'],
                'matched_aliases': item['matched_aliases'],
                'scope': 'ARTICLE_NAME_MENTION_ONLY',
                'exact_game_and_form_verified': False,
                'limitation': 'Article may mix originals, remakes, variants and comparison images. This join is not independent confirmation of a claim.',
            })
        entries.append({
            'id': uid, 'name': identity['name'], 'game': identity['game'],
            'source_id': source['id'], 'page_url': url, 'page_sha256': source['raw_sha256'],
            'source_title': page['title'],
            'source_binding': {
                'catalogue_source_url_recorded': True,
                'name_cue_found_by_r21': original['identity_name_cue_found'],
                'game_path_cue_found_by_r21': original['game_path_cue_found'],
                'exact_form_certified': False,
                'status': 'SOURCE_TITLE_RECORDED_NOT_ALIAS_CERTIFICATION',
            },
            'claims': reviewed.get(uid, []), 'additional_documentary_mentions': extras,
            'open_requirements': ['Primary or in-game evidence', 'Exact phase and animation timing', 'Complete command inventory', 'Independent dimension measurements'],
            'canonical_fidelity_certified': False,
        })
    # This conflicting account was read in the full, game-scoped Licker Beta
    # section. Preserve both quotations; never choose a virus from a keyword hit.
    beta = by_uid['re5-licker-beta']
    other_url = 'https://blackjackrants.blogspot.com/2020/10/reviewing-monsters-resident-evil-5.html'
    other = next(item for item in additional['documents'] if item['requested_url'] == other_url)
    first_quote = 'This refined version of the original Licker was created by Tricell researchers hoping to use the Progenitor Virus to improve upon the original design.'
    second_quote = "Licker Beta here is created by injecting the Uroboros virus to a regular Licker and... instead of looking like it's a flayed man, now it looks like a meat-man?"
    if first_quote not in parsed[beta['sourcePage']]['article_text'] or second_quote not in other['article_text']:
        raise ValueError('The reviewed conflicting quotations changed')
    conflicts = [{
        'id': 'R23-CANON-CONFLICT-001', 'uid': beta['id'], 'game': beta['game'],
        'topic': 'Virus attributed to the Licker beta lineage', 'status': 'UNRESOLVED_SECONDARY_SOURCE_CONFLICT',
        'sources': [
            {'source_id': sources[beta['sourcePage']]['id'], 'excerpt': first_quote},
            {'source_id': additional_by_key[(other_url, other['body_sha256'])]['id'], 'excerpt': second_quote},
        ],
        'limitation': 'The sources disagree (Progenitor versus Uroboros). An original in-game or official source is required before changing lore or gameplay.',
        'gameplay_changed': False,
    }]
    counts = Counter(c['type'] for c in claims)
    manifest = {
        'schema': SCHEMA, 'generated_at_utc': datetime.now(timezone.utc).isoformat(),
        'scope': 'Quoted secondary documentary research, catalogue source bindings and explicit limits. No gameplay, collision size, animation or alias is silently changed.',
        'summary': {
            'catalogue_identities': len(entries), 'raw_source_snapshots': len(sources) + len(additional_sources),
            'catalogue_source_snapshots': len(sources), 'additional_source_snapshots': len(additional_sources),
            'fresh_pages_checked': len(refreshed), 'fresh_pages_http200': sum(item.get('http_status') == 200 for item in refreshed.values()),
            'reviewed_documentary_claims': len(claims), 'claim_type_counts': dict(counts),
            'identities_with_reviewed_claims': len(reviewed),
            'identities_with_additional_mentions': sum(bool(e['additional_documentary_mentions']) for e in entries),
            'independently_corroborated_claims': 0, 'primary_source_claims': 0,
            'complete_move_sets': 0, 'certified_body_scales': 0, 'canonical_fidelity_certified': 0,
            'unresolved_secondary_source_conflicts': len(conflicts),
        },
        'limits': ['Snapshots preserve complete source response bytes but remain secondary references.',
                   'Textual statements do not supply movement frames, durations or complete commands.',
                   'An alternative source title is not automatically an official alias.',
                   'A quoted leap height is a move property, not body height.',
                   'A weakpoint statement keeps its negation and exact game/phase context.',
                   'Additional name mentions are not per-claim corroboration.'],
        'official_source_checks': [{
            'url': item['requested_url'], 'observed_at_utc': item['observed_at_utc'],
            'http_status': item.get('http_status'), 'error': item.get('error'),
            'title': item.get('title', ''), 'usable_as_evidence': False,
        } for item in read(args.official_checks)] if args.official_checks else [],
        'sources': list(sources.values()) + additional_sources, 'entries': entries,
        'conflicts': conflicts,
    }
    (destination / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(manifest['summary'], ensure_ascii=False))


if __name__ == '__main__':
    main()
