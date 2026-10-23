#!/usr/bin/env python3
"""Preserve untimed source frames for manual inspection, without inventing a cadence."""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import io
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('source_motion_r22', ROOT / 'scripts/extract-source-motion-r22.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)


def extract_manual(source_path, output, source_url, expected_sha256, *, sequence_id,
                   subject_id, game, label, source_page_url, max_frames_per_atlas=24):
    source_path, output = Path(source_path), Path(output).absolute()
    if source_path.is_symlink() or not source_path.is_file() or source_path.stat().st_size > base.MAX_SOURCE_BYTES:
        raise ValueError('Expected a bounded regular source file')
    native = source_path.read_bytes()
    if base.sha(native) != expected_sha256 or len(expected_sha256) != 64:
        raise ValueError('Source SHA-256 mismatch')
    for value in (source_url, source_page_url):
        base.https_source(value)
    for value in (sequence_id, subject_id):
        base.safe_id(value)
    if not all(isinstance(value, str) and value.strip() for value in (game, label)):
        raise ValueError('Expected an exact source game and label')
    if type(max_frames_per_atlas) is not int or not 1 <= max_frames_per_atlas <= 24:
        raise ValueError('Expected at most 24 frames per atlas')
    for parent in (output, *output.parents):
        if parent.is_symlink():
            raise ValueError('Symlinked output is forbidden')
    files, atlases, frames = [], [], []
    with Image.open(io.BytesIO(native)) as original:
        if original.format not in {'GIF', 'WEBP'} or not 2 <= original.n_frames <= base.MAX_SOURCE_FRAMES:
            raise ValueError('Expected a multi-frame GIF or WebP')
        source_format, width, height = original.format, original.width, original.height
        if width <= 0 or height <= 0 or width > 4096 or height > 4096:
            raise ValueError('Native dimensions exceed the atlas limit')
        columns = min(4, 4096 // width)
        rows = min(4096 // height, 2_800_000 // (columns * width * height))
        if rows < 1:
            raise ValueError('Native frame exceeds the bounded atlas pixel budget')
        capacity = min(max_frames_per_atlas, columns * rows)
        for index in range(original.n_frames):
            original.seek(index)
            if original.info.get('duration', 0) != 0:
                raise ValueError('This manual-only exporter accepts sources with no defined frame delays')
        for start in range(0, original.n_frames, capacity):
            count = min(capacity, original.n_frames - start)
            chosen_columns = min(columns, count)
            canvas = Image.new('RGBA', (chosen_columns * width, ((count + chosen_columns - 1) // chosen_columns) * height))
            batch = []
            for offset in range(count):
                original.seek(start + offset)
                rgba = original.convert('RGBA')
                x, y = offset % chosen_columns * width, offset // chosen_columns * height
                canvas.paste(rgba, (x, y))
                batch.append({'sourceFrame': start + offset, 'atlas': len(atlases),
                              'crop': [x, y, width, height], 'durationMs': 0,
                              'rgbaSha256': base.sha(rgba.tobytes())})
            stream = io.BytesIO()
            canvas.save(stream, format='PNG')
            encoded = stream.getvalue()
            with Image.open(io.BytesIO(encoded)) as check:
                check.load()
                for frame in batch:
                    x, y, w, h = frame['crop']
                    if base.sha(check.crop((x, y, x + w, y + h)).tobytes()) != frame['rgbaSha256']:
                        raise ValueError('Atlas changed a composited source pixel')
            name = f'atlas-{len(atlases):02d}.png'
            atlases.append({'path': name, 'width': canvas.width, 'height': canvas.height,
                            'sha256': base.sha(encoded), 'rgbaSha256': base.sha(canvas.tobytes()),
                            'frameCount': count})
            files.append((name, encoded))
            frames.extend(batch)
    original_name = 'original.' + source_format.lower()
    manifest = {'schema': 're.bow.source-motion/1', 'id': sequence_id, 'subjectId': subject_id,
                'game': game, 'label': label,
                'description': 'Scène documentaire complète : caméra et décor conservés. Images sources dans leur ordre, sans cadence inventée.',
                'silent': True, 'width': width, 'height': height, 'frameCount': len(frames),
                'count': len(frames), 'totalDurationMs': 0, 'timingDefined': False,
                'playbackMode': 'manual-only',
                'source': {'url': source_url, 'sourcePageUrl': source_page_url,
                           'path': original_name, 'sha256': expected_sha256,
                           'bytes': len(native), 'format': source_format},
                'atlases': atlases, 'frames': frames, 'availableStates': ['source-sequence'],
                'pixelIdentityVerified': True, 'sourceDurationsPreserved': True,
                'nativeGameGeometryCertified': False, 'canonicalFidelityCertified': False,
                'combatIntegrated': False, 'modularRig': False, 'generatedFrames': 0,
                'limitations': ['Tous les délais du GIF publié sont nuls ; aucune durée ou cadence du jeu ne peut être certifiée.',
                                'Navigation manuelle uniquement ; aucun temps de lecture arbitraire.',
                                'Scène publiée par une source secondaire, sans certification de sa version de plateforme.',
                                'Pas de sprite détouré, de rig, de vue opposée, de voix ou de clip de combat final.']}
    files += [(original_name, native), ('manifest.json', (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode())]
    for name, payload in files:
        path = output / name
        if path.exists() and (path.is_symlink() or path.read_bytes() != payload):
            raise ValueError('Refusing to replace different output: ' + str(path))
    for name, payload in files:
        base.write_preserving(output / name, payload)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('input', 'output', 'source-url', 'expected-sha256', 'id', 'subject-id', 'game', 'label', 'source-page-url'):
        parser.add_argument('--' + name, required=True)
    args = parser.parse_args()
    manifest = extract_manual(args.input, args.output, args.source_url, args.expected_sha256,
                              sequence_id=args.id, subject_id=args.subject_id, game=args.game,
                              label=args.label, source_page_url=args.source_page_url)
    print(json.dumps({'manifest': str(Path(args.output) / 'manifest.json'),
                      'frames': manifest['frameCount'], 'timingDefined': False,
                      'playbackMode': 'manual-only', 'pixelIdentityVerified': True}))


if __name__ == '__main__':
    main()
