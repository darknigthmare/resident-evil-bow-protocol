#!/usr/bin/env python3
"""Import cached, page-bound static references without authoring or certifying art."""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import unicodedata
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, urlunsplit

from PIL import Image

PROJECT = Path(__file__).resolve().parents[1]
MAX_PAGE_BYTES = 5 * 1024 * 1024
MAX_IMAGE_BYTES = 64 * 1024 * 1024
MAX_PIXELS = 32 * 1024 * 1024


def digest(data):
    return hashlib.sha256(data).hexdigest()


def url(value):
    parts = urlsplit(value)
    if parts.scheme != 'https' or not parts.hostname or parts.username or parts.password:
        raise ValueError('Only credential-free HTTPS source URLs are accepted')
    return urlunsplit((parts.scheme, parts.netloc.lower(), parts.path.rstrip('/'), parts.query, ''))


def normalized(value):
    for letter, name in {'α': 'alpha', 'β': 'beta', 'γ': 'gamma', 'μ': 'mu'}.items():
        value = value.replace(letter, name)
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().lower()
    return ' '.join(re.findall(r'[a-z0-9]+', value))


def route_subject(value):
    # EvilResource adds route qualifiers that its displayed subject title omits.
    # They identify a source page, not proof of that exact form or equipment.
    for suffix in ['-enemy', '-zombie', '-helicopter']:
        if value.endswith(suffix):
            value = value[:-len(suffix)]
            break
    return normalized(value).replace(' ', '')


def same_subject_url(requested, effective):
    original, observed = urlsplit(requested), urlsplit(effective)
    a, b = original.path.strip('/').split('/'), observed.path.strip('/').split('/')
    return (observed.hostname in {'www.evilresource.com', 'evilresource.com'}
            and len(a) == len(b) == 3 and a[:2] == b[:2] and a[1] == 'enemies'
            and route_subject(a[2]) == route_subject(b[2]) and original.query == observed.query)


class PageImages(HTMLParser):
    def __init__(self, page_url):
        super().__init__(convert_charrefs=True)
        self.page_url, self.images, self.titles = page_url, set(), []
        self.in_title, self.in_json, self.json_text = False, False, []

    def add_image(self, value):
        if isinstance(value, str):
            try:
                self.images.add(url(urljoin(self.page_url, value)))
            except ValueError:
                pass
        elif isinstance(value, list):
            for item in value:
                self.add_image(item)
        elif isinstance(value, dict):
            self.add_image(value.get('url') or value.get('contentUrl'))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'title':
            self.in_title = True
        if tag == 'meta' and (attrs.get('property') or attrs.get('name', '')).lower() in {
            'og:image', 'thumbnail', 'twitter:image', 'twitter:image:src'
        }:
            self.add_image(attrs.get('content'))
        if tag == 'script' and attrs.get('type', '').lower() == 'application/ld+json':
            self.in_json, self.json_text = True, []

    def handle_data(self, data):
        if self.in_title:
            self.titles.append(data)
        if self.in_json:
            self.json_text.append(data)

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        if tag == 'script' and self.in_json:
            self.in_json = False
            try:
                documents = json.loads(''.join(self.json_text))
                self.inspect_json(documents)
            except (ValueError, TypeError):
                pass

    def inspect_json(self, documents):
        for item in documents if isinstance(documents, list) else [documents]:
            if not isinstance(item, dict):
                continue
            self.add_image(item.get('primaryImageOfPage'))
            self.add_image(item.get('image'))
            if isinstance(item.get('mainEntity'), dict):
                self.add_image(item['mainEntity'].get('image'))
            if isinstance(item.get('@graph'), list):
                self.inspect_json(item['@graph'])


def cached_file(cache_root, relative, maximum):
    if not isinstance(relative, str) or Path(relative).is_absolute():
        raise ValueError('Cache paths must be relative to --cache-root')
    candidate = cache_root / relative
    if '..' in Path(relative).parts or candidate.is_symlink():
        raise ValueError('Unsafe cache path')
    resolved = candidate.resolve(strict=True)
    if not resolved.is_relative_to(cache_root) or not resolved.is_file():
        raise ValueError('Cache file escapes its root')
    for parent in candidate.parents:
        if parent == cache_root:
            break
        if parent.is_symlink():
            raise ValueError('Symlinked cache directories are not accepted')
    if resolved.stat().st_size > maximum:
        raise ValueError('Cached file exceeds the size limit')
    return resolved, resolved.read_bytes()


