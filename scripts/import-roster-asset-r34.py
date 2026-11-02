#!/usr/bin/env python3
"""Copy one untouched image_gen PNG and bind its actual request and visual review."""
import argparse
import copy
from contextlib import contextmanager
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import tempfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
JOBS = ROOT / 'modules/fidelity-r34/assets/jobs.json'
SCHEMA = 're.bow.generated-output-r34/1'


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def load(path):
    return json.loads(path.read_text())


def atomic_write(path, raw):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix='.' + path.name + '-', suffix='.tmp', delete=False) as handle:
        temporary = Path(handle.name)
        handle.write(raw)
    try:
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def local(name):
    if not isinstance(name, str) or name.startswith('/') or '\\' in name:
        raise ValueError('Expected a canonical repository path')
    path = (ROOT / name).resolve()
    if not path.is_relative_to(ROOT) or path.relative_to(ROOT).as_posix() != name:
        raise ValueError('Repository path leaves its owner: ' + name)
    return path


def binding(name):
    raw = local(name).read_bytes()
    return {'path': name, 'bytes': len(raw), 'sha256': digest(raw)}


def measure(path):
    image = Image.open(path)
    if image.format != 'PNG' or image.mode != 'RGBA':
        raise ValueError('The unchanged tool output must be an RGBA PNG')
    width, height = image.size
    if not (2 <= width <= 8192 and 2 <= height <= 8192 and width * height <= 16 * 1024 * 1024):
        raise ValueError('Image dimensions exceed the presentation reader budget')
    alpha = image.getchannel('A')
    minimum, maximum = alpha.getextrema()
    bbox = alpha.point(lambda value: 255 if value >= 16 else 0).getbbox()
    if not bbox or minimum != 0 or maximum < 200:
        raise ValueError('The raw PNG needs useful real transparency and visible subject pixels')
    x0, y0, x1, y1 = bbox
    histogram = alpha.histogram()
    return {'format': 'PNG', 'width': width, 'height': height,
            'bounds': {'x': x0, 'y': y0, 'width': x1 - x0, 'height': y1 - y0},
            'pivot': {'x': (x0 + x1) / 2, 'y': y1},
            'alpha': {'channel': True, 'min': minimum, 'max': maximum, 'visibleThreshold': 16,
                      'transparentPixels': histogram[0], 'totalPixels': width * height},
            'silhouetteTouchesCanvasEdge': x0 == 0 or y0 == 0 or x1 == width or y1 == height,
            'decodedRgbaSha256': digest(image.tobytes())}


def bound_bytes(name, overrides=None):
    local(name)  # Validate ownership even when inspecting a planned archive.
    return overrides[name] if overrides and name in overrides else local(name).read_bytes()


def validate_revision_chain(receipt, overrides=None, depth=0):
    if depth > 32:
        raise ValueError('Revision chain exceeds the explicit archive limit')
    for key, state in [('replacesGeneratedOutput', 'GENERATED'), ('replacesHeldReference', 'HELD_REFERENCE')]:
        link = receipt.get(key)
        if link is None:
            continue
        if not isinstance(link, dict) or not isinstance(link.get('reason'), str) or not link['reason'].strip():
            raise ValueError('A revision needs a concrete reason and bound immutable archive')
        refs = ['receipt', 'image'] if state == 'GENERATED' else ['receipt']
        archived = {}
        for kind in refs:
            record = link.get(kind, {})
            raw = bound_bytes(record.get('path'), overrides)
            if digest(raw) != record.get('sha256') or len(raw) != record.get('bytes'):
                raise ValueError('Revision archive bytes differ from their binding')
            archived[kind] = raw
        prior = json.loads(archived['receipt'])
        if (not isinstance(prior, dict) or prior.get('schema') != SCHEMA or prior.get('generator') != 'image_gen' or prior.get('status') != state
                or any(prior.get(field) != receipt.get(field) for field in ['uid', 'kind', 'lotId'])):
            raise ValueError('A revision archive must preserve the same generated or held owner')
        if state == 'GENERATED' and (prior.get('sha256') != digest(archived['image']) or prior.get('bytes') != len(archived['image'])):
            raise ValueError('Archived generated receipt does not bind the archived PNG')
        prefix = Path(receipt_path(receipt)).parent / 'revisions'
        folder = (receipt['kind'] + '-' + link['image']['sha256'] + '-' + link['receipt']['sha256']) if state == 'GENERATED' else (receipt['kind'] + '-held-' + link['receipt']['sha256'])
        for kind in refs:
            expected = (prefix / folder / ('image.png' if kind == 'image' else 'receipt.json')).as_posix()
            if link[kind]['path'] != expected:
                raise ValueError('Revision archive leaves its explicit UID/kind owner')
        validate_revision_chain(prior, overrides, depth + 1)
    if receipt.get('replacesGeneratedOutput') and receipt.get('replacesHeldReference'):
        raise ValueError('A receipt cannot replace two different prior states')


