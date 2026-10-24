#!/usr/bin/env python3
"""Verify and package reviewed R24 quotations, preserving actor, game and phase."""
from __future__ import annotations
import argparse
from collections import Counter
from datetime import datetime, timezone
import gzip
import hashlib
from html.parser import HTMLParser
import importlib.util
import json
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / 'modules/fidelity-r24/canonical'
R23 = ROOT / 'modules/fidelity-r23/canonical'
PUBLISHERS = {'www.evilresource.com': 'Evil Resource', 'blackjackrants.blogspot.com': 'Blackjack Rants', 'bogleech.com': 'Bogleech'}


def read(path):
    return json.loads(Path(path).read_text())


def sha(data):
    return hashlib.sha256(data).hexdigest()


def normalized(text):
    return ' '.join(str(text).split())


class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ignored = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'noscript'):
            self.ignored += 1

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'noscript') and self.ignored:
            self.ignored -= 1

    def handle_data(self, value):
        if not self.ignored:
            self.parts.append(value)


def parse_document(parser, raw, source):
    page = parser.parse_page(raw, source['effective_url'])
    if source['publisher'] in ('Blackjack Rants', 'Bogleech'):
        # Those pages lack the semantic <main> container expected by R21.
        # Read visible response text, never JavaScript or JSON-LD as evidence.
        visible = VisibleText()
        visible.feed(raw.decode('utf-8', 'replace'))
        page['article_text'] = normalized(' '.join(visible.parts))
    return page


def verify_quote(evidence, source, page):
    if evidence['game_key'] not in source['game_keys']:
        raise ValueError('Evidence game is outside the source game scope')
    if not evidence['phase'] or not evidence['scope']:
        raise ValueError('Evidence must state phase and narrow scope')
    text = page['article_text']
    if evidence['layer'] == 'transcribed-in-game-file':
        main = page['main_text']
        if '\nTranscript\n' not in main:
            raise ValueError('No in-game transcript section exists')
        text = main.split('\nTranscript\n', 1)[1].split('\nLocation\n', 1)[0]
    elif evidence['layer'] not in ('secondary-enemy-reference', 'secondary-commentary'):
        raise ValueError('Unknown evidence content layer')
    if normalized(evidence['excerpt']) not in normalized(text):
        raise ValueError('Quotation not found in the claimed source content layer: ' + evidence['source_id'])


