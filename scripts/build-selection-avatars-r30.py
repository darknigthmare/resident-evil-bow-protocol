#!/usr/bin/env python3
"""Bind exact-identity selection portraits to retained source bytes; no art generation."""
import argparse
import concurrent.futures
import gzip
import hashlib
import html
import io
import json
import re
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'modules/fidelity-r30/selection'
INPUTS = ('data/catalog-portraits.json', 'data/asset-sources.json',
          'modules/source-motion-r22/native-portraits.json', 'modules/fidelity-r23/visual/manifest.json',
          'modules/fidelity-r27/sprites/jobs.json')
SCHEMA = 're.bow.selection-avatars-r30/1'
MODEL_RENDERS = ('modules/fidelity-r30/native/other-games/renders.json',
                 'modules/fidelity-r30/native/new-sources/renders.json',
                 'modules/fidelity-r30/native/other-games/portrait-renders.json')
MODEL_CHOICES = {
    're0-lurker': ('re0-lurker-gc-r26-1', 315),
    're0-centurion': ('re0-centurion-gc-r26-1', 315),
    're0-stinger': ('re0-stinger-gc-r26-1', 315),
    're1r-hunter': ('re1r-hunter-gamecube', 0),
    're1r-lisa-trevor': ('re1r-lisa-trevor-gamecube', 0),
    're1r-cerberus': ('re1r-cerberus-1-gamecube', 270),
    're3r-hunter-gamma': ('re3r-hunter-gamma-pc-r30', 0),
}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def file_record(path):
    raw = (ROOT / path).read_bytes()
    return {'path': path, 'bytes': len(raw), 'sha256': sha(raw)}


def read(path):
    return json.loads((ROOT / path).read_text())


def capture():
    """Recheck exact portrait page/image adjacency, not move-set completeness."""
    rows = [row for row in read(INPUTS[0])['catalog'] if row.get('sourceSupport') == 'index-only-review-required']
    folder = OUT / 'sources'
    folder.mkdir(parents=True, exist_ok=True)

    def one(row):
        request = urllib.request.Request(row['sourcePage'], headers={'User-Agent': 'Mozilla/5.0'})
        result = {'id': row['id'], 'url': row['sourcePage'], 'sourceImageUrl': row['imageUrl']}
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                raw = response.read(2 * 1024 * 1024 + 1)
                if len(raw) > 2 * 1024 * 1024:
                    raise ValueError('Source page exceeds bounded capture')
                text = raw.decode('utf-8', errors='replace')
                title = re.search(r'<title[^>]*>(.*?)</title>', text, re.S | re.I)
                image_path = row['imageUrl'].split('?', 1)[0]
                present = image_path in html.unescape(text)
                packed = gzip.compress(raw, mtime=0)
                target = folder / (row['id'] + '.html.gz')
                target.write_bytes(packed)
                result.update(httpStatus=response.status, effectiveUrl=response.url,
                              title=html.unescape(title.group(1).strip()) if title else '',
                              exactImageUrlOnPage=present, rawSha256=sha(raw), rawBytes=len(raw),
                              snapshot=file_record(target.relative_to(ROOT).as_posix()))
        except (urllib.error.URLError, ValueError) as error:
            result.update(httpStatus=getattr(error, 'code', None), error=str(error), exactImageUrlOnPage=False)
        return result

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        results = list(pool.map(one, rows))
    evidence = {'schema': 're.bow.selection-avatar-source-pages-r30/1', 'sources': results,
                'scope': 'Exact named portrait source and image adjacency only; no anatomy or motion certification.'}
    (OUT / 'source-pages.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'sourcePages': len(results), 'http200': sum(row.get('httpStatus') == 200 for row in results),
                      'exactImageAdjacency': sum(row['exactImageUrlOnPage'] for row in results)}))


