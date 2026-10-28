#!/usr/bin/env python3
"""Pack original rendered RGBA cells losslessly and make separate observation contacts."""
import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r31/motion'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def record(path):
    raw = path.read_bytes()
    with Image.open(path) as im:
        width, height = im.size
    return {'path': path.relative_to(ROOT).as_posix(), 'width': width, 'height': height,
            'bytes': len(raw), 'sha256': sha(raw)}


def pack(check=False, follow=False):
    manifest_name = 'root-follow-manifest.json' if follow else 'manifest.json'
    manifest = json.loads((PACK / manifest_name).read_text())
    for entry in manifest['entries']:
        folder = PACK / ('root-follow-atlases' if follow else 'atlases') / entry['id']
        if not check:
            folder.mkdir(parents=True, exist_ok=True)
        for offset in range(0, len(entry['frames']), 25):
            frames = entry['frames'][offset:offset + 25]
            atlas = Image.new('RGBA', (384 * 5, 384 * math.ceil(len(frames) / 5)))
            for index, frame in enumerate(frames):
                raw = (ROOT / frame['path']).read_bytes()
                if sha(raw) != frame['sha256']:
                    raise ValueError('Native source frame changed')
                with Image.open(ROOT / frame['path']) as im:
                    if im.size != (384, 384) or im.mode != 'RGBA':
                        raise ValueError('Expected original source-rendered RGBA384 frame')
                    atlas.paste(im, ((index % 5) * 384, (index // 5) * 384))
            target = folder / ('atlas-' + str(offset // 25).zfill(2) + '.png')
            if check:
                with Image.open(target) as delivered:
                    if delivered.size != atlas.size or delivered.tobytes() != atlas.tobytes():
                        raise ValueError('Native atlas differs from exact source-frame RGBA')
            else:
                atlas.save(target, compress_level=9)
            proof = record(target)
            for index, frame in enumerate(frames):
                rectangle = {'x': (index % 5) * 384, 'y': (index // 5) * 384, 'width': 384, 'height': 384}
                if check:
                    if frame.get('atlas') != proof or frame.get('rect') != rectangle:
                        raise ValueError('Native atlas metadata changed')
                else:
                    frame.update(atlas=proof, rect=rectangle)
    if check:
        return manifest['counts']
    review = PACK / ('root-follow-review' if follow else 'review')
    review.mkdir(exist_ok=True)
    contacts = []
    keys = sorted({row['subjectId'] + '--' + row['clipId'] for row in manifest['entries']})
    for key in keys:
        entries = sorted((row for row in manifest['entries'] if row['subjectId'] + '--' + row['clipId'] == key), key=lambda row: row['sourceFacing'])
        if len(entries) != 2:
            raise ValueError('Every review contact needs both actual source-camera sides')
        sampled = [round(i * (entries[0]['frameCount'] - 1) / 8) for i in range(9)]
        sheet = Image.new('RGB', (384 * 4, 418 * 5), (25, 30, 34))
        draw = ImageDraw.Draw(sheet)
        samples = []
        for row, index in enumerate(sampled + ['endpoint']):
            for column, entry in enumerate(entries):
                frame = entry['endpoint'] if index == 'endpoint' else entry['frames'][index]
                with Image.open(ROOT / frame['path']) as im:
                    x = (row % 2) * 768 + column * 384
                    y = (row // 2) * 418
                    sheet.paste(im, (x, y + 34), im)
                draw.text((x + 5, y + 3), entry['subjectId'] + ' ' + entry['sourceFacing'], fill='white')
                draw.text((x + 5, y + 18), str(index) + ' t=' + format(frame['seconds'], '.6f'), fill='white')
                samples.append({'entryId': entry['id'], 'index': index, 'path': frame['path'], 'sha256': frame['sha256']})
        target = review / (key + '-contact.png')
        sheet.save(target, compress_level=9)
        contacts.append({'subjectId': entries[0]['subjectId'], 'clipId': entries[0]['clipId'],
                         'contact': record(target), 'samples': samples})
    (review / 'contacts.json').write_text(json.dumps({'schema': 're.bow.motion-contacts-r31/1', 'contacts': contacts,
        'scope': 'QA contacts only; all production PNGs and exact RGBA atlas cells remain unchanged.'}, indent=2) + '\n')
    manifest['atlasRecipe'] = {'kind': 'lossless-rgba-packing', 'cellSize': 384, 'columns': 5,
        'maximumAtlasSize': 1920, 'maximumFramesPerAtlas': 25, 'nativePngsRewritten': False,
        'rgbaPixelsChanged': False, 'script': {'path': Path(__file__).relative_to(ROOT).as_posix(),
                                             'sha256': sha(Path(__file__).read_bytes())}}
    manifest['counts']['atlases'] = len({frame['atlas']['path'] for row in manifest['entries'] for frame in row['frames']})
    (PACK / manifest_name).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    return manifest['counts']


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--root-follow', action='store_true')
    args = parser.parse_args()
    print(json.dumps(pack(args.check, args.root_follow)))
