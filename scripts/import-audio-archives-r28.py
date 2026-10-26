#!/usr/bin/env python3
"""Import exact published RE3R WAVs with explicit candidate-only form groups."""
from __future__ import annotations
import argparse
import array
from collections import Counter
import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import wave
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / 'modules/fidelity-r28/audio'
SPEC = importlib.util.spec_from_file_location('source_audio_r25', ROOT / 'scripts/import-audio-archive-r25.py')
BASE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BASE)
PART_BYTES = 48 * 1024 * 1024
EXPECTED = {
    475786: ('Licker', 'Voices', 're3r-licker', []),
    475787: ('NE-a Type', 'Voices', None, ['re3r-ne-alpha-parasite']),
    475788: ('Nemesis', 'Voices', None, ['re3r-nemesis', 're3r-stage-2-nemesis', 're3r-stage-3-nemesis']),
    475792: ('NE-a Type', 'Sound Effects', None, ['re3r-ne-alpha-parasite']),
    475793: ('Nemesis', 'Sound Effects', None, ['re3r-nemesis', 're3r-stage-2-nemesis', 're3r-stage-3-nemesis']),
}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def inspect_wave(raw):
    if len(raw) > BASE.MAX_MEMBER or raw[:4] != b'RIFF' or raw[8:12] != b'WAVE' or int.from_bytes(raw[4:8], 'little') + 8 != len(raw):
        raise ValueError('WAV extent differs from published bytes')
    with wave.open(io.BytesIO(raw), 'rb') as audio:
        channels, rate, width, frames = audio.getnchannels(), audio.getframerate(), audio.getsampwidth(), audio.getnframes()
        if channels not in (1, 2) or rate not in (44100, 48000) or width != 2 or audio.getcomptype() != 'NONE' or frames <= 0:
            raise ValueError('Unsupported published PCM format')
        pcm = array.array('h', audio.readframes(frames))
        if sys.byteorder != 'little':
            pcm.byteswap()
        if len(pcm) != frames * channels:
            raise ValueError('Truncated PCM samples')
        peak = max(abs(min(pcm, default=0)), abs(max(pcm, default=0)))
        return {'duration_seconds': frames / rate, 'frames': frames, 'format': 'wav', 'codec': 'pcm_s16le',
                'channels': channels, 'sample_rate': rate, 'sample_bytes': width,
                'nonzero_pcm_samples_present': peak > 0, 'peak_absolute_pcm_sample': peak}


def read_source_archive(source, inputs):
    if 'archive_parts' in source:
        records = source['archive_parts']
        if not records or len(records) > 3 or [x['index'] for x in records] != list(range(1, len(records) + 1)):
            raise ValueError('Invalid ordered archive segments')
        parts, offset = [], 0
        for part in records:
            BASE.safe_name(part['path'])
            raw = (inputs / part['path']).read_bytes()
            if len(raw) != part['bytes'] or sha(raw) != part['sha256'] or len(raw) > PART_BYTES or part['byteOffset'] != offset:
                raise ValueError('Archive segment hash or extent differs')
            parts.append(raw); offset += len(raw)
        raw = b''.join(parts)
        BASE.safe_name(source['archive_descriptor'])
        descriptor = json.loads((inputs / source['archive_descriptor']).read_text())
        if descriptor != {'schema': 're.bow.exact-segmented-archive/1', 'url': source['archive_url'],
                          'sha256': source['archive_sha256'], 'bytes': source['archive_bytes'], 'parts': records}:
            raise ValueError('Segment descriptor differs from source')
    else:
        BASE.safe_name(source['archive_path'])
        raw = (inputs / source['archive_path']).read_bytes()
    if len(raw) > BASE.MAX_ARCHIVE or len(raw) != source['archive_bytes'] or sha(raw) != source['archive_sha256']:
        raise ValueError('Original source archive hash or extent differs')
    return raw


