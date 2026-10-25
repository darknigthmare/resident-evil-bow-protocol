#!/usr/bin/env python3
"""Audit sound discovery and import source-bound, unchanged local audio.

Remote HTML is evidence only. The importer never executes downloaded content,
converts sound, invents a voice or marks a clip canonically certified.
"""
import argparse
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import shutil
import ssl
import subprocess
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
MAX_AUDIO = 32 * 1024 * 1024


def digest(data):
    return hashlib.sha256(data).hexdigest()


class Links(HTMLParser):
    def __init__(self, base):
        super().__init__()
        self.base, self.urls = base, set()

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in ('src', 'href', 'data-src') and value:
                self.urls.add(urljoin(self.base, value))


def contained_file(root, path):
    resolved = (root / path).resolve(strict=True)
    if not resolved.is_relative_to(root.resolve()) or not resolved.is_file():
        raise ValueError('Evidence path leaves its cache root')
    return resolved


def verified_bytes(root, record, limit):
    path = contained_file(root, record['path'])
    if path.stat().st_size > limit:
        raise ValueError('Evidence file exceeds the size limit')
    data = path.read_bytes()
    if digest(data) != record['sha256']:
        raise ValueError('Evidence SHA-256 mismatch')
    return data, path


def inspect_audio(path):
    demuxers = {'.wav': 'wav', '.ogg': 'ogg', '.opus': 'ogg', '.mp3': 'mp3', '.flac': 'flac', '.m4a': 'mov'}
    demuxer = demuxers.get(path.suffix.lower())
    if not demuxer:
        raise ValueError('Unsupported audio file extension')
    result = subprocess.run([
        'ffprobe', '-v', 'error', '-protocol_whitelist', 'file',
        '-f', demuxer,
        '-show_entries', 'stream=codec_name,codec_type,sample_rate,channels:format=duration,format_name',
        '-of', 'json', str(path),
    ], capture_output=True, text=True, timeout=20, check=True)
    report = json.loads(result.stdout)
    streams = report.get('streams', [])
    if not streams or any(x.get('codec_type') != 'audio' for x in streams):
        raise ValueError('The source must contain audio streams only')
    duration = float(report['format']['duration'])
    if not 0 < duration <= 600:
        raise ValueError('Clip duration must be positive and at most ten minutes')
    if any(not 1 <= int(x.get('channels', 0)) <= 8 or not 4000 <= int(x.get('sample_rate', 0)) <= 192000 for x in streams):
        raise ValueError('Unsupported audio channel count or sample rate')
    return {'duration_seconds': duration, 'format': report['format']['format_name'], 'streams': streams}


def collect_discovery(cache):
    """Retain full responses and explicit refusals; never bypass destination policy."""
    urls = ['https://www.spriters-resource.com/', 'https://www.sounds-resource.com/',
            'https://sounds.spriters-resource.com/', 'https://residentevil.fandom.com/wiki/Category:Audio']
    cache.mkdir(parents=True, exist_ok=True)
    observations = []
    for url in urls:
        row = {'url': url, 'observed_at_utc': datetime.now(timezone.utc).isoformat(), 'http_status': None}
        try:
            with urlopen(Request(url, headers={'User-Agent': 'BOWProtocolReferenceAudit/1.0'}), timeout=25, context=ssl.create_default_context()) as response:
                body = response.read(4 * 1024 * 1024 + 1)
                if len(body) > 4 * 1024 * 1024:
                    raise ValueError('Response exceeds the complete-evidence size limit')
                row.update({'http_status': response.status, 'effective_url': response.geturl(), 'bytes': len(body), 'sha256': digest(body)})
            key = digest(url.encode())[:24] + '.html'
            (cache / key).write_bytes(body)
            parser = Links(row['effective_url'])
            parser.feed(body.decode('utf-8', 'replace'))
            row['advertised_sound_sites'] = sorted(u for u in parser.urls if urlparse(u).hostname == 'sounds.spriters-resource.com')
            row['cache_path'] = key
        except HTTPError as error:
            row.update({'http_status': error.code, 'error': str(error), 'response_preserved': False})
        except (URLError, ValueError, TimeoutError) as error:
            row['error'] = str(error)
        observations.append(row)
    return {'schema': 're.bow.audio-discovery/1', 'observations': observations}


