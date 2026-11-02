#!/usr/bin/env python3
"""Bind eight untouched image_gen outputs to four held source-edition families."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r33/sprites'
BASE = 'modules/fidelity-r31/sprites/manifest.json'
NATIVE = 'modules/fidelity-r30/native/new-sources/manifest.json'
TARGETS = ('re2-zombie-dog', 're2-giant-alligator', 're2-giant-moth', 're3-zombie')


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def ref(name):
    path = ROOT / name
    raw = path.read_bytes()
    return {'path': name, 'bytes': len(raw), 'sha256': digest(raw)}


def checked(binding):
    name = binding['path']
    path = (ROOT / name).resolve()
    if not path.is_relative_to(ROOT) or path.relative_to(ROOT).as_posix() != name:
        raise ValueError('Noncanonical source path: ' + name)
    raw = path.read_bytes()
    if digest(raw) != binding['sha256'] or len(raw) != binding.get('bytes', len(raw)):
        raise ValueError('Changed input: ' + name)
    return raw


def write(name, value, check):
    raw = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
    path = ROOT / name
    if check:
        if path.read_bytes() != raw:
            raise ValueError('Stale R33 sprite binding: ' + name)
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)


def measure(name):
    path = ROOT / name
    image = Image.open(path)
    if image.format != 'PNG' or image.mode != 'RGBA':
        raise ValueError('Expected raw RGBA PNG')
    alpha = image.getchannel('A')
    minimum, maximum = alpha.getextrema()
    if minimum != 0 or maximum < 200:
        raise ValueError('Expected useful transparent alpha')
    visible = alpha.point(lambda value: 255 if value >= 16 else 0)
    bounds = visible.getbbox()
    if not bounds:
        raise ValueError('Empty image')
    x0, y0, x1, y1 = bounds
    if not (x0 > 0 and y0 > 0 and x1 < image.width and y1 < image.height):
        raise ValueError('Main visible silhouette reaches canvas edge')
    histogram = alpha.histogram()
    return {
        'format': 'PNG', 'width': image.width, 'height': image.height,
        'alpha': {'channel': True, 'min': minimum, 'max': maximum,
                  'transparentPixels': histogram[0], 'totalPixels': image.width * image.height,
                  'transparentFraction': histogram[0] / (image.width * image.height),
                  'visibleThreshold': 16},
        'bounds': {'x': x0, 'y': y0, 'width': x1 - x0, 'height': y1 - y0},
        'pivot': {'x': (x0 + x1) / 2, 'y': y1},
        'visiblePadding': {'left': x0, 'top': y0, 'right': image.width - x1,
                           'bottom': image.height - y1, 'threshold': 16},
        'decodedRgbaSha256': digest(image.tobytes()),
        'visibleEdgePixelsAtAlpha16': 0,
        'lowAlphaBounds': list(alpha.getbbox()),
    }


def build(check=False):
    baseline = json.loads((ROOT / BASE).read_text())
    original = {entry['id']: entry for entry in baseline['sprites']}
    blocked = {entry['id'] for entry in baseline['pending']} | {'re1r-tyrant'}
    assert len(blocked) == 23
    native = json.loads((ROOT / NATIVE).read_text())
    jobs = json.loads((PACK / 'jobs.json').read_text())['jobs']
    assert tuple(job['id'] for job in jobs) == TARGETS
    variants, families, sources = [], [], {}
    for name in (BASE, NATIVE, 'modules/fidelity-r33/sprites/jobs.json'):
        sources[name] = ref(name)
    for job in jobs:
        uid, model = job['id'], job['modelId']
        if uid in blocked or uid not in original:
            raise ValueError('Unknown or refused identity cannot be retried')
        review_name = 'modules/fidelity-r33/sprites/review/' + uid + '.json'
        review = json.loads((ROOT / review_name).read_text())
        assert review['uid'] == uid and review['fullVisibleSourceBodyObserved'] is True
        assert review['fullVisibleGeneratedBodyObserved'] is True
        assert review['generatedBytesEdited'] is False and review['sourceBytesChanged'] is False
        assert review['canonicalFidelityCertified'] is False and review['originalIdleAnimationCertified'] is False
        assert review['targetEditionMatched'] is False and review['defaultAdmission'] is False
        sources[review_name] = ref(review_name)
        source_entries = [entry for entry in native['entries'] if entry['modelId'] == model]
        assert len(source_entries) == 4
        refs = [dict(binding) for binding in job['references']]
        assert len(refs) == 4
        for binding, entry in zip(refs, source_entries):
            checked(binding)
            assert binding['path'] == entry['frames'][0]['path']
            assert binding['sha256'] == entry['frames'][0]['sha256']
            sources[binding['path']] = ref(binding['path'])
        provenance = source_entries[0]['provenance']
        native_inputs = [provenance['sourceModel'], provenance['sourceMaterials'],
                         *provenance['sourceTextures'], provenance['sourceArchive']]
        for binding in native_inputs:
            checked(binding)
            sources[binding['path']] = ref(binding['path'])
        family = {'id': job['familyId'], 'subjectId': uid, 'label': review['sourceVariantLabel'],
                  'sourceEdition': review['sourceEdition'], 'modelId': model,
                  'targetEditionMatched': False, 'defaultAdmission': False,
                  'facings': ['left', 'right'], 'sourceFiles': refs,
                  'sourceModel': provenance['sourceModel'],
                  'sourceArchive': provenance['sourceArchive'],
                  'sourcePage': provenance['sourcePage'], 'variants': []}
        for facing in ('right', 'left'):
            image_name = 'modules/fidelity-r33/sprites/generated/' + uid + '/' + facing + '.png'
            receipt_name = 'modules/fidelity-r33/sprites/receipts/' + uid + '-' + facing + '.json'
            receipt = json.loads((ROOT / receipt_name).read_text())
            assert receipt['id'] == uid and receipt['facing'] == facing
            assert receipt['tool'] == 'image_gen' and receipt['transparent_background'] is True
            assert receipt['outputSource'].startswith('/workspace/generated_images/exec-')
            assert receipt['references'] == refs
            assert ('FACING ' + facing.upper()) in receipt['prompt']
            raw = (ROOT / image_name).read_bytes()
            source = Path(receipt['outputSource'])
            # CI retains the output digest; the optional local artifact is an additional exact-byte witness.
            retained = json.loads((PACK / 'output-digests.json').read_text())
            assert digest(raw) == retained[uid][facing]['sha256']
            assert len(raw) == retained[uid][facing]['bytes']
            if source.is_file():
                assert source.read_bytes() == raw, 'image_gen pixels were edited'
            if facing == 'left':
                assert receipt['familyReference']['path'] == 'modules/fidelity-r33/sprites/generated/' + uid + '/right.png'
                assert receipt['familyReference']['toolOutputSource'] == json.loads((PACK / 'receipts' / (uid + '-right.json')).read_text())['outputSource']
            measured = measure(image_name)
            assert {'path': image_name, 'sha256': digest(raw), 'facing': facing} in review['images']
            eligible = (review['neutralPoseReviewed'] is True and review['poseKind'] == 'neutral-base'
                        and review['scope'] == 'combatant-neutral-pose' and not review['knownAppearanceGaps'])
            assert not eligible or uid in ('re2-zombie-dog', 're3-zombie')
            entry = {
                'id': uid, 'subjectId': uid, 'variantId': job['familyId'] + '-' + facing,
                'variantFamilyId': job['familyId'], 'label': review['subjectLabel'] + ' — ' + facing,
                'sourceVariantLabel': review['sourceVariantLabel'],
                'incarnation': original[uid]['incarnation'], 'targetIncarnation': original[uid]['incarnation'],
                'sourceEdition': review['sourceEdition'], 'image': image_name,
                'bytes': len(raw), 'sha256': digest(raw), **measured,
                'sourceFacing': facing, 'canMirror': False,
                'poseKind': review['poseKind'], 'scope': review['scope'],
                'fullBodyReviewed': True, 'completeBodyReferenceVerified': True,
                'reviewStatus': 'visually-reviewed', 'knownAppearanceGaps': review['knownAppearanceGaps'],
                'availableStates': ['idle'] if eligible else [],
                'animated': False, 'animationFrames': 1, 'modularParts': False,
                'combatIntegrated': False, 'documentaryVariant': True, 'sameEditionVariant': False,
                'defaultAdmission': False, 'admittedTargetEdition': False,
                'targetEditionAdmitted': False, 'targetEditionMatched': False,
                'canonicalFidelityCertified': False, 'originalGameSprite': False,
                'originalGamePoseCertified': False, 'originalIdleAnimationCertified': False,
                'comparesAgainstSha256': original[uid]['sha256'],
                'sourceCompletenessEvidence': ref(review_name),
                'provenance': {'generator': 'image_gen', 'prompt': receipt['prompt'],
                               'references': refs, 'generationRecord': ref(receipt_name),
                               'toolArtifactSha256': digest(raw), 'manualPngEdits': False,
                               'sourceModel': provenance['sourceModel'],
                               'sourceArchive': provenance['sourceArchive'],
                               'sourcePage': provenance['sourcePage'],
                               'sourceAuthenticity': 'Community-published native GameCube model used through preserved derived source views; final PNG is newly generated.'},
                'limitations': [
                    'Source edition GameCube; equivalence to the PlayStation target is unverified. This remains a separate voluntary source-edition presentation.',
                    'One newly generated static side, not original game pixels, geometric 1:1, an authored attack or an original idle animation.',
                    'The opposite side is a separate real generation; asymmetric source details are not procedurally mirrored. Exact source texels and hidden anatomy remain unverified.',
                    *review['notes']],
                'openStates': ['idle-cycle', 'walk', 'run', 'light', 'heavy', 'special', 'super',
                               'hurt', 'guard', 'knockdown', 'intro', 'victory', 'defeat'],
            }
            variants.append(entry)
            family['variants'].append(entry['variantId'])
            for name in (image_name, receipt_name):
                sources[name] = ref(name)
        families.append(family)
    sources['modules/fidelity-r33/sprites/output-digests.json'] = ref('modules/fidelity-r33/sprites/output-digests.json')
    manifest = {
        'schema': 're.bow.source-edition-generated-sprites-r33/1', 'release': 'R33',
        'purpose': 'Eight actual source-guided PNGs in four separate GameCube documentary families, with independently generated left/right sides. No PlayStation edition substitution or original animation claim.',
        'baseline': ref(BASE), 'nativeSourceManifest': ref(NATIVE),
        'counts': {'newGeneratedPngs': 8, 'sourceEditionFamilies': 4,
                   'independentlyGeneratedSides': 8, 'newTargetIdentities': 0,
                   'newDefaultSpriteReplacements': 0, 'newNativeGameSprites': 0,
                   'newOriginalIdleAnimations': 0, 'sourceEditionStaticPoseFamiliesEligibleForVoluntaryChoice': 2,
                   'documentaryOnlyFamilies': 2, 'preservedInitialTargetRefusals': 22,
                   'preservedFailedRevisions': 1, 'newGenerationRefusals': 0,
                   'manuallyEditedPngs': 0},
        'families': families, 'variants': variants, 'sourceFiles': sorted(sources.values(), key=lambda item: item['path']),
        'canonicalFidelityCertified': False,
    }
    write('modules/fidelity-r33/sprites/manifest.json', manifest, check)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    result = build(args.check)
    print(json.dumps(result['counts']))


if __name__ == '__main__':
    main()
