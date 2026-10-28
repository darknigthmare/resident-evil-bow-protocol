#!/usr/bin/env python3
"""Preserve four published enemy audio groups and their unresolved edition/phase scope."""
import argparse
import array
from collections import Counter
import gzip
import hashlib
import html
import io
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import sys
import wave
from zipfile import ZipFile, ZIP_DEFLATED, ZIP_STORED

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r31/audio'
PREFIX = 'modules/fidelity-r31/audio/'
SPECS = (
    (433382, 'pc_computer/residentevil4', 'Dr. Salvador / Bella Sisters', 'Resident Evil 4 (2007)',
     'Resident Evil 4 — port PC (2007) publié ; équivalence avec la cible de 2005 non vérifiée',
     ['re4-dr-salvador', 're4-bella-sisters']),
    (488776, 'playstation_2/residentevilcodeveronicax', 'Alexander Ashford', 'Resident Evil CODE: Veronica X',
     'CODE: Veronica X — publication PlayStation 2 USA ; équivalence Dreamcast (2000) non vérifiée', ['recv-nosferatu']),
    (488777, 'playstation_2/residentevilcodeveronicax', 'Alexia Ashford', 'Resident Evil CODE: Veronica X',
     'CODE: Veronica X — publication PlayStation 2 USA ; équivalence Dreamcast (2000) non vérifiée',
     ['recv-alexia', 'recv-alexia-ashford-second-form', 'recv-alexia-ashford-third-form']),
    (488783, 'playstation_2/residentevilcodeveronicax', 'Steve Burnside', 'Resident Evil CODE: Veronica X',
     'CODE: Veronica X — publication PlayStation 2 USA ; équivalence Dreamcast (2000) non vérifiée', ['recv-mutated-steve']),
)
SCREENS = (
    ('residentevil.html', 'https://sounds.spriters-resource.com/gamecube/residentevil/', 0),
    ('gamecube-residentevil0.html', 'https://sounds.spriters-resource.com/gamecube/residentevil0/', 0),
    ('residentevil5.html', 'https://sounds.spriters-resource.com/pc_computer/residentevil5/', 0),
    ('residentevil7.html', 'https://sounds.spriters-resource.com/pc_computer/residentevil7/', 0),
    ('pc_computer-residentevil6.html', 'https://sounds.spriters-resource.com/pc_computer/residentevil6/', 0),
    ('residentevilrevelations2.html', 'https://sounds.spriters-resource.com/pc_computer/residentevilrevelations2/', 0),
    ('residentevil2remake.html', 'https://sounds.spriters-resource.com/pc_computer/residentevil2remake/', 0),
    ('playstation-residentevil2.html', 'https://sounds.spriters-resource.com/playstation/residentevil2/', 0),
    ('playstation-residentevil3nemesis.html', 'https://sounds.spriters-resource.com/playstation/residentevil3nemesis/', 0),
    ('gamecube-residentevil4.html', 'https://sounds.spriters-resource.com/gamecube/residentevil4/', 0),
)
MAX_ARCHIVE = 64 * 1024 * 1024
MAX_EXPANDED = 96 * 1024 * 1024
MAX_MEMBER = 4 * 1024 * 1024


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def payload(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def binding(relative, raw=None):
    raw = (ROOT / relative).read_bytes() if raw is None else raw
    return {'path': relative, 'bytes': len(raw), 'sha256': digest(raw)}


def safe_name(name):
    path = PurePosixPath(name)
    if (not name or '\\' in name or ':' in name or path.is_absolute()
            or any(piece in ('', '.', '..') for piece in name.split('/'))
            or any(ord(c) < 32 for c in name)):
        raise ValueError('Unsafe audio archive member')
    return path


def inspect_archive(archive):
    infos = archive.infolist()
    if not 1 <= len(infos) <= 512:
        raise ValueError('Audio archive member count exceeds budget')
    seen, total = set(), 0
    for info in infos:
        name = info.filename.rstrip('/')
        safe_name(name)
        if name.casefold() in seen:
            raise ValueError('Duplicate or case-colliding archive member')
        seen.add(name.casefold())
        mode = stat.S_IFMT(info.external_attr >> 16)
        if mode not in (0, stat.S_IFREG, stat.S_IFDIR) or info.flag_bits & 1:
            raise ValueError('Special or encrypted audio archive member')
        if info.compress_type not in (ZIP_STORED, ZIP_DEFLATED):
            raise ValueError('Unsupported archive compression')
        if info.file_size > MAX_MEMBER or info.file_size > max(1, info.compress_size) * 1024:
            raise ValueError('Expanded audio member exceeds budget')
        total += info.file_size
    if total > MAX_EXPANDED:
        raise ValueError('Expanded audio archive exceeds budget')
    return infos


def inspect_wave(raw):
    if len(raw) > MAX_MEMBER or raw[:4] != b'RIFF' or raw[8:12] != b'WAVE' or int.from_bytes(raw[4:8], 'little') + 8 != len(raw):
        raise ValueError('Invalid or truncated RIFF audio')
    with wave.open(io.BytesIO(raw), 'rb') as wav:
        channels, rate, width, frames = wav.getnchannels(), wav.getframerate(), wav.getsampwidth(), wav.getnframes()
        if channels not in (1, 2) or rate not in (22050, 32000, 44100, 48000) or width != 2 or wav.getcomptype() != 'NONE' or not frames:
            raise ValueError('Unsupported published PCM audio')
        pcm = wav.readframes(frames)
        if len(pcm) != channels * width * frames:
            raise ValueError('Truncated source PCM')
    samples = array.array('h', pcm)
    if sys.byteorder != 'little':
        samples.byteswap()
    peak = max(abs(min(samples)), abs(max(samples)))
    return {'format': 'wav', 'codec': 'pcm_s16le', 'channels': channels, 'sampleRate': rate,
            'frames': frames, 'durationSeconds': frames / rate, 'nonzeroSamples': peak > 0,
            'peakAbsoluteSample': peak, 'decodedPcmSha256': digest(pcm), 'decoder': 'Python wave / original PCM bytes'}


def inspect_ogg(raw, file):
    if len(raw) > MAX_MEMBER or raw[:4] != b'OggS' or b'\x01vorbis' not in raw[:256]:
        raise ValueError('Invalid published Vorbis audio')
    metadata = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
        'stream=codec_name,sample_rate,channels,duration', '-of', 'json', str(file)]))['streams']
    if len(metadata) != 1 or metadata[0]['codec_name'] != 'vorbis':
        raise ValueError('A single published Vorbis stream is required')
    stream = metadata[0]; channels, rate = int(stream['channels']), int(stream['sample_rate'])
    if channels not in (1, 2) or rate not in (22050, 32000, 44100, 48000):
        raise ValueError('Unexpected published Vorbis format')
    pcm = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(file), '-f', 's16le', '-acodec', 'pcm_s16le', '-'])
    if not pcm or len(pcm) > 24 * 1024 * 1024 or len(pcm) % (channels * 2):
        raise ValueError('Invalid decoded Vorbis extent')
    samples = array.array('h', pcm)
    if sys.byteorder != 'little':
        samples.byteswap()
    peak = max(abs(min(samples)), abs(max(samples))); frames = len(pcm) // (channels * 2)
    return {'format': 'ogg', 'codec': 'vorbis', 'channels': channels, 'sampleRate': rate,
            'frames': frames, 'durationSeconds': frames / rate, 'nonzeroSamples': peak > 0,
            'peakAbsoluteSample': peak, 'decodedPcmSha256': digest(pcm),
            'decoder': subprocess.check_output(['ffmpeg', '-version'], text=True).splitlines()[0],
            'measurementOnly': True, 'sourceFileConverted': False}