def import_entry(entry, cache, catalogue, destination):
    uid = entry['id']
    if uid not in catalogue or entry['game'] != catalogue[uid]['game']:
        raise ValueError('Unknown identity or wrong source game')
    review = entry['review']
    if review.get('accepted') is not True or review.get('phase_ambiguity') is not False:
        raise ValueError('An exact-form review is required')
    for field in ('specific_form', 'audible_observation', 'language', 'limitations'):
        if not review.get(field):
            raise ValueError('Missing audio review: ' + field)
    if entry.get('source_bytes_transformed') is not False:
        raise ValueError('Only unchanged source bytes may be imported')
    page = entry['source_page']
    source = entry['source_audio']
    for row in (page, source):
        parsed = urlparse(row['url'])
        if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
            raise ValueError('Public HTTPS evidence URLs are required')
    html, _ = verified_bytes(cache, page, 4 * 1024 * 1024)
    parser = Links(page['url'])
    parser.feed(html.decode('utf-8', 'replace'))
    if source['url'] not in parser.urls:
        raise ValueError('The sound URL is not advertised by the reviewed page')
    body, path = verified_bytes(cache, source, MAX_AUDIO)
    if path.suffix.lower() not in ('.wav', '.ogg', '.mp3', '.flac', '.m4a', '.opus'):
        raise ValueError('Unsupported audio file extension')
    probe = inspect_audio(path)
    target = destination / uid / (source['sha256'] + path.suffix.lower())
    if target.exists() and target.read_bytes() != body:
        raise ValueError('Refusing to overwrite a different audio file')
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        shutil.copyfile(path, target)
    return {
        'id': uid, 'name': catalogue[uid]['name'], 'game': entry['game'],
        'path': str(target.relative_to(destination)), 'bytes': len(body),
        'sha256': digest(body), 'source_page': {'url': page['url'], 'sha256': page['sha256']},
        'source_audio': {'url': source['url'], 'sha256': source['sha256']},
        'review': review, 'probe': probe, 'source_bytes_transformed': False,
        'canonical_fidelity_certified': False, 'combat_audio_final': False,
    }


def audit_catalogue(cache, evidence):
    """Verify cached documents before reporting the absence of advertised clips."""
    unique, ids = {}, []
    for item in evidence['identities']:
        path = contained_file(cache, item['body_path'])
        data = path.read_bytes()
        if digest(data) != item['body_sha256']:
            raise ValueError('Catalogue page SHA-256 mismatch: ' + item['id'])
        if item['body_sha256'] not in unique:
            parser = Links(item['source_page'])
            parser.feed(data.decode('utf-8', 'replace'))
            unique[item['body_sha256']] = sorted(u for u in parser.urls if urlparse(u).path.lower().endswith(('.wav', '.ogg', '.mp3', '.flac', '.m4a', '.opus')))
        ids.append({'id': item['id'], 'source_page': item['source_page'], 'page_sha256': item['body_sha256'], 'advertised_audio_urls': unique[item['body_sha256']]})
    return {'verified_identities': len(ids), 'verified_documents': len(unique), 'documents_with_direct_audio_links': sum(bool(v) for v in unique.values()), 'identities': ids}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, required=True)
    parser.add_argument('--import-request', type=Path)
    parser.add_argument('--catalogue-evidence', type=Path)
    parser.add_argument('--discover', action='store_true')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if sum((bool(args.import_request), bool(args.catalogue_evidence), args.discover)) != 1:
        parser.error('Choose one of --import-request, --catalogue-evidence or --discover')
    if args.discover:
        output = collect_discovery(args.cache)
    elif args.catalogue_evidence:
        output = audit_catalogue(args.cache, json.loads(args.catalogue_evidence.read_text()))
    else:
        request = json.loads(args.import_request.read_text())
        if request['schema'] != 're.bow.native-audio-import/1':
            raise ValueError('Unexpected native audio request schema')
        catalogue = {x['id']: x for x in json.loads((ROOT / 'data/roster.json').read_text())['catalog']}
        entries = request['entries']
        if len({x['id'] for x in entries}) != len(entries):
            raise ValueError('Duplicate identity in this import request')
        output = {'schema': 're.bow.native-audio-pack/1', 'entries': [import_entry(x, args.cache, catalogue, args.output.parent) for x in entries]}
    output['observed_at_utc'] = datetime.now(timezone.utc).isoformat()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'output': str(args.output), 'entries': len(output.get('entries', [])), 'verified_documents': output.get('verified_documents')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
