#!/usr/bin/env python3
"""Collect existing catalogue references without asserting canonical fidelity.

HTML and all remote text remain untrusted source data. No downloaded resource is
executed. urllib preserves the session proxy; TLS verification is always enabled.
"""
from __future__ import annotations
import argparse, concurrent.futures, hashlib, html, json, os, re, ssl, sys, time
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
import unicodedata

SCRIPT_ROOT=Path(__file__).resolve().parents[1]
ROOT=SCRIPT_ROOT if (SCRIPT_ROOT/'data/roster.json').is_file() else Path('/workspace/resident-evil-bow-protocol')
OUT=ROOT/'qa-source-research-r21'
LIMIT=4*1024*1024

def utc():
    return datetime.now(timezone.utc).isoformat()

def norm(value):
    return re.sub(r'[^a-z0-9]+',' ',unicodedata.normalize('NFKD',str(value)).encode('ascii','ignore').decode().lower()).strip()

class Document(HTMLParser):
    def __init__(self, base):
        super().__init__(convert_charrefs=True)
        self.base=base; self.title=[]; self.headings=[]; self.meta={}
        self.main_text=[]; self.links=[]; self.images=[]; self.media=[]
        self.title_on=False; self.heading=None; self.main_depth=0
        self.ignore=0; self.json_on=False; self.json_buf=[]; self.jsonld=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='title': self.title_on=True
        if tag in ('h1','h2','h3'): self.heading=[tag,[]]
        if self.main_depth: self.main_depth+=1
        elif tag in ('main','article'): self.main_depth=1
        if tag in ('script','style','noscript'):
            self.ignore+=1
            if tag=='script' and a.get('type')=='application/ld+json': self.json_on=True; self.json_buf=[]
        if tag=='meta':
            key=a.get('name') or a.get('property')
            if key and a.get('content'): self.meta[key]=a['content']
        if tag=='a' and a.get('href') and self.main_depth:
            self.links.append(urljoin(self.base,a['href']))
        if tag=='img' and a.get('src') and self.main_depth:
            self.images.append({'url':urljoin(self.base,a['src']),'alt':a.get('alt',''),'width':a.get('width'),'height':a.get('height')})
        if tag in ('iframe','video','source','audio') and (a.get('src') or a.get('data-src')):
            self.media.append({'tag':tag,'url':urljoin(self.base,a.get('src') or a['data-src'])})
    def handle_startendtag(self,tag,attrs):
        self.handle_starttag(tag,attrs)
        self.handle_endtag(tag)
    def handle_endtag(self,tag):
        if tag=='title': self.title_on=False
        if self.heading and tag==self.heading[0]:
            self.headings.append(' '.join(' '.join(self.heading[1]).split())); self.heading=None
        if tag=='script' and self.json_on:
            try: self.jsonld.append(json.loads(''.join(self.json_buf)))
            except (ValueError,TypeError): pass
            self.json_on=False
        if tag in ('script','style','noscript') and self.ignore: self.ignore-=1
        # Track the semantic container itself rather than nesting void tags.
        if tag in ('main','article'): self.main_depth=0
    def handle_data(self,data):
        if self.json_on: self.json_buf.append(data)
        if self.title_on: self.title.append(data)
        if self.heading and not self.ignore: self.heading[1].append(data)
        if self.main_depth and not self.ignore and data.strip(): self.main_text.append(data.strip())

def json_entities(value):
    if isinstance(value,dict):
        yield value
        for key in ('mainEntity','@graph'):
            if key in value: yield from json_entities(value[key])
    elif isinstance(value,list):
        for item in value: yield from json_entities(item)

