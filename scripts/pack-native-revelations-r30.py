#!/usr/bin/env python3
"""Losslessly pack native PNGs for bounded smooth playback and create review contacts."""
import hashlib
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r30/native/revelations'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def record(path):
    raw = path.read_bytes()
    with Image.open(path) as im:
        width, height = im.size
    return {'path': path.relative_to(ROOT).as_posix(), 'width': width,
            'height': height, 'bytes': len(raw), 'sha256': sha(raw)}


def main():
    manifest = json.loads((PACK / 'manifest.json').read_text())
    for entry in manifest['entries']:
        folder = PACK / 'atlases' / entry['id']
        folder.mkdir(parents=True, exist_ok=True)
        for offset in range(0, len(entry['frames']), 25):
            frames = entry['frames'][offset:offset + 25]
            atlas = Image.new('RGBA', (384 * 5, 384 * math.ceil(len(frames) / 5)))
            for index, frame in enumerate(frames):
                raw = (ROOT / frame['path']).read_bytes()
                if sha(raw) != frame['sha256']:
                    raise ValueError('Native frame changed before packing: ' + frame['path'])
                with Image.open(ROOT / frame['path']) as im:
                    if im.size != (384, 384) or im.mode != 'RGBA':
                        raise ValueError('Expected native RGBA384 cell')
                    # No resampling, alpha composition, transformations or colour conversion.
                    atlas.paste(im, ((index % 5) * 384, (index // 5) * 384))
            target = folder / ('atlas-' + str(offset // 25).zfill(2) + '.png')
            atlas.save(target, compress_level=9)
            proof = record(target)
            for index, frame in enumerate(frames):
                frame['atlas'] = proof
                frame['rect'] = {'x': (index % 5) * 384, 'y': (index // 5) * 384,
                                 'width': 384, 'height': 384}
        print('PACKED', entry['id'], len(entry['frames']), 'frames')
    review = PACK / 'review'
    review.mkdir(exist_ok=True)
    contacts = []
    for subject in sorted({entry['subjectId'] for entry in manifest['entries']}):
        entries = sorted((e for e in manifest['entries'] if e['subjectId'] == subject), key=lambda e: e['sourceFacing'])
        sampled = [round(i * (entries[0]['frameCount'] - 1) / 8) for i in range(9)]
        # Each row shows the same source time from actual opposing cameras.
        sheet = Image.new('RGB', (384 * 4, 418 * 5), (25, 30, 34))
        draw = ImageDraw.Draw(sheet)
        sample_records = []
        for row, index in enumerate(sampled + ['endpoint']):
            for column, entry in enumerate(entries):
                frame = entry['endpoint'] if index == 'endpoint' else entry['frames'][index]
                im = Image.open(ROOT / frame['path']).convert('RGBA')
                x = (row % 2) * 768 + column * 384
                y = (row // 2) * 418
                sheet.paste(im, (x, y + 34), im)
                draw.text((x + 5, y + 3), subject + ' ' + entry['sourceFacing'], fill='white')
                draw.text((x + 5, y + 18), str(index) + ' t=' + format(frame['seconds'], '.6f'), fill='white')
                sample_records.append({'entryId': entry['id'], 'index': index,
                                       'image': {'path': frame['path'], 'sha256': frame['sha256']}})
        target = review / (subject + '-side-contact.png')
        sheet.save(target, compress_level=9)
        contacts.append({'subjectId': subject, 'contact': record(target), 'samples': sample_records})
    index = {'schema': 're.bow.native-revelations-contact-index-r30/1',
             'scope': 'Review contacts only. Native source PNGs remain unmodified; every atlas cell is an exact RGBA copy.',
             'contacts': contacts}
    (review / 'contacts.json').write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n')
    manifest['atlasRecipe'] = {'kind': 'lossless-rgba-packing', 'maximumAtlasSize': 1920,
                               'cellSize': 384, 'columns': 5, 'maximumFramesPerAtlas': 25,
                               'nativePngsRewritten': False, 'rgbaPixelsChanged': False,
                               'script': {'path': Path(__file__).relative_to(ROOT).as_posix(),
                                          'sha256': sha(Path(__file__).read_bytes())}}
    manifest['counts']['atlases'] = len({frame['atlas']['path'] for entry in manifest['entries'] for frame in entry['frames']})
    (PACK / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(manifest['counts']))


if __name__ == '__main__':
    main()
