#!/usr/bin/env python3
"""Verify all committed R23 snapshots and inventory moving-image source links."""
import argparse
import gzip
import hashlib
import html
from html.parser import HTMLParser
import io
import json
from pathlib import Path
import re
from urllib.parse import urljoin

ROOT=Path(__file__).resolve().parents[1]
LIMIT=6*1024*1024
MEDIA=re.compile(r'\.(?:gif|webp|apng|mp4|webm|mov|m4v)(?:[/?#]|$)',re.I)


class Links(HTMLParser):
    def __init__(self,url):
        super().__init__(convert_charrefs=True)
        self.url=url
        self.candidates=set()
        self.embeds=[]

    def handle_starttag(self,tag,attributes):
        values=dict(attributes)
        for key in ['href','src','data-src','data-original','poster']:
            if values.get(key):
                url=urljoin(self.url,values[key])
                if MEDIA.search(url):
                    self.candidates.add(url)
                if tag in ['video','source','iframe','embed','object']:
                    self.embeds.append({'tag':tag,'attribute':key,'url':url})


def scan():
    folder=ROOT/'modules/fidelity-r23/canonical'
    manifest=json.loads((folder/'manifest.json').read_text())
    records=[]
    unique_raw=set()
    for source in manifest['sources']:
        path=(folder/source['snapshot']).resolve(strict=True)
        if not path.is_relative_to(folder.resolve()) or path.is_symlink():
            raise ValueError('Unsafe snapshot path')
        compressed=path.read_bytes()
        if hashlib.sha256(compressed).hexdigest()!=source['snapshot_sha256']:
            raise ValueError('Compressed snapshot SHA-256 mismatch')
        with gzip.GzipFile(fileobj=io.BytesIO(compressed)) as stream:
            raw=stream.read(LIMIT+1)
        if len(raw)>LIMIT or len(raw)!=source['raw_bytes'] or hashlib.sha256(raw).hexdigest()!=source['raw_sha256']:
            raise ValueError('Raw snapshot size/SHA-256 mismatch')
        unique_raw.add(source['raw_sha256'])
        parser=Links(source['url'])
        parser.feed(raw.decode('utf-8','replace'))
        # Include literal links in source data as well as lazy image attributes.
        literal=html.unescape(raw.decode('utf-8','replace')).replace('\\/','/')
        urls=set(re.findall(r'https?[^\s<>"\']+',literal))
        parser.candidates.update(url for url in urls if MEDIA.search(url))
        candidates=sorted(parser.candidates)
        records.append({'sourceId':source['id'],'sourceUrl':source['url'],'rawSha256':source['raw_sha256'],
          'snapshot':str(path.relative_to(ROOT)),'movingImageCandidates':candidates,'embeds':parser.embeds})
    urls=sorted(set(url for record in records for url in record['movingImageCandidates']))
    subject_urls=[url for url in urls if 'resources.blogblog.com/img/icon18_edit_allbkg.gif' not in url]
    return {'schema':'re.bow.motion-source-scan-r24/1','summary':{'sourceSnapshotsVerified':len(records),
      'uniqueRawPages':len(unique_raw),'catalogueIdentities':len(manifest['entries']),
      'uniqueCandidateUrls':len(urls),'subjectCandidateUrls':len(subject_urls),
      'embeddedMediaReferences':sum(len(record['embeds']) for record in records)},
      'subjectCandidates':subject_urls,'excludedSiteUi':['https://resources.blogblog.com/img/icon18_edit_allbkg.gif'],
      'sources':records,'limitations':['A GIF extension is not proof of multiple frames or defined timing.',
        'This deterministic scan covers committed R23 snapshots; newly discovered model archives are audited separately.',
        'Absence of a literal link does not prove a source website or game has no animations.']}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true')
    args=parser.parse_args()
    result=scan()
    target=ROOT/'docs/R24_MOTION_SCAN.json'
    if args.check:
        if json.loads(target.read_text())!=result:
            raise ValueError('Committed source-motion scan differs from current verified snapshots')
    else:
        target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'mode':'check' if args.check else 'export',**result['summary']}))


if __name__=='__main__':
    main()
