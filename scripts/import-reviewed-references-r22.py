#!/usr/bin/env python3
"""Import explicitly reviewed named references; never infer identity from blog order."""
from __future__ import annotations

import argparse
import importlib.util
import io
import json
from pathlib import Path
import re
from html.parser import HTMLParser
from urllib.parse import unquote, urljoin, urlsplit

from PIL import Image

PROJECT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('source_reference_r21', PROJECT / 'scripts/import-source-references-r21.py')
BASE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BASE)
VIEW_SCOPES = {'named-body-reference': 'body', 'portrait-reference': 'portrait',
               'scene-reference': 'scene', 'context-scene': 'scene'}


def text(value):
    return ' '.join(value.split())


def blogger_asset(value):
    parsed = urlsplit(BASE.url(value))
    if parsed.hostname != 'blogger.googleusercontent.com':
        return None
    components = parsed.path.strip('/').split('/')
    # A public Blogger size selector may be the last or penultimate component.
    if components and re.fullmatch(r'(?:s\d+(?:-[\w-]+)?|w\d+(?:-h\d+)?(?:-[\w-]+)?)', components[-1]):
        components.pop()
    elif len(components) > 1 and re.fullmatch(r'(?:s\d+(?:-[\w-]+)?|w\d+(?:-h\d+)?(?:-[\w-]+)?)', components[-2]):
        components.pop(-2)
    return parsed.scheme, parsed.netloc, tuple(components), parsed.query


def original_rendition(declared, requested, rendition):
    declared, requested = BASE.url(declared), BASE.url(requested)
    if declared == requested:
        return True
    parts = urlsplit(requested).path.strip('/').split('/')
    return (rendition == 'blogger-original-size' and 's0' in parts[-2:]
            and blogger_asset(declared) is not None and blogger_asset(declared) == blogger_asset(requested))


class SourceDocument(HTMLParser):
    """Record image positions and text on both sides; do not assign headings."""
    def __init__(self, page_url):
        super().__init__(convert_charrefs=True)
        self.page_url, self.tokens, self.images, self.meta_images = page_url, [], [], set()
        self.skipped, self.in_title, self.title = 0, False, []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {'script', 'style', 'noscript'}:
            self.skipped += 1
        if tag == 'title':
            self.in_title = True
        if self.skipped:
            return
        if tag == 'meta' and (attrs.get('property') or attrs.get('name', '')).lower() in {'og:image', 'twitter:image', 'thumbnail'}:
            if attrs.get('content'):
                self.meta_images.add(BASE.url(urljoin(self.page_url, attrs['content'])))
        if tag == 'img' and attrs.get('src'):
            self.images.append({'url': BASE.url(urljoin(self.page_url, attrs['src'])),
                                'position': len(self.tokens), 'alt': attrs.get('alt', '')})
            self.tokens.append(' ')

    def handle_endtag(self, tag):
        if tag in {'script', 'style', 'noscript'} and self.skipped:
            self.skipped -= 1
        if tag == 'title':
            self.in_title = False

    def handle_data(self, value):
        if self.in_title:
            self.title.append(value)
        if not self.skipped and not self.in_title:
            self.tokens.append(text(value))

    def contexts(self, declared_url):
        contexts = []
        for image in self.images:
            if image['url'] != declared_url:
                continue
            position = image['position']
            before = text(' '.join(self.tokens[:position]))[-4000:]
            after = text(' '.join(self.tokens[position:]))[:4000]
            contexts.append(before + ' ' + after)
        return contexts


