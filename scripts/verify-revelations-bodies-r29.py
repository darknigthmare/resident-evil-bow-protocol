#!/usr/bin/env python3
"""Read-only R29 RE5 bodies and Revelations HD documentary-variant evidence checks."""
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'modules/fidelity-r29/sources/revelations-body-rasters'
ACTIVE = ('re5-chainsaw-majini', 're5-executioner', 're5-jill-valentine-enemy')
DOCUMENTARY = ('rerev-ooze', 'rerev-chunk-ooze', 'rerev-tricorne-ooze', 'rerev-pincer-ooze')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    return json.loads(path.read_text())


def local(value):
    target = (ROOT / value).resolve()
    assert target.is_relative_to(ROOT) and target.is_file(), value
    return target


def record(uid):
    folder = 'records' if uid in ACTIVE else 'documentary-variants/records'
    return read(ROOT / 'modules/fidelity-r29/sprites' / folder / (uid + '.json'))


def file_entry(entry, base=ROOT):
    target = (base / entry['path']).resolve()
    assert target.is_relative_to(ROOT) and target.is_file(), entry['path']
    assert sha(target) == entry['sha256'], entry['path']
    if 'bytes' in entry:
        assert target.stat().st_size == entry['bytes'], entry['path']
    return target


def source_catalogs():
    manifest = read(PACK / 'manifest.json')
    count = 0
    for entry in manifest['entries']:
        catalog = file_entry(entry['sourceCatalog'])
        native = next(item for item in read(catalog)['entries'] if item['id'] == entry['modelId'])
        base = (catalog.parent / native['base']).resolve()
        for item in [native['model'], native.get('materials'), *native['textures']]:
            if item:
                file_entry(item, base)
                count += 1
        assert native['subjectId'] == entry['id']
        assert not native.get('candidateUid'), 'An alias candidate cannot complete a target body'
    file_entry(manifest['renderRecipe'])
    assert len(manifest['entries']) == 3
    return {'sourceBodies': 3, 'verifiedModelMaterialTextureFiles': count}


def source_rasters():
    manifest = read(PACK / 'manifest.json')
    count = 0
    for entry in manifest['entries']:
        assert [view['angle'] for view in entry['views']] == [0, 90, 180, 270]
        for view in entry['views']:
            path = file_entry(view, PACK)
            with Image.open(path) as image:
                rgba = image.convert('RGBA')
                assert rgba.size == (768, 768)
                alpha = rgba.getchannel('A')
                box = alpha.getbbox()
                assert box and min(box[:2]) > 0 and box[2] < rgba.width and box[3] < rgba.height
                assert alpha.getextrema()[0] == 0
                assert hashlib.sha256(rgba.tobytes()).hexdigest() == view['rgbaSha256']
            assert view['edgePixels'] == 0
            count += 1
        assert entry['recipe']['cameraOrbitOnly'] is True
        assert entry['recipe']['modelTransformsChanged'] is False
        assert entry['canonicalFidelityCertified'] is False
    assert count == 12
    return {'cameraViews': count, 'sourceGeometryEdited': False}


def online_and_archives():
    evidence = read(PACK / 'online-evidence.json')
    archives = []
    for entry in evidence['entries']:
        assert entry['status'] == 200
        file_entry(entry)
        if entry.get('preview'):
            file_entry(entry['preview'])
        if entry.get('archive'):
            archive = file_entry(entry['archive'])
            with ZipFile(archive) as source:
                for member in source.infolist():
                    if member.is_dir():
                        continue
                    extracted = PACK / 'models' / archive.stem / member.filename
                    assert extracted.resolve().is_relative_to(ROOT)
                    assert extracted.read_bytes() == source.read(member), member.filename
            archives.append(archive.name)
    assert set(archives) == {'asset-310863.zip', 'asset-316421.zip'}
    return {'capturedResponses': len(evidence['entries']), 'newArchivesComparedByteForByte': archives}


