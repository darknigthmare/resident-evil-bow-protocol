#!/usr/bin/env python3
"""Download only primary images explicitly declared by collected source pages.

Raw response bytes are preserved; no image editing, mirroring, recolouring or
animation invention occurs. Pixel digests are measurements, not certification.
"""
from __future__ import annotations
import argparse, concurrent.futures, hashlib, io, json, os, ssl, time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlparse
from urllib.request import Request, ProxyHandler, HTTPSHandler, HTTPRedirectHandler, build_opener
from PIL import Image

SCRIPT_ROOT=Path(__file__).resolve().parents[1]
DEFAULT_ROOT=SCRIPT_ROOT if (SCRIPT_ROOT/'data/roster.json').is_file() else Path('/workspace/resident-evil-bow-protocol')
OUT=DEFAULT_ROOT/'qa-source-research-r21'
LIMIT=10*1024*1024

def utc(): return datetime.now(timezone.utc).isoformat()

policy=json.loads(Path('/etc/codex/network-policy.json').read_text())
spec=policy.get('http_network_policy',{})
rules=[r['host'].lower() for r in spec.get('egress_rules',[]) if r.get('host')]
def permitted(url):
    parsed=urlparse(url)
    if parsed.scheme!='https' or parsed.username or parsed.password: return False
    host=(parsed.hostname or '').lower()
    if spec.get('type')=='unrestricted': return True
    return any(rule=='*' or host==rule or (rule.startswith('*.') and host.endswith(rule[1:]) and host!=rule[2:]) for rule in rules)