def prepare(entry, cache_root, identities):
    if not isinstance(entry, dict) or set(entry) != {'id', 'page_metadata', 'image_metadata', 'curation'}:
        raise ValueError('Each reviewed import requires id, page_metadata, image_metadata and explicit curation')
    identity = identities.get(entry['id'])
    if identity is None:
        raise ValueError('Unknown catalogue identity')
    review = entry['curation']
    required = {'reviewed', 'review_method', 'source_game', 'specific_form', 'source_heading', 'adjacent_text',
                'visual_review_note', 'limitations', 'image_scope', 'phase_ambiguity',
                'reviewed_image_sha256', 'reviewed_page_sha256'}
    if not isinstance(review, dict) or not required.issubset(review):
        raise ValueError('Explicit image/form/text review and reviewed hashes are required')
    if review['reviewed'] is not True or review['phase_ambiguity'] is not False or 'visual' not in review['review_method'].lower():
        raise ValueError('Unreviewed images and ambiguous phases cannot be imported')
    if review['source_game'] != identity['game']:
        raise ValueError('Reviewed source game differs from this catalogue incarnation')
    if any(not isinstance(review[field], str) or not text(review[field]) for field in
           ['specific_form', 'source_heading', 'adjacent_text', 'visual_review_note']):
        raise ValueError('Named form, heading, adjacent evidence and visual notes must be nonempty')
    if review['image_scope'] not in VIEW_SCOPES or not isinstance(review['limitations'], list) or not review['limitations']:
        raise ValueError('A truthful view scope and remaining limitations are required')
    if identity['reference_kind'] == 'context-scene' and VIEW_SCOPES[review['image_scope']] != 'scene':
        raise ValueError('A contextual encounter cannot be imported as a fighter body')
    for source in [entry, review]:
        if any(source.get(flag) for flag in ['canonical_fidelity_certified', 'final_art', 'can_mirror', 'mirrored', 'generated', 'combat_integrated']):
            raise ValueError('Review cannot claim generated, mirrored or final canonical art')
    page, page_bytes, _ = BASE.cache_record(cache_root, entry['page_metadata'], BASE.MAX_PAGE_BYTES)
    expected_page = BASE.url(identity['sourcePage'])
    if page['requested_url'] != expected_page or page['effective_url'] != expected_page or page.get('usable_document') is not True:
        raise ValueError('Reviewed source page must match this catalogue source and a usable complete fetch')
    if review['reviewed_page_sha256'] != page['body_sha256']:
        raise ValueError('Review no longer matches the fetched source page')
    document = SourceDocument(page['effective_url'])
    document.feed(page_bytes.decode('utf-8', errors='strict'))
    image, original_bytes, image_path = BASE.cache_record(cache_root, entry['image_metadata'], BASE.MAX_IMAGE_BYTES)
    if image.get('decoded_verified') is not True or image.get('response_bytes_preserved') is not True or image.get('pixels_transformed') is not False:
        raise ValueError('Image must be an unmodified, decoded fetch response')
    if review['reviewed_image_sha256'] != image['body_sha256']:
        raise ValueError('Visual review no longer matches the downloaded image')
    declared = BASE.url(image['declared_url'])
    if not original_rendition(declared, image['requested_url'], image.get('source_rendition')):
        raise ValueError('Requested image is not the declared image or its same-asset Blogger original-size rendition')
    if image['effective_url'] != image['requested_url']:
        raise ValueError('An image redirect requires a separate explicit review')
    contexts = document.contexts(declared)
    if not contexts:
        raise ValueError('Reviewed image does not occur as an actual image in the fetched source page')
    if any(declared == candidate or blogger_asset(declared) is not None and blogger_asset(declared) == blogger_asset(candidate)
           for candidate in document.meta_images):
        raise ValueError('A generic page cover cannot be assigned as a named identity reference')
    if re.search(r'(?:cover|boxart|banner|logo)', unquote(urlsplit(declared).path), re.I):
        raise ValueError('Cover/banner/logo image is not a named subject reference')
    heading, adjacent = text(review['source_heading']), text(review['adjacent_text'])
    if not any(heading in context and adjacent in context for context in contexts):
        raise ValueError('Named heading and adjacent text do not occur near this exact image')
    if any(component in {'sprites', 'generated', 'imagegen'} for component in image_path.parts):
        raise ValueError('Presentation/generated image paths are not original source responses')
    with Image.open(io.BytesIO(original_bytes)) as original:
        if original.format not in {'PNG', 'WEBP', 'JPEG'} or getattr(original, 'is_animated', False):
            raise ValueError('Only static PNG/WebP/JPEG source images are accepted here')
        if original.width * original.height > BASE.MAX_PIXELS:
            raise ValueError('Unsupported source image dimensions')
        original.load()
        rgba = original.convert('RGBA')
        if (image.get('width'), image.get('height')) != original.size or image.get('decoded_rgba_sha256') != BASE.digest(rgba.tobytes()):
            raise ValueError('Decoded image differs from its fetched dimensions or pixels')
        if original.format == 'PNG':
            encoded, conversion = original_bytes, 'none; original PNG response bytes retained'
        else:
            out = io.BytesIO()
            rgba.save(out, format='PNG')
            encoded, conversion = out.getvalue(), original.format + ' decoded to PNG; RGBA pixels retained exactly'
        with Image.open(io.BytesIO(encoded)) as check:
            check.load()
            if check.size != original.size or check.convert('RGBA').tobytes() != rgba.tobytes():
                raise ValueError('Imported image differs from source pixels')
        dimensions, pixel_hash = original.size, BASE.digest(rgba.tobytes())
    record = {
        'schema': 're.bow.reviewed-source-reference/1', 'id': identity['id'], 'name': identity['name'],
        'source_game': identity['game'], 'scope': identity['scope'], 'reference_kind': identity['reference_kind'],
        'image': identity['id'] + '/reference.png', 'width': dimensions[0], 'height': dimensions[1],
        'sha256': BASE.digest(encoded), 'rgba_sha256': pixel_hash, 'source_conversion': conversion,
        'view_scope': VIEW_SCOPES[review['image_scope']], 'exact_form_confidence': 'reviewed-source-reference',
        'visible_review': {'identity_and_form_reviewed': True, 'phase_ambiguity': False, 'review_method': review['review_method'],
                           'notes': review['visual_review_note'], 'limitations': review['limitations']},
        'curation': review,
        'source_page': {'url': page['effective_url'], 'title': text(' '.join(document.title)), 'sha256': page['body_sha256'], 'observed_at_utc': page['observed_at_utc']},
        'source_image': {'url': image['effective_url'], 'requested_url': image['requested_url'], 'declared_url': declared,
                         'sha256': image['body_sha256'], 'observed_at_utc': image['observed_at_utc']},
        'source_classification': 'reviewed-secondary-community-reference', 'available_states': ['reference'],
        'facing': 'unreviewed', 'can_mirror': False, 'modular_parts': False, 'animated': False,
        'combat_integrated': False, 'final_art': False, 'canonical_fidelity_certified': False,
    }
    return record, encoded


