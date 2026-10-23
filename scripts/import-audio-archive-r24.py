#!/usr/bin/env python3
"""Inspect a ZIP safely and preserve labelled documentary audio candidates.

An author's soundboard labels establish a publication, not an exact character
voice assignment. This tool never promotes a candidate into certified game audio.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path, PurePosixPath
import re
import stat
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('native_audio_r23', ROOT / 'scripts/collect-native-audio-r23.py')
audio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audio)
MAX_ARCHIVE = 64 * 1024 * 1024
MAX_MEMBER = 32 * 1024 * 1024
MAX_TOTAL = 128 * 1024 * 1024
MAX_MEMBERS = 1200


def digest(data):
    return hashlib.sha256(data).hexdigest()


def inspect_archive(path, expected_hash):
    if path.stat().st_size > MAX_ARCHIVE:
        raise ValueError('Archive exceeds the compressed size limit')
    if digest(path.read_bytes()) != expected_hash:
        raise ValueError('Archive SHA-256 mismatch')
    names, rows, total = set(), [], 0
    with zipfile.ZipFile(path) as archive:
        if len(archive.infolist()) > MAX_MEMBERS:
            raise ValueError('Too many ZIP members')
        for item in archive.infolist():
            name = item.filename
            normalized = PurePosixPath(name)
            if not name or len(name) > 1024 or '\\' in name or ':' in name or '\x00' in name or normalized.is_absolute() or '..' in normalized.parts:
                raise ValueError('Unsafe ZIP member path')
            key = str(normalized).casefold()
            if key in names:
                raise ValueError('Duplicate or case-colliding ZIP member')
            names.add(key)
            mode = item.external_attr >> 16
            if stat.S_ISLNK(mode) or item.flag_bits & 1:
                raise ValueError('Symlink or encrypted ZIP member')
            if item.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
                raise ValueError('Unsupported ZIP compression')
            total += item.file_size
            if item.file_size > MAX_MEMBER or total > MAX_TOTAL or item.file_size > max(1, item.compress_size) * 250:
                raise ValueError('ZIP size or compression ratio exceeds safe bounds')
            rows.append({'path': name, 'bytes': item.file_size, 'compressed_bytes': item.compress_size, 'directory': item.is_dir()})
    return {'sha256': expected_hash, 'bytes': path.stat().st_size, 'member_count': len(rows), 'uncompressed_bytes': total, 'members': rows}


def read_member(archive, name, limit):
    info = archive.getinfo(name)
    if info.is_dir() or info.file_size > limit:
        raise ValueError('Member exceeds import size limit')
    with archive.open(info) as stream:
        data = stream.read(limit + 1)
    if len(data) != info.file_size or len(data) > limit:
        raise ValueError('Incomplete or oversized ZIP member')
    return data


def import_candidates(request, archive_path, destination, commit_metadata=None):
    if request['schema'] != 're.bow.audio-archive-request/1':
        raise ValueError('Unexpected request schema')
    source = request['source']
    for key in ('archive_url', 'page_url'):
        parsed = urlparse(source[key])
        if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
            raise ValueError('Public HTTPS source URLs are required')
    for key in ('game', 'family', 'publication_commit', 'language', 'limitations'):
        if not source.get(key):
            raise ValueError('Missing source scope: ' + key)
    if not re.fullmatch('[a-f0-9]{40}', source['publication_commit']):
        raise ValueError('Pin the public source publication to a commit')
    audited = inspect_archive(archive_path, source['archive_sha256'])
    remote_files = {}
    if commit_metadata is not None:
        response = json.loads(commit_metadata.read_text())
        if response['sha'] != source['publication_commit']:
            raise ValueError('Commit metadata does not match the pinned publication')
        response_hash = digest(commit_metadata.read_bytes())
        if source.get('commit_metadata_response_sha256') != response_hash:
            raise ValueError('Commit metadata SHA-256 mismatch')
        remote_files = {item['filename']: item['sha'] for item in response['files']}
    prefix = request['audio_prefix']
    if not prefix.endswith('/') or prefix.startswith('/') or '..' in PurePosixPath(prefix).parts:
        raise ValueError('Invalid audio prefix')
    entries = []
    with zipfile.ZipFile(archive_path) as archive:
        xml = read_member(archive, request['labels_member'], 256 * 1024)
        if b'<!DOCTYPE' in xml.upper() or b'<!ENTITY' in xml.upper():
            raise ValueError('XML declarations with external entities are refused')
        labels = {row.attrib['name']: ''.join(row.itertext()).strip() for row in ET.fromstring(xml).findall('string') if row.attrib.get('name')}
        candidates = [row['path'] for row in audited['members'] if row['path'].startswith(prefix) and row['path'].lower().endswith('.mp3') and not row['directory']]
        for member in sorted(candidates):
            clip_id = PurePosixPath(member).stem
            if not re.fullmatch('[a-z0-9_]+', clip_id):
                raise ValueError('Unsupported clip identifier')
            if clip_id not in labels or clip_id.startswith('_'):
                continue
            body = read_member(archive, member, MAX_MEMBER)
            git_blob = hashlib.sha1(b'blob ' + str(len(body)).encode() + b'\0' + body).hexdigest()
            repository_path = member.split('/', 1)[1]
            if commit_metadata is not None and remote_files.get(repository_path) != git_blob:
                raise ValueError('Audio bytes do not match the pinned Git blob')
            with tempfile.TemporaryDirectory() as temporary:
                sample = Path(temporary) / (clip_id + '.mp3')
                sample.write_bytes(body)
                probe = audio.inspect_audio(sample)
            relative = 'clips/' + clip_id + '.mp3'
            target = destination / relative
            if target.exists() and target.read_bytes() != body:
                raise ValueError('Refusing to overwrite different source audio')
            target.parent.mkdir(parents=True, exist_ok=True)
            if not target.exists():
                target.write_bytes(body)
            entries.append({'clip_id': clip_id, 'published_label': labels[clip_id], 'path': relative,
                            'bytes': len(body), 'sha256': digest(body), 'archive_member': member,
                            'git_blob_sha1': git_blob, 'git_blob_verified_against_commit': commit_metadata is not None,
                            'language_as_published': source['language'], 'probe': probe,
                            'identity_id': None, 'assignment_status': 'FAMILY_REFERENCE_ONLY',
                            'independent_listening_completed': False, 'source_bytes_transformed': False,
                            'canonical_fidelity_certified': False, 'combat_audio_final': False})
    evidence = destination / 'evidence'
    evidence.mkdir(parents=True, exist_ok=True)
    (evidence / 'strings.xml').write_bytes(xml)
    if commit_metadata is not None:
        proof = {'schema': 're.bow.audio-git-object-proof/1', 'commit': response['sha'],
                 'committed_at': response['commit']['committer']['date'], 'api_response_sha256': response_hash,
                 'files': [{'path': 'res/raw/' + row['clip_id'] + '.mp3', 'git_blob_sha1': row['git_blob_sha1'],
                            'source_file_sha256': row['sha256']} for row in entries]}
        (evidence / 'commit-proof.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
    return {'schema': 're.bow.audio-documentary-candidates/1', 'source': source,
            'archive_audit': {key: value for key, value in audited.items() if key != 'members'},
            'labels_member': request['labels_member'], 'labels_sha256': digest(xml),
            'counts': {'documentary_clips': len(entries), 'independently_listened_clips': 0,
                       'exact_identity_assignments': 0, 'certified_native_clips': 0, 'final_combat_audio': 0},
            'entries': entries}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--request', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--commit-metadata', type=Path)
    args = parser.parse_args()
    request = json.loads(args.request.read_text())
    result = import_candidates(request, args.archive, args.output.parent, args.commit_metadata)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'output': str(args.output), **result['counts']}))


if __name__ == '__main__':
    main()