def prepare(inputs):
    """Import already observed HTTP200 response bytes; never rerequest a blocked service."""
    inputs = Path(inputs).resolve(); PACK.mkdir(parents=True, exist_ok=True)
    portraits = {row['id']: row for row in json.loads((ROOT / 'data/catalog-portraits.json').read_text())['catalog']}
    sources, contexts, screening, probes = [], {}, [], []
    for asset, slug, title, game, edition, ids in SPECS:
        page = (inputs / f'{asset}.html').read_bytes(); archive_raw = (inputs / f'{asset}.zip').read_bytes()
        text = page.decode('utf-8'); link = re.findall(r'href="([^"]+\.zip[^"]*)"', text)
        if len(link) != 1 or f'<h1>{html.escape(title)}</h1>' not in text or f'>{game}</a>' not in text:
            raise ValueError('Publisher game/title/archive correlation differs')
        if len(archive_raw) > MAX_ARCHIVE:
            raise ValueError('Source archive exceeds budget')
        page_path = PREFIX + f'evidence/asset-{asset}.html.gz'
        archive_path = PREFIX + f'archives/asset-{asset}.zip'
        (ROOT / page_path).parent.mkdir(parents=True, exist_ok=True)
        (ROOT / archive_path).parent.mkdir(parents=True, exist_ok=True)
        (ROOT / page_path).write_bytes(gzip.compress(page, mtime=0)); (ROOT / archive_path).write_bytes(archive_raw)
        source = {'assetId': asset, 'title': title, 'game': game, 'sourceEdition': edition,
                  'candidateIdentityIds': ids, 'url': f'https://sounds.spriters-resource.com/{slug}/asset/{asset}/',
                  'archiveUrl': 'https://sounds.spriters-resource.com' + html.unescape(link[0]),
                  'httpStatus': 200, 'page': binding(page_path), 'pageRawSha256': digest(page),
                  'archive': binding(archive_path), 'platform': 'PC / Computer' if asset == 433382 else 'PlayStation2'}
        with ZipFile(io.BytesIO(archive_raw)) as archive:
            for info in inspect_archive(archive):
                if info.is_dir():
                    continue
                if '<li>' + html.escape(info.filename, quote=False) + '</li>' not in text:
                    raise ValueError('Archive member is not on the actual publisher page')
                raw = archive.read(info); ext = PurePosixPath(info.filename).suffix.lower()
                if ext not in ('.wav', '.ogg'):
                    raise ValueError('Unexpected nonaudio source member')
                clip_id = digest((str(asset) + '/' + info.filename).encode())[:24]
                relative = PREFIX + f'clips/{asset}/{clip_id}{ext}'
                target = ROOT / relative; target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(raw)
                probe = inspect_wave(raw) if ext == '.wav' else inspect_ogg(raw, target)
                probes.append({'assetId': asset, 'archiveMember': info.filename, 'clipId': clip_id,
                               **binding(relative, raw), 'probe': probe})
        sources.append(source)
        for uid in ids:
            if uid in contexts:
                continue
            raw = (inputs / (uid + '.html')).read_bytes(); path = PREFIX + 'evidence/' + uid + '.html.gz'
            if portraits[uid]['name'].split(' — ')[0].lower() not in html.unescape(re.sub('<[^>]*>', ' ', raw.decode())).lower() and uid not in ('recv-alexia', 'recv-alexia-ashford-third-form'):
                raise ValueError('Identity context heading differs: ' + uid)
            (ROOT / path).write_bytes(gzip.compress(raw, mtime=0))
            contexts[uid] = {'id': uid, 'name': portraits[uid]['name'], 'targetGame': portraits[uid]['game'],
                'sourceUrl': portraits[uid]['sourcePage'], 'httpStatus': 200, 'page': binding(path), 'rawSha256': digest(raw),
                'scope': 'Original-game enemy identity context; no proof of port equivalence or per-clip phase/action.'}
    for filename, url, count in SCREENS:
        raw = (inputs / filename).read_bytes(); text = raw.decode('utf-8')
        found = re.findall(r'<td>Assets</td>\s*<td>(.*?)</td>', text)
        if found != [str(count)] or 'There are currently no assets available for this game on The Sounds Resource.' not in text:
            raise ValueError('A screened empty listing changed')
        relative = PREFIX + 'evidence/screen-' + filename + '.gz'
        (ROOT / relative).write_bytes(gzip.compress(raw, mtime=0))
        screening.append({'url': url, 'httpStatus': 200, 'assetsAdvertised': count, 'snapshot': binding(relative),
                          'rawSha256': digest(raw), 'decision': 'NO_PUBLISHED_AUDIO_ASSET_ON_THIS_LISTING',
                          'scope': 'An empty publication listing does not establish absence of audio in the original game.'})
    request = {'schema': 're.bow.audio-import-request-r31/1', 'sources': sources, 'contexts': list(contexts.values()),
               'screening': screening, 'probes': PREFIX + 'decoded-probes.json', 'canonicalFidelityCertified': False}
    (PACK / 'decoded-probes.json').write_bytes(payload({'schema': 're.bow.published-audio-probes-r31/1', 'entries': probes,
        'scope': 'WAV PCM and actual FFmpeg Vorbis decoding measured without changing delivered source bytes. Decoder PCM hashes do not identify a speaker or action.'}))
    request['probeBinding'] = binding(request['probes'])
    (PACK / 'import-request.json').write_bytes(payload(request))


