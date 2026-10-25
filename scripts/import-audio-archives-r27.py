#!/usr/bin/env python3
"""Preserve published RE3 Remake audio groups; never infer game triggers."""
from __future__ import annotations
import argparse
import array
from collections import Counter
import gzip
import importlib.util
import io
import json
import sys
import wave
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / 'modules/fidelity-r27/audio'
spec = importlib.util.spec_from_file_location('audio_bytes_r25', ROOT / 'scripts/import-audio-archive-r25.py')
BASE = importlib.util.module_from_spec(spec)
spec.loader.exec_module(BASE)
EXPECTED = {475767: ('Zombie', 're3r-zombie', 'Voices')}


def inspect_wave(raw):
    if len(raw) > BASE.MAX_MEMBER or raw[:4] != b'RIFF' or raw[8:12] != b'WAVE' or int.from_bytes(raw[4:8], 'little') + 8 != len(raw):
        raise ValueError('RIFF/WAVE extent differs from source bytes')
    with wave.open(io.BytesIO(raw), 'rb') as audio:
        channels, rate, width, frames = audio.getnchannels(), audio.getframerate(), audio.getsampwidth(), audio.getnframes()
        if channels not in (1, 2) or (rate, width, audio.getcomptype()) != (48000, 2, 'NONE') or frames <= 0:
            raise ValueError('Unexpected published PCM format')
        samples = array.array('h', audio.readframes(frames))
        if sys.byteorder != 'little':
            samples.byteswap()
        if len(samples) != frames * channels:
            raise ValueError('Truncated PCM frames')
        peak = max(abs(min(samples, default=0)), abs(max(samples, default=0)))
        return {'duration_seconds': frames / rate, 'frames': frames, 'format': 'wav', 'codec': 'pcm_s16le',
                'channels': channels, 'sample_rate': rate, 'sample_bytes': width,
                'nonzero_pcm_samples_present': peak > 0, 'peak_absolute_pcm_sample': peak}