class GuardedRedirect(HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        if not permitted(newurl): raise ValueError('Redirect host not permitted by current startup network policy: '+(urlparse(newurl).hostname or ''))
        return super().redirect_request(req,fp,code,msg,headers,newurl)

def fetch(url,bindings,refresh=False):
    key=hashlib.sha256(url.encode()).hexdigest()[:24]
    folder=OUT/'catalog-images';folder.mkdir(parents=True,exist_ok=True)
    meta=folder/(key+'.json')
    if not refresh and meta.exists():
        r=json.loads(meta.read_text())
        cached_body=(OUT/r.get('body_path','')).resolve()
        body_ok=bool(r.get('requested_url')==url and cached_body.is_relative_to(OUT.resolve()) and cached_body.is_file() and hashlib.sha256(cached_body.read_bytes()).hexdigest()==r.get('body_sha256'))
        still_blocked=bool(str(r.get('error','')).startswith('network_policy_host_not_allowed:') and not permitted(url))
        if body_ok or still_blocked:
            r['cache_reused']=True
            r['source_page_bindings']=bindings
            return r
    r={'requested_url':url,'effective_url':None,'http_status':None,'observed_at_utc':utc(),'error':None,'body_truncated':False,'cache_reused':False,'canonical_fidelity_certified':False,'source_page_bindings':bindings}
    if not permitted(url):
        r['error']='network_policy_host_not_allowed: '+str(urlparse(url).hostname)
        r['usable_image']=False
        meta.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
        return r
    context=ssl.create_default_context()
    if os.environ.get('REQUESTS_CA_BUNDLE'): context.load_verify_locations(os.environ['REQUESTS_CA_BUNDLE'])
    opener=build_opener(ProxyHandler(),HTTPSHandler(context=context),GuardedRedirect())
    try:
        req=Request(url,headers={'User-Agent':'BOWProtocolReferenceAudit/1.0','Accept':'image/*'})
        with opener.open(req,timeout=25) as response:
            r['effective_url']=response.geturl();r['http_status']=response.status
            r['content_type']=response.headers.get('Content-Type','')
            body=response.read(LIMIT+1)
        r['body_truncated']=len(body)>LIMIT;body=body[:LIMIT]
        suffix=Path(urlparse(url).path).suffix.lower()
        if suffix not in ('.png','.webp','.jpg','.jpeg','.gif','.avif'): suffix='.bin'
        target=folder/(key+suffix);target.write_bytes(body)
        r.update({'body_path':str(target.relative_to(OUT)),'body_sha256':hashlib.sha256(body).hexdigest(),'body_bytes':len(body),'response_bytes_preserved':True})
        if r['body_truncated']: raise ValueError('Image exceeds 10 MiB collection limit; truncated bytes cannot be imported.')
        with Image.open(io.BytesIO(body)) as image:
            r.update({'format':image.format,'width':image.width,'height':image.height,'mode':image.mode,'frames':getattr(image,'n_frames',1)})
            if image.width*image.height>40_000_000: raise ValueError('Image exceeds decoded pixel limit.')
            image.verify()
        with Image.open(io.BytesIO(body)) as image:
            rgba=image.convert('RGBA');rgba.load()
            r.update({'decoded_rgba_sha256':hashlib.sha256(rgba.tobytes()).hexdigest(),'alpha_extrema':list(rgba.getchannel('A').getextrema()),'decoded_verified':True,'pixels_transformed':False})
    except HTTPError as e:
        r['http_status']=e.code;r['effective_url']=e.geturl();r['error']=str(e)
    except Exception as e:
        r['error']=type(e).__name__+': '+str(e)
    r['usable_image']=bool(r.get('http_status')==200 and r.get('decoded_verified') and not r['body_truncated'] and not r['error'])
    r['review_required']='Reference image only. Check exact subject, incarnation, completeness, orientation and source claims; preserved bytes do not certify canonical motion, hidden anatomy or 1:1 fidelity.'
    meta.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
    return r

def main():
    global OUT
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--root',type=Path,default=DEFAULT_ROOT)
    ap.add_argument('--output',type=Path)
    ap.add_argument('--refresh',action='store_true')
    args=ap.parse_args()
    OUT=(args.output or args.root.resolve()/'qa-source-research-r21').resolve()
    source=json.loads((OUT/'catalog-source-evidence.json').read_text())
    by_page={}
    for i in source['identities']: by_page.setdefault(i['source_page'],[]).append(i)
    bindings={}
    for d in source['documents']:
        if not d.get('usable_document'): continue
        identities=by_page.get(d['requested_url'],[])
        for url in d.get('primary_image_urls',[]):
            bindings.setdefault(url,[]).append({'page_requested_url':d['requested_url'],'page_effective_url':d.get('effective_url'),'page_body_path':d.get('body_path'),'page_body_sha256':d.get('body_sha256'),'page_title':d.get('title'),'identity_ids':[i['id'] for i in identities],'game_keys':list(dict.fromkeys(i['expected_game_key'] for i in identities)),'automatic_identity_binding_allowed':bool(identities and all(i['game_path_cue_found'] for i in identities) and urlparse(d['requested_url']).hostname=='www.evilresource.com')})
    started=time.monotonic();results=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        futures={pool.submit(fetch,url,items,args.refresh):url for url,items in bindings.items()}
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())
            if len(results)%25==0 or len(results)==len(bindings):
                print(json.dumps({'images_completed':len(results),'total':len(bindings),'usable':sum(r['usable_image'] for r in results),'statuses':dict(Counter(str(r['http_status']) for r in results)),'elapsed_seconds':round(time.monotonic()-started,1)}),flush=True)
    indexed={r['requested_url']:r for r in results};identities=[]
    for i in source['identities']:
        candidates=[]
        for url in i.get('primary_image_urls',[]):
            image=indexed.get(url)
            if image:
                candidates.append({'image_url':url,'metadata_path':str((OUT/'catalog-images'/(hashlib.sha256(url.encode()).hexdigest()[:24]+'.json')).relative_to(OUT)),'usable_image':image['usable_image'],'body_path':image.get('body_path'),'body_sha256':image.get('body_sha256'),'decoded_rgba_sha256':image.get('decoded_rgba_sha256'),'width':image.get('width'),'height':image.get('height'),'game_path_cue_found':i['game_path_cue_found'],'identity_name_cue_found':i['identity_name_cue_found'],'binding_review_required':not i['game_path_cue_found'] or not i['identity_name_cue_found']})
        identities.append({'id':i['id'],'name':i['name'],'game':i['game'],'source_page':i['source_page'],'primary_image_candidates':candidates,'usable_image_present':any(c['usable_image'] for c in candidates),'automatic_reference_candidate_present':any(c['usable_image'] and i['game_path_cue_found'] for c in candidates),'canonical_fidelity_certified':False})
    summary={'catalogue_identities':len(identities),'unique_declared_primary_image_urls':len(results),'images_downloaded_and_decoded':sum(r['usable_image'] for r in results),'http_status_counts':dict(Counter(str(r['http_status']) for r in results)),'raw_image_bytes_preserved':sum(r.get('body_bytes',0) for r in results if r['usable_image']),'identities_with_downloaded_primary_image':sum(i['usable_image_present'] for i in identities),'identities_with_game_specific_reference_candidate':sum(i['automatic_reference_candidate_present'] for i in identities),'canonical_fidelity_certified':0,'elapsed_seconds':round(time.monotonic()-started,1)}
    report={'schema':'bow.catalog-image-evidence/1','observed_at_utc':utc(),'scope':'Primary images declared by successfully collected source pages only. Bytes preserved; decoded pixels measured only. Blog cover images are not assigned to enemy identities. No art, rig, opposite view, animation, sound or canonical 1:1 certification is created.','summary':summary,'identities':identities,'images':sorted(results,key=lambda x:x['requested_url']),'blockers':[{'url':r['requested_url'],'http_status':r['http_status'],'error':r['error']} for r in results if not r['usable_image']]}
    (OUT/'catalog-image-evidence.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'report':str(OUT/'catalog-image-evidence.json'),'summary':summary},ensure_ascii=False),flush=True)

if __name__=='__main__':main()
