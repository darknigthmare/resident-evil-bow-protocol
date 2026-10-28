#!/usr/bin/env python3
"""Bind actual R31 tool PNGs and source observations to immutable R29 targets."""
import argparse
import copy
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r31/sprites'
BASE = 'modules/fidelity-r29/sprites/manifest.json'
SPEC = importlib.util.spec_from_file_location('r31_measure', ROOT / 'scripts/import-generated-sprites-r27.py')
MEASURE = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(MEASURE)
TARGETS = ('re7-lucas-baker-mutated', 'revillage-donna-angie', 're1r-zombie')


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def record(path):
    path = Path(path); raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': digest(raw)}


def checked(binding):
    path = (ROOT / binding['path']).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file():
        raise ValueError('Missing local evidence')
    raw = path.read_bytes()
    if digest(raw) != binding['sha256'] or binding.get('bytes', len(raw)) != len(raw):
        raise ValueError('Changed evidence: ' + binding['path'])
    return raw


def write(path, value, check=False):
    raw = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
    if check:
        if not path.is_file() or path.read_bytes() != raw:
            raise ValueError('Stale generated record: ' + str(path.relative_to(ROOT)))
    else:
        path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(raw)


def build(check=False):
    baseline = json.loads((ROOT / BASE).read_text()); original = {entry['id']: entry for entry in baseline['sprites']}
    blocked = {entry['id'] for entry in baseline['pending']} | {'re1r-tyrant'}
    result = copy.deepcopy(baseline); replacements, variants = [], []
    for uid in TARGETS:
        if uid in blocked:
            raise ValueError('Preserved image generation refusal cannot be retried')
        receipt_path = PACK / 'sources/generation-requests' / (uid + '.json')
        receipt = json.loads(receipt_path.read_text())
        observation_path = PACK / 'review' / (uid + '.json')
        observation = json.loads(observation_path.read_text())
        image_path = ROOT / receipt['image']; raw = image_path.read_bytes(); measured = MEASURE.measure(raw)
        if digest(raw) != receipt['toolArtifactSha256'] or len(raw) != receipt['bytes'] or receipt['manualPngEdits'] is not False:
            raise ValueError('The actual image_gen artifact bytes changed')
        if (receipt['uid'] != uid or receipt.get('toolResultStatus') != 'success' or receipt['transparent_background'] is not True
                or not receipt['prompt'] or not receipt['tool_output'].startswith('/workspace/generated_images/exec-')):
            raise ValueError('Missing actual tool request/result')
        refs = []
        for absolute in receipt['referenced_image_paths']:
            path = Path(absolute)
            if not path.is_absolute() or not path.is_relative_to(Path(receipt['capturedRepositoryRoot'])):
                raise ValueError('Image reference leaves captured repository')
            refs.append(record(ROOT / path.relative_to(receipt['capturedRepositoryRoot'])))
        if (observation['uid'] != uid or observation['imageSha256'] != digest(raw)
                or observation['sourceCompleteVisibleBodyObserved'] is not True or observation['generatedCompleteVisibleBodyObserved'] is not True
                or observation['manualPngEdits'] is not False or observation['canonicalFidelityCertified'] is not False
                or observation['originalGamePoseCertified'] is not False or observation['referenceImages'] != refs):
            raise ValueError('Missing or stale full visible body observation')
        checked(observation['comparisonContact'])
        if observation['visibleEdgePixelsAtAlpha16'] != 0:
            raise ValueError('A clipped visible source-guided figure cannot be admitted')
        entry = copy.deepcopy(original[uid])
        for key in ('sourceCompletenessEvidence', 'r28VisualReview', 'r29VisualReview', 'supersedesSha256'):
            entry.pop(key, None)
        entry.update(measured)
        entry.update(image=receipt['image'], bytes=len(raw), sha256=digest(raw), canMirror=False,
            fullBodyReviewed=True, completeBodyReferenceVerified=True, reviewStatus='visually-reviewed',
            sourceFacing=observation['observedFacing'], poseKind=observation['observedPoseKind'],
            knownAppearanceGaps=observation['knownAppearanceGaps'], availableStates=[], animated=False,
            animationFrames=1, originalGameSprite=False, canonicalFidelityCertified=False,
            sourceEdition=observation['sourceEdition'], sourceVariantLabel=observation['sourceVariantLabel'],
            originalGamePoseCertified=False, oppositeViewReviewed=False,
            sourceCompletenessEvidence=record(observation_path),
            limitations=observation['limitations'])
        entry['provenance'] = {'generator': 'image_gen', 'prompt': receipt['prompt'], 'references': refs,
            'generationRecord': record(receipt_path), 'toolArtifactSha256': digest(raw), 'manualPngEdits': False,
            'sourceAuthenticity': observation['sourceAuthenticity']}
        if uid == 're1r-zombie':
            if (entry['sourceFacing'] != 'right' or entry['poseKind'] != 'neutral-base'
                    or observation['neutralPoseReviewed'] is not True or entry['knownAppearanceGaps']):
                raise ValueError('A same-edition neutral variant needs a complete separately reviewed side pose')
            entry.update(variantId=uid + '-naked-gc-2002-right', sameEditionVariant=True,
                defaultAdmission=False, admittedTargetEdition=True, targetEditionAdmitted=True,
                targetIncarnation=original[uid]['incarnation'], comparesAgainstSha256=original[uid]['sha256'],
                targetFullBodyReviewed=False, availableStates=['idle'], scope='combatant-neutral-pose')
            variants.append(entry)
        else:
            if entry['poseKind'] != 'source-presentation' or entry['sourceFacing'] != 'front':
                raise ValueError('These source views cannot invent a side fighting pose')
            entry['supersedesSha256'] = original[uid]['sha256']; replacements.append(entry)
        write(PACK / 'records' / (uid + '.json'), entry, check)
    for entry in replacements:
        result['sprites'][next(n for n, old in enumerate(result['sprites']) if old['id'] == entry['id'])] = entry
    result.update(release='R31', purpose='Actual source-guided complete visible body presentations and a voluntary same-edition static pose variant; no native-animation claim.',
        baseline=record(ROOT / BASE), previousReplacements=list(dict.fromkeys(baseline.get('previousReplacements', []) + baseline['replacements'])), replacements=[entry['id'] for entry in replacements],
        sameEditionVariants=variants, r31BodyReviews=[record(PACK / 'review' / (uid + '.json')) for uid in TARGETS])
    counts = result['counts']
    counts.update(fullBodyReviewedSprites=sum(entry['fullBodyReviewed'] for entry in result['sprites']),
        replacedSprites=len(replacements), newVisualReviews=3, newPoseReviews=3, firstVisualReviews=0,
        sameEditionVariants=len(variants), sameEditionVariantStaticPoses=len(variants),
        newGeneratedPngs=3, newTargetIdentities=0, newNativeGameSprites=0, newNativeIdleAnimations=0,
        cumulativeReplacedIdentities=baseline['counts']['cumulativeReplacedIdentities'] + len(replacements),
        explicitAppearanceGapSprites=sum(bool(entry.get('knownAppearanceGaps')) for entry in result['sprites']),
        newBodiesWithoutKnownAppearanceGap=sum(not entry.get('knownAppearanceGaps') for entry in replacements))
    for key, pose in [('neutralBaseSprites', 'neutral-base'), ('sourceBindPoseSprites', 'source-bind-pose'), ('sourcePresentationSprites', 'source-presentation'), ('unknownPoseSprites', 'unknown')]:
        counts[key] = sum(entry['poseKind'] == pose for entry in result['sprites'])
    counts['neutralBaseCombatEligibleSprites'] = sum(entry.get('availableStates') == ['idle'] for entry in result['sprites'])
    write(PACK / 'manifest.json', result, check)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('--check', action='store_true'); args = parser.parse_args()
    result = build(args.check)
    print(json.dumps({'generatedTargets': len(result['sprites']), 'preservedTargetRefusals': len(result['pending']),
        'newPixelRevisions': len(result['replacements']), 'sameEditionVariants': len(result['sameEditionVariants']),
        'completeVisibleBodyTargets': result['counts']['fullBodyReviewedSprites'], 'newAnimatedIdles': 0}))


if __name__ == '__main__':
    main()