def import_references(manifest_path, cache_root, output_root, project=PROJECT):
    cache_root, output_root = Path(cache_root).resolve(strict=True), Path(output_root).absolute()
    request = json.loads(Path(manifest_path).read_text())
    if not isinstance(request, dict) or set(request) != {'schema', 'entries'} or request['schema'] != 're.bow.reviewed-source-import/1':
        raise ValueError('Invalid reviewed-source import request')
    entries = request['entries']
    if not isinstance(entries, list) or not entries or len(entries) > 389 or len({entry.get('id') for entry in entries}) != len(entries):
        raise ValueError('A request must contain 1–389 distinct catalogue identities')
    identities = BASE.catalogue(Path(project))
    prepared = [prepare(entry, cache_root, identities) for entry in entries]
    counts = {'imported_static_references': len(prepared), 'fighter_body_references': sum(r['reference_kind'] == 'fighter-body' for r, _ in prepared),
              'context_scene_references': sum(r['reference_kind'] == 'context-scene' for r, _ in prepared),
              'named_body_views': sum(r['view_scope'] == 'body' for r, _ in prepared),
              'portrait_views': sum(r['view_scope'] == 'portrait' for r, _ in prepared),
              'scene_views': sum(r['view_scope'] == 'scene' for r, _ in prepared),
              'canonical_fidelity_certified': 0, 'final_art': 0, 'animated_clips': 0, 'modular_rigs': 0}
    pack = {'schema': 're.bow.reviewed-source-reference-pack/1',
            'scope': 'Explicitly reviewed static named references; no native-authenticity, geometry, animation or final 1:1 certification.',
            'counts': counts, 'entries': [record for record, _ in prepared]}
    for parent in [output_root, *output_root.parents]:
        if parent.is_symlink():
            raise ValueError('Symlinked output paths are not accepted')
    outputs = [(output_root / 'manifest.json', (json.dumps(pack, ensure_ascii=False, indent=2) + '\n').encode())]
    for record, encoded in prepared:
        folder = output_root / record['id']
        if folder.is_symlink():
            raise ValueError('Symlinked identity output path')
        outputs += [(folder / 'reference.png', encoded), (folder / 'source-reference.json', (json.dumps(record, ensure_ascii=False, indent=2) + '\n').encode())]
    for destination, contents in outputs:
        if destination.exists() and (destination.is_symlink() or destination.read_bytes() != contents):
            raise ValueError('Refusing to overwrite different existing output: ' + str(destination))
    for destination, contents in outputs:
        BASE.write_preserving(destination, contents)
    return {**counts, 'output': str(output_root), 'manifest': str(output_root / 'manifest.json')}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache-root', type=Path, required=True)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=PROJECT / 'qa-source-references-r22')
    args = parser.parse_args()
    try:
        print(json.dumps(import_references(args.manifest, args.cache_root, args.output), ensure_ascii=False))
    except (ValueError, KeyError, OSError, Image.DecompressionBombError) as error:
        parser.exit(1, 'Reviewed source import refused: ' + str(error) + '\n')
