#!/usr/bin/env python3
"""Import four actual image_gen outputs without altering any PNG pixels."""
import argparse
import copy
import hashlib
import importlib.util
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r28'
SPEC = importlib.util.spec_from_file_location('measure_r27', ROOT / 'scripts/import-generated-sprites-r27.py')
MEASURE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MEASURE)
SPECS = [
    ('rerev-wall-blister', 'wall-blister-generation-request.json', 'front', 'source-bind-pose', 'The four attributed native-model views document the whole selected Wall Blister body, including hands and feet. The new image frames these regions and preserves the arm-spread source bind pose. Source material export and generated geometry remain unverified against the original game renderer.'),
    ('rerev-scagdead', 'rerev-scagdead-generation-request.json', 'front', 'source-bind-pose', 'The four attributed native-model views document the whole selected Scagdead body, including asymmetrical arms, attached small head, legs and feet. The new image frames the body in its arm-spread bind pose. The attached small face and surfaces remain a generated interpretation, not a geometric or original-game animation certification.'),
    ('re1r-cerberus', 're1r-cerberus-generation-request.json', 'right', 'source-presentation', 'The four attributed native-model views document one single-headed Cerberus variant from the GameCube remake. The new side presentation frames its complete body and retains the detached chain-like export object separately. Occluded opposite legs are informed by the other source views but are not independently reviewed in this output; detached source objects are not certified native-game equipment. This is not admitted as a neutral combat idle.'),
    ('re1r-lisa-trevor', 're1r-lisa-trevor-generation-request.json', 'front', 'source-bind-pose', 'The four attributed native-model views document the selected Lisa Trevor BASE/rest body and the unusually long chain. The new image frames that body and the long vertical chain in source bind pose. It does not reproduce every detached lateral source-export accessory, whose attachment and original-game purpose remain unverified. This does not complete or certify the separate tentacle-reveal phase shown by the old portrait; phase-specific geometry and equipment remain open. Export accessory positions and generated surface details are not original-game pose or geometric certifications.'),
]


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--prepare-images', action='store_true', help='Prepare unadmitted image records for the source/output browser capture.')
    args = parser.parse_args()
    for uid, receipt_name, facing, pose, notes in SPECS:
        req = json.loads((PACK / 'sources' / receipt_name).read_text())
        source = Path(req['tool_output'])
        destination = PACK / 'sprites/generated' / uid / 'full-body.png'
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)
        raw = destination.read_bytes()
        old = json.loads((ROOT / 'modules/fidelity-r27/sprites/records' / (uid + '.json')).read_text())
        record = copy.deepcopy(old)
        for stale in ('sourceCompletenessEvidence', 'r28VisualReview'):
            record.pop(stale, None)
        image = destination.relative_to(ROOT).as_posix()
        refs = []
        for reference in req['referenced_image_paths']:
            path = Path(reference)
            refs.append({'path':path.relative_to(ROOT).as_posix(), 'sha256':sha(path.read_bytes()),
                         'bytes':path.stat().st_size, 'role':'derived-native-source-body-view',
                         'bodyCoverage':'complete-selected-source-geometry', 'exactIdentity':True})
        record.update(MEASURE.measure(raw))
        record.update(image=image, bytes=len(raw), sha256=sha(raw), supersedesSha256=old['sha256'],
                      sourceFacing=facing, poseKind=pose, availableStates=[], canMirror=False,
                      reviewStatus='visually-reviewed', fullBodyReviewed=True, completeBodyReferenceVerified=True,
                      combatIntegrated=False, canonicalFidelityCertified=False)
        record['equipmentCompletenessReviewed'] = False
        record['knownAppearanceGaps'] = ({
            're1r-lisa-trevor': [
                'Detached lateral accessories visible in other native-model views are omitted from this front output; complete equipment appearance remains unresolved.',
                'The separate tentacle-reveal phase represented by the historical portrait is not completed by this base/rest model.'],
            're1r-cerberus': [
                'The detached chain-like source-export object is preserved, but its anatomical/equipment role and original-game attachment are not certified.'],
        }).get(uid, [])
        record['limitations'] = [
            'Generated interpretation of documented same-incarnation source geometry, not an original game sprite or a geometric1:1 certification.',
            'One source presentation/bind pose; no full animation cycle, opposite output view or attack is produced.', notes]
        generation = {'id':uid, 'generator':'image_gen', 'prompt':req['prompt'],
                      'referenced_image_paths':req['referenced_image_paths'], 'tool_output':req['tool_output'],
                      'capturedRepositoryRoot':req['capturedRepositoryRoot'],
                      'transparent_background':True, 'manualPngEdits':False}
        record['provenance'] = {'generator':'image_gen', 'prompt':req['prompt'], 'references':refs,
                                'generationRecord':generation,
                                'toolArtifactSha256':sha(source.read_bytes()), 'manualPngEdits':False}
        proof_file = ROOT / 'docs/R28_BODY_VISUAL_EVIDENCE' / (uid + '.json')
        visual_file = ROOT / 'docs/R28_BODY_VISUAL_EVIDENCE' / (uid + '.png')
        if not visual_file.exists():
            if not args.prepare_images:
                raise FileNotFoundError('Source/output browser capture is required before admission: ' + str(visual_file))
            record.update(reviewStatus='needs-visual-review', fullBodyReviewed=False, completeBodyReferenceVerified=False)
        else:
            proof = {'schema':'re.bow.source-body-observation-r28/1', 'uid':uid,
                     'image':image, 'imageSha256':record['sha256'], 'references':refs,
                     'sourceCompleteBodyObserved':True, 'generatedCompleteBodyObserved':True,
                     'observedFacing':facing, 'observedPoseKind':pose, 'fullBodyReviewed':True,
                     'canonicalFidelityCertified':False, 'originalGamePoseCertified':False,
                     'oppositeViewReviewed':False, 'manualPngEdits':False, 'notes':notes,
                     'visualEvidence':{'path':visual_file.relative_to(ROOT).as_posix(), 'sha256':sha(visual_file.read_bytes()),
                                       'sourceAndOutputSideBySide':True}}
            write(proof_file, proof)
            record['sourceCompletenessEvidence'] = {'path':proof_file.relative_to(ROOT).as_posix(), 'sha256':sha(proof_file.read_bytes())}
        write(PACK / 'sprites/records' / (uid + '.json'), record)
        print(uid, record['sha256'], record.get('sourceCompletenessEvidence', {}).get('sha256', 'unadmitted'))


if __name__ == '__main__':
    main()