def build(request, inputs, destination=None):
    if request.get('schema') != 're.bow.documented-audio-import/3' or request.get('canonical_fidelity_certified') is not False:
        raise ValueError('Unsupported request or certification')
    inputs = Path(inputs)
    roster = {x['id']: x for x in json.loads((ROOT / 'data/roster.json').read_text())['catalog']}
    previous = json.loads((ROOT / 'modules/fidelity-r23/canonical/manifest.json').read_text())
    entries23 = {x['id']: x for x in previous['entries']}
    sources23 = {x['id']: x for x in previous['sources']}
    if {x['publication_asset_id'] for x in request['sources']} != set(EXPECTED) or len(request['sources']) != len(EXPECTED):
        raise ValueError('Source set differs from the audited edition/subjects')
    sources, entries, excluded, prepared = [], [], [], []
    for source in request['sources']:
        asset_id = source['publication_asset_id']
        label, uid, kind = EXPECTED[asset_id]
        if (source['published_group'], source['identity_id'], source['published_section']) != (label, uid, kind):
            raise ValueError('Subject or source section differs from publication')
        if source['game'] != 'Resident Evil 3 Remake' or source['platform'] != 'PC / Computer':
            raise ValueError('Game or platform differs from the published source')
        identity = roster[uid]
        expected_catalogue_label = {'Hunter Beta': 'Hunter β', 'Hunter Gamma': 'Hunter γ — gueule ouverte'}.get(label, label)
        if identity['gameKey'] != 'resident-evil-3-remake' or identity['name'] != expected_catalogue_label:
            raise ValueError('Catalogue identity differs from source game/group')
        url = f'https://sounds.spriters-resource.com/pc_computer/residentevil3remake/asset/{asset_id}/'
        if source['page_url'] != url or source['archive_url'] != 'https://sounds.spriters-resource.com' + source['download_href']:
            raise ValueError('Source URL differs from the audited publication')
        raw_page = (inputs / source['page_path']).read_bytes()
        raw_archive = (inputs / source['archive_path']).read_bytes()
        if BASE.sha(raw_page) != source['page_sha256'] or BASE.sha(raw_archive) != source['archive_sha256'] or len(raw_archive) != source['archive_bytes']:
            raise ValueError('Source hash or length differs')
        page = raw_page.decode('utf-8')
        archive_label = f'Enemies - Voices - {label}.zip' if kind == 'Voices' else f'Sound Effects - Enemies - {label}.zip'
        if f'<h1>{label}</h1>' not in page or source['download_href'] not in page or '>Resident Evil 3 Remake</a>' not in page or archive_label not in page:
            raise ValueError('Page does not bind exact game, subject, archive and section')
        context = source['identity_reference']
        prior = entries23[uid]; snapshot = sources23[prior['source_id']]
        packed = (ROOT / 'modules/fidelity-r23/canonical' / snapshot['snapshot']).read_bytes()
        if context != {'url': prior['page_url'], 'snapshot': '../../fidelity-r23/canonical/' + snapshot['snapshot'],
                       'snapshot_sha256': BASE.sha(packed), 'raw_sha256': BASE.sha(gzip.decompress(packed))}:
            raise ValueError('Identity context differs from frozen game-specific reference')
        if len(raw_archive) > BASE.MAX_ARCHIVE:
            raise ValueError('Archive exceeds budget')
        members = []
        with ZipFile(io.BytesIO(raw_archive)) as archive:
            infos = BASE.inspect_archive(archive)
            for item in infos:
                if item.is_dir():
                    continue
                if not item.filename.endswith('.wav') or '<li>' + item.filename + '</li>' not in page:
                    raise ValueError('Member not listed as a WAV by the source page')
                raw = archive.read(item)
                probe = inspect_wave(raw)
                members.append({'member': item.filename, 'bytes': len(raw), 'sha256': BASE.sha(raw)})
                if not probe['nonzero_pcm_samples_present']:
                    excluded.append({'asset_id': asset_id, 'member': item.filename, 'reason': 'Zero-valued PCM placeholder', 'sha256': BASE.sha(raw)})
                    continue
                path = f'clips/{asset_id}/' + item.filename
                entry = {'clip_id': BASE.sha((str(asset_id) + '/' + item.filename).encode())[:24], 'published_label': item.filename,
                         'published_group': label + ' / ' + kind, 'path': path, 'archive_member': item.filename,
                         'bytes': len(raw), 'sha256': BASE.sha(raw), 'probe': probe, 'identity_id': uid, 'candidate_identity_ids': [],
                         'game': identity['game'], 'source_platform': source['platform'], 'source_game_label': source['game'],
                         'source_edition': 'PC / Computer — Resident Evil 3 Remake (2020), publication communautaire',
                         'source_language_label': 'Non établie ; Voices est le classement publié, pas une transcription',
                         'assignment_status': 'PUBLISHED_SUBJECT_GROUP_WITH_GAME_CONTEXT', 'source_page': url,
                         'publication_asset_id': asset_id, 'identity_reference': context,
                         'attribution_scope': 'Sujet et section de publication uniquement ; noms .wem.wav conservés, chaîne de conversion WEM, variante individuelle, déclencheur/action et banque brute non certifiés.',
                         'source_bytes_transformed': False, 'independent_listening_completed': False, 'native_bank_certified': False,
                         'canonical_fidelity_certified': False, 'combat_audio_final': False}
                entries.append(entry); prepared.append((path, raw))
        sources.append({**source, 'member_count': len(infos), 'wave_files': len(members), 'members': members})
        prepared.extend([(source['page_path'], raw_page), (source['archive_path'], raw_archive)])
    if len({x['clip_id'] for x in entries}) != len(entries):
        raise ValueError('Duplicate clip identifier')
    groups = []
    for source in sources:
        group = source['published_group'] + ' / ' + source['published_section']
        groups.append({'published_group': group, 'identity_id': source['identity_id'], 'delivered_clips': sum(x['published_group'] == group for x in entries)})
    manifest = {'schema': 're.bow.audio-documentary-candidates/1', 'release': 'R27',
                'source': {'page_url': request['sources'][0]['page_url'], 'limitations': request['limitations']},
                'sources': sources, 'groups': groups, 'entries': entries,
                'counts': {'source_archives': len(sources), 'source_wave_files': sum(x['wave_files'] for x in sources),
                           'documentary_clips': len(entries), 'publisher_assigned_identities': len({x['identity_id'] for x in entries}),
                           'distinct_published_file_contents_sha256': len({x['sha256'] for x in entries}),
                           'duplicate_published_file_contents': len(entries) - len({x['sha256'] for x in entries}),
                           'publisher_groups': len(groups), 'independently_listened_clips': 0, 'certified_native_clips': 0,
                           'duration_seconds': sum(x['probe']['duration_seconds'] for x in entries), 'delivered_audio_bytes': sum(x['bytes'] for x in entries)},
                'archive_audit': {'excluded_members': excluded}, 'canonical_fidelity_certified': False}
    if destination is not None:
        for relative, raw in prepared:
            BASE.write_exact(destination, relative, raw)
        BASE.write_exact(destination, 'manifest.json', (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode())
        BASE.write_exact(destination, 'import-request.json', (json.dumps(request, ensure_ascii=False, indent=2) + '\n').encode())
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
        raise SystemExit('Manifest differs from exact source reconstruction')
    print(json.dumps(result['counts']))


if __name__ == '__main__':
    main()