def parse_page(body,url):
    text=body.decode('utf-8','replace')
    p=Document(url); p.feed(text)
    article=[]
    for item in p.jsonld:
        article.extend(json_entities(item))
    bodytexts=list(dict.fromkeys(x['articleBody'] for x in article if isinstance(x.get('articleBody'),str)))
    primary=[]
    for key in ('og:image','thumbnail','twitter:image'):
        if p.meta.get(key): primary.append(urljoin(url,p.meta[key]))
    for x in article:
        val=x.get('primaryImageOfPage') or x.get('image')
        if isinstance(val,str): primary.append(urljoin(url,val))
    links=list(dict.fromkeys(u for u in p.links if urlparse(u).scheme in ('http','https')))
    images=[]; seen=set()
    for x in p.images:
        if x['url'] not in seen: images.append(x);seen.add(x['url'])
    challenge=bool(re.search(r'just a moment|verify you are human|please contact the site owner|enable javascript and cookies to continue',text,re.I))
    return {
        'title':' '.join(' '.join(p.title).split()),
        'headings':list(dict.fromkeys(p.headings)),
        'description':p.meta.get('description') or p.meta.get('og:description') or '',
        'article_text':'\n\n'.join(bodytexts)[:40000],
        'main_text':'\n'.join(p.main_text)[:50000],
        'primary_image_urls':list(dict.fromkeys(primary)),
        'same_page_images':images,
        'same_page_media':p.media,
        'same_page_links':links,
        'challenge_page_detected':challenge,
        'structured_entities':[{'type':x.get('@type'),'name':x.get('name'),'headline':x.get('headline'),'articleSection':x.get('articleSection'),'dateModified':x.get('dateModified')} for x in article],
    }

def fetch(url,refresh=False):
    key=hashlib.sha256(url.encode()).hexdigest()[:24]
    folder=OUT/'catalog-pages'; folder.mkdir(parents=True,exist_ok=True)
    meta_path=folder/(key+'.json'); body_path=folder/(key+'.html')
    if not refresh and meta_path.exists():
        result=json.loads(meta_path.read_text())
        cached_body=(OUT/result.get('body_path','')).resolve()
        cache_valid=bool(result.get('requested_url')==url and cached_body.is_relative_to(OUT.resolve()) and cached_body.is_file() and hashlib.sha256(cached_body.read_bytes()).hexdigest()==result.get('body_sha256'))
        if cache_valid:
            result['cache_reused']=True
            return result
    result={'requested_url':url,'observed_at_utc':utc(),'http_status':None,'effective_url':None,'error':None,'source_classification':'secondary-community-reference','canonical_fidelity_certified':False,'cache_reused':False}
    ctx=ssl.create_default_context()
    ca=os.environ.get('REQUESTS_CA_BUNDLE')
    if ca:ctx.load_verify_locations(ca)
    try:
        req=Request(url,headers={'User-Agent':'BOWProtocolReferenceAudit/1.0','Accept':'text/html,application/xhtml+xml'})
        with urlopen(req,timeout=25,context=ctx) as response:
            result['http_status']=response.status
            result['effective_url']=response.geturl()
            result['content_type']=response.headers.get('Content-Type','')
            body=response.read(LIMIT+1)
        result['body_truncated']=len(body)>LIMIT
        body=body[:LIMIT]
        body_path.write_bytes(body)
        result.update({'body_path':str(body_path.relative_to(OUT)),'body_bytes':len(body),'body_sha256':hashlib.sha256(body).hexdigest()})
        result.update(parse_page(body,result['effective_url']))
    except HTTPError as e:
        result['http_status']=e.code;result['effective_url']=e.geturl();result['error']=str(e)
        body=e.read(LIMIT)
        body_path.write_bytes(body)
        result.update({'body_path':str(body_path.relative_to(OUT)),'body_bytes':len(body),'body_sha256':hashlib.sha256(body).hexdigest()})
        result.update(parse_page(body,result['effective_url']))
    except Exception as e:
        result['error']=type(e).__name__+': '+str(e)
    result['usable_document']=bool(result.get('http_status')==200 and not result.get('challenge_page_detected') and not result.get('body_truncated') and (result.get('description') or result.get('article_text') or result.get('headings')))
    result['review_required']='Confirm exact game, incarnation, phase, image provenance and action evidence; a fetched page or title match is not 1:1 certification.'
    meta_path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    return result

