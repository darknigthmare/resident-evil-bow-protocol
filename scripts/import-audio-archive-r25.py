#!/usr/bin/env python3
"""Preserve the published Revelations WAV groups without certifying native banks."""
from __future__ import annotations
import argparse
import array
from collections import Counter
import hashlib
import gzip
import io
import json
from pathlib import Path, PurePosixPath
import stat
import sys
import wave
import re
import unicodedata
from zipfile import ZipFile, ZIP_STORED, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
MAX_ARCHIVE = 100 * 1024 * 1024
MAX_EXPANDED = 160 * 1024 * 1024
MAX_MEMBER = 4 * 1024 * 1024
SOURCE_HOST = 'sounds.spriters-resource.com'

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def identity_tokens(value):
    text = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().lower()
    return set(re.findall(r'[a-z0-9]+', text)) - {'final', 'foley'}

def safe_name(name):
    path = PurePosixPath(name)
    if not name or '\\' in name or ':' in name or name.startswith('/') or any(p in ('.', '..') for p in name.split('/')):
        raise ValueError('Unsafe source member path')
    if any(ord(c) < 32 for c in name):
        raise ValueError('Unsafe source member character')
    return path

def inspect_archive(archive):
    infos = archive.infolist()
    if not infos or len(infos) > 2048:
        raise ValueError('Archive member count exceeds the declared budget')
    seen, total = set(), 0
    for item in infos:
        safe_name(item.filename.rstrip('/'))
        key = item.filename.rstrip('/').casefold()
        if key in seen:
            raise ValueError('Duplicate or case-colliding source member')
        seen.add(key)
        kind = stat.S_IFMT(item.external_attr >> 16)
        if kind not in (0, stat.S_IFREG, stat.S_IFDIR) or item.flag_bits & 1:
            raise ValueError('Encrypted or special archive member refused')
        if item.compress_type not in (ZIP_STORED, ZIP_DEFLATED):
            raise ValueError('Unsupported archive compression')
        if item.file_size < 0 or item.file_size > MAX_MEMBER:
            raise ValueError('Source member exceeds the declared budget')
        if item.file_size > 1024 * max(1, item.compress_size):
            raise ValueError('Source compression ratio exceeds the declared budget')
        total += item.file_size
    if total > MAX_EXPANDED:
        raise ValueError('Expanded archive exceeds the declared budget')
    return infos

def inspect_wave(raw):
    if len(raw) > MAX_MEMBER or raw[:4] != b'RIFF' or raw[8:12] != b'WAVE':
        raise ValueError('Source member is not a bounded RIFF/WAVE file')
    if int.from_bytes(raw[4:8], 'little') + 8 != len(raw):
        raise ValueError('RIFF extent differs from the source file')
    with wave.open(io.BytesIO(raw), 'rb') as audio:
        channels, sample_rate, sample_bytes, frames = audio.getnchannels(), audio.getframerate(), audio.getsampwidth(), audio.getnframes()
        if (channels, sample_rate, sample_bytes, audio.getcomptype()) != (1, 48000, 2, 'NONE') or frames <= 0:
            raise ValueError('Unexpected published PCM format')
        samples = array.array('h', audio.readframes(frames))
        if sys.byteorder != 'little':
            samples.byteswap()
        if len(samples) != frames:
            raise ValueError('Truncated published sample data')
        peak = max(abs(min(samples, default=0)), abs(max(samples, default=0)))
        return {'duration_seconds': frames / sample_rate, 'frames': frames, 'format': 'wav', 'codec': 'pcm_s16le',
                'channels': channels, 'sample_rate': sample_rate, 'sample_bytes': sample_bytes,
                'nonzero_pcm_samples_present': peak > 0, 'peak_absolute_pcm_sample': peak}

def write_exact(root, relative, raw):
    safe_name(relative)
    root = Path(root).absolute()
    if any(parent.is_symlink() for parent in [root, *root.parents]):
        raise ValueError('Symlink output refused')
    root = root.resolve()
    path = root / relative
    for parent in [path, *path.parents]:
        if parent == root.parent:
            break
        if parent.is_symlink():
            raise ValueError('Symlink output refused')
    if not path.resolve().is_relative_to(root):
        raise ValueError('Output leaves the selected delivery')
    if path.exists():
        if not path.is_file() or path.read_bytes() != raw:
            raise ValueError('Refusing to overwrite different source bytes: ' + relative)
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw)