def receipt_path(receipt):
    return next(job for job in load(JOBS)['jobs'] if job['uid'] == receipt['uid'])['outputs'][receipt['kind']]['receiptPath']


def revision_bindings(receipt):
    """Enumerate validated archive inputs for source-bound registry generation."""
    for key in ['replacesGeneratedOutput', 'replacesHeldReference']:
        if key in receipt:
            link = receipt[key]
            for kind in ['image', 'receipt']:
                if kind in link:
                    yield link[kind]
            yield from revision_bindings(json.loads(bound_bytes(link['receipt']['path'])))


def generated_body_reference(name, record):
    forbidden = ('/generated/', '/studies/', '/revisions/', '/same-edition-variants/', '/documentary-variants/')
    recovered = ('recovered-positive-', 'recovered-idle-', 'resume-initial-positive', 'idle-halo-study', 'laterality-correction')
    return (name.startswith('assets/sprites/bow/') or any(part in name for part in forbidden)
            or Path(name).name.startswith(recovered) or record.get('generatedMedia') is True
            or record.get('generatedByR34') is True)


def validate_receipt(receipt, check_image=True, image_source=None, reference_overrides=None):
    if receipt.get('schema') != SCHEMA:
        raise ValueError('Unexpected R34 output receipt schema')
    uid, kind = receipt.get('uid'), receipt.get('kind')
    jobs = {job['uid']: job for job in load(JOBS)['jobs']}
    if uid not in jobs or kind not in {'portrait', 'idle'}:
        raise ValueError('Unknown fighter or asset kind')
    job = jobs[uid]
    if receipt.get('lotId') != job['lotId']:
        raise ValueError('Asset belongs to a different production lot')
    if job['historicalRefusalPreserved']:
        raise ValueError('A historical refusal cannot be retried or replaced')
    status = receipt.get('status')
    if status not in {'GENERATED', 'BLOCKED_BY_TOOL', 'HELD_REFERENCE'}:
        raise ValueError('Unexpected output state')
    if receipt.get('generator') != 'image_gen':
        raise ValueError('Only actual image_gen outputs belong to the new generation registry')
    if status != 'GENERATED':
        if receipt.get('replacesGeneratedOutput') is not None or receipt.get('replacesHeldReference') is not None:
            raise ValueError('Only a generated receipt can carry an explicit replacement chain')
        if not isinstance(receipt.get('reason'), str) or not receipt['reason'].strip():
            raise ValueError('A blocked or held output needs the actual reason')
        if status == 'HELD_REFERENCE' and not receipt.get('research'):
            raise ValueError('A held reference needs concrete research or inspection records')
        if any(receipt.get(key) for key in ['image', 'sha256', 'bytes']):
            raise ValueError('A failed/held request cannot claim output bytes')
        return job
    if receipt.get('image') != job['outputs'][kind]['outputPath']:
        raise ValueError('PNG output path differs from its assigned UID and kind')
    if receipt.get('generatedBytesEdited') is not False:
        raise ValueError('Raw tool PNG bytes must be kept unchanged')
    if not isinstance(receipt.get('prompt'), str) or not receipt['prompt'].strip():
        raise ValueError('Record the exact actual tool prompt')
    references = receipt.get('references', [])
    if not references:
        raise ValueError('Generated identity needs actual inspected source references')
    for source in references:
        raw_reference = bound_bytes(source['path'], reference_overrides)
        current = {'sha256': digest(raw_reference), 'bytes': len(raw_reference)}
        if current['sha256'] != source.get('sha256') or current['bytes'] != source.get('bytes'):
            raise ValueError('Changed or incomplete source binding: ' + source['path'])
        if source.get('exactIdentity') is not True:
            raise ValueError('A different or unqualified identity cannot be an admitted reference')
    review = receipt.get('review', {})
    observations = review.get('observations')
    if review.get('visuallyReviewed') is not True or not isinstance(observations, list) or not observations or any(not isinstance(value, str) or not value.strip() for value in observations):
        raise ValueError('Actual visual inspection with concrete observations is required')
    if review.get('canonicalFidelityCertified') is not False or review.get('originalIdleAnimationCertified') is not False:
        raise ValueError('A generated static asset cannot certify original frames or an original idle loop')
    if not isinstance(review.get('knownAppearanceGaps'), list):
        raise ValueError('Record known appearance gaps explicitly')
    if any(not isinstance(value, str) or not value.strip() for value in review['knownAppearanceGaps']):
        raise ValueError('Appearance reservations must be concrete nonempty strings')
    if kind == 'portrait' and review.get('portraitIdentityReviewed') is not True:
        raise ValueError('The portrait identity has not actually been reviewed')
    if kind == 'idle' and review.get('sourceFacing') not in {'left', 'right', 'front', 'unknown'}:
        raise ValueError('Record the actually produced body direction')
    if kind == 'idle':
        for flag in ['fullBodyVisible', 'fullBodyReviewed', 'completeBodyReferenceVerified', 'fightingPoseReviewed']:
            if type(review.get(flag)) is not bool:
                raise ValueError('Record an explicit actual body review boolean: ' + flag)
        if review.get('completeBodyReferenceVerified') is True:
            complete = review.get('completeBodyReferences')
            if not isinstance(complete, list) or not complete:
                raise ValueError('Whole-body source verification needs the actually inspected image references and observations')
            reference_hashes = {source['path']: source['sha256'] for source in references}
            for source in complete:
                if not isinstance(source, dict) or source.get('path') not in reference_hashes or source.get('sha256') != reference_hashes[source['path']] or not isinstance(source.get('observation'), str) or not source['observation'].strip():
                    raise ValueError('A complete-body reference must be used, SHA-bound and visually described')
                name = source['path']
                record = next(value for value in references if value['path'] == name)
                if generated_body_reference(name, record):
                    raise ValueError('Generated adaptations may lock style, but cannot certify an original complete-body reference')
        prior_path = local(job['outputs']['portrait']['receiptPath'])
        if prior_path.exists() and load(prior_path).get('status') == 'BLOCKED_BY_TOOL':
            raise ValueError('Do not continue the same subject after its portrait request was refused')
    validate_revision_chain(receipt, reference_overrides)
    if check_image:
        image_path = Path(image_source) if image_source is not None else local(receipt['image'])
        raw_image = image_path.read_bytes()
        info = {'bytes': len(raw_image), 'sha256': digest(raw_image)}
        if info['bytes'] != receipt.get('bytes') or info['sha256'] != receipt.get('sha256'):
            raise ValueError('Generated PNG differs from its raw output receipt')
        if info['bytes'] > 16 * 1024 * 1024:
            raise ValueError('Generated PNG exceeds the reader byte budget')
        technical = measure(image_path)
        crop = review.get('portraitCrop')
        if crop is not None:
            if kind != 'portrait' or not isinstance(crop, dict) or any(type(crop.get(key)) is not int for key in ['x', 'y', 'width', 'height']) or not (0 <= crop['x'] < technical['width'] and 0 <= crop['y'] < technical['height'] and 0 < crop['width'] <= technical['width'] - crop['x'] and 0 < crop['height'] <= technical['height'] - crop['y']):
                raise ValueError('Portrait display crop must lie inside the untouched source PNG')
    return job