def active_exact_edition():
    baseline = read(ROOT / 'modules/fidelity-r28/sprites/manifest.json')
    originals = {item['id']: item for item in baseline['sprites']}
    for uid in ACTIVE:
        item = record(uid)
        assert item['id'] == uid and item['admittedTargetEdition'] is True
        assert item['supersedesSha256'] == originals[uid]['sha256']
        assert item['scope'] == originals[uid]['scope']
        assert item['image'] == 'modules/fidelity-r29/sprites/generated/' + uid + '/full-body.png'
        assert item['fullBodyReviewed'] and item['completeBodyReferenceVerified']
        assert item['poseKind'] == 'source-bind-pose'
        assert item['knownAppearanceGaps'] and item['equipmentCompletenessReviewed'] is False
        assert item['availableStates'] == []
    assert len(baseline['sprites']) == 363 and len(baseline['pending']) == 22
    return {'newEffectiveBodyVersions': 3, 'newTargetIdentities': 0, 'newIdleStates': 0}


def edition_variants():
    for uid in DOCUMENTARY:
        item = record(uid)
        assert item['id'] == uid and item['variantId'] == uid + '-hd-pc-2013'
        assert item['admittedTargetEdition'] is False
        assert item['scope'] == 'documentary-edition-variant'
        assert '2013' in item['sourceEdition'] and '2013' in item['incarnation']
        assert '2012' in item['targetIncarnation']
        assert 'supersedesSha256' not in item
        assert item['availableStates'] == []
        assert item['image'] == 'modules/fidelity-r29/sprites/documentary-variants/' + uid + '/hd-pc-2013.png'
        assert not (ROOT / 'modules/fidelity-r29/sprites/records' / (uid + '.json')).exists()
    return {'documentaryHdPcVariants': 4, 'original2012TargetsCompletedByThoseVariants': 0}


def actual_generated_bytes():
    total = 0
    for uid in (*ACTIVE, *DOCUMENTARY):
        item = record(uid)
        image = file_entry({'path': item['image'], 'bytes': item['bytes'], 'sha256': item['sha256']})
        provenance = item['provenance']
        assert provenance['generator'] == 'image_gen' and provenance['manualPngEdits'] is False
        assert provenance['toolArtifactSha256'] == item['sha256']
        receipt = file_entry(provenance['generationRecord']['requestReceipt'])
        request = read(receipt)
        assert request['prompt'] == provenance['prompt']
        capture_root = Path(request['capturedRepositoryRoot'])
        references = [Path(value).relative_to(capture_root).as_posix() for value in request['referenced_image_paths']]
        assert references == [entry['path'] for entry in provenance['references']]
        for ref in provenance['references']:
            file_entry(ref)
        tool_output = Path(request['tool_output'])
        if tool_output.is_file():
            assert tool_output.read_bytes() == image.read_bytes(), 'No generated PNG pixels may be edited'
        with Image.open(image) as decoded:
            rgba = decoded.convert('RGBA')
            mask = rgba.getchannel('A').point(lambda value: 255 if value > 16 else 0)
            box = mask.getbbox()
            assert box and min(box[:2]) > 0 and box[2] < rgba.width and box[3] < rgba.height
            assert rgba.getchannel('A').getextrema()[0] == 0
        total += image.stat().st_size
    return {'actualGeneratedPngs': 7, 'generatedBytes': total, 'manualBitmapEdits': 0}


def observed_body_proofs():
    for uid in (*ACTIVE, *DOCUMENTARY):
        item = record(uid)
        proof = read(file_entry(item['sourceCompletenessEvidence']))
        assert proof['schema'] == 're.bow.source-body-observation-r29/1'
        assert proof['uid'] == uid and proof['imageSha256'] == item['sha256']
        assert proof['sourceCompleteBodyObserved'] and proof['generatedCompleteBodyObserved']
        assert proof['targetEditionAdmitted'] is (uid in ACTIVE)
        assert proof['canonicalFidelityCertified'] is False and proof['originalGamePoseCertified'] is False
        assert proof['visualEvidence']['sourceAndOutputSideBySide'] is True
        file_entry(proof['visualEvidence'])
    return {'shaBoundSourceOutputComparisons': 7, 'originalGamePosesCertified': 0}