def checked(record):
    path = (ROOT / record['path']).resolve()
    if not path.is_relative_to(PACK) or not path.is_file():
        raise ValueError('Evidence leaves the R31 audio pack')
    raw = path.read_bytes()
    if len(raw) != record['bytes'] or digest(raw) != record['sha256']:
        raise ValueError('Audio evidence changed: ' + record['path'])
    return raw


def build():
    request_path = PREFIX + 'import-request.json'; request = json.loads((ROOT / request_path).read_text())
    if request.get('schema') != 're.bow.audio-import-request-r31/1' or request.get('canonicalFidelityCertified') is not False:
        raise ValueError('Unsupported audio import request')
    if [source['assetId'] for source in request['sources']] != [row[0] for row in SPECS]:
        raise ValueError('Unexpected publication set')
    probe_raw = checked(request['probeBinding']); probes = json.loads(probe_raw)['entries']
    probe_map = {(row['assetId'], row['archiveMember']): row for row in probes}
    contexts = {row['id']: row for row in request['contexts']}; roster = {row['id']: row for row in json.loads((ROOT / 'data/roster.json').read_text())['catalog']}
    for uid, context in contexts.items():
        if uid not in roster or context['httpStatus'] != 200 or digest(gzip.decompress(checked(context['page']))) != context['rawSha256']:
            raise ValueError('Identity context changed')
    previous = set()
    prior_inputs = []
    for release in range(24, 29):
        name = f'modules/fidelity-r{release}/audio/manifest.json'; data = (ROOT / name).read_bytes()
        previous.update(row['sha256'] for row in json.loads(data)['entries']); prior_inputs.append(binding(name, data))
    entries, sources = [], []
    for source, spec in zip(request['sources'], SPECS):
        asset, slug, title, game, edition, candidates = spec
        if (source['title'], source['game'], source['sourceEdition'], source['candidateIdentityIds']) != (title, game, edition, candidates):
            raise ValueError('Publication attribution differs')
        page = gzip.decompress(checked(source['page'])); text = page.decode('utf-8')
        if digest(page) != source['pageRawSha256'] or f'<h1>{html.escape(title)}</h1>' not in text or source['archiveUrl'].split('sounds.spriters-resource.com', 1)[1] not in html.unescape(text):
            raise ValueError('Source game/group/archive link no longer matches')
        archive_raw = checked(source['archive']); member_records = []
        with ZipFile(io.BytesIO(archive_raw)) as archive:
            for info in inspect_archive(archive):
                if info.is_dir():
                    continue
                raw = archive.read(info); row = probe_map[(asset, info.filename)]
                if checked(row) != raw or row['sha256'] != digest(raw):
                    raise ValueError('A delivered clip differs from its original archive member')
                if '<li>' + html.escape(info.filename, quote=False) + '</li>' not in text:
                    raise ValueError('An audio member is missing from publisher evidence')
                probe = row['probe']
                if info.filename.endswith('.wav') and probe != inspect_wave(raw):
                    raise ValueError('WAV PCM measurement differs from source bytes')
                if info.filename.endswith('.ogg') and (raw[:4] != b'OggS' or probe['codec'] != 'vorbis' or not probe.get('measurementOnly')):
                    raise ValueError('Vorbis measurement lacks preserved source scope')
                if not 0 < probe['durationSeconds'] <= 120:
                    raise ValueError('Audio duration exceeds the player budget')
                entries.append({'clipId': row['clipId'], 'assetId': asset, 'publishedGroup': title,
                    'publishedLabel': PurePosixPath(info.filename).name, 'archiveMember': info.filename,
                    'path': row['path'], 'bytes': row['bytes'], 'sha256': row['sha256'], 'probe': probe,
                    'sourceEdition': edition, 'sourcePage': source['url'], 'candidateIdentityIds': candidates,
                    'identityId': None, 'attributionStatus': 'PUBLISHED_GROUP_ONLY_EDITION_OR_PHASE_UNRESOLVED',
                    'targetEditionEquivalenceVerified': False, 'independentListeningCompleted': False,
                    'action': None, 'phase': None, 'language': None, 'sourceBytesTransformed': False,
                    'nativeGameBankCertified': False, 'canonicalFidelityCertified': False, 'combatAudioAssigned': False,
                    'publishedFilePresentInEarlierReleases': row['sha256'] in previous})
                member_records.append({'member': info.filename, 'bytes': len(raw), 'sha256': digest(raw)})
        sources.append({**source, 'audioFiles': len(member_records), 'members': member_records})
    if len(entries) != len(probes) or len({row['clipId'] for row in entries}) != len(entries):
        raise ValueError('Missing or duplicate audio probe/member')
    for screen in request['screening']:
        if screen['httpStatus'] != 200 or screen['assetsAdvertised'] != 0 or digest(gzip.decompress(checked(screen['snapshot']))) != screen['rawSha256']:
            raise ValueError('Screening evidence differs')
    counts = {'sourceArchives': len(sources), 'publishedAudioFiles': len(entries),
        'distinctPublishedFilesBySha256': len({row['sha256'] for row in entries}),
        'distinctDecodedPcmMeasurements': len({row['probe']['decodedPcmSha256'] for row in entries}),
        'newPublishedFileHashesVsR24R28': len({row['sha256'] for row in entries} - previous),
        'nonzeroAudioFiles': sum(row['probe']['nonzeroSamples'] for row in entries),
        'candidateCatalogueIdentities': len(contexts), 'exactTargetEditionAttributedFiles': 0,
        'independentlyListenedFiles': 0, 'actionAssignedFiles': 0, 'combatAssignedFiles': 0,
        'screenedEmptyPublicationListings': len(request['screening'])}
    return {'schema': 're.bow.audio-candidate-library-r31/1', 'release': 'R31', 'taskIds': ['G-AUDIO'],
        'inputs': [binding(request_path), request['probeBinding'], *prior_inputs], 'counts': counts,
        'sources': sources, 'identities': list(contexts.values()), 'screening': request['screening'], 'entries': entries,
        'canonicalFidelityCertified': False,
        'scope': 'Exact published OGG/WAV and ZIP bytes for four named groups. PC2007/CVXPS2 remain source editions; no speaker-form/action/phase or original target-edition equivalence is invented.',
        'limitations': ['The publication supplies audio files, not independently certified untouched Capcom banks.',
            'Shared Dr.Salvador/Bella files and Alexia/Steve form assignments need independent listening and original-game sequence proof.',
            'Alexander Ashford is linked to Nosferatu by enemy context; individual files/actions and Dreamcast equivalence remain unverified.',
            'File and decoded PCM hash uniqueness measure bytes, not independent semantic sounds.',
            'User listening notes remain user-reported evidence and never auto-assign combat audio.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepare', metavar='OBSERVED_HTTP_CACHE')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if args.prepare:
        prepare(args.prepare)
    result = build(); raw = payload(result); target = PACK / 'manifest.json'
    if args.check:
        if target.read_bytes() != raw:
            raise ValueError('R31 audio manifest is not reproducible from preserved publications')
    else:
        target.write_bytes(raw)
    print(json.dumps(result['counts']))


if __name__ == '__main__':
    main()
