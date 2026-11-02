#!/usr/bin/env python3
"""Losslessly pack newly rendered native RGBA cells and prepare review contacts."""
import argparse
import hashlib
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r33/native'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def record(path):
    raw = path.read_bytes()
    with Image.open(path) as image:
        width, height = image.size
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': sha(raw),
            'width': width, 'height': height}


def source_frame(frame):
    path = ROOT / frame['path']
    if sha(path.read_bytes()) != frame['sha256']:
        raise ValueError('Original source-rendered PNG changed')
    image = Image.open(path)
    if image.mode != 'RGBA' or image.size != (frame['width'], frame['height']):
        raise ValueError('Native frame mode or extent changed')
    return image


def save_or_compare(image, target, check):
    if check:
        with Image.open(target) as current:
            if current.size != image.size or current.mode != image.mode or current.tobytes() != image.tobytes():
                raise ValueError('Lossless native atlas/contact reproduction differs: ' + str(target))
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, compress_level=9)


def pack(check=False):
    manifest_path = PACK / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    sequences = [entry for entry in manifest['entries'] if entry['kind'] == 'native-sequence' and not entry.get('reusedPublishedFrames')]
    for entry in sequences:
        folder = PACK / 'atlases' / entry['id']
        for offset in range(0, len(entry['frames']), 25):
            frames = entry['frames'][offset:offset + 25]
            atlas = Image.new('RGBA', (384 * 5, 384 * math.ceil(len(frames) / 5)))
            for index, frame in enumerate(frames):
                with source_frame(frame) as image:
                    atlas.paste(image, ((index % 5) * 384, (index // 5) * 384))
            target = folder / ('atlas-' + str(offset // 25).zfill(2) + '.png')
            save_or_compare(atlas, target, check)
            proof = record(target)
            for index, frame in enumerate(frames):
                rect = {'x': (index % 5) * 384, 'y': (index // 5) * 384, 'width': 384, 'height': 384}
                if check:
                    if frame.get('atlas') != proof or frame.get('rect') != rect:
                        raise ValueError('Native atlas cell metadata differs')
                else:
                    frame.update(atlas=proof, rect=rect)
    contacts = []
    groups = sorted({entry['subjectId'] + '--' + entry['clipId'] for entry in sequences})
    for group in groups:
        entries = sorted((entry for entry in sequences if entry['subjectId'] + '--' + entry['clipId'] == group), key=lambda entry: entry['sourceFacing'])
        if len(entries) != 2:
            raise ValueError('Every new native scene must retain both actual source-camera sides')
        sampled = [round(index * (entries[0]['frameCount'] - 1) / 8) for index in range(9)]
        sheet = Image.new('RGB', (1536, 2090), (25, 30, 34))
        draw = ImageDraw.Draw(sheet)
        samples = []
        for row, index in enumerate(sampled + ['endpoint']):
            for col, entry in enumerate(entries):
                frame = entry['endpoint'] if index == 'endpoint' else entry['frames'][index]
                x, y = (row % 2) * 768 + col * 384, (row // 2) * 418
                with source_frame(frame) as image:
                    sheet.paste(image, (x, y + 34), image)
                draw.text((x + 5, y + 3), entry['subjectId'] + ' ' + entry['sourceFacing'], fill='white')
                draw.text((x + 5, y + 18), str(index) + ' t=' + format(frame['seconds'], '.6f'), fill='white')
                samples.append({'entryId': entry['id'], 'index': index, 'path': frame['path'], 'sha256': frame['sha256']})
        target = PACK / 'review' / (group + '-contact.png')
        save_or_compare(sheet, target, check)
        contacts.append({'subjectId': entries[0]['subjectId'], 'clipId': entries[0]['clipId'], 'contact': record(target), 'samples': samples})
    poses = [entry for entry in manifest['entries'] if entry['kind'] == 'native-static-pose']
    for model in sorted({entry['modelId'] for entry in poses}):
        entries = sorted((entry for entry in poses if entry['modelId'] == model), key=lambda entry: entry['recipe']['cameraAngle'])
        if len(entries) != 4:
            raise ValueError('Every static source body requires four independent cameras')
        sheet = Image.new('RGB', (1024, 1088), (25, 30, 34))
        draw = ImageDraw.Draw(sheet)
        for index, entry in enumerate(entries):
            x, y = (index % 2) * 512, (index // 2) * 544
            with source_frame(entry['frames'][0]) as image:
                sheet.paste(image, (x, y + 32), image)
            draw.text((x + 5, y + 8), model + ' / ' + str(entry['recipe']['cameraAngle']), fill='white')
        target = PACK / 'review' / (model + '-body-contact.png')
        save_or_compare(sheet, target, check)
        contacts.append({'subjectId': entries[0]['subjectId'], 'modelId': model, 'contact': record(target),
                         'samples': [{'entryId': entry['id'], 'index': 0, 'path': entry['frames'][0]['path'], 'sha256': entry['frames'][0]['sha256']} for entry in entries]})
    value = {'schema': 're.bow.native-review-contacts-r33/1', 'release': 'R33', 'contacts': contacts,
             'scope': 'QA contact sheets only; native PNG bytes and packed RGBA cell pixels remain unmodified.'}
    payload = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
    if check:
        if (PACK / 'review/contacts.json').read_bytes() != payload:
            raise ValueError('Native contact evidence differs')
    else:
        (PACK / 'review/contacts.json').write_bytes(payload)
        manifest['atlasRecipe'] = {'kind': 'lossless-rgba-packing', 'cellSize': 384, 'columns': 5,
                                   'maximumAtlasSize': 1920, 'maximumFramesPerAtlas': 25,
                                   'nativePngsRewritten': False, 'rgbaPixelsChanged': False,
                                   'script': {'path': Path(__file__).relative_to(ROOT).as_posix(), 'sha256': sha(Path(__file__).read_bytes())}}
        manifest['counts']['newAtlases'] = len({frame['atlas']['path'] for entry in sequences for frame in entry['frames']})
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    return {'newAtlasCount': len({frame['atlas']['path'] for entry in sequences for frame in entry['frames']}),
            'contacts': len(contacts), 'reviewSampleImages': sum(len(item['samples']) for item in contacts)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    print(json.dumps(pack(parser.parse_args().check)))