def equipment_and_refusals():
    inspection = read(PACK / 'equipment-inspection.json')
    assert inspection['chainsawEquipmentAvailable'] is True
    assert inspection['chainsawBodyAttachmentVerified'] is False
    assert inspection['executionerAxeSourceEstablished'] is False
    assert inspection['arbitraryEquipmentAttachments'] == 0
    assert inspection['equippedBodyPoseGenerated'] is False
    for source in inspection['sources']:
        archive = file_entry(source['archive'])
        with ZipFile(archive) as content:
            assert content.namelist() == source['members']
    baseline = read(ROOT / 'modules/fidelity-r28/sprites/manifest.json')
    blocked = {item['id'] for item in baseline['pending']}
    assert not blocked.intersection((*ACTIVE, *DOCUMENTARY))
    prior = read(PACK.parent / 'revelations-generation/re5-chainsaw-majini-clipped-v1.json')
    file_entry(prior['retainedOutput'])
    assert prior['revisionRequired']
    return {'newEquipmentSources': 1, 'guessedAttachments': 0, 'preservedHistoricalRefusalsRetried': 0, 'clippedFirstOutputRetained': True}


def main():
    checks = []
    for name, run in (
        ('Retained source catalog, geometry, materials and textures', source_catalogs),
        ('Twelve decoded full-source camera views without clipped source edges', source_rasters),
        ('Actual web responses and both new source ZIP extractions', online_and_archives),
        ('Three exact-PC body versions preserve equipment and pose limits', active_exact_edition),
        ('Four HD/PC variants never replace original 2012 catalogue targets', edition_variants),
        ('All seven PNGs, real tool receipts and reference bytes agree', actual_generated_bytes),
        ('Seven observed source/output contacts are SHA-bound to the actual PNGs', observed_body_proofs),
        ('Separate equipment does not imply attachment and refusals stay untouched', equipment_and_refusals),
    ):
        try:
            detail = run()
            checks.append({'name': name, 'pass': True, 'detail': detail})
            print('PASS ' + name)
        except Exception as error:
            checks.append({'name': name, 'pass': False, 'error': repr(error)})
            print('FAIL ' + name + ': ' + repr(error))
    inputs = ['scripts/verify-revelations-bodies-r29.py',
              'modules/fidelity-r29/sources/revelations-body-rasters/manifest.json',
              'modules/fidelity-r29/sources/revelations-body-rasters/catalog.json',
              'modules/fidelity-r29/sources/revelations-body-rasters/online-evidence.json',
              'modules/fidelity-r29/sources/revelations-body-rasters/equipment-inspection.json']
    for uid in (*ACTIVE, *DOCUMENTARY):
        folder = 'records' if uid in ACTIVE else 'documentary-variants/records'
        inputs.append('modules/fidelity-r29/sprites/' + folder + '/' + uid + '.json')
        inputs.extend(['modules/fidelity-r29/sources/revelations-generation/' + uid + '.json',
                       'docs/R29_BODY_VISUAL_EVIDENCE/' + uid + '.json',
                       'docs/R29_BODY_VISUAL_EVIDENCE/' + uid + '.png'])
        try:
            inputs.extend(entry['path'] for entry in record(uid)['provenance']['references'])
        except (KeyError, OSError, ValueError):
            pass  # Missing or invalid records are already recorded as failures above.
    inputs = sorted(set(inputs))
    report = {'schema': 're.bow.revelations-body-validation-r29/1',
              'passed': sum(item['pass'] for item in checks), 'failed': sum(not item['pass'] for item in checks),
              'checks': checks, 'inputs': [{'path': value, 'sha256': sha(ROOT / value)} for value in inputs],
              'counts': {'effectiveExactPcBodyVersions': 3, 'documentaryHdPcVariants': 4,
                         'newGeneratedPngs': 7, 'sourceCameraViews': 12,
                         'newIdleStates': 0, 'sourceEquipmentAttachmentsCertified': 0,
                         'canonicalFidelityCertified': 0},
              'scope': 'Actual retained source files and observed body images; no original-game render, equipment attachment, complete animation or 3DS/HD equivalence certified.'}
    (ROOT / 'docs/R29_REVELATIONS_BODY_TESTS.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'passed': report['passed'], 'failed': report['failed']}))
    return 1 if report['failed'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