def cache_record(cache_root, relative, maximum):
    _, encoded = cached_file(cache_root, relative, 1024 * 1024)
    record = json.loads(encoded)
    if record.get('http_status') != 200 or record.get('body_truncated') is not False:
        raise ValueError('Only complete HTTP 200 cache records are accepted')
    if not record.get('observed_at_utc'):
        raise ValueError('Cache record has no observation time')
    for forbidden in ['canonical_fidelity_certified', 'final_art', 'combat_integrated', 'mirrored', 'generated']:
        if record.get(forbidden):
            raise ValueError('Cache metadata cannot declare final, generated or mirrored art')
    source_path, data = cached_file(cache_root, record['body_path'], maximum)
    if record.get('body_sha256') != digest(data) or record.get('body_bytes') != len(data):
        raise ValueError('Cached bytes differ from their fetch record')
    record['requested_url'] = url(record['requested_url'])
    record['effective_url'] = url(record['effective_url'])
    return record, data, source_path


def catalogue(project):
    roster = json.loads((project / 'data/roster.json').read_text())
    expansion = json.loads((project / 'data/catalog-expansion-v070.json').read_text())
    principal = {item['uid'] for item in roster['fighters']}
    contextual = {item['id'] for item in expansion['records'] if item['classification'] == 'contextual'}
    return {item['id']: {**item, 'reference_kind': 'context-scene' if item['id'] in contextual else 'fighter-body',
                         'scope': 'contextual' if item['id'] in contextual else 'main' if item['id'] in principal else 'experimental'}
            for item in roster['catalog']}


def prepare(entry, cache_root, identities):
    if set(entry) != {'id', 'page_metadata', 'image_metadata'}:
        raise ValueError('Each entry accepts only id, page_metadata and image_metadata; no review/facing overrides')
    identity = identities.get(entry['id'])
    if identity is None:
        raise ValueError('Unknown catalogue identity: ' + str(entry['id']))
    expected_url = url(identity['sourcePage'])
    parts = urlsplit(expected_url)
    components = parts.path.strip('/').split('/')
    if parts.hostname not in {'www.evilresource.com', 'evilresource.com'} or len(components) != 3 or components[1] != 'enemies':
        raise ValueError('A per-enemy EvilResource page is required; generic blog cover images are not identity art')
    page, body, _ = cache_record(cache_root, entry['page_metadata'], MAX_PAGE_BYTES)
    if page['requested_url'] != expected_url or not same_subject_url(expected_url, page['effective_url']):
        raise ValueError('Fetched page URL does not match this catalogue incarnation')
    if page.get('usable_document') is not True:
        raise ValueError('Source page was not recorded as a usable document')
    parsed = PageImages(page['effective_url'])
    parsed.feed(body.decode('utf-8', errors='strict'))
    title = ' '.join(parsed.titles)
    title_cue = normalized(title)
    game_cue = normalized(components[0])
    game_cues = {game_cue}
    if game_cue == 'resident evil zero':
        game_cues.add('resident evil 0')
    if game_cue.startswith('resident evil 7'):
        game_cues.add(game_cue.replace('resident evil 7', 'resident evil 7 biohazard', 1))
    game_title = re.search(r'\(([^()]+)\)\s*(?:\||$)', title)
    if route_subject(components[2]) not in title_cue.replace(' ', '') or not game_title or normalized(game_title.group(1)) not in game_cues:
        raise ValueError('Fetched page title does not identify the expected enemy and source game')
    image, image_bytes, image_path = cache_record(cache_root, entry['image_metadata'], MAX_IMAGE_BYTES)
    if image['requested_url'] not in parsed.images:
        raise ValueError('Downloaded image URL is not a primary image declared in the fetched source page')
    if image.get('usable_image') is not True or image.get('decoded_verified') is not True or image.get('response_bytes_preserved') is not True or image.get('pixels_transformed') is not False:
        raise ValueError('Image cache must attest a decoded, unmodified response body')
    bindings = image.get('source_page_bindings', [])
    if not any(binding.get('page_requested_url') == expected_url and binding.get('page_effective_url') == page['effective_url']
               and binding.get('page_body_sha256') == page['body_sha256'] and identity['id'] in binding.get('identity_ids', [])
               and binding.get('automatic_identity_binding_allowed') is True for binding in bindings):
        raise ValueError('Image fetch record is not bound to this fetched page, hash and identity')
    if any(part in {'sprites', 'generated', 'imagegen'} for part in image_path.parts):
        raise ValueError('Generated/presentation sprite paths cannot be imported as source references')
    with Image.open(io.BytesIO(image_bytes)) as original:
        if original.format not in {'PNG', 'WEBP'} or getattr(original, 'is_animated', False):
            raise ValueError('Only static PNG/WebP references are supported')
        if original.width * original.height > MAX_PIXELS or min(original.size) < 1:
            raise ValueError('Unsupported image dimensions')
        original.load()
        rgba = original.convert('RGBA')
        size = original.size
        if image.get('width') != size[0] or image.get('height') != size[1] or image.get('decoded_rgba_sha256') != digest(rgba.tobytes()):
            raise ValueError('Decoded image differs from its fetch review')
        if original.format == 'PNG':
            output_bytes = image_bytes
            conversion = 'none; original PNG bytes retained'
        else:
            output = io.BytesIO()
            rgba.save(output, format='PNG')
            output_bytes = output.getvalue()
            conversion = 'WebP decoded to PNG; RGBA pixels and dimensions unchanged'
        with Image.open(io.BytesIO(output_bytes)) as check:
            check.load()
            if check.size != size or check.convert('RGBA').tobytes() != rgba.tobytes():
                raise ValueError('Output differs from the decoded source pixels')
        pixel_sha = digest(rgba.tobytes())
    record = {
        'schema': 're.bow.source-reference/1', 'id': identity['id'], 'name': identity['name'],
        'source_game': identity['game'], 'scope': identity['scope'], 'reference_kind': identity['reference_kind'],
        'image': identity['id'] + '/reference.png', 'width': size[0], 'height': size[1],
        'sha256': digest(output_bytes), 'rgba_sha256': pixel_sha, 'source_conversion': conversion,
        'source_page': {'url': page['effective_url'], 'title': title, 'sha256': page['body_sha256'], 'observed_at_utc': page['observed_at_utc']},
        'source_image': {'url': image['effective_url'], 'requested_url': image['requested_url'], 'sha256': image['body_sha256'], 'observed_at_utc': image['observed_at_utc']},
        'source_classification': 'secondary-community-reference', 'available_states': ['reference'],
        'facing': 'unreviewed', 'can_mirror': False, 'modular_parts': False, 'animated': False,
        'combat_integrated': False, 'final_art': False, 'canonical_fidelity_certified': False,
        'remaining_review': 'Native-game authenticity, exact form/equipment, geometry, complete anatomy, opposite view, motion and audio remain unproven by this static secondary reference.'
    }
    return record, output_bytes