def main():
    global ROOT, OUT
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--root',type=Path,default=ROOT)
    ap.add_argument('--output',type=Path)
    ap.add_argument('--refresh',action='store_true')
    ap.add_argument('--limit',type=int)
    args=ap.parse_args()
    ROOT=args.root.resolve(); OUT=(args.output or ROOT/'qa-source-research-r21').resolve()
    OUT.mkdir(parents=True,exist_ok=True)
    roster=json.loads((ROOT/'data/roster.json').read_text())
    rows=roster['catalog'];urls=list(dict.fromkeys(r['sourcePage'] for r in rows))
    if args.limit:urls=urls[:args.limit]
    results=[]
    started=time.monotonic()
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        futures={pool.submit(fetch,u,args.refresh):u for u in urls}
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())
            if len(results)%10==0 or len(results)==len(urls):
                c=Counter(r['http_status'] for r in results)
                print(json.dumps({'completed':len(results),'total':len(urls),'statuses':dict(c),'usable':sum(r['usable_document'] for r in results),'elapsed_seconds':round(time.monotonic()-started,1)}),flush=True)
    byurl={r['requested_url']:r for r in results};identities=[]
    for row in rows:
        page=byurl.get(row['sourcePage'])
        if page is None:continue
        title=norm(page.get('title','')+' '+' '.join(page.get('headings',[])[:3]))
        name=norm(row['name'])
        namewords=[x for x in name.split() if len(x)>2]
        exactcue=bool(name and name in title)
        token_cue=bool(namewords and all(x in title.split() for x in namewords))
        expected_slug=row.get('gameKey') or ''
        observed_path=urlparse(page.get('effective_url') or '').path
        identities.append({
            'id':row['id'],'name':row['name'],'game':row.get('game'),'source_page':row['sourcePage'],
            'http_status':page.get('http_status'),'usable_document':page['usable_document'],
            'page_title':page.get('title'),'identity_name_cue_found':exactcue or token_cue,
            'expected_game_key':expected_slug,'game_path_cue_found':bool(expected_slug and '/'+expected_slug+'/' in observed_path),
            'article_text_present':bool(page.get('article_text')),'primary_image_urls':page.get('primary_image_urls',[]),
            'media_links':page.get('same_page_media',[]),'body_path':page.get('body_path'),'body_sha256':page.get('body_sha256'),
            'source_classification':page['source_classification'],'canonical_fidelity_certified':False,
            'review_required':page['review_required'],
        })
    summary={'identities_requested':len(rows),'identities_collected':len(identities),'unique_urls_requested':len(urls),'unique_documents_collected':len(results),'http_status_counts':dict(Counter(str(r['http_status']) for r in results)),'usable_documents':sum(r['usable_document'] for r in results),'identities_with_usable_document':sum(r['usable_document'] for r in identities),'identity_name_cue_found':sum(r['identity_name_cue_found'] for r in identities),'game_path_cue_found':sum(r['game_path_cue_found'] for r in identities),'canonical_fidelity_certified':0,'elapsed_seconds':round(time.monotonic()-started,1)}
    report={'schema':'bow.catalog-source-evidence/1','observed_at_utc':utc(),'scope':'Existing catalogue source pages only. Remote pages are untrusted evidence; title/game cues are review aids, not canonical validation. Images/media listed from a page have not automatically been fetched, licensed, reviewed or integrated.','summary':summary,'identities':identities,'documents':sorted(results,key=lambda x:x['requested_url']),'blockers':[{'url':r['requested_url'],'http_status':r['http_status'],'error':r['error'],'title':r.get('title'),'challenge_page_detected':r.get('challenge_page_detected',False)} for r in results if not r['usable_document']]}
    report_path=OUT/('catalog-source-evidence-limited.json' if args.limit else 'catalog-source-evidence.json')
    report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'report':str(report_path),'summary':summary},ensure_ascii=False),flush=True)

if __name__=='__main__':main()
