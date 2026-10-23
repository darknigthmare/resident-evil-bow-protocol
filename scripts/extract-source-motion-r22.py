#!/usr/bin/env python3
"""Pack native animated source frames into bounded, lossless reference atlases.

No interpolation, background removal, mirroring, rigging or gameplay animation
is authored. Every composited frame and original duration is retained.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

from PIL import Image

MAX_SOURCE_BYTES = 100 * 1024 * 1024
MAX_SOURCE_FRAMES = 1200
MAX_ATLAS_PIXELS = 8_000_000
MAX_ATLAS_DIMENSION = 4096


def sha(data):
    return hashlib.sha256(data).hexdigest()


def https_source(value):
    parsed = urlsplit(value)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError('Source links must be credential-free HTTPS URLs')
    return value


def safe_id(value):
    if not isinstance(value, str) or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', value):
        raise ValueError('Invalid source sequence or subject ID')
    return value


def write_preserving(destination, payload):
    if destination.exists():
        if destination.is_symlink() or destination.read_bytes() != payload:
            raise ValueError('Refusing to overwrite different output: ' + str(destination))
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open('xb') as stream:
        stream.write(payload)


def extract_motion(source_path, output, source_url, expected_sha256, *,
                   sequence_id='source-motion', subject_id='source-subject',
                   game='Source game not specified', label='Source sequence',
                   source_page_url=None, columns=4, max_frames_per_atlas=32,
                   description='Original published source sequence; full scene, no combat sprite reconstruction.'):
    source_path, output = Path(source_path), Path(output).absolute()
    if source_path.is_symlink() or not source_path.is_file():
        raise ValueError('Expected a regular, non-symlink source file')
    if source_path.stat().st_size > MAX_SOURCE_BYTES:
        raise ValueError('Source exceeds the byte limit')
    native = source_path.read_bytes()
    if not re.fullmatch(r'[0-9a-f]{64}', expected_sha256) or sha(native) != expected_sha256:
        raise ValueError('Source bytes do not match the expected SHA-256')
    https_source(source_url)
    if source_page_url:
        https_source(source_page_url)
    safe_id(sequence_id)
    safe_id(subject_id)
    if not all(isinstance(value, str) and value.strip() for value in [game, label, description]):
        raise ValueError('Game, label and scope description must be nonempty')
    if type(columns) is not int or not 1 <= columns <= 32:
        raise ValueError('Atlas columns must be between 1 and 32')
    if type(max_frames_per_atlas) is not int or not 1 <= max_frames_per_atlas <= 32:
        raise ValueError('Each atlas must contain at most 32 source frames')
    for parent in [output, *output.parents]:
        if parent.is_symlink():
            raise ValueError('Symlinked output directories are not accepted')

    files, atlases, frames = [], [], []
    with Image.open(io.BytesIO(native)) as original:
        if original.format not in {'GIF', 'WEBP'} or not getattr(original, 'is_animated', False):
            raise ValueError('Expected an animated native GIF or WebP source')
        source_format = original.format
        count, width, height = original.n_frames, original.width, original.height
        if not 2 <= count <= MAX_SOURCE_FRAMES:
            raise ValueError('Unsupported source frame count')
        if width <= 0 or height <= 0 or width * height > MAX_ATLAS_PIXELS:
            raise ValueError('A native frame exceeds the atlas pixel budget; resizing is forbidden')
        chosen_columns = min(columns, MAX_ATLAS_DIMENSION // width)
        while chosen_columns > 0:
            rows_limit = min(MAX_ATLAS_DIMENSION // height,
                             MAX_ATLAS_PIXELS // (chosen_columns * width * height))
            if rows_limit:
                break
            chosen_columns -= 1
        if chosen_columns < 1:
            raise ValueError('A native frame cannot fit without resizing')
        capacity = min(max_frames_per_atlas, chosen_columns * rows_limit)
        source_loop_count = original.info.get('loop')
        for start in range(0, count, capacity):
            batch_count = min(capacity, count - start)
            atlas_columns = min(chosen_columns, batch_count)
            atlas_rows = (batch_count + atlas_columns - 1) // atlas_columns
            canvas = Image.new('RGBA', (atlas_columns * width, atlas_rows * height), (0, 0, 0, 0))
            atlas_index, batch_records = len(atlases), []
            for offset in range(batch_count):
                index = start + offset
                original.seek(index)
                duration = original.info.get('duration')
                if type(duration) is not int or duration < 0:
                    raise ValueError('Source frame has no exact, nonnegative millisecond duration: ' + str(index))
                # Pillow composites palette/disposal updates onto the native canvas.
                rgba = original.convert('RGBA')
                rgba.load()
                if rgba.size != (width, height):
                    raise ValueError('Source decoder changed the canvas dimensions')
                x, y = (offset % atlas_columns) * width, (offset // atlas_columns) * height
                canvas.paste(rgba, (x, y))
                record = {'sourceFrame': index, 'atlas': atlas_index, 'crop': [x, y, width, height],
                          'durationMs': duration, 'rgbaSha256': sha(rgba.tobytes())}
                batch_records.append(record)
                rgba.close()
            encoded = io.BytesIO()
            canvas.save(encoded, format='PNG')
            data = encoded.getvalue()
            with Image.open(io.BytesIO(data)) as verified:
                verified.load()
                if verified.size != canvas.size or verified.mode != 'RGBA':
                    raise ValueError('Encoded atlas changed native pixels or dimensions')
                for frame in batch_records:
                    x, y, w, h = frame['crop']
                    if sha(verified.crop((x, y, x + w, y + h)).tobytes()) != frame['rgbaSha256']:
                        raise ValueError('Atlas crop differs from its composited native source frame')
            filename = 'atlas-' + str(atlas_index).zfill(2) + '.png'
            atlases.append({'path': filename, 'width': canvas.width, 'height': canvas.height,
                            'sha256': sha(data), 'rgbaSha256': sha(canvas.tobytes()), 'frameCount': batch_count})
            files.append((filename, data))
            frames.extend(batch_records)
            canvas.close()
    total_duration = sum(frame['durationMs'] for frame in frames)
    if total_duration <= 0:
        raise ValueError('A zero-duration sequence has no defined playback interval')
    original_name = 'original.' + ('gif' if source_format == 'GIF' else 'webp')
    source_record = {'url': source_url, 'path': original_name, 'sha256': expected_sha256,
                     'bytes': len(native), 'format': source_format, 'loopCount': source_loop_count}
    if source_page_url:
        source_record['sourcePageUrl'] = source_page_url
    manifest = {
        'schema': 're.bow.source-motion/1', 'id': sequence_id, 'subjectId': subject_id,
        'game': game, 'label': label, 'description': description, 'silent': True,
        'width': width, 'height': height, 'frameCount': len(frames), 'count': len(frames),
        'totalDurationMs': total_duration, 'source': source_record,
        'atlases': atlases, 'frames': frames, 'availableStates': ['source-sequence'],
        'pixelIdentityVerified': True, 'sourceDurationsPreserved': True,
        'nativeGameGeometryCertified': False, 'canonicalFidelityCertified': False,
        'combatIntegrated': False, 'modularRig': False, 'generatedFrames': 0,
        'limitations': 'Published source footage with its original camera/background; no independent fighter views, rig, audio or original gameplay timing is certified.'
    }
    files.extend([(original_name, native), ('manifest.json', (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode())])
    for name, payload in files:
        destination = output / name
        if destination.exists() and (destination.is_symlink() or destination.read_bytes() != payload):
            raise ValueError('Refusing to overwrite different output: ' + str(destination))
    for name, payload in files:
        write_preserving(output / name, payload)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--source-url', required=True)
    parser.add_argument('--source-page-url')
    parser.add_argument('--expected-sha256', required=True)
    parser.add_argument('--id', default='source-motion')
    parser.add_argument('--subject-id', default='source-subject')
    parser.add_argument('--game', default='Source game not specified')
    parser.add_argument('--label', default='Source sequence')
    parser.add_argument('--description', default='Original published source sequence; full scene, no combat sprite reconstruction.')
    parser.add_argument('--columns', type=int, default=4)
    parser.add_argument('--max-frames-per-atlas', type=int, default=32)
    args = parser.parse_args()
    try:
        manifest = extract_motion(args.input, args.output, args.source_url, args.expected_sha256,
                                  sequence_id=args.id, subject_id=args.subject_id, game=args.game,
                                  label=args.label, description=args.description,
                                  source_page_url=args.source_page_url, columns=args.columns,
                                  max_frames_per_atlas=args.max_frames_per_atlas)
    except (OSError, ValueError, Image.DecompressionBombError) as error:
        parser.exit(1, 'Native source extraction refused: ' + str(error) + '\n')
    print(json.dumps({'manifest': str(args.output / 'manifest.json'), 'frameCount': manifest['frameCount'],
                      'atlases': len(manifest['atlases']), 'durationMs': manifest['totalDurationMs'],
                      'pixelIdentityVerified': True}, ensure_ascii=False))


if __name__ == '__main__':
    main()