def build(archive_path, page_path, request, destination, roster=None):
    if request.get('schema') != 're.bow.documented-audio-import/2' or request.get('canonical_fidelity_certified') is not False:
        raise ValueError('Unexpected request or unsupported native certification')
    archive_path, page_path, destination = Path(archive_path), Path(page_path), Path(destination)
    if archive_path.stat().st_size > MAX_ARCHIVE:
        raise ValueError('Source archive exceeds the declared budget')
    raw_archive, raw_page = archive_path.read_bytes(), page_path.read_bytes()
    source = request['source']
    if len(raw_archive) != source['archive_bytes'] or sha(raw_archive) != source['archive_sha256']:
        raise ValueError('Original source archive hash or length differs')
    if sha(raw_page) != source['page_sha256']:
        raise ValueError('Original source page hash differs')
    page_text = raw_page.decode('utf-8')
    if source['download_href'] not in page_text or 'Enemies - Resident Evil Revelations' not in page_text:
        raise ValueError('Published page does not bind this enemy archive and exact game')
    groups = request['groups']
    if len({row['published_group'] for row in groups}) != len(groups):
        raise ValueError('Duplicate published group')
    if roster is None:
        roster = {row['id']: row for row in json.loads((ROOT / 'data/roster.json').read_text())['catalog']}
    historical = json.loads((ROOT / 'modules/fidelity-r23/canonical/manifest.json').read_text())
    historical_entries = {row['id']: row for row in historical['entries']}
    historical_sources = {row['id']: row for row in historical['sources']}
    for group in groups:
        identity = roster.get(group['identity_id'])
        if not identity or identity['gameKey'] != 'resident-evil-revelations' or group.get('source_label_verified') is not True:
            raise ValueError('Unknown identity, wrong original/remake or unverified group binding')
        if identity_tokens(group['published_group']) != identity_tokens(identity['name']):
            raise ValueError('Published group does not name this exact catalogue subject')
        prior = historical_entries[group['identity_id']]
        reference, source_record = group['identity_reference'], historical_sources[prior['source_id']]
        expected_snapshot = '../../fidelity-r23/canonical/' + source_record['snapshot']
        if reference['url'] != prior['page_url'] or reference['snapshot'] != expected_snapshot:
            raise ValueError('Identity context differs from the recorded game-specific page')
        packed = (ROOT / 'modules/fidelity-r23/canonical' / source_record['snapshot']).read_bytes()
        if sha(packed) != reference['snapshot_sha256'] or sha(gzip.decompress(packed)) != reference['raw_sha256']:
            raise ValueError('Identity context snapshot hash differs')
        if group.get('native_bank_certified') is not False or group.get('independently_listened') is not False:
            raise ValueError('Publisher grouping cannot certify native audio or independent listening')
    by_group = {row['published_group']: row for row in groups}
    prepared, excluded, entries = [], [], []
    with ZipFile(io.BytesIO(raw_archive)) as archive:
        infos = inspect_archive(archive)
        for item in infos:
            if item.is_dir():
                continue
            group_name = item.filename.split('/')[0]
            if group_name not in by_group:
                excluded.append({'member': item.filename, 'reason': 'Shared common group, absent catalogue subject or unverified exact form'})
                continue
            group = by_group[group_name]
            raw = archive.read(item)
            probe = inspect_wave(raw)
            if not probe['nonzero_pcm_samples_present']:
                excluded.append({'member': item.filename, 'reason': 'Source placeholder with only zero-valued PCM samples', 'sha256': sha(raw)})
                continue
            # A filename is a published cue label, not a verified game trigger.
            clip_id = sha(item.filename.encode())[:24]
            path = 'clips/' + item.filename
            language = 'ENG' if '/ENG/' in item.filename else 'JPN' if '/JPN/' in item.filename else 'Not stated by publication'
            entries.append({'clip_id': clip_id, 'published_label': item.filename, 'published_group': group_name,
                            'path': path, 'archive_member': item.filename, 'bytes': len(raw), 'sha256': sha(raw), 'probe': probe,
                            'identity_id': group['identity_id'], 'game': roster[group['identity_id']]['game'],
                            'source_platform': 'PC / Computer', 'source_game_label': 'Resident Evil Revelations',
                            'source_edition': group.get('source_edition', 'PC / Computer — publication du port HD'),
                            'source_language_label': language, 'assignment_status': 'PUBLISHED_SUBJECT_GROUP_WITH_GAME_CONTEXT',
                            'attribution_scope': group['attribution_scope'], 'identity_reference': group['identity_reference'],
                            'source_page': source['page_url'], 'source_bytes_transformed': False,
                            'independent_listening_completed': False, 'native_bank_certified': False,
                            'canonical_fidelity_certified': False, 'combat_audio_final': False})
            prepared.append((path, raw))
    if not entries or len({e['clip_id'] for e in entries}) != len(entries):
        raise ValueError('No usable sounds or duplicate published cue')
    group_counts = Counter(entry['published_group'] for entry in entries)
    uid_counts = Counter(entry['identity_id'] for entry in entries)
    manifest = {'schema': 're.bow.audio-documentary-candidates/1', 'release': 'R25', 'source': source,
                'counts': {'published_wave_files_in_archive': sum(not i.is_dir() for i in infos), 'documentary_clips': len(entries),
                           'publisher_assigned_identities': len(uid_counts), 'publisher_assigned_clips': len(entries),
                           'independently_listened_clips': 0, 'certified_native_clips': 0, 'final_combat_audio': 0,
                           'silent_source_placeholders_excluded': sum('zero-valued' in e['reason'] for e in excluded)},
                'groups': [{**g, 'delivered_clips': group_counts[g['published_group']]} for g in groups],
                'identity_counts': dict(uid_counts), 'archive_audit': {'members': len(infos), 'expanded_bytes': sum(i.file_size for i in infos),
                    'original_archive_preserved': True, 'excluded_members': excluded}, 'entries': entries}
    # Verify every selected member before writing anything into the delivery.
    for path, raw in [('archives/revelations-enemies.zip', raw_archive), ('evidence/source-page.html.txt', raw_page), *prepared]:
        write_exact(destination, path, raw)
    encoded = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
    write_exact(destination, 'manifest.json', encoded)
    return manifest

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--page', type=Path, required=True)
    parser.add_argument('--request', type=Path, default=ROOT / 'modules/fidelity-r25/audio/import-request.json')
    parser.add_argument('--output', type=Path, default=ROOT / 'modules/fidelity-r25/audio')
    args = parser.parse_args()
    result = build(args.archive, args.page, json.loads(args.request.read_text()), args.output)
    print(json.dumps(result['counts']))

if __name__ == '__main__':
    main()