def build():
    catalog = read(INPUTS[0])['catalog']
    native = {row['id']: row for row in read(INPUTS[3])['entries']}
    reviewed = {row['id']: row for row in read(INPUTS[2])['entries']}
    jobs = {row['id']: row for row in read(INPUTS[4])['jobs']}
    source_pages = {row['id']: row for row in read('modules/fidelity-r30/selection/source-pages.json')['sources']}
    model_views = {}
    for renders_path in MODEL_RENDERS:
        rendered = read(renders_path)
        for entry in rendered['entries']:
            choice = MODEL_CHOICES.get(entry['subjectId'])
            if not choice or choice[0] != entry['modelId']:
                continue
            model_catalog = read(entry['sourceCatalog']['path'])
            model = next(item for item in model_catalog['entries'] if item['id'] == entry['modelId'])
            view = next((item for item in entry['views'] if item['angle'] == choice[1]), None)
            if view is None:
                continue
            model_views[entry['subjectId']] = (renders_path, entry, model, view)
    if set(model_views) != set(MODEL_CHOICES):
        raise ValueError('Missing exact-edition reviewed model avatar view')
    entries, missing = [], []
    for row in catalog:
        uid = row['id']
        if uid == 're7-jack-baker-scissor':
            missing.append({'id': uid, 'label': row['name'], 'game': row['game'],
                            'reason': 'The old image is a provisional composite. No exact source image of the morgue scissor-saw incarnation is admitted.',
                            'sourceKind': 'missing', 'nativeAssetCertified': False, 'canonicalFidelityCertified': False})
            continue
        provenance = []
        bounds, source_edition = None, row['game']
        if uid in model_views:
            renders_path, rendered, model, view = model_views[uid]
            if model.get('game', rendered.get('sourceGame')) != row['game']:
                raise ValueError('Native model portrait game mismatch: ' + uid)
            path, expected_sha = view['path'], view['sha256']
            kind, page = 'native-model-render', model['sourcePage']
            source_image = page
            source_edition = model.get('sourceEdition', rendered.get('sourceEdition'))
            bounds = view['bounds']
            provenance = [{'kind': 'native-model-render-derived-not-original-game-2d-frame',
                           'renders': file_record(renders_path), 'modelId': rendered['modelId'],
                           'sourceCatalog': rendered['sourceCatalog'], 'view': view,
                           'sourceBase': model.get('base'),
                           'model': model['model'], 'textures': model['textures'],
                           'recipe': rendered['recipe'], 'sourceFilesRewritten': False,
                           'targetGameMatched': True,
                           'poseUsedAsCombatIdle': False}]
        elif uid in native:
            source = native[uid]
            path = 'modules/fidelity-r23/visual/' + source['image']
            kind, page = 'native-menu-thumbnail', source['source_page']
            source_image = source['source_archive']
            expected_sha = source['sha256']
            provenance = [{'kind': 'native-atlas-crop', 'archive': source['source_archive'],
                           'atlas': 'modules/fidelity-r23/visual/' + source['source_atlas'],
                           'atlasSha256': source['source_atlas_sha256'], 'crop': source['crop'],
                           'manifest': file_record(INPUTS[3])}]
        elif uid in reviewed:
            source = reviewed[uid]
            path = 'modules/source-motion-r22/' + source['image']
            kind, page = 'reviewed-secondary-reference', source['source_page']['url']
            source_image, expected_sha = source['source_image']['url'], source['sha256']
            if source['source_game'] != row['game']:
                raise ValueError('Reviewed portrait game mismatch: ' + uid)
            provenance = [{'kind': 'inherited-visual-reference-review', 'manifest': file_record(INPUTS[2]),
                           'reviewedImageSha256': source['curation']['reviewed_image_sha256']}]
        else:
            if row.get('assetUsage') == 'composite-provisional':
                raise ValueError('Composite requires a reviewed replacement: ' + uid)
            path = row['portrait']
            kind, page = 'documented-secondary-reference', row['sourcePage']
            source_image, expected_sha = row.get('imageUrl'), row.get('sha256')
            provenance = [{'kind': 'exact-uid-source-index', 'manifest': file_record(INPUTS[0]),
                           'catalogueUid': uid, 'sourceSupport': row.get('sourceSupport', 'source-image-curation')}]
            retained = next((ref for ref in jobs.get(uid, {}).get('references', [])
                             if ref['path'] == path and ref.get('exactIdentity') is True), None)
            if retained:
                # Some initial catalogue SHA values describe the full-body file,
                # while R22 replaced the portrait. Use the retained exact-path SHA.
                expected_sha = retained['sha256']
                provenance.append({'kind': 'retained-exact-path-reference', 'manifest': file_record(INPUTS[4]),
                                   'reference': retained})
            if row.get('sourceSupport') == 'index-only-review-required':
                check = source_pages[uid]
                if check.get('httpStatus') != 200 or not check.get('exactImageUrlOnPage'):
                    missing.append({'id': uid, 'label': row['name'], 'game': row['game'],
                                    'reason': 'Named source portrait could not be corroborated on its exact source page.',
                                    'sourceKind': 'missing', 'nativeAssetCertified': False, 'canonicalFidelityCertified': False})
                    continue
                provenance.append({'kind': 'exact-named-source-page-image-adjacency', **check})
        target = (ROOT / path).resolve()
        if not target.is_relative_to(ROOT) or '/generated/' in path or '/documentary-variants/' in path:
            raise ValueError('Avatar is not an admitted local reference: ' + uid)
        raw = target.read_bytes()
        if expected_sha and sha(raw) != expected_sha:
            raise ValueError('Reference bytes differ: ' + uid)
        with Image.open(io.BytesIO(raw)) as image:
            image.load()
            width, height, format_ = image.width, image.height, image.format
        if len(raw) > 20 * 1024 * 1024 or width * height > 16 * 1024 * 1024:
            raise ValueError('Avatar exceeds bounded transport/decoded pixels: ' + uid)
        entries.append({'id': uid, 'label': row['name'], 'game': row['game'],
                        'image': path, 'width': width, 'height': height, 'bytes': len(raw),
                        'sha256': sha(raw), 'format': format_, 'sourceKind': kind,
                        'sourcePage': page, 'sourceImage': source_image, 'sourceEdition': source_edition,
                        'targetIncarnation': row['game'],
                        'nativeAssetCertified': kind == 'native-menu-thumbnail',
                        'derivedNativeModelRender': kind == 'native-model-render',
                        'originalGame2DFrame': kind == 'native-menu-thumbnail',
                        'targetEditionMatched': kind in ('native-menu-thumbnail', 'native-model-render'),
                        'canonicalFidelityCertified': False, 'imageEditedByR30': False,
                        'selectionOnly': True, 'combatAnimationAssigned': False,
                        'crop': bounds, 'provenance': provenance})
    entries.sort(key=lambda row: row['id'])
    missing.sort(key=lambda row: row['id'])
    return {'schema': SCHEMA, 'release': 'R30', 'inputs': [file_record(path) for path in INPUTS + MODEL_RENDERS]
            + [file_record('modules/fidelity-r30/selection/source-pages.json')],
            'scope': 'Exact-UID selection avatars from retained source references. Seven menu atlas thumbnails are native extracted images; seven additional avatars are clearly classified as new renders of published native models, not original 2D game frames. Secondary reference appearance and edition metadata do not certify raw game asset authenticity.',
            'counts': {'catalogueIdentities': len(catalog), 'avatars': len(entries), 'missing': len(missing),
                       'nativeMenuThumbnails': sum(row['sourceKind'] == 'native-menu-thumbnail' for row in entries),
                       'nativeModelRenders': sum(row['sourceKind'] == 'native-model-render' for row in entries),
                       'reviewedSecondaryReferences': sum(row['sourceKind'] == 'reviewed-secondary-reference' for row in entries),
                       'documentedSecondaryReferences': sum(row['sourceKind'] == 'documented-secondary-reference' for row in entries),
                       'generatedAvatars': 0},
            'entries': entries, 'missing': missing, 'canonicalFidelityCertified': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--capture', action='store_true')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    if args.capture:
        capture()
    payload = json.dumps(build(), ensure_ascii=False, indent=2) + '\n'
    target = OUT / 'manifest.json'
    if args.check:
        if target.read_text() != payload:
            raise ValueError('Avatar manifest is not reproducible from retained source records')
    else:
        target.write_text(payload)
    print(json.dumps(json.loads(payload)['counts']))


if __name__ == '__main__':
    main()