def write_preserving(path, contents):
    if path.exists():
        if path.is_symlink() or path.read_bytes() != contents:
            raise ValueError('Refusing to overwrite different existing output: ' + str(path))
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('xb') as stream:
        stream.write(contents)


def import_references(manifest_path, cache_root, output_root, project=PROJECT):
    cache_root, output_root = Path(cache_root).resolve(strict=True), Path(output_root).absolute()
    manifest = json.loads(Path(manifest_path).read_text())
    if set(manifest) != {'schema', 'entries'} or manifest['schema'] != 're.bow.source-reference-import/1':
        raise ValueError('Invalid source-reference import request')
    entries = manifest['entries']
    if not isinstance(entries, list) or not entries or len(entries) > 389:
        raise ValueError('Import requires between 1 and 389 entries')
    if len({entry.get('id') for entry in entries}) != len(entries):
        raise ValueError('Duplicate identity in import request')
    identities = catalogue(Path(project))
    prepared = [prepare(entry, cache_root, identities) for entry in entries]
    counts = {'imported_static_references': len(prepared),
              'fighter_body_references': sum(r['reference_kind'] == 'fighter-body' for r, _ in prepared),
              'context_scene_references': sum(r['reference_kind'] == 'context-scene' for r, _ in prepared),
              'canonical_fidelity_certified': 0, 'final_art': 0, 'animated_clips': 0}
    pack = {'schema': 're.bow.source-reference-pack/1',
            'scope': 'Page-bound static secondary references; original-game fidelity and final production remain unreviewed.',
            'counts': counts, 'entries': [record for record, _ in prepared]}
    for parent in [output_root, *output_root.parents]:
        if parent.is_symlink():
            raise ValueError('Symlinked output paths are not accepted')
    # Validate every input before creating output files. Existing distinct outputs are preserved.
    expected = []
    for record, encoded in prepared:
        folder = output_root / record['id']
        if folder.is_symlink():
            raise ValueError('Symlinked identity output path')
        expected.extend([(folder / 'reference.png', encoded), (folder / 'source-reference.json', (json.dumps(record, ensure_ascii=False, indent=2) + '\n').encode())])
    expected.append((output_root / 'manifest.json', (json.dumps(pack, ensure_ascii=False, indent=2) + '\n').encode()))
    for destination, contents in expected:
        if destination.exists() and (destination.is_symlink() or destination.read_bytes() != contents):
            raise ValueError('Refusing to overwrite different existing output: ' + str(destination))
    for destination, contents in expected:
        write_preserving(destination, contents)
    return {**counts, 'output': str(output_root), 'manifest': str(output_root / 'manifest.json')}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache-root', type=Path, required=True)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=PROJECT / 'qa-source-references-r21')
    args = parser.parse_args()
    try:
        print(json.dumps(import_references(args.manifest, args.cache_root, args.output), ensure_ascii=False))
    except (ValueError, KeyError, OSError, Image.DecompressionBombError) as error:
        parser.exit(1, 'Source-reference import refused: ' + str(error) + '\n')