@contextmanager
def uid_publication_lock(uid):
    """Serialize both asset kinds for one UID, outside all delivered trees."""
    if not isinstance(uid, str) or not uid:
        raise ValueError('An import lock needs an explicit fighter UID')
    directory = Path(tempfile.gettempdir()) / 'bow-r34-import-locks'
    if directory.is_relative_to(ROOT):
        raise ValueError('Import locks must stay outside the delivered checkout')
    try:
        directory.mkdir(mode=0o700)
    except FileExistsError:
        pass
    directory_fd = os.open(directory, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    lock_fd, locked = None, False
    try:
        info = os.fstat(directory_fd)
        if info.st_uid != os.geteuid() or info.st_mode & 0o077:
            raise ValueError('The private import lock directory has unsafe ownership or permissions')
        name = digest((str(ROOT.resolve()) + '\0' + uid).encode()) + '.lock'
        lock_fd = os.open(name, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW | os.O_NONBLOCK, 0o600, dir_fd=directory_fd)
        info = os.fstat(lock_fd)
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.geteuid() or info.st_nlink != 1 or info.st_mode & 0o077:
            raise ValueError('The import lock must be a private ordinary file, never a symlink or alias')
        fcntl.flock(lock_fd, fcntl.LOCK_EX); locked = True
        yield
    finally:
        if lock_fd is not None:
            if locked:
                fcntl.flock(lock_fd, fcntl.LOCK_UN)
            os.close(lock_fd)
        os.close(directory_fd)


def import_output(receipt, source=None, replace_sha256=None, replace_receipt_sha256=None, revision_reason=None):
    with uid_publication_lock(receipt.get('uid')):
        return _import_output_locked(receipt, source, replace_sha256, replace_receipt_sha256, revision_reason)


def _import_output_locked(receipt, source=None, replace_sha256=None, replace_receipt_sha256=None, revision_reason=None):
    """Preflight every mutation, then retain old bytes before publishing a revision."""
    receipt = copy.deepcopy(receipt)
    revision = bool(replace_sha256 or replace_receipt_sha256)
    if replace_sha256 and replace_receipt_sha256:
        raise ValueError('Choose one explicit prior output or held receipt SHA')
    if revision_reason is not None and not revision:
        raise ValueError('A revision reason requires one explicit prior SHA')
    if revision != bool(isinstance(revision_reason, str) and revision_reason.strip()):
        raise ValueError('Revision SHA and concrete revision reason are required together')
    for value in [replace_sha256, replace_receipt_sha256]:
        if value is not None and (not isinstance(value, str) or not re.fullmatch('[a-f0-9]{64}', value)):
            raise ValueError('Expected an exact lowercase SHA256 for the prior delivery')
    job = validate_receipt(receipt, check_image=False)
    if receipt['status'] == 'GENERATED':
        for kind in ['portrait', 'idle']:
            prior = local(job['outputs'][kind]['receiptPath'])
            if prior.exists() and load(prior).get('status') == 'BLOCKED_BY_TOOL':
                request = 'portrait' if kind == 'portrait' else 'body'
                raise ValueError('Do not continue the same subject after its ' + request + ' request was refused')
    destination = local(job['outputs'][receipt['kind']]['receiptPath'])
    image = local(job['outputs'][receipt['kind']]['outputPath'])
    old_receipt_raw = destination.read_bytes() if destination.exists() else None
    old_image_raw = image.read_bytes() if image.exists() else None
    archives, overrides = {}, {}
    if revision:
        if receipt['status'] != 'GENERATED' or old_receipt_raw is None:
            raise ValueError('An explicit revision needs a delivered prior receipt and new GENERATED output')
        old = json.loads(old_receipt_raw)
        expected = 'GENERATED' if replace_sha256 else 'HELD_REFERENCE'
        if old.get('status') != expected or any(old.get(field) != receipt[field] for field in ['uid', 'kind', 'lotId']):
            raise ValueError('Only the same positive output or held reference can be explicitly revised; refusals stay blocked')
        validate_receipt(old)
        old_receipt_sha = digest(old_receipt_raw)
        if replace_sha256:
            if old_image_raw is None or digest(old_image_raw) != replace_sha256 or old.get('sha256') != replace_sha256:
                raise ValueError('The prior generated PNG does not match --replace-sha256')
            folder = receipt['kind'] + '-' + replace_sha256 + '-' + old_receipt_sha
        else:
            if old_receipt_sha != replace_receipt_sha256 or old_image_raw is not None:
                raise ValueError('The held receipt SHA differs or an unclaimed output already exists')
            folder = receipt['kind'] + '-held-' + old_receipt_sha
        base = Path(job['outputs'][receipt['kind']]['receiptPath']).parent / 'revisions' / folder
        archive_receipt = (base / 'receipt.json').as_posix()
        archives[archive_receipt] = old_receipt_raw
        link = {'reason': revision_reason.strip(), 'receipt': {'path': archive_receipt, 'bytes': len(old_receipt_raw), 'sha256': old_receipt_sha}}
        if replace_sha256:
            archive_image = (base / 'image.png').as_posix()
            archives[archive_image] = old_image_raw
            link['image'] = {'path': archive_image, 'bytes': len(old_image_raw), 'sha256': replace_sha256}
            # A tool edit may have read the live old output. Preserve the actual
            # argument path while binding its identical archived bytes forever.
            for reference in receipt.get('references', []):
                if reference.get('path') == job['outputs'][receipt['kind']]['outputPath']:
                    reference['originalToolReferencePath'] = reference['path']
                    reference['path'] = archive_image
        key = 'replacesGeneratedOutput' if replace_sha256 else 'replacesHeldReference'
        for prior_key in ['replacesGeneratedOutput', 'replacesHeldReference']:
            if prior_key in receipt:
                if receipt[prior_key] != old.get(prior_key) and not (prior_key == key and receipt[prior_key] == link):
                    raise ValueError('Prepared revision chain conflicts with the actual prior delivery')
                receipt.pop(prior_key)
        receipt[key] = link
        overrides.update(archives)
        for name, raw in archives.items():
            path = local(name)
            if path.exists() and path.read_bytes() != raw:
                raise ValueError('An immutable revision archive already exists with different bytes')
    if receipt['status'] == 'GENERATED':
        if source is None:
            raise ValueError('Pass the actual tool PNG source path; no image is fabricated by this importer')
        source = Path(source).resolve()
        if revision and source == image:
            raise ValueError('A revision needs a separate actual tool output, not the currently delivered PNG')
        raw_image = source.read_bytes()
        receipt.update(image=job['outputs'][receipt['kind']]['outputPath'], bytes=len(raw_image), sha256=digest(raw_image),
                       sourceOutputPath=str(source), generatedBytesEdited=False, technical=measure(source))
        validate_receipt(receipt, image_source=source, reference_overrides=overrides)
        if not revision and old_image_raw is not None and old_image_raw != raw_image:
            raise ValueError('A previously delivered output is immutable; use an explicit revision')
    else:
        raw_image = None
        if revision:
            raise ValueError('Only a reviewed generated output can replace an old delivery')
    raw_receipt = (json.dumps(receipt, ensure_ascii=False, indent=2) + '\n').encode()
    if not revision and old_receipt_raw is not None and old_receipt_raw != raw_receipt:
        raise ValueError('An existing production receipt cannot be silently overwritten')
    # Recheck the compare-and-replace preconditions immediately before writes.
    if (destination.read_bytes() if destination.exists() else None) != old_receipt_raw or (image.read_bytes() if image.exists() else None) != old_image_raw:
        raise ValueError('The owned output changed during revision preflight')
    for name, raw in archives.items():
        path = local(name); path.parent.mkdir(parents=True, exist_ok=True)
        try:
            with path.open('xb') as stream:
                stream.write(raw)
        except FileExistsError:
            if path.read_bytes() != raw:
                raise ValueError('An immutable revision archive changed during publication')
    try:
        if raw_image is not None and old_image_raw != raw_image:
            atomic_write(image, raw_image)
        atomic_write(destination, raw_receipt)
        validate_receipt(receipt)
    except BaseException:
        if old_image_raw is None:
            image.unlink(missing_ok=True)
        else:
            atomic_write(image, old_image_raw)
        if old_receipt_raw is not None:
            atomic_write(destination, old_receipt_raw)
        else:
            destination.unlink(missing_ok=True)
        raise
    return receipt, destination


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--receipt', required=True, help='Prepared JSON receipt; can be an absolute temporary file.')
    parser.add_argument('--source', help='Actual local PNG path returned by image_gen; copied without raster edits.')
    parser.add_argument('--check', action='store_true')
    replacement = parser.add_mutually_exclusive_group()
    replacement.add_argument('--replace-sha256', help='Explicit SHA256 of the currently delivered positive PNG to archive and replace.')
    replacement.add_argument('--replace-receipt-sha256', help='Explicit SHA256 of a HELD_REFERENCE receipt to archive before importing a newly supported output.')
    parser.add_argument('--revision-reason', help='Concrete reason for the explicit positive correction or held-reference promotion.')
    args = parser.parse_args()
    receipt = load(Path(args.receipt))
    job = validate_receipt(receipt, check_image=False)
    destination = local(job['outputs'][receipt['kind']]['receiptPath'])
    if args.check:
        if args.replace_sha256 or args.replace_receipt_sha256 or args.revision_reason:
            raise ValueError('Read-only receipt checks do not perform revisions')
        validate_receipt(receipt)
        assert destination.read_bytes() == Path(args.receipt).read_bytes(), 'Check the owned receipt file itself.'
        print(json.dumps({'uid': receipt['uid'], 'kind': receipt['kind'], 'status': receipt['status'], 'current': True}))
        return
    receipt, destination = import_output(receipt, args.source, args.replace_sha256, args.replace_receipt_sha256, args.revision_reason)
    print(json.dumps({'uid': receipt['uid'], 'kind': receipt['kind'], 'status': receipt['status'], 'receipt': destination.relative_to(ROOT).as_posix()}))


if __name__ == '__main__':
    main()