def build(request, inputs, destination=None):
    if request.get('schema') != 're.bow.documented-audio-import/4' or request.get('canonical_fidelity_certified') is not False:
        raise ValueError('Unsupported request or certification')
    inputs = Path(inputs)
    if len(request['sources']) != len(EXPECTED) or {x['publication_asset_id'] for x in request['sources']} != set(EXPECTED):
        raise ValueError('Source publication set differs')
    roster = {x['id']: x for x in json.loads((ROOT / 'data/roster.json').read_text())['catalog']}
    canon = json.loads((ROOT / 'modules/fidelity-r23/canonical/manifest.json').read_text())
    by_uid, by_source = {x['id']: x for x in canon['entries']}, {x['id']: x for x in canon['sources']}
    entries, groups, sources, excluded, prepared = [], [], [], [], []
    previous = set()
    for release in range(24, 28):
        previous.update(x['sha256'] for x in json.loads((ROOT / f'modules/fidelity-r{release}/audio/manifest.json').read_text())['entries'])
    for source in request['sources']:
        asset = source['publication_asset_id']
        label, section, uid, candidates = EXPECTED[asset]
        if (source['published_group'], source['published_section'], source['identity_id'], source['candidate_identity_ids']) != (label, section, uid, candidates):
            raise ValueError('Unsupported exact identity or candidate form assignment')
        for identity in ([uid] if uid else candidates):
            if roster[identity]['gameKey'] != 'resident-evil-3-remake':
                raise ValueError('Wrong source edition')
        url = f'https://sounds.spriters-resource.com/pc_computer/residentevil3remake/asset/{asset}/'
        if source['page_url'] != url or source['archive_url'] != 'https://sounds.spriters-resource.com' + source['download_href']:
            raise ValueError('Unexpected source URL')
        BASE.safe_name(source['page_path'])
        page = (inputs / source['page_path']).read_bytes()
        archive_raw = read_source_archive(source, inputs)
        if sha(page) != source['page_sha256'] or source['game'] != 'Resident Evil 3 Remake' or source['platform'] != 'PC / Computer':
            raise ValueError('Source document or game differs')
        page_text = page.decode('utf-8')
        archive_label = f'Enemies - Voices - {label}.zip' if section == 'Voices' else f'Enemies - {label}.zip'
        if f'<h1>{label}</h1>' not in page_text or source['download_href'] not in page_text or '>Resident Evil 3 Remake</a>' not in page_text or archive_label not in page_text:
            raise ValueError('Publisher page does not bind exact game, group, section and archive')
        context = source['identity_references']
        if len(context) != len(([uid] if uid else candidates)):
            raise ValueError('Missing identity context')
        for identity, reference in zip(([uid] if uid else candidates), context):
            entry = by_uid[identity]; evidence = by_source[entry['source_id']]
            packed = (ROOT / 'modules/fidelity-r23/canonical' / evidence['snapshot']).read_bytes()
            if reference != {'identity_id': identity, 'url': entry['page_url'], 'snapshot': '../../fidelity-r23/canonical/' + evidence['snapshot'],
                             'snapshot_sha256': sha(packed), 'raw_sha256': sha(gzip.decompress(packed))}:
                raise ValueError('Game-specific context differs from historical evidence')
        group_name, members = label + ' / ' + section, []
        with ZipFile(io.BytesIO(archive_raw)) as archive:
            infos = BASE.inspect_archive(archive)
            for info in infos:
                if info.is_dir():
                    continue
                if not info.filename.endswith('.wav') or '<li>' + info.filename + '</li>' not in page_text:
                    raise ValueError('Archive member not listed as a WAV on source page')
                raw = archive.read(info); probe = inspect_wave(raw); digest = sha(raw)
                members.append({'member': info.filename, 'bytes': len(raw), 'sha256': digest})
                if not probe['nonzero_pcm_samples_present']:
                    excluded.append({'asset_id': asset, 'member': info.filename, 'sha256': digest, 'reason': 'Zero-valued PCM source placeholder'})
                    continue
                path = f'clips/{asset}/' + info.filename
                entry = {'clip_id': sha((str(asset) + '/' + info.filename).encode())[:24], 'published_label': info.filename,
                         'published_group': group_name, 'publication_asset_id': asset, 'path': path,
                         'archive_member': info.filename, 'bytes': len(raw), 'sha256': digest, 'probe': probe,
                         'identity_id': uid, 'candidate_identity_ids': candidates, 'identity_references': context,
                         'game': 'Resident Evil 3 remake (2020)', 'source_platform': 'PC / Computer',
                         'source_edition': 'Publication PC / Computer de Resident Evil 3 Remake (2020)',
                         'source_page': url, 'source_bytes_transformed': False,
                         'assignment_status': 'PUBLISHED_SUBJECT_GROUP_WITH_GAME_CONTEXT' if uid else 'PUBLISHED_GROUP_ONLY_FORM_OR_HOST_UNRESOLVED',
                         'attribution_scope': source['attribution_scope'], 'independent_listening_completed': False,
                         'native_bank_certified': False, 'canonical_fidelity_certified': False, 'combat_audio_final': False,
                         'content_present_in_previous_releases': digest in previous}
                entries.append(entry); prepared.append((path, raw))
        record = {**source, 'member_count': len(infos), 'wave_files': len(members), 'members': members}
        sources.append(record)
        groups.append({'published_group': group_name, 'identity_id': uid, 'candidate_identity_ids': candidates,
                       'delivered_clips': sum(x['published_group'] == group_name for x in entries), 'attribution_scope': source['attribution_scope']})
        prepared.append((source['page_path'], page))
        if 'archive_parts' in source:
            for part in source['archive_parts']:
                prepared.append((part['path'], (inputs / part['path']).read_bytes()))
            prepared.append((source['archive_descriptor'], (inputs / source['archive_descriptor']).read_bytes()))
        else:
            prepared.append((source['archive_path'], archive_raw))
    if len({x['clip_id'] for x in entries}) != len(entries):
        raise ValueError('Duplicate clip identifier')
    manifest = {'schema': 're.bow.audio-documentary-candidates/2', 'release': 'R28',
                'source': {'page_url': request['sources'][0]['page_url'], 'limitations': request['limitations']},
                'sources': sources, 'groups': groups, 'entries': entries,
                'counts': {'source_archives': len(sources), 'source_wave_files': sum(x['wave_files'] for x in sources),
                           'documentary_clips': len(entries), 'publisher_assigned_identities': len({x['identity_id'] for x in entries if x['identity_id']}),
                           'exact_subject_clips': sum(bool(x['identity_id']) for x in entries),
                           'candidate_only_clips': sum(x['identity_id'] is None for x in entries),
                           'candidate_identities': len({uid for x in entries for uid in x['candidate_identity_ids']}),
                           'distinct_published_file_contents_sha256': len({x['sha256'] for x in entries}),
                           'duplicate_published_file_contents': len(entries) - len({x['sha256'] for x in entries}),
                           'contents_already_present_r24_r27': len({x['sha256'] for x in entries if x['content_present_in_previous_releases']}),
                           'publisher_groups': len(groups), 'independently_listened_clips': 0, 'certified_native_clips': 0,
                           'duration_seconds': sum(x['probe']['duration_seconds'] for x in entries),
                           'delivered_audio_bytes': sum(x['bytes'] for x in entries),
                           'sample_rate_counts': dict(Counter(str(x['probe']['sample_rate']) for x in entries)),
                           'source_archive_bytes': sum(x['archive_bytes'] for x in sources)},
                'archive_audit': {'excluded_members': excluded}, 'canonical_fidelity_certified': False}
    if destination:
        for relative, raw in prepared:
            BASE.write_exact(Path(destination), relative, raw)
        BASE.write_exact(Path(destination), 'manifest.json', (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode())
        BASE.write_exact(Path(destination), 'import-request.json', (json.dumps(request, ensure_ascii=False, indent=2) + '\n').encode())
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inputs', type=Path, default=MODULE)
    parser.add_argument('--request', type=Path, default=MODULE / 'import-request.json')
    parser.add_argument('--output', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    result = build(json.loads(args.request.read_text()), args.inputs, args.output)
    if args.check and result != json.loads((MODULE / 'manifest.json').read_text()):
        raise SystemExit('Manifest differs from source reconstruction')
    print(json.dumps(result['counts']))


if __name__ == '__main__':
    main()