def validate_claim(claim, sources, pages, roster):
    identity = roster[claim['uid']]
    if claim['game'] != identity['game'] or claim['game_key'] != identity['gameKey']:
        raise ValueError('Claim game differs from the exact catalogue game')
    if not claim.get('actor_uid') or not claim.get('phase'):
        raise ValueError('Actor and phase are required')
    if claim.get('canonical_fidelity_certified') is not False:
        raise ValueError('Documentary claims cannot certify complete fidelity')
    for evidence in claim['evidence']:
        if evidence['game_key'] != identity['gameKey']:
            raise ValueError('Evidence is assigned to another original/remake')
        verify_quote(evidence, sources[evidence['source_id']], pages[evidence['source_id']])
    if claim['type'] == 'dimension':
        quantity = claim['quantity']
        if quantity['kind'] not in ('body_height', 'body_length', 'limb_length'):
            raise ValueError('Action distance is not a body dimension')
        if quantity['comparison'] in ('approximately', 'greater_than', 'almost', 'vague_range') and quantity.get('exact'):
            raise ValueError('A vague measurement cannot become an exact dimension')
    publishers = {sources[item['source_id']]['publisher'] for item in claim['evidence']}
    if claim['independently_corroborated'] and (len(publishers) < 2 or not claim.get('corroborated_scope')):
        raise ValueError('Independent corroboration requires distinct publishers and an explicit shared assertion')


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--file-cache', type=Path, default=Path('/workspace/scratch/r24-canonical'))
    ap.add_argument('--reviewed', type=Path, default=MODULE / 'reviewed-claims.json')
    ap.add_argument('--output', type=Path, default=MODULE)
    args = ap.parse_args()
    r23 = read(R23 / 'manifest.json')
    reviewed = read(args.reviewed)
    roster = {row['id']: row for row in read(ROOT / 'data/roster.json')['catalog']}
    spec = importlib.util.spec_from_file_location('parse_sources', ROOT / 'scripts/collect-catalog-sources-r21.py')
    parser = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(parser)
    by_url = {item['url']: item for item in r23['sources'] if item['source_classification'] == 'secondary-community-reference'}
    by_url.update({item['url']: item for item in r23['sources'] if item['source_classification'] == 'secondary-commentary'})
    source_needs = reviewed['source_bindings']
    file_records = {item['requested_url']: item for item in read(args.file_cache / 'game-files.json')}
    sources, pages = {}, {}
    destination = args.output
    (destination / 'sources').mkdir(parents=True, exist_ok=True)
    for binding in source_needs:
        url = binding['url']
        if url in file_records:
            record = file_records[url]
            raw_path = (args.file_cache / record['body_path']).resolve(strict=True)
            if not raw_path.is_relative_to(args.file_cache.resolve()) or record['http_status'] != 200 or record.get('body_truncated'):
                raise ValueError('Invalid new source response')
            raw = raw_path.read_bytes()
            if sha(raw) != record['body_sha256']:
                raise ValueError('New source response was altered')
            packed = gzip.compress(raw, mtime=0)
            snapshot = 'sources/' + sha(url.encode())[:24] + '.html.gz'
            (destination / snapshot).write_bytes(packed)
            source = {'url': url, 'effective_url': record['effective_url'], 'title': record['title'],
                      'observed_at_utc': record['observed_at_utc'], 'raw_sha256': sha(raw),
                      'snapshot_sha256': sha(packed), 'raw_bytes': len(raw), 'snapshot': snapshot,
                      'snapshot_release': 'R24', 'hosting': 'secondary-website'}
        else:
            previous = by_url[url]
            packed = (R23 / previous['snapshot']).read_bytes()
            raw = gzip.decompress(packed)
            if sha(packed) != previous['snapshot_sha256'] or sha(raw) != previous['raw_sha256']:
                raise ValueError('A linked R23 snapshot was altered')
            source = dict(previous)
            source['snapshot'] = '../../fidelity-r23/canonical/' + previous['snapshot']
            source['snapshot_release'] = 'R23'
            source['hosting'] = 'secondary-website'
        source.update(id=binding['id'], game_keys=binding['game_keys'], publisher=PUBLISHERS[urlparse(url).hostname])
        source['direct_primary_capture'] = False
        sources[source['id']] = source
        pages[source['id']] = parse_document(parser, raw, source)
    claims = reviewed['claims']
    if len({c['id'] for c in claims}) != len(claims):
        raise ValueError('Duplicate claim ID')
    for claim in claims:
        validate_claim(claim, sources, pages, roster)
    for gap in reviewed['scope_gaps']:
        for evidence in gap['evidence']:
            verify_quote(evidence, sources[evidence['source_id']], pages[evidence['source_id']])
    previous_ids = {entry['id'] for entry in r23['entries'] if entry['claims']}
    current_ids = {claim['uid'] for claim in claims}
    counts = Counter(claim['type'] for claim in claims)
    entries = [{
        'id': uid, 'name': roster[uid]['name'], 'game': roster[uid]['game'],
        'new_claim_ids': [claim['id'] for claim in claims if claim['uid'] == uid],
        'previous_r23_reviewed_claim_count': len(next(item['claims'] for item in r23['entries'] if item['id'] == uid)),
        'previous_page': '../../fidelity-r23/canonical/index.html#' + uid,
        'canonical_fidelity_certified': False,
    } for uid in roster if uid in current_ids]
    manifest = {
        'schema': 're.bow.canonical-evidence-index/2', 'release': 'R24',
        'generated_at_utc': datetime.now(timezone.utc).isoformat(),
        'summary': {
            'catalogue_identities': len(roster), 'new_reviewed_claims': len(claims),
            'identities_with_new_claims': len(current_ids), 'newly_reviewed_identities': len(current_ids - previous_ids),
            'cumulative_reviewed_identities_r23_r24': len(current_ids | previous_ids),
            'previous_r23_claims_preserved': r23['summary']['reviewed_documentary_claims'],
            'claim_type_counts': dict(counts),
            'independently_corroborated_claims': sum(c['independently_corroborated'] for c in claims),
            'distinct_publisher_cross_checks': sum(c['independently_corroborated'] for c in claims),
            'independent_primary_corroborations': 0,
            'claims_with_transcribed_in_game_evidence': sum(any(e['layer'] == 'transcribed-in-game-file' for e in c['evidence']) for c in claims),
            'direct_primary_captures': 0,
            'sources_used': len(sources), 'new_source_snapshots': sum(s['snapshot_release'] == 'R24' for s in sources.values()),
            'scope_gaps_documented': len(reviewed['scope_gaps']),
            'complete_move_sets': 0, 'certified_body_scales': 0, 'canonical_fidelity_certified': 0,
        },
        'previous_r23_manifest': {'path': '../../fidelity-r23/canonical/manifest.json', 'sha256': sha((R23 / 'manifest.json').read_bytes())},
        'sources': list(sources.values()), 'claims': claims, 'entries': entries,
        'scope_gaps': reviewed['scope_gaps'], 'conflict_followup': reviewed['conflict_followup'],
        'limits': ['In-game files are transcribed on a third-party site; no direct original capture or independent transcription comparison was obtained.',
                   'Distinct publishers corroborate only the explicit shared assertion, not timing, scale, rig or complete moveset.',
                   'Independence here concerns the publications. The independence of their underlying primary observations has not been established.',
                   'Quoted dimensions keep their bound or vagueness and never set collision dimensions.',
                   'All phases, actors and modes remain explicit; no gameplay data is changed.'],
    }
    (destination / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(manifest['summary'], ensure_ascii=False))


if __name__ == '__main__':
    main()
